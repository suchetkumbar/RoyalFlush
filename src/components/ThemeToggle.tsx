import { useEffect } from "react";
import { THEME_SHORTCUT_LABEL, useThemeSwitch } from "@/hooks/useThemeSwitch";
import { Button } from "@/components/ui/button";
import { Moon, SunMedium } from "lucide-react";

/** Registers the global theme shortcut once (mounted in App). */
export const ThemeShortcut = () => {
  const { toggle } = useThemeSwitch();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);
  return null;
};

export const ThemeToggle = () => {
  const { isDark, toggle } = useThemeSwitch();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      title={`Toggle theme (${THEME_SHORTCUT_LABEL})`}
      className="flex items-center gap-2"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "Light" : "Dark"}
    </Button>
  );
};
