'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Check, Circle, DollarSign, LineChart, Minus, PieChart, Plus, Target, TrendingUp, WalletCards } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/Drawer';
import {
  MobileSheet,
  MobileSheetContent,
  MobileSheetDescription,
  MobileSheetDismissButton,
  MobileSheetHeader,
  MobileSheetTitle,
} from '@/components/ui/mobile-sheet';
import { CMOMentor } from '@/components/simulation/CMOMentor';
import { ExecutivePressure } from '@/components/simulation/ExecutivePressure';
import {
  buildSimulationForecast,
  formatForecastValue,
  getTacticBusinessProfile,
  type QuarterKey,
  type SimulationForecast,
} from '@/lib/simulationForecast';
import type { EnrichedTactic } from '@/lib/tactics';
import type { SimulationContext, Tactic } from '@/lib/simMachine';
import { cn } from '@/lib/utils';

const QUARTER_EXEC_FOCUS: Record<
  QuarterKey,
  { headline: string; objectives: string[] }
> = {
  Q1: {
    headline: 'Proof before scale',
    objectives: [
      'Establish credible early signal on pipeline and awareness without exhausting Q2–Q4 flexibility.',
      'Bias toward moves that create learning velocity the board can interpret in 90 days.',
    ],
  },
  Q2: {
    headline: 'Controlled acceleration',
    objectives: [
      'Scale what Q1 validated while watching acquisition efficiency and team load.',
      'Avoid doubling down on a single lane before retention and conversion buffers exist.',
    ],
  },
  Q3: {
    headline: 'Resilience tuning',
    objectives: [
      'Rebalance toward durable demand and satisfaction before the Q4 narrative sprint.',
      'Use remaining wildcard room deliberately — volatility compounds late in the year.',
    ],
  },
  Q4: {
    headline: 'Board-ready finish',
    objectives: [
      'Optimize for profitable revenue and defensible share story heading into debrief.',
      'Explicitly pair growth moves with trust or efficiency offsets where pressure is highest.',
    ],
  },
};

function buildPlanConsequenceSummary(
  forecast: SimulationForecast,
  budgetIsOver: boolean,
  hasMoves: boolean,
): { verdictLabel: string; verdictTone: 'neutral' | 'positive' | 'warning' | 'danger'; detail: string } {
  if (!hasMoves) {
    return {
      verdictLabel: 'Awaiting portfolio',
      verdictTone: 'neutral',
      detail:
        'Once you add tactics, this panel explains how the projected quarter compares to today’s baseline — including downside/upside spread in the pulse chart.',
    };
  }
  if (budgetIsOver) {
    return {
      verdictLabel: 'Over committed',
      verdictTone: 'danger',
      detail: `${forecast.topRisk} Trim or swap tactics until reserve returns to zero — otherwise execution risk dominates the forecast.`,
    };
  }
  const primary = forecast.explanationBullets[0];
  const riskCount = forecast.riskWarnings.length;
  const spreadNote =
    forecast.scenarioSpread.revenue > 0
      ? ` Revenue scenario spread is ${formatForecastValue(forecast.scenarioSpread.revenue, 'currency')} — wider spreads mean less certainty on landing the base case.`
      : '';
  const verdictLabel =
    riskCount >= 2 ? 'High variance plan' : riskCount === 1 ? 'Balanced with cautions' : 'Strong guardrails';
  const verdictTone = riskCount >= 2 ? 'warning' : riskCount === 1 ? 'neutral' : 'positive';
  const detail = `${primary ?? 'Projections reflect modeled synergies, audience fit, and competitive drag.'}${riskCount ? ` ${riskCount} additional modeled warning${riskCount > 1 ? 's' : ''} in the decision brief.` : ''}${spreadNote}`;
  return { verdictLabel, verdictTone, detail };
}

interface QuarterOperatingConsoleProps {
  context: SimulationContext;
  quarter: QuarterKey;
  title: string;
  subtitle: string;
  availableTactics: EnrichedTactic[];
  selectedTactics: Tactic[];
  onAddTactic: (tactic: Tactic) => void;
  onRemoveTactic: (tacticId: string) => void;
  onCompleteQuarter: () => void;
  canComplete: boolean;
  completeLabel: string;
  specialActions?: React.ReactNode;
}

export function QuarterOperatingConsole({
  context,
  quarter,
  title,
  subtitle,
  availableTactics,
  selectedTactics,
  onAddTactic,
  onRemoveTactic,
  onCompleteQuarter,
  canComplete,
  completeLabel,
  specialActions,
}: QuarterOperatingConsoleProps) {
  const forecast = useMemo(
    () => buildSimulationForecast(context, quarter, selectedTactics),
    [context, quarter, selectedTactics],
  );
  const execFocus = QUARTER_EXEC_FOCUS[quarter];
  const [briefTactic, setBriefTactic] = useState<EnrichedTactic | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const selectedPlanRef = useRef<HTMLDivElement | null>(null);
  const previousSelectedCountRef = useRef(selectedTactics.length);
  const finalizeHintMobileId = useId();
  const finalizeHintDesktopId = useId();
  const selectedIds = useMemo(() => new Set(selectedTactics.map((tactic) => tactic.id)), [selectedTactics]);
  const { budgetSummary } = forecast;
  const budgetIsOver = budgetSummary.remainingBudget < 0;
  const planConsequence = useMemo(
    () => buildPlanConsequenceSummary(forecast, budgetIsOver, selectedTactics.length > 0),
    [forecast, budgetIsOver, selectedTactics.length],
  );
  const finalizeHintText =
    selectedTactics.length === 0
      ? 'Add at least one move to finalize this quarter.'
      : budgetIsOver
        ? 'Selected spend exceeds this quarter’s budget—remove or swap moves to finalize.'
        : '';
  const planReadiness = selectedTactics.length === 0
    ? 'No moves selected'
    : budgetIsOver
      ? 'Budget needs review'
      : 'Ready to review';

  useEffect(() => {
    if (selectedTactics.length > previousSelectedCountRef.current) {
      selectedPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    previousSelectedCountRef.current = selectedTactics.length;
  }, [selectedTactics.length]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10 lg:space-y-6 lg:pb-16">
      <header>
        <p className="text-sm text-[#6b6b6b]">{subtitle}</p>
        <p className="mt-4 text-sm text-[#6b6b6b]">Reserve</p>
        <p className={cn("font-mono text-[30px] font-medium tabular-nums leading-none", budgetIsOver ? "text-[#c4242a]" : "text-[#1d5fbf]")}>
          ${budgetSummary.remainingBudget.toLocaleString()}
        </p>
        <p className="mt-2 font-mono text-sm tabular-nums text-[#6b6b6b]">
          ${budgetSummary.usedBudget.toLocaleString()} used of ${budgetSummary.quarterBudget.toLocaleString()}
        </p>
        <div className="mt-4 h-1 overflow-hidden bg-[#e6e6e6]">
          <div
            className={cn("h-full", budgetIsOver ? "bg-[#c4242a]" : "bg-[#1d5fbf]")}
            style={{ width: `${Math.min(budgetSummary.utilization * 100, 100)}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#6b6b6b]">{planConsequence.detail}</p>
      </header>

      <section className="grid gap-8">
        <main className="space-y-6">
          <Panel>
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Choose quarter moves</h2>
                <p className="text-sm leading-6 text-slate-600">
                  Compare purpose, tradeoff, and KPI pressure before adding budget to the plan.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-slate-300 bg-slate-50 text-slate-700">
                {selectedTactics.length} selected
              </Badge>
            </div>

            <div className="divide-y divide-slate-200">
              {availableTactics.map((tactic) => {
                const profile = getTacticBusinessProfile(tactic);
                const isSelected = selectedIds.has(tactic.id);
                return (
                  <article key={tactic.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_180px]">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">{tactic.name}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{tactic.description || tactic.strategicRationale}</p>
                        </div>
                        <Badge className="w-fit bg-slate-900 text-white hover:bg-slate-900">{profile.businessRole}</Badge>
                      </div>

                      <div className="lg:hidden">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-left"
                          onClick={() => setBriefTactic(tactic)}
                        >
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Decision brief</span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                              <Target className="h-3.5 w-3.5 text-slate-500" />
                              Best use
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                              Tradeoff
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">Open</span>
                        </button>
                      </div>

                      <div className="hidden lg:block">
                        <Drawer
                          className="shadow-sm"
                          summary={
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision drawer</span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                <Target className="h-3.5 w-3.5 text-slate-500" />
                                Best use
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                                Tradeoff
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                                Watch outs
                              </span>
                            </div>
                          }
                        >
                          <dl className="grid gap-3 text-sm md:grid-cols-3">
                            <Detail label="Best used when" value={profile.bestUsedWhen} />
                            <Detail label="Tradeoff" value={profile.primaryTradeoff} />
                            <Detail label="Watch out for" value={profile.watchOutFor} />
                          </dl>
                        </Drawer>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {profile.kpiPressure}
                        </span>
                        <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                          {tactic.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:flex-col lg:items-stretch">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Investment</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">${tactic.cost.toLocaleString()}</p>
                      </div>
                      <Button
                        type="button"
                        variant={isSelected ? 'outline' : 'default'}
                        className={cn(
                          'justify-center rounded-md',
                          isSelected ? 'border-slate-300 bg-white text-slate-600 hover:bg-white' : 'bg-slate-950 text-white hover:bg-slate-800',
                        )}
                        disabled={isSelected || tactic.cost > budgetSummary.remainingBudget}
                        onClick={() => onAddTactic(tactic)}
                      >
                        {isSelected ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            In plan
                          </>
                        ) : tactic.cost > budgetSummary.remainingBudget ? (
                          <>Over budget</>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add move
                          </>
                        )}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <div ref={selectedPlanRef} id="selected-plan" className="scroll-mt-24">
          <Panel>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Selected plan</h2>
                <p className="text-sm text-slate-600">These moves will be committed when you finalize the quarter.</p>
              </div>
              <span className="text-sm text-[#6b6b6b]">{selectedTactics.length} in the plan</span>
            </div>

            {selectedTactics.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No moves selected. Add at least one move to create a quarter plan.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedTactics.map((tactic) => {
                  const profile = getTacticBusinessProfile(tactic);
                  return (
                    <div key={tactic.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">{tactic.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {profile.businessRole} · ${tactic.cost.toLocaleString()} · {profile.kpiPressure}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" className="w-fit text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => onRemoveTactic(tactic.id)}>
                        <Minus className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
          </div>

          <div className="space-y-4 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[22px] border-slate-300 bg-white text-slate-800"
              onClick={() => setReviewOpen(true)}
            >
              Open quarter review
            </Button>

            {specialActions}

            <Button
              type="button"
              onClick={onCompleteQuarter}
              disabled={!canComplete}
              aria-describedby={!canComplete && finalizeHintText ? finalizeHintMobileId : undefined}
              className={cn(
                'w-full rounded-[22px] py-6 text-base font-semibold',
                canComplete ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400',
              )}
            >
              {completeLabel}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!canComplete && finalizeHintText ? (
              <p id={finalizeHintMobileId} className="mt-2 text-center text-xs leading-5 text-amber-900">
                {finalizeHintText}
              </p>
            ) : null}
          </div>
        </main>

        <aside className="hidden space-y-6 lg:block">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-slate-300 bg-white text-slate-800"
            onClick={() => setReviewOpen(true)}
          >
            Open quarter review
          </Button>

          {specialActions}

          <Button
            type="button"
            onClick={onCompleteQuarter}
            disabled={!canComplete}
            aria-describedby={!canComplete && finalizeHintText ? finalizeHintDesktopId : undefined}
            className={cn(
              'w-full rounded-md py-6 text-base font-semibold',
              canComplete ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400',
            )}
          >
            {completeLabel}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          {!canComplete && finalizeHintText ? (
            <p id={finalizeHintDesktopId} className="text-center text-xs leading-5 text-amber-900">
              {finalizeHintText}
            </p>
          ) : null}
        </aside>
      </section>

      <MobileSheet open={Boolean(briefTactic)} onOpenChange={(open) => (!open ? setBriefTactic(null) : null)}>
        <MobileSheetContent className="max-h-[84vh]">
          {briefTactic && (
            <>
              <MobileSheetHeader>
                <div>
                  <MobileSheetTitle>{briefTactic.name}</MobileSheetTitle>
                  <MobileSheetDescription>{briefTactic.description || briefTactic.strategicRationale}</MobileSheetDescription>
                </div>
                <MobileSheetDismissButton />
              </MobileSheetHeader>
              <div className="space-y-3 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
                <Detail label="Best used when" value={getTacticBusinessProfile(briefTactic).bestUsedWhen} />
                <Detail label="Tradeoff" value={getTacticBusinessProfile(briefTactic).primaryTradeoff} />
                <Detail label="Watch out for" value={getTacticBusinessProfile(briefTactic).watchOutFor} />
              </div>
            </>
          )}
        </MobileSheetContent>
      </MobileSheet>

      <MobileSheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <MobileSheetContent className="max-h-[90vh]">
          <MobileSheetHeader>
            <div>
              <MobileSheetTitle>{quarter} review</MobileSheetTitle>
              <MobileSheetDescription>
                Forecast, risk notes, and mentor guidance for the plan you are about to commit.
              </MobileSheetDescription>
            </div>
            <MobileSheetDismissButton />
          </MobileSheetHeader>
          <div className="space-y-4 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
            <ExecutivePressure currentQuarter={quarter} context={context} />
            <Panel className="min-w-0 p-0" id="operating-pulse">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Operating pulse</h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Forecasted KPI movement vs today if you finalize this portfolio.
                    </p>
                  </div>
                  <span className={cn(
                    'w-fit rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide',
                    budgetIsOver ? 'bg-red-50 text-red-700' : selectedTactics.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                  )}>
                    {planReadiness}
                  </span>
                </div>
              </div>
              {selectedTactics.length === 0 && (
                <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                    No moves selected. Add one move to see a true plan projection.
                  </div>
                </div>
              )}
              <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
                {forecast.deltaFromCurrent.map((metric) => (
                  <MetricTile key={metric.label} metric={metric} />
                ))}
              </div>
              <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Confidence band</h3>
                    <p className="text-sm text-slate-600">Downside, base, and upside quarter outcomes for the current plan.</p>
                  </div>
                  <Badge variant="outline" className="w-fit border-slate-300 bg-slate-50 text-slate-700">
                    Revenue spread {formatForecastValue(forecast.scenarioSpread.revenue, 'currency')}
                  </Badge>
                </div>
                <div className="mt-4 h-[180px] sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast.confidenceBand} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" tickFormatter={formatCompactCurrency} />
                      <Tooltip
                        cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                        contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10 }}
                        formatter={(value: number, key: string) => [
                          formatForecastValue(value, 'currency'),
                          key === 'lower' ? 'Downside' : key === 'upper' ? 'Upside' : 'Base',
                        ]}
                      />
                      <Area type="monotone" dataKey="upper" stroke="#cbd5e1" fill="#e2e8f0" fillOpacity={0.35} />
                      <Area type="monotone" dataKey="lower" stroke="#cbd5e1" fill="#ffffff" fillOpacity={1} />
                      <Area type="monotone" dataKey="expected" stroke="#0f172a" fill="#0f172a" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Panel>
            <DecisionBriefPanel forecast={forecast} planReadiness={planReadiness} selectedCount={selectedTactics.length} />
            <CMOMentor selectedTactics={selectedTactics} remainingBudget={budgetSummary.remainingBudget} currentQuarter={quarter} context={context} />
          </div>
        </MobileSheetContent>
      </MobileSheet>
    </div>
  );
}

function DecisionBriefPanel({
  forecast,
  planReadiness,
  selectedCount,
}: {
  forecast: ReturnType<typeof buildSimulationForecast>;
  planReadiness: string;
  selectedCount: number;
}) {
  const notesCount = forecast.explanationBullets.length;
  const risksCount = forecast.riskWarnings.length;
  const profitSpreadTone = forecast.scenarioSpread.profit > 0 ? 'warning' : 'neutral';

  return (
    <Panel className="min-w-0 lg:self-start" id="decision-brief">
      <div className="flex items-center gap-2">
        <LineChart className="h-5 w-5 shrink-0 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-950">Decision brief</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use this as the narrative bridge between tactic choices and quarter outcomes: drivers, warnings, and alternate scenarios live below.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={cn(
          'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
          planReadiness === 'Budget needs review' ? 'bg-red-50 text-red-700'
            : selectedCount > 0 ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600',
        )}>
          {planReadiness}
        </span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          {selectedCount} moves
        </span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          {notesCount} notes
        </span>
        <span className={cn(
          'rounded-md border px-2.5 py-1 text-xs font-medium',
          risksCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700',
        )}>
          {risksCount} risks
        </span>
        <span className={cn(
          'rounded-md border px-2.5 py-1 text-xs font-medium',
          profitSpreadTone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700',
        )}>
          Profit spread {formatForecastValue(forecast.scenarioSpread.profit, 'currency')}
        </span>
      </div>

      <Accordion type="multiple" className="mt-4 w-full border-t border-slate-200 pt-1">
        <AccordionItem value="forecast-notes" className="border-slate-200">
          <AccordionTrigger className="min-h-11 items-center py-3 text-base font-semibold text-slate-950 hover:no-underline [&>svg]:text-slate-500">
            Full forecast notes
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {forecast.explanationBullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="risks" className="border-slate-200">
          <AccordionTrigger className="min-h-11 items-center py-3 text-base font-semibold text-slate-950 hover:no-underline [&>svg]:text-slate-500">
            Open risks
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
              {forecast.topRisk}
            </p>
            {forecast.riskWarnings.length === 0 ? (
              <p className="text-sm text-slate-600">No additional modeled warnings for this plan.</p>
            ) : (
              <ul className="space-y-2">
                {forecast.riskWarnings.map((warning) => (
                  <li
                    key={warning}
                    className="min-w-0 break-words rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scenarios" className="border-slate-200">
          <AccordionTrigger className="min-h-11 items-center py-3 text-base font-semibold text-slate-950 hover:no-underline [&>svg]:text-slate-500">
            Scenario outcomes
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            {forecast.scenarios.map((scenario) => (
              <div key={scenario.key} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{scenario.label}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{scenario.confidenceLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">{formatForecastValue(scenario.projectedKpis.revenue, 'currency')}</p>
                    <p className="text-xs text-slate-500">Revenue</p>
                  </div>
                </div>
                <div className="mt-2 grid gap-1.5 text-sm text-slate-700">
                  {scenario.drivers.map((driver) => (
                    <p key={driver}>{driver}</p>
                  ))}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="channels" className="border-slate-200 border-b-0">
          <AccordionTrigger className="min-h-11 items-center py-3 text-base font-semibold text-slate-950 hover:no-underline [&>svg]:text-slate-500">
            <span className="flex items-center gap-2">
              <PieChart className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
              Channel mix
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            {forecast.channelBreakdown.length === 0 ? (
              <p className="text-sm leading-6 text-slate-600">Add moves to generate a channel forecast.</p>
            ) : (
              <div className="space-y-3">
                {forecast.channelBreakdown.map((channel) => (
                  <div key={channel.channel} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase text-slate-800">{channel.channel}</p>
                      <p className="text-sm font-semibold text-slate-950">${Math.round(channel.contribution).toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Projected ROI {channel.roi.toFixed(0)}% · adstock ${Math.round(channel.adstock).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Panel>
  );
}

function Panel({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('border-t border-[#e6e6e6] pt-6', className)}>
      {children}
    </section>
  );
}

function MetricTile({ metric }: { metric: ReturnType<typeof buildSimulationForecast>['deltaFromCurrent'][number] }) {
  const icons = {
    Revenue: DollarSign,
    Profit: BarChart3,
    'Market Share': Target,
    Awareness: TrendingUp,
    Satisfaction: Check,
  };
  const Icon = icons[metric.label as keyof typeof icons] || BarChart3;
  const isPositive = metric.delta >= 0;

  return (
    <div className="bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{metric.label}</p>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {formatForecastValue(metric.value, metric.format)}
      </p>
      <p className={cn('mt-1 text-sm font-medium', isPositive ? 'text-emerald-700' : 'text-red-700')}>
        {isPositive ? '+' : ''}{formatForecastValue(metric.delta, metric.format)}
      </p>
    </div>
  );
}

function QuarterTrack({ activeQuarter }: { activeQuarter: QuarterKey }) {
  const quarters: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const activeIndex = quarters.indexOf(activeQuarter);

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {quarters.map((item, index) => {
        const isActive = item === activeQuarter;
        const isComplete = index < activeIndex;
        return (
          <div
            key={item}
            className={cn(
              'rounded-2xl border px-2.5 py-2 sm:px-3',
              isActive ? 'border-white/40 bg-white/12 lg:border-white/40 lg:bg-white/12' : 'border-slate-200 bg-white/70 lg:border-white/10 lg:bg-white/5',
            )}
          >
            <div className="flex items-center gap-2">
              {isComplete ? (
                <Check className="h-4 w-4 text-emerald-500 lg:text-emerald-300" />
              ) : (
                <Circle className={cn('h-4 w-4', isActive ? 'text-slate-950 lg:text-white' : 'text-slate-500')} />
              )}
              <span className={cn('text-sm font-semibold', isActive ? 'text-slate-950 lg:text-white' : 'text-slate-500 lg:text-slate-400')}>{item}</span>
            </div>
            <p className={cn('mt-1 text-[10px] uppercase tracking-wide', isActive ? 'text-slate-600 lg:text-slate-300' : 'text-slate-400')}>
              {isComplete ? 'Done' : isActive ? 'Active' : 'Next'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 leading-6 text-slate-700">{value}</dd>
    </div>
  );
}

function BudgetFact({ label, value, isWarning = false }: { label: string; value: string; isWarning?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 font-semibold', isWarning ? 'text-red-700' : 'text-slate-950')}>{value}</p>
    </div>
  );
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}
