# Simulation-first roadmap and Supabase decoupling design

Date: 2026-11-01  
Status: Draft for review  
Author: Copilot

## 1) Context and decision to make

You asked whether we should move away from Supabase, and whether we should pause leaderboard/sign-in pressure until core simulation improvements are complete.

Current repo state:
- Core simulation math and game loop are already mostly storage-agnostic (`src/lib/simMachine.ts`, `src/engine/*`).
- Supabase currently powers auth, saved runs, profile memory, simulation events, and newly-added public scorecard/leaderboard surfaces (`src/app/api/simulations/*`, `src/app/api/profile`, `src/app/api/leaderboard`, `src/app/api/scorecards/[slug]`).
- Guest-first play now exists, so account is no longer required to start a run.

## 2) Assumptions (autonomous, pending your confirmation)

Because you were unavailable for follow-up questions, this spec assumes:
1. Product priority is **simulation quality and teaching value first**.
2. We should **avoid platform migration risk right now** unless it directly improves simulation iteration speed.
3. Public leaderboard/share can stay shipped but should not drive near-term roadmap effort until simulation updates are stable.

## 3) Approaches considered

## Approach A (recommended): Simulation-first, Supabase-temporary, add seams now

Keep Supabase in place for now, but create clean interfaces around persistence/auth so migration later is low-risk. Spend near-term effort on simulation and gameplay improvements.

Pros:
- Fastest path to product-quality gains.
- Minimal disruption to existing auth/save/share flows.
- Builds migration-ready boundaries without a full rewrite.

Cons:
- Supabase dependency remains in production during this phase.
- Two-stage work (seams now, migration later) instead of one big migration.

## Approach B: Migrate away from Supabase now, then improve simulation

Replace auth + persistence platform first (for example with custom Postgres/Auth stack), then resume simulation upgrades.

Pros:
- Eliminates platform concern immediately.
- Avoids temporary adapter layer.

Cons:
- Highest delivery risk and delay.
- Pulls focus away from simulation correctness/pedagogy.
- Greater chance of regressions in save/share/account flows.

## Approach C: Hybrid phased migration in parallel with simulation updates

Run migration and simulation improvements simultaneously with separate tracks.

Pros:
- Parallelizes concerns.
- Reduces total calendar time if resourcing is strong.

Cons:
- Highest coordination overhead.
- Harder QA matrix and slower feedback loops.
- Increases scope creep risk.

## Recommendation

Use **Approach A** now. It best matches your stated concern: fix simulation quality first while keeping migration optional and safer later.

## 4) Proposed design (Approach A)

### 4.1 Architecture boundaries

Introduce explicit service boundaries without changing gameplay behavior:

- `SimulationCore` (existing, mostly in place): engine math, quarter transitions, scoring logic, forecasting.
- `SimulationPersistencePort` (new interface): save run, load runs, load latest run, delete run.
- `SimulationProfilePort` (new interface): read/write profile memory.
- `SimulationSocialPort` (new interface): publish/unpublish scorecard, read leaderboard, read public scorecard.
- `AuthSessionPort` (new interface): current session, sign-in state checks.

Initial adapters:
- `SupabasePersistenceAdapter`
- `SupabaseProfileAdapter`
- `SupabaseSocialAdapter`
- `SupabaseAuthAdapter`

These adapters wrap existing API route logic first. No immediate backend change required.

### 4.2 Data flow

1. UI pages call feature-level hooks/services, not Supabase directly.
2. Feature services depend on ports, not concrete Supabase clients.
3. API routes keep current behavior but become implementation detail behind adapters.
4. Simulation calculations never import storage/auth modules.

This makes future backend migration a provider swap instead of a broad UI/gameplay rewrite.

### 4.3 Error handling strategy

- Keep guest play resilient: storage failures must not block quarter progression/debrief rendering.
- Distinguish error classes:
  - `NonBlockingPersistenceError` (save/profile/social failures; user informed, play continues)
  - `BlockingAuthError` (only for actions that explicitly require account, such as publish/share toggle)
  - `PlatformUnavailableError` (adapter-level outage)
- Use consistent user-safe messages and existing request-id logging patterns.

### 4.4 Testing strategy

Add tests in this order:
1. **Core simulation tests** (math/logic/regression): expand existing engine and forecast coverage.
2. **Contract tests for ports**: each port method has expected inputs/outputs and failure semantics.
3. **Adapter tests**: Supabase adapters honor contracts and map errors correctly.
4. **Critical journey tests**:
   - guest start -> strategy -> quarters -> debrief (no auth required)
   - authenticated save/resume still works
   - social publish path does not leak PII and can be disabled

## 5) Priority roadmap (what to do before new social/auth expansion)

Phase 1 (now): Simulation quality and balancing
- KPI sensitivity tuning and edge-case balancing.
- Quarter-to-quarter decision explainability improvements.
- Debrief recommendation precision and consistency checks.

Phase 2: Interface extraction (migration prep)
- Introduce ports/adapters with no behavior change.
- Move direct Supabase dependencies behind adapter modules.
- Keep current APIs operational.

Phase 3: Optional migration decision gate
- Re-evaluate whether Supabase is still a blocker after simulation improvements.
- If yes, swap adapters to new provider incrementally.

## 6) Scope guardrails (YAGNI)

Not in this spec:
- Full backend migration now.
- New major social mechanics beyond what already shipped.
- Rewriting simulation state machine architecture.

## 7) Success criteria

This strategy is successful if:
1. Simulation update velocity increases (faster iteration, fewer regressions).
2. Guest-first journey remains stable regardless of backend hiccups.
3. Supabase can be replaced later by changing adapters/ports rather than rewriting gameplay and UI flows.

## 8) Risks and mitigations

- Risk: Port layer adds complexity without immediate user value.  
  Mitigation: keep interfaces minimal and aligned to existing API shapes.

- Risk: Social features distract from core simulation roadmap.  
  Mitigation: freeze social scope except bugfixes until Phase 1 goals pass.

- Risk: Hidden coupling remains in pages/hooks.  
  Mitigation: add dependency-lint checks and code ownership notes for adapter boundaries.

## 9) Open decisions for review

1. Confirm Phase 1 objective metrics (for example: balancing thresholds or debrief quality KPIs).
2. Confirm whether current social features should remain visible or be soft-deemphasized in nav during Phase 1.
3. Confirm target window for migration re-evaluation checkpoint.

