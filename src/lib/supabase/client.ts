import { createBrowserClient } from "@supabase/ssr";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function createClient() {
  if (!hasSupabaseConfig) {
    return {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        getSession: async () => ({ data: { session: null } }),
        signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
        signUp: async () => ({ data: { session: null, user: null }, error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
        updateUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => undefined,
      },
    } as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
