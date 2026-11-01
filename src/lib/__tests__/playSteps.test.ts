import {
  canContinuePlayStep,
  canContinueSetup,
  canContinueStrategy,
  legacyPathOpensPlay,
  nextPlayStep,
  PLAY_STEPS,
  previousPlayStep,
} from "../playSteps";

describe("play step order", () => {
  test("lists the eleven approved steps in order", () => {
    expect(PLAY_STEPS).toEqual([
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
    ]);
  });

  test("moves forward one step and stops after the final menu", () => {
    expect(nextPlayStep("q1-plan")).toBe("q1-review");
    expect(nextPlayStep("final-menu")).toBeNull();
  });

  test("moves back one step and stops before setup", () => {
    expect(previousPlayStep("q2-review")).toBe("q2-plan");
    expect(previousPlayStep("q2-plan")).toBe("q1-review");
    expect(previousPlayStep("setup")).toBeNull();
  });
});

const openQuarter = {
  tacticCount: 1,
  spend: 1000,
  quarterBudget: 125000,
  wildcardPresented: false,
  wildcardAnswered: false,
};

describe("continue gates", () => {
  test("setup requires scenario, company, logo, and a budget allocation", () => {
    expect(canContinueSetup({
      scenarioId: "challenger",
      companyName: "Guided Demo Co.",
      logoStyle: "monogram",
      hasBudgetAllocation: true,
    })).toBe(true);
    expect(canContinueSetup({
      scenarioId: null,
      companyName: "",
      logoStyle: null,
      hasBudgetAllocation: false,
    })).toBe(false);
  });

  test("strategy requires audience, positioning, and one channel", () => {
    expect(canContinueStrategy({
      targetAudience: "Young professionals",
      brandPositioning: "Innovation",
      channelCount: 1,
    })).toBe(true);
    expect(canContinueStrategy({
      targetAudience: "",
      brandPositioning: "Innovation",
      channelCount: 1,
    })).toBe(false);
  });

  test("a quarter plan requires a tactic inside budget", () => {
    expect(canContinuePlayStep("q1-plan", openQuarter)).toBe(true);
    expect(canContinuePlayStep("q1-plan", { ...openQuarter, tacticCount: 0 })).toBe(false);
    expect(canContinuePlayStep("q1-plan", { ...openQuarter, spend: 200000 })).toBe(false);
  });

  test("a presented wildcard must be answered", () => {
    expect(canContinuePlayStep("q2-plan", {
      ...openQuarter,
      wildcardPresented: true,
      wildcardAnswered: false,
    })).toBe(false);
    expect(canContinuePlayStep("q2-plan", {
      ...openQuarter,
      wildcardPresented: true,
      wildcardAnswered: true,
    })).toBe(true);
  });

  test("review and the final menu can continue without tactics", () => {
    expect(canContinuePlayStep("q1-review")).toBe(true);
    expect(canContinuePlayStep("final-menu")).toBe(false);
  });
});

describe("legacy paths", () => {
  test("quarter and CRM paths belong to the play screen", () => {
    expect(legacyPathOpensPlay("/sim/q3")).toBe(true);
    expect(legacyPathOpensPlay("/sim/campaigns")).toBe(true);
    expect(legacyPathOpensPlay("/sim/pipeline")).toBe(true);
    expect(legacyPathOpensPlay("/sim/analytics")).toBe(true);
    expect(legacyPathOpensPlay("/sim/play")).toBe(false);
    expect(legacyPathOpensPlay("/sim")).toBe(false);
  });

  test("a nested debrief path also opens play", () => {
    expect(legacyPathOpensPlay("/sim/q2/debrief")).toBe(true);
  });
});
