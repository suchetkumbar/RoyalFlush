import { describe, expect, it } from "vitest";
import { computeStats, prepareSessionClose, settle, type ActionLog, type Player, type RoundRecord } from "./teenpatti";

describe("prepareSessionClose", () => {
  it("refunds the unfinished round before settlement", () => {
    const players: Player[] = [
      { id: 0, name: "Ayush", status: "blind", balance: 1, totalBetThisRound: 1 },
      { id: 1, name: "Aman", status: "blind", balance: 0, totalBetThisRound: 1 },
      { id: 2, name: "Suchet", status: "blind", balance: -4, totalBetThisRound: 1 },
    ];

    const { players: closedPlayers } = prepareSessionClose(players, [], 2);

    expect(closedPlayers.map((p) => p.balance)).toEqual([2, 1, -3]);
    expect(settle(closedPlayers)).toEqual([
      { from: "Suchet", to: "Ayush", amount: 2 },
      { from: "Suchet", to: "Aman", amount: 1 },
    ]);
  });

  it("drops unfinished-round log entries from stats", () => {
    const players: Player[] = [
      { id: 0, name: "Ayush", status: "blind", balance: 1, totalBetThisRound: 1 },
      { id: 1, name: "Aman", status: "blind", balance: 0, totalBetThisRound: 1 },
      { id: 2, name: "Suchet", status: "blind", balance: -4, totalBetThisRound: 1 },
    ];
    const log: ActionLog[] = [
      { id: "r1-ayush-boot", round: 1, playerName: "Ayush", action: "boot", amount: 1, ts: 1 },
      { id: "r1-aman-boot", round: 1, playerName: "Aman", action: "boot", amount: 1, ts: 1 },
      { id: "r1-suchet-boot", round: 1, playerName: "Suchet", action: "boot", amount: 1, ts: 1 },
      { id: "r1-ayush-win", round: 1, playerName: "Ayush", action: "win", amount: 3, ts: 2 },
      { id: "r2-ayush-boot", round: 2, playerName: "Ayush", action: "boot", amount: 1, ts: 3 },
      { id: "r2-aman-boot", round: 2, playerName: "Aman", action: "boot", amount: 1, ts: 3 },
      { id: "r2-suchet-boot", round: 2, playerName: "Suchet", action: "boot", amount: 1, ts: 3 },
    ];
    const history: RoundRecord[] = [
      { round: 1, winnerName: "Ayush", handType: "Unknown", pot: 3, players: 3 },
    ];

    const closedSession = prepareSessionClose(players, log, 2);
    const stats = computeStats(closedSession.players, closedSession.log, history);

    expect(stats.find((p) => p.name === "Ayush")?.roundsPlayed).toBe(1);
    expect(stats.find((p) => p.name === "Aman")?.roundsPlayed).toBe(1);
    expect(stats.find((p) => p.name === "Suchet")?.roundsPlayed).toBe(1);
  });
});
