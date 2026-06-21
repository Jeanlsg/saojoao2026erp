import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OtpEmailRequest {
  email: string;
  code: string;
  type: "signup" | "recovery";
  name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const { email, code, type, name } = (await req.json()) as OtpEmailRequest;

    if (!email || !code || !type) {
      throw new Error("Campos obrigatórios: email, code, type");
    }

    const isSignup = type === "signup";
    const subject = isSignup
      ? "Ative sua conta - Favorito Supermercado"
      : "Recuperação de senha - Favorito Supermercado";

    const greeting = name ? `Olá, ${name}!` : "Olá!";

    // URL pública da logo. Defina SITE_URL nas variáveis da função
    // (ex.: https://favoritosupermercado.com.br) para que clientes de
    // email consigam carregar a imagem. Sem isso usamos uma URL relativa
    // que cai no fallback de texto da tag <img>.
    const SITE_URL = Deno.env.get("SITE_URL") || "";
    const logoUrl = SITE_URL ? `${SITE_URL}/logo-favorito.png` : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a3a6e;padding:24px;text-align:center;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="Favorito Supermercado" width="64" height="64" style="display:inline-block;background:#ffffff;border-radius:8px;padding:4px;" />`
                : ""}
              <h1 style="color:#ffd700;margin:8px 0 0;font-size:20px;font-weight:800;letter-spacing:0.5px;">Favorito Supermercado</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="color:#18181b;font-size:16px;margin:0 0 8px;">${greeting}</p>
              <p style="color:#52525b;font-size:14px;margin:0 0 24px;">
                ${isSignup
                  ? "Use o código abaixo para ativar sua conta:"
                  : "Use o código abaixo para redefinir sua senha:"}
              </p>
              <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#18181b;">${code}</span>
              </div>
              <p style="color:#a1a1aa;font-size:12px;margin:0;text-align:center;">
                Este código expira em 10 minutos.<br>
                Se você não solicitou isso, ignore este email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f4f5;padding:16px;text-align:center;">
              <p style="color:#a1a1aa;font-size:11px;margin:0;">© Favorito Supermercado</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Favorito Supermercado <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(`Falha ao enviar email: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("send-otp-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
