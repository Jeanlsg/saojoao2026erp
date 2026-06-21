import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Registra o dispositivo para push notifications via FCM/APNs.
 * - Pede permissão ao usuário
 * - Obtém o token FCM (Android) ou APNs (iOS)
 * - Salva/atualiza na tabela device_tokens do Supabase
 * - Escuta refresh de token e atualiza automaticamente
 *
 * Deve ser montado UMA VEZ em RouterBootstrap (sob <BrowserRouter>).
 */
export function usePushRegistration() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || registeredRef.current) return;

    const platform = Capacitor.getPlatform() as "android" | "ios";

    const saveToken = async (token: string) => {
      try {
        // Upsert: se o token já existe para esse user, atualiza last_seen_at
        const { error } = await supabase.from("device_tokens").upsert(
          {
            user_id: user.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );
        if (error) console.error("[Push] Erro ao salvar token:", error.message);
      } catch (e) {
        console.error("[Push] Erro ao salvar token:", e);
      }
    };

    const register = async () => {
      try {
        // 1. Pedir permissão
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.log("[Push] Permissão negada pelo usuário");
          return;
        }

        // 2. Registrar no FCM/APNs
        await PushNotifications.register();

        // 3. Escutar token
        PushNotifications.addListener("registration", (tokenData) => {
          console.log("[Push] Token recebido:", tokenData.value.substring(0, 20) + "...");
          saveToken(tokenData.value);
        });

        // 4. Escutar erro de registro
        PushNotifications.addListener("registrationError", (error) => {
          console.error("[Push] Erro no registro:", error);
        });

        // 5. Escutar notificações recebidas com app em foreground
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[Push] Notificação recebida (foreground):", notification);
          // Aqui podemos disparar uma notificação local ou toast
        });

        // 6. Escutar tap em notificação
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("[Push] Tap na notificação:", action);
          const route = action.notification.data?.route;
          if (route && typeof window !== "undefined") {
            // Navega para a rota indicada no payload
            window.location.hash = route;
          }
        });

        registeredRef.current = true;
      } catch (e) {
        console.error("[Push] Erro geral no registro:", e);
      }
    };

    register();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);
}
