// =============================================================
// Edge Function: send-promo-push
// =============================================================
// Chamada pelo admin para enviar push de promoção/marketing
// para TODOS os clientes com token registrado.
//
// Payload: { title, body, route? }
// Autenticação: Bearer token do admin (validado via Supabase)
// =============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create as createJWT, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PromoPayload {
  title: string;
  body: string;
  route?: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

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
      notification: { sound: "default", channel_id: "promos" },
    },
    apns: {
      headers: { "apns-priority": "5" },
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
    // Validar que quem chama é admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verifica se o token pertence a um admin
    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(userToken);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as PromoPayload;
    if (!payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: "Missing title or body" }), {
        status: 400,
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

    // Busca TODOS os tokens (todos os clientes)
    const { data: tokens, error: tokensErr } = await supabase
      .from("device_tokens")
      .select("token, platform");

    if (tokensErr) throw tokensErr;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const route = payload.route || "/ofertas";

    // Envia em batches de 50 para não sobrecarregar
    const BATCH_SIZE = 50;
    let sentOk = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((t) =>
          sendToToken(accessToken, serviceAccount.project_id, t.token, t.platform, payload.title, payload.body, {
            route,
            type: "promo",
          })
        )
      );

      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          if (r.value.ok) {
            sentOk++;
          } else {
            const respBody = r.value.body;
            if (respBody.includes("UNREGISTERED") || respBody.includes("INVALID_ARGUMENT") || r.value.status === 404) {
              invalidTokens.push(batch[idx].token);
            }
          }
        }
      });
    }

    // Limpa tokens inválidos
    if (invalidTokens.length > 0) {
      await supabase.from("device_tokens").delete().in("token", invalidTokens);
    }

    return new Response(
      JSON.stringify({ sent: sentOk, attempted: tokens.length, invalidatedTokens: invalidTokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-promo-push error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
