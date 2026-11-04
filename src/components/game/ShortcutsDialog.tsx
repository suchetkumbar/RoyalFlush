import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { THEME_SHORTCUT_LABEL } from "@/hooks/useThemeSwitch";

const AUTO: [string, string][] = [
  ["B", "Play blind"],
  ["S", "See cards"],
  ["C", "Call"],
  ["R", "Raise"],
  ["F", "Fold"],
  ["H", "Show (when allowed)"],
  ["D", "Declare winner"],
];
const MANUAL: [string, string][] = [["N", "Enter next iteration"]];
const COMMON: [string, string][] = [
  ["Ctrl/Cmd + Z", "Undo last action"],
  ["?", "Show this list"],
  [THEME_SHORTCUT_LABEL.replace(/\+/g, " + "), "Toggle light/dark"],
];

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold">{children}</kbd>
);

export const ShortcutsDialog = ({
  open,
  onOpenChange,
  auto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auto: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>Work whenever no dialog is open and you are not typing.</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        {[...(auto ? AUTO : MANUAL), ...COMMON].map(([key, label]) => (
          <div key={key} className="contents">
            <dt>
              <Kbd>{key}</Kbd>
            </dt>
            <dd className="text-muted-foreground">{label}</dd>
          </div>
        ))}
      </dl>
    </DialogContent>
  </Dialog>
);
