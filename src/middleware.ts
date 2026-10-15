import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function attachRequestId(request: NextRequest, response: NextResponse) {
  const existing = request.headers.get("x-request-id")?.trim();
  const id =
    existing && existing.length > 0 && existing.length < 200
      ? existing
      : crypto.randomUUID();
  response.headers.set("x-request-id", id);
}

export async function middleware(request: NextRequest) {
  const { response } = await updateSession(request);
  attachRequestId(request, response);
  return response;
}

// Only run Supabase session refresh where needed. A global matcher would call
// getUser() on every page (including `/`), which blocks the UI on a
// slow or unreachable Supabase host during local dev.
export const config = {
  matcher: ["/api/simulations/:path*", "/api/profile/:path*", "/api/simulation-events/:path*"],
};
