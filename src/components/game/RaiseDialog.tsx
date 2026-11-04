import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  min: number;
  max: number;
  onRaise: (amount: number) => void;
}

export const RaiseDialog = ({ open, onOpenChange, playerName, min, max, onRaise }: Props) => {
  const [value, setValue] = useState(String(min));

  useEffect(() => {
    if (open) setValue(String(min));
  }, [open, min]);

  const quick = Array.from(new Set([min, min * 2, max])).filter((v) => v >= min && v <= max);
  const submitCustom = () => {
    const n = parseInt(value, 10);
    onRaise(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise - {playerName}</DialogTitle>
          <DialogDescription>Pick a quick amount or enter a custom raise.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Min {formatMoney(min)} · Max {formatMoney(max)}
        </p>
        <div className="grid grid-cols-3 gap-2 py-2">
          {quick.map((amount) => (
            <Button key={amount} onClick={() => onRaise(amount)} className="bg-gradient-brand text-primary-foreground">
              {formatMoney(amount)}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-border pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
        >
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Custom raise amount"
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Custom
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
