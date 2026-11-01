# Simulation runtime — authoritative paths

This note maps **where truth lives** for the playable simulation. Product copy and design specs are intentionally secondary to these runtime modules.

## Game loop and engine

| Concern | Authoritative source |
|--------|----------------------|
| Phase machine (idle → strategy → Q1–Q4 → debrief), quarter advancement, `processQuarterAdvance`, merging tactics → engine tick | `src/lib/simMachine.ts` |
| Routing from machine phase → URL | `src/lib/simulationRouting.ts` (`resolveSimulationPath`) |
| Adstock, saturation, synergy, tick math | `src/engine/` (see `docs/SIMULATION_ENGINE_REFERENCE.md`) |
| Quarter market inputs | `src/lib/marketConditions.ts` |
| Playable scenarios (IDs, KPIs, mandates) | `src/lib/config/simulationScenarios.ts` (`SIMULATION_SCENARIOS`) |
| Tactic & wildcard catalog + quarter tactic rosters | `src/lib/config/tacticCatalog.ts` (via `src/lib/tactics.ts` helpers) |
| Strategy-session presets (channels, audiences, positioning) | `src/lib/config/strategySessionOptions.ts` |
| Profile difficulty preference ↔ engine difficulty bridge | `src/lib/config/simulationDifficultyModes.ts` |

## Client shell

| Concern | Authoritative source |
|--------|----------------------|
| XState provider, **local** persistence (`localStorage` key `cmo-sim-state-v2`), hydrate-on-mount | `src/components/simulation/SimulationProvider.tsx` |
| Optional auth session for `/sim/*` (guest-first playthrough; account actions unlock on demand) | `src/app/sim/layout.tsx`, `src/app/sim/debrief/page.tsx` |
| Phase-aligned autosave triggers from quarter pages | respective `src/app/sim/q*/page.tsx`, `setup/page.tsx`, header `SaveSyncStatus` |

## Types and scoring contracts

| Concern | Authoritative source |
|--------|----------------------|
| Shared KPI snapshots and grade unions (machine vs teaching/persistence) | `src/lib/simulationContracts.ts` |
| **Teaching / persistence** score + grade (PDF, Supabase payload, intelligence breakdowns) | `src/lib/simulationInsights.ts` |
| Machine-only debrief rollup (`finalResults` when entering XState `debrief`) | `src/lib/simMachine.ts` (`calculateFinalResults`) |

## Server persistence

| Concern | Authoritative source |
|--------|----------------------|
| Payload shape for rows + RPC | `src/lib/simulationPersistence.ts` (`PersistedRunPayload`, `toPersistedRunPayload`) |
| POST handler, identity checks, RPC call | `src/app/api/simulations/save/route.ts` |
| Browser retry + sync UI events | `src/lib/saveSimulationSnapshot.ts`, `src/lib/saveSimulationSync.ts` |
| Public scorecard publish/unpublish + leaderboard feed | `src/app/api/simulations/share/route.ts`, `src/app/api/leaderboard/route.ts`, `src/app/api/scorecards/[slug]/route.ts` |

When documentation disagrees with these files, **trust the code paths above** and update the docs.
