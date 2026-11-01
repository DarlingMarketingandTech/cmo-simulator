'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { hasResumableSavedRun } from '@/components/simulation/SimulationProvider';
import { useSimulation } from '@/hooks/useSimulation';

const SAVED_RUN_KEY = 'cmo-sim-state-v2';

function readSavedRun(): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SimulationIndexPage() {
  const router = useRouter();
  const { send } = useSimulation();
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    setCanResume(hasResumableSavedRun(readSavedRun()));
  }, []);

  const onResume = () => {
    router.push('/sim/play');
  };

  const onStartNew = () => {
    window.localStorage.removeItem(SAVED_RUN_KEY);
    send({ type: 'RESTART_SIMULATION' });
    send({ type: 'SET_PLAY_STEP', playStep: 'setup' });
    setCanResume(false);
    router.push('/sim/play');
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CMO Simulator</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Home</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Start a new run, or resume the run saved on this device.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" onClick={onResume} disabled={!canResume}>
          Resume
        </Button>
        <Button type="button" variant="outline" onClick={onStartNew}>
          Start new
        </Button>
      </div>
    </section>
  );
}
