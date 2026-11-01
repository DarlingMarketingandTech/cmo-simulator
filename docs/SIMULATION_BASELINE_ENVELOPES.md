# Simulation baseline envelopes (A1)

Date captured: 2026-11-01  
Source test: `src/lib/__tests__/simulationBaselineEnvelopes.test.ts`

This baseline locks deterministic outcomes for a representative four-quarter tactic plan across all scenario and difficulty combinations. It is the regression anchor for Workstream A tuning work.

## Baseline run protocol

- Scenario grid: `turnaround`, `hyper-growth`, `challenger`
- Difficulty grid: `beginner`, `intermediate`, `advanced`
- Quarter plan:
  - Q1: `digital-1`, `content-1`, `partnerships-1`
  - Q2: `digital-2`, `events-1`, `content-2`
  - Q3: `digital-5`, `partnerships-2`, `events-3`
  - Q4: `traditional-1`, `content-4`, `partnerships-3`
- No wildcard events injected.
- Strategy spine fixed for consistency:
  - target audience: `Growth-minded operations leaders`
  - positioning: `Reliable growth with measurable ROI`
  - primary channels: `digital`, `content`, `events`

## Snapshot envelope by scenario and difficulty

| Scenario | Difficulty | Revenue | Profit | Market share | Satisfaction | Awareness | Overall score | Growth | Efficiency | Coherence | Resilience | Finish |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| turnaround | beginner | 5,047,193 | -1,077,807 | 52.490 | 59.663 | 100.0 | 65 | 70 | 39 | 85 | 41 | 94 |
| turnaround | intermediate | 5,042,729 | -1,082,271 | 52.490 | 59.663 | 100.0 | 65 | 70 | 39 | 85 | 41 | 94 |
| turnaround | advanced | 5,037,800 | -1,087,200 | 52.490 | 59.663 | 100.0 | 65 | 70 | 39 | 85 | 41 | 94 |
| hyper-growth | beginner | 1,848,969 | -476,031 | 47.124 | 96.200 | 88.030 | 67 | 82 | 39 | 85 | 39 | 90 |
| hyper-growth | intermediate | 1,772,969 | -552,031 | 47.124 | 96.200 | 88.030 | 67 | 81 | 39 | 85 | 40 | 90 |
| hyper-growth | advanced | 1,692,100 | -632,900 | 47.124 | 96.200 | 88.030 | 67 | 80 | 39 | 85 | 40 | 92 |
| challenger | beginner | 509,020 | -865,980 | 46.728 | 100.0 | 86.981 | 66 | 77 | 39 | 85 | 40 | 86 |
| challenger | intermediate | 483,820 | -891,180 | 46.728 | 100.0 | 86.981 | 66 | 77 | 39 | 85 | 40 | 85 |
| challenger | advanced | 455,260 | -919,740 | 46.728 | 100.0 | 86.981 | 65 | 76 | 39 | 85 | 40 | 83 |

## Guardrails in this phase

1. Deterministic output stability: snapshot in `simulationBaselineEnvelopes.test.ts` must only change with intentional model updates.
2. Difficulty progression must continue to reduce top-line revenue and profit for the same scenario/plan as difficulty increases.
3. Any deliberate scoring model changes in A2 must update both:
   - this document, and
   - the inline snapshot baseline in tests.

## Noted baseline issues to continue addressing in A2

- Market share and awareness still converge into relatively tight bands across scenarios (limited differentiation for strategy quality).
- Satisfaction still clips to `100` in challenger runs under this tactic plan.
- Overall score spread is improved but still narrow (`65–67`) relative to large P&L deltas.
