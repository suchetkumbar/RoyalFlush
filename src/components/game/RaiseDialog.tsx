import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  /** Whether the raiser has seen their cards (affects the resulting stake). */
  seen: boolean;
  min: number;
  max: number;
  /** Stepper increment (the boot, at least 1). */
  step: number;
  onRaise: (amount: number) => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const RaiseDialog = ({ open, onOpenChange, playerName, seen, min, max, step, onRaise }: Props) => {
  const [value, setValue] = useState(String(min));

  useEffect(() => {
    if (open) setValue(String(min));
  }, [open, min]);

  const parsed = parseInt(value, 10);
  const amount = Number.isFinite(parsed) ? clamp(parsed, min, max) : min;
  // Mirrors the engine: a blind raise sets the seen stake to double (capped).
  const resultingStake = seen ? amount : Math.min(amount * 2, max);
  const quick = Array.from(new Set([min, min * 2, max])).filter((v) => v >= min && v <= max);
  const nudge = (dir: 1 | -1) => setValue(String(clamp(amount + dir * step, min, max)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Raise · {playerName}</DialogTitle>
          <DialogDescription>
            {seen ? "Seen" : "Blind"} · min {formatMoney(min)} · max {formatMoney(max)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {quick.map((q) => (
            <Button key={q} onClick={() => onRaise(q)} className="h-12 bg-gradient-brand text-primary-foreground">
              {q === max ? `Max ${formatMoney(q)}` : formatMoney(q)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or a custom amount <span className="h-px flex-1 bg-border" />
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onRaise(amount);
          }}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => nudge(-1)}
              disabled={amount <= min}
              aria-label={`Decrease by ${formatMoney(step)}`}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              aria-label="Raise amount"
              min={min}
              max={max}
              value={value}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setValue(String(amount))}
              className="h-12 text-center text-lg font-bold tabular-nums"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => nudge(1)}
              disabled={amount >= max}
              aria-label={`Increase by ${formatMoney(step)}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground" aria-live="polite">
            Seen stake becomes <span className="font-semibold text-foreground">{formatMoney(resultingStake)}</span>
          </p>
          <Button type="submit" size="lg" className="w-full bg-gradient-brand font-bold text-primary-foreground">
            Raise {formatMoney(amount)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
