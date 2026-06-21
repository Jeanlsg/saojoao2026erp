import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return new Response(
        JSON.stringify({ error: "Telefone e PIN são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN deve ter 4 dígitos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Busca o entregador pelo telefone
    const { data: deliveryUser, error: searchError } = await supabaseAdmin
      .from("delivery_users")
      .select("id, user_id, name, pin, active")
      .eq("phone", cleanPhone)
      .eq("active", true)
      .single();

    if (searchError || !deliveryUser) {
      return new Response(
        JSON.stringify({ error: "Entregador não encontrado ou inativo" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica o PIN
    if (deliveryUser.pin !== pin) {
      return new Response(
        JSON.stringify({ error: "PIN incorreto" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gera um token de acesso (magic link) para o user_id
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: (await supabaseAdmin.auth.admin.getUserById(deliveryUser.user_id)).user?.email || "",
    });

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: "Erro ao gerar sessão" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action_link: linkData.properties.action_link,
        user: {
          id: deliveryUser.user_id,
          name: deliveryUser.name,
          phone: cleanPhone,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao fazer login" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
