import { Crown } from "lucide-react";
import type { Player, PlayerStatus } from "@/lib/teenpatti";
import { cn, formatMoney, formatSignedMoney } from "@/lib/utils";

interface Props {
  player: Player;
  /** Whose turn it is (Auto mode). */
  isCurrent: boolean;
  /** Player who opened this round. */
  isStarter?: boolean;
  /** Show the status badge (Auto mode tracks blind/seen; Manual only folded). */
  showStatus?: boolean;
}

const STATUS_STYLE: Record<PlayerStatus, string> = {
  blind: "bg-blind/15 text-blind",
  seen: "bg-seen/15 text-seen",
  folded: "bg-folded/15 text-folded",
};

const STATUS_LABEL: Record<PlayerStatus, string> = {
  blind: "Blind",
  seen: "Seen",
  folded: "Folded",
};

export const PlayerCard = ({ player, isCurrent, isStarter = false, showStatus = true }: Props) => {
  const folded = player.status === "folded";
  const balanceColor =
    player.balance > 0 ? "text-success" : player.balance < 0 ? "text-owed" : "text-muted-foreground";
  const active = isCurrent && !folded;

  return (
    <div
      role="group"
      aria-current={active ? "true" : undefined}
      aria-label={`${player.name}, ${STATUS_LABEL[player.status]}, balance ${formatSignedMoney(player.balance)}${
        active ? ", current turn" : ""
      }`}
      className={cn(
        "relative rounded-xl border-2 bg-gradient-card p-3 transition-[box-shadow,border-color,opacity]",
        active ? "border-brand shadow-glow ring-2 ring-brand/30 ring-offset-2 ring-offset-background" : "border-border",
        folded && "opacity-55"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1">
          {isStarter && <Crown aria-hidden className="h-3.5 w-3.5 shrink-0 text-warn" />}
          <span className="truncate text-sm font-semibold">{player.name}</span>
        </span>
        {(showStatus || folded) && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              STATUS_STYLE[player.status]
            )}
          >
            {STATUS_LABEL[player.status]}
          </span>
        )}
      </div>
      <div className={cn("text-lg font-bold tabular-nums", balanceColor)}>{formatSignedMoney(player.balance)}</div>
      <div className="text-[11px] text-muted-foreground">
        In pot: <span className="font-medium tabular-nums text-foreground/80">{formatMoney(player.totalBetThisRound)}</span>
      </div>
      {active && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          Turn
        </span>
      )}
    </div>
  );
};
