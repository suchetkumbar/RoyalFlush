// Pure game engine: every state transition of a RoyalFlush session lives here.
// The UI dispatches actions; this module owns the rules, balances, log, and undo stack.
import {
  getRoundStarterIndex,
  type ActionLog,
  type GameMode,
  type HandType,
  type Player,
  type RoundRecord,
} from "./teenpatti";

export interface GameConfig {
  boot: number;
  maxBet: number;
  mode: GameMode;
}

export interface ManualState {
  /** Draft bets for the current iteration (not yet committed). */
  bets: Record<number, number>;
  iteration: number;
  /** Player ids folded this round — committed folds plus draft folds for the current iteration. */
  folded: number[];
  /** Total committed per player this round, including boot. */
  cumulativeBets: Record<number, number>;
  winnerStep: boolean;
}

export interface GameCore {
  players: Player[];
  pot: number;
  currentStake: number;
  turnIdx: number;
  round: number;
  history: RoundRecord[];
  log: ActionLog[];
  actionsCount: number;
  manual: ManualState;
}

export interface UndoEntry {
  label: string;
  state: GameCore;
}

export interface GameState extends GameCore {
  undo: UndoEntry[];
}

export const UNDO_LIMIT = 30;

type Stamp = { ts?: number };

export type GameAction = Stamp &
  (
    | { type: "BLIND" }
    | { type: "SEE" }
    | { type: "CALL" }
    | { type: "RAISE"; amount: number }
    | { type: "FOLD" }
    | { type: "SHOW" }
    | { type: "AWARD"; winnerId: number; hand: HandType }
    | { type: "MANUAL_SET_BET"; playerId: number; amount: number }
    | { type: "MANUAL_FILL"; bets: Record<number, number> }
    | { type: "MANUAL_TOGGLE_FOLD"; playerId: number }
    | { type: "MANUAL_SUBMIT" }
    | { type: "MANUAL_WINNER_STEP"; open: boolean }
    | { type: "MANUAL_AWARD"; winnerId: number; hand: HandType }
    | { type: "MANUAL_DISCARD" }
    | { type: "UNDO" }
  );

// ---------- helpers ----------

type NewLogEntry = Omit<ActionLog, "id">;

const appendLog = (log: ActionLog[], entries: NewLogEntry[]): ActionLog[] => [
  ...log,
  ...entries.map((entry, i) => ({ ...entry, id: `${entry.ts}-${log.length + i}-${entry.action}` })),
];

const toCore = (state: GameState): GameCore => {
  const { undo: _undo, ...core } = state;
  return core;
};

const withUndo = (prev: GameState, next: GameCore, label: string): GameState => ({
  ...next,
  undo: [...prev.undo, { label, state: toCore(prev) }].slice(-UNDO_LIMIT),
});

const freshManual = (players: Player[], boot: number): ManualState => ({
  bets: Object.fromEntries(players.map((p) => [p.id, 0])),
  iteration: 1,
  folded: [],
  cumulativeBets: Object.fromEntries(players.map((p) => [p.id, boot])),
  winnerStep: false,
});

export function startRound(
  config: GameConfig,
  base: Player[],
  round: number,
  history: RoundRecord[],
  log: ActionLog[],
  ts: number
): GameCore {
  const { boot } = config;
  const players = base.map((p) => ({
    ...p,
    status: "blind" as const,
    totalBetThisRound: boot,
    balance: p.balance - boot,
  }));
  return {
    players,
    pot: boot * players.length,
    currentStake: Math.max(1, boot),
    turnIdx: getRoundStarterIndex(round, players.length),
    round,
    history,
    actionsCount: 0,
    log: appendLog(
      log,
      players.map((p) => ({ ts, round, playerName: p.name, action: "boot" as const, amount: boot }))
    ),
    manual: freshManual(players, boot),
  };
}

export function createGame(config: GameConfig, names: string[], ts = Date.now()): GameState {
  const players: Player[] = names.map((name, id) => ({
    id,
    name,
    status: "blind",
    balance: 0,
    totalBetThisRound: 0,
  }));
  return { ...startRound(config, players, 1, [], [], ts), undo: [] };
}

// ---------- derived values (also used by the UI) ----------

export const currentPlayer = (s: GameCore): Player | undefined => s.players[s.turnIdx];

export const activePlayers = (s: GameCore): Player[] =>
  s.players.filter((p) => p.status !== "folded");

/** Players still in the manual round (excludes draft folds). */
export const manualActivePlayers = (s: GameCore): Player[] => {
  const folded = new Set(s.manual.folded);
  return s.players.filter((p) => !folded.has(p.id));
};

export const callAmount = (config: GameConfig, s: GameCore, player: Player): number => {
  const raw =
    player.status === "seen"
      ? s.currentStake
      : Math.max(config.boot, Math.floor(s.currentStake / 2));
  return Math.min(raw, config.maxBet);
};

export const raiseMin = (config: GameConfig, s: GameCore, player: Player): number =>
  Math.min(callAmount(config, s, player) * 2, config.maxBet);

export const nextTurn = (from: number, players: Player[]): number => {
  let idx = from;
  for (let i = 0; i < players.length; i += 1) {
    idx = (idx + 1) % players.length;
    if (players[idx].status !== "folded") return idx;
  }
  return idx;
};

export function canShow(config: GameConfig, s: GameCore): { ok: boolean; reason?: string } {
  const player = currentPlayer(s);
  if (config.mode !== "auto" || !player) return { ok: false, reason: "Show is only available in Auto mode" };
  if (activePlayers(s).length !== 2) return { ok: false, reason: "Show only when 2 players remain" };
  if (player.status !== "seen") return { ok: false, reason: "Only seen players can request show" };
  if (s.actionsCount < s.players.length && s.turnIdx === getRoundStarterIndex(s.round, s.players.length)) {
    return { ok: false, reason: "The round starter cannot show in the first rotation" };
  }
  let prev = s.turnIdx;
  for (let i = 0; i < s.players.length; i += 1) {
    prev = (prev - 1 + s.players.length) % s.players.length;
    if (s.players[prev].status !== "folded") break;
  }
  if (s.players[prev].status === "blind") return { ok: false, reason: "Cannot show against a blind player" };
  return { ok: true };
}

export function raiseError(config: GameConfig, s: GameCore, amount: number): string | null {
  const player = currentPlayer(s);
  if (!player) return "No active player";
  if (!Number.isFinite(amount) || amount > config.maxBet) return `Max bet is ${config.maxBet}`;
  const min = raiseMin(config, s, player);
  if (amount < min) return `Min raise is ${min}`;
  return null;
}

export function manualSubmitError(s: GameCore): string | null {
  const folded = new Set(s.manual.folded);
  if (s.players.every((p) => folded.has(p.id))) return "At least one player must stay in";
  const hasNewFolds = s.players.some((p) => folded.has(p.id) && p.status !== "folded");
  const anyBet = s.players.some((p) => !folded.has(p.id) && (s.manual.bets[p.id] ?? 0) > 0);
  if (!hasNewFolds && !anyBet) return "Enter at least one positive bet or fold a player";
  return null;
}

/** Sum of the draft bets in the current manual iteration. */
export const manualDraftTotal = (s: GameCore): number => {
  const folded = new Set(s.manual.folded);
  return s.players.reduce((sum, p) => sum + (folded.has(p.id) ? 0 : s.manual.bets[p.id] ?? 0), 0);
};

/** Each player's committed bet in the previous iteration of the current round (for "repeat last"). */
export const manualLastBets = (s: GameCore): Record<number, number> => {
  const previous = `Iteration ${s.manual.iteration - 1}`;
  const byName = new Map(s.players.map((p) => [p.name, p.id]));
  const out: Record<number, number> = {};
  for (const entry of s.log) {
    if (entry.round !== s.round || entry.action !== "manual" || entry.note !== previous) continue;
    const id = byName.get(entry.playerName);
    if (id !== undefined) out[id] = entry.amount ?? 0;
  }
  return out;
};

// ---------- transitions ----------

const applyBet = (s: GameCore, idx: number, amount: number): GameCore => ({
  ...s,
  pot: s.pot + amount,
  players: s.players.map((p, i) =>
    i === idx ? { ...p, balance: p.balance - amount, totalBetThisRound: p.totalBetThisRound + amount } : p
  ),
});

const advanceTurn = (s: GameCore, newStake?: number): GameCore => ({
  ...s,
  actionsCount: s.actionsCount + 1,
  currentStake: newStake ?? s.currentStake,
  turnIdx: nextTurn(s.turnIdx, s.players),
});

const log1 = (s: GameCore, entry: Omit<NewLogEntry, "round">): GameCore => ({
  ...s,
  log: appendLog(s.log, [{ ...entry, round: s.round }]),
});

/** Award the pot to the winner, record history, and begin the next round. */
function awardAndAdvance(
  config: GameConfig,
  s: GameCore,
  winnerId: number,
  hand: HandType,
  participants: number,
  ts: number
): GameCore {
  const winner = s.players.find((p) => p.id === winnerId)!;
  const players = s.players.map((p) => (p.id === winnerId ? { ...p, balance: p.balance + s.pot } : p));
  const log = appendLog(s.log, [
    { ts, round: s.round, playerName: winner.name, action: "win", amount: s.pot, note: hand },
  ]);
  const history = [
    ...s.history,
    { round: s.round, winnerName: winner.name, handType: hand, pot: s.pot, players: participants || 1 },
  ];
  return startRound(config, players, s.round + 1, history, log, ts);
}

export function reduceGame(config: GameConfig, state: GameState, action: GameAction): GameState {
  const ts = action.ts ?? Date.now();
  const s = toCore(state);
  const player = currentPlayer(s);
  const auto = config.mode === "auto";

  switch (action.type) {
    case "BLIND": {
      if (!auto || !player || player.status !== "blind") return state;
      const amount = callAmount(config, s, player);
      const next = log1(applyBet(s, s.turnIdx, amount), { ts, playerName: player.name, action: "blind", amount });
      return withUndo(state, advanceTurn(next), `${player.name} blind`);
    }
    case "SEE": {
      if (!auto || !player || player.status !== "blind") return state;
      const next = log1(
        { ...s, players: s.players.map((p, i) => (i === s.turnIdx ? { ...p, status: "seen" as const } : p)) },
        { ts, playerName: player.name, action: "see" }
      );
      return withUndo(state, next, `${player.name} see`);
    }
    case "CALL": {
      if (!auto || !player || player.status !== "seen") return state;
      const amount = callAmount(config, s, player);
      const next = log1(applyBet(s, s.turnIdx, amount), { ts, playerName: player.name, action: "call", amount });
      return withUndo(state, advanceTurn(next, amount), `${player.name} call`);
    }
    case "RAISE": {
      if (!auto || !player || player.status === "folded") return state;
      if (raiseError(config, s, action.amount)) return state;
      const amount = action.amount;
      const newStake = player.status === "seen" ? amount : Math.min(amount * 2, config.maxBet);
      const next = log1(applyBet(s, s.turnIdx, amount), { ts, playerName: player.name, action: "raise", amount });
      return withUndo(state, advanceTurn(next, newStake), `${player.name} raise`);
    }
    case "FOLD": {
      if (!auto || !player || player.status === "folded") return state;
      const folded = log1(
        { ...s, players: s.players.map((p, i) => (i === s.turnIdx ? { ...p, status: "folded" as const } : p)) },
        { ts, playerName: player.name, action: "fold" }
      );
      return withUndo(state, advanceTurn(folded), `${player.name} fold`);
    }
    case "SHOW": {
      if (!player || !canShow(config, s).ok) return state;
      const amount = callAmount(config, s, player);
      const next = log1(applyBet(s, s.turnIdx, amount), { ts, playerName: player.name, action: "show", amount });
      return withUndo(state, next, `${player.name} show`);
    }
    case "AWARD": {
      if (!auto) return state;
      const winner = s.players.find((p) => p.id === action.winnerId);
      if (!winner || winner.status === "folded") return state;
      const next = awardAndAdvance(config, s, winner.id, action.hand, activePlayers(s).length, ts);
      return withUndo(state, next, `Round ${s.round} won by ${winner.name}`);
    }

    case "MANUAL_SET_BET": {
      if (auto) return state;
      const amount = Math.max(0, Math.floor(Number(action.amount) || 0));
      return { ...state, manual: { ...s.manual, bets: { ...s.manual.bets, [action.playerId]: amount } } };
    }
    case "MANUAL_FILL": {
      if (auto) return state;
      const folded = new Set(s.manual.folded);
      const bets = { ...s.manual.bets };
      for (const p of s.players) {
        if (folded.has(p.id)) continue;
        bets[p.id] = Math.max(0, Math.floor(Number(action.bets[p.id]) || 0));
      }
      return { ...state, manual: { ...s.manual, bets } };
    }
    case "MANUAL_TOGGLE_FOLD": {
      if (auto) return state;
      const target = s.players.find((p) => p.id === action.playerId);
      if (!target || target.status === "folded") return state; // committed folds are final (use Undo)
      const isFolded = s.manual.folded.includes(action.playerId);
      return {
        ...state,
        manual: {
          ...s.manual,
          folded: isFolded
            ? s.manual.folded.filter((id) => id !== action.playerId)
            : [...s.manual.folded, action.playerId],
          bets: { ...s.manual.bets, [action.playerId]: 0 },
        },
      };
    }
    case "MANUAL_SUBMIT": {
      if (auto || manualSubmitError(s)) return state;
      const folded = new Set(s.manual.folded);
      const iteration = s.manual.iteration;
      const cumulativeBets = { ...s.manual.cumulativeBets };
      let iterationPot = 0;
      const betEntries: NewLogEntry[] = [];
      const foldEntries: NewLogEntry[] = [];

      const players = s.players.map((p) => {
        const bet = folded.has(p.id) ? 0 : s.manual.bets[p.id] ?? 0;
        if (bet > 0) {
          cumulativeBets[p.id] = (cumulativeBets[p.id] ?? 0) + bet;
          iterationPot += bet;
          betEntries.push({ ts, round: s.round, playerName: p.name, action: "manual", amount: bet, note: `Iteration ${iteration}` });
        }
        if (folded.has(p.id) && p.status !== "folded") {
          foldEntries.push({ ts, round: s.round, playerName: p.name, action: "fold", note: `Iteration ${iteration}` });
        }
        return {
          ...p,
          balance: p.balance - bet,
          totalBetThisRound: cumulativeBets[p.id] ?? 0,
          status: folded.has(p.id) ? ("folded" as const) : ("blind" as const),
        };
      });

      const next: GameCore = {
        ...s,
        players,
        pot: s.pot + iterationPot,
        log: appendLog(s.log, [...betEntries, ...foldEntries]),
        manual: {
          ...s.manual,
          iteration: iteration + 1,
          cumulativeBets,
          bets: Object.fromEntries(players.filter((p) => !folded.has(p.id)).map((p) => [p.id, 0])),
        },
      };

      const remaining = players.filter((p) => !folded.has(p.id));
      const result =
        remaining.length === 1
          ? awardAndAdvance(config, next, remaining[0].id, "Unknown", 1, ts)
          : next;
      return withUndo(state, result, `Iteration ${iteration}`);
    }
    case "MANUAL_WINNER_STEP": {
      if (auto) return state;
      return { ...state, manual: { ...s.manual, winnerStep: action.open } };
    }
    case "MANUAL_AWARD": {
      if (auto || s.pot <= 0) return state;
      const winner = s.players.find((p) => p.id === action.winnerId);
      if (!winner || s.manual.folded.includes(winner.id)) return state;
      const next = awardAndAdvance(config, s, winner.id, action.hand, manualActivePlayers(s).length, ts);
      return withUndo(state, next, `Round ${s.round} won by ${winner.name}`);
    }
    case "MANUAL_DISCARD": {
      if (auto) return state;
      const refunded = s.players.map((p) => ({
        ...p,
        balance: p.balance + (s.manual.cumulativeBets[p.id] ?? 0),
        totalBetThisRound: 0,
      }));
      const log = s.log.filter((entry) => entry.round !== s.round);
      const next = startRound(config, refunded, s.round, s.history, log, ts);
      return withUndo(state, next, `Discard round ${s.round}`);
    }
    case "UNDO": {
      const last = state.undo[state.undo.length - 1];
      if (!last) return state;
      return { ...last.state, undo: state.undo.slice(0, -1) };
    }
    default:
      return state;
  }
}
