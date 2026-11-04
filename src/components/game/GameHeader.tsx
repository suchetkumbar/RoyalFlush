import { useState } from "react";
import { Check, Download, Flag, Info, Keyboard, Moon, MoreVertical, Smartphone, SunMedium, Undo2 } from "lucide-react";
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
import { Logo } from "../Logo";
import { THEME_SHORTCUT_LABEL, useThemeSwitch } from "@/hooks/useThemeSwitch";
import { useWakeLock, wakeLockSupported } from "@/hooks/useWakeLock";
import { getKeepAwake, setKeepAwake } from "@/lib/prefs";

interface Props {
  subtitle: string;
  undoLabel?: string;
  onUndo: () => void;
  onExport: () => void;
  onEnd: () => void;
  onShortcuts: () => void;
}

export const GameHeader = ({ subtitle, undoLabel, onUndo, onExport, onEnd, onShortcuts }: Props) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const { isDark, toggle } = useThemeSwitch();
  const [keepAwake, setKeepAwakeState] = useState(getKeepAwake);
  const awake = useWakeLock(keepAwake);

  return (
    <header className="mx-auto mb-4 flex max-w-7xl items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
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
          aria-keyshortcuts="Control+Z Meta+Z"
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
            <DropdownMenuItem onSelect={onShortcuts} className="hidden sm:flex">
              <Keyboard className="mr-2 h-4 w-4" /> Keyboard shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {wakeLockSupported() && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setKeepAwake(!keepAwake);
                  setKeepAwakeState(!keepAwake);
                }}
              >
                <Smartphone className="mr-2 h-4 w-4" /> Keep screen on
                {keepAwake && <Check className="ml-auto h-4 w-4" aria-label={awake ? "on" : "requested"} />}
              </DropdownMenuItem>
            )}
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
