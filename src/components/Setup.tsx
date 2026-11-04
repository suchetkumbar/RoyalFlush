import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowDown, ArrowUp, BarChart3, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadSetupPrefs, saveSetupPrefs } from "@/lib/prefs";
import { GameMode } from "@/lib/teenpatti";
import { cn } from "@/lib/utils";

interface Props {
  onStart: (names: string[], boot: number, maxBet: number, mode: GameMode) => void;
}

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 15;
const placeholderName = (i: number) => `Player ${i + 1}`;
const defaultRoster = () => Array.from({ length: MAX_PLAYERS }, (_, i) => placeholderName(i));

const setupSchema = z.object({
  boot: z.number().int().min(0).max(10000),
  maxBet: z.number().int().min(1).max(100000),
  names: z
    .array(z.string().trim().min(1, "Name required").max(15, "Max 15 chars"))
    .min(MIN_PLAYERS)
    .max(MAX_PLAYERS)
    .refine((list) => new Set(list.map((n) => n.toLowerCase())).size === list.length, "Player names must be unique"),
});

export const Setup = ({ onStart }: Props) => {
  const navigate = useNavigate();
  const [initial] = useState(loadSetupPrefs);
  // The roster keeps all 15 seats so lowering then raising the count doesn't lose names.
  const [roster, setRoster] = useState<string[]>(() => {
    const base = defaultRoster();
    initial?.names.forEach((n, i) => (base[i] = n));
    return base;
  });
  const [count, setCount] = useState(() =>
    Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, initial?.names.length ?? MIN_PLAYERS))
  );
  const [mode, setMode] = useState<GameMode>(initial?.mode ?? "auto");
  const [boot, setBoot] = useState(initial?.boot ?? 1);
  const [maxBet, setMaxBet] = useState(initial?.maxBet ?? 100);

  const names = roster.slice(0, count);
  const key = (n: string, i: number) => (n.trim() || placeholderName(i)).toLowerCase();
  const duplicates = new Set(names.map(key).filter((n, i, all) => all.indexOf(n) !== i));
  const maxBetError =
    mode === "auto" && maxBet < Math.max(1, boot * 2) ? `Must be at least ${Math.max(1, boot * 2)} (2× the boot)` : null;

  const updateName = (i: number, v: string) => setRoster((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  const move = (i: number, dir: -1 | 1) =>
    setRoster((prev) => {
      const next = [...prev];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });

  const handle = () => {
    const cleaned = names.map((n, i) => n.trim() || placeholderName(i));
    const result = setupSchema.safeParse({ boot, maxBet, names: cleaned });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    if (maxBetError) {
      toast.error(`Max bet ${maxBetError.toLowerCase()}`);
      return;
    }
    saveSetupPrefs({ names: cleaned, boot, maxBet, mode });
    onStart(cleaned, boot, maxBet, mode);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-bg p-4 sm:p-6">
      <div className="my-6 w-full max-w-md space-y-5 rounded-2xl border border-border bg-gradient-card p-6 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-center text-2xl font-bold text-foreground">New Session</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate("/analytics")} >
              <BarChart3 className="mr-1 h-4 w-4" /> Stats
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/sessions")} >
              <History className="mr-1 h-4 w-4" /> Saved
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="space-y-2">
          <Label id="mode-label">Mode</Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="mode-label">
            {(["auto", "manual"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                variant={mode === m ? "default" : "outline"}
                className={cn("capitalize", mode === m && "bg-gradient-brand text-primary-foreground")}
                onClick={() => setMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "auto"
              ? "Track blind, see, call, raise, fold, and show turn by turn. Bets follow Teen Patti stake rules."
              : "Enter each player's bet per iteration and fold players as they drop. Declare a winner to end the round."}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label id="count-label">Number of Players</Label>
            <span className="text-2xl font-bold text-brand">{count}</span>
          </div>
          <Slider
            aria-labelledby="count-label"
            value={[count]}
            onValueChange={(v) => setCount(v[0])}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_PLAYERS}</span>
            <span>{MAX_PLAYERS}</span>
          </div>
        </div>

        <div className={cn("grid gap-3", mode === "auto" && "grid-cols-2")}>
          <div className="space-y-1.5">
            <Label htmlFor="boot">Boot (₹)</Label>
            <Input
              id="boot"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              value={boot}
              onChange={(e) => setBoot(Math.max(0, parseInt(e.target.value) || 0))}
            />
            <p className="text-xs text-muted-foreground">Everyone pays this into the pot at round start.</p>
          </div>
          {mode === "auto" && (
            <div className="space-y-1.5">
              <Label htmlFor="maxbet">Max bet per turn (₹)</Label>
              <Input
                id="maxbet"
                type="number"
                inputMode="numeric"
                min={1}
                max={100000}
                value={maxBet}
                aria-invalid={maxBetError !== null}
                aria-describedby="maxbet-hint"
                className={cn(maxBetError && "border-destructive")}
                onChange={(e) => setMaxBet(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <p id="maxbet-hint" className={cn("text-xs", maxBetError ? "text-destructive" : "text-muted-foreground")}>
                {maxBetError ?? "Cap on any single bet."}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Players in seating order</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setRoster(defaultRoster())}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Reset names
            </Button>
          </div>
          <ol className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {names.map((name, i) => {
              const dup = duplicates.has(key(name, i));
              return (
                <li key={i} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                    <Input
                      value={name}
                      placeholder={placeholderName(i)}
                      aria-label={`Player ${i + 1} name`}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateName(i, e.target.value)}
                      maxLength={15}
                      aria-invalid={dup}
                      className={cn("h-9", dup && "border-destructive")}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-8 shrink-0"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Move ${name || placeholderName(i)} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-8 shrink-0"
                      disabled={i === count - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`Move ${name || placeholderName(i)} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  {dup && <p className="pl-7 text-xs text-destructive">Duplicate name</p>}
                </li>
              );
            })}
          </ol>
        </div>

        <Button
          onClick={handle}
          size="lg"
          disabled={duplicates.size > 0 || maxBetError !== null}
          className="w-full bg-gradient-brand font-bold text-primary-foreground hover:opacity-90"
        >
          Start Session
        </Button>
      </div>
    </div>
  );
};
