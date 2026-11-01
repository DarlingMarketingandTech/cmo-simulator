import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { defaultAuthSessionPort } from "@/lib/platform/adapters/supabase/authSessionPort";
import type { SimAuthSession } from "@/lib/platform/ports";

export type { SimAuthSession };

/** Trim and collapse internal whitespace for signup name fields. */
export function normalizePersonName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** User-facing copy for Supabase Auth errors (sign-in / sign-up / reset). */
export function formatAuthErrorMessage(error: unknown): string {
  const e = error as Partial<AuthError> & { code?: string; status?: number };
  const msg = typeof e.message === "string" ? e.message : "";
  const code = typeof e.code === "string" ? e.code : "";
  const blob = `${code} ${msg}`.toLowerCase();

  if (blob.includes("invalid login") || blob.includes("invalid_credentials")) {
    return "Wrong email or password.";
  }
  if (
    blob.includes("already been registered")
    || blob.includes("user already registered")
    || blob.includes("user_already_exists")
  ) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (blob.includes("email not confirmed") || blob.includes("email_not_confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the link.";
  }
  if (blob.includes("weak_password") || blob.includes("password")) {
    return msg || "Choose a stronger password.";
  }
  if (blob.includes("rate limit") || blob.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return msg || "Something went wrong. Try again.";
}

export type SignUpSimAuthOutcome =
  | { kind: "signed_in"; session: SimAuthSession }
  | { kind: "confirm_email" }
  | { kind: "error"; message: string };

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

export async function getSimAuthSession(): Promise<SimAuthSession | null> {
  return defaultAuthSessionPort.getSession();
}

export async function signInSimAuth(email: string, password: string): Promise<SimAuthSession> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const session = toSession(data.session);
  if (!session) throw new Error("Failed to create Supabase session.");
  return session;
}

async function signUpViaServerOrSupabase(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<SignUpSimAuthOutcome> {
  let apiPayload: { code?: string; message?: string } = {};
  try {
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    try {
      apiPayload = await res.json();
    } catch {
      apiPayload = {};
    }

    if (res.ok) {
      return { kind: "confirm_email" };
    }

    if (res.status === 503 && apiPayload.code === "email_not_configured") {
      const supabase = createClient();
      const fullName = `${firstName} ${lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
          },
        },
      });
      if (error) {
        return { kind: "error", message: formatAuthErrorMessage(error) };
      }
      const session = toSession(data.session);
      if (session) {
        return { kind: "signed_in", session };
      }
      return { kind: "confirm_email" };
    }

    if (res.status === 409) {
      return {
        kind: "error",
        message: "An account with this email already exists. Sign in instead.",
      };
    }

    const msg =
      typeof apiPayload.message === "string" && apiPayload.message.length > 0
        ? apiPayload.message
        : "Something went wrong. Try again.";
    return { kind: "error", message: msg };
  } catch {
    return { kind: "error", message: "Network error. Check your connection and try again." };
  }
}

export async function signUpSimAuth(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const outcome = await signUpViaServerOrSupabase(email, password, firstName, lastName);
  if (outcome.kind === "error") {
    throw new Error(outcome.message);
  }
}

export async function signUpSimAuthWithOutcome(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<SignUpSimAuthOutcome> {
  return signUpViaServerOrSupabase(email, password, firstName, lastName);
}

function passwordRecoveryRedirectUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/update-password`;
  }
  if (fromEnv) {
    return `${fromEnv}/auth/update-password`;
  }
  return "http://localhost:3002/auth/update-password";
}

export async function requestPasswordResetEmail(email: string): Promise<void> {
  const supabase = createClient();
  const redirectTo = passwordRecoveryRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
}

export async function updatePasswordFromRecovery(newPassword: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function clearSimAuthSession(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
