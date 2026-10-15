-- Public scorecards + leaderboard hooks for social replay loops.
-- No PII exposure: public reads are limited to alias + scenario/difficulty + scorecard KPIs.

CREATE TABLE IF NOT EXISTS public.cmo_public_scorecards (
  run_id uuid PRIMARY KEY REFERENCES public.cmo_simulation_runs(run_id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_slug text NOT NULL UNIQUE,
  alias text NOT NULL,
  scenario_id text NOT NULL DEFAULT 'custom',
  difficulty text NOT NULL DEFAULT 'intermediate',
  overall_score numeric NOT NULL,
  grade text NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  market_share numeric NOT NULL DEFAULT 0,
  brand_awareness numeric NOT NULL DEFAULT 0,
  customer_satisfaction numeric NOT NULL DEFAULT 0,
  saved_at timestamptz NOT NULL DEFAULT now(),
  leaderboard_opt_in boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmo_public_scorecards_public_slug
  ON public.cmo_public_scorecards (share_slug)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_cmo_public_scorecards_leaderboard
  ON public.cmo_public_scorecards (scenario_id, difficulty, overall_score DESC, saved_at ASC)
  WHERE is_public = true AND leaderboard_opt_in = true;

CREATE INDEX IF NOT EXISTS idx_cmo_public_scorecards_owner
  ON public.cmo_public_scorecards (owner_user_id, saved_at DESC);

DROP TRIGGER IF EXISTS trg_cmo_public_scorecards_updated_at ON public.cmo_public_scorecards;
CREATE TRIGGER trg_cmo_public_scorecards_updated_at
  BEFORE UPDATE ON public.cmo_public_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cmo_public_scorecards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cmo_public_scorecards_select_public" ON public.cmo_public_scorecards;
DROP POLICY IF EXISTS "cmo_public_scorecards_select_own" ON public.cmo_public_scorecards;
DROP POLICY IF EXISTS "cmo_public_scorecards_insert_own" ON public.cmo_public_scorecards;
DROP POLICY IF EXISTS "cmo_public_scorecards_update_own" ON public.cmo_public_scorecards;
DROP POLICY IF EXISTS "cmo_public_scorecards_delete_own" ON public.cmo_public_scorecards;

CREATE POLICY "cmo_public_scorecards_select_public"
  ON public.cmo_public_scorecards
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "cmo_public_scorecards_select_own"
  ON public.cmo_public_scorecards
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

CREATE POLICY "cmo_public_scorecards_insert_own"
  ON public.cmo_public_scorecards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

CREATE POLICY "cmo_public_scorecards_update_own"
  ON public.cmo_public_scorecards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

CREATE POLICY "cmo_public_scorecards_delete_own"
  ON public.cmo_public_scorecards
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.upsert_public_scorecard(
  p_run_id uuid,
  p_alias text,
  p_leaderboard_opt_in boolean DEFAULT false,
  p_is_public boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_alias text;
  v_slug text;
  v_scenario_id text;
  v_difficulty text;
  v_overall_score numeric;
  v_grade text;
  v_revenue numeric;
  v_profit numeric;
  v_market_share numeric;
  v_brand_awareness numeric;
  v_customer_satisfaction numeric;
  v_saved_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  v_alias := COALESCE(NULLIF(btrim(p_alias), ''), '');
  IF v_alias = '' OR v_alias !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,30}[A-Za-z0-9]$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_alias');
  END IF;

  SELECT
    COALESCE(NULLIF(btrim(r.scenario_id), ''), 'custom'),
    COALESCE(NULLIF(btrim(r.context->'strategy'->>'difficulty'), ''), 'intermediate'),
    COALESCE(r.overall_score, 0),
    COALESCE(NULLIF(btrim(r.grade), ''), 'N/A'),
    COALESCE((r.context->'kpis'->>'revenue')::numeric, 0),
    COALESCE((r.context->'kpis'->>'profit')::numeric, 0),
    COALESCE((r.context->'kpis'->>'marketShare')::numeric, 0),
    COALESCE((r.context->'kpis'->>'brandAwareness')::numeric, 0),
    COALESCE((r.context->'kpis'->>'customerSatisfaction')::numeric, 0),
    COALESCE(r.saved_at, now())
  INTO
    v_scenario_id,
    v_difficulty,
    v_overall_score,
    v_grade,
    v_revenue,
    v_profit,
    v_market_share,
    v_brand_awareness,
    v_customer_satisfaction,
    v_saved_at
  FROM public.cmo_simulation_runs r
  WHERE r.run_id = p_run_id
    AND r.user_id = v_uid
    AND r.status = 'completed'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_not_found_or_not_completed');
  END IF;

  SELECT s.share_slug
  INTO v_slug
  FROM public.cmo_public_scorecards s
  WHERE s.run_id = p_run_id
  LIMIT 1;

  IF v_slug IS NULL THEN
    v_slug := encode(gen_random_bytes(9), 'hex');
  END IF;

  INSERT INTO public.cmo_public_scorecards (
    run_id,
    owner_user_id,
    share_slug,
    alias,
    scenario_id,
    difficulty,
    overall_score,
    grade,
    revenue,
    profit,
    market_share,
    brand_awareness,
    customer_satisfaction,
    saved_at,
    leaderboard_opt_in,
    is_public
  )
  VALUES (
    p_run_id,
    v_uid,
    v_slug,
    v_alias,
    v_scenario_id,
    v_difficulty,
    v_overall_score,
    v_grade,
    v_revenue,
    v_profit,
    v_market_share,
    v_brand_awareness,
    v_customer_satisfaction,
    v_saved_at,
    p_leaderboard_opt_in,
    p_is_public
  )
  ON CONFLICT (run_id) DO UPDATE SET
    alias = EXCLUDED.alias,
    scenario_id = EXCLUDED.scenario_id,
    difficulty = EXCLUDED.difficulty,
    overall_score = EXCLUDED.overall_score,
    grade = EXCLUDED.grade,
    revenue = EXCLUDED.revenue,
    profit = EXCLUDED.profit,
    market_share = EXCLUDED.market_share,
    brand_awareness = EXCLUDED.brand_awareness,
    customer_satisfaction = EXCLUDED.customer_satisfaction,
    saved_at = EXCLUDED.saved_at,
    leaderboard_opt_in = EXCLUDED.leaderboard_opt_in,
    is_public = EXCLUDED.is_public;

  RETURN jsonb_build_object(
    'ok', true,
    'run_id', p_run_id,
    'share_slug', v_slug,
    'alias', v_alias,
    'leaderboard_opt_in', p_leaderboard_opt_in,
    'is_public', p_is_public
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_public_scorecard(uuid, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_scorecard(uuid, text, boolean, boolean) TO authenticated;
