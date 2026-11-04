import { useEffect } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

/** Registers the service worker; offers a reload when a new version is ready instead of forcing one. */
export const PwaUpdater = () => {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const updateSW = registerSW({
      onNeedRefresh() {
        toast("A new version of RoyalFlush is ready", {
          duration: Infinity,
          description: "Your game is saved. Reload when you're between hands.",
          action: { label: "Reload", onClick: () => void updateSW(true) },
        });
      },
      onOfflineReady() {
        toast.success("RoyalFlush now works offline");
      },
    });
  }, []);
  return null;
};
