import { z } from "zod";
import { normalizeSession, type StoredSession } from "./storage";
import { HAND_TYPES } from "./teenpatti";

/** Exports are a few hundred KB at most; refuse anything absurd before parsing. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const money = z.number().finite().min(-1e9).max(1e9);
const name = z.string().min(1).max(40);

const player = z.object({
  id: z.number().int().min(0).max(100),
  name,
  status: z.enum(["blind", "seen", "folded"]),
  balance: money,
  totalBetThisRound: money,
});

const logEntry = z.object({
  id: z.string().max(200),
  round: z.number().int().min(0),
  playerName: name,
  action: z.enum(["boot", "blind", "see", "call", "raise", "fold", "show", "manual", "win"]),
  amount: money.optional(),
  note: z.string().max(200).optional(),
  ts: z.number().finite(),
});

const round = z.object({
  round: z.number().int().min(0),
  winnerName: name,
  handType: z.enum(HAND_TYPES as [string, ...string[]]),
  pot: money,
  players: z.number().int().min(0).max(100),
});

const idMap = z.record(z.string(), money);

const sessionSchema = z.object({
  id: z.string().min(1).max(100),
  version: z.literal(2),
  names: z.array(name).min(2).max(15),
  boot: z.number().int().min(0).max(1e6),
  maxBet: z.number().int().min(1).max(1e9),
  mode: z.enum(["auto", "manual"]),
  status: z.enum(["active", "completed"]),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
  endedAt: z.number().finite().optional(),
  state: z.object({
    players: z.array(player).min(2).max(15),
    pot: money,
    currentStake: money,
    turnIdx: z.number().int().min(0),
    round: z.number().int().min(0),
    history: z.array(round).max(10000),
    log: z.array(logEntry).max(200000),
    actionsCount: z.number().int().min(0),
    manual: z.object({
      bets: idMap,
      iteration: z.number().int().min(1),
      folded: z.array(z.number().int()),
      cumulativeBets: idMap,
      winnerStep: z.boolean(),
    }),
    undo: z.array(z.unknown()),
  }),
  final: z
    .object({
      players: z.array(player),
      settlements: z.array(z.object({ from: name, to: name, amount: money })),
    })
    .optional(),
});

export type ImportResult = { ok: true; session: StoredSession } | { ok: false; error: string };

/** Parse an exported session file. Accepts v1 and v2 exports; never trusts the content. */
export function parseSessionImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "File is too large to be a RoyalFlush export." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const normalized = normalizeSession(raw, "completed");
  if (!normalized) return { ok: false, error: "That file isn't a RoyalFlush session export." };

  const parsed = sessionSchema.safeParse(normalized);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Invalid session data at "${issue.path.join(".") || "root"}": ${issue.message}` };
  }
  const session = parsed.data as unknown as StoredSession;
  if (session.state.turnIdx >= session.state.players.length) {
    return { ok: false, error: "Invalid session data: turn points at a missing player." };
  }
  // Undo snapshots are not validated field-by-field; drop them rather than trust them.
  return { ok: true, session: { ...session, state: { ...session.state, undo: [] } } };
}
