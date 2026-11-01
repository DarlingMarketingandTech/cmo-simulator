/**
 * Environment variable validation
 * Throws error on app startup if required vars are missing
 *
 * This ensures the application fails fast with a clear error message
 * rather than failing later with cryptic errors.
 *
 * Note: Validation is skipped during build time for Cloudflare Pages,
 * as environment variables are injected at runtime.
 */

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// SUPABASE_SERVICE_ROLE_KEY is optional for normal saves (RLS + anon key).
// It is required on the server for Resend-powered sign-up confirmation (see /api/auth/sign-up).
// Never expose this key to the browser (do NOT use NEXT_PUBLIC_ prefix).

/**
 * Check if we're in a build context (not runtime)
 * This allows the build to succeed even if env vars aren't set yet
 * Cloudflare Pages injects environment variables at runtime, not build time
 */
function isBuildTime(): boolean {
  // Next.js sets NEXT_PHASE during build phases
  if (process.env.NEXT_PHASE) {
    return true;
  }

  // Check if we're running Next.js build command
  if (process.argv.some(arg => arg.includes('next') && (arg.includes('build') || arg.includes('export')))) {
    return true;
  }

  // Check npm/pnpm/yarn build scripts
  const lifecycleEvent = process.env.npm_lifecycle_event;
  if (lifecycleEvent && (lifecycleEvent.includes('build') || lifecycleEvent.includes('opennextjs-cloudflare'))) {
    return true;
  }

  // During build, NODE_ENV is typically 'production' but we can't rely on that alone
  // Instead, we check if we're in a CI/build environment without the actual env vars
  // This is a fallback - if we're missing required vars and in a build-like context, skip validation
  if (process.env.CI || process.env.CF_PAGES) {
    // Only skip if we're actually missing the vars (they'll be available at runtime)
    const hasRequiredVars = requiredEnvVars.every(varName => !!process.env[varName]);
    if (!hasRequiredVars) {
      return true;
    }
  }

  return false;
}

export function validateEnv() {
  // Skip validation during build time - Cloudflare Pages injects env vars at runtime
  if (isBuildTime()) {
    return;
  }

  const missing: string[] = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
      'See .env.example for reference.'
    );
  }
}

/**
 * Stricter checks for production Node runtime (after build). Call from instrumentation
 * or once at server startup so misconfigured deploys fail loudly.
 */
export function assertProductionRuntimeEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (isBuildTime()) return;

  const missing: string[] = [];
  for (const name of requiredEnvVars) {
    if (!process.env[name]) missing.push(name);
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    missing.push("NEXT_PUBLIC_SITE_URL");
  }

  if (missing.length > 0) {
    throw new Error(
      `[CMO Simulator] Production runtime misconfiguration: missing ${missing.join(", ")}. See .env.example.`,
    );
  }
}

/**
 * Validate environment variables only when a caller explicitly opts in.
 * Doing this at module load can fail in environments where variables are
 * injected later (for example deployed previews or build-time bootstrapping).
 */

/**
 * Get environment variable with type safety
 */
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || defaultValue!;
}

/**
 * Check if an optional environment variable is set
 */
export function hasEnvVar(name: string): boolean {
  return Boolean(process.env[name]);
}
