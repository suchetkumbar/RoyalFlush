import { useState, useEffect, useCallback } from "react";
import {
  Player,
  RoundRecord,
  ActionLog,
  ActionType,
  HandType,
  HAND_TYPES,
  Settlement,
  PlayerStats,
  settle,
  computeStats,
  prepareSessionClose,
} from "@/lib/teenpatti";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "./PlayerCard";
import { HistoryPanel } from "./HistoryPanel";
import { InfoModal } from "./InfoModal";
import { SettlementDialog } from "./SettlementDialog";
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
  Flag,
  RefreshCw,
  Eye,
  TrendingUp,
  X,
  Phone,
  Hand,
  Trophy,
  Calculator,
  Undo2,
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
  onExit: () => void;
}

export const GameTable = ({ names, boot, maxBet, onExit }: Props) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [pot, setPot] = useState(0);
  const [currentStake, setCurrentStake] = useState(boot);
  const [turnIdx, setTurnIdx] = useState(0);
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [log, setLog] = useState<ActionLog[]>([]);
  const [actionsCount, setActionsCount] = useState(0);

  const [raiseDialog, setRaiseDialog] = useState(false);
  const [winnerDialog, setWinnerDialog] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [selectedHand, setSelectedHand] = useState<HandType>("Unknown");
  const [endDialog, setEndDialog] = useState(false);
  const [sessionPlayers, setSessionPlayers] = useState<Player[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [finalStats, setFinalStats] = useState<PlayerStats[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isEndingRound, setIsEndingRound] = useState(false);

  // ----- Snapshot for undo -----
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
    ].slice(-50)); // keep last 50
  };

  const handleUndo = () => {
    if (snapshots.length === 0) return toast.error("Nothing to undo");
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
    toast(`Undid: ${last.label}`);
  };

  // ----- Logging -----
  const pushLog = (entry: Omit<ActionLog, "id" | "ts" | "round">) => {
    setLog((l) => [
      ...l,
      { ...entry, id: `${Date.now()}-${Math.random()}`, ts: Date.now(), round },
    ]);
  };

  // ----- Round init -----
  const startRound = useCallback(
    (basePlayers: Player[], roundNum: number) => {
      const fresh = basePlayers.map((p) => ({
        ...p,
        status: "blind" as const,
        totalBetThisRound: boot,
        balance: p.balance - boot,
      }));
      setPlayers(fresh);
      setPot(boot * basePlayers.length);
      setCurrentStake(boot);
      setTurnIdx(0);
      setActionsCount(0);
      // log boots
      setLog((l) => [
        ...l,
        ...basePlayers.map((p) => ({
          id: `${Date.now()}-${p.id}-boot`,
          ts: Date.now(),
          round: roundNum,
          playerName: p.name,
          action: "boot" as ActionType,
          amount: boot,
        })),
      ]);
    },
    [boot]
  );

  useEffect(() => {
    const init: Player[] = names.map((n, i) => ({
      id: i,
      name: n,
      status: "blind",
      balance: 0,
      totalBetThisRound: 0,
    }));
    setRound(1);
    startRound(init, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlayers = players.filter((p) => p.status !== "folded");
  const currentPlayer = players[turnIdx];

  // ----- Bet math -----
  const callAmount = (p: Player): number => {
    const raw = p.status === "seen" ? currentStake : Math.max(boot, Math.floor(currentStake / 2));
    return Math.min(raw, maxBet);
  };
  const raiseMin = (p: Player) => Math.min(callAmount(p) * 2, maxBet);
  const raiseMax = () => maxBet;


  // ----- Turn -----
  const nextTurn = (from: number, list: Player[]) => {
    let idx = from;
    for (let i = 0; i < list.length; i++) {
      idx = (idx + 1) % list.length;
      if (list[idx].status !== "folded") return idx;
    }
    return idx;
  };

  // ----- Place bet -----
  const placeBet = (amount: number) => {
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === turnIdx
          ? {
              ...p,
              balance: p.balance - amount,
              totalBetThisRound: p.totalBetThisRound + amount,
            }
          : p
      )
    );
    setPot((p) => p + amount);
  };

  const advance = (newStake?: number) => {
    setActionsCount((c) => c + 1);
    if (newStake !== undefined) setCurrentStake(newStake);
    setPlayers((prev) => {
      setTurnIdx(nextTurn(turnIdx, prev));
      return prev;
    });
  };

  // ----- Actions -----
  const handlePlayBlind = () => {
    snapshot(`${currentPlayer.name} blind`);
    const amt = callAmount(currentPlayer);
    placeBet(amt);
    pushLog({ playerName: currentPlayer.name, action: "blind", amount: amt });
    toast(`${currentPlayer.name} played blind`);
    advance();
  };

  const handleSee = () => {
    snapshot(`${currentPlayer.name} see`);
    setPlayers((prev) =>
      prev.map((p, i) => (i === turnIdx ? { ...p, status: "seen" } : p))
    );
    pushLog({ playerName: currentPlayer.name, action: "see" });
    toast(`${currentPlayer.name} saw their cards`);
  };

  const handleCall = () => {
    snapshot(`${currentPlayer.name} call`);
    const amt = callAmount(currentPlayer);
    placeBet(amt);
    pushLog({ playerName: currentPlayer.name, action: "call", amount: amt });
    const newStake = currentPlayer.status === "seen" ? amt : currentStake;
    toast(`${currentPlayer.name} called`);
    advance(newStake);
  };

  const handleRaise = (raiseTo: number) => {
    if (raiseTo > maxBet) return toast.error(`Max bet is ₹${maxBet}`);
    if (raiseTo < raiseMin(currentPlayer)) return toast.error(`Min raise is ₹${raiseMin(currentPlayer)}`);
    snapshot(`${currentPlayer.name} raise`);
    placeBet(raiseTo);
    const newStake = currentPlayer.status === "seen" ? raiseTo : Math.min(raiseTo * 2, maxBet);
    pushLog({ playerName: currentPlayer.name, action: "raise", amount: raiseTo });
    toast(`${currentPlayer.name} raised`);
    setRaiseDialog(false);
    advance(newStake);
  };

  const handleFold = () => {
    snapshot(`${currentPlayer.name} fold`);
    setPlayers((prev) =>
      prev.map((p, i) => (i === turnIdx ? { ...p, status: "folded" } : p))
    );
    pushLog({ playerName: currentPlayer.name, action: "fold" });
    toast(`${currentPlayer.name} folded`);
    setActionsCount((c) => c + 1);
    setPlayers((prev) => {
      setTurnIdx(nextTurn(turnIdx, prev));
      return prev;
    });
  };

  // Show: 2 active, current must be seen, prev not blind, not first iter for opener
  const canShow = (): { ok: boolean; reason?: string } => {
    const active = players.filter((p) => p.status !== "folded");
    if (active.length !== 2) return { ok: false, reason: "Show only when 2 players remain" };
    if (currentPlayer?.status !== "seen") return { ok: false, reason: "Only seen players can request show" };
    if (actionsCount < players.length && turnIdx === 0)
      return { ok: false, reason: "First player cannot show in first iteration" };
    let prev = turnIdx;
    for (let i = 0; i < players.length; i++) {
      prev = (prev - 1 + players.length) % players.length;
      if (players[prev].status !== "folded") break;
    }
    if (players[prev].status === "blind")
      return { ok: false, reason: "Cannot show against a blind player" };
    return { ok: true };
  };

  const handleShow = () => {
    const chk = canShow();
    if (!chk.ok) return toast.error(chk.reason!);
    snapshot(`${currentPlayer.name} show`);
    const amt = callAmount(currentPlayer);
    placeBet(amt);
    pushLog({ playerName: currentPlayer.name, action: "show", amount: amt });
    toast(`${currentPlayer.name} requested show — pick winner`);
    setSelectedWinner("");
    setSelectedHand("Unknown");
    setWinnerDialog(true);
  };

  // Auto-prompt winner if only 1 active
  useEffect(() => {
    if (players.length === 0 || winnerDialog || isEndingRound) return;
    const active = players.filter((p) => p.status !== "folded");
    if (active.length === 1) {
      setSelectedWinner(active[0].name);
      setSelectedHand("Unknown");
      setWinnerDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, winnerDialog, isEndingRound]);

  const confirmWinner = () => {
    if (isEndingRound) return;
    if (!selectedWinner) return toast.error("Select a winner");
    const winner = players.find((p) => p.name === selectedWinner);
    if (!winner) return;
    setIsEndingRound(true);
    snapshot(`Round ${round} won by ${winner.name}`);
    const finalPot = pot;
    const updated = players.map((p) =>
      p.id === winner.id ? { ...p, balance: p.balance + finalPot } : p
    );
    setPlayers(updated);
    pushLog({
      playerName: winner.name,
      action: "win",
      amount: finalPot,
      note: selectedHand,
    });
    setHistory((h) => [
      ...h,
      {
        round,
        winnerName: winner.name,
        handType: selectedHand,
        pot: finalPot,
        players: activePlayers.length || 1,
      },
    ]);
    toast.success(`${winner.name} won ₹${finalPot}`);
    setWinnerDialog(false);

    // start next round
    setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      startRound(updated, nextRound);
      setIsEndingRound(false);
    }, 100);
  };

  const handleEndGame = () => {
    const closedSession = prepareSessionClose(players, log, round);

    setSessionPlayers(closedSession.players);
    setSettlements(settle(closedSession.players));
    setFinalStats(computeStats(closedSession.players, closedSession.log, history));
    setEndDialog(true);
    setConfirmEnd(false);
  };

  if (!currentPlayer) return null;

  const showCheck = canShow();

  return (
    <div className="min-h-screen bg-gradient-bg p-3 sm:p-4">
      {/* Header */}
      <header className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Calculator className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">RoyalFlush</h1>
            <p className="text-xs text-muted-foreground">Round {round} · Boot ₹{boot} · Max ₹{maxBet}</p>
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
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
          <InfoModal />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmEnd(true)}
            className="flex-1 sm:flex-none"
          >
            <Flag className="w-4 h-4 mr-1" /> End Game
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-4 max-w-7xl mx-auto">
        <div className="space-y-4">
          {/* Pot info */}
          <div className="grid grid-cols-3 bg-gradient-card border border-border rounded-xl p-4 gap-2">
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase">Pot</div>
              <div className="text-2xl font-bold text-brand">₹{pot}</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-xs text-muted-foreground uppercase">Stake (Seen)</div>
              <div className="text-2xl font-bold">₹{currentStake}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase">Active</div>
              <div className="text-2xl font-bold">{activePlayers.length}</div>
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((p, i) => (
              <PlayerCard key={p.id} player={p} isCurrent={i === turnIdx} />
            ))}
          </div>

          {/* Action panel */}
          <div className="bg-gradient-card border border-brand/40 rounded-xl p-4 space-y-3 shadow-soft">
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase">Current Turn</div>
              <div className="text-xl font-bold text-brand">{currentPlayer.name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {currentPlayer.status} · Call ₹{callAmount(currentPlayer)} · Min Raise ₹
                {raiseMin(currentPlayer)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
              {currentPlayer.status === "blind" && (
                <>
                  <Button onClick={handlePlayBlind} variant="secondary" className="w-full sm:w-auto">
                    <Hand className="w-4 h-4 mr-1" /> Blind
                  </Button>
                  <Button
                    onClick={handleSee}
                    className="w-full bg-seen text-foreground hover:bg-seen/80 sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-1" /> See
                  </Button>
                </>
              )}
              {currentPlayer.status === "seen" && (
                <Button onClick={handleCall} variant="secondary" className="w-full sm:w-auto">
                  <Phone className="w-4 h-4 mr-1" /> Call ₹{callAmount(currentPlayer)}
                </Button>
              )}
              <Button
                onClick={() => setRaiseDialog(true)}
                className="w-full bg-gradient-brand text-primary-foreground sm:w-auto"
              >
                <TrendingUp className="w-4 h-4 mr-1" /> Raise
              </Button>
              <Button onClick={handleFold} variant="destructive" className="w-full sm:w-auto">
                <X className="w-4 h-4 mr-1" /> Fold
              </Button>
              {showCheck.ok && (
                <Button
                  onClick={handleShow}
                  className="w-full bg-accent text-accent-foreground sm:w-auto"
                >
                  <Trophy className="w-4 h-4 mr-1" /> Show
                </Button>
              )}
              <Button
                variant="outline"
                className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                onClick={() => {
                  setSelectedWinner("");
                  setSelectedHand("Unknown");
                  setWinnerDialog(true);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Declare Winner
              </Button>
            </div>
          </div>
        </div>

        <aside>
          <HistoryPanel history={history} log={log} />
        </aside>
      </div>

      {/* Raise Dialog */}
      <Dialog open={raiseDialog} onOpenChange={setRaiseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise — {currentPlayer.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Min ₹{raiseMin(currentPlayer)} · Max ₹{raiseMax()}.
          </p>
          <div className="grid grid-cols-3 gap-2 py-2">
            {Array.from(
              new Set(
                [
                  raiseMin(currentPlayer),
                  raiseMin(currentPlayer) * 2,
                  raiseMax(),
                ].filter((v) => v >= raiseMin(currentPlayer) && v <= raiseMax())
              )
            ).map((amt) => (
              <Button
                key={amt}
                onClick={() => handleRaise(amt)}
                className="bg-gradient-brand text-primary-foreground"
              >
                ₹{amt}
              </Button>
            ))}
          </div>
          <CustomRaise
            min={raiseMin(currentPlayer)}
            max={raiseMax()}
            onSubmit={(v) => handleRaise(v)}
          />
        </DialogContent>
      </Dialog>

      {/* Winner Dialog */}
      <Dialog open={winnerDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-brand">Round Winner</DialogTitle>
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
                    .filter((p) => p.status !== "folded")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Winning Hand</Label>
              <Select
                value={selectedHand}
                onValueChange={(v) => setSelectedHand(v as HandType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HAND_TYPES.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-center text-muted-foreground">
              Pot: <span className="text-brand font-bold">₹{pot}</span>
            </div>
            <Button
              onClick={confirmWinner}
              size="lg"
              disabled={isEndingRound}
              className="w-full bg-gradient-brand text-primary-foreground font-bold"
            >
              Award Pot & Next Round
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm End */}
      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End the session?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will tally everything and show who pays whom. The current round (if any) will
            not be awarded.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmEnd(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleEndGame}
              className="flex-1 bg-gradient-brand text-primary-foreground"
            >
              End & Settle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settlement */}
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
  onSubmit: (v: number) => void;
}) => {
  const [v, setV] = useState(min);
  return (
    <div className="flex gap-2 pt-2 border-t border-border">
      <Input
        type="number"
        min={min}
        max={max}
        value={v}
        onChange={(e) => setV(parseInt(e.target.value) || min)}
      />
      <Button
        onClick={() => onSubmit(Math.min(max, Math.max(min, v)))}
        variant="outline"
      >
        Custom
      </Button>
    </div>
  );
};
