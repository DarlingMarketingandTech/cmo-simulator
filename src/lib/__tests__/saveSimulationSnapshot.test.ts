import { createInitialSimulationContext } from "@/lib/simMachine";
import { saveSimulationSnapshot } from "@/lib/saveSimulationSnapshot";

const mockGetSimAuthSession = jest.fn();
const mockToPersistedRunPayload = jest.fn();
const mockDispatchSaveSync = jest.fn();
const mockIsBrowserOffline = jest.fn();

jest.mock("@/lib/simAuth", () => ({
  getSimAuthSession: () => mockGetSimAuthSession(),
}));

jest.mock("@/lib/simulationPersistence", () => ({
  toPersistedRunPayload: (...args: unknown[]) => mockToPersistedRunPayload(...args),
}));

jest.mock("@/lib/saveSimulationSync", () => ({
  dispatchSaveSync: (...args: unknown[]) => mockDispatchSaveSync(...args),
  isBrowserOffline: () => mockIsBrowserOffline(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("saveSimulationSnapshot", () => {
  const context = createInitialSimulationContext();

  beforeEach(() => {
    jest.clearAllMocks();
    mockToPersistedRunPayload.mockReturnValue({ run: "payload" });
    mockIsBrowserOffline.mockReturnValue(false);
    global.fetch = jest.fn();
  });

  test("does not block guest flow when auth session is missing", async () => {
    mockGetSimAuthSession.mockResolvedValue(null);

    const result = await saveSimulationSnapshot(context, "Q1", "in_progress");

    expect(result).toEqual({
      ok: true,
      status: 204,
      retriable: false,
      persisted: false,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockDispatchSaveSync).toHaveBeenCalledWith(
      expect.objectContaining({ state: "idle" }),
    );
  });

  test("returns offline retriable state without attempting network", async () => {
    mockGetSimAuthSession.mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    mockIsBrowserOffline.mockReturnValue(true);

    const result = await saveSimulationSnapshot(context, "Q2", "in_progress");

    expect(result).toEqual({
      ok: false,
      status: 0,
      retriable: true,
      persisted: false,
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockDispatchSaveSync).toHaveBeenCalledWith(
      expect.objectContaining({ state: "offline" }),
    );
  });

  test("persists successfully when server accepts payload", async () => {
    mockGetSimAuthSession.mockResolvedValue({
      userId: "user-2",
      email: "ok@example.com",
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await saveSimulationSnapshot(context, "Q4", "completed");

    expect(result).toEqual({
      ok: true,
      status: 200,
      retriable: false,
      persisted: true,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockDispatchSaveSync).toHaveBeenCalledWith(
      expect.objectContaining({ state: "saving" }),
    );
    expect(mockDispatchSaveSync).toHaveBeenCalledWith(
      expect.objectContaining({ state: "saved" }),
    );
  });

  test("returns non-retriable failure for unauthorized responses", async () => {
    mockGetSimAuthSession.mockResolvedValue({
      userId: "user-3",
      email: "unauth@example.com",
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    const result = await saveSimulationSnapshot(context, "Q3", "in_progress");

    expect(result).toEqual({
      ok: false,
      status: 401,
      retriable: false,
      persisted: false,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockDispatchSaveSync).toHaveBeenCalledWith(
      expect.objectContaining({ state: "error", message: "Unauthorized" }),
    );
  });
});

