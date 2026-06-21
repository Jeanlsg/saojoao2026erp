import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMesaSession } from "@/lib/mesaSession";

/**
 * Envia heartbeat a cada 30s para manter a mesa ativa no servidor.
 * Se o dispositivo parar de responder, a mesa é liberada após 5 min.
 */
export function useMesaHeartbeat() {
  useEffect(() => {
    const session = getMesaSession();
    if (!session) return;

    const sendHeartbeat = () => {
      supabase.rpc("heartbeat_mesa", {
        p_numero: session.numero,
        p_device_id: session.device_id,
      });
    };

    // Envia imediatamente
    sendHeartbeat();

    // Depois a cada 30 segundos
    const interval = setInterval(sendHeartbeat, 30000);

    // Limpa ao desmontar
    return () => clearInterval(interval);
  }, []);
}
