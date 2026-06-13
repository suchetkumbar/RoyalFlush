import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { GameMode } from "@/lib/teenpatti";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Props {
  onStart: (names: string[], boot: number, maxBet: number, mode: GameMode) => void;
}

const DEFAULTS = [
  "Suchet", "Ayush", "Rohan", "Priya", "Kavya", "Arjun",
  "Neha", "Vikram", "Riya", "Aditya", "Meera", "Karan",
  "Sneha", "Dev", "Tara",
];

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 15;

const setupSchema = z.object({
  count: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
  boot: z.number().int().min(0).max(10000),
  maxBet: z.number().int().min(1).max(100000),
  names: z.array(
    z.string().trim().min(1, "Name required").max(15, "Max 15 chars")
  ),
});

export const Setup = ({ onStart }: Props) => {
  const [count, setCount] = useState(3);
  const [mode, setMode] = useState<GameMode>("auto");
  const [names, setNames] = useState<string[]>(DEFAULTS.slice(0, 3));
  const [boot, setBoot] = useState(1);
  const [maxBet, setMaxBet] = useState(100);

  const updateCount = (n: number) => {
    setCount(n);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(DEFAULTS[next.length] || `Player ${next.length + 1}`);
      return next.slice(0, n);
    });
  };

  const updateName = (i: number, v: string) =>
    setNames((prev) => prev.map((p, idx) => (idx === i ? v : p)));

  const handle = () => {
    const cleaned = names.map((n, i) => n.trim() || `Player ${i + 1}`);
    const result = setupSchema.safeParse({ count, boot, maxBet, names: cleaned });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    if (mode === "auto" && maxBet < Math.max(1, boot * 2)) {
      toast.error("Max bet must be at least 2x the boot in Auto mode");
      return;
    }
    onStart(cleaned, boot, maxBet, mode);
  };

  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-bg p-4 sm:p-6">
      <div className="my-6 w-full max-w-md space-y-5 rounded-2xl border border-border bg-gradient-card p-6 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-center text-2xl font-bold text-foreground">New Session</h2>
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate("/analytics")}>Analytics</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/sessions")}>Saved Sessions</Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "auto" ? "default" : "outline"}
              className={mode === "auto" ? "bg-gradient-brand text-primary-foreground" : ""}
              onClick={() => setMode("auto")}
            >
              Auto
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              className={mode === "manual" ? "bg-gradient-brand text-primary-foreground" : ""}
              onClick={() => setMode("manual")}
            >
              Manual
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "auto"
              ? "Track blind, see, call, raise, fold, and show turn by turn."
              : "Enter bets iteration by iteration. Players can fold each iteration. Declare a winner to end the round."}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>Number of Players</Label>
            <span className="text-2xl font-bold text-brand">{count}</span>
          </div>
          <Slider
            value={[count]}
            onValueChange={(v) => updateCount(v[0])}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_PLAYERS}</span>
            <span>{MAX_PLAYERS}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="boot">Boot Amount (Rs)</Label>
          <Input
            id="boot"
            type="number"
            min={0}
            max={10000}
            value={boot}
            onChange={(e) => setBoot(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <p className="text-xs text-muted-foreground">
            {mode === "auto"
              ? "Each player contributes this at round start."
              : "Used as the default suggested amount in the manual round form."}
          </p>
        </div>

        {mode === "auto" && (
          <div className="space-y-2">
            <Label htmlFor="maxbet">Max Bet per Turn (Rs)</Label>
            <Input
              id="maxbet"
              type="number"
              min={1}
              max={100000}
              value={maxBet}
              onChange={(e) => setMaxBet(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              Cap on any single bet. Must be at least 2x the boot.
            </p>
          </div>
        )}

        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {names.map((name, i) => (
            <div key={i} className="space-y-1">
              <Label className="text-xs">Player {i + 1}</Label>
              <Input
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                maxLength={15}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handle}
          size="lg"
          className="w-full bg-gradient-brand font-bold text-primary-foreground hover:opacity-90"
        >
          Start Session
        </Button>
      </div>
    </div>
  );
};
