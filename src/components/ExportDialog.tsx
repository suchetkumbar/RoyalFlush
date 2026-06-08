import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import type { StoredSession } from "@/lib/storage";
import {
  copySessionJson,
  downloadActionLogCsv,
  downloadPlayersCsv,
  downloadSessionJson,
} from "@/lib/export";

interface Props {
  open: boolean;
  session: StoredSession | null;
  onOpenChange: (open: boolean) => void;
}

export const ExportDialog = ({ open, session, onOpenChange }: Props) => {
  const handleDownloadJson = () => {
    if (!session) return;
    downloadSessionJson(session);
    toast.success("Session JSON downloaded");
  };

  const handleCopyJson = async () => {
    if (!session) return;
    try {
      await copySessionJson(session);
      toast.success("Session JSON copied");
    } catch {
      toast.error("Unable to copy to clipboard");
    }
  };

  const handleDownloadLog = () => {
    if (!session) return;
    downloadActionLogCsv(session.state.log);
    toast.success("Action log downloaded");
  };

  const handleDownloadPlayers = () => {
    if (!session) return;
    downloadPlayersCsv(session.state.players);
    toast.success("Player summary downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Session</DialogTitle>
          <DialogDescription>
            Download or copy the current session state and action history.
          </DialogDescription>
        </DialogHeader>

        {session ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
              Exported file data includes the player state, action log, round history, and current game progress.
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={handleDownloadJson} className="w-full">
                <Download className="mr-2 h-4 w-4" /> Download JSON
              </Button>
              <Button onClick={handleCopyJson} variant="outline" className="w-full">
                <ClipboardCopy className="mr-2 h-4 w-4" /> Copy JSON
              </Button>
              <Button onClick={handleDownloadLog} variant="secondary" className="w-full">
                <FileText className="mr-2 h-4 w-4" /> Download Action Log
              </Button>
              <Button onClick={handleDownloadPlayers} variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" /> Download Players CSV
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No session is available to export yet.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
