import { useEffect, useRef } from "react";

export type ShortcutMap = Record<string, (() => void) | undefined>;

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
};

/**
 * Single-key game shortcuts. Keys are lower-case letters, "?" or "mod+z" (Ctrl on Windows/Linux, Cmd on macOS).
 * Ignored while typing or while any dialog/menu is open so they never fire behind a modal.
 */
export function useShortcuts(map: ShortcutMap, enabled = true) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      let key: string;
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") key = "mod+z";
      else if (mod || e.altKey) return;
      else key = e.key === "?" ? "?" : e.key.toLowerCase();
      const handler = ref.current[key];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
