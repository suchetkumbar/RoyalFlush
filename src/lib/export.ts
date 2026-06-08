import { ActionLog, Player } from "./teenpatti";
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
  downloadFile("royalflush-session.json", getSessionJson(session), "application/json");
};

export const getActionLogCsv = (log: ActionLog[]) => {
  const rows = [["Round", "Player", "Action", "Amount", "Note", "Timestamp"]];
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
  const rows = [["Name", "Balance", "Status", "Total Bet This Round"]];
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
