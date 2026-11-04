import { useEffect, useState } from "react";

export const wakeLockSupported = () => typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Holds a screen wake lock while `enabled`. Browsers drop the lock when the tab is hidden,
 * so it is re-acquired whenever the page becomes visible again.
 */
export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || !wakeLockSupported()) {
      setActive(false);
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener("release", () => {
          sentinel = null;
          setActive(false);
        });
      } catch {
        setActive(false); // e.g. battery saver or permissions policy
      }
    };

    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [enabled]);

  return active;
}
