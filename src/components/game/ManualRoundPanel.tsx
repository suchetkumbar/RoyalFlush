import { ClipboardPen, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoundRecord } from "@/lib/teenpatti";
import { formatMoney } from "@/lib/utils";

interface Props {
  round: number;
  starterName: string;
  pot: number;
  iteration: number;
  activeCount: number;
  history: RoundRecord[];
  onOpen: () => void;
  onDiscard: () => void;
}

export const ManualRoundPanel = ({
  round,
  starterName,
  pot,
  iteration,
  activeCount,
  history,
  onOpen,
  onDiscard,
}: Props) => (
  <div className="space-y-3">
    <div className="rounded-xl border-2 border-brand/40 bg-gradient-card p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-brand">Round {round} · In Progress</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">
            {activeCount} active
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDiscard}
            title="Discard this round and restart"
            aria-label="Discard this round and restart"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/30 p-2 text-center text-sm">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Starter</div>
          <div className="truncate font-bold">{starterName}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Pot</div>
          <div className="font-bold text-brand">{formatMoney(pot)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Iteration</div>
          <div className="font-bold">{iteration}</div>
        </div>
      </div>
      <Button onClick={onOpen} className="w-full bg-gradient-brand text-primary-foreground">
        <ClipboardPen className="mr-1 h-4 w-4" /> Enter Iteration
      </Button>
    </div>

    {history.length > 0 && (
      <div className="space-y-2">
        {[...history].reverse().map((r) => (
          <div
            key={r.round}
            className="flex items-center justify-between rounded-lg border border-border bg-gradient-card p-3 text-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-brand">R{r.round}</span>
                <Trophy className="h-3 w-3 text-warn" />
                <span className="truncate font-medium">{r.winnerName}</span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {r.handType} · {r.players}p
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold text-success">+{formatMoney(r.pot)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);
