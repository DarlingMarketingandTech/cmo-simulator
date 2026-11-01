"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { createInitialSimulationContext, simulationMachine, SimulationEvent, HydrationPatch, type SimulationContext } from '@/lib/simMachine';
import { StateFrom } from 'xstate';
import { logger } from '@/lib/logger';
import { PLAY_STEPS, type PlayStepId } from '@/lib/playSteps';
import { getCurrentProgressRouteFromSnapshot, machinePhaseForRoute } from '@/lib/simulationProgress';

type SimulationMachineState = StateFrom<typeof simulationMachine>;

interface SimulationContextValue {
  state: SimulationMachineState;
  send: (event: SimulationEvent) => void;
  isReady: boolean;
}

const SimulationReactContext = createContext<SimulationContextValue | null>(null);

function hasMeaningfulSimulationState(context: Partial<HydrationPatch> | undefined): boolean {
  if (!context || typeof context !== 'object') return false;

  if (context.simulationId || context.scenarioId || context.startedAt) return true;

  const strategy = context.strategy && typeof context.strategy === 'object' ? context.strategy as Record<string, unknown> : {};
  if (typeof strategy.companyName === 'string' && strategy.companyName.trim().length > 0) return true;
  if (typeof strategy.targetAudience === 'string' && strategy.targetAudience.trim().length > 0) return true;
  if (typeof strategy.brandPositioning === 'string' && strategy.brandPositioning.trim().length > 0) return true;
  if (Array.isArray(strategy.primaryChannels) && strategy.primaryChannels.some((channel) => typeof channel === 'string' && channel.trim().length > 0)) return true;
  if (strategy.budgetAllocation && typeof strategy.budgetAllocation === 'object') {
    const allocation = strategy.budgetAllocation as Record<string, unknown>;
    if (Object.values(allocation).some((value) => typeof value === 'number' && value > 0)) return true;
  }

  const quarters = context.quarters && typeof context.quarters === 'object' ? context.quarters as Record<string, unknown> : {};
  for (const quarter of Object.values(quarters)) {
    if (!quarter || typeof quarter !== 'object') continue;
    const q = quarter as Record<string, unknown>;
    if (Array.isArray(q.tactics) && q.tactics.length > 0) return true;
    if (typeof q.budgetSpent === 'number' && q.budgetSpent > 0) return true;
    if (typeof q.timeSpent === 'number' && q.timeSpent > 0) return true;
    const results = q.results && typeof q.results === 'object' ? q.results as Record<string, unknown> : {};
    if (Object.values(results).some((value) => typeof value === 'number' && value !== 0 && value !== 10 && value !== 30 && value !== 70)) return true;
  }

  if (context.kpis && typeof context.kpis === 'object') {
    const kpis = context.kpis as unknown as Record<string, unknown>;
    const kpiValues = Object.values(kpis);
    if (kpiValues.some((value) => typeof value === 'number' && value !== 0 && value !== 10 && value !== 30 && value !== 70)) {
      return true;
    }
  }

  return false;
}

function isKnownPlayStep(value: unknown): value is PlayStepId {
  return typeof value === "string" && (PLAY_STEPS as readonly string[]).includes(value);
}

function isEmptyInitialSetup(context: Partial<HydrationPatch> | undefined): boolean {
  if (!context) return true;
  if (isKnownPlayStep(context.playStep) && context.playStep !== "setup") return false;
  return !hasMeaningfulSimulationState(context);
}

export function hasResumableSavedRun(snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  return !isEmptyInitialSetup(snapshot as Partial<HydrationPatch>);
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [hydratedContext, setHydratedContext] = useState<HydrationPatch>({});
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('cmo-sim-state-v2') : null;
      if (!saved) {
        setHydratedContext({});
        setHydrationError(null);
        return;
      }

      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const normalized = {
          ...parsed,
          strategy: {
            ...(parsed.strategy ?? {}),
          },
          quarters: parsed.quarters ?? createInitialSimulationContext().quarters,
        };
        setHydratedContext(normalized);
        setHydrationError(null);
      } else {
        setHydrationError('Saved simulation state is invalid.');
        setHydratedContext({});
      }
    } catch (e) {
      logger.error('Failed to parse saved simulation state', e);
      setHydrationError('Saved simulation state is corrupted.');
      setHydratedContext({});
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  if (hydrationError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white px-4">
        <div className="w-full max-w-xl p-6 rounded-2xl border border-red-500/30 bg-red-950/20">
          <h2 className="text-xl font-bold mb-3">Saved Session Issue Detected</h2>
          <p className="text-red-100/80 mb-5">{hydrationError}</p>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-400 text-white font-semibold"
            onClick={() => {
              localStorage.removeItem('cmo-sim-state-v2');
              window.location.reload();
            }}
          >
            Reset Local Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <SimulationMachineProvider hydratedContext={hydratedContext} storageLoaded={storageLoaded}>
      {children}
    </SimulationMachineProvider>
  );
}

function SimulationMachineProvider({
  children,
  hydratedContext,
  storageLoaded,
}: {
  children: React.ReactNode;
  hydratedContext: HydrationPatch;
  storageLoaded: boolean;
}) {
  const [state, send] = useMachine(simulationMachine);
  const appliedSnapshot = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!storageLoaded) return;

    const fingerprint = JSON.stringify(hydratedContext);
    if (appliedSnapshot.current === fingerprint) return;
    appliedSnapshot.current = fingerprint;

    if (Object.keys(hydratedContext).length > 0) {
      const route = getCurrentProgressRouteFromSnapshot(hydratedContext as Partial<SimulationContext>);
      send({
        type: 'RESTORE_SIMULATION',
        context: hydratedContext,
        phase: machinePhaseForRoute(route),
      });
    }

    setIsReady(true);
  }, [hydratedContext, send, storageLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isReady) return;

    if (isEmptyInitialSetup(state.context)) {
      window.localStorage.removeItem('cmo-sim-state-v2');
      return;
    }

    window.localStorage.setItem('cmo-sim-state-v2', JSON.stringify(state.context));
  }, [isReady, state.context]);

  return (
    <SimulationReactContext.Provider value={{ state, send, isReady }}>
      {children}
    </SimulationReactContext.Provider>
  );
}

export function useSimulationContext() {
  const context = useContext(SimulationReactContext);
  if (!context) {
    throw new Error('useSimulationContext must be used within a SimulationProvider');
  }
  return context;
}
