import { createActor } from "xstate";
import { simulationMachine, type SimulationContext, type Tactic } from "../simMachine";
import {
  getCurrentProgressRouteFromSnapshot,
  machinePhaseForRoute,
  resolveResumeRoute,
} from "../simulationProgress";

const tactic: Tactic = {
  id: "content-2",
  name: "Case study",
  category: "content",
  cost: 1000,
  timeRequired: 4,
  expectedImpact: {
    revenue: 1,
    marketShare: 1,
    customerSatisfaction: 1,
    brandAwareness: 1,
  },
};

function q2Snapshot() {
  return {
    simulationId: "run-1",
    scenarioId: "challenger",
    strategy: {
      companyName: "Guided Demo Co.",
      logoStyle: "monogram" as const,
      targetAudience: "Young Professionals (25-35)",
      brandPositioning: "Innovation & Technology",
      primaryChannels: ["digital", "content"],
      budgetAllocation: { brandAwareness: 35, leadGeneration: 40, conversionOptimization: 25 },
    },
    quarters: {
      Q1: {
        tactics: [],
        budgetSpent: 0,
        timeSpent: 0,
        wildcardEvents: [],
        results: {
          revenue: 120000,
          profit: 10000,
          marketShare: 12,
          customerSatisfaction: 80,
          brandAwareness: 40,
        },
      },
    },
  };
}

describe("simulation resume", () => {
  test("restores a mid-run snapshot into the matching quarter and accepts a tactic", () => {
    const snapshot = q2Snapshot();
    const route = getCurrentProgressRouteFromSnapshot(snapshot as unknown as Partial<SimulationContext>);
    expect(route).toBe("/sim/q2");

    const actor = createActor(simulationMachine);
    actor.start();
    actor.send({
      type: "RESTORE_SIMULATION",
      context: snapshot,
      phase: machinePhaseForRoute(route),
    });

    expect(actor.getSnapshot().value).toBe("Q2");
    actor.send({ type: "ADD_TACTIC", quarter: "Q2", tactic });
    expect(actor.getSnapshot().context.quarters.Q2.tactics.map((item) => item.id)).toEqual(["content-2"]);
    expect(actor.getSnapshot().context.strategy.companyName).toBe("Guided Demo Co.");
  });

  test("uses the saved snapshot when the live machine is still empty", () => {
    const route = resolveResumeRoute({
      context: {
        simulationId: undefined,
        scenarioId: undefined,
        strategy: {},
      } as never,
      snapshot: q2Snapshot() as unknown as Partial<SimulationContext>,
      isReady: true,
    });

    expect(route).toBe("/sim/q2");
  });
});
