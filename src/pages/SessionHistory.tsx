import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceStrict } from "date-fns";
import { ArrowLeft, BarChart3, Play, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/game/ConfirmDialog";
import {
  archiveStoredSession,
  clearStoredSessionHistory,
  deleteStoredSession,
  loadStoredSession,
  loadStoredSessionHistory,
  saveStoredSession,
  type StoredSession,
} from "@/lib/storage";
import { cn, formatMoney, formatSignedMoney } from "@/lib/utils";

const standings = (session: StoredSession) =>
  [...(session.final?.players ?? session.state.players)].sort((a, b) => b.balance - a.balance);

export const SessionHistory = () => {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [pendingDelete, setPendingDelete] = useState<StoredSession | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

  const loadHistory = async () => {
    const history = await loadStoredSessionHistory();
    setSessions(history.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleResume = async (session: StoredSession) => {
    // Park whatever game is currently active so resuming never overwrites it.
    const current = await loadStoredSession();
    if (current && current.id !== session.id) {
      await archiveStoredSession({ ...current, status: "active", updatedAt: Date.now() });
    }
    await saveStoredSession({ ...session, status: "active" });
    await deleteStoredSession(session.id); // it lives in the active slot while being played
    navigate("/", { state: { autoResume: true } });
  };

  const handleDelete = async (id: string) => {
    await deleteStoredSession(id);
    await loadHistory();
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saved Sessions</h1>
            <p className="text-sm text-muted-foreground">Finished results and games you parked to resume later.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-full bg-muted px-3 py-1 text-sm text-foreground/80">
              {sessions.length} saved session{sessions.length === 1 ? "" : "s"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/analytics")} className="min-w-[9rem]">
                <BarChart3 className="mr-2 h-4 w-4" /> Analytics
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="min-w-[9rem]">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                variant="destructive"
                disabled={sessions.length === 0}
                onClick={() => setConfirmClear(true)}
                className="min-w-[9rem]"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear All
              </Button>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-gradient-card p-6 text-center text-sm text-muted-foreground">
            No saved sessions yet. Finish a game to archive a session.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((session) => {
              const ranked = standings(session);
              const top = ranked[0];
              const rounds = session.state.history.length;
              const completed = session.status === "completed";
              return (
                <Card key={session.id} className="rounded-3xl border-border bg-gradient-card p-4">
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.createdAt), "PP p")}
                          {session.endedAt && ` · ${formatDistanceStrict(session.endedAt, session.createdAt)}`}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            completed ? "bg-success/15 text-success" : "bg-brand/15 text-brand"
                          )}
                        >
                          {completed ? "Completed" : "In progress"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.mode === "auto" ? "Auto" : "Manual"} · Boot {formatMoney(session.boot)} · {rounds} round
                        {rounds === 1 ? "" : "s"}
                      </p>
                      {top && top.balance > 0 && (
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                          <Trophy className="h-4 w-4" /> {top.name} {formatSignedMoney(top.balance)}
                        </p>
                      )}
                      <ul className="flex flex-wrap gap-1.5">
                        {ranked.map((p) => (
                          <li
                            key={p.id}
                            className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs"
                          >
                            {p.name}{" "}
                            <span
                              className={
                                p.balance > 0 ? "text-success" : p.balance < 0 ? "text-owed" : "text-muted-foreground"
                              }
                            >
                              {formatSignedMoney(p.balance)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
                      {!completed && (
                        <Button onClick={() => handleResume(session)} className="w-full sm:w-auto">
                          <Play className="mr-2 h-4 w-4" /> Resume
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        onClick={() => setPendingDelete(session)}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this session?"
        description={`${pendingDelete?.names.join(", ") ?? ""} — this cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => pendingDelete && void handleDelete(pendingDelete.id)}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all saved sessions?"
        description="Every archived session and its analytics data will be removed. This cannot be undone."
        confirmLabel="Clear All"
        destructive
        onConfirm={async () => {
          await clearStoredSessionHistory();
          setSessions([]);
        }}
      />
    </div>
  );
};
