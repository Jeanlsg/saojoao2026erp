import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const STORAGE_KEY = "arraia-notification-prefs";

export interface NotificationPrefs {
  /** Toca som (Web Audio) ao chegar pedido novo */
  sound: boolean;
  /** Mostra notificação do navegador (web) */
  browserPush: boolean;
  /** Dispara notificação nativa do celular (Capacitor) */
  mobilePush: boolean;
  /** Auto-imprime cupom ao chegar pedido */
  autoPrintReceipt: boolean;
  /** Auto-imprime ficha de entrega (somente entregas) */
  autoPrintDelivery: boolean;
}

const DEFAULTS: NotificationPrefs = {
  sound: true,
  browserPush: false,
  mobilePush: Capacitor.isNativePlatform(),
  autoPrintReceipt: false,
  autoPrintDelivery: false,
};

function load(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(load);

  useEffect(() => save(prefs), [prefs]);

  const update = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /** Pede permissão de notificação ao navegador. Retorna true se concedida. */
  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  /** Pede permissão de notificação nativa (Capacitor). Retorna true se concedida. */
  const requestMobilePermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch {
      return false;
    }
  }, []);

  return { prefs, update, requestBrowserPermission, requestMobilePermission };
}

/** Lê preferências sem se inscrever em mudanças (uso em event handlers). */
export function getNotificationPrefs(): NotificationPrefs {
  return load();
}
