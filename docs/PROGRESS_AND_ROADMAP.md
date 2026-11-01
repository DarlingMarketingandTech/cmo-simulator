# CMO Simulator progress and roadmap

Date: 2026-11-01
Branch: `fix/simulator-roadmap`

This is the working plan for the product. The approved play-flow design is [superpowers/specs/2026-11-01-linear-play-flow-design.md](./superpowers/specs/2026-11-01-linear-play-flow-design.md). The task list that built the first cut is [superpowers/plans/2026-11-01-linear-play-flow.md](./superpowers/plans/2026-11-01-linear-play-flow.md). Formulas stay in [SIMULATION_ENGINE_REFERENCE.md](./SIMULATION_ENGINE_REFERENCE.md).

## Where the work stands

The player path is Home and one play screen.

| Place | Route | What it does |
|---|---|---|
| Home | `/sim` | Resume the run saved on this device, or start a new one. |
| Play | `/sim/play` | Shows the current step. Back, Continue, and Quit. |

Steps, in order: Setup, Strategy, Q1 plan, Q1 review, Q2 plan, Q2 review, Q3 plan, Q3 review, Q4 plan, Q4 review, Final menu.

Back moves one step. Continue on a quarter plan needs at least one tactic inside that quarter's budget. A wildcard, when the quarter shows one, must be answered. The Q2 hire and the Q3 big bet are optional. The review names them only when the player took them.

Quit asks "Leave this step? Your run stays on this device." Cancel stays. Leave returns home and does not delete `cmo-sim-state-v2`. Start new is the action that clears that key.

`/sim/setup`, `/sim/strategy`, `/sim/q1` through `/sim/q4`, `/sim/debrief`, `/sim/campaigns`, `/sim/pipeline`, and `/sim/analytics` open `/sim/play` on the current step. The sidebar on `/sim/play` is hidden. Strategy and Debrief are not sidebar jumps.

On 2026-11-01 the working tree typechecked and Jest reported 18 suites, 54 tests, all passing. Several of the fixes below were still uncommitted at that check. Commit them before opening a pull request, or the PR will miss them.

## What is already in the build

- Ordered step list and Continue gates: `src/lib/playSteps.ts`.
- Quarter review facts: `src/lib/quarterReview.ts`. A different tactic changes the review record.
- Play screen and frame: `src/app/sim/play/page.tsx`, `src/components/simulation/PlayFrame.tsx`.
- Setup and strategy bodies live beside their old routes and render inside the play screen.
- Removing a tactic refunds budget even when the state machine is not inside that quarter. The selected plan reads `context.quarters`, not a separate list. A move that costs more than the reserve is marked over budget.
- Guest play does not post `/api/simulation-events`.
- Request Review and Email Takeaway are gone from the debrief until the new site exists.
- The sidebar waits until the page has mounted before it shows a saved company name or saved KPIs, so the server HTML and the first browser paint match.
- Local scratch stays out of git: `.superpowers/`, typecheck logs, `knip_report.txt`, and `deep-research-report*.md`. See `.gitignore`.

## What not to treat as done

- The overall score for one fixed four-quarter plan now runs from 46 to 67. Profit on that baseline is still negative. Do not collapse the band by editing the snapshot without a deliberate model change.
- New campaign variables are not in the product yet.
- The play frame, Home, the landing page, and the quarter reserve use the achromatic ledger. Tactic rows, the wildcard dialog, and the debrief still use the older chrome.
- `nextjs-portal` is the Next.js dev-tools overlay. It appears only while `npm run dev` is running. It is not a product control.

## Phase A. Finish the playable year

Goal: a new player can finish a year without choosing a destination.

1. Keep Home and `/sim/play` as the only places a run uses.
2. Each step states the choice, what it costs, and what it is expected to move, before Continue.
3. Each quarter review shows the campaign result, the pipeline, and the named effect of the wildcard, hire, or big bet.
4. Refresh and Resume reopen the same step.
5. Prove it with the tests named in the play-flow plan, plus one pass in the browser: setup through a quarter, remove a move and watch the reserve change, Quit, Resume.

Do not add a sidebar, a wizard overlay, or new destinations in this phase.

## Phase B. Make the existing choices matter

Goal: two different plans do not produce the same quarter or the same year.

Use the choices that already exist. Do not invent a new lever in this phase.

| Choice | Where it is decided | Where it must show up |
|---|---|---|
| Scenario, company, budget split | Setup | Starting KPIs and the room the year has to move |
| Audience, positioning, channels | Strategy | Quarter revenue, share, and the review sentence |
| Tactics | Each quarter plan | Spend, reserve, pipeline, and KPI movement |
| Wildcard answer | Q2, Q3, Q4 when one is offered | The "what changed" line and the KPI delta |
| Hire | Q2, optional | The review, only when hired |
| Big bet | Q3, optional | The review, only when placed |

A quarter played twice with a different tactic, wildcard answer, hire, or big bet must not produce the same review. Update `docs/SIMULATION_BASELINE_ENVELOPES.md` and `src/lib/__tests__/simulationBaselineEnvelopes.test.ts` in the same commit as any intentional number change.

## Phase C. Variables, calculations, and the reported results

Goal: the year can finish across a real range, and the quarter report says why.

Do this only after Phase B. A new variable is not a new page.

Edit in this order:

1. `processQuarterAdvance` and `categoryToChannelMap` in `src/lib/simMachine.ts`. Tactic spend becomes channel budgets here.
2. `src/engine/` for adstock, Hill saturation, and synergy.
3. `src/lib/marketConditions.ts` for scenario, industry, and quarter conditions.
4. `calculateEnhancedWildcardImpact` in `src/lib/enhancedWildcards.ts`.
5. `src/lib/talentMarket.ts` for hire and big-bet outcomes.
6. The `results` and `newKpis` objects at the end of `processQuarterAdvance`.
7. `buildSimulationScoreBreakdowns` in `src/lib/simulationIntelligence.ts` for the rubric and overall score.
8. `calculateFinalResults` in `src/lib/simMachine.ts` for the letter grade kept on the machine.
9. `src/lib/simulationReport.ts` and `src/lib/simulationInsights.ts` for the sentences in the quarter review, debrief, and any analytics view.

Then update the engine reference and the baseline snapshot together. Load `.cursor/skills/cmo-simulation-scoring/SKILL.md` before this phase. It is the project's scoring skill.

In-game surfaces that must read those same numbers, not a second formula:

- The quarter plan forecast.
- The quarter review.
- The final menu and debrief.
- Any analytics panel that is later opened from the final menu.

## Phase D. Visual pass

Goal: the simulator looks like a decided product, not an average of generated dashboards.

Do this after the flow and the numbers are stable. Restyling a screen that still teaches the wrong lesson wastes the pass.

Load these before touching layout or type:

- **tasteskill v2**, skill `design-taste-frontend`. Use it for art direction, the no-slop house style, and a look-and-fix loop on real screenshots. The folder on this machine is `C:\Users\hoosi\.claude\skills\design-taste-frontend`. Run its direction, inspect, and screenshot steps from the repo root. Take the idea from the subject: a CMO under a year of budget, board pressure, and diminishing returns. Do not invent a second visual system beside that skill.
- **Superpowers** for the engineering around the visual pass: `verification-before-completion` before calling a screen done, and `systematic-debugging` if a restyle breaks the play step or the budget. Do not restyle by adding ornaments the taste skill's house style forbids.

No skill folder named "impeccable" was found on this machine. Do not invent one. The anti-slop bar is tasteskill's house style: decisions in type, color, and composition, checked in the browser, not a new layer of cards and icons.

Screens to restyle, in this order:

1. `/sim/play` setup and strategy. One decision at a time. The choice and its consequence are the page.
2. The quarter plan. The reserve, the selected moves, and the available moves read as one budget, not three cards.
3. The quarter review. The result, the pipeline, and what changed are the page.
4. Home and the final menu.
5. The landing page.

Leave the Next.js dev-tools portal alone. It is not part of the product UI.

## Done when

- A player can finish a year from Home without a destination menu.
- Removing a move changes the reserve, and another move can spend that money when it fits.
- Two different plans do not share a review.
- The baseline doc and the baseline test describe the same numbers.
- The play screens have been through the tasteskill inspect-and-screenshot loop, and the result is a designed operating screen rather than a generic dashboard.
