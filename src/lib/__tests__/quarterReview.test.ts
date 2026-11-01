import { createInitialSimulationContext, processQuarterAdvance } from "../simMachine";
import { getSimulationScenarioById } from "../config/simulationScenarios";
import { getTacticById } from "../tactics";
import { quarterReviewFacts, reviewsDiffer } from "../quarterReview";

function runQ1(tacticId: string) {
  const scenario = getSimulationScenarioById("challenger");
  if (!scenario) throw new Error("missing challenger scenario");
  const tactic = getTacticById(tacticId);
  if (!tactic) throw new Error(`missing tactic ${tacticId}`);
  const context = createInitialSimulationContext();
  context.scenarioId = "challenger";
  context.totalBudget = scenario.budget;
  context.remainingBudget = scenario.budget;
  context.strategy = {
    ...context.strategy,
    companyName: "Review Co",
    targetAudience: "Growth-minded operations leaders",
    brandPositioning: "Reliable growth with measurable ROI",
    primaryChannels: ["digital", "content"],
    industry: scenario.industry,
    marketLandscape: scenario.marketLandscape,
    difficulty: "intermediate",
  };
  context.kpis = { ...scenario.startingKPIs };
  context.quarters.Q1.tactics = [tactic];
  const advanced = processQuarterAdvance(context, "Q1");
  return quarterReviewFacts({
    tacticIds: [tacticId],
    revenue: advanced.newQuarterData.results.revenue,
    profit: advanced.newQuarterData.results.profit,
    marketShare: advanced.newQuarterData.results.marketShare,
    customerSatisfaction: advanced.newQuarterData.results.customerSatisfaction,
    brandAwareness: advanced.newQuarterData.results.brandAwareness,
  });
}

describe("quarter review facts", () => {
  test("a different Q1 tactic changes the review", () => {
    const digital = runQ1("digital-1");
    const content = runQ1("content-1");
    expect(reviewsDiffer(digital, content)).toBe(true);
  });

  test("skipping a hire does not invent a hire id", () => {
    const review = quarterReviewFacts({
      tacticIds: ["digital-1"],
      revenue: 1,
      profit: 1,
      marketShare: 1,
      customerSatisfaction: 1,
      brandAwareness: 1,
    });
    expect(review.hiredTalentId).toBeNull();
    expect(review.bigBetId).toBeNull();
    expect(review.wildcardChoiceId).toBeNull();
  });
});
