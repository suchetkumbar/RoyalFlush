import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
          Cancel
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          onClick={() => {
            onOpenChange(false);
            onConfirm();
          }}
          className={destructive ? "flex-1" : "flex-1 bg-gradient-brand text-primary-foreground"}
        >
          {confirmLabel}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
