import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface Props {
  /** Controlled mode (e.g. opened from a menu). Omit both to render with its own trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const InfoModal = ({ open, onOpenChange }: Props) => {
  const controlled = open !== undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full" aria-label="How the tally works">
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand">How the Tally Works</DialogTitle>
          <DialogDescription>Cards are played physically. RoyalFlush only tracks the money.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <strong>Auto</strong> mode: tap the action for whoever&apos;s turn it is. A <em>blind</em> player pays half
            the seen stake (at least the boot); a <em>seen</em> player pays the full stake. A blind raise doubles the
            stake for seen players.
          </p>
          <p>
            <strong>Show</strong> is available when two players remain, the requester has seen their cards, and the
            other player is not blind.
          </p>
          <p>
            <strong>Manual</strong> mode: enter each player&apos;s bet per iteration, fold players as they drop, and
            submit. When one player is left they win automatically; otherwise use <em>Declare Winner</em>.
          </p>
          <p>
            The starting player (marked with a crown) rotates each round in seating order. Every action
            can be undone, even after a refresh.
          </p>
          <div>
            <p className="mb-1 font-semibold text-brand">Hand Ranking (high → low)</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Trail (Three of a Kind)</li>
              <li>Pure Sequence (Straight Flush)</li>
              <li>Sequence (Straight)</li>
              <li>Color (Flush)</li>
              <li>Pair</li>
              <li>High Card</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            Tap <strong>End Game</strong> anytime to see the final settlement. An unfinished round is refunded.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
