import { createInitialSimulationContext } from "@/lib/simMachine";
import {
  buildSimulationScoreBreakdowns,
  deriveSimulationRecommendations,
} from "@/lib/simulationIntelligence";
import { SAMPLE_TACTICS } from "@/lib/tactics";

describe("simulationIntelligence", () => {
  test("includes executive rubric rows and debrief metadata", () => {
    const context = createInitialSimulationContext();
    context.strategy.companyName = "Acme";
    context.strategy.targetAudience = "Mid-market SaaS teams";
    context.strategy.brandPositioning = "Fastest enterprise onboarding";
    context.strategy.primaryChannels = ["digital", "content"];
    context.scenarioId = "challenger";

    context.quarters.Q1.tactics = [SAMPLE_TACTICS[0], SAMPLE_TACTICS[1]];
    context.quarters.Q2.tactics = [SAMPLE_TACTICS[3], SAMPLE_TACTICS[4]];
    context.quarters.Q3.tactics = [SAMPLE_TACTICS[6]];
    context.quarters.Q4.tactics = [SAMPLE_TACTICS[8]];

    context.quarters.Q1.results = {
      revenue: 120000,
      profit: 22000,
      marketShare: 11,
      customerSatisfaction: 72,
      brandAwareness: 35,
    };
    context.quarters.Q2.results = {
      revenue: 180000,
      profit: 36000,
      marketShare: 13,
      customerSatisfaction: 74,
      brandAwareness: 42,
    };
    context.quarters.Q3.results = {
      revenue: 220000,
      profit: 48000,
      marketShare: 15,
      customerSatisfaction: 76,
      brandAwareness: 48,
    };
    context.quarters.Q4.results = {
      revenue: 280000,
      profit: 61000,
      marketShare: 18,
      customerSatisfaction: 79,
      brandAwareness: 55,
    };
    context.kpis = {
      revenue: 800000,
      profit: 167000,
      marketShare: 18,
      customerSatisfaction: 79,
      brandAwareness: 55,
    };

    const rows = buildSimulationScoreBreakdowns(context);
    const rubricRows = rows.filter((row) => row.phase === "rubric");
    const debrief = rows.find((row) => row.phase === "debrief");

    expect(rubricRows).toHaveLength(5);
    expect(
      rubricRows.map((row) => row.category).sort(),
    ).toEqual([
      "efficiency",
      "finish_quality",
      "growth_quality",
      "resilience",
      "strategic_coherence",
    ]);
    expect(debrief?.metadata).toMatchObject({
      rubricVersion: 2,
    });
  });

  test("returns prioritized recommendation set capped to 6 items", () => {
    const context = createInitialSimulationContext();
    context.strategy.companyName = "LeanCo";
    context.strategy.targetAudience = "";
    context.strategy.brandPositioning = "";
    context.strategy.primaryChannels = [];
    context.scenarioId = "turnaround";
    context.totalBudget = 2_000_000;
    context.remainingBudget = 1_700_000;

    context.quarters.Q1.results = {
      revenue: 45000,
      profit: -12000,
      marketShare: 8,
      customerSatisfaction: 63,
      brandAwareness: 24,
    };
    context.quarters.Q2.results = {
      revenue: 52000,
      profit: -5000,
      marketShare: 8.5,
      customerSatisfaction: 64,
      brandAwareness: 25,
    };
    context.quarters.Q3.results = {
      revenue: 61000,
      profit: -3000,
      marketShare: 9,
      customerSatisfaction: 65,
      brandAwareness: 26,
    };
    context.quarters.Q4.results = {
      revenue: 70000,
      profit: 1000,
      marketShare: 9.2,
      customerSatisfaction: 66,
      brandAwareness: 27,
    };
    context.kpis = {
      revenue: 228000,
      profit: -19000,
      marketShare: 9.2,
      customerSatisfaction: 66,
      brandAwareness: 27,
    };

    const rows = buildSimulationScoreBreakdowns(context);
    const recommendations = deriveSimulationRecommendations(context, rows);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(6);
    expect(recommendations[0].priority).toBe(1);
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: "rubric" }),
      ]),
    );
  });
});

