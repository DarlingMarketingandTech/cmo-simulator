import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateRequestId, withRequestIdHeaders } from "@/lib/apiRequestId";
import { logger } from "@/lib/logger";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function normalizedLimit(raw: string | null): number {
  const parsed = Number(raw ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

export async function GET(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const headers = withRequestIdHeaders(requestId);

  try {
    const scenarioId = request.nextUrl.searchParams.get("scenarioId");
    const difficulty = request.nextUrl.searchParams.get("difficulty");
    const limit = normalizedLimit(request.nextUrl.searchParams.get("limit"));

    const supabase = await createClient();
    let query = supabase
      .from("cmo_public_scorecards_public")
      .select(
        "share_slug, alias, scenario_id, difficulty, overall_score, grade, revenue, profit, market_share, brand_awareness, customer_satisfaction, saved_at",
      )
      .eq("leaderboard_opt_in", true)
      .order("overall_score", { ascending: false })
      .order("saved_at", { ascending: true })
      .limit(limit);

    if (scenarioId && scenarioId !== "all") {
      query = query.eq("scenario_id", scenarioId);
    }
    if (difficulty && difficulty !== "all") {
      query = query.eq("difficulty", difficulty);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("GET /api/leaderboard failed", error, { requestId, scenarioId, difficulty, limit });
      return NextResponse.json({ error: "Failed to load leaderboard." }, { status: 500, headers });
    }

    return NextResponse.json(
      {
        ok: true,
        rows: (data ?? []).map((row, index) => ({
          rank: index + 1,
          ...row,
        })),
      },
      { headers },
    );
  } catch (error) {
    logger.error("GET /api/leaderboard unexpected error", error, { requestId });
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers });
  }
}
