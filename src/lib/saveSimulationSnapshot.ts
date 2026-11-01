import type { SimulationContext } from "@/lib/simMachine";
import {
  defaultSimulationPersistencePort,
} from "@/lib/platform/adapters/supabase/simulationPersistencePort";
import type { SaveSimulationSnapshotResult } from "@/lib/platform/ports";

export type { SaveSimulationSnapshotResult };

/**
 * Persists the current simulation to the server with bounded retries and UI sync events.
 *
 * When `getSimAuthSession()` returns null, returns `{ ok: true, persisted: false }` (HTTP not attempted).
 * Call sites that require a real save must check `persisted` or gate with their own session guard.
 */
export async function saveSimulationSnapshot(
  context: SimulationContext,
  phase: string,
  status: "in_progress" | "completed",
  options?: { signal?: AbortSignal },
): Promise<SaveSimulationSnapshotResult> {
  return defaultSimulationPersistencePort.saveSnapshot({
    context,
    phase,
    status,
    signal: options?.signal,
  });
}
