import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadStoredSessionHistory, type StoredSession } from "@/lib/storage";
import {
  computeAnalytics,
  filterByRange,
  MIN_ROUNDS_FOR_WIN_RATE,
  type DateRange,
} from "@/lib/analytics";
import { cn, formatMoney, formatSignedMoney } from "@/lib/utils";

const RANGES: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "30 days" },
  { value: "7d", label: "7 days" },
];

const netClass = (n: number) => (n > 0 ? "text-success" : n < 0 ? "text-owed" : "text-muted-foreground");

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-border bg-gradient-card p-4">
    <div className="text-xs uppercase text-muted-foreground">{label}</div>
    <div className="mt-1 truncate text-lg font-bold">{value}</div>
    {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
  </div>
);

export const Analytics = () => {
  const navigate = useNavigate();
  const [all, setAll] = useState<StoredSession[] | null>(null);
  const [range, setRange] = useState<DateRange>("all");

  useEffect(() => {
    void loadStoredSessionHistory().then((sessions) => setAll(sessions.filter((s) => s.status === "completed")));
  }, []);

  const analytics = useMemo(() => (all ? computeAnalytics(filterByRange(all, range)) : null), [all, range]);
  const maxAbs = Math.max(1, ...(analytics?.players.map((p) => Math.abs(p.totalEarnings)) ?? [1]));

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {analytics
            ? `${analytics.totalSessions} session${analytics.totalSessions === 1 ? "" : "s"} · ${analytics.totalRounds} rounds`
            : "Loading…"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Date range" className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              role="radio"
              aria-checked={range === r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                range === r.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
    </div>
  );

  if (!analytics || analytics.totalSessions === 0) {
    return (
      <div className="min-h-screen bg-gradient-bg p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {header}
          {analytics && (
            <div className="space-y-3 rounded-2xl border border-border bg-gradient-card p-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {all && all.length > 0
                  ? "No finished sessions in this date range."
                  : "Finish a game to start building player stats."}
              </p>
              {(!all || all.length === 0) && (
                <Button onClick={() => navigate("/")} className="bg-gradient-brand text-primary-foreground">
                  <Play className="mr-2 h-4 w-4" /> Start a game
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { topEarner, topWinRate } = analytics;

  return (
    <div className="min-h-screen bg-gradient-bg p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {header}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Sessions" value={String(analytics.totalSessions)} />
          <Tile label="Rounds" value={String(analytics.totalRounds)} />
          <Tile
            label="Top earner"
            value={topEarner ? topEarner.name : "—"}
            sub={topEarner ? formatSignedMoney(topEarner.totalEarnings) : undefined}
          />
          <Tile
            label="Best win rate"
            value={topWinRate ? topWinRate.name : "—"}
            sub={
              topWinRate
                ? `${topWinRate.winRate.toFixed(0)}% of ${topWinRate.roundsPlayed} rounds`
                : `Needs ${MIN_ROUNDS_FOR_WIN_RATE}+ rounds`
            }
          />
        </div>

        <section aria-labelledby="net-title" className="rounded-2xl border border-border bg-gradient-card p-4">
          <h2 id="net-title" className="mb-3 text-sm font-semibold">Net by player</h2>
          <ul className="space-y-2">
            {analytics.players.map((p) => {
              const width = (Math.abs(p.totalEarnings) / maxAbs) * 50;
              const positive = p.totalEarnings >= 0;
              return (
                <li key={p.name} className="grid grid-cols-[6rem_1fr_4.5rem] items-center gap-2 text-sm sm:grid-cols-[8rem_1fr_5rem]">
                  <span className="truncate">{p.name}</span>
                  <div className="relative h-4" aria-hidden>
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className={cn(
                        "absolute inset-y-0.5",
                        positive ? "left-1/2 rounded-r bg-success/80" : "right-1/2 rounded-l bg-owed/80"
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className={cn("text-right font-semibold tabular-nums", netClass(p.totalEarnings))}>
                    {formatSignedMoney(p.totalEarnings)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="players-title" className="space-y-3">
          <h2 id="players-title" className="text-lg font-bold">Players</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-gradient-card">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2 text-left font-medium">Player</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Net</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Sessions</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">W–L</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Win %</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Avg pot won</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Best / worst night</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {analytics.players.map((p) => (
                  <tr key={p.name} className="border-b border-border/50 last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-medium">{p.name}</th>
                    <td className={cn("px-3 py-2 text-right font-semibold", netClass(p.totalEarnings))}>
                      {formatSignedMoney(p.totalEarnings)}
                    </td>
                    <td className="px-3 py-2 text-right">{p.sessions}</td>
                    <td className="px-3 py-2 text-right">
                      {p.wins}–{p.losses}
                    </td>
                    <td className="px-3 py-2 text-right">{p.winRate.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right">{p.wins ? formatMoney(p.avgWinAmount) : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                      <span className="text-success">{formatSignedMoney(p.biggestSessionWin)}</span>
                      {" / "}
                      <span className="text-owed">{formatSignedMoney(p.biggestSessionLoss)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {Object.keys(analytics.handRankingDistribution).length > 0 && (
          <section aria-labelledby="hands-title" className="rounded-2xl border border-border bg-gradient-card p-4">
            <h2 id="hands-title" className="mb-3 text-sm font-semibold">Winning hands</h2>
            <ul className="space-y-3">
              {Object.entries(analytics.handRankingDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([hand, count]) => {
                  const pct = (count / analytics.totalRounds) * 100;
                  return (
                    <li key={hand}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{hand}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
