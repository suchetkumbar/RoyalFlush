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
  <div className="sticky bottom-2 z-20 space-y-3 rounded-xl border border-brand/40 bg-card/95 p-3 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:static sm:bg-gradient-card sm:p-4">
    <div className="text-center" aria-live="polite">
      <div className="hidden text-xs uppercase text-muted-foreground sm:block">Current Turn</div>
      <div className="text-xl font-bold text-brand">{player.name}</div>
      <div className="text-xs capitalize text-muted-foreground">
        {player.status} · Call {formatMoney(call)} · Min Raise {formatMoney(minRaise)}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
      {player.status === "blind" && (
        <>
          <Button onClick={onBlind} variant="secondary" className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm">
            <Hand className="mr-1 h-4 w-4" /> Blind {formatMoney(call)}
          </Button>
          <Button onClick={onSee} className="h-12 w-full bg-seen text-base text-seen-foreground hover:bg-seen/85 sm:h-10 sm:w-auto sm:text-sm">
            <Eye className="mr-1 h-4 w-4" /> See
          </Button>
        </>
      )}
      {player.status === "seen" && (
        <Button onClick={onCall} variant="secondary" className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm">
          <Phone className="mr-1 h-4 w-4" /> Call {formatMoney(call)}
        </Button>
      )}
      <Button onClick={onRaise} className="h-12 w-full bg-gradient-brand text-base text-primary-foreground sm:h-10 sm:w-auto sm:text-sm">
        <TrendingUp className="mr-1 h-4 w-4" /> Raise
      </Button>
      <Button onClick={onFold} variant="destructive" className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm">
        <X className="mr-1 h-4 w-4" /> Fold
      </Button>
      {showAllowed && (
        <Button onClick={onShow} className="h-12 w-full bg-accent text-base text-accent-foreground sm:h-10 sm:w-auto sm:text-sm">
          <Trophy className="mr-1 h-4 w-4" /> Show
        </Button>
      )}
      <Button variant="outline" className="col-span-2 h-11 w-full sm:h-10 sm:w-auto" onClick={onDeclareWinner}>
        <RefreshCw className="mr-1 h-4 w-4" /> Declare Winner
      </Button>
    </div>
  </div>
);
