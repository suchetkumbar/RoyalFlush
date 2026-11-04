import { describe, expect, it } from "vitest";
import { computeAnalytics } from "./analytics";
import type { StoredSession } from "./storage";

const makeSession = (): StoredSession => ({
  id: "s1",
  version: 1,
  names: ["A", "B"],
  boot: 1,
  maxBet: 10,
  mode: "auto",
  createdAt: 1,
  updatedAt: 2,
  state: {
    players: [],
    pot: 0,
    currentStake: 1,
    turnIdx: 0,
    round: 2,
    history: [{ round: 1, winnerName: "A", handType: "Pair", pot: 6, players: 2 }],
    log: [
      { id: "1", round: 1, playerName: "A", action: "boot", amount: 1, ts: 1 },
      { id: "2", round: 1, playerName: "B", action: "boot", amount: 1, ts: 1 },
      { id: "3", round: 1, playerName: "A", action: "see", ts: 1 },
      { id: "4", round: 1, playerName: "B", action: "call", amount: 2, ts: 1 },
      { id: "5", round: 1, playerName: "A", action: "show", amount: 2, ts: 1 },
      { id: "6", round: 1, playerName: "A", action: "win", amount: 6, note: "Pair", ts: 1 },
    ],
    actionsCount: 0,
    manualBets: {},
    manualIteration: 1,
    manualFolded: [],
    manualCumulativeBets: {},
    manualRoundPot: 0,
    manualWinnerStep: false,
  },
});

describe("computeAnalytics", () => {
  it("counts show amounts as bets so earnings stay zero-sum", () => {
    const { players } = computeAnalytics([makeSession()]);
    const a = players.find((p) => p.name === "A")!;
    const b = players.find((p) => p.name === "B")!;
    expect(a.totalEarnings).toBe(3);
    expect(b.totalEarnings).toBe(-3);
    expect(a.totalEarnings + b.totalEarnings).toBe(0);
  });

  it("averages pots won, not net earnings", () => {
    const { players } = computeAnalytics([makeSession()]);
    expect(players.find((p) => p.name === "A")!.avgWinAmount).toBe(6);
  });
});
