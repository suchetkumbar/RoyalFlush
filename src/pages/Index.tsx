import { useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { Setup } from "@/components/Setup";
import { GameTable } from "@/components/GameTable";
import { GameMode } from "@/lib/teenpatti";

type Stage = "disclaimer" | "setup" | "game";

const Index = () => {
  const [stage, setStage] = useState<Stage>("disclaimer");
  const [names, setNames] = useState<string[]>([]);
  const [boot, setBoot] = useState(1);
  const [maxBet, setMaxBet] = useState(100);
  const [mode, setMode] = useState<GameMode>("auto");

  if (stage === "disclaimer") return <Disclaimer onStart={() => setStage("setup")} />;
  if (stage === "setup")
    return (
      <Setup
        onStart={(n, b, m, gameMode) => {
          setNames(n);
          setBoot(b);
          setMaxBet(m);
          setMode(gameMode);
          setStage("game");
        }}
      />
    );
  return (
    <GameTable
      names={names}
      boot={boot}
      maxBet={maxBet}
      mode={mode}
      onExit={() => setStage("setup")}
    />
  );
};

export default Index;
