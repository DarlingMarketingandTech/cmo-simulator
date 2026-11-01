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
| turnaround | beginner | 5,058,430 | -1,066,570 | 52.490 | 59.663 | 100.0 | 47 | 28 | 46 | 85 | 41 | 94 |
| turnaround | intermediate | 5,043,729 | -1,081,271 | 52.490 | 59.663 | 100.0 | 47 | 27 | 46 | 85 | 41 | 94 |
| turnaround | advanced | 5,029,968 | -1,095,032 | 52.490 | 59.663 | 100.0 | 46 | 26 | 46 | 85 | 41 | 94 |
| hyper-growth | beginner | 2,003,463 | -321,538 | 47.124 | 96.200 | 88.030 | 67 | 74 | 53 | 85 | 36 | 85 |
| hyper-growth | intermediate | 1,787,931 | -537,069 | 47.124 | 96.200 | 88.030 | 61 | 61 | 49 | 85 | 39 | 85 |
| hyper-growth | advanced | 1,589,500 | -735,500 | 47.124 | 96.200 | 88.030 | 55 | 49 | 46 | 85 | 40 | 86 |
| challenger | beginner | 573,400 | -801,600 | 46.728 | 100.0 | 86.981 | 53 | 45 | 46 | 85 | 40 | 81 |
| challenger | intermediate | 490,900 | -884,100 | 46.728 | 100.0 | 86.981 | 51 | 40 | 46 | 85 | 40 | 80 |
| challenger | advanced | 414,040 | -960,960 | 46.728 | 100.0 | 86.981 | 49 | 36 | 46 | 85 | 40 | 79 |

## Guardrails in this phase

1. Deterministic output stability: snapshot in `simulationBaselineEnvelopes.test.ts` must only change with intentional model updates.
2. Difficulty progression must continue to reduce top-line revenue and profit for the same scenario/plan as difficulty increases.
3. Any deliberate scoring model changes in A2 must update both:
   - this document, and
   - the inline snapshot baseline in tests.

## Noted baseline issues to continue addressing in A2

- Market share and awareness still converge into relatively tight bands across scenarios (limited differentiation for strategy quality).
- Satisfaction still clips to `100` in challenger runs under this tactic plan.
- Overall score for this fixed plan now runs from 46 to 67. Growth quality scores the revenue the four quarters added, so a large opening revenue with little new revenue scores below a smaller company that added more. Profit on this plan is still negative.
