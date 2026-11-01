import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateRequestId, withRequestIdHeaders } from "@/lib/apiRequestId";
import { logger } from "@/lib/logger";

type ShareRequestBody = {
  runId?: string;
  alias?: string;
  leaderboardOptIn?: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseShareBody(body: unknown): ShareRequestBody | null {
  if (!asRecord(body)) return null;
  const runId = typeof body.runId === "string" ? body.runId : undefined;
  const alias = typeof body.alias === "string" ? body.alias : undefined;
  const leaderboardOptIn =
    typeof body.leaderboardOptIn === "boolean" ? body.leaderboardOptIn : undefined;
  return { runId, alias, leaderboardOptIn };
}

export async function GET(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const headers = withRequestIdHeaders(requestId);

  try {
    const runId = request.nextUrl.searchParams.get("runId");
    if (!runId || !UUID_RE.test(runId)) {
      return NextResponse.json({ error: "Valid runId is required." }, { status: 400, headers });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
    }

    const { data, error } = await supabase
      .from("cmo_public_scorecards")
      .select("run_id, share_slug, alias, leaderboard_opt_in, is_public, updated_at")
      .eq("run_id", runId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("GET /api/simulations/share failed", error, { requestId, runId });
      return NextResponse.json({ error: "Failed to load share settings." }, { status: 500, headers });
    }

    return NextResponse.json(
      {
        ok: true,
        share: data
          ? {
              ...data,
              share_url: data.share_slug ? `/scorecard/${data.share_slug}` : null,
            }
          : null,
      },
      { headers },
    );
  } catch (error) {
    logger.error("GET /api/simulations/share unexpected error", error, { requestId });
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const headers = withRequestIdHeaders(requestId);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers });
    }

    const body = parseShareBody(rawBody);
    if (!body?.runId || !UUID_RE.test(body.runId)) {
      return NextResponse.json({ error: "Valid runId is required." }, { status: 400, headers });
    }
    if (!body.alias || body.alias.trim().length < 3 || body.alias.trim().length > 32) {
      return NextResponse.json(
        { error: "Alias must be 3-32 characters." },
        { status: 400, headers },
      );
    }

    const { data, error } = await supabase.rpc("upsert_public_scorecard", {
      p_run_id: body.runId,
      p_alias: body.alias,
      p_leaderboard_opt_in: body.leaderboardOptIn ?? false,
      p_is_public: true,
    });

    if (error) {
      logger.error("upsert_public_scorecard RPC failed", error, { requestId, runId: body.runId });
      return NextResponse.json({ error: "Failed to publish scorecard." }, { status: 500, headers });
    }

    const result = data as
      | {
          ok?: boolean;
          error?: string;
          share_slug?: string;
          alias?: string;
          leaderboard_opt_in?: boolean;
          is_public?: boolean;
        }
      | null;

    if (!result?.ok) {
      if (result?.error === "run_not_found_or_not_completed") {
        return NextResponse.json(
          { error: "Complete and save this run before sharing." },
          { status: 409, headers },
        );
      }
      if (result?.error === "invalid_alias") {
        return NextResponse.json(
          { error: "Alias can only use letters, numbers, spaces, underscores, and hyphens." },
          { status: 400, headers },
        );
      }
      if (result?.error === "unauthorized") {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
      }
      return NextResponse.json({ error: "Failed to publish scorecard." }, { status: 500, headers });
    }

    return NextResponse.json(
      {
        ok: true,
        share: {
          share_slug: result.share_slug ?? null,
          share_url: result.share_slug ? `/scorecard/${result.share_slug}` : null,
          alias: result.alias ?? body.alias.trim(),
          leaderboard_opt_in: Boolean(result.leaderboard_opt_in),
          is_public: Boolean(result.is_public),
        },
      },
      { headers },
    );
  } catch (error) {
    logger.error("POST /api/simulations/share unexpected error", error, { requestId });
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getOrCreateRequestId(request);
  const headers = withRequestIdHeaders(requestId);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers });
    }

    const body = parseShareBody(rawBody);
    if (!body?.runId || !UUID_RE.test(body.runId)) {
      return NextResponse.json({ error: "Valid runId is required." }, { status: 400, headers });
    }

    const { error } = await supabase
      .from("cmo_public_scorecards")
      .update({ is_public: false, leaderboard_opt_in: false })
      .eq("run_id", body.runId)
      .eq("owner_user_id", user.id);

    if (error) {
      logger.error("DELETE /api/simulations/share failed", error, { requestId, runId: body.runId });
      return NextResponse.json({ error: "Failed to disable public scorecard." }, { status: 500, headers });
    }

    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    logger.error("DELETE /api/simulations/share unexpected error", error, { requestId });
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers });
  }
}
