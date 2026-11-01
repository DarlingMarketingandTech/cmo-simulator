"use client";

import { useMemo } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { quarterReviewFacts } from "@/lib/quarterReview";
import { processQuarterAdvance } from "@/lib/simMachine";
import { isQuarterFinalized } from "@/lib/simulationProgress";

type QuarterId = "Q1" | "Q2" | "Q3" | "Q4";

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString();
}

export function QuarterReviewStep({ quarter }: { quarter: QuarterId }) {
  const { context } = useSimulation();
  const quarterData = context.quarters[quarter];

  const results = useMemo(() => {
    if (isQuarterFinalized(context, quarter)) return quarterData.results;
    return processQuarterAdvance(context, quarter).newQuarterData.results;
  }, [context, quarter, quarterData.results]);

  const wildcardChoiceId =
    [...quarterData.wildcardEvents].reverse().find((event) => event.selectedChoice)?.selectedChoice ?? null;
  const hiredTalentId = quarterData.talentHired?.[0]?.id ?? null;
  const bigBetId = quarterData.bigBetMade?.id ?? null;

  const facts = quarterReviewFacts({
    tacticIds: quarterData.tactics.map((tactic) => tactic.id),
    wildcardChoiceId,
    hiredTalentId,
    bigBetId,
    revenue: results.revenue,
    profit: results.profit,
    marketShare: results.marketShare,
    customerSatisfaction: results.customerSatisfaction,
    brandAwareness: results.brandAwareness,
  });

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{quarter} review</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tactics</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {facts.tacticIds.length > 0 ? facts.tacticIds.join(", ") : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{formatNumber(facts.revenue)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profit</dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{formatNumber(facts.profit)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Market share</dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{formatNumber(facts.marketShare)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer satisfaction</dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{formatNumber(facts.customerSatisfaction)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Brand awareness</dt>
          <dd className="mt-1 text-sm font-medium text-slate-950">{formatNumber(facts.brandAwareness)}</dd>
        </div>
        {facts.wildcardChoiceId ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wildcard</dt>
            <dd className="mt-1 text-sm text-slate-900">{facts.wildcardChoiceId}</dd>
          </div>
        ) : null}
        {facts.hiredTalentId ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hire</dt>
            <dd className="mt-1 text-sm text-slate-900">{facts.hiredTalentId}</dd>
          </div>
        ) : null}
        {facts.bigBetId ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Big bet</dt>
            <dd className="mt-1 text-sm text-slate-900">{facts.bigBetId}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
