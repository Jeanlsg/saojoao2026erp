// Valida variáveis de ambiente obrigatórias antes do build.
// Carrega .env / .env.local / .env.<mode> manualmente (sem dependências),
// pois esse script roda fora do Vite.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const mode = process.env.NODE_ENV || process.env.MODE || 'production';
const cwd = process.cwd();

// Ordem de precedência similar à do Vite (process.env vence)
const files = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
const merged = {};
for (const f of files) Object.assign(merged, parseEnvFile(resolve(cwd, f)));
for (const key of Object.keys(merged)) {
  if (process.env[key] === undefined) process.env[key] = merged[key];
}

const missing = REQUIRED.filter(
  (key) => !process.env[key] || String(process.env[key]).trim() === ''
);

if (missing.length > 0) {
  console.error('\n\x1b[31m✖ Variáveis de ambiente ausentes para o build:\x1b[0m');
  for (const key of missing) console.error(`  - ${key}`);
  console.error(
    '\nDefina-as no arquivo .env (local) ou na aba Environment do EasyPanel/Docker antes do build.\n'
  );
  process.exit(1);
}

try {
  const url = new URL(process.env.VITE_SUPABASE_URL);
  if (!url.protocol.startsWith('http')) throw new Error('protocolo inválido');
} catch {
  console.error('\n\x1b[31m✖ VITE_SUPABASE_URL não é uma URL válida.\x1b[0m\n');
  process.exit(1);
}

console.log('\x1b[32m✓ Variáveis de ambiente Supabase validadas.\x1b[0m');

// Aviso (não bloqueia) sobre Google Sign-In nativo — necessário só se for
// usar o app no celular com login Google.
if (!process.env.VITE_GOOGLE_WEB_CLIENT_ID || String(process.env.VITE_GOOGLE_WEB_CLIENT_ID).trim() === '') {
  console.warn(
    '\x1b[33m! VITE_GOOGLE_WEB_CLIENT_ID não definido — login Google no app nativo (iOS/Android) NÃO vai funcionar.\x1b[0m'
  );
  console.warn('  Veja GOOGLE_LOGIN_SETUP.md para configurar.');
}
