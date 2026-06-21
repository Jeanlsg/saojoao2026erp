import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Sincroniza a barra de status nativa do Android/iOS com o tema atual
 * do app (light/dark). Em web é no-op.
 *
 * Deve ser montado UMA VEZ dentro do <ThemeProvider>.
 */
export function useNativeThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isDark = resolvedTheme === "dark";

    // Tom do TEXTO/ÍCONES da status bar (oposto ao fundo)
    StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark }).catch(() => undefined);

    // Cor de fundo da status bar (somente Android — iOS usa transparente)
    if (Capacitor.getPlatform() === "android") {
      StatusBar.setBackgroundColor({ color: isDark ? "#1a222e" : "#ffffff" }).catch(() => undefined);
    }
  }, [resolvedTheme]);
}
