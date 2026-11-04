import { Eye, Hand, Phone, RefreshCw, TrendingUp, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/teenpatti";
import { formatMoney } from "@/lib/utils";

interface Props {
  player: Player;
  call: number;
  minRaise: number;
  showAllowed: boolean;
  onBlind: () => void;
  onSee: () => void;
  onCall: () => void;
  onRaise: () => void;
  onFold: () => void;
  onShow: () => void;
  onDeclareWinner: () => void;
}

export const AutoActionPanel = ({
  player,
  call,
  minRaise,
  showAllowed,
  onBlind,
  onSee,
  onCall,
  onRaise,
  onFold,
  onShow,
  onDeclareWinner,
}: Props) => (
  <div className="space-y-3 rounded-xl border border-brand/40 bg-gradient-card p-4 shadow-soft">
    <div className="text-center" aria-live="polite">
      <div className="text-xs uppercase text-muted-foreground">Current Turn</div>
      <div className="text-xl font-bold text-brand">{player.name}</div>
      <div className="text-xs capitalize text-muted-foreground">
        {player.status} · Call {formatMoney(call)} · Min Raise {formatMoney(minRaise)}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
      {player.status === "blind" && (
        <>
          <Button onClick={onBlind} variant="secondary" className="w-full sm:w-auto">
            <Hand className="mr-1 h-4 w-4" /> Blind {formatMoney(call)}
          </Button>
          <Button onClick={onSee} className="w-full bg-seen text-foreground hover:bg-seen/80 sm:w-auto">
            <Eye className="mr-1 h-4 w-4" /> See
          </Button>
        </>
      )}
      {player.status === "seen" && (
        <Button onClick={onCall} variant="secondary" className="w-full sm:w-auto">
          <Phone className="mr-1 h-4 w-4" /> Call {formatMoney(call)}
        </Button>
      )}
      <Button onClick={onRaise} className="w-full bg-gradient-brand text-primary-foreground sm:w-auto">
        <TrendingUp className="mr-1 h-4 w-4" /> Raise
      </Button>
      <Button onClick={onFold} variant="destructive" className="w-full sm:w-auto">
        <X className="mr-1 h-4 w-4" /> Fold
      </Button>
      {showAllowed && (
        <Button onClick={onShow} className="w-full bg-accent text-accent-foreground sm:w-auto">
          <Trophy className="mr-1 h-4 w-4" /> Show
        </Button>
      )}
      <Button variant="outline" className="col-span-2 w-full sm:w-auto" onClick={onDeclareWinner}>
        <RefreshCw className="mr-1 h-4 w-4" /> Declare Winner
      </Button>
    </div>
  </div>
);
