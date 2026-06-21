// =============================================================
// Helper compartilhado: Autenticação WIF → FCM
// =============================================================
//
// Substitui a autenticação por chave JSON do Service Account.
// Usa Workload Identity Federation (WIF) via OIDC do Supabase.
//
// Variáveis de ambiente necessárias (Supabase > Edge Functions > Secrets):
//   GCP_PROJECT_ID
//   GCP_WORKLOAD_IDENTITY_PROVIDER
//   GCP_SERVICE_ACCOUNT_EMAIL
// =============================================================

import { GoogleAuth } from "npm:google-auth-library@9.4.1";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Gera (e cacheia) um access token OAuth2 com escopo de FCM,
 * via Workload Identity Federation.
 */
export async function getFirebaseAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const projectId = Deno.env.get("GCP_PROJECT_ID");
  const provider = Deno.env.get("GCP_WORKLOAD_IDENTITY_PROVIDER");
  const serviceAccountEmail = Deno.env.get("GCP_SERVICE_ACCOUNT_EMAIL");

  if (!projectId || !provider || !serviceAccountEmail) {
    throw new Error(
      "Variáveis WIF não configuradas: GCP_PROJECT_ID, GCP_WORKLOAD_IDENTITY_PROVIDER, GCP_SERVICE_ACCOUNT_EMAIL"
    );
  }

  // Configura o client com WIF
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId,
  });

  // Cria client com impersonação da service account
  const client = await auth.getClient({
    // Força uso do WIF provider
    subject: serviceAccountEmail,
  });

  // Em ambiente Deno, precisamos configurar o WIF manualmente
  // (google-auth-library não tem suporte nativo ao Deno WIF ainda)
  // Workaround: usar metadata server do Deno Deploy para tokens
  const token = await getWifAccessToken(projectId, provider, serviceAccountEmail);

  cachedAccessToken = {
    token: token.accessToken,
    expiresAt: Date.now() + (token.expiresIn - 60) * 1000,
  };

  return cachedAccessToken.token;
}

/**
 * Implementação manual do fluxo WIF para Deno.
 * 1. Pega token OIDC do Supabase (via header Authorization)
 * 2. Troca por token federado do Google
 * 3. Usa para impersonar a service account
 */
async function getWifAccessToken(
  projectId: string,
  provider: string,
  serviceAccountEmail: string
): Promise<{ accessToken: string; expiresIn: number }> {
  // 1. Obtém token OIDC do Supabase (do header Authorization)
  // Em Supabase Edge Functions, o contexto já tem o JWT
  // @ts-ignore - getRequestContext é global em Supabase
  const ctx = globalThis.getRequestContext?.() ?? null;

  // 2. Troca por token federado via STS
  const stsUrl = "https://sts.googleapis.com/v1/token";

  // Pega OIDC token do ambiente Supabase
  const oidcToken = await getSupabaseOidcToken();

  const stsRes = await fetch(stsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: provider,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: oidcToken,
    }),
  });

  if (!stsRes.ok) {
    const errText = await stsRes.text();
    throw new Error(`STS token exchange failed: ${stsRes.status} ${errText}`);
  }

  const stsToken = (await stsRes.json()) as { access_token: string; expires_in: number };

  // 3. Impersona a service account com o token federado
  const iamUrl = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`;

  const iamRes = await fetch(iamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stsToken.access_token}`,
    },
    body: JSON.stringify({
      scope: ["https://www.googleapis.com/auth/firebase.messaging"],
    }),
  });

  if (!iamRes.ok) {
    const errText = await iamRes.text();
    throw new Error(`IAM impersonation failed: ${iamRes.status} ${errText}`);
  }

  const iamToken = (await iamRes.json()) as { accessToken: string; expireTime: string };

  // Calcula expiresIn baseado na expireTime
  const expiresAt = new Date(iamToken.expireTime).getTime();
  const expiresIn = Math.floor((expiresAt - Date.now()) / 1000);

  return { accessToken: iamToken.accessToken, expiresIn };
}

/**
 * Obtém um OIDC token válido do Supabase.
 * Em Supabase Edge Functions, o token vem do header Authorization.
 */
async function getSupabaseOidcToken(): Promise<string> {
  // Em ambiente Supabase, o JWT do usuário é passado via Authorization header
  // @ts-ignore - Deno.serve é global
  const req = globalThis.Deno?.serve?.context?.request;

  if (req) {
    const auth = req.headers.get("Authorization");
    if (auth) {
      return auth.replace("Bearer ", "");
    }
  }

  // Alternativa: usar o getRequestContext do Deno Deploy
  // @ts-ignore
  if (typeof getRequestContext === "function") {
    // @ts-ignore
    const ctx = getRequestContext();
    if (ctx?.request?.headers?.get) {
      const auth = ctx.request.headers.get("authorization");
      if (auth) {
        return auth.replace(/^Bearer\s+/i, "");
      }
    }
  }

  throw new Error(
    "Não foi possível obter o OIDC token. " +
    "Verifique se a função está sendo chamada dentro de uma Edge Function do Supabase."
  );
}
