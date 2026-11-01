import { toPersistedRunPayload } from "@/lib/simulationPersistence";
import { logger } from "@/lib/logger";
import { dispatchSaveSync, isBrowserOffline } from "@/lib/saveSimulationSync";
import { defaultAuthSessionPort } from "@/lib/platform/adapters/supabase/authSessionPort";
import type {
  SaveSimulationSnapshotInput,
  SaveSimulationSnapshotResult,
  SimulationPersistencePort,
} from "@/lib/platform/ports";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postSaveOnce(body: string, signal?: AbortSignal): Promise<Response> {
  return fetch("/api/simulations/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal,
  });
}

export class SupabaseSimulationPersistencePort implements SimulationPersistencePort {
  async saveSnapshot(input: SaveSimulationSnapshotInput): Promise<SaveSimulationSnapshotResult> {
    const session = await defaultAuthSessionPort.getSession();
    if (!session) {
      dispatchSaveSync({ state: "idle", at: new Date().toISOString() });
      return { ok: true, status: 204, retriable: false, persisted: false };
    }

    const payload = toPersistedRunPayload(
      input.context,
      { userId: session.userId, email: session.email },
      { phase: input.phase, status: input.status },
    );

    const body = JSON.stringify(payload);

    if (isBrowserOffline()) {
      const msg = "You appear offline. Reconnect, then use Retry save in the header.";
      dispatchSaveSync({ state: "offline", message: msg, at: new Date().toISOString() });
      logger.warn("saveSimulationSnapshot skipped: offline");
      return { ok: false, status: 0, retriable: true, persisted: false };
    }

    dispatchSaveSync({ state: "saving", at: new Date().toISOString() });

    let lastStatus = 500;
    let lastRetriable = true;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (input.signal?.aborted) {
        dispatchSaveSync({ state: "idle", at: new Date().toISOString() });
        return { ok: false, status: 499, retriable: false, persisted: false };
      }

      try {
        const response = await postSaveOnce(body, input.signal);
        lastStatus = response.status;

        if (response.ok) {
          dispatchSaveSync({ state: "saved", at: new Date().toISOString() });
          return { ok: true, status: response.status, retriable: false, persisted: true };
        }

        const retriable = response.status >= 500 || response.status === 429;
        lastRetriable = retriable;
        const errJson = await response.json().catch(() => ({}));
        const clientMsg =
          typeof errJson?.error === "string" && errJson.error.length > 0
            ? errJson.error
            : "Could not save to the server.";

        logger.error("saveSimulationSnapshot failed", new Error(clientMsg), {
          status: response.status,
          attempt,
        });

        if (!retriable || attempt === MAX_ATTEMPTS) {
          dispatchSaveSync({
            state: "error",
            message: clientMsg,
            at: new Date().toISOString(),
          });
          return { ok: false, status: response.status, retriable, persisted: false };
        }

        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        await sleep(delay);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          dispatchSaveSync({ state: "idle", at: new Date().toISOString() });
          return { ok: false, status: 499, retriable: false, persisted: false };
        }
        lastStatus = 0;
        lastRetriable = true;
        logger.error("saveSimulationSnapshot network error", e, { attempt });
        if (attempt === MAX_ATTEMPTS) {
          dispatchSaveSync({
            state: "error",
            message: "Network error while saving. Check your connection and retry.",
            at: new Date().toISOString(),
          });
          return { ok: false, status: 0, retriable: true, persisted: false };
        }
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }

    dispatchSaveSync({
      state: "error",
      message: "Could not save after several tries.",
      at: new Date().toISOString(),
    });
    return { ok: false, status: lastStatus, retriable: lastRetriable, persisted: false };
  }
}

export const defaultSimulationPersistencePort: SimulationPersistencePort =
  new SupabaseSimulationPersistencePort();

