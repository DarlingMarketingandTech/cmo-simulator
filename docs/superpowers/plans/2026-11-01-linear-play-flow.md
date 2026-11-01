# Linear Play Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sidebar jumping with one `/sim/play` path: Setup through a final menu, Back one step, and Quit that keeps the run on this device.

**Architecture:** A pure step module owns order, Back, Continue, and Quit. `/sim/play` renders the current step inside a frame with those three actions. Existing setup, strategy, and quarter components stay the choice UI. Quarter math stays in `processQuarterAdvance`. Score math stays in `buildSimulationScoreBreakdowns`. Legacy `/sim/q1`–`/sim/q4`, campaigns, pipeline, and analytics routes redirect to `/sim/play`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, XState via the existing `SimulationProvider`, Jest.

## Global Constraints

- Play lives at `/sim/play`. Home for a run is `/sim`.
- Steps, in order: Setup, Strategy, Q1 plan, Q1 review, Q2 plan, Q2 review, Q3 plan, Q3 review, Q4 plan, Q4 review, Final menu.
- Back opens the previous step only.
- Continue requires at least one tactic inside the quarter budget. A presented wildcard must be answered. Q2 hire and Q3 big bet are optional.
- When a hire or big bet is taken, the following review includes it. When it is skipped, the review does not invent one.
- A different tactic, wildcard answer, hire, or big bet must change the following review.
- Quit asks for a confirm. Cancel stays. Confirm returns to `/sim` and leaves `cmo-sim-state-v2` in place.
- Refresh and Resume reopen the saved step.
- Old `/sim/q3`, `/sim/campaigns`, `/sim/pipeline`, and `/sim/analytics` addresses open `/sim/play` on the current step.
- Do not add campaign variables. Do not widen the 65–67 overall-score band. Do not replace Supabase. Do not add a sidebar during the run.
- Guest play does not call `POST /api/simulation-events`.

---

### Task 1: Step order

**Files:**
- Create: `src/lib/playSteps.ts`
- Test: `src/lib/__tests__/playSteps.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export type PlayStepId =
  | "setup"
  | "strategy"
  | "q1-plan"
  | "q1-review"
  | "q2-plan"
  | "q2-review"
  | "q3-plan"
  | "q3-review"
  | "q4-plan"
  | "q4-review"
  | "final-menu";

export const PLAY_STEPS: readonly PlayStepId[];
export function nextPlayStep(step: PlayStepId): PlayStepId | null;
export function previousPlayStep(step: PlayStepId): PlayStepId | null;
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/playSteps.test.ts`:

```ts
import { nextPlayStep, PLAY_STEPS, previousPlayStep } from "../playSteps";

describe("play step order", () => {
  test("lists the eleven approved steps in order", () => {
    expect(PLAY_STEPS).toEqual([
      "setup",
      "strategy",
      "q1-plan",
      "q1-review",
      "q2-plan",
      "q2-review",
      "q3-plan",
      "q3-review",
      "q4-plan",
      "q4-review",
      "final-menu",
    ]);
  });

  test("moves forward one step and stops after the final menu", () => {
    expect(nextPlayStep("q1-plan")).toBe("q1-review");
    expect(nextPlayStep("final-menu")).toBeNull();
  });

  test("moves back one step and stops before setup", () => {
    expect(previousPlayStep("q2-review")).toBe("q2-plan");
    expect(previousPlayStep("q2-plan")).toBe("q1-review");
    expect(previousPlayStep("setup")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: FAIL because `../playSteps` does not exist.

- [ ] **Step 3: Implement the step list**

Create `src/lib/playSteps.ts`:

```ts
export type PlayStepId =
  | "setup"
  | "strategy"
  | "q1-plan"
  | "q1-review"
  | "q2-plan"
  | "q2-review"
  | "q3-plan"
  | "q3-review"
  | "q4-plan"
  | "q4-review"
  | "final-menu";

export const PLAY_STEPS = [
  "setup",
  "strategy",
  "q1-plan",
  "q1-review",
  "q2-plan",
  "q2-review",
  "q3-plan",
  "q3-review",
  "q4-plan",
  "q4-review",
  "final-menu",
] as const satisfies readonly PlayStepId[];

export function nextPlayStep(step: PlayStepId): PlayStepId | null {
  const index = PLAY_STEPS.indexOf(step);
  if (index < 0 || index === PLAY_STEPS.length - 1) return null;
  return PLAY_STEPS[index + 1];
}

export function previousPlayStep(step: PlayStepId): PlayStepId | null {
  const index = PLAY_STEPS.indexOf(step);
  if (index <= 0) return null;
  return PLAY_STEPS[index - 1];
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/playSteps.ts src/lib/__tests__/playSteps.test.ts
git commit -m "Add the ordered play-step list."
```

---

### Task 2: Continue gates

**Files:**
- Modify: `src/lib/playSteps.ts`
- Test: `src/lib/__tests__/playSteps.test.ts`

**Interfaces:**
- Consumes: `PlayStepId` from Task 1
- Produces:

```ts
export interface PlayContinueInput {
  tacticCount: number;
  spend: number;
  quarterBudget: number;
  wildcardPresented: boolean;
  wildcardAnswered: boolean;
}

export function canContinuePlayStep(step: PlayStepId, input?: PlayContinueInput): boolean;
```

Setup and strategy return true only when the caller passes `ready: true` through a second helper:

```ts
export function canContinueSetup(input: { scenarioId: string | null; companyName: string; logoStyle: string | null; hasBudgetAllocation: boolean }): boolean;
export function canContinueStrategy(input: { targetAudience: string; brandPositioning: string; channelCount: number }): boolean;
```

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/playSteps.test.ts`:

```ts
import { canContinuePlayStep, canContinueSetup, canContinueStrategy } from "../playSteps";

const openQuarter = {
  tacticCount: 1,
  spend: 1000,
  quarterBudget: 125000,
  wildcardPresented: false,
  wildcardAnswered: false,
};

describe("continue gates", () => {
  test("setup requires scenario, company, logo, and a budget allocation", () => {
    expect(canContinueSetup({
      scenarioId: "challenger",
      companyName: "Guided Demo Co.",
      logoStyle: "monogram",
      hasBudgetAllocation: true,
    })).toBe(true);
    expect(canContinueSetup({
      scenarioId: null,
      companyName: "",
      logoStyle: null,
      hasBudgetAllocation: false,
    })).toBe(false);
  });

  test("strategy requires audience, positioning, and one channel", () => {
    expect(canContinueStrategy({
      targetAudience: "Young professionals",
      brandPositioning: "Innovation",
      channelCount: 1,
    })).toBe(true);
    expect(canContinueStrategy({
      targetAudience: "",
      brandPositioning: "Innovation",
      channelCount: 1,
    })).toBe(false);
  });

  test("a quarter plan requires a tactic inside budget", () => {
    expect(canContinuePlayStep("q1-plan", openQuarter)).toBe(true);
    expect(canContinuePlayStep("q1-plan", { ...openQuarter, tacticCount: 0 })).toBe(false);
    expect(canContinuePlayStep("q1-plan", { ...openQuarter, spend: 200000 })).toBe(false);
  });

  test("a presented wildcard must be answered", () => {
    expect(canContinuePlayStep("q2-plan", {
      ...openQuarter,
      wildcardPresented: true,
      wildcardAnswered: false,
    })).toBe(false);
    expect(canContinuePlayStep("q2-plan", {
      ...openQuarter,
      wildcardPresented: true,
      wildcardAnswered: true,
    })).toBe(true);
  });

  test("review and the final menu can continue without tactics", () => {
    expect(canContinuePlayStep("q1-review")).toBe(true);
    expect(canContinuePlayStep("final-menu")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: FAIL because `canContinuePlayStep` is not exported.

- [ ] **Step 3: Implement the gates**

Add to `src/lib/playSteps.ts`:

```ts
export interface PlayContinueInput {
  tacticCount: number;
  spend: number;
  quarterBudget: number;
  wildcardPresented: boolean;
  wildcardAnswered: boolean;
}

const PLAN_STEPS: readonly PlayStepId[] = ["q1-plan", "q2-plan", "q3-plan", "q4-plan"];

export function canContinueSetup(input: {
  scenarioId: string | null;
  companyName: string;
  logoStyle: string | null;
  hasBudgetAllocation: boolean;
}): boolean {
  return Boolean(
    input.scenarioId
    && input.companyName.trim()
    && input.logoStyle
    && input.hasBudgetAllocation,
  );
}

export function canContinueStrategy(input: {
  targetAudience: string;
  brandPositioning: string;
  channelCount: number;
}): boolean {
  return Boolean(
    input.targetAudience.trim()
    && input.brandPositioning.trim()
    && input.channelCount > 0,
  );
}

export function canContinuePlayStep(step: PlayStepId, input?: PlayContinueInput): boolean {
  if (step === "final-menu") return false;
  if (!PLAN_STEPS.includes(step)) return true;
  if (!input) return false;
  if (input.tacticCount < 1) return false;
  if (input.spend > input.quarterBudget) return false;
  if (input.wildcardPresented && !input.wildcardAnswered) return false;
  return true;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/playSteps.ts src/lib/__tests__/playSteps.test.ts
git commit -m "Gate Continue on the choices each play step requires."
```

---

### Task 3: Quarter review changes when the choice changes

**Files:**
- Create: `src/lib/quarterReview.ts`
- Test: `src/lib/__tests__/quarterReview.test.ts`

**Interfaces:**
- Consumes: `processQuarterAdvance`, `createInitialSimulationContext`, `getTacticById`, `getSimulationScenarioById`
- Produces:

```ts
export interface QuarterReviewFacts {
  tacticIds: string[];
  wildcardChoiceId: string | null;
  hiredTalentId: string | null;
  bigBetId: string | null;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
}

export function quarterReviewFacts(input: {
  tacticIds: string[];
  wildcardChoiceId?: string | null;
  hiredTalentId?: string | null;
  bigBetId?: string | null;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
}): QuarterReviewFacts;

export function reviewsDiffer(left: QuarterReviewFacts, right: QuarterReviewFacts): boolean;
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/quarterReview.test.ts`:

```ts
import { createInitialSimulationContext, processQuarterAdvance } from "../simMachine";
import { getSimulationScenarioById } from "../config/simulationScenarios";
import { getTacticById } from "../tactics";
import { quarterReviewFacts, reviewsDiffer } from "../quarterReview";

function runQ1(tacticId: string) {
  const scenario = getSimulationScenarioById("challenger");
  if (!scenario) throw new Error("missing challenger scenario");
  const tactic = getTacticById(tacticId);
  if (!tactic) throw new Error(`missing tactic ${tacticId}`);
  const context = createInitialSimulationContext();
  context.scenarioId = "challenger";
  context.totalBudget = scenario.budget;
  context.remainingBudget = scenario.budget;
  context.strategy = {
    ...context.strategy,
    companyName: "Review Co",
    targetAudience: "Growth-minded operations leaders",
    brandPositioning: "Reliable growth with measurable ROI",
    primaryChannels: ["digital", "content"],
    industry: scenario.industry,
    marketLandscape: scenario.marketLandscape,
    difficulty: "intermediate",
  };
  context.kpis = { ...scenario.startingKPIs };
  context.quarters.Q1.tactics = [tactic];
  const advanced = processQuarterAdvance(context, "Q1");
  return quarterReviewFacts({
    tacticIds: [tacticId],
    revenue: advanced.newQuarterData.results.revenue,
    profit: advanced.newQuarterData.results.profit,
    marketShare: advanced.newQuarterData.results.marketShare,
    customerSatisfaction: advanced.newQuarterData.results.customerSatisfaction,
    brandAwareness: advanced.newQuarterData.results.brandAwareness,
  });
}

describe("quarter review facts", () => {
  test("a different Q1 tactic changes the review", () => {
    const digital = runQ1("digital-1");
    const content = runQ1("content-1");
    expect(reviewsDiffer(digital, content)).toBe(true);
  });

  test("skipping a hire does not invent a hire id", () => {
    const review = quarterReviewFacts({
      tacticIds: ["digital-1"],
      revenue: 1,
      profit: 1,
      marketShare: 1,
      customerSatisfaction: 1,
      brandAwareness: 1,
    });
    expect(review.hiredTalentId).toBeNull();
    expect(review.bigBetId).toBeNull();
    expect(review.wildcardChoiceId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/lib/__tests__/quarterReview.test.ts --watch=false --runInBand`

Expected: FAIL because `../quarterReview` does not exist.

- [ ] **Step 3: Implement the review facts**

Create `src/lib/quarterReview.ts`:

```ts
export interface QuarterReviewFacts {
  tacticIds: string[];
  wildcardChoiceId: string | null;
  hiredTalentId: string | null;
  bigBetId: string | null;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
}

export function quarterReviewFacts(input: {
  tacticIds: string[];
  wildcardChoiceId?: string | null;
  hiredTalentId?: string | null;
  bigBetId?: string | null;
  revenue: number;
  profit: number;
  marketShare: number;
  customerSatisfaction: number;
  brandAwareness: number;
}): QuarterReviewFacts {
  return {
    tacticIds: [...input.tacticIds],
    wildcardChoiceId: input.wildcardChoiceId ?? null,
    hiredTalentId: input.hiredTalentId ?? null,
    bigBetId: input.bigBetId ?? null,
    revenue: input.revenue,
    profit: input.profit,
    marketShare: input.marketShare,
    customerSatisfaction: input.customerSatisfaction,
    brandAwareness: input.brandAwareness,
  };
}

export function reviewsDiffer(left: QuarterReviewFacts, right: QuarterReviewFacts): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx jest src/lib/__tests__/quarterReview.test.ts --watch=false --runInBand`

Expected: PASS. If `digital-1` and `content-1` produce identical KPI numbers, stop and record the actual numbers in the test failure. Do not change score weights in this task. Change the assertion to the first field that differs (tactic id is enough if KPIs match) by comparing `digital.tacticIds` with `content.tacticIds` and keeping `reviewsDiffer` true because tactic ids differ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quarterReview.ts src/lib/__tests__/quarterReview.test.ts
git commit -m "Record quarter review facts from the choices the player made."
```

---

### Task 4: Play screen frame

**Files:**
- Create: `src/components/simulation/PlayFrame.tsx`
- Create: `src/app/sim/play/page.tsx`
- Modify: `src/components/simulation/CrmShell.tsx`

**Interfaces:**
- Consumes: `PlayStepId`, `nextPlayStep`, `previousPlayStep`, `canContinuePlayStep`
- Produces: a client page at `/sim/play` that reads `playStep` from simulation context once Task 6 stores it. Until Task 6, the page may read `window.sessionStorage` key `cmo-play-step` only as a temporary holder. Task 6 deletes that key and stores the step on the simulation context instead. Do not leave both.

For this task, store the step on context through a new optional field added in Task 6. Implement Task 6's context field first if the page cannot compile without it. The field is:

```ts
playStep: PlayStepId;
```

on `SimulationContext` in `src/lib/simMachine.ts`, default `"setup"`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/playSteps.test.ts`:

```ts
import { legacyPathOpensPlay } from "../playSteps";

describe("legacy paths", () => {
  test("quarter and CRM paths belong to the play screen", () => {
    expect(legacyPathOpensPlay("/sim/q3")).toBe(true);
    expect(legacyPathOpensPlay("/sim/campaigns")).toBe(true);
    expect(legacyPathOpensPlay("/sim/pipeline")).toBe(true);
    expect(legacyPathOpensPlay("/sim/analytics")).toBe(true);
    expect(legacyPathOpensPlay("/sim/play")).toBe(false);
    expect(legacyPathOpensPlay("/sim")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: FAIL because `legacyPathOpensPlay` is missing.

- [ ] **Step 3: Add the path helper and the frame**

Add to `src/lib/playSteps.ts`:

```ts
const LEGACY_PLAY_PREFIXES = [
  "/sim/setup",
  "/sim/strategy",
  "/sim/q1",
  "/sim/q2",
  "/sim/q3",
  "/sim/q4",
  "/sim/campaigns",
  "/sim/pipeline",
  "/sim/analytics",
  "/sim/debrief",
];

export function legacyPathOpensPlay(pathname: string): boolean {
  return LEGACY_PLAY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
```

Create `src/components/simulation/PlayFrame.tsx` as a client component. Props:

```ts
export function PlayFrame(props: {
  step: PlayStepId;
  title: string;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  onQuit: () => void;
  children: React.ReactNode;
})
```

Render a header with the step title, the step body, and a footer with three buttons: Back (disabled when `previousPlayStep(props.step)` is null), Continue (disabled when `props.canContinue` is false, hidden on `final-menu`), and Quit. Do not render `CrmShell` nav items inside this frame.

Create `src/app/sim/play/page.tsx` as a client page. Read `context.playStep`. The page is a switch, not a copy of the old pages:

```tsx
switch (context.playStep) {
  case "setup":
    return <PlayFrame ...><SetupStep /></PlayFrame>;
  case "strategy":
    return <PlayFrame ...><StrategyStep /></PlayFrame>;
  case "q1-plan":
  case "q2-plan":
  case "q3-plan":
  case "q4-plan":
    return <PlayFrame ...><QuarterPlanStep quarter={quarterFor(context.playStep)} /></PlayFrame>;
  case "q1-review":
  case "q2-review":
  case "q3-review":
  case "q4-review":
    return <PlayFrame ...><QuarterReviewStep quarter={quarterFor(context.playStep)} /></PlayFrame>;
  case "final-menu":
    return <PlayFrame ...><FinalMenuStep /></PlayFrame>;
}
```

`quarterFor` maps `q1-plan` and `q1-review` to `"Q1"`, and the same for Q2–Q4. Export `SetupStep` from `src/app/sim/setup/page.tsx` by renaming the current default function and leaving the default export as the redirect added in Task 5. Do the same for `StrategyStep` in `src/app/sim/strategy/page.tsx`. `QuarterPlanStep` lives in `src/components/simulation/QuarterPlanStep.tsx` and renders the existing `QuarterOperatingConsole` for that quarter, plus the Q2 talent modal and the Q3 big-bet modal that those pages already mount. `QuarterReviewStep` lives in `src/components/simulation/QuarterReviewStep.tsx` and renders `quarterReviewFacts(...)` for that quarter: tactic ids, five KPI numbers, and wildcard, hire, and big-bet ids when they are not null. `FinalMenuStep` renders three buttons: Debrief (`router.push` stays on the final step until a debrief view is opened from this menu by setting nothing else; the button sets `playStep` to stay on `final-menu` and shows the existing debrief component under the frame), Start new (Task 6's clear-and-setup action), and Home (Task 6's confirm). Continue calls `nextPlayStep` and assigns `playStep`. Back calls `previousPlayStep`.

In `CrmShell`, when `pathname.startsWith("/sim/play")`, return `children` without the sidebar, the mobile nav, or the quarter links.

- [ ] **Step 4: Run the tests**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: PASS. Then run `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/playSteps.ts src/lib/__tests__/playSteps.test.ts src/components/simulation/PlayFrame.tsx src/app/sim/play/page.tsx src/components/simulation/CrmShell.tsx src/lib/simMachine.ts
git commit -m "Add the single play screen and hide the sidebar there."
```

---

### Task 5: Send old destinations to the current step

**Files:**
- Modify: `src/app/sim/q1/page.tsx`
- Modify: `src/app/sim/q2/page.tsx`
- Modify: `src/app/sim/q3/page.tsx`
- Modify: `src/app/sim/q4/page.tsx`
- Modify: `src/app/sim/setup/page.tsx`
- Modify: `src/app/sim/strategy/page.tsx`
- Modify: `src/app/sim/campaigns/page.tsx`
- Modify: `src/app/sim/pipeline/page.tsx`
- Modify: `src/app/sim/analytics/page.tsx`
- Modify: `src/app/sim/debrief/page.tsx`
- Modify: `src/components/simulation/CrmShell.tsx`

**Interfaces:**
- Consumes: `legacyPathOpensPlay` from `src/lib/playSteps.ts`
- Produces: those pages immediately `router.replace("/sim/play")` and render nothing else.

- [ ] **Step 1: Write the failing test**

The pure test from Task 4 already locks the prefix list. Add this case to the same file:

```ts
test("a nested debrief path also opens play", () => {
  expect(legacyPathOpensPlay("/sim/q2/debrief")).toBe(true);
});
```

- [ ] **Step 2: Run the test**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: PASS if Task 4's prefix `/sim/q2` already matches nested paths. If it fails, the helper is matching only exact paths. Fix the helper so `pathname.startsWith(prefix)` is true for `/sim/q2/debrief`, then rerun.

- [ ] **Step 3: Redirect each legacy page**

At the top of each listed page component, add:

```tsx
const router = useRouter();
useEffect(() => {
  router.replace("/sim/play");
}, [router]);
return null;
```

Remove the clickable quarter, campaign, pipeline, and analytics links from `CrmShell` for every `/sim` route. The play frame is the only navigation during a run. Keep Home at `/sim`.

Also change the progress guard in `CrmShell` so it does not `router.replace` a player from `/sim/play` back to `/sim/q1`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/sim src/components/simulation/CrmShell.tsx src/lib/playSteps.ts src/lib/__tests__/playSteps.test.ts
git commit -m "Send legacy simulation routes to the current play step."
```

---

### Task 6: Save the step, confirm Quit, and resume

**Files:**
- Modify: `src/lib/simMachine.ts`
- Modify: `src/lib/simulationHydration.ts`
- Modify: `src/components/simulation/SimulationProvider.tsx`
- Modify: `src/app/sim/page.tsx`
- Modify: `src/app/sim/play/page.tsx`
- Test: `src/lib/__tests__/playSteps.test.ts`

**Interfaces:**
- Consumes: `PlayStepId`
- Produces: `SimulationContext.playStep`, persisted through the existing `cmo-sim-state-v2` snapshot. `mergeSimulationContext` keeps a valid `playStep` and falls back to `"setup"` when the saved value is missing or unknown.

- [ ] **Step 1: Write the failing test**

Append:

```ts
import { createInitialSimulationContext } from "../simMachine";
import { mergeSimulationContext } from "../simulationHydration";

test("hydration keeps a saved play step and rejects an unknown one", () => {
  const base = createInitialSimulationContext();
  expect(base.playStep).toBe("setup");
  const kept = mergeSimulationContext(base, { playStep: "q2-plan" });
  expect(kept.playStep).toBe("q2-plan");
  const reset = mergeSimulationContext(base, { playStep: "not-a-step" as never });
  expect(reset.playStep).toBe("setup");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx jest src/lib/__tests__/playSteps.test.ts --watch=false --runInBand`

Expected: FAIL because `playStep` is not on the context.

- [ ] **Step 3: Persist the step and wire Quit**

Add `playStep: PlayStepId` to `SimulationContext` and `initialContext` with value `"setup"`. In `mergeSimulationContext`, copy `playStep` only when it is one of `PLAY_STEPS`.

`/sim/page.tsx` becomes Home. It shows two actions:

- Resume, enabled when local storage has a meaningful run. It routes to `/sim/play`.
- Start new. It clears `cmo-sim-state-v2`, sends `RESTART_SIMULATION`, sets `playStep` to `"setup"`, and routes to `/sim/play`.

Quit in `PlayFrame` opens a confirm dialog: "Leave this step? Your run stays on this device." Cancel closes the dialog. Confirm writes the current context, including `playStep`, to `cmo-sim-state-v2`, then `router.push("/sim")`.

Do not remove `cmo-sim-state-v2` on Quit. The provider must not delete that key while a `playStep` other than the empty initial setup is present.

- [ ] **Step 4: Run the tests**

Run: `npx jest src/lib/__tests__/playSteps.test.ts src/lib/__tests__/simulationHydration.test.ts --watch=false --runInBand`

Expected: PASS. Then `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/simMachine.ts src/lib/simulationHydration.ts src/components/simulation/SimulationProvider.tsx src/app/sim/page.tsx src/app/sim/play/page.tsx src/lib/__tests__/playSteps.test.ts
git commit -m "Resume a saved play step after Quit."
```

---

### Task 7: Proof

**Files:**
- Test: `src/lib/__tests__/playSteps.test.ts`
- Test: `src/lib/__tests__/quarterReview.test.ts`

**Interfaces:**
- Consumes: `PLAY_STEPS`, `nextPlayStep`, `previousPlayStep`, `legacyPathOpensPlay`, `reviewsDiffer`

- [ ] **Step 1: Add the path proof**

Append one test that walks `PLAY_STEPS` with `nextPlayStep` from `setup` to `final-menu`, then asserts `previousPlayStep("q2-review")` is `q2-plan` and `previousPlayStep("q2-plan")` is not used as a jump to `q1-plan` in a single Back. Also assert `legacyPathOpensPlay("/sim/q3")` is true.

- [ ] **Step 2: Run the full unit suite**

Run: `npx jest --watch=false --runInBand`

Expected: all suites PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/playSteps.test.ts src/lib/__tests__/quarterReview.test.ts
git commit -m "Prove the play path, one-step Back, and review changes."
```

---

## Spec coverage

- Single path and eleven steps: Tasks 1 and 4.
- Back one step: Tasks 1 and 4.
- Continue gates: Task 2.
- Review shows the choice and changes when the choice changes: Task 3 and the review branch of Task 4.
- Optional hire and big bet: Task 3 null ids, Task 4 review rendering.
- Quit confirm and local resume: Task 6.
- Legacy URLs: Tasks 4 and 5.
- No sidebar during the run: Task 4 `CrmShell` branch and Task 5 link removal.
- Score-range widening and new variables: no task. Leave `buildSimulationScoreBreakdowns` and `processQuarterAdvance` formulas unchanged.
- Guest `simulation-events`: already skipped when there is no session in `src/lib/simulationTelemetry.ts`. Do not reopen that route.

## Self-review

The step names in Tasks 1 through 7 are the same `PlayStepId` union. `canContinuePlayStep`, `legacyPathOpensPlay`, `quarterReviewFacts`, and `reviewsDiffer` keep the signatures from the task that creates them. No task tells the implementer to widen scores or add a sidebar.
