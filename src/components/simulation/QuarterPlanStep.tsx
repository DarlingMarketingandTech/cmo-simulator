"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Briefcase, Target, Users } from "lucide-react";
import { BigBetModal } from "@/components/simulation/BigBetModal";
import { ImmersiveLayout } from "@/components/simulation/ImmersiveLayout";
import { QuarterOperatingConsole } from "@/components/simulation/QuarterOperatingConsole";
import { TalentMarketModal } from "@/components/simulation/TalentMarketModal";
import { WildcardModal } from "@/components/simulation/WildcardModal";
import { Button } from "@/components/ui/button";
import {
  MobileSheet,
  MobileSheetContent,
  MobileSheetDescription,
  MobileSheetDismissButton,
  MobileSheetHeader,
  MobileSheetTitle,
} from "@/components/ui/mobile-sheet";
import { useSimulation } from "@/hooks/useSimulation";
import { calculateEnhancedWildcardImpact, type EnhancedWildcardEvent } from "@/lib/enhancedWildcards";
import type { Tactic } from "@/lib/simMachine";
import { getTacticsForQuarter } from "@/lib/tactics";
import { calculateBigBetOutcome, getRandomBigBets, getRandomTalentPool, type BigBetOption, type TalentCandidate } from "@/lib/talentMarket";
import { getEnhancedWildcardForQuarter } from "@/lib/wildcardHelpers";

type QuarterId = "Q1" | "Q2" | "Q3" | "Q4";

const PLAN_COPY: Record<QuarterId, { title: string; subtitle: string; layoutTitle: string; layoutSubtitle: string; quarterLabel: string; completeLabel: string }> = {
  Q1: {
    title: "Set the first-quarter growth foundation",
    subtitle: "Choose a focused mix that can create early signal while preserving enough budget for learning and course correction.",
    layoutTitle: "Q1 Operating Plan",
    layoutSubtitle: "Set the first quarter foundation.",
    quarterLabel: "Quarter 1",
    completeLabel: "Finalize Q1 plan",
  },
  Q2: {
    title: "Scale what is working without losing control",
    subtitle: "Use second-quarter budget to increase reach, handle market pressure, and avoid overcommitting the team.",
    layoutTitle: "Q2 Operating Plan",
    layoutSubtitle: "Scale with discipline.",
    quarterLabel: "Quarter 2",
    completeLabel: "Finalize Q2 plan",
  },
  Q3: {
    title: "Rebalance the mix before the final push",
    subtitle: "Use the third quarter to double down, correct saturation, or make a bigger strategic bet before the year closes.",
    layoutTitle: "Q3 Operating Plan",
    layoutSubtitle: "Optimize from real signals.",
    quarterLabel: "Quarter 3",
    completeLabel: "Finalize Q3 plan",
  },
  Q4: {
    title: "Make the final quarter count",
    subtitle: "Prioritize the moves that strengthen the annual result, explain the tradeoff, and produce a useful final debrief.",
    layoutTitle: "Q4 Operating Plan",
    layoutSubtitle: "Close the year with a defensible scorecard.",
    quarterLabel: "Quarter 4",
    completeLabel: "Finalize annual plan",
  },
};

export function QuarterPlanStep({
  quarter,
  canFinalize,
  onFinalize,
}: {
  quarter: QuarterId;
  canFinalize: boolean;
  onFinalize: () => void;
}) {
  const { context, addTactic, removeTactic, triggerWildcard, respondToWildcard, makeBigBet, send } = useSimulation();
  const [selectedTactics, setSelectedTactics] = useState<Tactic[]>(context.quarters[quarter].tactics || []);
  const [currentWildcard, setCurrentWildcard] = useState<EnhancedWildcardEvent | null>(null);
  const [showWildcardModal, setShowWildcardModal] = useState(false);
  const [talentCandidates, setTalentCandidates] = useState<TalentCandidate[]>([]);
  const [showTalentMarket, setShowTalentMarket] = useState(false);
  const [hasTriggeredTalentMarket, setHasTriggeredTalentMarket] = useState(false);
  const [showOptionsPrompt, setShowOptionsPrompt] = useState(false);
  const [availableBigBets, setAvailableBigBets] = useState<BigBetOption[]>([]);
  const [showBigBetModal, setShowBigBetModal] = useState(false);
  const copy = PLAN_COPY[quarter];
  const offersWildcard = quarter !== "Q1";

  useEffect(() => {
    setSelectedTactics(context.quarters[quarter].tactics || []);
  }, [context.quarters, quarter]);

  const quarterBudget = Math.floor((context.totalBudget || 500000) / 4);
  const usedBudget = selectedTactics.reduce((sum, tactic) => sum + (tactic.cost || 0), 0);
  const remainingBudget = quarterBudget - usedBudget;

  const handleTriggerWildcard = useCallback(() => {
    const unanswered = context.quarters[quarter].wildcardEvents.find((event) => !event.selectedChoice);
    if (unanswered) {
      setCurrentWildcard(unanswered as EnhancedWildcardEvent);
      setShowWildcardModal(true);
      return;
    }
    const wildcard = getEnhancedWildcardForQuarter(context, quarter);
    if (!wildcard) return;
    setCurrentWildcard(wildcard);
    setShowWildcardModal(true);
    triggerWildcard(quarter, wildcard);
  }, [context, quarter, triggerWildcard]);

  useEffect(() => {
    if (quarter !== "Q3") return;
    setAvailableBigBets(getRandomBigBets(3));
  }, [quarter]);

  useEffect(() => {
    if (!offersWildcard || showWildcardModal || currentWildcard) return;
    const chance = quarter === "Q2" ? 0.7 : quarter === "Q3" ? 0.8 : 0.6;
    if (Math.random() > chance) handleTriggerWildcard();
  }, [currentWildcard, handleTriggerWildcard, offersWildcard, quarter, showWildcardModal]);

  useEffect(() => {
    if (quarter === "Q2" && selectedTactics.length === 0) setShowOptionsPrompt(true);
  }, [quarter, selectedTactics.length]);

  const handleAddTactic = (tactic: Tactic) => {
    if (selectedTactics.some((selected) => selected.id === tactic.id)) return;
    setSelectedTactics((current) => [...current, tactic]);
    addTactic(quarter, tactic);
  };

  const handleRemoveTactic = (tacticId: string) => {
    setSelectedTactics((current) => current.filter((tactic) => tactic.id !== tacticId));
    removeTactic(quarter, tacticId);
  };

  const focusSelectedPlan = () => {
    document.getElementById("selected-plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openTalentOptions = () => {
    setTalentCandidates(getRandomTalentPool(3));
    setShowTalentMarket(true);
    setHasTriggeredTalentMarket(true);
  };

  const hireTalent = (candidate: TalentCandidate) => {
    send({ type: "HIRE_TALENT", quarter, candidate });
    setShowTalentMarket(false);
    focusSelectedPlan();
  };

  const specialActions = quarter === "Q1" ? undefined : (
    <section id="quarter-options" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quarter options</h2>
      <div className="mt-3 grid gap-2">
        {quarter === "Q2" ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start rounded-md border-slate-300 bg-white text-slate-800"
            onClick={openTalentOptions}
            disabled={hasTriggeredTalentMarket}
          >
            <Users className="mr-2 h-4 w-4" />
            Review talent options
          </Button>
        ) : null}
        {offersWildcard ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start rounded-md border-slate-300 bg-white text-slate-800"
            onClick={handleTriggerWildcard}
            disabled={showWildcardModal}
          >
            {quarter === "Q2" ? <Briefcase className="mr-2 h-4 w-4" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            {quarter === "Q2" ? "Open market briefing" : quarter === "Q3" ? "Review market risk" : "Run final risk check"}
          </Button>
        ) : null}
        {quarter === "Q3" ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start rounded-md border-slate-300 bg-white text-slate-800"
            onClick={() => setShowBigBetModal(true)}
            disabled={Boolean(context.quarters.Q3.bigBetMade)}
          >
            <Target className="mr-2 h-4 w-4" />
            {context.quarters.Q3.bigBetMade ? "Strategic bet selected" : "Evaluate strategic bet"}
          </Button>
        ) : null}
      </div>
    </section>
  );

  return (
    <ImmersiveLayout title={copy.layoutTitle} subtitle={copy.layoutSubtitle} quarter={copy.quarterLabel} hideHeader>
      <QuarterOperatingConsole
        context={context}
        quarter={quarter}
        title={copy.title}
        subtitle={copy.subtitle}
        availableTactics={getTacticsForQuarter(quarter)}
        selectedTactics={selectedTactics}
        onAddTactic={handleAddTactic}
        onRemoveTactic={handleRemoveTactic}
        onCompleteQuarter={onFinalize}
        canComplete={canFinalize}
        completeLabel={copy.completeLabel}
        specialActions={specialActions}
      />

      {showWildcardModal && currentWildcard ? (
        <WildcardModal
          wildcard={currentWildcard}
          isOpen={showWildcardModal}
          onChoose={(choiceId) => {
            const impact = calculateEnhancedWildcardImpact(currentWildcard, choiceId);
            respondToWildcard(quarter, currentWildcard, choiceId, impact);
            setShowWildcardModal(false);
            focusSelectedPlan();
          }}
          onClose={() => {
            setShowWildcardModal(false);
            focusSelectedPlan();
          }}
        />
      ) : null}

      {quarter === "Q2" && showTalentMarket ? (
        <TalentMarketModal
          candidates={talentCandidates}
          isOpen={showTalentMarket}
          onHire={hireTalent}
          availableBudget={remainingBudget}
          onClose={() => {
            setShowTalentMarket(false);
            focusSelectedPlan();
          }}
        />
      ) : null}

      {quarter === "Q3" && showBigBetModal ? (
        <BigBetModal
          bigBets={availableBigBets}
          isOpen={showBigBetModal}
          onClose={() => setShowBigBetModal(false)}
          onSelect={(bet) => {
            const outcome = calculateBigBetOutcome(bet, context, false);
            makeBigBet("Q3", bet, { success: outcome.success, actualImpact: outcome.actualImpact });
            setShowBigBetModal(false);
            focusSelectedPlan();
          }}
          availableBudget={remainingBudget}
          currentKPIs={context.kpis}
        />
      ) : null}

      {quarter === "Q2" ? (
        <MobileSheet open={showOptionsPrompt} onOpenChange={setShowOptionsPrompt}>
          <MobileSheetContent className="max-h-[72vh]">
            <MobileSheetHeader>
              <div>
                <MobileSheetTitle>Quarter options available</MobileSheetTitle>
                <MobileSheetDescription>
                  Want to use optional actions now, or continue with tactic planning first?
                </MobileSheetDescription>
              </div>
              <MobileSheetDismissButton />
            </MobileSheetHeader>
            <div className="space-y-2 px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-xl border-slate-300 bg-white text-slate-800"
                onClick={() => {
                  setShowOptionsPrompt(false);
                  openTalentOptions();
                }}
                disabled={hasTriggeredTalentMarket}
              >
                <Users className="mr-2 h-4 w-4" />
                Use talent options
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-xl border-slate-300 bg-white text-slate-800"
                onClick={() => {
                  setShowOptionsPrompt(false);
                  handleTriggerWildcard();
                }}
                disabled={showWildcardModal}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Open market briefing
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setShowOptionsPrompt(false);
                  document.getElementById("quarter-options")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Show options and continue planning
              </Button>
            </div>
          </MobileSheetContent>
        </MobileSheet>
      ) : null}
    </ImmersiveLayout>
  );
}
