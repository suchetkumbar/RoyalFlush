import { lazy, Suspense, useMemo } from "react";
import { ArrowLeft, ArrowRight, BarChart3, ClipboardCopy, Coins, ListOrdered, RotateCcw, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SessionResult } from "@/hooks/useGame";
import { getSettlementText } from "@/lib/export";
import { balanceTimeline } from "@/lib/teenpatti";
import { formatMoney, formatSignedMoney } from "@/lib/utils";
// recharts is heavy; load it only when a results screen is shown.
const BalanceChart = lazy(() => import("./BalanceChart").then((m) => ({ default: m.BalanceChart })));

interface Props {
  result: SessionResult | null;
  onNewSession: () => void;
  onBackToGame: () => void;
}

const balanceClass = (n: number) =>
  n > 0 ? "font-bold text-success" : n < 0 ? "font-bold text-owed" : "text-muted-foreground";

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-start justify-between gap-3 border-b border-border/40 py-1 text-xs last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="break-words text-right font-semibold text-foreground">{value}</span>
  </div>
);

export const SettlementDialog = ({ result, onNewSession, onBackToGame }: Props) => {
  const players = useMemo(() => result?.players ?? [], [result]);
  const sorted = useMemo(() => [...players].sort((a, b) => b.balance - a.balance), [players]);
  const seatOrder = useMemo(() => [...players].sort((a, b) => a.id - b.id), [players]);
  const timeline = useMemo(() => (result ? balanceTimeline(seatOrder, result.log) : []), [result, seatOrder]);
  const top = sorted[0];
  const history = result?.history ?? [];
  const settlements = result?.settlements ?? [];
  const stats = [...(result?.stats ?? [])].sort((a, b) => b.net - a.net);

  const summary = () =>
    result ? getSettlementText(players, settlements, history.length, new Date(result.endedAt)) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary());
      toast.success("Settlement copied");
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = async () => {
    try {
      await navigator.share({ title: "RoyalFlush settlement", text: summary() });
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") toast.error("Sharing failed");
    }
  };

  return (
    <Dialog open={result !== null}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-4 sm:p-6 [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-brand sm:text-2xl">Game Over</DialogTitle>
          <DialogDescription className="text-center">
            {history.length} round{history.length === 1 ? "" : "s"} played. Any unfinished round was refunded.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settle" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settle" className="gap-1 px-2 text-xs sm:text-sm">
              <Coins className="h-3 w-3" /> Settle
            </TabsTrigger>
            <TabsTrigger value="rounds" className="gap-1 px-2 text-xs sm:text-sm">
              <ListOrdered className="h-3 w-3" /> Rounds
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1 px-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3" /> Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settle" className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[52vh] pr-3">
              <div className="space-y-4 py-2">
                {top && top.balance > 0 && (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center sm:p-4">
                    <Trophy className="mx-auto mb-1 h-5 w-5 text-success" />
                    <div className="text-xs text-muted-foreground">Biggest Winner</div>
                    <div className="break-words text-base font-bold text-success sm:text-lg">
                      {top.name} ({formatSignedMoney(top.balance)})
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who Pays Whom</h3>
                  {settlements.length === 0 ? (
                    <p className="py-3 text-center text-sm text-muted-foreground">Everyone is even. No payments needed.</p>
                  ) : (
                    <ul className="space-y-2">
                      {settlements.map((s, i) => (
                        <li
                          key={i}
                          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-brand/30 bg-gradient-card px-3 py-2.5 text-sm"
                        >
                          <span className="min-w-0 truncate font-semibold text-owed">{s.from}</span>
                          <span className="flex items-center gap-1.5 font-bold text-foreground">
                            <ArrowRight aria-hidden className="h-4 w-4 text-brand" />
                            {formatMoney(s.amount)}
                            <ArrowRight aria-hidden className="h-4 w-4 text-brand" />
                          </span>
                          <span className="min-w-0 truncate text-right font-semibold text-success">{s.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Net Standings</h3>
                  <ul className="space-y-1">
                    {sorted.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{p.name}</span>
                        <span className={`tabular-nums ${balanceClass(p.balance)}`}>{formatSignedMoney(p.balance)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-muted/40" aria-hidden />}>
                  <BalanceChart players={seatOrder} timeline={timeline} />
                </Suspense>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rounds" className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[52vh] pr-3">
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No rounds were completed.</p>
              ) : (
                <ol className="space-y-2 py-2">
                  {history.map((r) => (
                    <li
                      key={r.round}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-gradient-card px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-brand">R{r.round}</span>
                          <Trophy aria-hidden className="h-3 w-3 text-warn" />
                          <span className="truncate font-medium">{r.winnerName}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.handType} · {r.players} in at the end
                        </div>
                      </div>
                      <span className="shrink-0 font-bold tabular-nums text-success">+{formatMoney(r.pot)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[52vh] pr-3">
              <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
                {stats.map((s) => (
                  <div key={s.name} className="rounded-xl border border-border bg-gradient-card p-3">
                    <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-2">
                      <span className="min-w-0 break-words font-bold text-brand">{s.name}</span>
                      <span className={balanceClass(s.net)}>{formatSignedMoney(s.net)}</span>
                    </div>
                    <StatRow label="Rounds Played" value={s.roundsPlayed} />
                    <StatRow label="Wins" value={`${s.wins} (${Math.round(s.winRate * 100)}%)`} />
                    <StatRow label="Folds" value={`${s.folds} (${Math.round(s.foldRate * 100)}%)`} />
                    <StatRow label="Times Saw Cards" value={s.timesSeen} />
                    <StatRow label="Raises" value={s.raises} />
                    <StatRow label="Shows Called" value={s.shows} />
                    <StatRow label="Total Wagered" value={formatMoney(s.totalWagered)} />
                    <StatRow label="Biggest Pot Won" value={formatMoney(s.biggestPotWon)} />
                    <StatRow label="Best Hand" value={s.bestHand} />
                    <StatRow label="Longest Win Streak" value={s.longestWinStreak} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="mt-2 space-y-2">
          <div className={canShare ? "grid grid-cols-2 gap-2" : ""}>
            <Button variant="outline" className="w-full" onClick={() => void copy()}>
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy summary
            </Button>
            {canShare && (
              <Button variant="outline" onClick={() => void share()}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="lg" className="min-w-0 px-2" onClick={onBackToGame}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to game
            </Button>
            <Button onClick={onNewSession} size="lg" className="min-w-0 bg-gradient-brand px-2 font-bold text-primary-foreground">
              <RotateCcw className="mr-2 h-4 w-4" /> New Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
