import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createGame, reduceGame, type GameAction, type GameConfig, type GameState } from "@/lib/game";
import {
  archiveStoredSession,
  clearStoredSession,
  deleteStoredSession,
  saveStoredSession,
  type StoredSession,
} from "@/lib/storage";
import {
  computeStats,
  prepareSessionClose,
  type ActionLog,
  type RoundRecord,
  settle,
  type GameMode,
  type Player,
  type PlayerStats,
  type Settlement,
} from "@/lib/teenpatti";

const SAVE_DEBOUNCE_MS = 250;

interface Options {
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  initialSession?: StoredSession | null;
}

export interface SessionResult {
  players: Player[];
  settlements: Settlement[];
  stats: PlayerStats[];
  /** Log of completed rounds only (unfinished round dropped). */
  log: ActionLog[];
  history: RoundRecord[];
  endedAt: number;
}

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useGame({ names, boot, maxBet, mode, initialSession }: Options) {
  const config = useMemo<GameConfig>(() => ({ boot, maxBet, mode }), [boot, maxBet, mode]);

  const [state, rawDispatch] = useReducer(
    (s: GameState, a: GameAction) => reduceGame(config, s, a),
    undefined,
    () => initialSession?.state ?? createGame(config, names)
  );
  const dispatch = useCallback((action: GameAction) => rawDispatch({ ...action, ts: action.ts ?? Date.now() }), []);

  const [sessionId] = useState(() => initialSession?.id ?? newId());
  const [createdAt] = useState(() => initialSession?.createdAt ?? Date.now());

  const session = useMemo<StoredSession>(
    () => ({
      id: sessionId,
      version: 2,
      names,
      boot,
      maxBet,
      mode,
      status: "active",
      createdAt,
      updatedAt: Date.now(),
      state,
    }),
    [sessionId, names, boot, maxBet, mode, createdAt, state]
  );

  // ---- debounced persistence, flushed when the page is hidden/closed ----
  const pending = useRef<StoredSession | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ended = useRef(false);
  /** Pending archive/clear from endSession, so resumeSession can run after it. */
  const endWrite = useRef<Promise<void>>(Promise.resolve());

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current && !ended.current) void saveStoredSession(pending.current);
    pending.current = null;
  }, []);

  useEffect(() => {
    if (ended.current || names.length === 0) return;
    pending.current = session;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [session, names.length, flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  /** Close the session: refund the unfinished round, archive, and clear the active slot. */
  const endSession = useCallback((): SessionResult => {
    const closed = prepareSessionClose(state.players, state.log, state.round);
    const settlements = settle(closed.players);
    const stats = computeStats(closed.players, closed.log, state.history);

    ended.current = true;
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;

    const now = Date.now();
    endWrite.current = archiveStoredSession({
      ...session,
      status: "completed",
      updatedAt: now,
      endedAt: now,
      state: { ...state, players: closed.players, log: closed.log, pot: 0, undo: [] },
      final: { players: closed.players, settlements },
    }).then(() => clearStoredSession());

    return { players: closed.players, settlements, stats, log: closed.log, history: state.history, endedAt: now };
  }, [session, state]);

  /** Undo an End: drop the archived copy and make this the active game again. */
  const resumeSession = useCallback(async () => {
    await endWrite.current;
    ended.current = false;
    await deleteStoredSession(session.id);
    await saveStoredSession({ ...session, updatedAt: Date.now() });
  }, [session]);

  return { config, state, dispatch, session, endSession, resumeSession };
}
