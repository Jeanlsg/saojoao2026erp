// Faz upload de uma imagem de produto para o Supabase Storage.
//
// Como usar (via supabase.functions.invoke):
//   { filename: "milho.jpg", base64: "<base64 sem prefixo data:...>" }
//
// Retorna: { publicUrl: "https://..." }
//
// Configuração necessária:
//   1. Criar bucket público "produtos" no Supabase Dashboard (Storage → New bucket)
//      Nome: produtos, Public: YES
//   2. Esta função já cria o bucket se não existir

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET_NAME = 'produtos';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, base64 } = await req.json();

    if (!filename || !base64) {
      return new Response(
        JSON.stringify({ error: 'filename e base64 são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitiza nome do arquivo (apenas letras, números, hífen, ponto)
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `produtos/${safeName}`;

    // Decodifica base64 → Uint8Array
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Detecta content-type pela extensão
    const ext = safeName.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      ext === 'svg' ? 'image/svg+xml' :
      'application/octet-stream';

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Garante que o bucket existe (cria se necessário)
    await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public: true, fileSizeLimit: '5MB' }),
    }).catch(() => { /* bucket já existe */ });

    // 2) Upload usando a REST API do Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: bytes,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Upload error:', errText);
      throw new Error(`Erro no upload: ${uploadRes.status} - ${errText}`);
    }

    // 3) Constrói URL pública
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;

    return new Response(
      JSON.stringify({ publicUrl, path, bucket: BUCKET_NAME }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});