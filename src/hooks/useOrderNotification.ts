import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getNotificationPrefs } from "@/hooks/useNotificationPreferences";

const CUSTOM_SOUND_URL = "/sounds/new-order.mp3";
let customSoundUnavailable = false; // cache: evita 404 repetido após primeira falha

/** Tenta tocar o .mp3 customizado; retorna true se conseguiu, false se faltar. */
function playCustomSound(): boolean {
  if (customSoundUnavailable || typeof window === "undefined") return false;
  try {
    const audio = new Audio(CUSTOM_SOUND_URL);
    audio.volume = 0.7;
    const promise = audio.play();
    if (promise) {
      promise.catch(() => {
        // Falha silenciosa: arquivo não existe, autoplay bloqueado, etc.
        customSoundUnavailable = true;
      });
    }
    return true;
  } catch {
    customSoundUnavailable = true;
    return false;
  }
}

/** Bipe sintetizado via Web Audio API — fallback sem arquivo. */
function playSynthBeep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.15);
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    setTimeout(() => {
      const ctx2 = new Ctx();
      const osc2 = ctx2.createOscillator();
      const gain2 = ctx2.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx2.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1000, ctx2.currentTime);
      osc2.frequency.setValueAtTime(1200, ctx2.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.3, ctx2.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.4);
      osc2.start(ctx2.currentTime);
      osc2.stop(ctx2.currentTime + 0.4);
    }, 600);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
}

function playNotificationSound() {
  // Prefere o .mp3 customizado (qualidade); cai pro bipe sintetizado se faltar
  if (!playCustomSound()) {
    playSynthBeep();
  }
}

function fireBrowserNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      tag: "novo-pedido",
      requireInteraction: false,
    });
  } catch (e) {
    console.warn("Browser notification failed:", e);
  }
}

async function fireMobileNotification(title: string, body: string, extra?: Record<string, unknown>) {
  if (!Capacitor.isNativePlatform()) return;
  // Som customizado: Android busca em res/raw/ (sem extensão), iOS busca no bundle (com extensão).
  // Se o arquivo não existir, o sistema cai para som padrão automaticamente.
  const platform = Capacitor.getPlatform();
  const sound = platform === "ios" ? "new-order.mp3" : "new_order";
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now() % 2147483647,
          title,
          body,
          smallIcon: "ic_stat_icon_config_sample",
          sound,
          ongoing: false,
          autoCancel: true,
          // extra é entregue no callback localNotificationActionPerformed
          extra: { route: "/admin/pedidos", ...extra },
        },
      ],
    });
  } catch (e) {
    console.warn("Mobile notification failed:", e);
  }
}

/**
 * Função STANDALONE — pode ser chamada de qualquer lugar (contexts,
 * event handlers, etc.) sem precisar do hook. Lê preferências fresh.
 */
export function dispatchOrderNotification(
  title: string,
  body: string,
  opts?: { forceSound?: boolean; extra?: Record<string, unknown> }
) {
  const prefs = getNotificationPrefs();
  if (prefs.sound || opts?.forceSound) playNotificationSound();
  if (prefs.browserPush) fireBrowserNotification(title, body);
  if (prefs.mobilePush) void fireMobileNotification(title, body, opts?.extra);
}

export function useOrderNotification() {
  const notify = useCallback(
    (title: string, body: string, opts?: { forceSound?: boolean }) => {
      dispatchOrderNotification(title, body, opts);
    },
    []
  );

  const playSound = useCallback(() => {
    playNotificationSound();
  }, []);

  return { notify, playSound };
}
