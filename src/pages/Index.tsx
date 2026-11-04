import { useEffect, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { Setup } from "@/components/Setup";
import { GameTable } from "@/components/GameTable";
import { GameMode } from "@/lib/teenpatti";
import { clearStoredSession, loadStoredSession, type StoredSession } from "@/lib/storage";

type Stage = "loading" | "disclaimer" | "setup" | "game";

const Index = () => {
  const [stage, setStage] = useState<Stage>("loading");
  const [names, setNames] = useState<string[]>([]);
  const [boot, setBoot] = useState(1);
  const [maxBet, setMaxBet] = useState(100);
  const [mode, setMode] = useState<GameMode>("auto");
  const [loadedSession, setLoadedSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      const session = await loadStoredSession();
      if (session) {
        setNames(session.names);
        setBoot(session.boot);
        setMaxBet(session.maxBet);
        setMode(session.mode);
        setLoadedSession(session);
        setStage("game");
      } else {
        setStage("disclaimer");
      }
    };

    void restoreSession();
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

  if (stage === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-bg text-sm text-muted-foreground" role="status">
        Loading…
      </div>
    );
  if (stage === "disclaimer") return <Disclaimer onStart={() => setStage("setup")} />;
  if (stage === "setup")
    return <Setup onStart={handleStart} />;

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
