import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeShortcut } from "@/components/ThemeToggle";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";

// Secondary screens are split out of the main bundle.
const SessionHistory = lazy(() => import("./pages/SessionHistory.tsx").then((m) => ({ default: m.SessionHistory })));
const Analytics = lazy(() => import("./pages/Analytics.tsx").then((m) => ({ default: m.Analytics })));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-bg text-sm text-muted-foreground" role="status">
    Loading…
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <ThemeShortcut />
    <TooltipProvider>
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/sessions" element={<SessionHistory />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
