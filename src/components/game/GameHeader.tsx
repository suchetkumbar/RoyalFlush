import { useState } from "react";
import { Calculator, Download, Flag, Info, Moon, MoreVertical, SunMedium, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfoModal } from "../InfoModal";
import { THEME_SHORTCUT_LABEL, useThemeSwitch } from "@/hooks/useThemeSwitch";

interface Props {
  subtitle: string;
  undoLabel?: string;
  onUndo: () => void;
  onExport: () => void;
  onEnd: () => void;
}

export const GameHeader = ({ subtitle, undoLabel, onUndo, onExport, onEnd }: Props) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const { isDark, toggle } = useThemeSwitch();

  return (
    <header className="mx-auto mb-4 flex max-w-7xl items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand">
          <Calculator className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold sm:text-xl">RoyalFlush</h1>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!undoLabel}
          title={undoLabel ? `Undo: ${undoLabel}` : "Nothing to undo"}
          aria-label={undoLabel ? `Undo ${undoLabel}` : "Nothing to undo"}
          className="h-10 max-w-[14rem]"
        >
          <Undo2 className="h-4 w-4 sm:mr-1" />
          <span className="hidden truncate sm:inline">{undoLabel ? `Undo: ${undoLabel}` : "Undo"}</span>
        </Button>
        <Button variant="destructive" size="sm" onClick={onEnd} className="h-10">
          <Flag className="h-4 w-4 sm:mr-1" />
          <span className="sr-only sm:not-sr-only">End Game</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={onExport}>
              <Download className="mr-2 h-4 w-4" /> Export session
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setInfoOpen(true)}>
              <Info className="mr-2 h-4 w-4" /> How it works
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggle}>
              {isDark ? <SunMedium className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDark ? "Light theme" : "Dark theme"}
              <DropdownMenuShortcut className="text-[10px] tracking-normal">{THEME_SHORTCUT_LABEL}</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <InfoModal open={infoOpen} onOpenChange={setInfoOpen} />
    </header>
  );
};
