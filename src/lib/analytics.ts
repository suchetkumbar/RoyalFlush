import type { StoredSession } from "@/lib/storage";

export interface PlayerStats {
  /** Display name (most recent spelling seen). */
  name: string;
  sessions: number;
  roundsPlayed: number;
  wins: number;
  losses: number;
  /** Percent of rounds won. */
  winRate: number;
  totalEarnings: number;
  /** Average pot size when this player won. */
  avgWinAmount: number;
  biggestSessionWin: number;
  biggestSessionLoss: number;
  handRankings: Record<string, number>;
}

export interface SessionAnalytics {
  totalSessions: number;
  totalRounds: number;
  players: PlayerStats[];
  topEarner: PlayerStats | null;
  topWinRate: PlayerStats | null;
  handRankingDistribution: Record<string, number>;
}

/** Below this many rounds a win rate is too noisy to crown anyone. */
export const MIN_ROUNDS_FOR_WIN_RATE = 5;

const STAKE_ACTIONS = new Set(["boot", "blind", "call", "raise", "show", "manual"]);

/** Same person across sessions regardless of case/spacing ("asha " == "Asha"). */
export const playerKey = (name: string) => name.trim().toLowerCase();

/** Net result per player for one session: final settled balances when available, else derived from the log. */
const sessionNets = (session: StoredSession): Map<string, number> => {
  const nets = new Map<string, number>();
  if (session.final?.players.length) {
    for (const p of session.final.players) nets.set(p.name, p.balance);
    return nets;
  }
  for (const name of session.names) nets.set(name, 0);
  for (const entry of session.state.log) {
    if (!nets.has(entry.playerName)) continue;
    const amount = entry.amount ?? 0;
    if (entry.action === "win") nets.set(entry.playerName, nets.get(entry.playerName)! + amount);
    else if (STAKE_ACTIONS.has(entry.action)) nets.set(entry.playerName, nets.get(entry.playerName)! - amount);
  }
  return nets;
};

export const computeAnalytics = (sessions: StoredSession[]): SessionAnalytics => {
  const byKey = new Map<string, PlayerStats & { potsWon: number; lastSeen: number }>();
  const handDistribution: Record<string, number> = {};
  let totalRounds = 0;

  const ordered = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
  for (const session of ordered) {
    const rounds = session.state.history.length;
    totalRounds += rounds;
    const nets = sessionNets(session);

    for (const name of session.names) {
      const key = playerKey(name);
      const stats =
        byKey.get(key) ??
        {
          name,
          sessions: 0,
          roundsPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalEarnings: 0,
          avgWinAmount: 0,
          biggestSessionWin: 0,
          biggestSessionLoss: 0,
          handRankings: {},
          potsWon: 0,
          lastSeen: 0,
        };
      const net = nets.get(name) ?? 0;
      stats.name = session.createdAt >= stats.lastSeen ? name : stats.name;
      stats.lastSeen = Math.max(stats.lastSeen, session.createdAt);
      stats.sessions += 1;
      stats.roundsPlayed += rounds;
      stats.totalEarnings += net;
      stats.biggestSessionWin = Math.max(stats.biggestSessionWin, net);
      stats.biggestSessionLoss = Math.min(stats.biggestSessionLoss, net);
      byKey.set(key, stats);
    }

    for (const round of session.state.history) {
      handDistribution[round.handType] = (handDistribution[round.handType] ?? 0) + 1;
      const winner = byKey.get(playerKey(round.winnerName));
      if (!winner) continue;
      winner.wins += 1;
      winner.potsWon += round.pot;
      winner.handRankings[round.handType] = (winner.handRankings[round.handType] ?? 0) + 1;
    }
  }

  const players: PlayerStats[] = [...byKey.values()]
    .map(({ potsWon, lastSeen: _lastSeen, ...stats }) => ({
      ...stats,
      losses: stats.roundsPlayed - stats.wins,
      winRate: stats.roundsPlayed > 0 ? (stats.wins / stats.roundsPlayed) * 100 : 0,
      avgWinAmount: stats.wins > 0 ? Math.round(potsWon / stats.wins) : 0,
    }))
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  const rateEligible = players.filter((p) => p.roundsPlayed >= MIN_ROUNDS_FOR_WIN_RATE);
  const topWinRate = [...(rateEligible.length ? rateEligible : players)].sort((a, b) => b.winRate - a.winRate)[0] ?? null;

  return {
    totalSessions: sessions.length,
    totalRounds,
    players,
    topEarner: players[0] ?? null,
    topWinRate,
    handRankingDistribution: handDistribution,
  };
};

export type DateRange = "all" | "30d" | "7d";

export const filterByRange = (sessions: StoredSession[], range: DateRange, now = Date.now()): StoredSession[] => {
  if (range === "all") return sessions;
  const days = range === "30d" ? 30 : 7;
  const since = now - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => (s.endedAt ?? s.updatedAt) >= since);
};
