import { HAND_TYPES, type HandType, type Player } from "@/lib/teenpatti";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  candidates: Player[];
  winnerId: string;
  onWinnerChange: (id: string) => void;
  hand: HandType;
  onHandChange: (hand: HandType) => void;
}

export const WinnerPicker = ({ candidates, winnerId, onWinnerChange, hand, onHandChange }: Props) => (
  <>
    <div className="space-y-1">
      <Label>Winner</Label>
      <Select value={winnerId} onValueChange={onWinnerChange}>
        <SelectTrigger aria-label="Winner">
          <SelectValue placeholder="Select player" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((player) => (
            <SelectItem key={player.id} value={String(player.id)}>
              {player.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label>Winning Hand</Label>
      <Select value={hand} onValueChange={(value) => onHandChange(value as HandType)}>
        <SelectTrigger aria-label="Winning hand">
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
  </>
);
