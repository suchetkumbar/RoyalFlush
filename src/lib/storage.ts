import type { GameState, ManualState } from "./game";
import type { ActionLog, GameMode, Player, RoundRecord, Settlement } from "./teenpatti";

export type SessionStatus = "active" | "completed";

export interface StoredSession {
  id: string;
  version: 2;
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  status: SessionStatus;
  state: GameState;
  createdAt: number;
  updatedAt: number;
  endedAt?: number;
  /** Final standings after the unfinished round was refunded (completed sessions only). */
  final?: { players: Player[]; settlements: Settlement[] };
}

/** Shape written by app versions before the game engine refactor. */
interface StoredSessionV1 {
  id: string;
  version: 1;
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  createdAt: number;
  updatedAt: number;
  state: {
    players: Player[];
    pot: number;
    currentStake: number;
    turnIdx: number;
    round: number;
    history: RoundRecord[];
    log: ActionLog[];
    actionsCount: number;
    manualBets?: Record<number, number>;
    manualIteration?: number;
    manualFolded?: number[];
    manualCumulativeBets?: Record<number, number>;
    manualRoundPot?: number;
    manualWinnerStep?: boolean;
  };
}

const DB_NAME = "royalflush-db";
const DB_VERSION = 1;
const ACTIVE_STORE = "activeSession";
const HISTORY_STORE = "sessionHistory";
const STORAGE_KEY = "royalflush-active-session";
const HISTORY_KEY = "royalflush-session-history";
/** Undo entries kept when persisting (each is a full state copy). */
const PERSISTED_UNDO = 10;

const isBrowser = typeof window !== "undefined";
const hasIndexedDb = () => isBrowser && !!window.indexedDB;

// ---------- validation & migration ----------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const hasCoreArrays = (state: unknown) =>
  isObject(state) && Array.isArray(state.players) && Array.isArray(state.log) && Array.isArray(state.history);

/**
 * Validate and upgrade a raw stored value to the current session format.
 * Returns null for anything malformed so callers can fall back cleanly.
 */
export function normalizeSession(raw: unknown, fallbackStatus: SessionStatus = "active"): StoredSession | null {
  if (!isObject(raw) || typeof raw.id !== "string" || !Array.isArray(raw.names)) return null;
  if (!hasCoreArrays(raw.state)) return null;

  if (raw.version === 2) {
    const session = raw as unknown as StoredSession;
    if (!isObject(session.state.manual)) return null;
    return { ...session, status: session.status ?? fallbackStatus, state: { ...session.state, undo: session.state.undo ?? [] } };
  }

  const v1 = raw as unknown as StoredSessionV1;
  const st = v1.state;
  const manual: ManualState = {
    bets: st.manualBets ?? {},
    iteration: st.manualIteration ?? 1,
    folded: st.manualFolded ?? [],
    cumulativeBets: st.manualCumulativeBets ?? {},
    winnerStep: st.manualWinnerStep ?? false,
  };
  return {
    id: v1.id,
    version: 2,
    names: v1.names,
    boot: v1.boot,
    maxBet: v1.maxBet,
    mode: v1.mode,
    status: fallbackStatus,
    createdAt: v1.createdAt,
    updatedAt: v1.updatedAt,
    state: {
      players: st.players,
      pot: v1.mode === "manual" ? st.manualRoundPot ?? st.pot : st.pot,
      currentStake: st.currentStake,
      turnIdx: st.turnIdx,
      round: st.round,
      history: st.history,
      log: st.log,
      actionsCount: st.actionsCount,
      manual,
      undo: [],
    },
  };
}

const trimForStorage = (session: StoredSession): StoredSession => ({
  ...session,
  state: { ...session.state, undo: session.state.undo.slice(-PERSISTED_UNDO) },
});

// ---------- IndexedDB plumbing ----------

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (!hasIndexedDb()) return Promise.reject(new Error("IndexedDB is not available"));
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACTIVE_STORE)) db.createObjectStore(ACTIVE_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(HISTORY_STORE)) db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
};

/** Run a request in a transaction; resolves with its result once the transaction commits. */
const run = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = callback(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? request.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
};

// ---------- localStorage fallback ----------

const readLocal = (key: string): unknown => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return null;
  }
};

const writeLocal = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key}`, error);
  }
};

const loadLocalHistory = (): StoredSession[] => {
  const parsed = readLocal(HISTORY_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((s) => normalizeSession(s, "completed")).filter((s): s is StoredSession => s !== null);
};

// ---------- active session ----------

export async function loadStoredSession(): Promise<StoredSession | null> {
  if (!isBrowser) return null;
  const local = () => normalizeSession(readLocal(STORAGE_KEY));
  if (!hasIndexedDb()) return local();

  try {
    const record = await run<{ key: string; value: unknown } | undefined>(ACTIVE_STORE, "readonly", (store) =>
      store.get("active")
    );
    // localStorage is read as a migration path for data written by older versions.
    return (record && normalizeSession(record.value)) ?? local();
  } catch (error) {
    console.warn("Failed to load stored session from IndexedDB", error);
    return local();
  }
}

export async function saveStoredSession(session: StoredSession) {
  if (!isBrowser) return;
  const value = trimForStorage(session);
  if (!hasIndexedDb()) {
    writeLocal(STORAGE_KEY, value);
    return;
  }
  try {
    await run(ACTIVE_STORE, "readwrite", (store) => store.put({ key: "active", value }));
    window.localStorage.removeItem(STORAGE_KEY); // drop legacy duplicate copy
  } catch (error) {
    console.warn("Failed to save session to IndexedDB; using localStorage", error);
    writeLocal(STORAGE_KEY, value);
  }
}

export async function clearStoredSession() {
  if (!isBrowser) return;
  if (hasIndexedDb()) {
    try {
      await run(ACTIVE_STORE, "readwrite", (store) => store.delete("active"));
    } catch (error) {
      console.warn("Failed to clear session from IndexedDB", error);
    }
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

// ---------- archived sessions ----------

export async function loadStoredSessionHistory(): Promise<StoredSession[]> {
  if (!isBrowser) return [];
  if (!hasIndexedDb()) return loadLocalHistory();

  try {
    const records = await run<unknown[]>(HISTORY_STORE, "readonly", (store) => store.getAll());
    const sessions = (records ?? [])
      .map((s) => normalizeSession(s, "completed"))
      .filter((s): s is StoredSession => s !== null);
    // Include sessions only ever written to the localStorage fallback.
    const ids = new Set(sessions.map((s) => s.id));
    return [...sessions, ...loadLocalHistory().filter((s) => !ids.has(s.id))];
  } catch (error) {
    console.warn("Failed to load session history from IndexedDB", error);
    return loadLocalHistory();
  }
}

export async function archiveStoredSession(session: StoredSession) {
  if (!isBrowser) return;
  const value = trimForStorage({ ...session, state: { ...session.state, undo: [] } });

  const archiveLocal = () => {
    const history = loadLocalHistory().filter((item) => item.id !== value.id);
    writeLocal(HISTORY_KEY, [value, ...history]);
  };

  if (!hasIndexedDb()) {
    archiveLocal();
    return;
  }
  try {
    await run(HISTORY_STORE, "readwrite", (store) => store.put(value));
  } catch (error) {
    console.warn("Failed to archive session to IndexedDB; using localStorage", error);
    archiveLocal();
  }
}

export async function deleteStoredSession(id: string) {
  if (!isBrowser) return;
  const local = loadLocalHistory();
  if (local.some((s) => s.id === id)) writeLocal(HISTORY_KEY, local.filter((s) => s.id !== id));
  if (!hasIndexedDb()) return;
  try {
    await run(HISTORY_STORE, "readwrite", (store) => store.delete(id));
  } catch (error) {
    console.warn("Failed to delete archived session from IndexedDB", error);
  }
}

export async function clearStoredSessionHistory() {
  if (!isBrowser) return;
  window.localStorage.removeItem(HISTORY_KEY);
  if (!hasIndexedDb()) return;
  try {
    await run(HISTORY_STORE, "readwrite", (store) => store.clear());
  } catch (error) {
    console.warn("Failed to clear session history from IndexedDB", error);
  }
}
