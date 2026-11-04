import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HandType, Player } from "@/lib/teenpatti";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import { WinnerPicker } from "./WinnerPicker";

interface Props {
  open: boolean;
  /** When forced (only one player left) the dialog cannot be dismissed. */
  forced: boolean;
  onClose: () => void;
  candidates: Player[];
  pot: number;
  onAward: (winnerId: number, hand: HandType) => void;
}

export const WinnerDialog = ({ open, forced, onClose, candidates, pot, onAward }: Props) => {
  const [winnerId, setWinnerId] = useState("");
  const [hand, setHand] = useState<HandType>("Unknown");
  const soleCandidate = candidates.length === 1 ? String(candidates[0].id) : "";

  useEffect(() => {
    if (!open) return;
    setWinnerId(soleCandidate);
    setHand("Unknown");
  }, [open, soleCandidate]);

  const award = () => {
    if (!winnerId) {
      toast.error("Select a winner");
      return;
    }
    onAward(Number(winnerId), hand);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !forced) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-brand">Round Winner</DialogTitle>
          <DialogDescription>Select the winning player and hand, then award the current pot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <WinnerPicker
            candidates={candidates}
            winnerId={winnerId}
            onWinnerChange={setWinnerId}
            hand={hand}
            onHandChange={setHand}
          />
          <div className="text-center text-sm text-muted-foreground">
            Pot: <span className="font-bold text-brand">{formatMoney(pot)}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!forced && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            )}
            <Button onClick={award} size="lg" className="flex-1 bg-gradient-brand font-bold text-primary-foreground">
              Award Pot & Next Round
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
