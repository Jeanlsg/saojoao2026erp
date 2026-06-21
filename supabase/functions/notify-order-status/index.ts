// =============================================================
// Edge Function: notify-order-status
// =============================================================
// Disparada pelo trigger `trg_notify_customer_order_status`.
// Envia push notification para o CLIENTE quando o status do pedido muda.
//
// Payload: { orderId, userId, customerName, status, oldStatus }
// =============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create as createJWT, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  orderId: string;
  userId: string | null;
  customerName: string | null;
  status: string;
  oldStatus: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

const STATUS_MESSAGES: Record<string, { title: string; body: (name: string) => string }> = {
  preparando: {
    title: "🍳 Pedido em preparo!",
    body: (name) => `${name}, seu pedido está sendo preparado.`,
  },
  entregue: {
    title: "✅ Pedido entregue!",
    body: (name) => `${name}, seu pedido foi entregue. Bom apetite!`,
  },
  cancelado: {
    title: "❌ Pedido cancelado",
    body: (name) => `${name}, infelizmente seu pedido foi cancelado. Entre em contato para mais informações.`,
  },
  saiu_entrega: {
    title: "🚗 Saiu para entrega!",
    body: (name) => `${name}, seu pedido saiu para entrega. Fique atento!`,
  },
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getFirebaseAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pemBody = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = getNumericDate(0);
  const exp = getNumericDate(60 * 60);
  const jwt = await createJWT(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp,
    },
    cryptoKey
  );

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Firebase OAuth falhou: ${tokenRes.status} ${errText}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: tokenJson.access_token,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
  };
  return cachedAccessToken.token;
}

async function sendToToken(
  accessToken: string,
  projectId: string,
  token: string,
  platform: string,
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
      notification: { sound: "default", channel_id: "orders" },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } },
    },
  };

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
    const payload = (await req.json()) as Payload;

    if (!payload.orderId || !payload.userId) {
      return new Response(JSON.stringify({ error: "Missing orderId or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se temos mensagem para esse status
    const msgTemplate = STATUS_MESSAGES[payload.status];
    if (!msgTemplate) {
      return new Response(JSON.stringify({ sent: 0, reason: "status sem template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!saRaw) {
      return new Response(
        JSON.stringify({ error: "FCM_SERVICE_ACCOUNT não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const serviceAccount = JSON.parse(saRaw) as ServiceAccount;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca tokens do cliente
    const { data: tokens, error: tokensErr } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", payload.userId);

    if (tokensErr) throw tokensErr;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens for user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const customerName = payload.customerName || "Cliente";
    const title = msgTemplate.title;
    const body = msgTemplate.body(customerName);

    const results = await Promise.allSettled(
      tokens.map((t) =>
        sendToToken(accessToken, serviceAccount.project_id, t.token, t.platform, title, body, {
          orderId: payload.orderId,
          route: "/meus-pedidos",
        })
      )
    );

    // Limpa tokens inválidos
    const invalidTokens: string[] = [];
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && !r.value.ok) {
        const respBody = r.value.body;
        if (respBody.includes("UNREGISTERED") || respBody.includes("INVALID_ARGUMENT") || r.value.status === 404) {
          invalidTokens.push(tokens[idx].token);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await supabase.from("device_tokens").delete().in("token", invalidTokens);
    }

    const sentOk = results.filter((r) => r.status === "fulfilled" && (r as any).value.ok).length;

    return new Response(
      JSON.stringify({ sent: sentOk, attempted: tokens.length, invalidatedTokens: invalidTokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-order-status error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
