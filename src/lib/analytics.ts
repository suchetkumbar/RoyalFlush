import type { StoredSession, RoundRecord, ActionLog, Player } from "@/lib/teenpatti";

export interface PlayerStats {
  name: string;
  totalEarnings: number;
  roundsPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  handRankings: Record<string, number>;
  avgWinAmount: number;
}

export interface SessionAnalytics {
  totalSessions: number;
  totalRounds: number;
  players: PlayerStats[];
  topEarner: PlayerStats | null;
  topWinRate: PlayerStats | null;
  handRankingDistribution: Record<string, number>;
}

const getSessionWinnings = (session: StoredSession, playerName: string): number => {
  const winEntries = session.state.log.filter(
    (entry) => entry.action === "win" && entry.playerName === playerName
  );
  return winEntries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
};

const getSessionBets = (session: StoredSession, playerName: string): number => {
  const betEntries = session.state.log.filter(
    (entry) =>
      (entry.action === "boot" || entry.action === "blind" || entry.action === "see" ||
        entry.action === "call" || entry.action === "raise" || entry.action === "manual") &&
      entry.playerName === playerName
  );
  return betEntries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
};

export const computeAnalytics = (sessions: StoredSession[]): SessionAnalytics => {
  const playerMap = new Map<string, PlayerStats>();
  let totalRounds = 0;
  const handDistribution: Record<string, number> = {};

  sessions.forEach((session) => {
    totalRounds += session.state.history.length;

    // Initialize players from this session
    session.names.forEach((name) => {
      if (!playerMap.has(name)) {
        playerMap.set(name, {
          name,
          totalEarnings: 0,
          roundsPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          handRankings: {},
          avgWinAmount: 0,
        });
      }
    });

    // Accumulate earnings and bets
    session.names.forEach((name) => {
      const stats = playerMap.get(name)!;
      const winnings = getSessionWinnings(session, name);
      const bets = getSessionBets(session, name);
      stats.totalEarnings += winnings - bets;
      stats.roundsPlayed += session.state.history.length;
    });

    // Count wins and hand rankings
    session.state.history.forEach((round) => {
      const stats = playerMap.get(round.winnerName);
      if (stats) {
        stats.wins += 1;
      }

      // Track hand ranking distribution
      handDistribution[round.handType] = (handDistribution[round.handType] ?? 0) + 1;

      // Track hand rankings per player
      const winnerStats = playerMap.get(round.winnerName);
      if (winnerStats) {
        winnerStats.handRankings[round.handType] =
          (winnerStats.handRankings[round.handType] ?? 0) + 1;
      }
    });

    // Count total rounds participated and calculate losses
    session.names.forEach((name) => {
      const stats = playerMap.get(name)!;
      stats.losses = stats.roundsPlayed - stats.wins;
    });
  });

  // Calculate win rates and avg win amounts
  playerMap.forEach((stats) => {
    stats.winRate = stats.roundsPlayed > 0 ? (stats.wins / stats.roundsPlayed) * 100 : 0;
    stats.avgWinAmount = stats.wins > 0 ? Math.round(stats.totalEarnings / stats.wins) : 0;
  });

  const players = Array.from(playerMap.values()).sort((a, b) => b.totalEarnings - a.totalEarnings);
  const topEarner = players.length > 0 ? players[0] : null;
  const topWinRate =
    players.length > 0 ? [...players].sort((a, b) => b.winRate - a.winRate)[0] : null;

  return {
    totalSessions: sessions.length,
    totalRounds,
    players,
    topEarner,
    topWinRate,
    handRankingDistribution: handDistribution,
  };
};
