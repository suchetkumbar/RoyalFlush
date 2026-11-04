import { describe, expect, it } from "vitest";
import { createGame, reduceGame, type GameAction, type GameConfig } from "./game";
import { getSettlementText } from "./export";
import { balanceTimeline, prepareSessionClose, settle } from "./teenpatti";

const AUTO: GameConfig = { boot: 2, maxBet: 50, mode: "auto" };
const run = (...actions: GameAction[]) =>
  actions.reduce((s, a) => reduceGame(AUTO, s, { ts: 1, ...a }), createGame(AUTO, ["A", "B", "C"], 1));

describe("balanceTimeline", () => {
  it("ends at the settled balances and starts at zero", () => {
    const s = run(
      { type: "BLIND" },
      { type: "FOLD" },
      { type: "AWARD", winnerId: 0, hand: "Pair" },
      { type: "SEE" },
      { type: "CALL" },
      { type: "FOLD" },
      { type: "FOLD" },
      { type: "AWARD", winnerId: 1, hand: "Trail" },
      { type: "BLIND" } // round 3 unfinished
    );
    const closed = prepareSessionClose(s.players, s.log, s.round);
    const timeline = balanceTimeline(closed.players, closed.log);
    expect(timeline[0]).toEqual({ round: 0, A: 0, B: 0, C: 0 });
    expect(timeline.map((p) => p.round)).toEqual([0, 1, 2]);
    const last = timeline[timeline.length - 1];
    closed.players.forEach((p) => expect(last[p.name]).toBe(p.balance));
    expect(last.A + last.B + last.C).toBe(0);
  });
});

describe("getSettlementText", () => {
  it("lists standings high to low and payments", () => {
    const players = [
      { id: 0, name: "A", status: "blind" as const, balance: -30, totalBetThisRound: 0 },
      { id: 1, name: "B", status: "blind" as const, balance: 1500, totalBetThisRound: 0 },
      { id: 2, name: "C", status: "blind" as const, balance: -1470, totalBetThisRound: 0 },
    ];
    const text = getSettlementText(players, settle(players), 7, new Date(2026, 10, 4));
    expect(text).toContain("7 rounds");
    expect(text.indexOf("B: +₹1,500")).toBeLessThan(text.indexOf("C: -₹1,470"));
    expect(text).toContain("C → B: ₹1,470");
    expect(text).toContain("A → B: ₹30");
  });

  it("says when nobody owes anything", () => {
    const players = [{ id: 0, name: "A", status: "blind" as const, balance: 0, totalBetThisRound: 0 }];
    expect(getSettlementText(players, [], 1)).toContain("Everyone is even.");
  });
});
