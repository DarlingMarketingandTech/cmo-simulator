# Linear play flow

Date: 2026-11-01
Status: Draft for review
Author: design session with Jacob

## 1. Decision

A simulation run is a single forward path with Back one step and Quit. The player does not use a sidebar to jump between quarters, campaigns, pipeline, or analytics.

This spec standardizes that path and names the modules that already turn choices into results. Later edits to variables and score range happen in those modules. They do not add new destinations.

## 2. What the player can do

Two places exist during a run.

**Home.** Start a new run, or resume the run saved on this device.

**Play.** One screen at `/sim/play`. The saved step decides the content. The actions are Back, Continue, and Quit.

Steps, in order:

1. Setup
2. Strategy
3. Q1 plan
4. Q1 review
5. Q2 plan
6. Q2 review
7. Q3 plan
8. Q3 review
9. Q4 plan
10. Q4 review
11. Final menu

Back opens the previous step only. Continue is available when the current step is complete. Later steps cannot be opened. An old address such as `/sim/q3`, `/sim/campaigns`, `/sim/pipeline`, or `/sim/analytics` opens `/sim/play` on the current step.

Quit asks for a confirm. Cancel stays on the step. Confirm returns to Home and leaves the run on this device. Resume opens the step they left. Refresh does the same.

The final menu is the first place with a choice of destinations. Until that step, Home is the only way out.

## 3. What each step contains

**Setup.** Scenario, company identity, and budget allocation. These are the inputs already collected on `/sim/setup`.

**Strategy.** Audience, positioning, and primary channels. This is the existing strategy session, not a quarter.

**Quarter plan.** The operating decisions for that quarter:

| Step | Choices already in the product |
|---|---|
| Q1 plan | Tactics |
| Q2 plan | Tactics, wildcard, talent-market hire |
| Q3 plan | Tactics, wildcard, big bet |
| Q4 plan | Tactics, wildcard |

The step explains each choice before the player commits. Continue requires at least one tactic inside the quarter budget. When the quarter presents a wildcard, Continue also requires an answer. A hire on Q2 and the big bet on Q3 are optional. When the player takes one, the following review includes it. When they skip it, the review does not invent one.

**Quarter review.** One page for the quarter just played:

- Campaign result: active tactics, cost, and the movement in revenue, profit, market share, satisfaction, and awareness.
- Pipeline: traffic, leads, and conversions from that mix.
- What changed: the wildcard, hire, or big bet, named with the direction it pushed the result.

Back from a review reopens that quarter’s plan. If the player changes a tactic, wildcard answer, hire, or big bet, Continue recalculates the review. The previous review is not kept next to a new choice.

**Final menu.** Three actions: open the debrief, start a new run, or return Home. This is the first menu after the path.

Campaigns, Pipeline, and Analytics are not separate steps and not sidebar items. Their information appears inside the quarter review.

## 4. Effect rule

Every choice on a plan step changes the review that follows it. A different tactic, wildcard answer, hire, or big bet must not produce the same review. Strategy choices from the strategy step show up in the quarter results.

Widening the finishing-score range, and adding new variables, is a later pass. This pass uses the choices that exist today. The current baseline still finishes between 65 and 67 for one fixed plan across scenarios. That flat range is not fixed here. The review must still change when the choice changes.

## 5. Where to edit later

Change the path in one place. Change the math in the modules below. Do not add a new route or nav item to introduce a variable.

| Later change | Edit here |
|---|---|
| Step order, what a step requires, Back and Continue rules | New ordered step list used by `/sim/play`. One module owns the sequence. |
| Which tactics exist, their cost, and their category | `src/lib/config/tacticCatalog.ts` and `src/lib/tactics.ts` |
| How tactic spend becomes channel budgets | `categoryToChannelMap` and `processQuarterAdvance` in `src/lib/simMachine.ts` |
| Adstock, saturation, synergy | `src/engine/` |
| Scenario, industry, quarter market conditions | `src/lib/marketConditions.ts`, called from `processQuarterAdvance` |
| Audience and difficulty inside the quarter tick | The options passed to `runSimulationTick` in `processQuarterAdvance` |
| Wildcard impact | `calculateEnhancedWildcardImpact` in `src/lib/enhancedWildcards.ts`, applied in `processQuarterAdvance` |
| Hire and big bet | `src/lib/talentMarket.ts` (`getRandomTalentPool`, `calculateBigBetOutcome`) |
| Quarter KPI rollup | The `results` and `newKpis` objects at the end of `processQuarterAdvance` |
| Rubric and overall score | `buildSimulationScoreBreakdowns` in `src/lib/simulationIntelligence.ts` |
| End-of-run letter grade kept on the machine | `calculateFinalResults` in `src/lib/simMachine.ts` |
| Review sentences | `src/lib/simulationReport.ts` and `src/lib/simulationInsights.ts` |
| Locked example outcomes | `src/lib/__tests__/simulationBaselineEnvelopes.test.ts` and `docs/SIMULATION_BASELINE_ENVELOPES.md` |

`processQuarterAdvance` is the quarter calculator. `buildSimulationScoreBreakdowns` is the score calculator. A new variable enters the first, then the second, then the review copy. The step list does not change unless the player needs a new step to make that choice.

## 6. Persistence and failure

The run is written on this device when a step changes. The key remains `cmo-sim-state-v2`.

A corrupt save offers a reset of the local run and a return to Home. It does not leave a blank play screen. A failed write warns the player and does not block Continue.

Guest play does not call `POST /api/simulation-events`. That route stays authenticated. Signed-in recording stays as it is.

## 7. Proof

- Continue walks Setup through the final menu in order.
- Back from Q2 review opens the Q2 plan and does not open Q1.
- A different Q1 tactic changes the Q1 review.
- Quit, confirm, and Resume return to the same step after a refresh.
- `/sim/q3` lands on the current step at `/sim/play`.

## 8. Out of scope

- New campaign variables beyond tactics, wildcards, hires, and the Q3 big bet.
- Widening the 65–67 overall-score band.
- Replacing Supabase.
- Leaderboard or share features.
- A sidebar, even a locked one, during the run.

## 9. Success

A new player can finish a year without choosing a destination. A later editor can change a tactic effect, a wildcard, or a score weight by opening the module named in section 5, without hunting through navigation.
