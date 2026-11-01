import { createClient } from "@/lib/supabase/client";
import type { AuthSessionPort, SimAuthSession } from "@/lib/platform/ports";

function toSession(
  session: Awaited<ReturnType<ReturnType<typeof createClient>["auth"]["getSession"]>>["data"]["session"],
): SimAuthSession | null {
  const user = session?.user;
  if (!user?.id || !user.email) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    signedInAt: user.last_sign_in_at ?? new Date().toISOString(),
  };
}

export class SupabaseAuthSessionPort implements AuthSessionPort {
  async getSession(): Promise<SimAuthSession | null> {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return toSession(data.session);
  }
}

export const defaultAuthSessionPort: AuthSessionPort = new SupabaseAuthSessionPort();

