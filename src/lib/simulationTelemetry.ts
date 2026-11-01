import { getSimAuthSession } from "@/lib/simAuth";

export interface SimulationEventInput {
  runId: string;
  eventType: string;
  phase: string;
  payload?: Record<string, unknown>;
}

export async function recordSimulationEvent(input: SimulationEventInput): Promise<void> {
  const runId = input.runId.trim();
  if (!runId) return;

  try {
    const session = await getSimAuthSession();
    if (!session) return;

    await fetch("/api/simulation-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, runId }),
      keepalive: true,
    });
  } catch {
    // Fire-and-forget telemetry must never block gameplay.
  }
}

