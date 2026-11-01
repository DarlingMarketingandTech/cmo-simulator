const getSimAuthSession = jest.fn();

jest.mock("@/lib/simAuth", () => ({
  getSimAuthSession: () => getSimAuthSession(),
}));

import { recordSimulationEvent } from "../simulationTelemetry";

describe("recordSimulationEvent", () => {
  beforeEach(() => {
    getSimAuthSession.mockReset();
    global.fetch = jest.fn();
  });

  test("does not POST when there is no signed-in session", async () => {
    getSimAuthSession.mockResolvedValue(null);

    await recordSimulationEvent({
      runId: "run-1",
      eventType: "setup_answer",
      phase: "setup",
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("does not POST when the run id is blank", async () => {
    getSimAuthSession.mockResolvedValue({
      userId: "user-1",
      email: "ada@example.com",
      signedInAt: "2026-11-01T00:00:00.000Z",
    });

    await recordSimulationEvent({
      runId: "   ",
      eventType: "setup_answer",
      phase: "setup",
    });

    expect(getSimAuthSession).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("POSTs when a session and run id are present", async () => {
    getSimAuthSession.mockResolvedValue({
      userId: "user-1",
      email: "ada@example.com",
      signedInAt: "2026-11-01T00:00:00.000Z",
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await recordSimulationEvent({
      runId: "run-1",
      eventType: "setup_answer",
      phase: "setup",
      payload: { step: 1 },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/simulation-events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          runId: "run-1",
          eventType: "setup_answer",
          phase: "setup",
          payload: { step: 1 },
        }),
      }),
    );
  });
});
