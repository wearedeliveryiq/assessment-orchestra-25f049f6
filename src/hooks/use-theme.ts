import { usePreferences } from "@/hooks/use-preferences";
import { nextThemeMode } from "@/lib/shell/theme";
import type { ThemeMode } from "@/lib/shell/types";

/** ThemeService hook: read the mode, set it, or cycle dark → light → system. */
export function useTheme() {
  const { preferences, resolvedTheme, update } = usePreferences();

  return {
    mode: preferences.theme,
    resolvedTheme,
    setTheme: (mode: ThemeMode) => update({ theme: mode }),
    cycleTheme: () => update({ theme: nextThemeMode(preferences.theme) }),
  };
}
