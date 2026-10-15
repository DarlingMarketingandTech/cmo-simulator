"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trophy } from "lucide-react";
import { SIMULATION_SCENARIOS } from "@/lib/config/simulationScenarios";

type LeaderboardRow = {
  rank: number;
  share_slug: string;
  alias: string;
  scenario_id: string;
  difficulty: string;
  overall_score: number;
  grade: string;
  revenue: number;
  profit: number;
  market_share: number;
  brand_awareness: number;
  customer_satisfaction: number;
  saved_at: string;
};

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function difficultyLabel(value: string): string {
  if (value === "beginner") return "Beginner";
  if (value === "advanced") return "Advanced";
  return "Intermediate";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
}

export default function LeaderboardPage() {
  const [scenarioId, setScenarioId] = useState<"all" | string>("all");
  const [difficulty, setDifficulty] = useState<"all" | string>("all");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenarioOptions = useMemo(
    () => [
      { id: "all", label: "All scenarios" },
      ...SIMULATION_SCENARIOS.map((scenario) => ({ id: scenario.id, label: scenario.name })),
    ],
    [],
  );

  const scenarioNameById = useMemo(
    () => Object.fromEntries(SIMULATION_SCENARIOS.map((scenario) => [scenario.id, scenario.name])),
    [],
  );

  const loadLeaderboard = useCallback(
    async (signal?: AbortSignal) => {
      setError(null);
      const query = new URLSearchParams({
        scenarioId,
        difficulty,
        limit: "50",
      });

      try {
        const response = await fetch(`/api/leaderboard?${query.toString()}`, { signal });
        if (signal?.aborted) return;
        const data = await response.json();
        if (signal?.aborted) return;
        if (!response.ok) {
          setError(typeof data?.error === "string" ? data.error : "Unable to load leaderboard.");
          return;
        }
        setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Unable to load leaderboard.");
      }
    },
    [scenarioId, difficulty],
  );

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    void loadLeaderboard(controller.signal).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });
    return () => controller.abort();
  }, [loadLeaderboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaderboard();
    setIsRefreshing(false);
  };

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-5 py-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
            <Trophy className="h-3.5 w-3.5" />
            Public leaderboard
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Scenario score rankings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Opt-in aliases only. No emails or account identities are shown.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Scenario
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                value={scenarioId}
                onChange={(event) => setScenarioId(event.target.value)}
              >
                {scenarioOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Difficulty
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="all">All difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading leaderboard…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            No public entries yet for this filter. Publish a completed debrief scorecard to seed this board.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-separate border-spacing-0">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Rank</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Alias</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Scenario</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Difficulty</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Score</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Grade</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Revenue</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Profit</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Saved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.share_slug} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">#{row.rank}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      <Link href={`/scorecard/${row.share_slug}`} className="font-semibold text-slate-800 hover:text-slate-950 hover:underline">
                        {row.alias}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{scenarioNameById[row.scenario_id] ?? row.scenario_id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{difficultyLabel(row.difficulty)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.overall_score}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.grade}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fmtCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fmtCurrency(row.profit)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatTimestamp(row.saved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
