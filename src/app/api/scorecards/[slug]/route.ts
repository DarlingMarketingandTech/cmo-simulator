import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateRequestId, withRequestIdHeaders } from "@/lib/apiRequestId";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const requestId = getOrCreateRequestId(request);
  const headers = withRequestIdHeaders(requestId);

  try {
    const { slug } = await context.params;
    if (!slug || slug.length < 8) {
      return NextResponse.json({ error: "Invalid share slug." }, { status: 400, headers });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cmo_public_scorecards_public")
      .select(
        "share_slug, alias, scenario_id, difficulty, overall_score, grade, revenue, profit, market_share, brand_awareness, customer_satisfaction, saved_at",
      )
      .eq("share_slug", slug)
      .maybeSingle();

    if (error) {
      logger.error("GET /api/scorecards/[slug] failed", error, { requestId, slug });
      return NextResponse.json({ error: "Failed to load scorecard." }, { status: 500, headers });
    }
    if (!data) {
      return NextResponse.json({ error: "Scorecard not found." }, { status: 404, headers });
    }

    return NextResponse.json({ ok: true, scorecard: data }, { headers });
  } catch (error) {
    logger.error("GET /api/scorecards/[slug] unexpected error", error, { requestId });
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers });
  }
}
