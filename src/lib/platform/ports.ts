import type { SimulationContext } from "@/lib/simMachine";

export interface SimAuthSession {
  userId: string;
  email: string;
  signedInAt: string;
}

export interface AuthSessionPort {
  getSession(): Promise<SimAuthSession | null>;
}

export type SaveSimulationSnapshotResult = {
  ok: boolean;
  status: number;
  retriable: boolean;
  /** False when no browser Supabase session was found — caller skipped POST. Distinct from HTTP success. */
  persisted: boolean;
};

export interface SaveSimulationSnapshotInput {
  context: SimulationContext;
  phase: string;
  status: "in_progress" | "completed";
  signal?: AbortSignal;
}

export interface SimulationPersistencePort {
  saveSnapshot(input: SaveSimulationSnapshotInput): Promise<SaveSimulationSnapshotResult>;
}

export interface SimulationProfilePort {
  getProfile(): Promise<unknown | null>;
  upsertProfile(profile: unknown): Promise<unknown>;
}

export interface SimulationSocialPort {
  getShareSettings(runId: string): Promise<unknown | null>;
  publishScorecard(input: {
    runId: string;
    alias: string;
    leaderboardOptIn: boolean;
  }): Promise<unknown>;
  disableShare(runId: string): Promise<unknown>;
  getLeaderboard(params?: {
    scenario?: string;
    difficulty?: string;
    limit?: number;
  }): Promise<unknown>;
}

