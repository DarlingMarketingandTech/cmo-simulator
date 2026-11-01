"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SetupStep } from "@/app/sim/setup/SetupStep";
import { StrategyStep } from "@/app/sim/strategy/StrategyStep";
import { EnhancedDebrief } from "@/components/simulation/EnhancedDebrief";
import { PlayFrame } from "@/components/simulation/PlayFrame";
import { QuarterPlanStep } from "@/components/simulation/QuarterPlanStep";
import { QuarterReviewStep } from "@/components/simulation/QuarterReviewStep";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/hooks/useSimulation";
import {
  canContinuePlayStep,
  canContinueSetup,
  canContinueStrategy,
  nextPlayStep,
  previousPlayStep,
  type PlayStepId,
} from "@/lib/playSteps";
import type { SimulationContext } from "@/lib/simMachine";
import { buildSimulationScoreBreakdowns, deriveSimulationRecommendations } from "@/lib/simulationIntelligence";

const STEP_TITLES: Record<PlayStepId, string> = {
  setup: "Setup",
  strategy: "Strategy",
  "q1-plan": "Q1 plan",
  "q1-review": "Q1 review",
  "q2-plan": "Q2 plan",
  "q2-review": "Q2 review",
  "q3-plan": "Q3 plan",
  "q3-review": "Q3 review",
  "q4-plan": "Q4 plan",
  "q4-review": "Q4 review",
  "final-menu": "Final menu",
};

type QuarterId = "Q1" | "Q2" | "Q3" | "Q4";

function quarterFor(step: PlayStepId): QuarterId {
  if (step.startsWith("q2")) return "Q2";
  if (step.startsWith("q3")) return "Q3";
  if (step.startsWith("q4")) return "Q4";
  return "Q1";
}

function isPlanStep(step: PlayStepId) {
  return step.endsWith("-plan");
}

function isReviewStep(step: PlayStepId) {
  return step.endsWith("-review");
}

function canContinueFromContext(context: SimulationContext, step: PlayStepId) {
  if (step === "setup") {
    const allocation = context.strategy.budgetAllocation;
    return canContinueSetup({
      scenarioId: context.scenarioId ?? null,
      companyName: context.strategy.companyName ?? "",
      logoStyle: context.strategy.logoStyle ?? null,
      hasBudgetAllocation: Boolean(
        allocation && Object.values(allocation).some((value) => typeof value === "number" && value > 0),
      ),
    });
  }

  if (step === "strategy") {
    return canContinueStrategy({
      targetAudience: context.strategy.targetAudience ?? "",
      brandPositioning: context.strategy.brandPositioning ?? "",
      channelCount: context.strategy.primaryChannels?.length ?? 0,
    });
  }

  if (isPlanStep(step)) {
    const quarter = quarterFor(step);
    const tactics = context.quarters[quarter].tactics ?? [];
    const spend = tactics.reduce((sum, tactic) => sum + (tactic.cost || 0), 0);
    const wildcards = context.quarters[quarter].wildcardEvents ?? [];
    return canContinuePlayStep(step, {
      tacticCount: tactics.length,
      spend,
      quarterBudget: Math.floor((context.totalBudget || 500000) / 4),
      wildcardPresented: wildcards.length > 0,
      wildcardAnswered: wildcards.every((wildcard) => Boolean(wildcard.selectedChoice)),
    });
  }

  return canContinuePlayStep(step);
}

function FinalMenuStep({
  showDebrief,
  onDebrief,
  onStartNew,
  onHome,
}: {
  showDebrief: boolean;
  onDebrief: () => void;
  onStartNew: () => void;
  onHome: () => void;
}) {
  const { context } = useSimulation();
  const scoreBreakdowns = buildSimulationScoreBreakdowns(context);
  const recommendations = deriveSimulationRecommendations(context, scoreBreakdowns);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onDebrief}>
          Debrief
        </Button>
        <Button type="button" variant="outline" onClick={onStartNew}>
          Start new
        </Button>
        <Button type="button" variant="ghost" onClick={onHome}>
          Home
        </Button>
      </div>
      {showDebrief ? (
        <EnhancedDebrief
          context={context}
          scoreBreakdowns={scoreBreakdowns}
          recommendations={recommendations}
          onExportPDF={() => {}}
          onSaveRun={() => {}}
          onRestart={onStartNew}
          showUtilityActions={false}
        />
      ) : null}
    </div>
  );
}

export default function PlayPage() {
  const router = useRouter();
  const { context, send, startSimulation, completeStrategySession, completeQuarter, restartSimulation } = useSimulation();
  const [showDebrief, setShowDebrief] = useState(false);
  const step = context.playStep;
  const canContinue = canContinueFromContext(context, step);

  useEffect(() => {
    if (step !== "final-menu") setShowDebrief(false);
  }, [step]);

  const leaveHome = () => {
    router.push("/sim");
  };

  const goToStep = (next: PlayStepId | null) => {
    if (!next) return;
    send({ type: "SET_PLAY_STEP", playStep: next });
  };

  const onBack = () => {
    goToStep(previousPlayStep(step));
  };

  const onContinue = () => {
    const next = nextPlayStep(step);
    if (!next || !canContinue) return;
    if (step === "setup") startSimulation();
    if (step === "strategy") {
      startSimulation();
      completeStrategySession();
    }
    if (isReviewStep(step)) completeQuarter(quarterFor(step));
    goToStep(next);
  };

  const onStartNew = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("cmo-sim-state-v2");
    }
    setShowDebrief(false);
    restartSimulation();
  };

  const frame = (children: ReactNode) => (
    <PlayFrame
      step={step}
      title={STEP_TITLES[step]}
      canContinue={canContinue}
      onBack={onBack}
      onContinue={onContinue}
      onQuit={leaveHome}
    >
      {children}
    </PlayFrame>
  );

  switch (step) {
    case "setup":
      return frame(<SetupStep stayOnPlay />);
    case "strategy":
      return frame(<StrategyStep stayOnPlay />);
    case "q1-plan":
    case "q2-plan":
    case "q3-plan":
    case "q4-plan":
      return frame(
        <QuarterPlanStep
          key={step}
          quarter={quarterFor(step)}
          canFinalize={canContinue}
          onFinalize={onContinue}
        />,
      );
    case "q1-review":
    case "q2-review":
    case "q3-review":
    case "q4-review":
      return frame(<QuarterReviewStep key={step} quarter={quarterFor(step)} />);
    case "final-menu":
      return frame(
        <FinalMenuStep
          showDebrief={showDebrief}
          onDebrief={() => setShowDebrief(true)}
          onStartNew={onStartNew}
          onHome={leaveHome}
        />,
      );
  }
}
