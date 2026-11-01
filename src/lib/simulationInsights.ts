import type { SimulationContext, Tactic } from "@/lib/simMachine";
import type { SimulationTeachingGrade } from "@/lib/simulationContracts";

export interface TeachingReport {
  outcome: string;
  why: string;
  tradeoff: string;
  nextMove: string;
  growthLeaderTakeaway: string;
}

/** Keys for the weighted executive rubric (deterministic, rule-based). */
export type ExecutiveRubricKey =
  | "growth_quality"
  | "efficiency"
  | "strategic_coherence"
  | "resilience"
  | "finish_quality";

export interface ExecutiveScoreRubric {
  growth_quality: number;
  efficiency: number;
  strategic_coherence: number;
  resilience: number;
  finish_quality: number;
}

/** Weights sum to 1; drive `calculateOverallScore`. */
export const EXECUTIVE_RUBRIC_WEIGHTS: Record<ExecutiveRubricKey, number> = {
  growth_quality: 0.42,
  efficiency: 0.24,
  strategic_coherence: 0.12,
  resilience: 0.12,
  finish_quality: 0.1,
};

export const EXECUTIVE_RUBRIC_LABELS: Record<ExecutiveRubricKey, string> = {
  growth_quality: "Growth quality",
  efficiency: "Efficiency",
  strategic_coherence: "Strategic coherence",
  resilience: "Resilience / execution quality",
  finish_quality: "Finish quality",
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function scale01(value: number, cap: number): number {
  if (!(cap > 0)) return 0;
  return clamp(value / cap, 0, 1);
}

function normalizeRange(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Five-dimension executive rubric (0–100 each). Inputs are simulation outputs only — no AI.
 */
export function calculateExecutiveScoreRubric(context: SimulationContext): ExecutiveScoreRubric {
  const qs = [context.quarters.Q1, context.quarters.Q2, context.quarters.Q3, context.quarters.Q4];
  const R = qs.map((q) => q.results.revenue || 0);
  const P = qs.map((q) => q.results.profit || 0);
  const S = qs.map((q) => q.results.marketShare || 0);
  const C = qs.map((q) => q.results.customerSatisfaction || 0);
  const A = qs.map((q) => q.results.brandAwareness || 0);

  const totalRevenue = R.reduce((sum, v) => sum + v, 0);
  const totalProfit = P.reduce((sum, v) => sum + v, 0);
  const deployed = clamp(context.totalBudget - context.remainingBudget, 0, context.totalBudget || Infinity);
  const utilization = context.totalBudget > 0 ? deployed / context.totalBudget : 0;

  const r0 = Math.max(R[0], 1);
  const revenueGrowthRatio = (R[3] - R[0]) / r0;
  const growthNorm = scale01(revenueGrowthRatio, 0.75) * 100;
  const shareFinishNorm = scale01(S[3], 22) * 100;
  const revenueMassNorm = scale01(totalRevenue, 1_200_000) * 100;
  const satLevelNorm = scale01(C.reduce((sum, v) => sum + v, 0) / 4, 80) * 100;
  const satMomentumNorm = scale01((C[3] - C[0] + 30) / 2, 40) * 100;

  const growth_quality = toScore(
    0.1 * growthNorm + 0.08 * shareFinishNorm + 0.72 * revenueMassNorm + 0.06 * satLevelNorm + 0.04 * satMomentumNorm,
  );

  const profitPerDeployed = deployed > 0 ? totalProfit / deployed : 0;
  const ppmNorm = normalizeRange(profitPerDeployed, -0.5, 0.22) * 100;
  const utilDistance = Math.abs(utilization - 0.82);
  const utilNorm = clamp(100 - utilDistance * 85, 12, 100);
  const margins = R.map((rev, i) => (rev > 0 ? clamp(P[i] / rev, -1, 1) : 0));
  const avgMargin = margins.reduce((sum, v) => sum + v, 0) / 4;
  const marginNorm = normalizeRange(avgMargin, -1.5, 0.25) * 100;
  const lossQuarterCount = P.filter((value) => value < 0).length;
  const lossPenaltyNorm = clamp(100 - lossQuarterCount * 14, 44, 100);

  const efficiency = toScore(
    0.36 * ppmNorm + 0.26 * utilNorm + 0.24 * marginNorm + 0.14 * lossPenaltyNorm,
  );

  const alignmentNorm = computeChannelAlignmentNorm(context);
  const stratDepthNorm = computeStrategyDepthNorm(context);
  const portfolioBalanceNorm = computeCategoryBalanceNorm(context);

  const strategic_coherence = toScore(0.42 * alignmentNorm + 0.34 * stratDepthNorm + 0.24 * portfolioBalanceNorm);

  const positiveQuarters = P.filter((p) => p > 0).length;
  const consistencyNorm = positiveQuarters >= 4 ? 100 : positiveQuarters === 3 ? 72 : positiveQuarters === 2 ? 48 : 26;
  const floorNorm = scale01(Math.min(...P) + 55_000, 140_000) * 100;
  const volatilityPenaltyNorm = computeProfitVolatilityNorm(P);
  const wildcardNorm = computeWildcardExecutionNorm(context);
  const breadthNorm = computeQuarterlyTacticBreadthNorm(qs);

  const resilience = toScore(
    0.28 * floorNorm + 0.26 * consistencyNorm + 0.2 * volatilityPenaltyNorm + 0.14 * wildcardNorm + 0.12 * breadthNorm,
  );

  const avgEarlyRev = (R[0] + R[1] + R[2]) / 3;
  const q4LiftRatio = avgEarlyRev > 0 ? R[3] / avgEarlyRev : 0;
  const liftNorm = scale01(q4LiftRatio - 0.82, 0.55) * 100;
  const shareMomentumNorm = scale01(S[3] - S[2] + 3, 9) * 100;
  const q4SatNorm = scale01(C[3], 82) * 100;
  const q4AwareNorm = scale01(A[3], 78) * 100;

  const finish_quality = toScore(0.38 * liftNorm + 0.24 * shareMomentumNorm + 0.22 * q4SatNorm + 0.16 * q4AwareNorm);

  return {
    growth_quality,
    efficiency,
    strategic_coherence,
    resilience,
    finish_quality,
  };
}

/**
 * Weighted composite (0–100). This is the canonical teaching / persistence score — not legacy revenue+share.
 */
export function calculateOverallScore(context: SimulationContext): number {
  const r = calculateExecutiveScoreRubric(context);
  const raw =
    r.growth_quality * EXECUTIVE_RUBRIC_WEIGHTS.growth_quality +
    r.efficiency * EXECUTIVE_RUBRIC_WEIGHTS.efficiency +
    r.strategic_coherence * EXECUTIVE_RUBRIC_WEIGHTS.strategic_coherence +
    r.resilience * EXECUTIVE_RUBRIC_WEIGHTS.resilience +
    r.finish_quality * EXECUTIVE_RUBRIC_WEIGHTS.finish_quality;
  return Math.round(clamp(raw, 0, 100));
}

export function calculateGrade(score: number): SimulationTeachingGrade {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function buildTeachingReport(context: SimulationContext): TeachingReport {
  const quarters = [context.quarters.Q1, context.quarters.Q2, context.quarters.Q3, context.quarters.Q4];
  const totalRevenue = quarters.reduce((sum, quarter) => sum + (quarter.results.revenue || 0), 0);
  const totalProfit = quarters.reduce((sum, quarter) => sum + (quarter.results.profit || 0), 0);
  const finalShare = context.quarters.Q4.results.marketShare || 0;
  const rubric = calculateExecutiveScoreRubric(context);

  const strongestQuarter = quarters
    .map((quarter, index) => ({ quarter: `Q${index + 1}`, revenue: quarter.results.revenue || 0 }))
    .sort((a, b) => b.revenue - a.revenue)[0];

  const mostTacticsQuarter = quarters
    .map((quarter, index) => ({ quarter: `Q${index + 1}`, tactics: quarter.tactics.length }))
    .sort((a, b) => b.tactics - a.tactics)[0];

  const outcome = `Finished with ${finalShare.toFixed(1)}% market share, $${Math.round(totalRevenue).toLocaleString()} revenue, and $${Math.round(totalProfit).toLocaleString()} profit.`;
  const rm = context.engineState.results.runtimeMetrics;
  const whyRuntime =
    rm != null
      ? ` Latest engine tick: difficulty ${rm.difficultyLevel}; blended SOV ${(rm.blendedShareOfVoice * 100).toFixed(1)}%; traffic modifiers — competitive ×${rm.competitiveDragMultiplier.toFixed(3)}, audience fit ×${rm.audienceFitMultiplier.toFixed(3)}, repeat-tactic fatigue ×${rm.tacticFatigueMultiplier.toFixed(3)}.`
      : "";
  const allocation = context.strategy.budgetAllocation;
  const brandShare = typeof allocation?.brandAwareness === "number" ? allocation.brandAwareness : 0;
  const demandShare = typeof allocation?.leadGeneration === "number" ? allocation.leadGeneration : 0;
  const conversionShare = typeof allocation?.conversionOptimization === "number"
    ? allocation.conversionOptimization
    : typeof allocation?.customerRetention === "number"
      ? allocation.customerRetention
      : 0;
  const posture = brandShare + demandShare + conversionShare > 0
    ? ` Budget posture was ${brandShare}% brand, ${demandShare}% demand, and ${conversionShare}% conversion, and that split scaled channel yield before the quarter score.`
    : "";
  const why = `The strongest revenue contribution came in ${strongestQuarter.quarter}, with tactical volume peaking in ${mostTacticsQuarter.quarter}.${posture} Rubric highlights: growth ${rubric.growth_quality}, efficiency ${rubric.efficiency}, coherence ${rubric.strategic_coherence}, resilience ${rubric.resilience}, finish ${rubric.finish_quality} (each out of 100).${whyRuntime}`;
  const tradeoff = `Resource concentration improved execution depth but increased exposure to saturation and wildcard volatility. Board pressure balance (CEO/CFO/CMO) became the limiting factor in late quarters.`;
  const nextMove = `Run a replay with one deliberate portfolio shift: preserve your top-performing channel, reallocate 15-20% of spend to under-used channels, and compare rubric gains in efficiency and coherence—not only headline revenue.`;
  const growthLeaderTakeaway = `Use this simulation like a planning lab: tie budget decisions to explicit hypotheses, then judge outcomes on durable growth quality and execution resilience, not a single headline KPI.`;

  return { outcome, why, tradeoff, nextMove, growthLeaderTakeaway };
}

function inferCategoriesFromPrimaryChannel(channel: string): Tactic["category"][] {
  const p = channel.toLowerCase();
  const out = new Set<Tactic["category"]>();
  if (/digital|ppc|sem|social|programmatic|paid\s*search|display/.test(p)) out.add("digital");
  if (/tv|television|radio|ooh|outdoor|broadcast|print/.test(p)) out.add("traditional");
  if (/event|experiential|conference|trade\s*show/.test(p)) out.add("events");
  if (/content|seo|pr|brand|influencer/.test(p)) out.add("content");
  if (/partner|affiliate|sponsor|co-?marketing/.test(p)) out.add("partnerships");
  if (out.size === 0 && p.includes("market")) {
    out.add("digital");
    out.add("content");
  }
  return [...out];
}

function computeChannelAlignmentNorm(context: SimulationContext): number {
  const primary = context.strategy.primaryChannels ?? [];
  const preferred = new Set<Tactic["category"]>();
  for (const ch of primary) {
    for (const c of inferCategoriesFromPrimaryChannel(ch)) preferred.add(c);
  }

  let totalSpend = 0;
  let alignedSpend = 0;
  for (const q of ["Q1", "Q2", "Q3", "Q4"] as const) {
    for (const t of context.quarters[q].tactics) {
      totalSpend += t.cost || 0;
      if (preferred.size === 0 || preferred.has(t.category)) alignedSpend += t.cost || 0;
    }
  }

  if (totalSpend <= 0) return 58;
  if (preferred.size === 0) return 62;
  return clamp((alignedSpend / totalSpend) * 100, 0, 100);
}

function computeStrategyDepthNorm(context: SimulationContext): number {
  let score = 0;
  if (context.scenarioId) score += 18;
  if (context.strategy.companyName?.trim()) score += 22;
  if (context.strategy.targetAudience?.trim()) score += 20;
  if (context.strategy.brandPositioning?.trim()) score += 20;
  const ch = context.strategy.primaryChannels ?? [];
  if (ch.length > 0) score += 12;
  if (ch.length >= 2) score += 8;
  return clamp(score, 0, 100);
}

function computeCategoryBalanceNorm(context: SimulationContext): number {
  const totals: Partial<Record<Tactic["category"], number>> = {};
  for (const q of ["Q1", "Q2", "Q3", "Q4"] as const) {
    for (const t of context.quarters[q].tactics) {
      totals[t.category] = (totals[t.category] || 0) + (t.cost || 0);
    }
  }
  const values = Object.values(totals).filter((v) => v > 0);
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 52;
  const hhi = values.reduce((acc, v) => acc + (v / sum) * (v / sum), 0);
  return clamp((1 - hhi) * 140, 0, 100);
}

function computeProfitVolatilityNorm(profits: number[]): number {
  const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
  const variance = profits.reduce((acc, p) => acc + (p - mean) ** 2, 0) / profits.length;
  const stdev = Math.sqrt(Math.max(variance, 0));
  const cv = mean !== 0 ? stdev / Math.abs(mean) : stdev > 0 ? 2 : 0;
  return clamp(100 - cv * 42, 0, 100);
}

function collectWildcardEvents(context: SimulationContext) {
  const merged = [...(context.wildcards ?? [])];
  for (const q of ["Q1", "Q2", "Q3", "Q4"] as const) {
    merged.push(...(context.quarters[q].wildcardEvents ?? []));
  }
  const seen = new Set<string>();
  return merged.filter((w) => {
    const key = `${w.id}:${w.triggeredInQuarter ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeWildcardExecutionNorm(context: SimulationContext): number {
  const cards = collectWildcardEvents(context);
  if (!cards.length) return 74;
  let score = 68;
  for (const w of cards) {
    if (w.selectedChoice || w.chosenResponse) score += 7;
    if (w.type === "crisis" && !(w.selectedChoice || w.chosenResponse)) score -= 10;
    if (w.type === "opportunity" && !(w.selectedChoice || w.chosenResponse)) score -= 6;
  }
  return clamp(score, 0, 100);
}

function computeQuarterlyTacticBreadthNorm(quarters: SimulationContext["quarters"]["Q1"][]): number {
  const counts = quarters.map((q) => q.tactics.length);
  const avg = counts.reduce((a, b) => a + b, 0) / 4;
  return clamp(avg * 14, 0, 100);
}
