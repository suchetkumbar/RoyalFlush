// Small user preferences kept in localStorage (not game data).
import type { GameMode } from "./teenpatti";

const DISCLAIMER_KEY = "royalflush-disclaimer-accepted";
const SETUP_KEY = "royalflush-last-setup";

export interface SetupPrefs {
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
}

const safeGet = (key: string): string | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full or blocked: preferences are optional */
  }
};

export const hasAcceptedDisclaimer = () => safeGet(DISCLAIMER_KEY) === "1";
export const acceptDisclaimer = () => safeSet(DISCLAIMER_KEY, "1");

export function loadSetupPrefs(): SetupPrefs | null {
  const raw = safeGet(SETUP_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<SetupPrefs>;
    if (!Array.isArray(p.names) || !p.names.every((n) => typeof n === "string")) return null;
    return {
      names: p.names.slice(0, 15),
      boot: Number.isFinite(p.boot) ? Number(p.boot) : 1,
      maxBet: Number.isFinite(p.maxBet) ? Number(p.maxBet) : 100,
      mode: p.mode === "manual" ? "manual" : "auto",
    };
  } catch {
    return null;
  }
}

export const saveSetupPrefs = (prefs: SetupPrefs) => safeSet(SETUP_KEY, JSON.stringify(prefs));
