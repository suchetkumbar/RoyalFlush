import { useTheme } from "next-themes";

export const THEME_SHORTCUT_LABEL = "Ctrl/Cmd+Shift+L";

export const useThemeSwitch = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";
  return { isDark, toggle: () => setTheme(isDark ? "light" : "dark") };
};
