import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionLog,
  ActionType,
  computeStats,
  GameMode,
  getRoundStarterIndex,
  HAND_TYPES,
  HandType,
  Player,
  PlayerStats,
  prepareSessionClose,
  RoundRecord,
  Settlement,
  settle,
} from "@/lib/teenpatti";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "./ExportDialog";
import { HistoryPanel } from "./HistoryPanel";
import { InfoModal } from "./InfoModal";
import { PlayerCard } from "./PlayerCard";
import { SettlementDialog } from "./SettlementDialog";
import {
  archiveStoredSession,
  clearStoredSession,
  saveStoredSession,
  type StoredSession,
} from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Calculator,
  ClipboardPen,
  Eye,
  Flag,
  Hand,
  Phone,
  RefreshCw,
  Trash2,
  Trophy,
  TrendingUp,
  Undo2,
  X,
} from "lucide-react";

interface Snapshot {
  players: Player[];
  pot: number;
  currentStake: number;
  turnIdx: number;
  round: number;
  actionsCount: number;
  log: ActionLog[];
  history: RoundRecord[];
  label: string;
}

interface Props {
  names: string[];
  boot: number;
  maxBet: number;
  mode: GameMode;
  initialSession?: StoredSession | null;
  onExit: () => void;
}

const currency = (amount: number) => `Rs${amount}`;

export const GameTable = ({
  names,
  boot,
  maxBet,
  mode,
  initialSession,
  onExit,
}: Props) => {
  const initialState = initialSession?.state;

  const [players, setPlayers] = useState<Player[]>(() => initialState?.players ?? []);
  const [pot, setPot] = useState(() => initialState?.pot ?? 0);
  const [currentStake, setCurrentStake] = useState(() => initialState?.currentStake ?? Math.max(1, boot));
  const [turnIdx, setTurnIdx] = useState(() => initialState?.turnIdx ?? 0);
  const [round, setRound] = useState(() => initialState?.round ?? 0);
  const [history, setHistory] = useState<RoundRecord[]>(() => initialState?.history ?? []);
  const [log, setLog] = useState<ActionLog[]>(() => initialState?.log ?? []);
  const [actionsCount, setActionsCount] = useState(() => initialState?.actionsCount ?? 0);

  const [raiseDialog, setRaiseDialog] = useState(false);
  const [winnerDialog, setWinnerDialog] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState("");
  const [selectedHand, setSelectedHand] = useState<HandType>("Unknown");
  const [manualBets, setManualBets] = useState<Record<number, number>>(() => initialState?.manualBets ?? {});

  // Manual iteration state
  const [manualIteration, setManualIteration] = useState(() => initialState?.manualIteration ?? 1);
  const [manualFolded, setManualFolded] = useState<Set<number>>(
    () => new Set(initialState?.manualFolded ?? [])
  );
  const [manualCumulativeBets, setManualCumulativeBets] = useState<Record<number, number>>(
    () => initialState?.manualCumulativeBets ?? {}
  );
  const [manualRoundPot, setManualRoundPot] = useState(() => initialState?.manualRoundPot ?? 0);
  const [manualWinnerStep, setManualWinnerStep] = useState(() => initialState?.manualWinnerStep ?? false);
  const [exportOpen, setExportOpen] = useState(false);

  // Iteration-level undo snapshots (within a single manual round)
  interface IterationSnapshot {
    iteration: number;
    cumulativeBets: Record<number, number>;
    roundPot: number;
    folded: Set<number>;
    bets: Record<number, number>;
    log: ActionLog[];
  }
  const [iterationSnapshots, setIterationSnapshots] = useState<IterationSnapshot[]>([]);

  const [endDialog, setEndDialog] = useState(false);
  const [sessionPlayers, setSessionPlayers] = useState<Player[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [finalStats, setFinalStats] = useState<PlayerStats[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isEndingRound, setIsEndingRound] = useState(false);

  const snapshot = (label: string) => {
    setSnapshots((s) => [
      ...s,
      {
        players,
        pot,
        currentStake,
        turnIdx,
        round,
        actionsCount,
        log,
        history,
        label,
      },
    ].slice(-50));
  };

  const pushLog = (entry: Omit<ActionLog, "id" | "ts" | "round">) => {
    setLog((l) => [
      ...l,
      { ...entry, id: `${Date.now()}-${Math.random()}`, ts: Date.now(), round },
    ]);
  };

  const resetManualState = useCallback((basePlayers: Player[], bootPot: number) => {
    // First iteration bets default to 0 since boot is already paid
    setManualBets(
      Object.fromEntries(basePlayers.map((player) => [player.id, 0]))
    );
    setSelectedWinner("");
    setSelectedHand("Unknown");
    setManualIteration(1);
    setManualFolded(new Set());
    // Boot is pre-paid as each player's initial cumulative bet
    setManualCumulativeBets(
      Object.fromEntries(basePlayers.map((player) => [player.id, boot]))
    );
    setManualRoundPot(bootPot);
    setManualWinnerStep(false);
    setIterationSnapshots([]);
  }, [boot]);

  const startRound = useCallback((basePlayers: Player[], roundNum: number) => {
    const starterIdx = getRoundStarterIndex(roundNum, basePlayers.length);

    if (mode === "manual") {
      const bootPot = boot * basePlayers.length;
      const fresh = basePlayers.map((player) => ({
        ...player,
        status: "blind" as const,
        totalBetThisRound: boot,
        balance: player.balance - boot,
      }));
      setPlayers(fresh);
      setPot(bootPot);
      setCurrentStake(Math.max(1, boot));
      setTurnIdx(starterIdx);
      setActionsCount(0);
      // Log boot entries
      const ts = Date.now();
      setLog((l) => [
        ...l,
        ...basePlayers.map((player) => ({
          id: `${ts}-${player.id}-boot`,
          ts,
          round: roundNum,
          playerName: player.name,
          action: "boot" as ActionType,
          amount: boot,
        })),
      ]);
      resetManualState(fresh, bootPot);
      setManualDialog(true);
      return;
    }

    const fresh = basePlayers.map((player) => ({
      ...player,
      status: "blind" as const,
      totalBetThisRound: boot,
      balance: player.balance - boot,
    }));

    setPlayers(fresh);
    setPot(boot * basePlayers.length);
    setCurrentStake(Math.max(1, boot));
    setTurnIdx(starterIdx);
    setActionsCount(0);
    setLog((l) => [
      ...l,
      ...basePlayers.map((player) => ({
        id: `${Date.now()}-${player.id}-boot`,
        ts: Date.now(),
        round: roundNum,
        playerName: player.name,
        action: "boot" as ActionType,
        amount: boot,
      })),
    ]);
  }, [boot, mode, resetManualState]);

  useEffect(() => {
    if (initialState) return;

    const initialPlayers: Player[] = names.map((name, index) => ({
      id: index,
      name,
      status: "blind",
      balance: 0,
      totalBetThisRound: 0,
    }));
    setRound(1);
    startRound(initialPlayers, 1);
  }, [names, startRound, initialState]);

  const activePlayers = players.filter((player) => player.status !== "folded");
  const currentPlayer = players[turnIdx];

  const persistentSession = useMemo(() => {
    return {
      id: initialSession?.id ?? crypto.randomUUID?.() ?? `${Date.now()}`,
      version: 1,
      names,
      boot,
      maxBet,
      mode,
      createdAt: initialSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      state: {
        players,
        pot,
        currentStake,
        turnIdx,
        round,
        history,
        log,
        actionsCount,
        manualBets,
        manualIteration,
        manualFolded: Array.from(manualFolded),
        manualCumulativeBets,
        manualRoundPot,
        manualWinnerStep,
      },
    };
  }, [
    names,
    boot,
    maxBet,
    mode,
    players,
    pot,
    currentStake,
    turnIdx,
    round,
    history,
    log,
    actionsCount,
    manualBets,
    manualIteration,
    manualFolded,
    manualCumulativeBets,
    manualRoundPot,
    manualWinnerStep,
    initialSession?.createdAt,
    initialSession?.id,
  ]);

  useEffect(() => {
    if (names.length === 0) return;
    saveStoredSession(persistentSession);
  }, [names, persistentSession]);

  const callAmount = (player: Player): number => {
    const raw = player.status === "seen" ? currentStake : Math.max(boot, Math.floor(currentStake / 2));
    return Math.min(raw, maxBet);
  };

  const raiseMin = (player: Player) => Math.min(callAmount(player) * 2, maxBet);
  const raiseMax = () => maxBet;

  const nextTurn = (from: number, list: Player[]) => {
    let idx = from;
    for (let i = 0; i < list.length; i += 1) {
      idx = (idx + 1) % list.length;
      if (list[idx].status !== "folded") return idx;
    }
    return idx;
  };

  const placeBet = (amount: number) => {
    setPlayers((prev) =>
      prev.map((player, index) =>
        index === turnIdx
          ? {
              ...player,
              balance: player.balance - amount,
              totalBetThisRound: player.totalBetThisRound + amount,
            }
          : player
      )
    );
    setPot((value) => value + amount);
  };

  const advance = (newStake?: number) => {
    setActionsCount((count) => count + 1);
    if (newStake !== undefined) setCurrentStake(newStake);
    setPlayers((prev) => {
      setTurnIdx(nextTurn(turnIdx, prev));
      return prev;
    });
  };

  const handleUndo = () => {
    if (snapshots.length === 0) {
      toast.error("Nothing to undo");
      return;
    }
    const last = snapshots[snapshots.length - 1];
    setPlayers(last.players);
    setPot(last.pot);
    setCurrentStake(last.currentStake);
    setTurnIdx(last.turnIdx);
    setRound(last.round);
    setActionsCount(last.actionsCount);
    setLog(last.log);
    setHistory(last.history);
    setSnapshots((s) => s.slice(0, -1));
    setWinnerDialog(false);
    setManualDialog(false);
    toast(`Undid: ${last.label}`);
  };

  const handlePlayBlind = () => {
    if (mode !== "auto" || !currentPlayer) return;
    snapshot(`${currentPlayer.name} blind`);
    const amount = callAmount(currentPlayer);
    placeBet(amount);
    pushLog({ playerName: currentPlayer.name, action: "blind", amount });
    toast(`${currentPlayer.name} played blind`);
    advance();
  };

  const handleSee = () => {
    if (mode !== "auto" || !currentPlayer) return;
    snapshot(`${currentPlayer.name} see`);
    setPlayers((prev) =>
      prev.map((player, index) => (index === turnIdx ? { ...player, status: "seen" } : player))
    );
    pushLog({ playerName: currentPlayer.name, action: "see" });
    toast(`${currentPlayer.name} saw their cards`);
  };

  const handleCall = () => {
    if (mode !== "auto" || !currentPlayer) return;
    snapshot(`${currentPlayer.name} call`);
    const amount = callAmount(currentPlayer);
    placeBet(amount);
    pushLog({ playerName: currentPlayer.name, action: "call", amount });
    const newStake = currentPlayer.status === "seen" ? amount : currentStake;
    toast(`${currentPlayer.name} called`);
    advance(newStake);
  };

  const handleRaise = (raiseTo: number) => {
    if (mode !== "auto" || !currentPlayer) return;
    if (raiseTo > maxBet) {
      toast.error(`Max bet is ${currency(maxBet)}`);
      return;
    }
    if (raiseTo < raiseMin(currentPlayer)) {
      toast.error(`Min raise is ${currency(raiseMin(currentPlayer))}`);
      return;
    }
    snapshot(`${currentPlayer.name} raise`);
    placeBet(raiseTo);
    const newStake = currentPlayer.status === "seen" ? raiseTo : Math.min(raiseTo * 2, maxBet);
    pushLog({ playerName: currentPlayer.name, action: "raise", amount: raiseTo });
    setRaiseDialog(false);
    toast(`${currentPlayer.name} raised`);
    advance(newStake);
  };

  const handleFold = () => {
    if (mode !== "auto" || !currentPlayer) return;
    snapshot(`${currentPlayer.name} fold`);
    setPlayers((prev) =>
      prev.map((player, index) => (index === turnIdx ? { ...player, status: "folded" } : player))
    );
    pushLog({ playerName: currentPlayer.name, action: "fold" });
    toast(`${currentPlayer.name} folded`);
    setActionsCount((count) => count + 1);
    setPlayers((prev) => {
      setTurnIdx(nextTurn(turnIdx, prev));
      return prev;
    });
  };

  const canShow = (): { ok: boolean; reason?: string } => {
    if (mode !== "auto" || !currentPlayer) return { ok: false, reason: "Show is only available in Auto mode" };
    const active = players.filter((player) => player.status !== "folded");
    if (active.length !== 2) return { ok: false, reason: "Show only when 2 players remain" };
    if (currentPlayer.status !== "seen") return { ok: false, reason: "Only seen players can request show" };
    if (actionsCount < players.length && turnIdx === getRoundStarterIndex(round, players.length)) {
      return { ok: false, reason: "The round starter cannot show in the first rotation" };
    }
    let prev = turnIdx;
    for (let i = 0; i < players.length; i += 1) {
      prev = (prev - 1 + players.length) % players.length;
      if (players[prev].status !== "folded") break;
    }
    if (players[prev].status === "blind") {
      return { ok: false, reason: "Cannot show against a blind player" };
    }
    return { ok: true };
  };

  const handleShow = () => {
    if (mode !== "auto" || !currentPlayer) return;
    const check = canShow();
    if (!check.ok) {
      toast.error(check.reason || "Show is not available");
      return;
    }
    snapshot(`${currentPlayer.name} show`);
    const amount = callAmount(currentPlayer);
    placeBet(amount);
    pushLog({ playerName: currentPlayer.name, action: "show", amount });
    setSelectedWinner("");
    setSelectedHand("Unknown");
    setWinnerDialog(true);
  };

  useEffect(() => {
    if (mode !== "auto" || players.length === 0 || winnerDialog || isEndingRound) return;
    const active = players.filter((player) => player.status !== "folded");
    if (active.length === 1) {
      setSelectedWinner(active[0].name);
      setSelectedHand("Unknown");
      setWinnerDialog(true);
    }
  }, [isEndingRound, mode, players, winnerDialog]);

  const advanceRound = (updatedPlayers: Player[]) => {
    setIsEndingRound(true);
    setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      startRound(updatedPlayers, nextRound);
      setIsEndingRound(false);
    }, 100);
  };

  const confirmWinner = () => {
    if (mode !== "auto" || isEndingRound) return;
    if (!selectedWinner) {
      toast.error("Select a winner");
      return;
    }
    const winner = players.find((player) => player.name === selectedWinner);
    if (!winner) return;

    snapshot(`Round ${round} won by ${winner.name}`);
    const finalPot = pot;
    const updatedPlayers = players.map((player) =>
      player.id === winner.id ? { ...player, balance: player.balance + finalPot } : player
    );
    setPlayers(updatedPlayers);
    pushLog({
      playerName: winner.name,
      action: "win",
      amount: finalPot,
      note: selectedHand,
    });
    setHistory((records) => [
      ...records,
      {
        round,
        winnerName: winner.name,
        handType: selectedHand,
        pot: finalPot,
        players: activePlayers.length || 1,
      },
    ]);
    toast.success(`${winner.name} won ${currency(finalPot)}`);
    setWinnerDialog(false);
    advanceRound(updatedPlayers);
  };

  const handleManualBetChange = (playerId: number, value: string) => {
    setManualBets((prev) => ({
      ...prev,
      [playerId]: Math.max(0, parseInt(value) || 0),
    }));
  };

  const handleManualFold = (playerId: number) => {
    setManualFolded((prev) => {
      const next = new Set(prev);
      next.add(playerId);
      return next;
    });
    // Zero out their bet for this iteration
    setManualBets((prev) => ({ ...prev, [playerId]: 0 }));
  };

  const handleUndoIteration = () => {
    if (iterationSnapshots.length === 0) {
      toast.error("Nothing to undo");
      return;
    }
    const last = iterationSnapshots[iterationSnapshots.length - 1];
    setManualIteration(last.iteration);
    setManualCumulativeBets(last.cumulativeBets);
    setManualRoundPot(last.roundPot);
    setPot(last.roundPot);
    setManualFolded(last.folded);
    setManualBets(last.bets);
    setLog(last.log);
    // Update player cards to match restored state
    setPlayers((prev) =>
      prev.map((player) => ({
        ...player,
        totalBetThisRound: last.cumulativeBets[player.id] || 0,
        balance: player.balance
          + (manualCumulativeBets[player.id] || 0)
          - (last.cumulativeBets[player.id] || 0),
        status: last.folded.has(player.id) ? "folded" as const : "blind" as const,
      }))
    );
    setIterationSnapshots((s) => s.slice(0, -1));
    toast(`Undid iteration ${last.iteration}`);
  };

  const submitManualIteration = () => {
    if (mode !== "manual") return;

    // Check if there are any new bets or folds to submit
    const activeBets = Object.entries(manualBets).filter(
      ([id]) => !manualFolded.has(Number(id))
    );
    const hasNewFolds = players.some(
      (p) => manualFolded.has(p.id) && p.status !== "folded"
    );
    if (!hasNewFolds && activeBets.every(([, amount]) => amount <= 0)) {
      toast.error("Enter at least one positive bet or fold a player");
      return;
    }

    // Save iteration snapshot for undo
    setIterationSnapshots((s) => [
      ...s,
      {
        iteration: manualIteration,
        cumulativeBets: { ...manualCumulativeBets },
        roundPot: manualRoundPot,
        folded: new Set(manualFolded),
        bets: { ...manualBets },
        log: [...log],
      },
    ]);

    // Accumulate bets from this iteration
    const newCumulative = { ...manualCumulativeBets };
    let iterationPot = 0;
    for (const [idStr, amount] of Object.entries(manualBets)) {
      const id = Number(idStr);
      if (!manualFolded.has(id) && amount > 0) {
        newCumulative[id] = (newCumulative[id] || 0) + amount;
        iterationPot += amount;
      }
    }
    setManualCumulativeBets(newCumulative);
    const newPot = manualRoundPot + iterationPot;
    setManualRoundPot(newPot);
    setPot(newPot);

    // Update player cards to reflect cumulative bets & fold status
    setPlayers((prev) =>
      prev.map((player) => ({
        ...player,
        totalBetThisRound: newCumulative[player.id] || 0,
        balance: player.balance - (manualBets[player.id] || 0),
        status: manualFolded.has(player.id) ? "folded" as const : "blind" as const,
      }))
    );

    // Log the iteration bets
    const ts = Date.now();
    setLog((entries) => [
      ...entries,
      ...Object.entries(manualBets)
        .filter(([id, amount]) => !manualFolded.has(Number(id)) && amount > 0)
        .map(([id, amount]) => ({
          id: `${ts}-${id}-manual-iter${manualIteration}`,
          ts,
          round,
          playerName: players.find((p) => p.id === Number(id))?.name || "",
          action: "manual" as ActionType,
          amount,
          note: `Iteration ${manualIteration}`,
        })),
    ]);

    // Log any folds that happened this iteration
    const newFoldsThisIteration = players.filter(
      (p) => manualFolded.has(p.id) && p.status !== "folded"
    );
    if (newFoldsThisIteration.length > 0) {
      setLog((entries) => [
        ...entries,
        ...newFoldsThisIteration.map((p) => ({
          id: `${ts}-${p.id}-manual-fold-iter${manualIteration}`,
          ts,
          round,
          playerName: p.name,
          action: "fold" as ActionType,
          note: `Iteration ${manualIteration}`,
        })),
      ]);
    }

    toast(`Iteration ${manualIteration} saved · Pot: ${currency(newPot)}`);

    // Reset bets for next iteration (default to 0, boot is already paid)
    const nextIteration = manualIteration + 1;
    setManualIteration(nextIteration);
    setManualBets(
      Object.fromEntries(
        players
          .filter((p) => !manualFolded.has(p.id))
          .map((p) => [p.id, 0])
      )
    );

    // If only one active player remains, auto-award the pot
    const activeCount = players.filter((p) => !manualFolded.has(p.id)).length;
    if (activeCount <= 1) {
      const lastPlayer = players.find((p) => !manualFolded.has(p.id));
      if (lastPlayer) {
        // Pass data explicitly to avoid stale closure issues
        const finalPot = newPot;
        const finalBets = newCumulative;
        setSelectedWinner(lastPlayer.name);
        setSelectedHand("Unknown");
        setTimeout(() => {
          confirmManualRound(lastPlayer.name, "Unknown", finalPot, finalBets);
        }, 150);
      }
    }
  };

  const openManualWinnerStep = () => {
    setManualWinnerStep(true);
    setSelectedWinner("");
    setSelectedHand("Unknown");
  };

  const confirmManualRound = (
    explicitWinner?: string,
    explicitHand?: HandType,
    explicitPot?: number,
    explicitBets?: Record<number, number>
  ) => {
    if (mode !== "manual" || isEndingRound) return;
    const winnerName = explicitWinner || selectedWinner;
    const handType = explicitHand || selectedHand;
    if (!winnerName) {
      toast.error("Select a winner");
      return;
    }

    const winner = players.find((player) => player.name === winnerName);
    if (!winner) return;

    const totalBets = explicitBets || manualCumulativeBets;
    const totalPot = explicitPot ?? manualRoundPot;

    if (totalPot <= 0) {
      toast.error("No bets have been placed this round");
      return;
    }

    snapshot(`Manual round ${round}`);

    // Apply final balances: winner gains pot, bets already deducted during iterations
    const updatedPlayers = players.map((player) => {
      const winnings = player.id === winner.id ? totalPot : 0;
      return {
        ...player,
        balance: player.balance + winnings,
        totalBetThisRound: totalBets[player.id] || 0,
        status: manualFolded.has(player.id) ? ("folded" as const) : ("blind" as const),
      };
    });

    const ts = Date.now();
    setPlayers(updatedPlayers);
    setPot(totalPot);
    setLog((entries) => [
      ...entries,
      {
        id: `${ts}-${winner.id}-manual-win`,
        ts,
        round,
        playerName: winner.name,
        action: "win" as ActionType,
        amount: totalPot,
        note: handType,
      },
    ]);
    setHistory((records) => [
      ...records,
      {
        round,
        winnerName: winner.name,
        handType: handType,
        pot: totalPot,
        players: players.filter((p) => !manualFolded.has(p.id)).length || 1,
      },
    ]);
    setManualDialog(false);
    toast.success(`${winner.name} won ${currency(totalPot)}`);
    advanceRound(updatedPlayers);
  };

  const discardCurrentRound = () => {
    if (mode !== "manual") return;

    // Refund cumulative bets back to each player
    const refundedPlayers = players.map((player) => {
      const totalBet = manualCumulativeBets[player.id] || 0;
      return {
        ...player,
        balance: player.balance + totalBet,
        totalBetThisRound: 0,
        status: "blind" as const,
      };
    });

    // Remove all log entries belonging to the current round
    setLog((prev) => prev.filter((entry) => entry.round !== round));

    // Restart the same round fresh
    const bootPot = boot * refundedPlayers.length;
    const fresh = refundedPlayers.map((player) => ({
      ...player,
      balance: player.balance - boot,
      totalBetThisRound: boot,
    }));
    setPlayers(fresh);
    setPot(bootPot);
    resetManualState(fresh, bootPot);
    setManualDialog(false);

    // Log boot entries for the restarted round
    const ts = Date.now();
    setLog((prev) => [
      ...prev,
      ...fresh.map((player) => ({
        id: `${ts}-${player.id}-boot`,
        ts,
        round,
        playerName: player.name,
        action: "boot" as ActionType,
        amount: boot,
      })),
    ]);

    toast("Round discarded and restarted");
  };

  const handleEndGame = () => {
    const closedSession = prepareSessionClose(players, log, round);
    setSessionPlayers(closedSession.players);
    setSettlements(settle(closedSession.players));
    setFinalStats(computeStats(closedSession.players, closedSession.log, history));
    setEndDialog(true);
    setConfirmEnd(false);
    archiveStoredSession(persistentSession);
  };

  if (!currentPlayer) return null;

  const showCheck = canShow();
  const roundStarter = players[getRoundStarterIndex(round, players.length)];

  return (
    <div className="min-h-screen bg-gradient-bg p-3 sm:p-4">
      <header className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
            <Calculator className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">RoyalFlush</h1>
            <p className="text-xs text-muted-foreground">
              Round {round} · {mode === "auto" ? `Auto · Boot ${currency(boot)} · Max ${currency(maxBet)}` : `Manual · Starter ${roundStarter?.name || "-"}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={snapshots.length === 0}
            title={snapshots.length > 0 ? `Undo: ${snapshots[snapshots.length - 1].label}` : "Nothing to undo"}
            className="flex-1 sm:flex-none"
          >
            <Undo2 className="mr-1 h-4 w-4" /> Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <ClipboardPen className="mr-1 h-4 w-4" /> Export
          </Button>
          <InfoModal />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmEnd(true)}
            className="flex-1 sm:flex-none"
          >
            <Flag className="mr-1 h-4 w-4" /> End Game
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1fr,300px]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-gradient-card p-4">
            <div className="text-center">
              <div className="text-xs uppercase text-muted-foreground">Pot</div>
              <div className="text-xl font-bold text-brand sm:text-2xl">{currency(pot)}</div>
            </div>
            <div className="border-x border-border text-center">
              <div className="text-xs uppercase text-muted-foreground">
                {mode === "auto" ? "Stake (Seen)" : "Starter"}
              </div>
              <div className="text-xl font-bold sm:text-2xl">
                {mode === "auto" ? currency(currentStake) : roundStarter?.name || "-"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase text-muted-foreground">Active</div>
              <div className="text-xl font-bold sm:text-2xl">{activePlayers.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {players.map((player, index) => (
              <PlayerCard key={player.id} player={player} isCurrent={index === turnIdx && mode === "auto"} />
            ))}
          </div>

          {mode === "auto" ? (
            <div className="space-y-3 rounded-xl border border-brand/40 bg-gradient-card p-4 shadow-soft">
              <div className="text-center">
                <div className="text-xs uppercase text-muted-foreground">Current Turn</div>
                <div className="text-xl font-bold text-brand">{currentPlayer.name}</div>
                <div className="text-xs capitalize text-muted-foreground">
                  {currentPlayer.status} · Call {currency(callAmount(currentPlayer))} · Min Raise {currency(raiseMin(currentPlayer))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
                {currentPlayer.status === "blind" && (
                  <>
                    <Button onClick={handlePlayBlind} variant="secondary" className="w-full sm:w-auto">
                      <Hand className="mr-1 h-4 w-4" /> Blind
                    </Button>
                    <Button onClick={handleSee} className="w-full bg-seen text-foreground hover:bg-seen/80 sm:w-auto">
                      <Eye className="mr-1 h-4 w-4" /> See
                    </Button>
                  </>
                )}
                {currentPlayer.status === "seen" && (
                  <Button onClick={handleCall} variant="secondary" className="w-full sm:w-auto">
                    <Phone className="mr-1 h-4 w-4" /> Call {currency(callAmount(currentPlayer))}
                  </Button>
                )}
                <Button onClick={() => setRaiseDialog(true)} className="w-full bg-gradient-brand text-primary-foreground sm:w-auto">
                  <TrendingUp className="mr-1 h-4 w-4" /> Raise
                </Button>
                <Button onClick={handleFold} variant="destructive" className="w-full sm:w-auto">
                  <X className="mr-1 h-4 w-4" /> Fold
                </Button>
                {showCheck.ok && (
                  <Button onClick={handleShow} className="w-full bg-accent text-accent-foreground sm:w-auto">
                    <Trophy className="mr-1 h-4 w-4" /> Show
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="col-span-2 w-full sm:w-auto"
                  onClick={() => {
                    setSelectedWinner("");
                    setSelectedHand("Unknown");
                    setWinnerDialog(true);
                  }}
                >
                  <RefreshCw className="mr-1 h-4 w-4" /> Declare Winner
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Current round — live card */}
              <div className="rounded-xl border-2 border-brand/40 bg-gradient-card p-4 shadow-soft">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-brand">Round {round} · In Progress</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">
                      {players.filter((p) => !manualFolded.has(p.id)).length} active
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={discardCurrentRound}
                      title="Discard this round and restart"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/30 p-2 text-center text-sm">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Starter</div>
                    <div className="truncate font-bold">{roundStarter?.name || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Pot</div>
                    <div className="font-bold text-brand">{currency(manualRoundPot)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Iteration</div>
                    <div className="font-bold">{manualIteration}</div>
                  </div>
                </div>
                <Button onClick={() => setManualDialog(true)} className="w-full bg-gradient-brand text-primary-foreground">
                  <ClipboardPen className="mr-1 h-4 w-4" /> Enter Iteration
                </Button>
              </div>

              {/* Previous rounds — stacked below */}
              {history.length > 0 && (
                <div className="space-y-2">
                  {[...history].reverse().map((r) => (
                    <div
                      key={r.round}
                      className="flex items-center justify-between rounded-lg border border-border bg-gradient-card p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-brand">R{r.round}</span>
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span className="truncate font-medium">{r.winnerName}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {r.handType} · {r.players}p
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-success">+₹{r.pot}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside>
          <HistoryPanel log={log} />
        </aside>
      </div>

      <Dialog open={raiseDialog} onOpenChange={setRaiseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise - {currentPlayer.name}</DialogTitle>
            <DialogDescription>Pick a quick amount or enter a custom raise.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Min {currency(raiseMin(currentPlayer))} · Max {currency(raiseMax())}
          </p>
          <div className="grid grid-cols-3 gap-2 py-2">
            {Array.from(
              new Set([
                raiseMin(currentPlayer),
                raiseMin(currentPlayer) * 2,
                raiseMax(),
              ].filter((value) => value >= raiseMin(currentPlayer) && value <= raiseMax()))
            ).map((amount) => (
              <Button
                key={amount}
                onClick={() => handleRaise(amount)}
                className="bg-gradient-brand text-primary-foreground"
              >
                {currency(amount)}
              </Button>
            ))}
          </div>
          <CustomRaise min={raiseMin(currentPlayer)} max={raiseMax()} onSubmit={handleRaise} />
        </DialogContent>
      </Dialog>

      <Dialog open={winnerDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-brand">Round Winner</DialogTitle>
            <DialogDescription>Select the winning player and hand, then award the current pot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Winner</Label>
              <Select value={selectedWinner} onValueChange={setSelectedWinner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players
                    .filter((player) => player.status !== "folded")
                    .map((player) => (
                      <SelectItem key={player.id} value={player.name}>
                        {player.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Winning Hand</Label>
              <Select value={selectedHand} onValueChange={(value) => setSelectedHand(value as HandType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HAND_TYPES.map((hand) => (
                    <SelectItem key={hand} value={hand}>
                      {hand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Pot: <span className="font-bold text-brand">{currency(pot)}</span>
            </div>
            <Button
              onClick={confirmWinner}
              size="lg"
              disabled={isEndingRound}
              className="w-full bg-gradient-brand font-bold text-primary-foreground"
            >
              Award Pot & Next Round
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualDialog} onOpenChange={setManualDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-brand">Manual Round {round}</DialogTitle>
            <DialogDescription>
              {manualWinnerStep
                ? "Select the winner to award the pot."
                : `Iteration ${manualIteration} · Starter: ${roundStarter?.name || "-"}`}
            </DialogDescription>
          </DialogHeader>

          {!manualWinnerStep ? (
            <>
              {/* Iteration summary bar */}
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/50 p-2 text-center text-sm">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Iteration</div>
                  <div className="font-bold text-brand">{manualIteration}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Pot</div>
                  <div className="font-bold text-brand">{currency(manualRoundPot)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Active</div>
                  <div className="font-bold">{players.filter((p) => !manualFolded.has(p.id)).length}</div>
                </div>
              </div>

              {/* Player bet inputs */}
              <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {players.map((player) => {
                  const isFolded = manualFolded.has(player.id);
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 transition-all",
                        isFolded
                          ? "border-folded/30 bg-folded/5 opacity-50"
                          : "border-border bg-background/30"
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
                          {!isFolded && manualCumulativeBets[player.id] > 0 && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              Total: {currency(manualCumulativeBets[player.id])}
                            </span>
                          )}
                        </div>
                      </div>
                      {isFolded ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <>
                          <Input
                            id={`manual-${player.id}`}
                            type="number"
                            min={0}
                            value={manualBets[player.id] ?? 0}
                            onChange={(e) => handleManualBetChange(player.id, e.target.value)}
                            className="w-24 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManualFold(player.id)}
                            className="shrink-0 text-folded hover:bg-folded/10 hover:text-folded"
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

              {/* This iteration's pot preview */}
              <div className="text-center text-sm text-muted-foreground">
                This iteration:{" "}
                <span className="font-bold text-foreground">
                  {currency(
                    Object.entries(manualBets)
                      .filter(([id]) => !manualFolded.has(Number(id)))
                      .reduce((sum, [, amount]) => sum + amount, 0)
                  )}
                </span>
                {manualRoundPot > 0 && (
                  <> · Round total: <span className="font-bold text-brand">{currency(
                    manualRoundPot +
                    Object.entries(manualBets)
                      .filter(([id]) => !manualFolded.has(Number(id)))
                      .reduce((sum, [, amount]) => sum + amount, 0)
                  )}</span></>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 sm:flex-row">
                {iterationSnapshots.length > 0 && (
                  <Button
                    onClick={handleUndoIteration}
                    variant="ghost"
                    size="sm"
                    className="flex-none text-muted-foreground hover:text-foreground"
                    title={`Undo iteration ${iterationSnapshots[iterationSnapshots.length - 1].iteration}`}
                  >
                    <Undo2 className="mr-1 h-4 w-4" /> Undo
                  </Button>
                )}
                <Button
                  onClick={submitManualIteration}
                  className="flex-1 bg-gradient-brand font-bold text-primary-foreground"
                >
                  <TrendingUp className="mr-1 h-4 w-4" /> Submit Iteration
                </Button>
                <Button
                  onClick={() => openManualWinnerStep()}
                  variant="outline"
                  className="flex-1 border-brand/40 text-brand hover:bg-brand/10"
                  disabled={manualRoundPot <= 0}
                >
                  <Trophy className="mr-1 h-4 w-4" /> Declare Winner
                </Button>
              </div>
            </>
          ) : (
            /* Winner selection step */
            <div className="space-y-3">
              <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-center">
                <div className="text-xs uppercase text-muted-foreground">Total Pot</div>
                <div className="text-2xl font-bold text-brand">{currency(manualRoundPot)}</div>
                <div className="text-xs text-muted-foreground">
                  {manualIteration - 1} iteration{manualIteration - 1 !== 1 ? "s" : ""} played
                </div>
              </div>
              <div className="space-y-1">
                <Label>Winner</Label>
                <Select value={selectedWinner} onValueChange={setSelectedWinner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select winner" />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter((player) => !manualFolded.has(player.id))
                      .map((player) => (
                        <SelectItem key={player.id} value={player.name}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Winning Hand</Label>
                <Select value={selectedHand} onValueChange={(value) => setSelectedHand(value as HandType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HAND_TYPES.map((hand) => (
                      <SelectItem key={hand} value={hand}>
                        {hand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setManualWinnerStep(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => confirmManualRound()}
                  size="lg"
                  disabled={isEndingRound}
                  className="flex-1 bg-gradient-brand font-bold text-primary-foreground"
                >
                  Award Pot & Next Round
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End the session?</DialogTitle>
            <DialogDescription>
              The current unfinished round will be excluded from settlement.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will tally everything and show who pays whom. The current round, if unfinished, will
            not be awarded.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmEnd(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleEndGame} className="flex-1 bg-gradient-brand text-primary-foreground">
              End & Settle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExportDialog open={exportOpen} session={persistentSession} onOpenChange={setExportOpen} />

      <SettlementDialog
        open={endDialog}
        players={sessionPlayers}
        settlements={settlements}
        stats={finalStats}
        onNewSession={onExit}
      />
    </div>
  );
};

const CustomRaise = ({
  min,
  max,
  onSubmit,
}: {
  min: number;
  max: number;
  onSubmit: (value: number) => void;
}) => {
  const [value, setValue] = useState(min);

  useEffect(() => {
    setValue(min);
  }, [min, max]);

  return (
    <div className="flex gap-2 border-t border-border pt-2">
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value, 10) || min)}
      />
      <Button onClick={() => onSubmit(Math.min(max, Math.max(min, value)))} variant="outline">
        Custom
      </Button>
    </div>
  );
};
