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
  id: string;
  version: 1;
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  state: StoredGameState;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "royalflush-db";
const DB_VERSION = 1;
const ACTIVE_STORE = "activeSession";
const HISTORY_STORE = "sessionHistory";
const STORAGE_KEY = "royalflush-active-session";
const HISTORY_KEY = "royalflush-session-history";

const isBrowser = typeof window !== "undefined";

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!isBrowser || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACTIVE_STORE)) {
        db.createObjectStore(ACTIVE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withObjectStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = callback(store);
  return requestToPromise(result);
};

const loadStoredSessionFromLocalStorage = (): StoredSession | null => {
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
};

const loadStoredSessionHistoryFromLocalStorage = (): StoredSession[] => {
  if (!isBrowser) return [];

  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn("Failed to parse session history", error);
    return [];
  }
};

export async function loadStoredSession(): Promise<StoredSession | null> {
  if (!isBrowser) return null;

  if (!window.indexedDB) {
    return loadStoredSessionFromLocalStorage();
  }

  try {
    const record = await withObjectStore<{ key: string; value: StoredSession } | undefined>(
      ACTIVE_STORE,
      "readonly",
      (store) => store.get("active")
    );
    return record?.value ?? loadStoredSessionFromLocalStorage();
  } catch (error) {
    console.warn("Failed to load stored session from IndexedDB", error);
    return loadStoredSessionFromLocalStorage();
  }
}

export async function saveStoredSession(session: StoredSession) {
  if (!isBrowser) return;

  if (!window.indexedDB) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn("Failed to save session to localStorage", error);
    }
    return;
  }

  try {
    await withObjectStore<void>(ACTIVE_STORE, "readwrite", (store) =>
      store.put({ key: "active", value: session })
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Failed to save session to IndexedDB", error);
  }
}

export async function clearStoredSession() {
  if (!isBrowser) return;

  if (window.indexedDB) {
    try {
      await withObjectStore<void>(ACTIVE_STORE, "readwrite", (store) => store.delete("active"));
    } catch (error) {
      console.warn("Failed to clear session from IndexedDB", error);
    }
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function loadStoredSessionHistory(): Promise<StoredSession[]> {
  if (!isBrowser) return [];

  if (!window.indexedDB) {
    return loadStoredSessionHistoryFromLocalStorage();
  }

  try {
    const records = await withObjectStore<StoredSession[]>(HISTORY_STORE, "readonly", (store) => store.getAll());
    return records ?? [];
  } catch (error) {
    console.warn("Failed to load session history from IndexedDB", error);
    return loadStoredSessionHistoryFromLocalStorage();
  }
}

export async function saveStoredSessionHistory(sessions: StoredSession[]) {
  if (!isBrowser) return;

  if (!window.indexedDB) {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.warn("Failed to save session history to localStorage", error);
    }
    return;
  }

  try {
    const db = await openDb();
    const transaction = db.transaction(HISTORY_STORE, "readwrite");
    const store = transaction.objectStore(HISTORY_STORE);
    await Promise.all(sessions.map((session) => requestToPromise(store.put(session))));
  } catch (error) {
    console.warn("Failed to save session history to IndexedDB", error);
  }
}

export async function archiveStoredSession(session: StoredSession) {
  if (!isBrowser) return;

  if (!window.indexedDB) {
    try {
      const history = loadStoredSessionHistoryFromLocalStorage();
      const existingIndex = history.findIndex((item) => item.id === session.id);
      if (existingIndex >= 0) {
        history[existingIndex] = session;
      } else {
        history.unshift(session);
      }
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn("Failed to archive session to localStorage", error);
    }
    return;
  }

  try {
    await withObjectStore<void>(HISTORY_STORE, "readwrite", (store) => store.put(session));
  } catch (error) {
    console.warn("Failed to archive session to IndexedDB", error);
  }
}

export async function deleteStoredSession(id: string) {
  if (!isBrowser) return;

  if (!window.indexedDB) {
    try {
      const history = loadStoredSessionHistoryFromLocalStorage();
      const nextHistory = history.filter((session) => session.id !== id);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (error) {
      console.warn("Failed to delete archived session from localStorage", error);
    }
    return;
  }

  try {
    await withObjectStore<void>(HISTORY_STORE, "readwrite", (store) => store.delete(id));
  } catch (error) {
    console.warn("Failed to delete archived session from IndexedDB", error);
  }
}

export async function clearStoredSessionHistory() {
  if (!isBrowser) return;

  if (!window.indexedDB) {
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.warn("Failed to clear session history from localStorage", error);
    }
    return;
  }

  try {
    await withObjectStore<void>(HISTORY_STORE, "readwrite", (store) => store.clear());
  } catch (error) {
    console.warn("Failed to clear session history from IndexedDB", error);
  }
}
