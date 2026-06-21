// Script local que faz upload de todas as imagens dos produtos
// para o Supabase Storage e atualiza o banco.
//
// Uso:
//   1. Defina as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
//      SUPABASE_SERVICE_ROLE_KEY é a "service_role" key (não a anon),
//      encontrada em Supabase Dashboard → Settings → API
//   2. Rode: node scripts/upload-product-images.mjs
//
// O script:
//   1. Lê todas as imagens de public/produtos/
//   2. Faz upload para o bucket "produtos" no Storage
//   3. Atualiza o campo image de cada produto no banco

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Lê .env manualmente (sem dependências)
const envPath = resolve(process.cwd(), '.env');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';
try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === 'VITE_SUPABASE_URL') SUPABASE_URL = value;
  }
} catch {
  // .env não existe
}

// Tenta ler a service_role de secrets/ ou do ambiente
SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) {
  console.error('✖ VITE_SUPABASE_URL não encontrada no .env');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '✖ SUPABASE_SERVICE_ROLE_KEY não definida.\n' +
    '  Defina no ambiente antes de rodar:\n' +
    '  export SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key\n\n' +
    '  A service_role key está em: Supabase Dashboard → Settings → API'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = 'produtos';
const PUBLIC_DIR = resolve(process.cwd(), 'public/produtos');

// Mapeamento de arquivo → product_id (precisa casar com a migration festa_junina)
const PRODUCT_MAP = {
  'milho.jpg':          'prd-milho',
  'pamonha.jpg':        'prd-pamonha',
  'canjica.jpg':        'prd-canjica',
  'mugunza.jpg':        'prd-mugunza',
  'bolo-milho.jpg':     'prd-bolo-milho',
  'bolo-macaxeira.jpg': 'prd-bolo-maca',
  'arroz-doce.jpg':     'prd-arroz-doce',
  'cachorro-quente.jpg':'prd-cachorro',
  'algodao-doce.jpg':   'prd-algodao',
  'pipoca.jpg':         'prd-pipoca',
  'caldo.jpg':          'prd-caldo',
  'crepe.jpg':          'prd-crepe',
  'batata.jpg':         'prd-batata',
  'espetinho.jpg':      'prd-espetinho',
  'budweiser.jpg':      'prd-budweiser',
  'brahma-skol.jpg':    'prd-brahma-skol',
  'refri-200.jpg':      'prd-refri-200',
  'coca-350.jpg':       'prd-coca-350',
  'agua.jpg':           'prd-agua',
  'skol.jpg':           'prd-skol',
};

async function main() {
  console.log(`📦 Iniciando upload para bucket "${BUCKET}"...`);
  console.log(`🔗 URL: ${SUPABASE_URL}\n`);

  // 1) Cria o bucket se não existir
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.find((b) => b.name === BUCKET);
  if (!exists) {
    console.log(`📁 Criando bucket "${BUCKET}"...`);
    const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5242880, // 5MB em bytes
    });
    if (bucketErr && !bucketErr.message.includes('already exists')) {
      console.error('✖ Erro ao criar bucket:', bucketErr.message);
      process.exit(1);
    }
    console.log(`✓ Bucket "${BUCKET}" criado\n`);
  } else {
    console.log(`✓ Bucket "${BUCKET}" já existe\n`);
  }

  // 2) Lista arquivos locais
  const files = readdirSync(PUBLIC_DIR).filter(
    (f) => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('.')
  );
  console.log(`📸 Encontrados ${files.length} arquivos em public/produtos/\n`);

  let uploaded = 0;
  let failed = 0;

  for (const filename of files) {
    const filepath = join(PUBLIC_DIR, filename);
    const buffer = readFileSync(filepath);
    const path = `produtos/${filename}`;

    process.stdout.write(`  ↑ ${filename} ... `);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.log(`✖ ${error.message}`);
      failed++;
      continue;
    }

    // Pega URL pública
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Atualiza no banco se houver mapeamento
    const productId = PRODUCT_MAP[filename];
    if (productId) {
      const { error: dbErr } = await supabase
        .from('products')
        .update({ image: publicUrl })
        .eq('id', productId);

      if (dbErr) {
        console.log(`✖ DB: ${dbErr.message}`);
        failed++;
      } else {
        console.log(`✓ → ${productId}`);
        uploaded++;
      }
    } else {
      console.log(`✓ (sem mapeamento)`);
      uploaded++;
    }
  }

  console.log(`\n✅ Upload concluído: ${uploaded} sucesso, ${failed} falha(s)`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});