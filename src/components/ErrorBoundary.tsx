import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/** Catches render errors so a bug never shows a blank screen mid-game. The session is persisted, so a reload resumes it. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("RoyalFlush crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-bg p-6">
        <div role="alert" className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-gradient-card p-6 text-center shadow-soft">
          <AlertTriangle className="mx-auto h-8 w-8 text-warn" />
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Your game is saved on this device. Reloading will pick up where you left off.
          </p>
          <pre className="max-h-24 overflow-auto rounded-md bg-muted p-2 text-left text-[11px] text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button onClick={() => window.location.reload()} className="w-full bg-gradient-brand text-primary-foreground">
            <RotateCcw className="mr-2 h-4 w-4" /> Reload
          </Button>
        </div>
      </div>
    );
  }
}
