# CMO Simulator

Read [docs/PROGRESS_AND_ROADMAP.md](docs/PROGRESS_AND_ROADMAP.md) before changing the play path, the math, or the visual design.

## Play path

Home is `/sim`. The run is `/sim/play`. Steps are owned by `src/lib/playSteps.ts`. Back moves one step. Quit keeps `cmo-sim-state-v2` and returns home. Start new clears that key.

Do not add sidebar destinations for quarters, campaigns, pipeline, or analytics. Old routes redirect to `/sim/play`.

## Scoring

Load the installed skill `cmo-simulation-scoring` at `C:\Users\hoosi\.agents\skills\cmo-simulation-scoring\SKILL.md` before changing tactics, wildcards, hires, big bets, KPIs, or scores. The repo copy at `.cursor/skills/cmo-simulation-scoring/SKILL.md` only points there.

Change a number in this order: `processQuarterAdvance` in `src/lib/simMachine.ts`, then `src/engine/` or the wildcard and talent modules, then `buildSimulationScoreBreakdowns` in `src/lib/simulationIntelligence.ts`, then the review copy. Update [docs/SIMULATION_ENGINE_REFERENCE.md](docs/SIMULATION_ENGINE_REFERENCE.md) and the baseline snapshot in the same change.

The fixed-plan overall score spans 46–67. Do not collapse that band without a new baseline snapshot.

## Visual work

For a restyle, load the tasteskill `design-taste-frontend` and follow [docs/PROGRESS_AND_ROADMAP.md](docs/PROGRESS_AND_ROADMAP.md) Phase D. Do not polish by adding cards, gradients, or icon rows.

## Checks

- `npx tsc --noEmit`
- `npx jest --watch=false --runInBand`

Do not commit `.env.local`, `.superpowers/`, or the local typecheck and knip reports. They are gitignored.
