import { Suspense } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { SimulationProvider } from '@/components/simulation/SimulationProvider';
import { CrmShell } from '@/components/simulation/CrmShell';
import { createClient } from '@/lib/supabase/server';

/** Optional auth session for `/sim/*` with guest-first playthrough support. */
export default async function SimulationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <AuthProvider initialUser={user}>
      <SimulationProvider>
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 text-slate-950">
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  <div className="text-sm font-semibold text-slate-800">Initializing workspace…</div>
                </div>
                <div className="mt-2 text-xs text-slate-500">Loading your saved run and simulation engine.</div>
              </div>
            </div>
          }
        >
          <CrmShell>{children}</CrmShell>
        </Suspense>
      </SimulationProvider>
    </AuthProvider>
  );
}
