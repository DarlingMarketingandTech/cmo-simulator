'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasResumableSavedRun } from '@/components/simulation/SimulationProvider';
import { useSimulation } from '@/hooks/useSimulation';

const SAVED_RUN_KEY = 'cmo-sim-state-v2';

const STEP_LABELS: Record<string, string> = {
  setup: 'Setup',
  strategy: 'Strategy',
  'q1-plan': 'Q1 plan',
  'q1-review': 'Q1 review',
  'q2-plan': 'Q2 plan',
  'q2-review': 'Q2 review',
  'q3-plan': 'Q3 plan',
  'q3-review': 'Q3 review',
  'q4-plan': 'Q4 plan',
  'q4-review': 'Q4 review',
  'final-menu': 'Final menu',
};

type SavedTactic = { name?: string; cost?: number };
type SavedRun = {
  playStep?: string;
  totalBudget?: number;
  remainingBudget?: number;
  strategy?: { companyName?: string };
  kpis?: { revenue?: number; profit?: number };
  quarters?: Record<string, { tactics?: SavedTactic[]; bigBetMade?: { name?: string }; talentHired?: { name?: string }[] }>;
};

function readSavedRun(): SavedRun | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as SavedRun;
  } catch {
    return null;
  }
}

function money(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const body = Math.abs(rounded).toLocaleString();
  return rounded < 0 ? `-$${body}` : `$${body}`;
}

function quarterKey(step: string | undefined) {
  if (!step) return null;
  const match = step.match(/^q([1-4])/);
  return match ? `Q${match[1]}` : null;
}

function RunLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-[#e6e6e6] py-3">
      <dt className="text-sm text-[#6b6b6b]">{label}</dt>
      <dd className="text-right font-mono text-sm tabular-nums text-[#0a0a0a]">{value}</dd>
    </div>
  );
}

export default function SimulationIndexPage() {
  const router = useRouter();
  const { send } = useSimulation();
  const [saved, setSaved] = useState<SavedRun | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(readSavedRun());
    setReady(true);
  }, []);

  const canResume = ready && hasResumableSavedRun(saved);
  const step = saved?.playStep;
  const stepLabel = step ? STEP_LABELS[step] ?? step : null;
  const company = saved?.strategy?.companyName?.trim() || 'Unnamed company';
  const quarter = quarterKey(step);
  const quarterState = quarter && saved?.quarters ? saved.quarters[quarter] : undefined;
  const tactics = quarterState?.tactics ?? [];
  const moves = tactics.map((tactic) => tactic.name).filter((name): name is string => Boolean(name));
  const quarterSpend = tactics.reduce((sum, tactic) => sum + (tactic.cost || 0), 0);
  const quarterBudget = typeof saved?.totalBudget === 'number' ? Math.floor(saved.totalBudget / 4) : undefined;
  const quarterReserve = typeof quarterBudget === 'number' ? quarterBudget - quarterSpend : undefined;
  const hire = quarterState?.talentHired?.[0]?.name;
  const bet = quarterState?.bigBetMade?.name;
  const figure = quarter ? quarterReserve : saved?.remainingBudget;
  const figureLabel = quarter ? `${quarter} reserve` : 'Reserve';

  const onResume = () => {
    router.push('/sim/play');
  };

  const onStartNew = () => {
    window.localStorage.removeItem(SAVED_RUN_KEY);
    send({ type: 'RESTART_SIMULATION' });
    send({ type: 'SET_PLAY_STEP', playStep: 'setup' });
    setSaved(null);
    router.push('/sim/play');
  };

  return (
    <main className="min-h-screen bg-[#f2f4f7] px-6 py-12 text-[#0a0a0a]">
      <section className="mx-auto w-full max-w-xl">
        <p className="text-sm text-[#6b6b6b]">CMO Simulator</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">
          {canResume ? company : 'No year on this device'}
        </h1>
        {canResume ? (
          <>
            <p className="mt-6 text-sm text-[#6b6b6b]">{figureLabel}</p>
            <p className="mt-2 font-mono text-[30px] font-medium tabular-nums leading-none text-[#1d5fbf]">
              {money(figure)}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#6b6b6b]">
              You left at {stepLabel}. Resume opens that step. Start new clears this run.
            </p>
            <dl className="mt-8">
              <RunLine label="Left at" value={stepLabel ?? '—'} />
              <RunLine label="Year budget" value={money(saved?.totalBudget)} />
              <RunLine label="Year reserve" value={money(saved?.remainingBudget)} />
              <RunLine label="Revenue so far" value={money(saved?.kpis?.revenue)} />
              <RunLine label="Profit so far" value={money(saved?.kpis?.profit)} />
              <RunLine label={quarter ? `${quarter} moves` : 'Moves'} value={moves.length > 0 ? moves.join(', ') : 'None yet'} />
              {hire ? <RunLine label="Hire" value={hire} /> : null}
              {bet ? <RunLine label="Big bet" value={bet} /> : null}
            </dl>
          </>
        ) : (
          <p className="mt-4 max-w-md text-sm leading-6 text-[#6b6b6b]">
            A run is one year: setup, strategy, then four quarters. It stays on this device until you start a new one.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResume}
            disabled={!canResume}
            className="inline-flex h-9 items-center rounded-md bg-[#141414] px-4 text-sm font-medium text-white disabled:opacity-40"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex h-9 items-center rounded-md bg-[#e5e5e5] px-4 text-sm font-medium text-[#0a0a0a]"
          >
            Start new
          </button>
        </div>
      </section>
    </main>
  );
}
