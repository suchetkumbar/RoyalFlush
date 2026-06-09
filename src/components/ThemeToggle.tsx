import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, SunMedium } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setTheme(currentTheme === "dark" ? "light" : "dark");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTheme, setTheme]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      title="Toggle theme (Ctrl/Cmd+J)"
      className="flex items-center gap-2"
    >
      {currentTheme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {currentTheme === "dark" ? "Light" : "Dark"}
    </Button>
  );
};
