export type PlayStepId =
  | "setup"
  | "strategy"
  | "q1-plan"
  | "q1-review"
  | "q2-plan"
  | "q2-review"
  | "q3-plan"
  | "q3-review"
  | "q4-plan"
  | "q4-review"
  | "final-menu";

export const PLAY_STEPS = [
  "setup",
  "strategy",
  "q1-plan",
  "q1-review",
  "q2-plan",
  "q2-review",
  "q3-plan",
  "q3-review",
  "q4-plan",
  "q4-review",
  "final-menu",
] as const satisfies readonly PlayStepId[];

export function nextPlayStep(step: PlayStepId): PlayStepId | null {
  const index = PLAY_STEPS.indexOf(step);
  if (index < 0 || index === PLAY_STEPS.length - 1) return null;
  return PLAY_STEPS[index + 1];
}

export function previousPlayStep(step: PlayStepId): PlayStepId | null {
  const index = PLAY_STEPS.indexOf(step);
  if (index <= 0) return null;
  return PLAY_STEPS[index - 1];
}

export interface PlayContinueInput {
  tacticCount: number;
  spend: number;
  quarterBudget: number;
  wildcardPresented: boolean;
  wildcardAnswered: boolean;
}

const PLAN_STEPS: readonly PlayStepId[] = ["q1-plan", "q2-plan", "q3-plan", "q4-plan"];

export function canContinueSetup(input: {
  scenarioId: string | null;
  companyName: string;
  logoStyle: string | null;
  hasBudgetAllocation: boolean;
}): boolean {
  return Boolean(
    input.scenarioId
    && input.companyName.trim()
    && input.logoStyle
    && input.hasBudgetAllocation,
  );
}

export function canContinueStrategy(input: {
  targetAudience: string;
  brandPositioning: string;
  channelCount: number;
}): boolean {
  return Boolean(
    input.targetAudience.trim()
    && input.brandPositioning.trim()
    && input.channelCount > 0,
  );
}

export function canContinuePlayStep(step: PlayStepId, input?: PlayContinueInput): boolean {
  if (step === "final-menu") return false;
  if (!PLAN_STEPS.includes(step)) return true;
  if (!input) return false;
  if (input.tacticCount < 1) return false;
  if (input.spend > input.quarterBudget) return false;
  if (input.wildcardPresented && !input.wildcardAnswered) return false;
  return true;
}
