import { describe, expect, it } from "vitest";
import {
  callAmount,
  canShow,
  createGame,
  manualLastBets,
  manualSubmitError,
  raiseMin,
  reduceGame,
  type GameAction,
  type GameConfig,
  type GameState,
} from "./game";
import { normalizeSession } from "./storage";

const AUTO: GameConfig = { boot: 1, maxBet: 100, mode: "auto" };
const MANUAL: GameConfig = { boot: 1, maxBet: 100, mode: "manual" };

/** Money is conserved: whatever left the balances sits in the pot. */
const expectConserved = (s: GameState) => {
  const balances = s.players.reduce((sum, p) => sum + p.balance, 0);
  expect(balances + s.pot).toBe(0);
};

const play = (config: GameConfig, state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => {
    const next = reduceGame(config, s, { ts: 1, ...a });
    expectConserved(next);
    return next;
  }, state);

const balances = (s: GameState) => s.players.map((p) => p.balance);

describe("createGame", () => {
  it("collects the boot from every player and starts with player 1", () => {
    const s = createGame(AUTO, ["A", "B", "C"], 1);
    expect(s.pot).toBe(3);
    expect(balances(s)).toEqual([-1, -1, -1]);
    expect(s.turnIdx).toBe(0);
    expect(s.log.filter((l) => l.action === "boot")).toHaveLength(3);
    expectConserved(s);
  });
});

describe("auto mode betting", () => {
  it("blind pays half the seen stake (at least the boot) and passes the turn", () => {
    const cfg = { ...AUTO, boot: 2 };
    const s = play(cfg, createGame(cfg, ["A", "B", "C"], 1), { type: "BLIND" });
    expect(s.players[0].balance).toBe(-4);
    expect(s.turnIdx).toBe(1);
    expect(s.actionsCount).toBe(1);
  });

  it("see does not pass the turn; a seen call pays the full stake", () => {
    let s = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "SEE" });
    expect(s.turnIdx).toBe(0);
    expect(s.players[0].status).toBe("seen");
    expect(callAmount(AUTO, s, s.players[0])).toBe(1);
    s = play(AUTO, s, { type: "CALL" });
    expect(s.turnIdx).toBe(1);
  });

  it("a blind raise doubles the seen stake; a seen raise sets it", () => {
    const s0 = createGame(AUTO, ["A", "B", "C"], 1);
    expect(raiseMin(AUTO, s0, s0.players[0])).toBe(2);
    const blindRaise = play(AUTO, s0, { type: "RAISE", amount: 4 });
    expect(blindRaise.currentStake).toBe(8);

    const seenRaise = play(AUTO, s0, { type: "SEE" }, { type: "RAISE", amount: 4 });
    expect(seenRaise.currentStake).toBe(4);
  });

  it("rejects raises outside min/max without changing state", () => {
    const s0 = createGame(AUTO, ["A", "B", "C"], 1);
    expect(reduceGame(AUTO, s0, { type: "RAISE", amount: 1 })).toBe(s0);
    expect(reduceGame(AUTO, s0, { type: "RAISE", amount: 101 })).toBe(s0);
  });

  it("caps every bet at maxBet", () => {
    const cfg = { ...AUTO, maxBet: 5 };
    const s = play(cfg, createGame(cfg, ["A", "B", "C"], 1), { type: "SEE" }, { type: "RAISE", amount: 5 });
    expect(callAmount(cfg, s, { ...s.players[1], status: "seen" })).toBe(5);
    expect(raiseMin(cfg, s, { ...s.players[1], status: "seen" })).toBe(5);
  });

  it("skips folded players when passing the turn", () => {
    const s = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "BLIND" }, { type: "FOLD" }, { type: "BLIND" });
    expect(s.players[1].status).toBe("folded");
    expect(s.turnIdx).toBe(0);
  });
});

describe("show rules", () => {
  it("needs exactly two players, a seen requester and a seen opponent", () => {
    // A folds, B sees and calls; C (blind) cannot show until seen.
    let s = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "FOLD" }, { type: "SEE" }, { type: "CALL" });
    expect(canShow(AUTO, s)).toEqual({ ok: false, reason: "Only seen players can request show" });
    s = play(AUTO, s, { type: "SEE" });
    expect(s.turnIdx).toBe(2);
    expect(canShow(AUTO, s)).toEqual({ ok: true });
    const shown = play(AUTO, s, { type: "SHOW" });
    expect(shown.log[shown.log.length - 1]).toMatchObject({ action: "show", amount: 1, playerName: "C" });
  });

  it("blocks show against a blind player", () => {
    // A folds, B plays blind, C sees: C may not show against blind B.
    const s = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "FOLD" }, { type: "BLIND" }, { type: "SEE" });
    expect(canShow(AUTO, s)).toEqual({ ok: false, reason: "Cannot show against a blind player" });
  });

  it("blocks show with more than two players left", () => {
    const s = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "SEE" });
    expect(canShow(AUTO, s).reason).toBe("Show only when 2 players remain");
  });
});

describe("awarding a round", () => {
  it("pays the pot, records history, rotates the starter and re-boots", () => {
    const s = play(
      AUTO,
      createGame(AUTO, ["A", "B", "C"], 1),
      { type: "BLIND" },
      { type: "FOLD" },
      { type: "AWARD", winnerId: 0, hand: "Pair" }
    );
    expect(s.round).toBe(2);
    expect(s.history).toEqual([{ round: 1, winnerName: "A", handType: "Pair", pot: 4, players: 2 }]);
    expect(s.turnIdx).toBe(1);
    expect(s.pot).toBe(3);
    expect(balances(s)).toEqual([1, -2, -2]); // A: -1 boot -1 blind +4 pot, then round-2 boot
  });

  it("refuses to award a folded player", () => {
    const s = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "FOLD" });
    expect(reduceGame(AUTO, s, { type: "AWARD", winnerId: 0, hand: "Pair" })).toBe(s);
  });
});

describe("undo", () => {
  it("restores the exact previous state, including across a round boundary", () => {
    const before = play(AUTO, createGame(AUTO, ["A", "B", "C"], 1), { type: "BLIND" }, { type: "FOLD" });
    const after = play(AUTO, before, { type: "AWARD", winnerId: 0, hand: "Pair" });
    const undone = play(AUTO, after, { type: "UNDO" });
    expect(undone).toEqual(before);
  });

  it("is a no-op with an empty stack and caps its size", () => {
    const s0 = createGame(AUTO, ["A", "B", "C"], 1);
    expect(reduceGame(AUTO, s0, { type: "UNDO" })).toBe(s0);
    let s = s0;
    for (let i = 0; i < 40; i += 1) s = play(AUTO, s, { type: "BLIND" });
    expect(s.undo.length).toBe(30);
  });
});

describe("manual mode", () => {
  const start = () => createGame(MANUAL, ["A", "B", "C"], 1);

  it("commits an iteration's bets and keeps money conserved", () => {
    const s = play(
      MANUAL,
      start(),
      { type: "MANUAL_SET_BET", playerId: 0, amount: 5 },
      { type: "MANUAL_SET_BET", playerId: 1, amount: 5 },
      { type: "MANUAL_SUBMIT" }
    );
    expect(s.pot).toBe(13);
    expect(s.manual.iteration).toBe(2);
    expect(s.manual.cumulativeBets).toEqual({ 0: 6, 1: 6, 2: 1 });
    expect(s.manual.bets).toEqual({ 0: 0, 1: 0, 2: 0 });
  });

  it("auto-awards when one player remains, charging that iteration's bets (regression)", () => {
    const s = play(
      MANUAL,
      start(),
      { type: "MANUAL_SET_BET", playerId: 0, amount: 20 },
      { type: "MANUAL_TOGGLE_FOLD", playerId: 1 },
      { type: "MANUAL_TOGGLE_FOLD", playerId: 2 },
      { type: "MANUAL_SUBMIT" }
    );
    expect(s.round).toBe(2);
    expect(s.history[0]).toMatchObject({ winnerName: "A", pot: 23 });
    // A: -1 -20 +23 = +2, then the round-2 boot.
    expect(balances(s)).toEqual([1, -2, -2]);
  });

  it("draft folds can be reverted; committed folds cannot", () => {
    let s = play(MANUAL, start(), { type: "MANUAL_TOGGLE_FOLD", playerId: 1 });
    expect(s.manual.folded).toEqual([1]);
    s = play(MANUAL, s, { type: "MANUAL_TOGGLE_FOLD", playerId: 1 });
    expect(s.manual.folded).toEqual([]);
    s = play(MANUAL, s, { type: "MANUAL_TOGGLE_FOLD", playerId: 1 }, { type: "MANUAL_SUBMIT" });
    expect(reduceGame(MANUAL, s, { type: "MANUAL_TOGGLE_FOLD", playerId: 1 })).toBe(s);
  });

  it("validates submissions", () => {
    const s = start();
    expect(manualSubmitError(s)).toMatch(/positive bet/);
    const allFolded = play(
      MANUAL,
      s,
      { type: "MANUAL_TOGGLE_FOLD", playerId: 0 },
      { type: "MANUAL_TOGGLE_FOLD", playerId: 1 },
      { type: "MANUAL_TOGGLE_FOLD", playerId: 2 }
    );
    expect(manualSubmitError(allFolded)).toMatch(/stay in/);
    expect(reduceGame(MANUAL, allFolded, { type: "MANUAL_SUBMIT" })).toBe(allFolded);
  });

  it("undo of a manual award restores the round's bet state (regression)", () => {
    const mid = play(
      MANUAL,
      start(),
      { type: "MANUAL_SET_BET", playerId: 0, amount: 5 },
      { type: "MANUAL_TOGGLE_FOLD", playerId: 2 },
      { type: "MANUAL_SUBMIT" }
    );
    const awarded = play(MANUAL, mid, { type: "MANUAL_AWARD", winnerId: 1, hand: "Trail" });
    expect(awarded.round).toBe(2);
    const undone = play(MANUAL, awarded, { type: "UNDO" });
    expect(undone).toEqual(mid);
    expect(undone.manual.cumulativeBets).toEqual({ 0: 6, 1: 1, 2: 1 });
    expect(undone.manual.folded).toEqual([2]);
  });

  it("discard refunds the round, restarts it and can be undone", () => {
    const mid = play(MANUAL, start(), { type: "MANUAL_SET_BET", playerId: 0, amount: 9 }, { type: "MANUAL_SUBMIT" });
    const discarded = play(MANUAL, mid, { type: "MANUAL_DISCARD" });
    expect(discarded.round).toBe(1);
    expect(discarded.pot).toBe(3);
    expect(balances(discarded)).toEqual([-1, -1, -1]);
    expect(discarded.log.filter((l) => l.round === 1 && l.action === "manual")).toHaveLength(0);
    expect(play(MANUAL, discarded, { type: "UNDO" })).toEqual(mid);
  });

  it("remembers last iteration bets and fills drafts for players still in", () => {
    let s = play(
      MANUAL,
      start(),
      { type: "MANUAL_SET_BET", playerId: 0, amount: 4 },
      { type: "MANUAL_SET_BET", playerId: 1, amount: 6 },
      { type: "MANUAL_SUBMIT" }
    );
    expect(manualLastBets(s)).toEqual({ 0: 4, 1: 6 });
    s = play(MANUAL, s, { type: "MANUAL_TOGGLE_FOLD", playerId: 1 }, { type: "MANUAL_FILL", bets: { 0: 4, 1: 6, 2: 2 } });
    expect(s.manual.bets).toEqual({ 0: 4, 1: 0, 2: 2 }); // folded player stays at 0
    expect(s.undo).toHaveLength(1); // drafting is not an undo step
  });

  it("ignores auto-mode actions", () => {
    const s = start();
    expect(reduceGame(MANUAL, s, { type: "BLIND" })).toBe(s);
  });
});

describe("normalizeSession", () => {
  it("migrates v1 sessions to the v2 shape", () => {
    const v1 = {
      id: "old",
      version: 1,
      names: ["A", "B", "C"],
      boot: 1,
      maxBet: 10,
      mode: "manual",
      createdAt: 1,
      updatedAt: 2,
      state: {
        players: [],
        pot: 3,
        currentStake: 1,
        turnIdx: 0,
        round: 1,
        history: [],
        log: [],
        actionsCount: 0,
        manualBets: { 0: 2 },
        manualIteration: 2,
        manualFolded: [1],
        manualCumulativeBets: { 0: 3 },
        manualRoundPot: 7,
        manualWinnerStep: false,
      },
    };
    const s = normalizeSession(v1, "completed")!;
    expect(s.version).toBe(2);
    expect(s.status).toBe("completed");
    expect(s.state.pot).toBe(7);
    expect(s.state.manual).toEqual({
      bets: { 0: 2 },
      iteration: 2,
      folded: [1],
      cumulativeBets: { 0: 3 },
      winnerStep: false,
    });
    expect(s.state.undo).toEqual([]);
  });

  it("rejects malformed data", () => {
    expect(normalizeSession(null)).toBeNull();
    expect(normalizeSession({ id: "x", names: [], state: {} })).toBeNull();
    expect(normalizeSession("garbage")).toBeNull();
  });
});
