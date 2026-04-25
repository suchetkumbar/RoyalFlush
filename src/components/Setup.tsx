import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface Props {
  onStart: (names: string[], boot: number, maxBet: number) => void;
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
  boot: z.number().int().min(1).max(10000),
  maxBet: z.number().int().min(1).max(100000),
  names: z.array(
    z.string().trim().min(1, "Name required").max(15, "Max 15 chars")
  ),
}).refine((d) => d.maxBet >= d.boot * 2, {
  message: "Max bet must be at least 2× the boot",
  path: ["maxBet"],
});

export const Setup = ({ onStart }: Props) => {
  const [count, setCount] = useState(3);
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
    onStart(cleaned, boot, maxBet);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-bg">
      <div className="max-w-md w-full bg-gradient-card border border-border rounded-2xl p-6 shadow-glow space-y-5 my-6">
        <h2 className="text-2xl font-bold text-foreground text-center">New Session</h2>

        {/* Players slider */}
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

        {/* Boot */}
        <div className="space-y-2">
          <Label htmlFor="boot">Boot Amount (₹)</Label>
          <Input
            id="boot"
            type="number"
            min={1}
            max={10000}
            value={boot}
            onChange={(e) => setBoot(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <p className="text-xs text-muted-foreground">
            Each player contributes this at round start.
          </p>
        </div>

        {/* Max bet */}
        <div className="space-y-2">
          <Label htmlFor="maxbet">Max Bet per Turn (₹)</Label>
          <Input
            id="maxbet"
            type="number"
            min={1}
            max={100000}
            value={maxBet}
            onChange={(e) => setMaxBet(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <p className="text-xs text-muted-foreground">
            Cap on any single bet (call/raise/show). Must be ≥ 2× boot.
          </p>
        </div>

        {/* Names */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
          className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 font-bold"
        >
          Start Session
        </Button>
      </div>
    </div>
  );
};
