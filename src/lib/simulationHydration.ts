import type { HydrationPatch, SimulationContext } from "@/lib/simMachine";
import { PLAY_STEPS, type PlayStepId } from "@/lib/playSteps";
import type { DifficultyLevel, Industry } from "@/types";
import type {
  Channel,
  MarketConditions,
  SimulationOutput,
  SimulationRuntimeMetrics,
  SimulationState,
} from "@/types/engine";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function coerceDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return undefined;
  return parsed;
}

function mergeAdstock(
  base: Record<Channel, number>,
  patch: unknown,
): Record<Channel, number> {
  if (!isRecord(patch)) return base;

  const merged = { ...base } as Record<Channel, number>;
  for (const channel of Object.keys(base) as Channel[]) {
    const maybe = patch[channel];
    if (typeof maybe === "number" && Number.isFinite(maybe)) merged[channel] = maybe;
  }
  return merged;
}

function mergeTacticLifetimeUses(
  base: Record<string, number> | undefined,
  patch: unknown,
): Record<string, number> | undefined {
  if (!isRecord(patch)) return base ? { ...base } : undefined;
  const merged = { ...(base ?? {}) };
  for (const key of Object.keys(patch)) {
    const v = patch[key];
    if (typeof v === "number" && Number.isFinite(v)) merged[key] = v;
  }
  return merged;
}

function parseDifficultyLevel(value: unknown): DifficultyLevel | undefined {
  if (value === "beginner" || value === "intermediate" || value === "advanced") return value;
  return undefined;
}

function mergeShareOfVoicePatch(
  base: Partial<Record<Channel, number>>,
  patch: unknown,
): Partial<Record<Channel, number>> {
  if (!isRecord(patch)) return { ...base };
  const merged = { ...base } as Partial<Record<Channel, number>>;
  for (const channel of Object.keys(patch)) {
    const maybe = patch[channel];
    if (typeof maybe === "number" && Number.isFinite(maybe)) {
      (merged as Record<string, number>)[channel] = maybe;
    }
  }
  return merged;
}

function mergeRuntimeMetrics(
  base: SimulationRuntimeMetrics | undefined,
  patch: unknown,
): SimulationRuntimeMetrics | undefined {
  if (!isRecord(patch)) return base;
  const b = base;
  const difficultyLevel = parseDifficultyLevel(patch.difficultyLevel) ?? b?.difficultyLevel ?? "intermediate";
  const audienceArchetype =
    typeof patch.audienceArchetype === "string" ? patch.audienceArchetype : b?.audienceArchetype ?? "balanced";

  const blendedShareOfVoice =
    typeof patch.blendedShareOfVoice === "number" && Number.isFinite(patch.blendedShareOfVoice)
      ? patch.blendedShareOfVoice
      : (b?.blendedShareOfVoice ?? 0);

  const shareOfVoiceByChannel = mergeShareOfVoicePatch(b?.shareOfVoiceByChannel ?? {}, patch.shareOfVoiceByChannel);

  const pickNum = (key: string, fallback: number) =>
    typeof patch[key] === "number" && Number.isFinite(patch[key] as number)
      ? (patch[key] as number)
      : (b?.[key as keyof SimulationRuntimeMetrics] as number | undefined) ?? fallback;

  return {
    difficultyLevel,
    audienceArchetype,
    blendedShareOfVoice,
    shareOfVoiceByChannel,
    competitiveDragMultiplier: pickNum("competitiveDragMultiplier", 1),
    audienceFitMultiplier: pickNum("audienceFitMultiplier", 1),
    tacticFatigueMultiplier: pickNum("tacticFatigueMultiplier", 1),
    combinedTrafficMultiplier: pickNum("combinedTrafficMultiplier", 1),
  };
}

function mergeMarketConditions(
  base: MarketConditions,
  patch: unknown,
): MarketConditions {
  if (!isRecord(patch)) return base;

  const competitorSpend = isRecord(patch.competitorSpend)
    ? mergeAdstock(base.competitorSpend, patch.competitorSpend)
    : base.competitorSpend;

  return {
    ...base,
    ...(typeof patch.seasonalityIndex === "number" ? { seasonalityIndex: patch.seasonalityIndex } : null),
    ...(typeof patch.economicIndex === "number" ? { economicIndex: patch.economicIndex } : null),
    competitorSpend,
  };
}

function mergeSimulationOutput(
  base: SimulationOutput,
  patch: unknown,
): SimulationOutput {
  if (!isRecord(patch)) return base;

  const channelContributions = isRecord(patch.channelContributions)
    ? mergeAdstock(base.channelContributions, patch.channelContributions)
    : base.channelContributions;

  const channelRoi = isRecord(patch.channelRoi)
    ? mergeAdstock(base.channelRoi, patch.channelRoi)
    : base.channelRoi;

  const runtimeMetrics = patch.runtimeMetrics
    ? mergeRuntimeMetrics(base.runtimeMetrics, patch.runtimeMetrics)
    : base.runtimeMetrics;

  return {
    ...base,
    ...(typeof patch.totalSales === "number" ? { totalSales: patch.totalSales } : null),
    ...(typeof patch.baseSales === "number" ? { baseSales: patch.baseSales } : null),
    ...(typeof patch.incrementalSales === "number" ? { incrementalSales: patch.incrementalSales } : null),
    ...(typeof patch.traffic === "number" ? { traffic: patch.traffic } : null),
    ...(typeof patch.leads === "number" ? { leads: patch.leads } : null),
    ...(typeof patch.conversions === "number" ? { conversions: patch.conversions } : null),
    channelContributions,
    channelRoi,
    ...(runtimeMetrics ? { runtimeMetrics } : null),
  };
}

function normalizeIndustry(value: unknown): Industry | undefined {
  if (typeof value !== "string") return undefined;
  // Keep this list in sync with `src/types/index.ts` (Industry union).
  const allowed = new Set<Industry>([
    "healthcare",
    "legal",
    "ecommerce",
    "saas",
    "fintech",
    "education",
    "real-estate",
    "food-delivery",
    "fitness",
    "automotive",
    "travel",
    "gaming",
    "fashion",
    "construction",
    "energy",
    "agritech",
    "manufacturing",
    "nonprofit",
    "music",
    "sports",
    "pet-care",
    "home-services",
    "cannabis",
    "space",
  ]);

  if (allowed.has(value as Industry)) return value as Industry;
  return undefined;
}

function mergeEngineState(
  base: SimulationState,
  patch: unknown,
  derivedIndustry: Industry | undefined,
): SimulationState {
  if (!isRecord(patch)) {
    return derivedIndustry ? { ...base, industry: derivedIndustry } : base;
  }

  const patchIndustry = normalizeIndustry(patch.industry);
  const industry = patchIndustry ?? derivedIndustry ?? base.industry;

  const marketConditions = patch.marketConditions
    ? mergeMarketConditions(base.marketConditions, patch.marketConditions)
    : base.marketConditions;

  const adstock = patch.adstock ? mergeAdstock(base.adstock, patch.adstock) : base.adstock;

  const results = patch.results ? mergeSimulationOutput(base.results, patch.results) : base.results;

  const tacticLifetimeUses = patch.tacticLifetimeUses
    ? mergeTacticLifetimeUses(base.tacticLifetimeUses, patch.tacticLifetimeUses)
    : base.tacticLifetimeUses;

  const stressMeters = isRecord(patch.stressMeters)
    ? {
        ceo: typeof patch.stressMeters.ceo === "number" ? patch.stressMeters.ceo : base.stressMeters?.ceo ?? 75,
        cfo: typeof patch.stressMeters.cfo === "number" ? patch.stressMeters.cfo : base.stressMeters?.cfo ?? 75,
        cmo: typeof patch.stressMeters.cmo === "number" ? patch.stressMeters.cmo : base.stressMeters?.cmo ?? 75,
      }
    : base.stressMeters;

  const brandPosition = isRecord(patch.brandPosition)
    ? {
        x: typeof patch.brandPosition.x === "number" ? patch.brandPosition.x : base.brandPosition?.x ?? 50,
        y: typeof patch.brandPosition.y === "number" ? patch.brandPosition.y : base.brandPosition?.y ?? 50,
      }
    : base.brandPosition;

  return {
    ...base,
    ...(typeof patch.tick === "number" ? { tick: patch.tick } : null),
    marketConditions,
    adstock,
    results,
    ...(tacticLifetimeUses ? { tacticLifetimeUses } : null),
    stressMeters,
    brandPosition,
    ...(typeof patch.trustMultiplier === "number" ? { trustMultiplier: patch.trustMultiplier } : null),
    ...(typeof patch.flowState === "number" ? { flowState: patch.flowState } : null),
    ...(industry ? { industry } : null),
  };
}

function resolvePlayStep(base: PlayStepId, value: unknown): PlayStepId {
  if (typeof value !== "string") return base;
  return (PLAY_STEPS as readonly string[]).includes(value) ? (value as PlayStepId) : "setup";
}

export function mergeSimulationContext(
  base: SimulationContext,
  patch: HydrationPatch,
): SimulationContext {
  const strategy = {
    ...base.strategy,
    ...(patch.strategy ?? {}),
  };

  const derivedIndustry = normalizeIndustry((patch.strategy as { industry?: unknown } | undefined)?.industry);

  const quartersPatch = patch.quarters;
  const quarters = quartersPatch
    ? {
        Q1: { ...base.quarters.Q1, ...(quartersPatch.Q1 ?? {}) },
        Q2: { ...base.quarters.Q2, ...(quartersPatch.Q2 ?? {}) },
        Q3: { ...base.quarters.Q3, ...(quartersPatch.Q3 ?? {}) },
        Q4: { ...base.quarters.Q4, ...(quartersPatch.Q4 ?? {}) },
      }
    : base.quarters;

  return {
    ...base,
    ...patch,
    startedAt: coerceDate(patch.startedAt) ?? base.startedAt,
    strategy,
    quarters,
    kpis: { ...base.kpis, ...(patch.kpis ?? {}) },
    engineState: mergeEngineState(base.engineState, patch.engineState as unknown, derivedIndustry),
    wildcards: patch.wildcards ?? base.wildcards,
    hiredTalent: patch.hiredTalent ?? base.hiredTalent,
    playStep: resolvePlayStep(base.playStep, patch.playStep),
  };
}
