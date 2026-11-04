import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { History, Play, Plus } from "lucide-react";
import { Disclaimer } from "@/components/Disclaimer";
import { Setup } from "@/components/Setup";
import { GameTable } from "@/components/GameTable";
import { Button } from "@/components/ui/button";
import { GameMode } from "@/lib/teenpatti";
import { acceptDisclaimer, hasAcceptedDisclaimer } from "@/lib/prefs";
import {
  archiveStoredSession,
  clearStoredSession,
  loadStoredSession,
  type StoredSession,
} from "@/lib/storage";

type Stage = "loading" | "resume" | "disclaimer" | "setup" | "game";

interface LocationState {
  autoResume?: boolean;
}

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("loading");
  const [names, setNames] = useState<string[]>([]);
  const [boot, setBoot] = useState(1);
  const [maxBet, setMaxBet] = useState(100);
  const [mode, setMode] = useState<GameMode>("auto");
  const [loadedSession, setLoadedSession] = useState<StoredSession | null>(null);

  const afterNoSession = () => setStage(hasAcceptedDisclaimer() ? "setup" : "disclaimer");

  useEffect(() => {
    const autoResume = (location.state as LocationState | null)?.autoResume === true;
    const restoreSession = async () => {
      const session = await loadStoredSession();
      if (!session) {
        afterNoSession();
        return;
      }
      setNames(session.names);
      setBoot(session.boot);
      setMaxBet(session.maxBet);
      setMode(session.mode);
      setLoadedSession(session);
      setStage(autoResume ? "game" : "resume");
      if (autoResume) navigate(".", { replace: true, state: null });
    };
    void restoreSession();
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (n: string[], b: number, m: number, gameMode: GameMode) => {
    setNames(n);
    setBoot(b);
    setMaxBet(m);
    setMode(gameMode);
    setLoadedSession(null);
    setStage("game");
  };

  const handleExit = () => {
    void clearStoredSession();
    setLoadedSession(null);
    setStage("setup");
  };

  /** Park the unfinished game in Saved Sessions (resumable) and start fresh. */
  const handleStartNew = async () => {
    if (loadedSession) {
      await archiveStoredSession({ ...loadedSession, status: "active", updatedAt: Date.now() });
      await clearStoredSession();
    }
    setLoadedSession(null);
    afterNoSession();
  };

  if (stage === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-bg text-sm text-muted-foreground" role="status">
        Loading…
      </div>
    );

  if (stage === "resume" && loadedSession) {
    const s = loadedSession.state;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-bg p-4">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-gradient-card p-6 shadow-glow">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold">Game in progress</h1>
            <p className="text-sm text-muted-foreground">
              Round {s.round} · {loadedSession.mode === "auto" ? "Auto" : "Manual"} · last played{" "}
              {formatDistanceToNow(loadedSession.updatedAt, { addSuffix: true })}
            </p>
          </div>
          <p className="text-center text-sm">{loadedSession.names.join(", ")}</p>
          <div className="space-y-2">
            <Button
              size="lg"
              onClick={() => setStage("game")}
              className="w-full bg-gradient-brand font-bold text-primary-foreground"
            >
              <Play className="mr-2 h-4 w-4" /> Resume game
            </Button>
            <Button size="lg" variant="outline" onClick={() => void handleStartNew()} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Start a new game
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <History className="mr-1 inline h-3 w-3" />
              Starting new keeps this game in Saved Sessions so you can resume it later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "disclaimer")
    return (
      <Disclaimer
        onStart={() => {
          acceptDisclaimer();
          setStage("setup");
        }}
      />
    );
  if (stage === "setup") return <Setup onStart={handleStart} />;

  return (
    <GameTable
      names={names}
      boot={boot}
      maxBet={maxBet}
      mode={mode}
      initialSession={loadedSession}
      onExit={handleExit}
    />
  );
};

export default Index;
