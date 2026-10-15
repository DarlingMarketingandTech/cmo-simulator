"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, PlayCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { RunHistoryTable, type RunHistoryRow } from "@/components/simulation/RunHistoryTable";
import { SaveSyncStatus } from "@/components/simulation/SaveSyncStatus";
import { resumeSimulationRun } from "@/lib/resumeSimulationRun";
import type { SimulationContext } from "@/lib/simMachine";

type PersistedRun = {
  run_id: string;
  company_name: string;
  current_phase: string;
  status: "in_progress" | "completed";
  overall_score: number | null;
  grade: string | null;
  context: Partial<SimulationContext> | null;
  saved_at: string;
};

/** Map PostgREST / Supabase errors to a user-safe message (no internal paths or SQL filenames). */
function loadSimulationsUserMessage(apiError: string | undefined, details: unknown): string {
  const d = typeof details === "string" ? details : "";
  const combined = `${apiError ?? ""} ${d}`.toLowerCase();
  if (
    combined.includes("pgrst205")
    || combined.includes("schema cache")
    || combined.includes("could not find the table")
    || combined.includes('relation "public.cmo_simulation_runs" does not exist')
  ) {
    return "Saved runs are temporarily unavailable. If this persists, contact support—your administrator may need to finish database setup.";
  }
  return apiError ?? "Unable to load simulations.";
}


export default function SimulationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [runs, setRuns] = useState<PersistedRun[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRuns = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const response = await fetch("/api/simulations", { signal });
      if (signal?.aborted) return;
      const data = await response.json();
      if (signal?.aborted) return;
      if (!response.ok) {
        setError(loadSimulationsUserMessage(data?.error, data?.details));
        return;
      }
      setRuns(Array.isArray(data?.runs) ? data.runs : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Unable to load simulations.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    void loadRuns(controller.signal).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });
    return () => controller.abort();
  }, [loadRuns]);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/profile", { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) {
          setProfile(data?.profile ?? null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setProfile(null);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRuns();
    setIsRefreshing(false);
  };

  const handleResume = (run: PersistedRun) => {
    const path = resumeSimulationRun({
      context: run.context as Record<string, unknown> | null,
      current_phase: run.current_phase,
    });
    if (path) router.push(path);
  };

  const handleDelete = async (runId: string) => {
    if (!window.confirm("Delete this simulation run? This cannot be undone.")) return;
    setDeletingId(runId);
    try {
      const response = await fetch(`/api/simulations/${runId}`, { method: "DELETE" });
      if (response.ok) {
        setRuns((prev) => prev.filter((r) => r.run_id !== runId));
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data?.error ?? "Failed to delete run.");
      }
    } catch {
      setError("Failed to delete run.");
    } finally {
      setDeletingId(null);
    }
  };

  const tableRows: RunHistoryRow[] = runs.map((run) => ({
    run_id: run.run_id,
    company_name: run.company_name,
    current_phase: run.current_phase,
    status: run.status,
    overall_score: run.overall_score,
    grade: run.grade,
    saved_at: run.saved_at,
    canResume: Boolean(run.context),
    context: run.context,
  }));

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-5 py-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
            <CircleUserRound className="h-3.5 w-3.5" />
            My account
          </div>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Saved runs, profile memory, and next actions</h1>
              <p className="mt-2 text-sm text-slate-600">
                {user?.email ? `Signed in as ${user.email}` : "Your saved runs and account-linked simulator state live here."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveSyncStatus />
            </div>
          </div>
        </div>
        <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {profile ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                {typeof profile.role === "string" ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Role: {profile.role}</span> : null}
                {typeof profile.marketing_maturity === "string" ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Maturity: {profile.marketing_maturity}</span> : null}
                {Array.isArray(profile.selected_goals) ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Goals: {profile.selected_goals.length}</span> : null}
                {typeof profile.preferred_difficulty === "string" ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Difficulty: {profile.preferred_difficulty}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sim"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <PlayCircle className="h-4 w-4 text-slate-500" />
            Continue run
          </Link>
          <Link
            href="/sim/setup"
            className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New simulation
          </Link>
          <Link
            href="/sim/leaderboard"
            className="inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Public leaderboard
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading saved runs…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-slate-600">
              No saved runs yet. Start your first simulation to begin tracking your decisions and score.
            </p>
            <Link
              href="/sim/setup"
              className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start a simulation
            </Link>
          </div>
        </div>
      ) : (
        <RunHistoryTable
          runs={tableRows}
          isBusy={Boolean(deletingId)}
          onResume={(runId) => {
            const run = runs.find((item) => item.run_id === runId);
            if (run) handleResume(run);
          }}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
