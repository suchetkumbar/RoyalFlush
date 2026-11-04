import { useEffect, useState } from "react";
import { Coins, Eraser, Repeat, Trophy, TrendingUp, Undo2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { manualActivePlayers, manualDraftTotal, type GameCore } from "@/lib/game";
import type { HandType } from "@/lib/teenpatti";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import { WinnerPicker } from "./WinnerPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameCore;
  starterName: string;
  boot: number;
  /** Bets from the previous iteration this round, by player id. */
  lastBets: Record<number, number>;
  undoLabel?: string;
  onFill: (bets: Record<number, number>) => void;
  onBetChange: (playerId: number, amount: number) => void;
  onToggleFold: (playerId: number) => void;
  onSubmit: () => void;
  onWinnerStep: (open: boolean) => void;
  onAward: (winnerId: number, hand: HandType) => void;
  onUndo: () => void;
}

export const ManualRoundDialog = ({
  open,
  onOpenChange,
  state,
  starterName,
  boot,
  lastBets,
  undoLabel,
  onFill,
  onBetChange,
  onToggleFold,
  onSubmit,
  onWinnerStep,
  onAward,
  onUndo,
}: Props) => {
  const { manual, round, pot, players } = state;
  const folded = new Set(manual.folded);
  const active = manualActivePlayers(state);
  const draft = manualDraftTotal(state);

  const [winnerId, setWinnerId] = useState("");
  const [hand, setHand] = useState<HandType>("Unknown");
  useEffect(() => {
    if (manual.winnerStep) {
      setWinnerId("");
      setHand("Unknown");
    }
  }, [manual.winnerStep, round]);

  const award = () => {
    if (!winnerId) {
      toast.error("Select a winner");
      return;
    }
    onAward(Number(winnerId), hand);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-brand">Manual Round {round}</DialogTitle>
          <DialogDescription>
            {manual.winnerStep
              ? "Select the winner to award the pot."
              : `Iteration ${manual.iteration} · Starter: ${starterName}`}
          </DialogDescription>
        </DialogHeader>

        {!manual.winnerStep ? (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/50 p-2 text-center text-sm">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Iteration</div>
                <div className="font-bold text-brand">{manual.iteration}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Pot</div>
                <div className="font-bold text-brand">{formatMoney(pot)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Active</div>
                <div className="font-bold">{active.length}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick fill">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={Object.keys(lastBets).length === 0}
                onClick={() => onFill(lastBets)}
                title="Fill every active player with their bet from the previous iteration"
              >
                <Repeat className="mr-1 h-3.5 w-3.5" /> Repeat last
              </Button>
              {boot > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onFill(Object.fromEntries(active.map((p) => [p.id, boot])))}
                >
                  <Coins className="mr-1 h-3.5 w-3.5" /> All {formatMoney(boot)}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                disabled={draft === 0}
                onClick={() => onFill({})}
              >
                <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            </div>

            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
              {players.map((player) => {
                const isFolded = folded.has(player.id);
                const committedFold = player.status === "folded";
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2 transition-all",
                      isFolded ? "border-folded/30 bg-folded/5 opacity-60" : "border-border bg-background/30"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{player.name}</span>
                        {isFolded && (
                          <span className="shrink-0 rounded-full bg-folded/20 px-1.5 py-0.5 text-[10px] font-medium text-folded">
                            Folded
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        In: {formatMoney(manual.cumulativeBets[player.id] ?? 0)}
                        {lastBets[player.id] !== undefined && !isFolded && ` · last ${formatMoney(lastBets[player.id])}`}
                      </div>
                    </div>
                    {isFolded ? (
                      !committedFold && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleFold(player.id)}
                          aria-label={`Unfold ${player.name}`}
                          title={`Unfold ${player.name}`}
                          className="shrink-0 text-muted-foreground"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )
                    ) : (
                      <>
                        <Input
                          id={`manual-${player.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          aria-label={`Bet for ${player.name}`}
                          value={manual.bets[player.id] ?? 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => onBetChange(player.id, parseInt(e.target.value, 10) || 0)}
                          className="w-24 text-center"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleFold(player.id)}
                          className="shrink-0 text-folded hover:bg-folded/10 hover:text-folded"
                          aria-label={`Fold ${player.name}`}
                          title={`Fold ${player.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              This iteration: <span className="font-bold text-foreground">{formatMoney(draft)}</span> · Round total:{" "}
              <span className="font-bold text-brand">{formatMoney(pot + draft)}</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {undoLabel && (
                <Button
                  onClick={onUndo}
                  variant="ghost"
                  size="sm"
                  className="flex-none text-muted-foreground hover:text-foreground"
                  title={`Undo: ${undoLabel}`}
                >
                  <Undo2 className="mr-1 h-4 w-4" /> Undo
                </Button>
              )}
              <Button onClick={onSubmit} className="flex-1 bg-gradient-brand font-bold text-primary-foreground">
                <TrendingUp className="mr-1 h-4 w-4" /> Submit Iteration
              </Button>
              <Button
                onClick={() => onWinnerStep(true)}
                variant="outline"
                className="flex-1 border-brand/40 text-brand hover:bg-brand/10"
                disabled={pot <= 0}
              >
                <Trophy className="mr-1 h-4 w-4" /> Declare Winner
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-center">
              <div className="text-xs uppercase text-muted-foreground">Total Pot</div>
              <div className="text-2xl font-bold text-brand">{formatMoney(pot)}</div>
              <div className="text-xs text-muted-foreground">
                {manual.iteration - 1} iteration{manual.iteration - 1 !== 1 ? "s" : ""} played
              </div>
            </div>
            <WinnerPicker
              candidates={active}
              winnerId={winnerId}
              onWinnerChange={setWinnerId}
              hand={hand}
              onHandChange={setHand}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => onWinnerStep(false)} className="flex-1">
                Back
              </Button>
              <Button onClick={award} size="lg" className="flex-1 bg-gradient-brand font-bold text-primary-foreground">
                Award Pot & Next Round
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
