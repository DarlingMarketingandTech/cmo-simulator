import { createInitialSimulationContext, processQuarterAdvance, type SimulationContext } from "../simMachine";
import { getSimulationScenarioById } from "../config/simulationScenarios";
import { getTacticById } from "../tactics";
import { ENHANCED_WILDCARDS } from "../enhancedWildcards";
import { BIG_BETS, TALENT_POOL } from "../talentMarket";
import { quarterReviewFacts, reviewsDiffer, type QuarterReviewFacts } from "../quarterReview";

function reviewFrom(context: SimulationContext, quarter: "Q1" | "Q2" | "Q3" | "Q4"): QuarterReviewFacts {
  const quarterData = context.quarters[quarter];
  const advanced = processQuarterAdvance(context, quarter);
  return quarterReviewFacts({
    tacticIds: quarterData.tactics.map((tactic) => tactic.id),
    wildcardChoiceId: quarterData.wildcardEvents.find((event) => event.selectedChoice)?.selectedChoice ?? null,
    hiredTalentId: quarterData.talentHired?.[0]?.id ?? null,
    bigBetId: quarterData.bigBetMade?.id ?? null,
    revenue: advanced.newQuarterData.results.revenue,
    profit: advanced.newQuarterData.results.profit,
    marketShare: advanced.newQuarterData.results.marketShare,
    customerSatisfaction: advanced.newQuarterData.results.customerSatisfaction,
    brandAwareness: advanced.newQuarterData.results.brandAwareness,
  });
}

function contextWithTactic(quarter: "Q1" | "Q2" | "Q3" | "Q4", tacticId: string): SimulationContext {
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
  context.quarters[quarter].tactics = [tactic];
  return context;
}

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
    const review = reviewFrom(contextWithTactic("Q2", "digital-2"), "Q2");
    expect(review.hiredTalentId).toBeNull();
    expect(review.bigBetId).toBeNull();
    expect(review.wildcardChoiceId).toBeNull();
  });

  test("a different wildcard answer changes the quarter review", () => {
    const wildcard = ENHANCED_WILDCARDS[0];
    const hold = wildcard.choices[0];
    const disclose = wildcard.choices[2];
    const withChoice = (choiceId: string, impact: typeof hold.impact) => {
      const context = contextWithTactic("Q2", "digital-2");
      context.quarters.Q2.wildcardEvents = [
        { ...wildcard, selectedChoice: choiceId, chosenResponse: choiceId, impact },
      ];
      return reviewFrom(context, "Q2");
    };

    const held = withChoice(hold.id, hold.impact);
    const disclosed = withChoice(disclose.id, disclose.impact);
    expect(reviewsDiffer(held, disclosed)).toBe(true);
    expect(held.revenue).not.toBe(disclosed.revenue);
  });

  test("hiring changes the quarter review and skipping does not invent a hire", () => {
    const skipped = reviewFrom(contextWithTactic("Q2", "digital-2"), "Q2");
    const hiredContext = contextWithTactic("Q2", "digital-2");
    hiredContext.quarters.Q2.talentHired = [TALENT_POOL[0]];
    const hired = reviewFrom(hiredContext, "Q2");

    expect(skipped.hiredTalentId).toBeNull();
    expect(hired.hiredTalentId).toBe(TALENT_POOL[0].id);
    expect(reviewsDiffer(skipped, hired)).toBe(true);
    expect(hired.revenue).not.toBe(skipped.revenue);
  });

  test("a different hire changes the quarter review", () => {
    const withHire = (index: number) => {
      const context = contextWithTactic("Q2", "digital-2");
      context.quarters.Q2.talentHired = [TALENT_POOL[index]];
      return reviewFrom(context, "Q2");
    };
    const first = withHire(0);
    const second = withHire(1);
    expect(reviewsDiffer(first, second)).toBe(true);
    expect(first.revenue).not.toBe(second.revenue);
  });

  test("a different budget split changes the quarter review", () => {
    const withSplit = (leadGeneration: number, brandAwareness: number) => {
      const context = contextWithTactic("Q1", "digital-1");
      context.strategy.budgetAllocation = {
        brandAwareness,
        leadGeneration,
        conversionOptimization: 100 - brandAwareness - leadGeneration,
      };
      return reviewFrom(context, "Q1");
    };
    const demand = withSplit(70, 15);
    const brand = withSplit(15, 70);
    expect(reviewsDiffer(demand, brand)).toBe(true);
    expect(demand.revenue).not.toBe(brand.revenue);
  });

  test("placing a big bet changes the quarter review and skipping does not invent one", () => {
    const skipped = reviewFrom(contextWithTactic("Q3", "digital-5"), "Q3");
    const bet = BIG_BETS[0];
    const placedContext = contextWithTactic("Q3", "digital-5");
    placedContext.quarters.Q3.bigBetMade = bet;
    placedContext.bigBetOutcome = {
      success: true,
      actualImpact: { ...bet.potentialImpact },
    };
    const placed = reviewFrom(placedContext, "Q3");

    expect(skipped.bigBetId).toBeNull();
    expect(placed.bigBetId).toBe(bet.id);
    expect(reviewsDiffer(skipped, placed)).toBe(true);
    expect(placed.revenue).not.toBe(skipped.revenue);
  });
});
