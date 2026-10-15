# CMO Simulator vs. The CMO Game (REA Deep Dive)

Date: 2026-10-15

## Scope and method

This comparison used **REA browser/runtime evidence** on both products, plus source-level analysis of your repository:

- REA capture of `https://cmogame.com/` (baseline + interactive flows)
- REA capture of local app at `http://localhost:3002/` (baseline + interactive flows)
- REA export + static JS analysis of The CMO Game scripts (`game.js` and third-party runtime libs)
- Source review of this repo’s simulation engine, state machine, and UX flow

Primary REA evidence IDs:

- CMO Game baseline capture: `ev_5b45990a44a900ca975c627262cb7aeb3490b12bee7cd8421dac238ed0c9aaa6`
- Your app baseline capture: `ev_882dee753a9a19550256de67d091f85dd0e446f4771e04ef351fd9810a28f5f3`
- CMO Game interactive capture: `ev_45b9ca7a9118d16c4514f6cba673813580a806d6aca8b7e27c4e7e506c2fef6f`
- Your app interactive capture: `ev_03165630026f38b06bbdf1b7615f21145ff1a577f280acda6bbb527ebe346b19`
- CMO Game script export (full): `ev_9f57bdcd22467e00d7116178d95046538e3d40e0e19add952a48266fa611df5b`
- CMO Game JS application summary view: `ev_1b85d3d83af7a6b678f679e0873762fa5ed0b4f71a521ee647bbcbf9b558b05c`

---

## Similarities

1. **Core fantasy is the same**  
   Both products are CMO decision simulations centered on budget allocation, branding outcomes, and executive pressure.

2. **Branching decision systems**  
   Both include stochastic/branching pressure events with tradeoffs in business metrics (revenue/brand/executive confidence).

3. **Multi-period progression loop**  
   The CMO Game runs monthly through a one-year arc; your app runs quarter-by-quarter through a year. Both model cumulative consequences and end-state evaluation.

4. **Result/debrief surface**  
   Both provide an end-of-run outcome narrative/snapshot and replay orientation.

---

## Biggest differences

## 1) Simulation philosophy: narrative simulator vs. systems simulator

- **The CMO Game** is heavily narrative and roleplay-first (large event story bank, satirical outcomes, “marketing lesson” copy embedded in choices).
- **Your app** is systems/analytics-first (adstock, saturation, synergy, runtime tuning, deterministic engine pass with explicit KPI mapping).

**Evidence:** The CMO Game `game.js` defines large conflict trees and narrative outcomes, while your app routes strategy through `processQuarterAdvance` + `runSimulationTick`.

---

## 2) Career ladder and title progression

- The CMO Game has explicit rank progression from **Director → CMO** with quarter checkpoints and promotion gating.
- Your app has grading/debrief outcomes but lacks a persistent **career-title progression loop** as the primary engagement mechanic.

**Evidence:** `RANKS` and `checkPromotion(quarter)` logic in The CMO Game.

---

## 3) Team-ops layer

- The CMO Game includes explicit staffing choices (in-house/agency/skip per role), monthly team costs, and penalties for team cuts / no-team operation.
- Your app has talent and big-bet mechanics, but the recurring **org design + payroll strategy layer** is less central.

**Evidence:** `ROLES`, `calcTeamCost`, `midYearReview` logic in The CMO Game.

---

## 4) Low-friction onboarding and session start

- The CMO Game starts immediately from title flow with name entry and local save.
- Your app’s interactive capture showed start-flow redirection to **auth sign-in** before sim setup, which adds first-session friction.

**Evidence:** REA interactive flow:
- CMO Game click stayed in immediate game shell (`https://cmogame.com/`)
- Your app click moved to `/auth/sign-in?next=%2Fsim%2Fsetup`

---

## 5) Social loops and replay hooks

- The CMO Game has integrated **Hall of Fame/leaderboard**, copy-score, and screenshot export loops.
- Your app has save/debrief/PDF and run history, but not the same in-product social competition loop.

**Evidence:** `loadLeaderboard`, `submitToLeaderboard`, `copyShare`, `downloadScreenshot` in The CMO Game.

---

## 6) Tone and emotional cadence

- The CMO Game uses sharp, irreverent copy and frequent emotional beats (humor, shame, celebration, political tension) to maintain engagement.
- Your app is more executive/professional and educational, with less “story shock” per decision beat.

---

## Where your app is currently falling short (relative to The CMO Game)

1. **First-session activation friction is too high**  
   Requiring sign-in before setup lowers immediate “try now” conversion.

2. **Narrative density per decision is lower**  
   You have robust mechanics, but fewer memorable event arcs and fewer emotionally sticky consequence narratives.

3. **Career meta-loop is weaker**  
   Debrief grades exist, but there is no dominant role-progression/status loop equivalent to Director→CMO.

4. **Social proof + virality mechanisms are weaker**  
   No direct global leaderboard / score brag loop in the same way.

5. **Replay scaffolding could be more explicit**  
   You support reruns and saved simulations, but “what to try next run” can be more gamified and scenario-driven.

---

## What your app does better than The CMO Game

1. **Model rigor and explainability**  
   Adstock + Hill saturation + synergy + runtime metrics is a stronger quantitative backbone.

2. **Enterprise-grade debriefing**  
   PDF/report workflow and simulation persistence are more professional and useful for actual strategy workshops.

3. **Architecture maturity**  
   App/router/state/data boundaries are significantly more scalable for product evolution.

---

## High-impact ideas to incorporate

## A) Add a lightweight career ladder mode (highest ROI)

Introduce persistent role levels and promotion checkpoints over sequential runs:

- Titles: Associate Director → Director → Sr. Director → VP → EVP → CMO
- Promotion conditions combine:
  - KPI thresholds
  - volatility/risk discipline
  - budget efficiency (ROI)
  - crisis handling quality

This gives the app a long-term progression reason to replay without abandoning your math-first model.

---

## B) Add a “narrative consequence pack” around existing wildcard engine

Keep your current math engine, but expand narrative wrappers:

- richer executive dialog variants (CEO/CFO/Board)
- explicit “marketing lesson” post-mortems for each major choice
- occasional high-variance lucky-break branches with bounded effect

This improves emotional engagement without rewriting simulation internals.

---

## C) Add social replay hooks

- optional public scorecard share URL
- image snapshot export of final board packet
- leaderboard by scenario/difficulty (opt-in alias, no PII)

This creates organic retention and growth loops.

---

## D) Remove auth wall for first playthrough

Adopt guest-first mode:

- instant play (no account required)
- save/export/compare unlock prompts at meaningful moments
- soft conversion to account after the first debrief

This should improve top-of-funnel engagement immediately.

---

## E) Add structured “next-run challenge” suggestions

From the debrief, auto-generate challenge cards:

- “Recover from Q2 crisis with <X> constraints”
- “Hit grade A with 20% less budget”
- “Improve brand equity while maintaining revenue floor”

This bridges your excellent analytics to game-like replay motivation.

---

## F) Add a team operating model layer (optional advanced mode)

Use your existing talent/tuning architecture to add team composition decisions:

- in-house vs agency by discipline
- cost + execution quality modifiers
- disruption penalties when cutting capabilities mid-year

This mirrors one of The CMO Game’s strongest engagement drivers while remaining compatible with your engine.

---

## Recommended implementation order

1. **Guest-first start flow** (fastest impact)  
2. **Career ladder progression system**  
3. **Narrative consequence expansions for wildcards/debrief**  
4. **Shareable scorecard + leaderboard**  
5. **Team operating model advanced mode**

---

## Bottom line

Your app is stronger on simulation credibility and executive-grade reporting.  
The CMO Game is stronger on emotional cadence, replay compulsion, and social/game loops.

The best path is **not** to copy their lightweight math — it is to keep your rigorous engine and layer in:

- faster activation,
- richer narrative consequences,
- role progression,
- and shareable/social replay mechanics.

That combination would likely outperform both products for serious users and broad engagement.
