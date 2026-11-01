"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { previousPlayStep, type PlayStepId } from "@/lib/playSteps";

export function PlayFrame(props: {
  step: PlayStepId;
  title: string;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  onQuit: () => void;
  children: ReactNode;
}) {
  const backDisabled = previousPlayStep(props.step) === null;
  const [confirmQuit, setConfirmQuit] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{props.title}</h1>
      </header>
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-4 sm:px-6">{props.children}</main>
      <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={props.onBack} disabled={backDisabled}>
            Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {props.step === "final-menu" ? null : (
              <Button type="button" onClick={props.onContinue} disabled={!props.canContinue}>
                Continue
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setConfirmQuit(true)}>
              Quit
            </Button>
          </div>
        </div>
      </footer>
      {confirmQuit ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quit-simulation-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 id="quit-simulation-title" className="text-base font-semibold text-slate-950">
              Leave this step?
            </h2>
            <p className="mt-2 text-sm text-slate-600">Your run stays on this device.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmQuit(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmQuit(false);
                  props.onQuit();
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
