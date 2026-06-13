import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { loadStoredSessionHistory } from "@/lib/storage";
import { computeAnalytics, type SessionAnalytics } from "@/lib/analytics";

export const Analytics = () => {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAnalytics = async () => {
      const sessions = await loadStoredSessionHistory();
      if (sessions.length > 0) {
        setAnalytics(computeAnalytics(sessions));
      }
    };

    void loadAnalytics();
  }, []);

  if (!analytics || analytics.totalSessions === 0) {
    return (
      <div className="min-h-screen bg-gradient-bg p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 text-center text-sm text-muted-foreground">
            No session data available. Finish a game to start tracking analytics.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Session Analytics</h1>
            <p className="text-sm text-muted-foreground">
              {analytics.totalSessions} session{analytics.totalSessions !== 1 ? "s" : ""} ·{" "}
              {analytics.totalRounds} total rounds
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {analytics.topEarner && (
            <Card className="rounded-2xl border-border bg-gradient-card p-4">
              <div className="text-xs uppercase text-muted-foreground">Top Earner</div>
              <h3 className="text-lg font-bold text-brand">{analytics.topEarner.name}</h3>
              <p className="text-sm text-success">+₹{analytics.topEarner.totalEarnings}</p>
            </Card>
          )}
          {analytics.topWinRate && (
            <Card className="rounded-2xl border-border bg-gradient-card p-4">
              <div className="text-xs uppercase text-muted-foreground">Best Win Rate</div>
              <h3 className="text-lg font-bold text-brand">{analytics.topWinRate.name}</h3>
              <p className="text-sm text-accent">
                {analytics.topWinRate.winRate.toFixed(1)}%
              </p>
            </Card>
          )}
          <Card className="rounded-2xl border-border bg-gradient-card p-4">
            <div className="text-xs uppercase text-muted-foreground">Total Rounds</div>
            <h3 className="text-lg font-bold text-brand">{analytics.totalRounds}</h3>
            <p className="text-sm text-muted-foreground">across all sessions</p>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">Player Statistics</h2>
          <div className="space-y-3">
            {analytics.players.map((player) => (
              <Card key={player.name} className="rounded-2xl border-border bg-gradient-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{player.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {player.roundsPlayed} round{player.roundsPlayed !== 1 ? "s" : ""} ·{" "}
                      {player.wins}W-{player.losses}L
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:text-right">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Earnings</div>
                      <div
                        className={`text-sm font-bold ${player.totalEarnings >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {player.totalEarnings >= 0 ? "+" : ""}₹{player.totalEarnings}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Win Rate</div>
                      <div className="text-sm font-bold text-accent">
                        {player.winRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {Object.keys(player.handRankings).length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="text-xs uppercase text-muted-foreground mb-2">
                      Wins by Hand
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(player.handRankings)
                        .sort(([, a], [, b]) => b - a)
                        .map(([hand, count]) => (
                          <span
                            key={hand}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
                          >
                            {hand}: {count}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {Object.keys(analytics.handRankingDistribution).length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-bold">Hand Rankings Distribution</h2>
            <Card className="rounded-2xl border-border bg-gradient-card p-4">
              <div className="space-y-3">
                {Object.entries(analytics.handRankingDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([hand, count]) => {
                    const percentage = (count / analytics.totalRounds) * 100;
                    return (
                      <div key={hand}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{hand}</span>
                          <span className="text-muted-foreground">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-brand"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
