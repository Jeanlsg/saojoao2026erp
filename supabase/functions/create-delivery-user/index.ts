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
    const { name, phone, pin } = await req.json();

    if (!name || !pin) {
      return new Response(
        JSON.stringify({ error: "Nome e PIN são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN deve ter 4 dígitos numéricos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Gera um email genérico sequencial
    const { data: emailData, error: emailError } = await supabaseAdmin
      .rpc("generate_delivery_email");

    if (emailError) throw emailError;

    const generatedEmail = emailData;
    const generatedPassword = crypto.randomUUID(); // senha aleatória (não usa para login)

    // Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: generatedEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: name, phone: phone || null, is_delivery: true },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Cria o perfil
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: name,
        phone: phone || null,
      });

    // Cria o registro de delivery_user
    const { error: deliveryError } = await supabaseAdmin
      .from("delivery_users")
      .insert({
        user_id: userId,
        name,
        phone: phone || null,
        pin,
        active: true,
      });

    if (deliveryError) {
      // Se falhar, deleta o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw deliveryError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: generatedEmail,
        name,
        phone,
        pin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao criar entregador" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
