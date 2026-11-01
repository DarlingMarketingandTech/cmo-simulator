import { createActor } from "xstate";
import { simulationMachine, type Tactic } from "../simMachine";

const tactic: Tactic = {
  id: "digital-1",
  name: "Programmatic Display Advertising",
  category: "digital",
  cost: 150000,
  timeRequired: 8,
  expectedImpact: {
    revenue: 1,
    marketShare: 1,
    customerSatisfaction: 1,
    brandAwareness: 1,
  },
};

describe("tactic budget", () => {
  test("removing a move refunds the quarter budget while the machine is idle", () => {
    const actor = createActor(simulationMachine);
    actor.start();
    const startingBudget = actor.getSnapshot().context.remainingBudget;

    actor.send({ type: "ADD_TACTIC", quarter: "Q1", tactic });
    expect(actor.getSnapshot().context.quarters.Q1.tactics.map((item) => item.id)).toEqual(["digital-1"]);
    expect(actor.getSnapshot().context.remainingBudget).toBe(startingBudget - tactic.cost);

    actor.send({ type: "REMOVE_TACTIC", quarter: "Q1", tacticId: tactic.id });
    expect(actor.getSnapshot().context.quarters.Q1.tactics).toEqual([]);
    expect(actor.getSnapshot().context.remainingBudget).toBe(startingBudget);
  });

  test("removing a move refunds the budget once when the machine is already in Q1", () => {
    const actor = createActor(simulationMachine);
    actor.start();
    actor.send({ type: "START_SIMULATION" });
    actor.send({
      type: "SET_STRATEGY",
      strategy: {
        targetAudience: "Operators",
        brandPositioning: "Reliable",
        primaryChannels: ["digital"],
      },
    });
    actor.send({ type: "COMPLETE_STRATEGY_SESSION" });
    expect(actor.getSnapshot().value).toBe("Q1");

    const startingBudget = actor.getSnapshot().context.remainingBudget;
    actor.send({ type: "ADD_TACTIC", quarter: "Q1", tactic });
    actor.send({ type: "REMOVE_TACTIC", quarter: "Q1", tacticId: tactic.id });

    expect(actor.getSnapshot().context.quarters.Q1.tactics).toEqual([]);
    expect(actor.getSnapshot().context.remainingBudget).toBe(startingBudget);
  });
});
