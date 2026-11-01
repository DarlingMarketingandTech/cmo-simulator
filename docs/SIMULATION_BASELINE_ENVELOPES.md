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
| turnaround | beginner | 5,047,193 | -1,077,807 | 67.486 | 79.8 | 100.0 | 59 | 74 | 0 | 85 | 41 | 99 |
| turnaround | intermediate | 5,042,729 | -1,082,271 | 67.486 | 79.8 | 100.0 | 59 | 74 | 0 | 85 | 41 | 99 |
| turnaround | advanced | 5,037,800 | -1,087,200 | 67.486 | 79.8 | 100.0 | 59 | 74 | 0 | 85 | 41 | 99 |
| hyper-growth | beginner | 1,848,969 | -476,031 | 58.174 | 100.0 | 100.0 | 60 | 82 | 0 | 85 | 39 | 90 |
| hyper-growth | intermediate | 1,772,969 | -552,031 | 58.174 | 100.0 | 100.0 | 60 | 81 | 0 | 85 | 40 | 90 |
| hyper-growth | advanced | 1,692,100 | -632,900 | 58.174 | 100.0 | 100.0 | 60 | 80 | 0 | 85 | 40 | 92 |
| challenger | beginner | 509,020 | -865,980 | 57.458 | 100.0 | 100.0 | 58 | 76 | 0 | 85 | 40 | 86 |
| challenger | intermediate | 483,820 | -891,180 | 57.458 | 100.0 | 100.0 | 58 | 76 | 0 | 85 | 40 | 85 |
| challenger | advanced | 455,260 | -919,740 | 57.458 | 100.0 | 100.0 | 57 | 76 | 0 | 85 | 40 | 83 |

## Guardrails in this phase

1. Deterministic output stability: snapshot in `simulationBaselineEnvelopes.test.ts` must only change with intentional model updates.
2. Difficulty progression must continue to reduce top-line revenue and profit for the same scenario/plan as difficulty increases.
3. Any deliberate scoring model changes in A2 must update both:
   - this document, and
   - the inline snapshot baseline in tests.

## Noted baseline issues to address in A2

- Efficiency ring is `0` across all nine runs (indicates poor calibration of efficiency normalization).
- Market share / awareness / satisfaction are clipping near upper bounds too quickly for this plan (reduced discriminatory power).
- Overall score spread is narrow (`57–60`) despite large scenario and P&L differences.
