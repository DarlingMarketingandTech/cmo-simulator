import type { Channel } from "@/types/engine";
import type { DifficultyLevel } from "@/types";
/** Avoid divide-by-zero in SOV denominators. */
export const SOV_EPSILON = 500;

export type AudienceArchetype =
  | "young_professional"
  | "family"
  | "millennial_tech"
  | "budget_consumer"
  | "luxury"
  | "small_business"
  | "balanced";

/** Runtime difficulty knobs — tune here without touching engine formulas. */
export interface EngineDifficultyRuntimeTuning {
  /** Minimum traffic multiplier from competitive pressure when blended SOV → 0 (after normalization). */
  dragFloor: number;
  /** Added to dragFloor when blended SOV → 1 (effective multiplier reaches dragFloor + dragSpan). */
  dragSpan: number;
  /** Scales how much accumulated tactic repeats reduce traffic (before clamp). */
  fatigueSensitivity: number;
  /** Minimum fatigue multiplier (cap how harsh repeats feel). */
  fatigueClampMin: number;
  /** Multiplier on lead rate × conversion stack (difficulty shapes funnel harshness). */
  funnelEfficiencyScalar: number;
}

export const ENGINE_RUNTIME_TUNING: Record<DifficultyLevel, EngineDifficultyRuntimeTuning> = {
  beginner: {
    dragFloor: 0.88,
    dragSpan: 0.12,
    fatigueSensitivity: 0.035,
    fatigueClampMin: 0.88,
    funnelEfficiencyScalar: 1.28,
  },
  intermediate: {
    dragFloor: 0.78,
    dragSpan: 0.22,
    fatigueSensitivity: 0.055,
    fatigueClampMin: 0.82,
    funnelEfficiencyScalar: 1.0,
  },
  advanced: {
    dragFloor: 0.66,
    dragSpan: 0.34,
    fatigueSensitivity: 0.08,
    fatigueClampMin: 0.74,
    funnelEfficiencyScalar: 0.72,
  },
};

/** Narrow band around 1.0 — downstream clamps applied in engine. */
export const AUDIENCE_ARCHETYPE_CHANNEL_FIT: Record<
  AudienceArchetype,
  Partial<Record<Channel, number>>
> = {
  young_professional: { digital: 1.06, social: 1.07, seo: 1.03, tv: 0.96, print: 0.95 },
  family: { tv: 1.05, radio: 1.04, social: 1.04, digital: 1.02, events: 1.03 },
  millennial_tech: { digital: 1.07, social: 1.06, seo: 1.08, pr: 1.04, tv: 0.94 },
  budget_consumer: { digital: 1.05, social: 1.03, seo: 1.06, tv: 0.97, radio: 0.96, print: 0.96 },
  luxury: { tv: 1.05, print: 1.04, events: 1.06, pr: 1.05, digital: 1.02 },
  small_business: { digital: 1.05, events: 1.05, pr: 1.04, seo: 1.06, tv: 0.97 },
  balanced: {},
};

/** Keys must match `STRATEGY_AUDIENCE_PRESETS` literals in strategy setup UI. */
const PRESET_TO_ARCHETYPE: Record<string, AudienceArchetype> = {
  "Young Professionals (25-35)": "young_professional",
  "Families with Children": "family",
  "Tech-Savvy Millennials": "millennial_tech",
  "Budget-Conscious Consumers": "budget_consumer",
  "Premium/Luxury Seekers": "luxury",
  "Small Business Owners": "small_business",
};

export function strategyAudiencePresetToArchetype(targetAudience?: string): AudienceArchetype {
  const trimmed = targetAudience?.trim();
  if (!trimmed) return "balanced";

  const preset = PRESET_TO_ARCHETYPE[trimmed];
  if (preset) return preset;

  const lower = trimmed.toLowerCase();
  if (/enterprise|b2b|business\s*owner| smb\b|company/i.test(lower)) return "small_business";
  if (/luxury|premium|affluent/i.test(lower)) return "luxury";
  if (/budget|value|price|conscious/i.test(lower)) return "budget_consumer";
  if (/family|parent|children/i.test(lower)) return "family";
  if (/millennial|gen\s*z|tech/i.test(lower)) return "millennial_tech";
  if (/young|professional|25|35/i.test(lower)) return "young_professional";

  return "balanced";
}

export function getDifficultyRuntimeTuning(level: DifficultyLevel): EngineDifficultyRuntimeTuning {
  return ENGINE_RUNTIME_TUNING[level];
}

export function computeAudienceFitMultiplier(args: {
  archetype: AudienceArchetype;
  channelWeights: Partial<Record<Channel, number>>;
  /** Sum of weights — if 0, returns 1 */
  totalWeight: number;
}): number {
  const { archetype, channelWeights, totalWeight } = args;
  if (!(totalWeight > 0)) return 1;

  const table = AUDIENCE_ARCHETYPE_CHANNEL_FIT[archetype];
  let sum = 0;
  for (const channel of Object.keys(channelWeights) as Channel[]) {
    const w = channelWeights[channel];
    if (typeof w !== "number" || !(w > 0)) continue;
    const rawFit = table[channel];
    const fit = typeof rawFit === "number" && Number.isFinite(rawFit) ? rawFit : 1;
    sum += (w / totalWeight) * fit;
  }
  return sum;
}
