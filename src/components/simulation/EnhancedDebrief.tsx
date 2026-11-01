"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Download,
  Save,
  Clipboard,
  TrendingUp,
  Target,
  Users,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Lightbulb,
  Crosshair,
  Compass,
  AlertTriangle,
  Megaphone
} from "lucide-react";
import { SimulationContext } from "@/lib/simMachine";
import type { SimulationTeachingGrade } from "@/lib/simulationContracts";
import CountUp from "react-countup";
import {
  buildTeachingReport,
  calculateGrade,
  calculateOverallScore,
  EXECUTIVE_RUBRIC_LABELS,
  type ExecutiveRubricKey,
} from "@/lib/simulationInsights";
import { DebriefBenchmarkContextStrip, DebriefNextRunCard } from "@/components/simulation/DebriefExecutivePanels";

interface EnhancedDebriefProps {
  context: SimulationContext;
  scoreBreakdowns: Array<{
    phase: string;
    category: string;
    score: number;
    maxScore: number;
    insight: string;
  }>;
  recommendations: Array<{
    priority: number;
    title: string;
    body: string;
    phase: string;
    category: string;
  }>;
  onExportPDF: () => void;
  onSaveRun: () => void;
  saveDisabled?: boolean;
  onRestart: () => void;
  onShare?: () => void;
  showUtilityActions?: boolean;
}

function teachingGradePresentation(grade: SimulationTeachingGrade) {
  switch (grade) {
    case "A+":
      return {
        letter: "A+",
        label: "ELITE",
        color: "text-blue-600",
        border: "border-blue-300",
        glow: "shadow-blue-200/80",
      };
    case "A":
      return {
        letter: "A",
        label: "EXECUTIVE",
        color: "text-emerald-600",
        border: "border-emerald-300",
        glow: "shadow-emerald-200/80",
      };
    case "B":
      return {
        letter: "B",
        label: "STRATEGIST",
        color: "text-indigo-600",
        border: "border-indigo-300",
        glow: "shadow-indigo-200/80",
      };
    case "C":
      return {
        letter: "C",
        label: "OPERATOR",
        color: "text-amber-600",
        border: "border-amber-300",
        glow: "shadow-amber-200/80",
      };
    case "D":
      return {
        letter: "D",
        label: "BUILDING",
        color: "text-orange-600",
        border: "border-orange-300",
        glow: "shadow-orange-200/80",
      };
    default:
      return {
        letter: "F",
        label: "RESET",
        color: "text-rose-600",
        border: "border-rose-300",
        glow: "shadow-rose-200/80",
      };
  }
}

function formatRecommendationLane(phase: string, category: string) {
  if (phase === "rubric") {
    const label = EXECUTIVE_RUBRIC_LABELS[category as ExecutiveRubricKey];
    if (label) return `Rubric · ${label}`;
  }
  return `${phase} · ${category}`;
}

export function EnhancedDebrief({
  context,
  scoreBreakdowns,
  recommendations,
  onExportPDF,
  onSaveRun,
  saveDisabled = false,
  onRestart,
  showUtilityActions = true,
}: EnhancedDebriefProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Calculate metrics
  const quarterlyData = [
    { quarter: "Q1", revenue: context.quarters.Q1.results.revenue, share: context.quarters.Q1.results.marketShare },
    { quarter: "Q2", revenue: context.quarters.Q2.results.revenue, share: context.quarters.Q2.results.marketShare },
    { quarter: "Q3", revenue: context.quarters.Q3.results.revenue, share: context.quarters.Q3.results.marketShare },
    { quarter: "Q4", revenue: context.quarters.Q4.results.revenue, share: context.quarters.Q4.results.marketShare },
  ];

  const finalMarketShare = context.quarters.Q4.results.marketShare;
  
  const overallScore = calculateOverallScore(context);
  const teachingGrade = calculateGrade(overallScore);
  const gradeInfo = teachingGradePresentation(teachingGrade);
  const report = buildTeachingReport(context);
  const rubricRows = scoreBreakdowns.filter((row) => row.phase === "rubric");
  const checkpointRows = scoreBreakdowns.filter((row) =>
    ["setup", "strategy", "Q1", "Q2", "Q3", "Q4"].includes(row.phase),
  );
  const overallRow = scoreBreakdowns.find((row) => row.phase === "debrief");

  // Phase 3 Calculations
  // 1. Archetype Assignment
  const getArchetype = () => {
    // Collect all tactics used
    const allTactics = [
      ...(context.quarters.Q1.tactics || []),
      ...(context.quarters.Q2.tactics || []),
      ...(context.quarters.Q3.tactics || []),
      ...(context.quarters.Q4.tactics || []),
    ];
    
    let digitalSpend = 0;
    let traditionalSpend = 0;
    let eventsSpend = 0;
    let brandSpend = 0;

    allTactics.forEach(t => {
      if (t.category === 'digital') digitalSpend += t.cost;
      if (t.category === 'traditional') traditionalSpend += t.cost;
      if (t.category === 'events') eventsSpend += t.cost;
      if (t.category === 'content' || t.name.toLowerCase().includes('brand')) brandSpend += t.cost;
    });

    const maxSpend = Math.max(digitalSpend, traditionalSpend, eventsSpend, brandSpend);
    if (maxSpend === 0) return { name: "Budget Hoarder", icon: AlertTriangle, desc: "You barely spent your budget. Marketing requires fuel.", advice: "Don't be afraid to deploy capital. A defensive posture rarely wins market share." };
    if (maxSpend === digitalSpend) return { name: "Performance Maximalist", icon: Zap, desc: "You heavily favored direct-response digital channels for immediate ROI.", advice: "Watch for performance plateau. Digital CAC rises rapidly when brand awareness is neglected." };
    if (maxSpend === traditionalSpend) return { name: "Broadcast Traditionalist", icon: Megaphone, desc: "You relied on established, high-reach television and out-of-home campaigns.", advice: "While reach is great, traditional media is hard to attribute. Ensure you have lower-funnel capture mechanics in place." };
    if (maxSpend === eventsSpend) return { name: "Experiential Operator", icon: Award, desc: "You leaned into physical experiences and high-touch event marketing.", advice: "Events create incredible loyalty but scale poorly. Blend digital amplification with your event strategy next time." };
    return { name: "Brand Builder", icon: ShieldCheck, desc: "You focused on long-term equity, content, and category narrative.", advice: "Brand takes time to compound. Make sure you don't run out of immediate cash flow while waiting for the brand halo effect." };
  };

  const archetype = getArchetype();

  const handleCopyBriefing = async () => {
    const briefing = [
      "CMO Simulator Growth Briefing",
      "",
      `Executive composite: ${overallScore}/100 (${teachingGrade})`,
      `Leadership archetype: ${archetype.name}`,
      "",
      ...rubricRows.map((row) => {
        const label =
          EXECUTIVE_RUBRIC_LABELS[row.category as ExecutiveRubricKey] ?? row.category;
        return `${label}: ${row.score}/100 — ${row.insight}`;
      }),
      "",
      `Outcome: ${report.outcome}`,
      `Why: ${report.why}`,
      `Tradeoff: ${report.tradeoff}`,
      `Recommended next move: ${report.nextMove}`,
      `Growth leader takeaway: ${report.growthLeaderTakeaway}`,
    ].join("\n");

    if (!window.isSecureContext || !navigator.clipboard?.writeText) {
      setCopyStatus("Clipboard access is unavailable here. Export the briefing instead.");
      return;
    }

    try {
      await navigator.clipboard.writeText(briefing);
      setCopyStatus("Briefing copied.");
    } catch {
      setCopyStatus("Copy failed. Export the briefing instead.");
    }
  };

  // 2. Turning Points
  const getTurningPoint = () => {
    let bestDelta = 0;
    let bestQ = "Q1";
    let priorRev = 0; // Baseline before simulation

    quarterlyData.forEach((q) => {
      const delta = q.revenue - priorRev;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestQ = q.quarter;
      }
      priorRev = q.revenue;
    });

    return {
      quarter: bestQ,
      insight: `Your largest revenue surge ($${(bestDelta/1000).toFixed(0)}k jump) occurred in ${bestQ}.`,
      lesson: `Actions prior to ${bestQ} created compounding momentum, or your ${bestQ} deployments were highly resonant.`
    };
  };

  const turningPoint = getTurningPoint();

  const slides = [
    {
      id: "teaching-report",
      title: "Teaching + Proof Report",
      subtitle: "Structured debrief for growth leaders",
      content: (
        <div className="grid gap-6 py-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-700">Outcome</p>
            <p className="text-slate-800">{report.outcome}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-700">Why</p>
            <p className="text-slate-800">{report.why}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-700">Tradeoff</p>
            <p className="text-slate-800">{report.tradeoff}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-700">Recommended Next Move</p>
            <p className="text-slate-800">{report.nextMove}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-700">Growth Leader Takeaway</p>
            <p className="text-blue-900">{report.growthLeaderTakeaway}</p>
          </div>
        </div>
      ),
    },
    {
      id: "executive-summary",
      title: "Executive Summary",
      subtitle: "Fiscal Year results and strategic positioning",
      content: (
        <div className="flex flex-col items-center justify-center space-y-8 py-10">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className={`relative flex h-48 w-48 flex-col items-center justify-center rounded-full border-8 bg-slate-50 shadow-lg ${gradeInfo.border} ${gradeInfo.glow}`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-slate-100/80 opacity-90" />
            <span className={`relative text-7xl font-black tracking-tighter ${gradeInfo.color} sm:text-8xl`}>
              {gradeInfo.letter}
            </span>
            <span className="relative mt-[-10px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
              {gradeInfo.label}
            </span>
          </motion.div>

          <div className="grid w-full max-w-2xl grid-cols-2 gap-10 px-10">
            <div className="space-y-1 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Teaching grade</p>
              <p className="text-3xl font-bold uppercase text-slate-900">{teachingGrade}</p>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Executive composite</p>
              <p className="text-3xl font-bold text-slate-900">
                <CountUp end={overallScore} duration={2} />
                /100
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "score-intelligence",
      title: "Score Breakdown + Next Moves",
      subtitle: "Weighted rubric plus execution checkpoints — deterministic, replayable scoring",
      content: (
        <div className="grid gap-6 py-4 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Executive rubric</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Five categories (each scored 0–100) roll into the composite using fixed weights: growth quality 26%, efficiency 20%, strategic coherence 22%, resilience / execution 18%, finish quality 14%.
              </p>
              <div className="mt-3 space-y-3">
                {rubricRows.map((breakdown) => (
                  <div
                    key={`${breakdown.phase}-${breakdown.category}`}
                    className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-800">
                          {EXECUTIVE_RUBRIC_LABELS[breakdown.category as ExecutiveRubricKey] ?? breakdown.category}
                        </p>
                        <p className="mt-1 text-sm text-slate-800">{breakdown.insight}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-black text-slate-900">{breakdown.score}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                          / {breakdown.maxScore}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {overallRow ? (
              <div className="rounded-2xl border border-slate-900 bg-slate-900 p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-200">Composite</p>
                    <p className="mt-1 text-sm text-slate-100">{overallRow.insight}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-black">{overallRow.score}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      / {overallRow.maxScore}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Execution checkpoints</p>
              <div className="mt-3 space-y-3">
                {checkpointRows.map((breakdown) => (
                  <div
                    key={`${breakdown.phase}-${breakdown.category}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                          {breakdown.phase} · {breakdown.category}
                        </p>
                        <p className="mt-1 text-sm text-slate-800">{breakdown.insight}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-black text-slate-900">{breakdown.score}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                          / {breakdown.maxScore}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((recommendation) => (
                <div
                  key={`${recommendation.phase}-${recommendation.category}-${recommendation.priority}`}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
                >
                  <p className="text-xs font-black uppercase tracking-widest text-blue-800">
                    {formatRecommendationLane(recommendation.phase, recommendation.category)} · priority{" "}
                    {recommendation.priority}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{recommendation.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-950/80">{recommendation.body}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No recommendations generated.
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "revenue-performance",
      title: "Revenue Trajectory",
      subtitle: "Compounded growth rates across FY cycles",
      content: (
        <div className="mt-8 h-[400px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={quarterlyData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={[0, (dataMax: number) => Math.max(dataMax, 500000)]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#0f172a",
                }}
                itemStyle={{ color: "#2563eb" }}
                labelStyle={{ color: "#475569" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )
    },
    {
      id: "market-dominance",
      title: "Market Dominance",
      subtitle: "Competitive landscape penetration",
      content: (
        <div className="grid grid-cols-1 gap-8 py-10 md:grid-cols-2">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-2 text-blue-600">
                <Target className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Final Market Share</span>
              </div>
              <p className="text-5xl font-black text-slate-900">{finalMarketShare.toFixed(1)}%</p>
              <p className="text-xs text-slate-600">Relative to industry benchmarks (2026 Avg: 18.4%)</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-2 text-emerald-600">
                <Users className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Customer Trust Index</span>
              </div>
              <p className="text-5xl font-black text-slate-900">{context.quarters.Q4.results.customerSatisfaction.toFixed(1)}%</p>
              <p className="text-xs text-slate-600">Premium brand perception achieved</p>
            </div>
          </div>
          <div className="flex h-[300px] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 md:h-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                  }}
                  itemStyle={{ color: "#2563eb" }}
                />
                <Bar dataKey="share" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )
    },
    {
      id: "strategic-archetype",
      title: "CMO Strategic Archetype",
      subtitle: "What your decisions say about your leadership style",
      content: (
        <div className="flex flex-col items-center justify-center space-y-8 py-4">
          <div className="flex w-full flex-col items-center rounded-[30px] border border-blue-200 bg-blue-50/80 p-8 shadow-md">
            <archetype.icon className="mb-6 h-20 w-20 text-blue-600" />
            <h3 className="text-center text-4xl font-black uppercase tracking-widest text-slate-900">{archetype.name}</h3>
            <p className="mt-4 max-w-lg text-center text-lg italic leading-relaxed text-blue-900/80">{archetype.desc}</p>
          </div>

          <div className="mt-4 grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <Crosshair className="h-8 w-8 shrink-0 text-emerald-600" />
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Strengths</p>
                <p className="text-sm text-slate-700">
                  Aligned heavily with your primary budget allocations. Created strong narrative consistency in your chosen channels.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <AlertTriangle className="h-8 w-8 shrink-0 text-amber-600" />
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">Blindspots</p>
                <p className="text-sm text-slate-700">
                  Lack of diversification may expose the brand to channel saturation or competitor flanking.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "turning-points",
      title: "Campaign Turning Point",
      subtitle: "The moment momentum shifted",
      content: (
        <div className="grid h-full grid-cols-1 gap-8 py-10 md:grid-cols-2">
          <div className="relative flex h-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="absolute inset-y-10 left-12 w-1 rounded-full bg-slate-200" />
            <div className="flex h-full w-full flex-col justify-between pl-8">
              {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                <div key={q} className="relative flex items-center gap-6">
                  <div
                    className={cn(
                      "z-10 -ml-[19px] h-8 w-8 shrink-0 rounded-full border-4",
                      q === turningPoint.quarter
                        ? "border-emerald-700 bg-emerald-500 shadow-md shadow-emerald-200"
                        : "border-slate-300 bg-white",
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "font-black uppercase tracking-widest",
                        q === turningPoint.quarter ? "text-xl text-emerald-700" : "text-slate-500",
                      )}
                    >
                      {q}
                    </p>
                    {q === turningPoint.quarter && (
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-emerald-600">Maximum Inflection</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-6">
            <div className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-8">
              <TrendingUp className="mb-6 h-10 w-10 text-emerald-600" />
              <h3 className="mb-2 text-2xl font-bold text-slate-900">Momentum Spike in {turningPoint.quarter}</h3>
              <p className="mb-6 leading-relaxed text-emerald-900/80">{turningPoint.insight}</p>
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-4">
                <p className="text-sm italic text-slate-700">{turningPoint.lesson}</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "alternative-path",
      title: "Alternative Path Coaching",
      subtitle: "If you rerun this scenario, try this",
      content: (
        <div className="flex h-full flex-col items-center justify-center space-y-8 py-10">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-10 text-center">
            <Compass className="mx-auto mb-6 h-16 w-16 text-indigo-600 opacity-90" />
            <h3 className="mb-4 text-2xl font-black uppercase tracking-widest text-slate-900">Strategic Recommendation</h3>

            <p className="mx-auto max-w-xl text-lg leading-relaxed text-indigo-950/85">{archetype.advice}</p>

            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-200/40 blur-[80px]" />
          </div>

          <div className="flex items-center gap-4">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-black uppercase tracking-widest text-amber-800">
              Replay the simulator to test a different archetype.
            </p>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
  const nextIndex = (currentSlide + 1) % slides.length;
  const prevSectionTitle = slides[prevIndex].title;
  const nextSectionTitle = slides[nextIndex].title;

  return (
    <div className="mt-[-40px] flex min-h-screen flex-col items-center bg-transparent px-4 py-10 text-slate-950">
      <div className="mb-6 w-full max-w-5xl space-y-4">
        <DebriefBenchmarkContextStrip context={context} />
        <DebriefNextRunCard report={report} archetypeAdvice={archetype.advice} />
      </div>
      <motion.div
        layout
        className="relative w-full max-w-5xl overflow-hidden rounded-[40px] border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex gap-1 p-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i <= currentSlide ? "bg-blue-600" : "bg-slate-200",
              )}
            />
          ))}
        </div>

        <div className="px-6 pb-10 sm:px-10 lg:px-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <motion.h1
                key={`title-${currentSlide}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl"
              >
                {slides[currentSlide].title}
              </motion.h1>
              <p className="text-sm font-medium text-slate-600">
                Section {currentSlide + 1} of {slides.length} — {slides[currentSlide].title}
              </p>
              <p className="text-xs text-slate-500">{slides[currentSlide].subtitle}</p>
            </div>
            <Building2 className="hidden h-8 w-8 shrink-0 text-slate-300 sm:block" aria-hidden />
          </div>

          <div className="relative min-h-[450px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.98 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex flex-col gap-6 border-t border-slate-200 pt-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevSlide}
                  aria-label={`Go to previous section: ${prevSectionTitle}`}
                  className="h-12 w-12 shrink-0 rounded-full border-slate-200 p-0 text-slate-900 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </Button>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <nav className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Debrief sections">
                    <div className="flex snap-x snap-mandatory gap-2">
                      {slides.map((slide, i) => (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() => setCurrentSlide(i)}
                          className={cn(
                            "max-w-[200px] snap-start truncate rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
                            i === currentSlide
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                          aria-current={i === currentSlide ? true : undefined}
                        >
                          {slide.title}
                        </button>
                      ))}
                    </div>
                  </nav>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={nextSlide}
                  aria-label={`Go to next section: ${nextSectionTitle}`}
                  className="h-12 w-12 shrink-0 rounded-full border-slate-200 p-0 text-slate-900 hover:bg-slate-50 sm:order-last"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </Button>
              </div>
            </div>

            {showUtilityActions ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={onSaveRun}
                  disabled={saveDisabled}
                  variant="outline"
                  className="flex h-12 items-center gap-2 rounded-xl border-slate-200 bg-white px-6 font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> Save Run
                </Button>
                <Button
                  onClick={onExportPDF}
                  variant="outline"
                  className="flex h-12 items-center gap-2 rounded-xl border-slate-200 bg-white px-6 font-bold text-slate-900 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Export Briefing
                </Button>
                <Button
                  onClick={handleCopyBriefing}
                  variant="outline"
                  className="flex h-12 items-center gap-2 rounded-xl border-slate-200 bg-white px-6 font-bold text-slate-900 hover:bg-slate-50"
                >
                  <Clipboard className="h-4 w-4" /> Copy Summary
                </Button>
                {currentSlide === slides.length - 1 && (
                  <Button
                    onClick={onRestart}
                    className="h-12 rounded-xl bg-slate-900 px-8 font-black text-white shadow-md transition-transform hover:bg-slate-800 active:scale-95"
                  >
                    RESTART CAMPAIGN
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          {copyStatus && <p className="mt-4 text-sm font-medium text-blue-800">{copyStatus}</p>}
        </div>
      </motion.div>

      <section className="mt-6 w-full max-w-5xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Turn the run into a real growth conversation</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Use this debrief as the starting point for a strategy review.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bring the briefing into a real conversation about budget allocation, positioning, channel risk, and the next 90 days of execution.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center gap-3 opacity-40 transition-opacity hover:opacity-100">
        <ShieldCheck className="h-5 w-5 text-slate-600" />
        <span className="text-xs font-black uppercase tracking-[0.5em] text-slate-600">CMO SIMULATOR | BOARDROOM EDITION 2026</span>
      </div>
    </div>
  );
}
