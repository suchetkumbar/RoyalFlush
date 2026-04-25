import { ActionLog, RoundRecord } from "@/lib/teenpatti";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, ListOrdered } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Props {
  history: RoundRecord[];
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
  win: "Won pot",
};

export const HistoryPanel = ({ history, log }: Props) => (
  <div className="bg-gradient-card border border-border rounded-xl p-4 h-full">
    <Tabs defaultValue="rounds">
      <TabsList className="grid grid-cols-2 w-full mb-3">
        <TabsTrigger value="rounds">
          <Trophy className="w-3 h-3 mr-1" /> Rounds
        </TabsTrigger>
        <TabsTrigger value="log">
          <ListOrdered className="w-3 h-3 mr-1" /> Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rounds">
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rounds yet.</p>
        ) : (
          <ScrollArea className="h-72 pr-3">
            <ul className="space-y-2">
              {[...history].reverse().map((r) => (
                <li
                  key={r.round}
                  className="text-xs border border-border rounded-lg p-2 bg-background/40"
                >
                  <div className="flex justify-between font-semibold">
                    <span className="text-brand">Round {r.round}</span>
                    <span className="text-success">+₹{r.pot}</span>
                  </div>
                  <div className="text-foreground">{r.winnerName}</div>
                  <div className="text-muted-foreground">
                    {r.handType} · {r.players}p
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="log">
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
      </TabsContent>
    </Tabs>
  </div>
);
