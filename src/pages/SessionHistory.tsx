import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, Play } from "lucide-react";
import {
  clearStoredSessionHistory,
  deleteStoredSession,
  loadStoredSessionHistory,
  saveStoredSession,
  type StoredSession,
} from "@/lib/storage";
import { format } from "date-fns";

interface Props {
  onClose?: () => void;
}

export const SessionHistory = ({ onClose }: Props) => {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const navigate = useNavigate();

  const loadHistory = async () => {
    const history = await loadStoredSessionHistory();
    setSessions(history.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleResume = async (session: StoredSession) => {
    await saveStoredSession(session);
    navigate("/");
  };

  const handleDelete = async (id: string) => {
    await deleteStoredSession(id);
    setSessions(await loadStoredSessionHistory());
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saved Sessions</h1>
            <p className="text-sm text-muted-foreground">Resume or delete previously completed sessions.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-full bg-muted px-3 py-1 text-sm text-foreground/80">
              {sessions.length} saved session{sessions.length === 1 ? "" : "s"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(-1)} className="min-w-[9rem]">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (sessions.length === 0) return;
                  const confirmed = window.confirm("Clear all saved sessions? This cannot be undone.");
                  if (!confirmed) return;
                  await clearStoredSessionHistory();
                  setSessions([]);
                }}
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
            {sessions.map((session) => (
              <Card key={session.id} className="rounded-3xl border-border bg-gradient-card p-4">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Saved on {format(new Date(session.updatedAt), "PPpp")}</p>
                    <h2 className="text-lg font-semibold text-foreground">{session.names.join(", ")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {session.mode === "auto" ? "Auto mode" : "Manual mode"} · Boot {session.boot} · Max {session.maxBet}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={() => handleResume(session)} className="w-full sm:w-auto">
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(session.id)} className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
