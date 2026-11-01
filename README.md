# CMO Simulator

Educational marketing strategy simulation built with **Next.js 15** (App Router) and **TypeScript**. You run a four-quarter year as CMO: allocate budget to tactics, react to wildcard events, optionally place a strategic bet in Q3, and review outcomes against revenue, profit, market share, satisfaction, and brand awareness.

## Overview

The app combines a **game layer** (XState state machine, budgets, scenarios) with a **marketing-mix style engine**: channel spend maps into **adstock** (carryover), **Hill saturation** (diminishing returns), **synergy** across active channels, then a simple traffic → leads → conversions funnel that drives **incremental revenue**. Quarter results merge engine output with tactic expectations and wildcard impacts.

For a **fine-grained formula and variable reference** (maintained alongside the code), see **[docs/SIMULATION_ENGINE_REFERENCE.md](./docs/SIMULATION_ENGINE_REFERENCE.md)**.

## What’s in the product

- **Home** (`/sim`): Resume the run saved on this device, or start a new one.
- **Play** (`/sim/play`): One screen for the year. The saved step decides the content. The actions are Back, Continue, and Quit.
- **Steps:** Setup, Strategy, Q1 plan, Q1 review, Q2 plan, Q2 review, Q3 plan, Q3 review, Q4 plan, Q4 review, then a final menu.
- **Quarter plan:** Tactics. Q2 adds a wildcard and an optional hire. Q3 adds a wildcard and an optional big bet. Q4 adds a wildcard.
- **Quarter review:** Campaign result, pipeline, and what the choices changed.
- **Forecast** (inside the quarter plan): Projects outcomes using the same `processQuarterAdvance` path as live play.
- **Debrief:** End-of-run summary and PDF. Request Review and Email Takeaway are removed until the new site exists.
- **Persistence:** The run stays in `cmo-sim-state-v2` on this device. Signed-in users can also save through Supabase. Guest play does not post `/api/simulation-events`.

Old addresses `/sim/setup`, `/sim/strategy`, `/sim/q1`–`q4`, `/sim/debrief`, `/sim/campaigns`, `/sim/pipeline`, and `/sim/analytics` open `/sim/play` on the current step. They are not a second way to jump the year.

Some narrative in **[docs/design/SIMULATION_DESIGN_SPEC.md](./docs/design/SIMULATION_DESIGN_SPEC.md)** describes stretch goals (e.g. full crisis engine, tech tree, synthetic personas). Treat that doc as **design intent**; behavior is defined by the implementation and **SIMULATION_ENGINE_REFERENCE.md**.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js **15.5** (App Router) |
| UI | React **19**, Tailwind **4**, shadcn/Radix primitives |
| Simulation | **XState** (`simMachine.ts`), **Zustand** (demo store / engine playground) |
| Engine | `src/engine/` — adstock, Hill transform, synergy (`synergy`, `saturation`, `adstock`) |
| Auth & DB | **Supabase** (Auth, Postgres, RLS) |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Deploy | Vercel-friendly; optional **Cloudflare** via OpenNext (`build:cloudflare`) |

## Getting started

### Prerequisites

- **Node.js 20+** recommended (works with modern Next.js 15 toolchains)
- **npm**
- A **Supabase** project if you use auth and saved runs

### 1. Install

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the repo root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database

Apply SQL in **`supabase/migrations/`** in order on your Supabase project (SQL Editor or CLI). This repo uses **`cmo_simulation_runs`**, save RPCs, and optional intelligence tables—see the migration filenames starting with dates.

**Legacy / optional:** Root-level **`supabase-schema-enhanced.sql`** and **`setup-database.md`** describe an older expanded schema (profiles, leaderboard views, etc.). The live app’s profile API expects **`user_profiles`**; align your database with the migrations and APIs you actually use.

Verify saved-run plumbing when wired:

```bash
npm run verify:db
```

### 4. Development server

```bash
npm run dev
```

Opens **http://localhost:3002** (see `package.json` scripts).

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server with Turbopack on port 3002 |
| `npm run build` | Production build |
| `npm run start` | Start production server on 3002 |
| `npm run lint` | ESLint |
| `npm run test` | Jest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:cloudflare` | OpenNext build + Cloudflare output fix |
| `npm run verify:db` | Check simulation DB helpers |

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Root entry
│   ├── landing/                 # Marketing landing
│   ├── auth/                    # sign-in (includes signup mode), callback, update-password
│   ├── sim/
│   │   ├── page.tsx             # Home: Resume or Start new
│   │   ├── play/                # The only play screen
│   │   ├── setup/ strategy/ q1/ … q4/ debrief/ campaigns/ pipeline/ analytics/
│   │   │                        # Legacy addresses; they redirect to /sim/play
│   │   └── layout.tsx           # Sim shell. Hidden on /sim/play.
│   ├── api/
│   │   ├── simulations/         # Save, load, list runs
│   │   ├── profile/             # user_profiles
│   │   ├── auth/
│   │   └── ...
│   └── engine-demo/             # Direct engine / store playground
├── components/
│   ├── simulation/              # Quarter UI, debrief PDF, modals, KPI surfaces
│   └── ui/                      # Shared primitives
├── engine/                      # Adstock, saturation, synergy, tick
├── lib/
│   ├── playSteps.ts             # Ordered play steps, Back, Continue gates
│   ├── quarterReview.ts         # Review facts for the quarter just played
│   ├── simMachine.ts            # XState machine & processQuarterAdvance
│   ├── marketConditions.ts      # Quarter market inputs
│   ├── simulationForecast.ts    # Forecast & scenarios
│   ├── simulationPersistence.ts # Save payload shapes
│   ├── enhancedWildcards.ts     # Wildcard content
│   ├── talentMarket.ts        # Big bets & talent
│   ├── store.ts                 # Zustand demo store
│   └── supabase/                # Clients & middleware helpers
├── middleware.ts                # Next middleware (e.g. Supabase session refresh)
└── types/                       # Shared TS types
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/PROGRESS_AND_ROADMAP.md](./docs/PROGRESS_AND_ROADMAP.md) | What is done, what to build next, where scoring changes go, and the UI polish pass |
| [docs/superpowers/specs/2026-11-01-linear-play-flow-design.md](./docs/superpowers/specs/2026-11-01-linear-play-flow-design.md) | Approved play-flow design |
| [docs/superpowers/plans/2026-11-01-linear-play-flow.md](./docs/superpowers/plans/2026-11-01-linear-play-flow.md) | Implementation plan for that flow |
| [docs/SIMULATION_ENGINE_REFERENCE.md](./docs/SIMULATION_ENGINE_REFERENCE.md) | Formulas, variables, and code paths for the simulation |
| [docs/SIMULATION_FLOW_AND_PEDAGOGY.md](./docs/SIMULATION_FLOW_AND_PEDAGOGY.md) | Teaching intent by stage. Route table is the machine map under the new play screen. |
| [QUICKSTART.md](./QUICKSTART.md) | Step-by-step local setup (verify paths against this README) |
| [setup-database.md](./setup-database.md) | Legacy enhanced schema notes |
| [docs/design/SIMULATION_DESIGN_SPEC.md](./docs/design/SIMULATION_DESIGN_SPEC.md) | Older product vision. Stretch goals, not current behavior. |

## Deployment

### Vercel

1. Connect the Git repo and set **environment variables** (`NEXT_PUBLIC_SUPABASE_*`).
2. Build command: `npm run build` (default).

### Cloudflare Pages (OpenNext)

Use **`npm run build:cloudflare`** (see `package.json`) and the OpenNext + **`nodejs_compat`** compatibility flag workflow described for Cloudflare; output is under **`.open-next`**.

Community reference: [OpenNext Cloudflare](https://opennext.js.org/cloudflare/get-started).

## Roadmap

The build order is in [docs/PROGRESS_AND_ROADMAP.md](./docs/PROGRESS_AND_ROADMAP.md):

1. Finish and ship the linear play flow.
2. Make each existing choice change the quarter review and the final result.
3. Then add variables and widen the score range.
4. Then restyle the screens so the product does not look like a generic generated UI.

Do not start the visual pass by adding more cards, gradients, or icon rows. Use the tasteskill in `design-taste-frontend` for that pass.

## Contributing

Issues and PRs are welcome. Keep simulation math changes documented in **SIMULATION_ENGINE_REFERENCE.md**.

## License

MIT
