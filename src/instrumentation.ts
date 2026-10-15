export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const hasSupabaseConfig = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const skipProductionEnvCheck =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test" ||
    (!hasSupabaseConfig && (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development"));

  if (skipProductionEnvCheck) return;

  const { assertProductionRuntimeEnv } = await import("@/lib/env");
  assertProductionRuntimeEnv();
}
