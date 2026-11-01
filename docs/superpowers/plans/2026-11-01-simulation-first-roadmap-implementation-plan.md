# Implementation plan - simulation-first roadmap and Supabase decoupling

Date: 2026-11-01  
Input spec: `docs/superpowers/specs/2026-11-01-simulation-first-roadmap-and-supabase-decoupling-design.md`

## Goal

Prioritize simulation quality and update velocity while reducing future migration risk by introducing clean auth/persistence/social boundaries around existing Supabase integrations.

## Non-goals

- No immediate backend migration away from Supabase.
- No new major social mechanics beyond bugfix/support work.
- No state machine rewrite.

## Workstreams

## Workstream A - Stabilize and improve simulation quality

### A1. Baseline current behavior
- Capture current KPI behavior envelopes across scenarios/difficulties using scripted runs.
- Record current debrief recommendation outputs for representative decision paths.
- Define guardrail snapshots for expected ranges (revenue/profit/share/satisfaction/awareness).

Deliverables:
- Baseline artifact in `docs/` with scenario envelopes.
- New/expanded deterministic tests for current expected behavior.

### A2. Improve balancing and explainability
- Tune sensitivity where quarter outcomes are too noisy or too flat.
- Improve recommendation consistency by aligning debrief insights with rubric categories.
- Keep modifications localized to engine/scoring modules, not persistence modules.

Deliverables:
- Updated math/scoring code.
- Test updates demonstrating fewer extreme outliers and stable recommendation quality.

### A3. Regression safety for guest-first journey
- Add tests ensuring guest flow never blocks on auth/storage:
  - setup -> strategy -> q1-q4 -> debrief with no auth session.
- Ensure storage failures remain non-blocking to simulation progression.

Deliverables:
- Journey-focused tests.
- Explicit non-blocking error behavior assertions.

## Workstream B - Introduce platform seams (Supabase decoupling prep)

### B1. Define ports (interfaces)
- Add interface contracts:
  - `SimulationPersistencePort`
  - `SimulationProfilePort`
  - `SimulationSocialPort`
  - `AuthSessionPort`
- Place contracts in a neutral module (for example `src/lib/platform/ports`).

Deliverables:
- Typed interfaces and contract docs in code comments.
- Unit tests for contract-level expectations (success + failure semantics).

### B2. Add Supabase adapters
- Implement adapters that satisfy each port using existing APIs/routes.
- Keep route behavior unchanged; this is a structural extraction.
- Centralize Supabase-specific mapping/error translation in adapters.

Deliverables:
- Adapter modules (for example `src/lib/platform/adapters/supabase/*`).
- Adapter tests for identity checks, unauthorized paths, and mapping.

### B3. Refactor consumers to depend on ports
- Update simulation pages/hooks/services to use ports rather than direct Supabase imports.
- Maintain functional parity with current behavior.
- Remove/limit direct `createClient()` usage outside adapter layer.

Deliverables:
- Consumer refactors with no UX regressions.
- Import boundary checks (lint/script) to prevent new direct coupling.

## Workstream C - Social/auth scope freeze with maintenance

### C1. Freeze feature expansion
- Keep leaderboard/share scope fixed during simulation-first phase.
- Allow only reliability, bugfix, and compliance updates.

### C2. Verify privacy guarantees
- Confirm public scorecard and leaderboard remain alias-only (no PII leakage).
- Add tests/assertions for response shapes where needed.

Deliverables:
- API response shape checks.
- Short privacy checklist in docs.

## Execution sequence

1. A1 baseline + tests  
2. A2 balancing + explainability  
3. A3 guest-first regression safety  
4. B1 ports  
5. B2 adapters  
6. B3 consumer refactor  
7. C2 privacy checks + polish

This sequence ensures product-value work lands before structural migration prep, while still enabling future provider swap with lower risk.

## Validation matrix

- Unit tests:
  - engine math + scoring behavior
  - contract tests for ports
  - adapter translation/auth/error behavior
- Integration tests:
  - guest playthrough end-to-end through debrief
  - authenticated save/resume/profile/share flows
- Build/type checks:
  - `npm run typecheck`
  - `npm test -- --runInBand --watch=false`
  - `npm run build`

## Completion criteria

Phase complete when:
1. Simulation behavior quality metrics are improved and covered by tests.
2. Guest-first flow is robust under auth/storage failure conditions.
3. Direct Supabase coupling is isolated behind ports/adapters for targeted surfaces.
4. Social/public APIs maintain no-PII guarantees.

## Risks and mitigations

- Risk: Refactor churn slows simulation work.  
  Mitigation: finish Workstream A before deep B3 refactors.

- Risk: Hidden direct Supabase usage reappears.  
  Mitigation: add lint/script check for restricted import paths.

- Risk: Behavior drift during extraction.  
  Mitigation: parity tests before/after each adapter rollout.

