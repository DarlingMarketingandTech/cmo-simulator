import { nextPlayStep, PLAY_STEPS, previousPlayStep } from "../playSteps";

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
