import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

interface Props {
  onStart: () => void;
}

export const Disclaimer = ({ onStart }: Props) => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-bg">
    <div className="max-w-md w-full text-center space-y-6 bg-gradient-card border border-border rounded-2xl p-8 shadow-glow">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-soft">
          <Calculator className="w-8 h-8 text-primary-foreground" />
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Teen Patti Tally</h1>
        <p className="text-sm text-muted-foreground mt-1">Offline scorekeeper for in-person games</p>
      </div>
      <div className="border-t border-b border-border py-5 space-y-2">
        <p className="text-foreground font-medium">⚠️ Disclaimer</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This app is for entertainment purposes only and tracks bets between friends.
          No real money is processed by the app.
        </p>
      </div>
      <Button
        onClick={onStart}
        size="lg"
        className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 font-bold"
      >
        I Understand
      </Button>
    </div>
  </div>
);
