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
