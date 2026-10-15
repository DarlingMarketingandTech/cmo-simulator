import type { SimulationContext } from "@/lib/simMachine";
import { getSimulationScenarioById } from "@/lib/config/simulationScenarios";
import { calculateGrade, calculateOverallScore } from "@/lib/simulationInsights";

type ScorecardMetric = {
  label: string;
  value: string;
};

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function difficultyLabel(value: string | undefined): string {
  if (!value) return "Intermediate";
  if (value === "beginner") return "Beginner";
  if (value === "advanced") return "Advanced";
  return "Intermediate";
}

function drawMetricCard(
  ctx: CanvasRenderingContext2D,
  metric: ScorecardMetric,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = "rgba(15, 23, 42, 0.04)";
  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "600 16px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(metric.label.toUpperCase(), x + 18, y + 34);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(metric.value, x + 18, y + 84);
}

export async function exportSimulationScorecardImage(context: SimulationContext): Promise<void> {
  const score = calculateOverallScore(context);
  const grade = calculateGrade(score);
  const scenario = getSimulationScenarioById(context.scenarioId);
  const difficulty = difficultyLabel(context.strategy.difficulty);
  const companyName = context.strategy.companyName?.trim() || "Untitled Company";

  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 880;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering not supported.");
  }

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#f8fafc");
  bg.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(15, 23, 42, 0.03)";
  ctx.beginPath();
  ctx.roundRect(48, 40, canvas.width - 96, canvas.height - 80, 32);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.font = "700 18px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("CMO Simulator · Public Scorecard", 96, 108);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 54px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(companyName, 96, 178);

  const subtitle = `${scenario?.name ?? "Custom scenario"} · ${difficulty} difficulty`;
  ctx.fillStyle = "#475569";
  ctx.font = "500 24px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(subtitle, 96, 224);

  const primaryMetrics: ScorecardMetric[] = [
    { label: "Composite score", value: String(score) },
    { label: "Grade", value: grade },
    { label: "Revenue", value: fmtCurrency(context.kpis.revenue) },
    { label: "Profit", value: fmtCurrency(context.kpis.profit) },
    { label: "Market share", value: fmtPercent(context.kpis.marketShare) },
    { label: "Brand awareness", value: fmtPercent(context.kpis.brandAwareness) },
  ];

  const cardWidth = 394;
  const cardHeight = 126;
  const xStart = 96;
  const yStart = 282;
  const xGap = 24;
  const yGap = 22;

  primaryMetrics.forEach((metric, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = xStart + col * (cardWidth + xGap);
    const y = yStart + row * (cardHeight + yGap);
    drawMetricCard(ctx, metric, x, y, cardWidth, cardHeight);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "500 18px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  const generatedLabel = `Generated ${new Date().toLocaleString()} · cmo-simulator`;
  ctx.fillText(generatedLabel, 96, canvas.height - 86);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Failed to render scorecard image."));
        return;
      }
      resolve(result);
    }, "image/png");
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cmo-scorecard-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
