// =============================================================
// Edge Function: send-push-notification
// =============================================================
// Disparada pelo trigger `trg_notify_admins_of_new_order` (postgres → pg_net).
//
// Fluxo:
// 1. Recebe { orderId, customerName, total, status } no body
// 2. Lê tokens dos usuários com role = 'admin' na tabela device_tokens
// 3. Gera um access token OAuth2 via Workload Identity Federation
// 4. Envia push via FCM HTTP v1 API para cada token
//
// Variáveis de ambiente esperadas (configure em
//   Supabase Dashboard > Edge Functions > send-push-notification > Secrets):
//
//   SUPABASE_URL                      (já vem por padrão)
//   SUPABASE_SERVICE_ROLE_KEY         (já vem por padrão)
//   GCP_PROJECT_ID                    (Workload Identity)
//   GCP_WORKLOAD_IDENTITY_PROVIDER    (Workload Identity)
//   GCP_SERVICE_ACCOUNT_EMAIL         (Service Account a ser impersonada)
// =============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getFirebaseAccessToken } from "../_shared/wif-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderPayload {
  orderId: string;
  customerName: string | null;
  total: number;
  status: string;
}

/**
 * Envia mensagem para um único token via FCM HTTP v1 API.
 */
async function sendToToken(
  accessToken: string,
  projectId: string,
  token: string,
  platform: "android" | "ios" | "web",
  title: string,
  body: string,
  data: Record<string, string>
) {
  const message: Record<string, unknown> = {
    token,
    notification: { title, body },
    data,
    android: {
      priority: "HIGH",
      notification: {
        sound: "new_order",
        channel_id: "orders",
        click_action: "FCM_PLUGIN_ACTIVITY",
      },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          alert: { title, body },
          sound: "new-order.mp3",
          badge: 1,
          "mutable-content": 1,
        },
      },
    },
  };

  // Token web (FCM Web SDK) usa shape diferente. Removemos blocos nativos.
  if (platform === "web") {
    delete message.android;
    delete message.apns;
  }

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    }
  );

  return { ok: res.ok, status: res.status, body: await res.text() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as OrderPayload;
    if (!payload.orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente Supabase com service role para ler tokens de TODOS os admins
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Pega user_ids dos admins
    const { data: admins, error: adminsErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminsErr) throw adminsErr;
    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminIds = admins.map((a) => a.user_id);

    // 2. Pega device_tokens dos admins
    const { data: tokens, error: tokensErr } = await supabase
      .from("device_tokens")
      .select("token, platform, user_id")
      .in("user_id", adminIds);

    if (tokensErr) throw tokensErr;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Obtém access token do FCM (via WIF)
    const accessToken = await getFirebaseAccessToken();
    const projectId = Deno.env.get("GCP_PROJECT_ID")!;

    const customer = payload.customerName || "Cliente";
    const valueStr = `R$ ${Number(payload.total).toFixed(2).replace(".", ",")}`;
    const title = "🔔 Novo Pedido!";
    const body = `${customer} — ${valueStr}`;

    // 4. Dispara em paralelo
    const results = await Promise.allSettled(
      tokens.map((t) =>
        sendToToken(accessToken, projectId, t.token, t.platform as any, title, body, {
          orderId: payload.orderId,
          route: "/admin/pedidos",
        })
      )
    );

    // 5. Limpa tokens inválidos (FCM responde 404/400 com erro UNREGISTERED)
    const invalidTokens: string[] = [];
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && !r.value.ok) {
        const respBody = r.value.body;
        if (
          respBody.includes("UNREGISTERED") ||
          respBody.includes("INVALID_ARGUMENT") ||
          r.value.status === 404
        ) {
          invalidTokens.push(tokens[idx].token);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await supabase.from("device_tokens").delete().in("token", invalidTokens);
    }

    const sentOk = results.filter((r) => r.status === "fulfilled" && (r as any).value.ok).length;

    return new Response(
      JSON.stringify({
        sent: sentOk,
        attempted: tokens.length,
        invalidatedTokens: invalidTokens.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
