import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGame, type SessionResult } from "@/hooks/useGame";
import {
  activePlayers,
  callAmount,
  canShow,
  currentPlayer,
  manualActivePlayers,
  manualSubmitError,
  raiseError,
  raiseMin,
  type GameAction,
} from "@/lib/game";
import type { StoredSession } from "@/lib/storage";
import { getRoundStarterIndex, type GameMode, type HandType } from "@/lib/teenpatti";
import { formatMoney } from "@/lib/utils";
import { ExportDialog } from "./ExportDialog";
import { HistoryPanel } from "./HistoryPanel";
import { PlayerCard } from "./PlayerCard";
import { SettlementDialog } from "./SettlementDialog";
import { AutoActionPanel } from "./game/AutoActionPanel";
import { ConfirmDialog } from "./game/ConfirmDialog";
import { GameHeader } from "./game/GameHeader";
import { ManualRoundDialog } from "./game/ManualRoundDialog";
import { ManualRoundPanel } from "./game/ManualRoundPanel";
import { RaiseDialog } from "./game/RaiseDialog";
import { WinnerDialog } from "./game/WinnerDialog";

interface Props {
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  initialSession?: StoredSession | null;
  onExit: () => void;
}

export const GameTable = ({ names, boot, maxBet, mode, initialSession, onExit }: Props) => {
  const { config, state, dispatch, session, endSession } = useGame({ names, boot, maxBet, mode, initialSession });

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);

  const auto = mode === "auto";
  const player = currentPlayer(state);
  const active = activePlayers(state);
  const starterIdx = getRoundStarterIndex(state.round, state.players.length);
  const starter = state.players[starterIdx];
  // Seat order for this round: starter first, then clockwise (matches turn order at the table).
  const seated = [...state.players.slice(starterIdx), ...state.players.slice(0, starterIdx)];
  const lastUndo = state.undo[state.undo.length - 1];

  // Manual mode: open the entry dialog at the start of every round.
  useEffect(() => {
    if (!auto && !result) setManualOpen(true);
  }, [auto, state.round, result]);

  // Auto mode: when one player remains the winner dialog is forced open.
  const forcedWinner = auto && !result && active.length === 1;

  const act = (action: GameAction, message?: string) => {
    dispatch(action);
    if (message) toast(message);
  };

  const handleUndo = () => {
    if (!lastUndo) {
      toast.error("Nothing to undo");
      return;
    }
    dispatch({ type: "UNDO" });
    setWinnerOpen(false);
    toast(`Undid: ${lastUndo.label}`);
  };

  const handleRaise = (amount: number) => {
    if (!player) return;
    const error = raiseError(config, state, amount);
    if (error) {
      toast.error(error);
      return;
    }
    setRaiseOpen(false);
    act({ type: "RAISE", amount }, `${player.name} raised to ${formatMoney(amount)}`);
  };

  const handleShow = () => {
    const check = canShow(config, state);
    if (!check.ok) {
      toast.error(check.reason ?? "Show is not available");
      return;
    }
    dispatch({ type: "SHOW" });
    setWinnerOpen(true);
  };

  const handleAward = (winnerId: number, hand: HandType) => {
    const winner = state.players.find((p) => p.id === winnerId);
    dispatch({ type: "AWARD", winnerId, hand });
    setWinnerOpen(false);
    if (winner) toast.success(`${winner.name} won ${formatMoney(state.pot)}`);
  };

  const handleManualSubmit = () => {
    const error = manualSubmitError(state);
    if (error) {
      toast.error(error);
      return;
    }
    const remaining = manualActivePlayers(state);
    dispatch({ type: "MANUAL_SUBMIT" });
    if (remaining.length === 1) {
      // Pot is auto-awarded inside the engine; mirror it in the UI.
      const pot = state.pot + remaining.reduce((sum, p) => sum + (state.manual.bets[p.id] ?? 0), 0);
      toast.success(`${remaining[0].name} won ${formatMoney(pot)}`);
    } else {
      toast(`Iteration ${state.manual.iteration} saved`);
    }
  };

  const handleManualAward = (winnerId: number, hand: HandType) => {
    if (state.pot <= 0) {
      toast.error("No bets have been placed this round");
      return;
    }
    const winner = state.players.find((p) => p.id === winnerId);
    dispatch({ type: "MANUAL_AWARD", winnerId, hand });
    if (winner) toast.success(`${winner.name} won ${formatMoney(state.pot)}`);
  };

  const handleEndGame = () => {
    setManualOpen(false);
    setWinnerOpen(false);
    setResult(endSession());
  };

  if (!player) return null;

  return (
    <div className="min-h-screen bg-gradient-bg p-3 pb-6 sm:p-4">
      <GameHeader
        subtitle={`Round ${state.round} · ${
          auto ? `Auto · Boot ${formatMoney(boot)} · Max ${formatMoney(maxBet)}` : `Manual · Starter ${starter?.name ?? "-"}`
        }`}
        undoLabel={lastUndo?.label}
        onUndo={handleUndo}
        onExport={() => setExportOpen(true)}
        onEnd={() => setConfirmEnd(true)}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1fr,300px]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-gradient-card p-4">
            <div className="text-center">
              <div className="text-xs uppercase text-muted-foreground">Pot</div>
              <div className="text-xl font-bold text-brand sm:text-2xl">{formatMoney(state.pot)}</div>
            </div>
            <div className="border-x border-border text-center">
              <div className="text-xs uppercase text-muted-foreground">{auto ? "Stake (Seen)" : "Starter"}</div>
              <div className="truncate text-xl font-bold sm:text-2xl">
                {auto ? formatMoney(state.currentStake) : starter?.name ?? "-"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase text-muted-foreground">Active</div>
              <div className="text-xl font-bold sm:text-2xl">
                {auto ? active.length : manualActivePlayers(state).length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {seated.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isCurrent={auto && p.id === state.players[state.turnIdx]?.id}
                isStarter={p.id === starter?.id}
                showStatus={auto}
              />
            ))}
          </div>

          {auto ? (
            <AutoActionPanel
              player={player}
              call={callAmount(config, state, player)}
              minRaise={raiseMin(config, state, player)}
              showAllowed={canShow(config, state).ok}
              onBlind={() => act({ type: "BLIND" }, `${player.name} played blind`)}
              onSee={() => act({ type: "SEE" }, `${player.name} saw their cards`)}
              onCall={() => act({ type: "CALL" }, `${player.name} called`)}
              onRaise={() => setRaiseOpen(true)}
              onFold={() => act({ type: "FOLD" }, `${player.name} folded`)}
              onShow={handleShow}
              onDeclareWinner={() => setWinnerOpen(true)}
            />
          ) : (
            <ManualRoundPanel
              round={state.round}
              starterName={starter?.name ?? "-"}
              pot={state.pot}
              iteration={state.manual.iteration}
              activeCount={manualActivePlayers(state).length}
              history={state.history}
              onOpen={() => setManualOpen(true)}
              onDiscard={() => setConfirmDiscard(true)}
            />
          )}
        </div>

        <aside>
          <HistoryPanel log={state.log} />
        </aside>
      </div>

      {auto && (
        <>
          <RaiseDialog
            open={raiseOpen}
            onOpenChange={setRaiseOpen}
            playerName={player.name}
            min={raiseMin(config, state, player)}
            max={maxBet}
            onRaise={handleRaise}
          />
          <WinnerDialog
            open={winnerOpen || forcedWinner}
            forced={forcedWinner}
            onClose={() => setWinnerOpen(false)}
            candidates={active}
            pot={state.pot}
            onAward={handleAward}
          />
        </>
      )}

      {!auto && (
        <ManualRoundDialog
          open={manualOpen}
          onOpenChange={setManualOpen}
          state={state}
          starterName={starter?.name ?? "-"}
          undoLabel={lastUndo?.label}
          onBetChange={(playerId, amount) => dispatch({ type: "MANUAL_SET_BET", playerId, amount })}
          onToggleFold={(playerId) => dispatch({ type: "MANUAL_TOGGLE_FOLD", playerId })}
          onSubmit={handleManualSubmit}
          onWinnerStep={(open) => dispatch({ type: "MANUAL_WINNER_STEP", open })}
          onAward={handleManualAward}
          onUndo={handleUndo}
        />
      )}

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={`Discard round ${state.round}?`}
        description="All bets entered this round are refunded and the round restarts from the boot. You can Undo this."
        confirmLabel="Discard Round"
        destructive
        onConfirm={() => act({ type: "MANUAL_DISCARD" }, "Round discarded and restarted")}
      />

      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End the session?"
        description="This tallies everything and shows who pays whom. The current round, if unfinished, is refunded and not awarded."
        confirmLabel="End & Settle"
        onConfirm={handleEndGame}
      />

      <ExportDialog open={exportOpen} session={session} onOpenChange={setExportOpen} />

      <SettlementDialog
        open={result !== null}
        players={result?.players ?? []}
        settlements={result?.settlements ?? []}
        stats={result?.stats ?? []}
        onNewSession={onExit}
      />
    </div>
  );
};
