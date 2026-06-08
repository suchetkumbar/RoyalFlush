import type { ActionLog, GameMode, Player, RoundRecord } from "./teenpatti";

export interface StoredGameState {
  players: Player[];
  pot: number;
  currentStake: number;
  turnIdx: number;
  round: number;
  history: RoundRecord[];
  log: ActionLog[];
  actionsCount: number;
  manualBets: Record<number, number>;
  manualIteration: number;
  manualFolded: number[];
  manualCumulativeBets: Record<number, number>;
  manualRoundPot: number;
  manualWinnerStep: boolean;
}

export interface StoredSession {
  version: 1;
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  state: StoredGameState;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "royalflush-active-session";

const isBrowser = typeof window !== "undefined";

export function loadStoredSession(): StoredSession | null {
  if (!isBrowser) return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.names)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse stored session", error);
    return null;
  }
}

export function saveStoredSession(session: StoredSession) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Failed to save session", error);
  }
}

export function clearStoredSession() {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
