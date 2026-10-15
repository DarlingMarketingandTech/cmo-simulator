import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSimulationScenarioById } from "@/lib/config/simulationScenarios";

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function difficultyLabel(value: string) {
  if (value === "beginner") return "Beginner";
  if (value === "advanced") return "Advanced";
  return "Intermediate";
}

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

type ScorecardPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicScorecardPage({ params }: ScorecardPageProps) {
  const { slug } = await params;
  if (!slug || slug.length < 8) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("cmo_public_scorecards")
    .select(
      "alias, scenario_id, difficulty, overall_score, grade, revenue, profit, market_share, brand_awareness, customer_satisfaction, saved_at, is_public",
    )
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const scenario = getSimulationScenarioById(data.scenario_id);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Public scorecard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{data.alias}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {scenario?.name ?? data.scenario_id} · {difficultyLabel(data.difficulty)} · Saved {fmtDate(data.saved_at)}
            </p>
          </div>
          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <MetricCard label="Composite score" value={String(data.overall_score)} />
            <MetricCard label="Grade" value={data.grade} />
            <MetricCard label="Revenue" value={fmtCurrency(data.revenue)} />
            <MetricCard label="Profit" value={fmtCurrency(data.profit)} />
            <MetricCard label="Market share" value={fmtPercent(data.market_share)} />
            <MetricCard label="Brand awareness" value={fmtPercent(data.brand_awareness)} />
          </div>
          <div className="px-6 pb-6 text-sm text-slate-600">
            Customer satisfaction: <span className="font-semibold text-slate-900">{fmtPercent(data.customer_satisfaction)}</span>
          </div>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sim/leaderboard"
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View leaderboard
          </Link>
          <Link
            href="/sim/setup"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Start your own run
          </Link>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}
