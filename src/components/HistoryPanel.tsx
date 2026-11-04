import { useMemo, useState } from "react";
import { ChevronRight, ListOrdered, Trophy } from "lucide-react";
import type { ActionLog, ActionType, RoundRecord } from "@/lib/teenpatti";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatMoney } from "@/lib/utils";

interface Props {
  log: ActionLog[];
  history: RoundRecord[];
  playerNames: string[];
}

const actionLabel: Record<ActionType, string> = {
  boot: "Boot",
  blind: "Blind",
  see: "Saw cards",
  call: "Call",
  raise: "Raise",
  fold: "Folded",
  show: "Show",
  manual: "Bet",
  win: "Won pot",
};

const ALL = "__all__";

export const HistoryPanel = ({ log, history, playerNames }: Props) => {
  const [player, setPlayer] = useState(ALL);

  const rounds = useMemo(() => {
    const filtered = player === ALL ? log : log.filter((l) => l.playerName === player);
    const byRound = new Map<number, ActionLog[]>();
    for (const entry of filtered) {
      const list = byRound.get(entry.round) ?? [];
      list.push(entry);
      byRound.set(entry.round, list);
    }
    return [...byRound.entries()].sort(([a], [b]) => b - a).map(([round, entries]) => ({ round, entries: entries.reverse() }));
  }, [log, player]);

  const winners = useMemo(() => new Map(history.map((h) => [h.round, h])), [history]);
  const latestRound = rounds[0]?.round;

  return (
    <div className="h-full rounded-xl border border-border bg-gradient-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <ListOrdered className="h-3.5 w-3.5 text-brand" /> Action Log
        </h2>
        <Select value={player} onValueChange={setPlayer}>
          <SelectTrigger className="h-7 w-32 text-xs" aria-label="Filter log by player">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All players</SelectItem>
            {playerNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rounds.length === 0 ? (
        <p className="text-xs text-muted-foreground">No actions yet.</p>
      ) : (
        <ScrollArea className="h-72 pr-3 lg:h-[calc(100vh-14rem)]">
          <div className="space-y-2">
            {rounds.map(({ round, entries }) => {
              const result = winners.get(round);
              return (
                <details key={round} open={round === latestRound} className="group rounded-lg border border-border/60">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 text-xs font-semibold [&::-webkit-details-marker]:hidden">
                    <ChevronRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                    <span className="text-brand">Round {round}</span>
                    {result ? (
                      <span className="ml-auto flex min-w-0 items-center gap-1 font-normal text-muted-foreground">
                        <Trophy aria-hidden className="h-3 w-3 shrink-0 text-warn" />
                        <span className="truncate">{result.winnerName}</span>
                        <span className="tabular-nums text-success">+{formatMoney(result.pot)}</span>
                      </span>
                    ) : (
                      <span className="ml-auto font-normal text-muted-foreground">In progress</span>
                    )}
                  </summary>
                  <ul className="space-y-1 px-2 pb-2">
                    {entries.map((a) => (
                      <li key={a.id} className={cn("border-l-2 py-0.5 pl-2 text-xs", a.action === "win" ? "border-success" : "border-brand/40")}>
                        <div className="flex justify-between gap-2">
                          <span className="truncate font-medium">{a.playerName}</span>
                          {a.amount !== undefined && <span className="tabular-nums text-brand-soft">{formatMoney(a.amount)}</span>}
                        </div>
                        <div className="text-muted-foreground">
                          {actionLabel[a.action]}
                          {a.note ? ` · ${a.note}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
