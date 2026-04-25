import { Player } from "@/lib/teenpatti";
import { cn } from "@/lib/utils";

interface Props {
  player: Player;
  isCurrent: boolean;
}

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
      <span className="font-semibold truncate text-sm block mb-1">{player.name}</span>
      <div className={cn("text-lg font-bold", balanceColor)}>
        {player.balance >= 0 ? "+" : ""}₹{player.balance}
      </div>
    </div>
  );
};
