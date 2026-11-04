import { describe, expect, it } from "vitest";
import { createGame, reduceGame } from "./game";
import { getSessionJson } from "./export";
import { parseSessionImport } from "./importSession";
import type { StoredSession } from "./storage";

const exported = (): StoredSession => {
  const config = { boot: 1, maxBet: 10, mode: "auto" as const };
  let state = createGame(config, ["A", "B", "C"], 1);
  state = reduceGame(config, state, { type: "BLIND", ts: 2 });
  return {
    id: "abc",
    version: 2,
    names: ["A", "B", "C"],
    boot: 1,
    maxBet: 10,
    mode: "auto",
    status: "active",
    createdAt: 1,
    updatedAt: 2,
    state,
  };
};

describe("parseSessionImport", () => {
  it("round-trips an export and drops untrusted undo snapshots", () => {
    const result = parseSessionImport(getSessionJson(exported()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.id).toBe("abc");
    expect(result.session.state.players).toHaveLength(3);
    expect(result.session.state.undo).toEqual([]);
  });

  it("rejects non-JSON, foreign JSON and tampered values", () => {
    expect(parseSessionImport("not json")).toMatchObject({ ok: false, error: expect.stringMatching(/valid JSON/) });
    expect(parseSessionImport('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/isn't a RoyalFlush/) });

    const bad = exported();
    (bad.state.players[0] as unknown as { balance: string }).balance = "lots";
    expect(parseSessionImport(JSON.stringify(bad))).toMatchObject({ ok: false, error: expect.stringMatching(/players\.0\.balance/) });

    const badTurn = exported();
    badTurn.state.turnIdx = 9;
    expect(parseSessionImport(JSON.stringify(badTurn)).ok).toBe(false);
  });

  it("rejects oversized input before parsing", () => {
    expect(parseSessionImport(" ".repeat(5 * 1024 * 1024 + 1))).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) });
  });
});
