// Teen Patti tally tracker — no card logic, just bets & balances

export type PlayerStatus = "blind" | "seen" | "folded";

export interface Player {
  id: number;
  name: string;
  status: PlayerStatus;
  balance: number;          // running net (₹). starts at 0, can go negative
  totalBetThisRound: number;
}

export type HandType =
  | "Trail"
  | "Pure Sequence"
  | "Sequence"
  | "Color"
  | "Pair"
  | "High Card"
  | "Unknown";

export const HAND_TYPES: HandType[] = [
  "Trail",
  "Pure Sequence",
  "Sequence",
  "Color",
  "Pair",
  "High Card",
  "Unknown",
];

export type ActionType =
  | "boot"
  | "blind"
  | "see"
  | "call"
  | "raise"
  | "fold"
  | "show"
  | "win";

export interface ActionLog {
  id: string;
  round: number;
  playerName: string;
  action: ActionType;
  amount?: number;
  note?: string;
  ts: number;
}

export interface RoundRecord {
  round: number;
  winnerName: string;
  handType: HandType;
  pot: number;
  players: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Compute who pays whom from final balances.
 * Sum of balances should be ~0. We greedily match the most-positive with the most-negative.
 */
export function settle(players: Player[]): Settlement[] {
  const debtors = players
    .filter((p) => p.balance < 0)
    .map((p) => ({ name: p.name, amt: -p.balance }))
    .sort((a, b) => b.amt - a.amt);
  const creditors = players
    .filter((p) => p.balance > 0)
    .map((p) => ({ name: p.name, amt: p.balance }))
    .sort((a, b) => b.amt - a.amt);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) out.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return out;
}

export interface PlayerStats {
  name: string;
  net: number;
  roundsPlayed: number;
  wins: number;
  folds: number;
  shows: number;
  raises: number;
  timesSeen: number;
  totalWagered: number;
  biggestPotWon: number;
  bestHand: HandType | "—";
  longestWinStreak: number;
  foldRate: number;
  winRate: number;
}

export function computeStats(
  players: Player[],
  log: ActionLog[],
  history: RoundRecord[]
): PlayerStats[] {
  const handRank: Record<string, number> = {
    "High Card": 1, Pair: 2, Color: 3, Sequence: 4,
    "Pure Sequence": 5, Trail: 6, Unknown: 0,
  };

  return players.map((p) => {
    const myLog = log.filter((l) => l.playerName === p.name);
    const wagered = myLog
      .filter((l) => ["boot", "blind", "call", "raise", "show"].includes(l.action))
      .reduce((s, l) => s + (l.amount || 0), 0);
    const folds = myLog.filter((l) => l.action === "fold").length;
    const shows = myLog.filter((l) => l.action === "show").length;
    const raises = myLog.filter((l) => l.action === "raise").length;
    const timesSeen = myLog.filter((l) => l.action === "see").length;

    const myWins = history.filter((h) => h.winnerName === p.name);
    const wins = myWins.length;
    const biggestPotWon = myWins.reduce((m, h) => Math.max(m, h.pot), 0);
    const bestHand = myWins.reduce<HandType | "—">((best, h) => {
      if (best === "—") return h.handType;
      return handRank[h.handType] > handRank[best] ? h.handType : best;
    }, "—");

    const roundsPlayed = new Set(myLog.map((l) => l.round)).size;

    let streak = 0;
    let longest = 0;
    history.forEach((h) => {
      if (h.winnerName === p.name) {
        streak++;
        if (streak > longest) longest = streak;
      } else {
        streak = 0;
      }
    });

    return {
      name: p.name,
      net: p.balance,
      roundsPlayed,
      wins,
      folds,
      shows,
      raises,
      timesSeen,
      totalWagered: wagered,
      biggestPotWon,
      bestHand,
      longestWinStreak: longest,
      foldRate: roundsPlayed ? folds / roundsPlayed : 0,
      winRate: roundsPlayed ? wins / roundsPlayed : 0,
    };
  });
}
