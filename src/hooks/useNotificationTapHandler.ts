import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Escuta tap em notificação nativa (Capacitor) e navega para a rota indicada
 * no campo `extra.route` do payload. Default: /admin/pedidos.
 *
 * Deve ser montado UMA VEZ dentro de um componente que esteja sob o
 * <BrowserRouter> (porque usa useNavigate).
 */
export function useNotificationTapHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const route = (action.notification.extra as { route?: string } | undefined)?.route;
      navigate(route ?? "/admin/pedidos");
    }).then((handle) => {
      removeListener = () => handle.remove();
    });

    return () => {
      removeListener?.();
    };
  }, [navigate]);
}
