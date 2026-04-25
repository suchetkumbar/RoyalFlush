import { Player } from "@/lib/teenpatti";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, X } from "lucide-react";

interface Props {
  player: Player;
  isCurrent: boolean;
}

const statusStyle: Record<string, string> = {
  blind: "bg-blind/15 border-blind text-blind",
  seen: "bg-seen/15 border-seen text-seen",
  folded: "bg-folded/15 border-folded text-folded",
};

const statusIcon = {
  blind: <EyeOff className="w-3 h-3" />,
  seen: <Eye className="w-3 h-3" />,
  folded: <X className="w-3 h-3" />,
};

export const PlayerCard = ({ player, isCurrent }: Props) => {
  const folded = player.status === "folded";
  const balanceColor =
    player.balance > 0 ? "text-success" : player.balance < 0 ? "text-owed" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-3 transition-all bg-gradient-card",
        isCurrent && !folded
          ? "border-brand shadow-glow scale-[1.03]"
          : "border-border",
        folded && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-semibold truncate text-sm">{player.name}</span>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 capitalize",
            statusStyle[player.status]
          )}
        >
          {statusIcon[player.status]}
          {player.status}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Net</div>
          <div className={cn("text-lg font-bold", balanceColor)}>
            {player.balance >= 0 ? "+" : ""}₹{player.balance}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Round</div>
          <div className="text-sm font-semibold">₹{player.totalBetThisRound}</div>
        </div>
      </div>
    </div>
  );
};
