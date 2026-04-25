import { Settlement, Player, PlayerStats } from "@/lib/teenpatti";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between text-xs py-1 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{value}</span>
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl text-brand">
            🏁 Game Over
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settle" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="settle">
              <Coins className="w-3 h-3 mr-1" /> Settlement
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-3 h-3 mr-1" /> Stats
            </TabsTrigger>
          </TabsList>

          {/* Settlement tab */}
          <TabsContent value="settle" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[55vh] pr-3">
              <div className="space-y-4 py-2">
                {top && top.balance > 0 && (
                  <div className="text-center bg-success/10 border border-success/30 rounded-xl p-3">
                    <Trophy className="w-5 h-5 mx-auto text-success mb-1" />
                    <div className="text-xs text-muted-foreground">Biggest Winner</div>
                    <div className="font-bold text-success text-lg">
                      {top.name} (+₹{top.balance})
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                    Net Standings
                  </h3>
                  <ul className="space-y-1">
                    {sortedPlayers.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between text-sm border border-border rounded-lg px-3 py-2 bg-background/40"
                      >
                        <span>{p.name}</span>
                        <span
                          className={
                            p.balance > 0
                              ? "text-success font-bold"
                              : p.balance < 0
                              ? "text-owed font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {p.balance >= 0 ? "+" : ""}₹{p.balance}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                    Who Pays Whom
                  </h3>
                  {settlements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Everyone is even — no payments needed.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {settlements.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-gradient-card border border-brand/30 rounded-lg px-3 py-2"
                        >
                          <span className="font-semibold text-owed">{s.from}</span>
                          <div className="flex items-center gap-2 text-brand">
                            <ArrowRight className="w-4 h-4" />
                            <span className="font-bold text-base">₹{s.amount}</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-success">{s.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Stats tab */}
          <TabsContent value="stats" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[55vh] pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {sortedStats.map((s) => (
                  <div
                    key={s.name}
                    className="bg-gradient-card border border-border rounded-xl p-3"
                  >
                    <div className="flex items-baseline justify-between mb-2 pb-2 border-b border-border">
                      <span className="font-bold text-brand">{s.name}</span>
                      <span
                        className={
                          s.net > 0
                            ? "text-success font-bold"
                            : s.net < 0
                            ? "text-owed font-bold"
                            : "text-muted-foreground"
                        }
                      >
                        {s.net >= 0 ? "+" : ""}₹{s.net}
                      </span>
                    </div>
                    <StatRow label="Rounds Played" value={s.roundsPlayed} />
                    <StatRow
                      label="Wins"
                      value={`${s.wins} (${Math.round(s.winRate * 100)}%)`}
                    />
                    <StatRow
                      label="Folds"
                      value={`${s.folds} (${Math.round(s.foldRate * 100)}%)`}
                    />
                    <StatRow label="Times Saw Cards" value={s.timesSeen} />
                    <StatRow label="Raises" value={s.raises} />
                    <StatRow label="Shows Called" value={s.shows} />
                    <StatRow label="Total Wagered" value={`₹${s.totalWagered}`} />
                    <StatRow label="Biggest Pot Won" value={`₹${s.biggestPotWon}`} />
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
          className="w-full bg-gradient-brand text-primary-foreground font-bold mt-2"
        >
          <RotateCcw className="w-4 h-4 mr-2" /> New Session
        </Button>
      </DialogContent>
    </Dialog>
  );
};
