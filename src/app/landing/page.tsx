"use client";

import Link from "next/link";
import { MobileInstallPrompt } from "@/components/simulation/MobileInstallPrompt";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f2f4f7] px-6 py-20 text-[#0a0a0a]">
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-[#6b6b6b]">CMO Simulator</p>
        <h1 className="mt-4 max-w-xl text-5xl font-medium leading-none tracking-tight">
          Spend the year. See what the budget did.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-[#6b6b6b]">
          One run. Four quarters. Each move changes the reserve, and the review names what moved.
        </p>
        <p className="mt-10 font-mono text-[30px] font-medium tabular-nums leading-none text-[#1d5fbf]">4 quarters</p>
        <div className="mt-10">
          <Link
            href="/sim"
            className="inline-flex h-9 items-center rounded-md bg-[#141414] px-4 text-sm font-medium text-white"
          >
            Open the year
          </Link>
        </div>
        <MobileInstallPrompt className="mt-8 max-w-md md:hidden" />
      </section>
    </main>
  );
}
