"use client";

import { useState, type ReactNode } from "react";
import { previousPlayStep, type PlayStepId } from "@/lib/playSteps";

const control =
  "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium disabled:pointer-events-none disabled:opacity-40";

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
    <div className="flex min-h-screen flex-col bg-[#f2f4f7] text-[#0a0a0a]">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-28 pt-9">
        <h1 className="text-2xl font-medium tracking-tight">{props.title}</h1>
        <div className="mt-8">{props.children}</div>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e6e6e6] bg-[#f2f4f7] px-6 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <button type="button" className={`${control} bg-[#e5e5e5] text-[#0a0a0a]`} onClick={props.onBack} disabled={backDisabled}>
            Back
          </button>
          <div className="flex items-center gap-2">
            {props.step === "final-menu" ? null : (
              <button
                type="button"
                className={`${control} bg-[#141414] text-white`}
                onClick={props.onContinue}
                disabled={!props.canContinue}
              >
                Continue
              </button>
            )}
            <button type="button" className={`${control} text-[#6b6b6b]`} onClick={() => setConfirmQuit(true)}>
              Quit
            </button>
          </div>
        </div>
      </footer>
      {confirmQuit ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0a0a0a]/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quit-simulation-title"
            className="w-full max-w-md rounded-lg border border-[#e6e6e6] bg-white p-5"
          >
            <h2 id="quit-simulation-title" className="text-base font-medium text-[#0a0a0a]">
              Leave this step?
            </h2>
            <p className="mt-2 text-sm text-[#6b6b6b]">Your run stays on this device.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={`${control} bg-[#e5e5e5]`} onClick={() => setConfirmQuit(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${control} bg-[#141414] text-white`}
                onClick={() => {
                  setConfirmQuit(false);
                  props.onQuit();
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
