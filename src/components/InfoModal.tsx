import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export const InfoModal = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="icon" className="rounded-full">
        <Info className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-brand">How the Tally Works</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <p>
          Cards are played physically. This app only tracks bets, fold status, round winners
          and computes who owes whom at the end.
        </p>
        <p>
          On each player's turn, tap their action: <strong>Blind</strong>, <strong>See</strong>,
          <strong> Call</strong>, <strong>Raise</strong>, <strong>Fold</strong>, or <strong>Show</strong>.
          Bet amounts auto-deduct from their running net.
        </p>
        <p>
          When a round ends, choose the winner and their hand type. The pot is awarded.
        </p>
        <div>
          <p className="font-semibold text-brand mb-1">Hand Ranking (high → low)</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Trail (Three of a Kind)</li>
            <li>Pure Sequence (Straight Flush)</li>
            <li>Sequence (Straight)</li>
            <li>Color (Flush)</li>
            <li>Pair</li>
            <li>High Card</li>
          </ol>
        </div>
        <p className="text-xs text-muted-foreground">
          Tap <strong>End Game</strong> anytime to see the final settlement.
        </p>
      </div>
    </DialogContent>
  </Dialog>
);
