import { createMachine, assign } from 'xstate';
import { TalentCandidate, BigBetOption, calculateTalentImpact } from './talentMarket';

import { runSimulationTick, initializeSimulationState } from '../engine';
import { SimulationState, Channel, PlayerInput, MarketConditions } from '../types/engine';
import type { TimeHorizon, MarketLandscape, Industry, DifficultyLevel } from '@/types';
import { mergeSimulationContext } from "@/lib/simulationHydration";
import type { PlayStepId } from "@/lib/playSteps";
import { buildQuarterMarketConditions } from "@/lib/marketConditions";
import type {
  SimulationKpiSnapshot,
  SimulationMachineGrade,
} from "@/lib/simulationContracts";

// Types for simulation context and events
export interface SimulationContext {
  playStep: PlayStepId;
  // Simulation metadata
  simulationId?: string;
  startedAt?: Date;
  scenarioId?: string;

  // Strategic decisions
  strategy: {
    companyName?: string;
    guidedDemo?: boolean;
    industry?: Industry;
    logoStyle?: 'orb' | 'badge' | 'monogram';
    targetAudience?: string;
    brandPositioning?: string;
    primaryChannels?: string[];
    budgetAllocation?: Record<string, number>;
    marketLandscape?: MarketLandscape;
    timeHorizon?: TimeHorizon;
    /** Runtime simulation tuning (`runSimulationTick`). Persisted with saves; omitted → intermediate in engine. */
    difficulty?: DifficultyLevel;
  };

  // Quarterly data
  quarters: {
    Q1: QuarterData;
    Q2: QuarterData;
    Q3: QuarterData;
    Q4: QuarterData;
  };

  // Overall simulation metrics
  totalBudget: number;
  remainingBudget: number;

  // KPIs tracking (cumulative revenue/profit; other fields mirror latest quarter — see processQuarterAdvance)
  kpis: SimulationKpiSnapshot;

  // Wildcard events
  wildcards: WildcardEvent[];

  // Talent and Big Bets
  hiredTalent: TalentCandidate[];
  selectedBigBet?: BigBetOption;
  bigBetOutcome?: BigBetOutcome;

  // Enhanced KPIs
  morale: number;
  brandEquity: number;

  // Simulation results
  finalResults?: SimulationResults;


  // NEW: Advanced Simulation Engine State
  engineState: SimulationState;
}

export interface QuarterData {
  tactics: Tactic[];
  budgetSpent: number;
  timeSpent: number;
  wildcardEvents: WildcardEvent[];
  talentHired?: TalentCandidate[];
  bigBetMade?: BigBetOption;
  results: SimulationKpiSnapshot;
}

export interface Tactic {
  id: string;
  name: string;
  description?: string;
  category: 'digital' | 'traditional' | 'content' | 'events' | 'partnerships';
  cost: number;
  timeRequired: number;
  expectedImpact: {
    revenue: number;
    marketShare: number;
    customerSatisfaction: number;
    brandAwareness: number;
  };
}

export interface WildcardEvent {
  id: string;
  type: 'opportunity' | 'crisis' | 'market_shift' | 'competitor_action';
  title: string;
  description: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  moraleImpact?: {
    base: number;
    choiceModifiers: Record<string, number>;
  };
  brandEquityImpact?: {
    base: number;
    choiceModifiers: Record<string, number>;
  };
  teamMoraleDescription?: string;
  choices: WildcardChoice[];
  selectedChoice?: string;
  impact?: {
    revenue: number;
    profit: number;
    marketShare?: number;
    customerSatisfaction?: number;
    brandAwareness?: number;
    morale?: number;
    brandEquity?: number;
  };
  triggeredInQuarter?: string;
  chosenResponse?: string;
}

export interface BigBetOutcome {
  success: boolean;
  actualImpact: {
    revenue: number;
    marketShare: number;
    brandAwareness: number;
    customerSatisfaction: number;
  };
}

export interface WildcardChoice {
  id: string;
  title: string;
  description: string;
  cost: number;
  timeRequired: number;
  impact: {
    revenue: number;
    profit: number;
    marketShare: number;
    customerSatisfaction: number;
    brandAwareness: number;
  };
}

export interface SimulationResults {
  finalKPIs: SimulationKpiSnapshot;
  quarterlyBreakdown: Record<string, QuarterData>;
  strategicDecisions: unknown[];
  wildcardEvents: WildcardEvent[];
  recommendations: string[];
  score: number;
  grade: SimulationMachineGrade;
}

export type HydrationPatch =
  Omit<Partial<SimulationContext>, "startedAt" | "engineState"> & {
    startedAt?: Date | string;
    engineState?: unknown;
  };

// Event types
export type SimulationEvent =
  | { type: 'HYDRATE_CONTEXT'; context: HydrationPatch }
  | {
      type: 'RESTORE_SIMULATION';
      context: HydrationPatch;
      phase: 'idle' | 'strategySession' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'debrief';
    }
  | { type: 'START_SIMULATION' }
  | { type: 'SET_STRATEGY'; strategy: Partial<SimulationContext['strategy']> }
  | { type: 'COMPLETE_STRATEGY_SESSION' }
  | { type: 'START_QUARTER'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' }
  | { type: 'ADD_TACTIC'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; tactic: Tactic }
  | { type: 'REMOVE_TACTIC'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; tacticId: string }
  | { type: 'ALLOCATE_BUDGET'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; amount: number }
  | { type: 'ALLOCATE_TIME'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; hours: number }
  | { type: 'TRIGGER_WILDCARD'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; wildcard: WildcardEvent }
  | { type: 'RESPOND_TO_WILDCARD'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; wildcardId: string; choiceId: string }
  | {
      type: 'APPLY_WILDCARD_IMPACT';
      quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
      wildcardId: string;
      choiceId: string;
      impact: {
        revenue: number;
        profit: number;
        marketShare?: number;
        customerSatisfaction?: number;
        brandAwareness?: number;
        morale?: number;
        brandEquity?: number;
      };
    }
  | { type: 'MAKE_BIG_BET'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; bigBet: BigBetOption; outcome: BigBetOutcome }
  | { type: 'COMPLETE_QUARTER'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' }
  | { type: 'CALCULATE_RESULTS' }
  | { type: 'COMPLETE_DEBRIEF' }
  | { type: 'SET_PLAY_STEP'; playStep: PlayStepId }
  | { type: 'HIRE_TALENT'; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; candidate: TalentCandidate }
  | { type: 'RESTART_SIMULATION' }
  | { type: 'SAVE_SIMULATION' };

// Initial context
const initialContext: SimulationContext = {
  playStep: "setup",
  strategy: {},
  quarters: {
    Q1: {
      tactics: [],
      budgetSpent: 0,
      timeSpent: 0,
      wildcardEvents: [],
      results: {
        revenue: 0,
        profit: 0,
        marketShare: 10,
        customerSatisfaction: 70,
        brandAwareness: 30,
      },
    },
    Q2: {
      tactics: [],
      budgetSpent: 0,
      timeSpent: 0,
      wildcardEvents: [],
      results: {
        revenue: 0,
        profit: 0,
        marketShare: 10,
        customerSatisfaction: 70,
        brandAwareness: 30,
      },
    },
    Q3: {
      tactics: [],
      budgetSpent: 0,
      timeSpent: 0,
      wildcardEvents: [],
      results: {
        revenue: 0,
        profit: 0,
        marketShare: 10,
        customerSatisfaction: 70,
        brandAwareness: 30,
      },
    },
    Q4: {
      tactics: [],
      budgetSpent: 0,
      timeSpent: 0,
      wildcardEvents: [],
      results: {
        revenue: 0,
        profit: 0,
        marketShare: 10,
        customerSatisfaction: 70,
        brandAwareness: 30,
      },
    },
  },
  totalBudget: 2000000,
  remainingBudget: 2000000,
  kpis: {
    revenue: 0,
    profit: 0,
    marketShare: 10,
    customerSatisfaction: 70,
    brandAwareness: 30,
  },
  wildcards: [],
  hiredTalent: [],
  morale: 75,
  brandEquity: 50,
  engineState: initializeSimulationState({ industry: "healthcare" }),
};

export function createInitialSimulationContext(): SimulationContext {
  // We want a fresh object per run to avoid accidental cross-run mutation.
  // `structuredClone` exists in modern browsers + Node; fallback is safe for our plain data.
  try {
    return structuredClone(initialContext);
  } catch {
    return JSON.parse(JSON.stringify(initialContext)) as SimulationContext;
  }
}

// Simulation state machine
export const simulationMachine = createMachine({
  id: 'cmoSimulation',
  initial: 'idle',
  context: initialContext,
  on: {
    HYDRATE_CONTEXT: {
      actions: assign(({ context, event }) =>
        event.type === "HYDRATE_CONTEXT" ? mergeSimulationContext(context, event.context) : {},
      ),
    },
    SET_PLAY_STEP: {
      actions: assign({
        playStep: ({ event }) => event.playStep,
      }),
    },
    ADD_TACTIC: {
      actions: assign(({ context, event }) => {
        if (event.type !== "ADD_TACTIC") return {};
        const quarter = event.quarter as "Q1" | "Q2" | "Q3" | "Q4";
        const existing = context.quarters[quarter].tactics;
        if (existing.some((item) => item.id === event.tactic.id)) return {};
        return {
          quarters: {
            ...context.quarters,
            [quarter]: {
              ...context.quarters[quarter],
              tactics: [...existing, event.tactic],
            },
          },
          remainingBudget: context.remainingBudget - (event.tactic.cost || 0),
        };
      }),
    },
    REMOVE_TACTIC: {
      actions: assign(({ context, event }) => {
        if (event.type !== "REMOVE_TACTIC") return {};
        const quarter = event.quarter as "Q1" | "Q2" | "Q3" | "Q4";
        const existing = context.quarters[quarter].tactics;
        const removed = existing.find((item) => item.id === event.tacticId);
        if (!removed) return {};
        return {
          quarters: {
            ...context.quarters,
            [quarter]: {
              ...context.quarters[quarter],
              tactics: existing.filter((item) => item.id !== event.tacticId),
            },
          },
          remainingBudget: context.remainingBudget + (removed.cost || 0),
        };
      }),
    },
    HIRE_TALENT: {
      actions: assign(({ context, event }) => {
        if (event.type !== "HIRE_TALENT") return {};
        const candidate = event.candidate;
        const hire = (quarter: "Q1" | "Q2" | "Q3" | "Q4") => ({
          ...context.quarters[quarter],
          talentHired: [...(context.quarters[quarter].talentHired ?? []), candidate],
        });
        return {
          hiredTalent: [...context.hiredTalent, candidate],
          quarters: {
            ...context.quarters,
            ...(event.quarter === "Q1" ? { Q1: hire("Q1") } : null),
            ...(event.quarter === "Q2" ? { Q2: hire("Q2") } : null),
            ...(event.quarter === "Q3" ? { Q3: hire("Q3") } : null),
            ...(event.quarter === "Q4" ? { Q4: hire("Q4") } : null),
          },
        };
      }),
    },
    RESTART_SIMULATION: {
      target: ".idle",
      actions: assign(() => createInitialSimulationContext()),
    },
  },
  states: {
    idle: {
      on: {
        HYDRATE_CONTEXT: {
          actions: assign(({ context, event }) =>
            event.type === "HYDRATE_CONTEXT" ? mergeSimulationContext(context, event.context) : {},
          ),
        },
        RESTORE_SIMULATION: [
          {
            guard: ({ event }) => event.phase === "strategySession",
            target: "strategySession",
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
          {
            guard: ({ event }) => event.phase === "Q1",
            target: "Q1",
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
          {
            guard: ({ event }) => event.phase === "Q2",
            target: "Q2",
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
          {
            guard: ({ event }) => event.phase === "Q3",
            target: "Q3",
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
          {
            guard: ({ event }) => event.phase === "Q4",
            target: "Q4",
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
          {
            guard: ({ event }) => event.phase === "debrief",
            target: "debrief",
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
          {
            actions: assign(({ context, event }) => mergeSimulationContext(context, event.context)),
          },
        ],
        START_SIMULATION: {
          target: 'strategySession',
          actions: assign({
            startedAt: () => new Date(),
          }),
        },
      },
    },

    strategySession: {
      on: {
        SET_STRATEGY: {
          actions: assign({
            strategy: ({ context, event }) => ({
              ...context.strategy,
              ...event.strategy,
            }),
          }),
        },
        COMPLETE_STRATEGY_SESSION: {
          target: 'Q1',
          guard: ({ context }) => {
            // Ensure minimum strategy requirements are met
            return !!(
              context.strategy.targetAudience &&
              context.strategy.brandPositioning &&
              context.strategy.primaryChannels?.length
            );
          },
        },
      },
    },

    Q1: {
      on: {
        ADD_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q1',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q1: {
                ...context.quarters.Q1,
                tactics: [...context.quarters.Q1.tactics, event.tactic],
              },
            }),
            remainingBudget: ({ context, event }) =>
              context.remainingBudget - event.tactic.cost,
          }),
        },
        REMOVE_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q1',
          actions: assign({
            quarters: ({ context, event }) => {
              return {
                ...context.quarters,
                Q1: {
                  ...context.quarters.Q1,
                  tactics: context.quarters.Q1.tactics.filter(t => t.id !== event.tacticId),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const tactic = context.quarters.Q1.tactics.find(t => t.id === event.tacticId);
              return context.remainingBudget + (tactic?.cost || 0);
            },
          }),
        },
        TRIGGER_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q1',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q1: {
                ...context.quarters.Q1,
                wildcardEvents: [
                  ...context.quarters.Q1.wildcardEvents,
                  { ...event.wildcard, triggeredInQuarter: 'Q1' },
                ],
              },
            }),
          }),
        },
        RESPOND_TO_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q1',
          actions: assign({
            quarters: ({ context, event }) => {
              const wildcard = context.quarters.Q1.wildcardEvents.find(w => w.id === event.wildcardId);
              if (!wildcard) return context.quarters;

              const choice = wildcard.choices.find(c => c.id === event.choiceId);
              if (!choice) return context.quarters;

              return {
                ...context.quarters,
                Q1: {
                  ...context.quarters.Q1,
                  wildcardEvents: context.quarters.Q1.wildcardEvents.map(w =>
                    w.id === event.wildcardId
                      ? { ...w, selectedChoice: event.choiceId, chosenResponse: event.choiceId }
                      : w
                  ),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const wildcard = context.quarters.Q1.wildcardEvents.find(w => w.id === event.wildcardId);
              const choice = wildcard?.choices.find(c => c.id === event.choiceId);
              return context.remainingBudget - (choice?.cost || 0);
            },
          }),
        },
        APPLY_WILDCARD_IMPACT: {
          guard: ({ event }) => event.quarter === 'Q1',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q1: {
                ...context.quarters.Q1,
                wildcardEvents: context.quarters.Q1.wildcardEvents.map(w =>
                  w.id === event.wildcardId
                    ? { ...w, selectedChoice: event.choiceId, impact: event.impact }
                    : w
                ),
              },
            }),
            morale: ({ context, event }) =>
              Math.max(0, Math.min(100, context.morale + (event.impact.morale || 0))),
            brandEquity: ({ context, event }) =>
              Math.max(0, Math.min(100, context.brandEquity + (event.impact.brandEquity || 0))),
          }),
        },
        COMPLETE_QUARTER: {
          target: 'Q2',
          guard: ({ event }) => event.quarter === 'Q1',
          actions: assign(({ context }) => {
            const { newQuarterData, newKpis, newEngineState } = processQuarterAdvance(context, 'Q1');
            return {
              quarters: { ...context.quarters, Q1: newQuarterData },
              kpis: newKpis,
              engineState: newEngineState
            };
          }),
        },
      },
    },

    Q2: {
      on: {
        ADD_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q2',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q2: {
                ...context.quarters.Q2,
                tactics: [...context.quarters.Q2.tactics, event.tactic],
              },
            }),
            remainingBudget: ({ context, event }) =>
              context.remainingBudget - event.tactic.cost,
          }),
        },
        REMOVE_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q2',
          actions: assign({
            quarters: ({ context, event }) => {
              return {
                ...context.quarters,
                Q2: {
                  ...context.quarters.Q2,
                  tactics: context.quarters.Q2.tactics.filter(t => t.id !== event.tacticId),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const tactic = context.quarters.Q2.tactics.find(t => t.id === event.tacticId);
              return context.remainingBudget + (tactic?.cost || 0);
            },
          }),
        },
        TRIGGER_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q2',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q2: {
                ...context.quarters.Q2,
                wildcardEvents: [
                  ...context.quarters.Q2.wildcardEvents,
                  { ...event.wildcard, triggeredInQuarter: 'Q2' },
                ],
              },
            }),
          }),
        },
        RESPOND_TO_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q2',
          actions: assign({
            quarters: ({ context, event }) => {
              const wildcard = context.quarters.Q2.wildcardEvents.find(w => w.id === event.wildcardId);
              if (!wildcard) return context.quarters;

              const choice = wildcard.choices.find(c => c.id === event.choiceId);
              if (!choice) return context.quarters;

              return {
                ...context.quarters,
                Q2: {
                  ...context.quarters.Q2,
                  wildcardEvents: context.quarters.Q2.wildcardEvents.map(w =>
                    w.id === event.wildcardId
                      ? { ...w, selectedChoice: event.choiceId, chosenResponse: event.choiceId }
                      : w
                  ),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const wildcard = context.quarters.Q2.wildcardEvents.find(w => w.id === event.wildcardId);
              const choice = wildcard?.choices.find(c => c.id === event.choiceId);
              return context.remainingBudget - (choice?.cost || 0);
            },
          }),
        },
        APPLY_WILDCARD_IMPACT: {
          guard: ({ event }) => event.quarter === 'Q2',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q2: {
                ...context.quarters.Q2,
                wildcardEvents: context.quarters.Q2.wildcardEvents.map(w =>
                  w.id === event.wildcardId
                    ? { ...w, selectedChoice: event.choiceId, impact: event.impact }
                    : w
                ),
              },
            }),
            morale: ({ context, event }) =>
              Math.max(0, Math.min(100, context.morale + (event.impact.morale || 0))),
            brandEquity: ({ context, event }) =>
              Math.max(0, Math.min(100, context.brandEquity + (event.impact.brandEquity || 0))),
          }),
        },
        COMPLETE_QUARTER: {
          target: 'Q3',
          guard: ({ event }) => event.quarter === 'Q2',
          actions: assign(({ context }) => {
            const { newQuarterData, newKpis, newEngineState } = processQuarterAdvance(context, 'Q2');
            return {
              quarters: { ...context.quarters, Q2: newQuarterData },
              kpis: newKpis,
              engineState: newEngineState
            };
          }),
        },
      },
    },

    Q3: {
      on: {
        ADD_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q3: {
                ...context.quarters.Q3,
                tactics: [...context.quarters.Q3.tactics, event.tactic],
              },
            }),
            remainingBudget: ({ context, event }) =>
              context.remainingBudget - event.tactic.cost,
          }),
        },
        REMOVE_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign({
            quarters: ({ context, event }) => {
              return {
                ...context.quarters,
                Q3: {
                  ...context.quarters.Q3,
                  tactics: context.quarters.Q3.tactics.filter(t => t.id !== event.tacticId),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const tactic = context.quarters.Q3.tactics.find(t => t.id === event.tacticId);
              return context.remainingBudget + (tactic?.cost || 0);
            },
          }),
        },
        TRIGGER_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q3: {
                ...context.quarters.Q3,
                wildcardEvents: [
                  ...context.quarters.Q3.wildcardEvents,
                  { ...event.wildcard, triggeredInQuarter: 'Q3' },
                ],
              },
            }),
          }),
        },
        RESPOND_TO_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign({
            quarters: ({ context, event }) => {
              const wildcard = context.quarters.Q3.wildcardEvents.find(w => w.id === event.wildcardId);
              if (!wildcard) return context.quarters;

              const choice = wildcard.choices.find(c => c.id === event.choiceId);
              if (!choice) return context.quarters;

              return {
                ...context.quarters,
                Q3: {
                  ...context.quarters.Q3,
                  wildcardEvents: context.quarters.Q3.wildcardEvents.map(w =>
                    w.id === event.wildcardId
                      ? { ...w, selectedChoice: event.choiceId, chosenResponse: event.choiceId }
                      : w
                  ),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const wildcard = context.quarters.Q3.wildcardEvents.find(w => w.id === event.wildcardId);
              const choice = wildcard?.choices.find(c => c.id === event.choiceId);
              return context.remainingBudget - (choice?.cost || 0);
            },
          }),
        },
        APPLY_WILDCARD_IMPACT: {
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q3: {
                ...context.quarters.Q3,
                wildcardEvents: context.quarters.Q3.wildcardEvents.map(w =>
                  w.id === event.wildcardId
                    ? { ...w, selectedChoice: event.choiceId, impact: event.impact }
                    : w
                ),
              },
            }),
            morale: ({ context, event }) =>
              Math.max(0, Math.min(100, context.morale + (event.impact.morale || 0))),
            brandEquity: ({ context, event }) =>
              Math.max(0, Math.min(100, context.brandEquity + (event.impact.brandEquity || 0))),
          }),
        },
        MAKE_BIG_BET: {
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign({
            selectedBigBet: ({ event }) => event.bigBet,
            bigBetOutcome: ({ event }) => event.outcome,
            remainingBudget: ({ context, event }) => context.remainingBudget - event.bigBet.cost,
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q3: {
                ...context.quarters.Q3,
                bigBetMade: event.bigBet
              }
            })
          })
        },
        COMPLETE_QUARTER: {
          target: 'Q4',
          guard: ({ event }) => event.quarter === 'Q3',
          actions: assign(({ context }) => {
            const { newQuarterData, newKpis, newEngineState } = processQuarterAdvance(context, 'Q3');
            return {
              quarters: { ...context.quarters, Q3: newQuarterData },
              kpis: newKpis,
              engineState: newEngineState
            };
          }),
        },
      },
    },

    Q4: {
      on: {
        ADD_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q4: {
                ...context.quarters.Q4,
                tactics: [...context.quarters.Q4.tactics, event.tactic],
              },
            }),
            remainingBudget: ({ context, event }) =>
              context.remainingBudget - event.tactic.cost,
          }),
        },
        REMOVE_TACTIC: {
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign({
            quarters: ({ context, event }) => {
              return {
                ...context.quarters,
                Q4: {
                  ...context.quarters.Q4,
                  tactics: context.quarters.Q4.tactics.filter(t => t.id !== event.tacticId),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const tactic = context.quarters.Q4.tactics.find(t => t.id === event.tacticId);
              return context.remainingBudget + (tactic?.cost || 0);
            },
          }),
        },
        TRIGGER_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q4: {
                ...context.quarters.Q4,
                wildcardEvents: [
                  ...context.quarters.Q4.wildcardEvents,
                  { ...event.wildcard, triggeredInQuarter: 'Q4' },
                ],
              },
            }),
          }),
        },
        RESPOND_TO_WILDCARD: {
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign({
            quarters: ({ context, event }) => {
              const wildcard = context.quarters.Q4.wildcardEvents.find(w => w.id === event.wildcardId);
              if (!wildcard) return context.quarters;

              const choice = wildcard.choices.find(c => c.id === event.choiceId);
              if (!choice) return context.quarters;

              return {
                ...context.quarters,
                Q4: {
                  ...context.quarters.Q4,
                  wildcardEvents: context.quarters.Q4.wildcardEvents.map(w =>
                    w.id === event.wildcardId
                      ? { ...w, selectedChoice: event.choiceId, chosenResponse: event.choiceId }
                      : w
                  ),
                },
              };
            },
            remainingBudget: ({ context, event }) => {
              const wildcard = context.quarters.Q4.wildcardEvents.find(w => w.id === event.wildcardId);
              const choice = wildcard?.choices.find(c => c.id === event.choiceId);
              return context.remainingBudget - (choice?.cost || 0);
            },
          }),
        },
        APPLY_WILDCARD_IMPACT: {
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign({
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q4: {
                ...context.quarters.Q4,
                wildcardEvents: context.quarters.Q4.wildcardEvents.map(w =>
                  w.id === event.wildcardId
                    ? { ...w, selectedChoice: event.choiceId, impact: event.impact }
                    : w
                ),
              },
            }),
            morale: ({ context, event }) =>
              Math.max(0, Math.min(100, context.morale + (event.impact.morale || 0))),
            brandEquity: ({ context, event }) =>
              Math.max(0, Math.min(100, context.brandEquity + (event.impact.brandEquity || 0))),
          }),
        },
        MAKE_BIG_BET: {
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign({
            selectedBigBet: ({ event }) => event.bigBet,
            bigBetOutcome: ({ event }) => event.outcome,
            remainingBudget: ({ context, event }) => context.remainingBudget - event.bigBet.cost,
            quarters: ({ context, event }) => ({
              ...context.quarters,
              Q4: {
                ...context.quarters.Q4,
                bigBetMade: event.bigBet
              }
            })
          })
        },
        COMPLETE_QUARTER: {
          target: 'debrief',
          guard: ({ event }) => event.quarter === 'Q4',
          actions: assign(({ context }) => {
            const { newQuarterData, newKpis, newEngineState } = processQuarterAdvance(context, 'Q4');
            return {
              quarters: { ...context.quarters, Q4: newQuarterData },
              kpis: newKpis,
              engineState: newEngineState
            };
          }),
        },
      },
    },

    debrief: {
      entry: assign({
        finalResults: ({ context }) => calculateFinalResults(context),
      }),
      on: {
        COMPLETE_DEBRIEF: {
          target: 'completed',
        },
        SAVE_SIMULATION: {
          // Persistence lives outside XState: quarter routes / debrief call `saveSimulationSnapshot` → POST `/api/simulations/save`.
          actions: () => {},
        },
      },
    },

    completed: {
      on: {
        RESTART_SIMULATION: {
          target: 'idle',
          actions: assign(() => createInitialSimulationContext()),
        },
      },
    },
  },
});

// Mapping Tactic categories to Engine Channels
const categoryToChannelMap: Record<string, Channel[]> = {
  digital: ['digital', 'social', 'seo'],
  content: ['seo', 'pr', 'digital'],
  traditional: ['tv', 'radio', 'print'],
  events: ['events', 'pr'],
  partnerships: ['pr', 'digital'],
};

function allocationShare(allocation: Record<string, number> | undefined, key: string, fallbackKey?: string): number {
  const primary = allocation?.[key];
  const fallback = fallbackKey ? allocation?.[fallbackKey] : undefined;
  const value = typeof primary === "number" ? primary : typeof fallback === "number" ? fallback : 0;
  return value > 0 ? value : 0;
}

/** Balanced 1/3 splits stay at 1. A heavier share raises that category's channel yield. */
function budgetPostureMultiplier(category: string, allocation: Record<string, number> | undefined): number {
  const brand = allocationShare(allocation, "brandAwareness");
  const demand = allocationShare(allocation, "leadGeneration");
  const conversion = allocationShare(allocation, "conversionOptimization", "customerRetention");
  const total = brand + demand + conversion;
  if (total <= 0) return 1;
  const share =
    category === "traditional" || category === "content"
      ? brand / total
      : category === "events"
        ? conversion / total
        : demand / total;
  return 0.7 + share * 0.9;
}

// Helper functions for calculations
export function processQuarterAdvance(
  context: SimulationContext,
  quarterKey: 'Q1' | 'Q2' | 'Q3' | 'Q4'
): { 
  newEngineState: SimulationState;
  newQuarterData: QuarterData;
  newKpis: SimulationContext['kpis'];
} {
  const quarter = context.quarters[quarterKey];
  const oldEngineState = context.engineState;
  const currentKPIs = context.kpis;

  // 1. Map Tactics to Engine Inputs (Channel Budgets)
  const channelBudgets: Record<Channel, number> = {
    tv: 0, radio: 0, print: 0, digital: 0, social: 0, seo: 0, events: 0, pr: 0
  };
  let totalSpend = 0;
  
  quarter.tactics.forEach(tactic => {
    totalSpend += tactic.cost;
    const mappedChannels = categoryToChannelMap[tactic.category] || ['digital'];
    const amountPerChannel = (tactic.cost * budgetPostureMultiplier(tactic.category, context.strategy.budgetAllocation)) / mappedChannels.length;
    mappedChannels.forEach(c => {
      channelBudgets[c as Channel] += amountPerChannel;
    });
  });

  const playerInputs: PlayerInput = {
    channelBudgets,
    promotions: []
  };

  // 2. Generate Market Conditions (scenario + industry + quarter driven; deterministic)
  const marketConditions: MarketConditions = buildQuarterMarketConditions({
    scenarioId: context.scenarioId,
    quarter: quarterKey,
    industry: context.strategy.industry ?? oldEngineState.industry,
    marketLandscape: context.strategy.marketLandscape,
    previous: oldEngineState.marketConditions,
  });

  // 3. Run Simulation Tick (calculates Adstock, Synergy, Hill Transform)
  const difficulty = context.strategy.difficulty ?? 'intermediate';
  const newEngineState = runSimulationTick(
    { ...oldEngineState, industry: context.strategy.industry ?? oldEngineState.industry },
    playerInputs,
    marketConditions,
    {
      difficulty,
      targetAudience: context.strategy.targetAudience,
      quarterTacticIds: quarter.tactics.map((t) => t.id),
    },
  );

  // 4. Calculate Wildcard Impacts
  let wildcardRevenueImpact = 0;
  let wildcardProfitImpact = 0;
  let wildcardMarketShareImpact = 0;
  let wildcardCustomerSatisfactionImpact = 0;
  let wildcardBrandAwarenessImpact = 0;

  quarter.wildcardEvents.forEach(wildcard => {
    if (wildcard.impact) {
      wildcardRevenueImpact += wildcard.impact.revenue || 0;
      wildcardProfitImpact += wildcard.impact.profit || 0;
      wildcardMarketShareImpact += wildcard.impact?.marketShare || 0;
      wildcardCustomerSatisfactionImpact += wildcard.impact?.customerSatisfaction || 0;
      wildcardBrandAwarenessImpact += wildcard.impact?.brandAwareness || 0;
    }
  });

  let tacticAwarenessImpact = 0;
  let tacticSatisfactionImpact = 0;
  let tacticMarketShareImpact = 0;

  quarter.tactics.forEach(tactic => {
    tacticAwarenessImpact += tactic.expectedImpact.brandAwareness || 0;
    tacticSatisfactionImpact += tactic.expectedImpact.customerSatisfaction || 0;
    tacticMarketShareImpact += tactic.expectedImpact.marketShare || 0;
  });

  // 5. Map Engine Output back to simple KPIs
  // The engine returns revenue (incrementalSales). We use that to boost our game KPIs.
  const engineRevenue = newEngineState.results.incrementalSales + wildcardRevenueImpact;
  const hiredThisQuarter = quarter.talentHired ?? [];
  const talentRevenue = hiredThisQuarter.reduce(
    (sum, candidate) => sum + calculateTalentImpact(candidate, Math.max(0, engineRevenue)),
    0,
  );
  const talentCost = hiredThisQuarter.reduce((sum, candidate) => sum + (candidate.hiringCost || 0), 0);
  const betImpact = quarter.bigBetMade && context.bigBetOutcome ? context.bigBetOutcome.actualImpact : null;
  const betRevenue = betImpact?.revenue ?? 0;
  const betCost = quarter.bigBetMade?.cost ?? 0;
  const finalRevenue = engineRevenue + talentRevenue + betRevenue;
  const finalProfit = engineRevenue - totalSpend + wildcardProfitImpact + talentRevenue + betRevenue - talentCost - betCost;

  // Use the engine's realistic traffic and synergy to boost the secondary KPIs
  const totalSynergyBonus = Object.values(newEngineState.results.channelRoi).reduce((a, b) => a + b, 0) > 0 ? 1.1 : 1.0; 
  
  const marketShareEffectiveness = 1 - (currentKPIs.marketShare / 100) * 0.5;
  const marketShareHeadroom = Math.max(0.28, 1 - currentKPIs.marketShare / 100);
  const adjustedMarketShareDelta =
    tacticMarketShareImpact * marketShareEffectiveness * totalSynergyBonus * marketShareHeadroom;

  const satisfactionHeadroom = Math.max(0.25, 1 - currentKPIs.customerSatisfaction / 100);
  const adjustedSatisfactionDelta = tacticSatisfactionImpact * 0.8 * satisfactionHeadroom;

  const newMarketShare = Math.max(
    0,
    Math.min(100, currentKPIs.marketShare + adjustedMarketShareDelta + wildcardMarketShareImpact + (betImpact?.marketShare ?? 0)),
  );
  const newCustSat = Math.max(
    0,
    Math.min(100, currentKPIs.customerSatisfaction + adjustedSatisfactionDelta + wildcardCustomerSatisfactionImpact + (betImpact?.customerSatisfaction ?? 0)),
  );
  
  // Brand awareness naturally maps to Adstock!
  // Summing the active adstock pool to boost brand awareness
  const totalAdstock = Object.values(newEngineState.adstock).reduce((a, b) => a + b, 0);
  const matchedAdstockBonus = totalAdstock > 100000 ? 3 : 0;
  const awarenessHeadroom = Math.max(0.22, 1 - currentKPIs.brandAwareness / 100);
  const adjustedAwarenessDelta = tacticAwarenessImpact * 0.75 * awarenessHeadroom;

  const newBrandAwareness = Math.max(
    0,
    Math.min(
      100,
      currentKPIs.brandAwareness + adjustedAwarenessDelta + matchedAdstockBonus + wildcardBrandAwarenessImpact + (betImpact?.brandAwareness ?? 0),
    ),
  );

  const newQuarterData: QuarterData = {
    ...quarter,
    results: {
      revenue: finalRevenue,
      profit: finalProfit,
      marketShare: newMarketShare,
      customerSatisfaction: newCustSat,
      brandAwareness: newBrandAwareness
    }
  };

  const newKpis = {
    revenue: currentKPIs.revenue + finalRevenue, // Cumulative
    profit: currentKPIs.profit + finalProfit,    // Cumulative
    marketShare: newMarketShare,                 // Absolute
    customerSatisfaction: newCustSat,            // Absolute
    brandAwareness: newBrandAwareness            // Absolute
  };

  return { newEngineState, newQuarterData, newKpis };
}

function calculateFinalResults(context: SimulationContext): SimulationResults {
  const allWildcards = [
    ...context.quarters.Q1.wildcardEvents,
    ...context.quarters.Q2.wildcardEvents,
    ...context.quarters.Q3.wildcardEvents,
    ...context.quarters.Q4.wildcardEvents,
  ];

  // Calculate overall score based on KPIs
  const score = Math.round(
    (context.kpis.revenue / 1000000) * 25 + // Revenue weight: 25%
    (context.kpis.marketShare) * 0.25 + // Market share weight: 25%
    (context.kpis.customerSatisfaction) * 0.25 + // Customer satisfaction weight: 25%
    (context.kpis.brandAwareness) * 0.25 // Brand awareness weight: 25%
  );

  let grade: SimulationMachineGrade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  // Generate recommendations based on performance
  const recommendations = generateRecommendations(context);

  return {
    finalKPIs: context.kpis,
    quarterlyBreakdown: context.quarters,
    strategicDecisions: [context.strategy],
    wildcardEvents: allWildcards,
    recommendations,
    score,
    grade,
  };
}

function generateRecommendations(context: SimulationContext): string[] {
  const recommendations: string[] = [];

  if (context.kpis.revenue < 500000) {
    recommendations.push("Focus on revenue-generating tactics like digital advertising and partnerships.");
  }

  if (context.kpis.marketShare < 15) {
    recommendations.push("Increase market share through competitive pricing and brand differentiation.");
  }

  if (context.kpis.customerSatisfaction < 70) {
    recommendations.push("Invest in customer experience improvements and support initiatives.");
  }

  if (context.kpis.brandAwareness < 40) {
    recommendations.push("Boost brand awareness through content marketing and social media campaigns.");
  }

  if (context.remainingBudget > context.totalBudget * 0.2) {
    recommendations.push("You left significant budget unused. Consider more aggressive marketing investments.");
  }

  return recommendations;
}
