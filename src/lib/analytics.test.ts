import { describe, expect, it } from "vitest";
import { computeAnalytics, filterByRange } from "./analytics";
import type { StoredSession } from "./storage";

const makeSession = (): StoredSession => ({
  id: "s1",
  version: 2,
  status: "completed",
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
    manual: { bets: {}, iteration: 1, folded: [], cumulativeBets: {}, winnerStep: false },
    undo: [],
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

  it("merges the same player across sessions regardless of case and uses final balances", () => {
    const first = makeSession();
    const second: StoredSession = {
      ...makeSession(),
      id: "s2",
      names: ["a ", "B"],
      createdAt: 10,
      final: {
        players: [
          { id: 0, name: "a ", status: "blind", balance: -5, totalBetThisRound: 0 },
          { id: 1, name: "B", status: "blind", balance: 5, totalBetThisRound: 0 },
        ],
        settlements: [],
      },
      state: { ...makeSession().state, history: [{ round: 1, winnerName: "B", handType: "Trail", pot: 10, players: 2 }] },
    };
    const { players, totalSessions } = computeAnalytics([first, second]);
    expect(totalSessions).toBe(2);
    expect(players).toHaveLength(2);
    const a = players.find((p) => p.name === "a ")!; // most recent spelling wins
    expect(a.sessions).toBe(2);
    expect(a.totalEarnings).toBe(3 - 5);
    expect(a.biggestSessionWin).toBe(3);
    expect(a.biggestSessionLoss).toBe(-5);
    expect(players.find((p) => p.name === "B")!.wins).toBe(1);
  });
});

describe("filterByRange", () => {
  it("keeps sessions ended within the window", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 100 * day;
    const recent = { ...makeSession(), id: "r", endedAt: now - 2 * day };
    const old = { ...makeSession(), id: "o", endedAt: now - 20 * day };
    expect(filterByRange([recent, old], "7d", now).map((s) => s.id)).toEqual(["r"]);
    expect(filterByRange([recent, old], "30d", now)).toHaveLength(2);
    expect(filterByRange([recent, old], "all", now)).toHaveLength(2);
  });
});
