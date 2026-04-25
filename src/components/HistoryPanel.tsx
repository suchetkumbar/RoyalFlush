import { ActionLog } from "@/lib/teenpatti";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListOrdered } from "lucide-react";

interface Props {
  log: ActionLog[];
}

const actionLabel: Record<string, string> = {
  boot: "Boot",
  blind: "Blind",
  see: "Saw cards",
  call: "Call",
  raise: "Raise",
  fold: "Folded",
  show: "Show",
  manual: "Manual entry",
  win: "Won pot",
};

export const HistoryPanel = ({ log }: Props) => (
  <div className="bg-gradient-card border border-border rounded-xl p-4 h-full">
    <div className="flex items-center gap-1.5 mb-3">
      <ListOrdered className="w-3.5 h-3.5 text-brand" />
      <span className="text-sm font-semibold">Action Log</span>
    </div>
    {log.length === 0 ? (
      <p className="text-xs text-muted-foreground">No actions yet.</p>
    ) : (
      <ScrollArea className="h-72 pr-3">
        <ul className="space-y-1">
          {[...log].reverse().map((a) => (
            <li
              key={a.id}
              className="text-xs border-l-2 border-brand/40 pl-2 py-1"
            >
              <div className="flex justify-between">
                <span className="font-medium">{a.playerName}</span>
                {a.amount !== undefined && (
                  <span className="text-brand-soft">₹{a.amount}</span>
                )}
              </div>
              <div className="text-muted-foreground">
                R{a.round} · {actionLabel[a.action]}
                {a.note ? ` · ${a.note}` : ""}
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    )}
  </div>
);
