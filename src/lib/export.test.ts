import { describe, expect, it } from "vitest";
import { getActionLogCsv, getPlayersCsv, getSessionJson } from "./export";
import type { StoredSession } from "./storage";

const session: StoredSession = {
  id: "test-123",
  version: 1,
  names: ["Alice", "Bob"],
  boot: 10,
  maxBet: 100,
  mode: "auto",
  createdAt: 1670000000000,
  updatedAt: 1670000001000,
  state: {
    players: [
      { id: 0, name: "Alice", status: "blind", balance: 50, totalBetThisRound: 10 },
      { id: 1, name: "Bob", status: "seen", balance: 70, totalBetThisRound: 20 },
    ],
    pot: 30,
    currentStake: 20,
    turnIdx: 1,
    round: 3,
    history: [],
    log: [
      { id: "log-1", round: 1, playerName: "Alice", action: "boot", amount: 10, ts: 1670000000000 },
      { id: "log-2", round: 2, playerName: "Bob", action: "see", ts: 1670000000500 },
    ],
    actionsCount: 2,
    manualBets: {},
    manualIteration: 1,
    manualFolded: [],
    manualCumulativeBets: {},
    manualRoundPot: 0,
    manualWinnerStep: false,
  },
};

describe("export utilities", () => {
  it("serializes session JSON with readable formatting", () => {
    const json = getSessionJson(session);
    expect(json).toContain(`"id": "test-123"`);
    expect(json).toContain(`"names": [\n    \"Alice\",\n    \"Bob\"\n  ]`);
  });

  it("generates action log CSV with headers and rows", () => {
    const csv = getActionLogCsv(session.state.log);
    expect(csv).toContain("Round,Player,Action,Amount,Note,Timestamp");
    expect(csv).toContain("1,Alice,boot,10,,2022-12-02T16:53:20.000Z");
    expect(csv).toContain("2,Bob,see,,,2022-12-02T16:53:20.500Z");
  });

  it("generates player CSV with the expected header and values", () => {
    const csv = getPlayersCsv(session.state.players);
    expect(csv).toContain("Name,Balance,Status,Total Bet This Round");
    expect(csv).toContain("Alice,50,blind,10");
    expect(csv).toContain("Bob,70,seen,20");
  });
});
