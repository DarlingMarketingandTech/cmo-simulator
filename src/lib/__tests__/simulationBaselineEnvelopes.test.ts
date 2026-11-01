import {
  createInitialSimulationContext,
  processQuarterAdvance,
  type SimulationContext,
  type Tactic,
} from "@/lib/simMachine";
import {
  getSimulationScenarioById,
  type SimulationScenarioId,
} from "@/lib/config/simulationScenarios";
import { getTacticById } from "@/lib/tactics";
import {
  calculateExecutiveScoreRubric,
  calculateOverallScore,
} from "@/lib/simulationInsights";
import type { DifficultyLevel } from "@/types";

type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";

const QUARTERS: QuarterKey[] = ["Q1", "Q2", "Q3", "Q4"];

const BASELINE_PLANS: Record<QuarterKey, string[]> = {
  Q1: ["digital-1", "content-1", "partnerships-1"],
  Q2: ["digital-2", "events-1", "content-2"],
  Q3: ["digital-5", "partnerships-2", "events-3"],
  Q4: ["traditional-1", "content-4", "partnerships-3"],
};

interface BaselineRunResult {
  scenarioId: SimulationScenarioId;
  difficulty: DifficultyLevel;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
  overallScore: number;
  rubric: ReturnType<typeof calculateExecutiveScoreRubric>;
}

function mustGetTactic(id: string): Tactic {
  const tactic = getTacticById(id);
  if (!tactic) {
    throw new Error(`Missing tactic in catalog: ${id}`);
  }
  return tactic;
}

function applyScenario(
  context: SimulationContext,
  scenarioId: SimulationScenarioId,
): SimulationContext {
  const scenario = getSimulationScenarioById(scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  return {
    ...context,
    scenarioId,
    totalBudget: scenario.budget,
    remainingBudget: scenario.budget,
    strategy: {
      ...context.strategy,
      companyName: `Baseline ${scenarioId}`,
      targetAudience: "Growth-minded operations leaders",
      brandPositioning: "Reliable growth with measurable ROI",
      primaryChannels: ["digital", "content", "events"],
      industry: scenario.industry,
      marketLandscape: scenario.marketLandscape,
      timeHorizon: scenario.timeHorizon,
      budgetAllocation: {
        brandAwareness: 30,
        leadGeneration: 40,
        customerRetention: 30,
      },
    },
    kpis: { ...scenario.startingKPIs },
    quarters: {
      Q1: { ...context.quarters.Q1, tactics: [], wildcardEvents: [] },
      Q2: { ...context.quarters.Q2, tactics: [], wildcardEvents: [] },
      Q3: { ...context.quarters.Q3, tactics: [], wildcardEvents: [] },
      Q4: { ...context.quarters.Q4, tactics: [], wildcardEvents: [] },
    },
  };
}

function runScenarioBaseline(
  scenarioId: SimulationScenarioId,
  difficulty: DifficultyLevel,
): BaselineRunResult {
  let context = applyScenario(createInitialSimulationContext(), scenarioId);
  context = {
    ...context,
    strategy: {
      ...context.strategy,
      difficulty,
    },
  };

  for (const quarter of QUARTERS) {
    const tactics = BASELINE_PLANS[quarter].map(mustGetTactic);
    const nextContext = {
      ...context,
      quarters: {
        ...context.quarters,
        [quarter]: {
          ...context.quarters[quarter],
          tactics,
        },
      },
    };
    const { newEngineState, newQuarterData, newKpis } = processQuarterAdvance(
      nextContext,
      quarter,
    );
    context = {
      ...nextContext,
      engineState: newEngineState,
      kpis: newKpis,
      quarters: {
        ...nextContext.quarters,
        [quarter]: newQuarterData,
      },
    };
  }

  const rubric = calculateExecutiveScoreRubric(context);
  return {
    scenarioId,
    difficulty,
    revenue: context.kpis.revenue,
    profit: context.kpis.profit,
    marketShare: context.kpis.marketShare,
    customerSatisfaction: context.kpis.customerSatisfaction,
    brandAwareness: context.kpis.brandAwareness,
    overallScore: calculateOverallScore(context),
    rubric,
  };
}

describe("simulation baseline envelopes", () => {
  test("captures deterministic scenario x difficulty baseline grid", () => {
    const scenarios: SimulationScenarioId[] = [
      "turnaround",
      "hyper-growth",
      "challenger",
    ];
    const difficulties: DifficultyLevel[] = [
      "beginner",
      "intermediate",
      "advanced",
    ];

    const rows: BaselineRunResult[] = [];
    for (const scenarioId of scenarios) {
      for (const difficulty of difficulties) {
        rows.push(runScenarioBaseline(scenarioId, difficulty));
      }
    }

    expect(rows).toHaveLength(9);
    expect(rows.every((row) => Number.isFinite(row.overallScore))).toBe(true);
    expect(
      rows.map((row) => ({
        scenarioId: row.scenarioId,
        difficulty: row.difficulty,
        revenue: Math.round(row.revenue),
        profit: Math.round(row.profit),
        marketShare: Number(row.marketShare.toFixed(3)),
        customerSatisfaction: Number(row.customerSatisfaction.toFixed(3)),
        brandAwareness: Number(row.brandAwareness.toFixed(3)),
        overallScore: row.overallScore,
        growth: row.rubric.growth_quality,
        efficiency: row.rubric.efficiency,
        coherence: row.rubric.strategic_coherence,
        resilience: row.rubric.resilience,
        finish: row.rubric.finish_quality,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 79.8,
          "difficulty": "beginner",
          "efficiency": 0,
          "finish": 99,
          "growth": 74,
          "marketShare": 67.486,
          "overallScore": 59,
          "profit": -1077807,
          "resilience": 41,
          "revenue": 5047193,
          "scenarioId": "turnaround",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 79.8,
          "difficulty": "intermediate",
          "efficiency": 0,
          "finish": 99,
          "growth": 74,
          "marketShare": 67.486,
          "overallScore": 59,
          "profit": -1082271,
          "resilience": 41,
          "revenue": 5042729,
          "scenarioId": "turnaround",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 79.8,
          "difficulty": "advanced",
          "efficiency": 0,
          "finish": 99,
          "growth": 74,
          "marketShare": 67.486,
          "overallScore": 59,
          "profit": -1087200,
          "resilience": 41,
          "revenue": 5037800,
          "scenarioId": "turnaround",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 100,
          "difficulty": "beginner",
          "efficiency": 0,
          "finish": 90,
          "growth": 82,
          "marketShare": 58.174,
          "overallScore": 60,
          "profit": -476031,
          "resilience": 39,
          "revenue": 1848969,
          "scenarioId": "hyper-growth",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 100,
          "difficulty": "intermediate",
          "efficiency": 0,
          "finish": 90,
          "growth": 81,
          "marketShare": 58.174,
          "overallScore": 60,
          "profit": -552031,
          "resilience": 40,
          "revenue": 1772969,
          "scenarioId": "hyper-growth",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 100,
          "difficulty": "advanced",
          "efficiency": 0,
          "finish": 92,
          "growth": 80,
          "marketShare": 58.174,
          "overallScore": 60,
          "profit": -632900,
          "resilience": 40,
          "revenue": 1692100,
          "scenarioId": "hyper-growth",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 100,
          "difficulty": "beginner",
          "efficiency": 0,
          "finish": 86,
          "growth": 76,
          "marketShare": 57.458,
          "overallScore": 58,
          "profit": -865980,
          "resilience": 40,
          "revenue": 509020,
          "scenarioId": "challenger",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 100,
          "difficulty": "intermediate",
          "efficiency": 0,
          "finish": 85,
          "growth": 76,
          "marketShare": 57.458,
          "overallScore": 58,
          "profit": -891180,
          "resilience": 40,
          "revenue": 483820,
          "scenarioId": "challenger",
        },
        {
          "brandAwareness": 100,
          "coherence": 85,
          "customerSatisfaction": 100,
          "difficulty": "advanced",
          "efficiency": 0,
          "finish": 83,
          "growth": 76,
          "marketShare": 57.458,
          "overallScore": 57,
          "profit": -919740,
          "resilience": 40,
          "revenue": 455260,
          "scenarioId": "challenger",
        },
      ]
    `);
  });
});
