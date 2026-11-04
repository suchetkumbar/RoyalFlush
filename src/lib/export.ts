import { ActionLog, Player, Settlement } from "./teenpatti";
import type { StoredSession } from "./storage";

const escapeCsv = (value: unknown) => {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const getSessionJson = (session: StoredSession) => JSON.stringify(session, null, 2);

export const downloadSessionJson = (session: StoredSession) => {
  const day = new Date(session.createdAt).toISOString().slice(0, 10);
  downloadFile(`royalflush-${day}-${session.id.slice(0, 8)}.json`, getSessionJson(session), "application/json");
};

export const getActionLogCsv = (log: ActionLog[]) => {
  const rows: (string | number)[][] = [["Round", "Player", "Action", "Amount", "Note", "Timestamp"]];
  return rows
    .concat(
      log.map((entry) => [
        entry.round,
        entry.playerName,
        entry.action,
        entry.amount ?? "",
        entry.note ?? "",
        new Date(entry.ts).toISOString(),
      ])
    )
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

export const downloadActionLogCsv = (log: ActionLog[]) => {
  downloadFile("royalflush-action-log.csv", getActionLogCsv(log), "text/csv;charset=utf-8;");
};

export const getPlayersCsv = (players: Player[]) => {
  const rows: (string | number)[][] = [["Name", "Balance", "Status", "Total Bet This Round"]];
  return rows
    .concat(
      players.map((player) => [
        player.name,
        player.balance,
        player.status,
        player.totalBetThisRound,
      ])
    )
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

export const downloadPlayersCsv = (players: Player[]) => {
  downloadFile("royalflush-players.csv", getPlayersCsv(players), "text/csv;charset=utf-8;");
};

export const copySessionJson = async (session: StoredSession) => {
  await navigator.clipboard.writeText(getSessionJson(session));
};

const money = (n: number) => `${n < 0 ? "-" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;

/** Plain-text summary for WhatsApp/SMS: standings plus who pays whom. */
export const getSettlementText = (
  players: Player[],
  settlements: Settlement[],
  rounds: number,
  date: Date = new Date()
): string => {
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const standings = [...players]
    .sort((a, b) => b.balance - a.balance)
    .map((p) => `  ${p.name}: ${p.balance > 0 ? "+" : ""}${money(p.balance)}`);
  const payments = settlements.length
    ? settlements.map((s) => `  ${s.from} → ${s.to}: ${money(s.amount)}`)
    : ["  Everyone is even."];
  return [
    `RoyalFlush · ${day} · ${rounds} round${rounds === 1 ? "" : "s"}`,
    "",
    "Standings",
    ...standings,
    "",
    "Settle up",
    ...payments,
  ].join("\n");
};
