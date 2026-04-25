import { Settlement, Player, PlayerStats } from "@/lib/teenpatti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, RotateCcw, Trophy, BarChart3, Coins } from "lucide-react";

interface Props {
  open: boolean;
  players: Player[];
  settlements: Settlement[];
  stats: PlayerStats[];
  onNewSession: () => void;
}

const currency = (amount: number) => `Rs${amount}`;

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-start justify-between gap-3 border-b border-border/40 py-1 text-xs last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="break-words text-right font-semibold text-foreground">{value}</span>
  </div>
);

export const SettlementDialog = ({
  open,
  players,
  settlements,
  stats,
  onNewSession,
}: Props) => {
  const sortedPlayers = [...players].sort((a, b) => b.balance - a.balance);
  const sortedStats = [...stats].sort((a, b) => b.net - a.net);
  const top = sortedPlayers[0];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-brand sm:text-2xl">
            Game Over
          </DialogTitle>
          <DialogDescription className="text-center">
            Final standings and settlement for completed rounds only.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settle" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settle" className="gap-1 px-2 text-xs sm:text-sm">
              <Coins className="h-3 w-3" /> Settlement
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1 px-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3" /> Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settle" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[55vh] pr-3">
              <div className="space-y-4 py-2">
                {top && top.balance > 0 && (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center sm:p-4">
                    <Trophy className="mx-auto mb-1 h-5 w-5 text-success" />
                    <div className="text-xs text-muted-foreground">Biggest Winner</div>
                    <div className="break-words text-base font-bold text-success sm:text-lg">
                      {top.name} (+{currency(top.balance)})
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Net Standings
                  </h3>
                  <ul className="space-y-1">
                    {sortedPlayers.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{p.name}</span>
                        <span
                          className={
                            p.balance > 0
                              ? "font-bold text-success"
                              : p.balance < 0
                                ? "font-bold text-owed"
                                : "text-muted-foreground"
                          }
                        >
                          {p.balance >= 0 ? "+" : ""}
                          {currency(p.balance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Who Pays Whom
                  </h3>
                  {settlements.length === 0 ? (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                      Everyone is even. No payments needed.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {settlements.map((s, i) => (
                        <li
                          key={i}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-brand/30 bg-gradient-card px-3 py-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:text-left"
                        >
                          <span className="min-w-0 truncate font-semibold text-owed">{s.from}</span>
                          <div className="flex items-center justify-center gap-2 text-brand">
                            <ArrowRight className="h-4 w-4" />
                            <span className="text-base font-bold">{currency(s.amount)}</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                          <span className="min-w-0 truncate font-semibold text-success sm:text-right">{s.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[55vh] pr-3">
              <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
                {sortedStats.map((s) => (
                  <div key={s.name} className="rounded-xl border border-border bg-gradient-card p-3">
                    <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-2">
                      <span className="min-w-0 break-words font-bold text-brand">{s.name}</span>
                      <span
                        className={
                          s.net > 0
                            ? "font-bold text-success"
                            : s.net < 0
                              ? "font-bold text-owed"
                              : "text-muted-foreground"
                        }
                      >
                        {s.net >= 0 ? "+" : ""}
                        {currency(s.net)}
                      </span>
                    </div>
                    <StatRow label="Rounds Played" value={s.roundsPlayed} />
                    <StatRow label="Wins" value={`${s.wins} (${Math.round(s.winRate * 100)}%)`} />
                    <StatRow label="Folds" value={`${s.folds} (${Math.round(s.foldRate * 100)}%)`} />
                    <StatRow label="Times Saw Cards" value={s.timesSeen} />
                    <StatRow label="Raises" value={s.raises} />
                    <StatRow label="Shows Called" value={s.shows} />
                    <StatRow label="Total Wagered" value={currency(s.totalWagered)} />
                    <StatRow label="Biggest Pot Won" value={currency(s.biggestPotWon)} />
                    <StatRow label="Best Hand" value={s.bestHand} />
                    <StatRow label="Longest Win Streak" value={s.longestWinStreak} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Button
          onClick={onNewSession}
          size="lg"
          className="mt-2 w-full bg-gradient-brand font-bold text-primary-foreground"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> New Session
        </Button>
      </DialogContent>
    </Dialog>
  );
};
