// Supabase client - credenciais via variáveis de ambiente (.env)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Variáveis de ambiente Supabase ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env"
  );
}

// Storage robusto: usa localStorage do WebView quando disponível.
// Se por algum motivo (modo SSR, sandbox restrito, etc.) localStorage não estiver
// disponível, cai para um stub em memória — mais seguro que crashar o módulo todo.
function safeStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const test = "__supa_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    // localStorage bloqueado (modo privado de iOS Safari antigo, sandbox, etc.)
    const memory = new Map<string, string>();
    return {
      length: 0,
      clear: () => memory.clear(),
      getItem: (k) => memory.get(k) ?? null,
      key: (i) => Array.from(memory.keys())[i] ?? null,
      removeItem: (k) => void memory.delete(k),
      setItem: (k, v) => void memory.set(k, v),
    } as unknown as Storage;
  }
}

// Logs no startup ajudam a diagnosticar problemas em apps nativos onde
// não há devtools facilmente acessíveis. Aparece no Xcode console / logcat.
console.log("[Supabase] init →", SUPABASE_URL);

// No Capacitor Android o WebView roda em https://localhost — o scheme nativo
// (com.mercadinho.app://) é tratado via CapacitorApp.addListener("appUrlOpen")
// no AuthContext. Por isso desativamos detectSessionInUrl no nativo para evitar
// que o Supabase tente parsear URLs que ele não consegue interceptar.
// flowType "pkce" é obrigatório para OAuth funcionar corretamente em apps nativos.
import { Capacitor } from "@capacitor/core";
const isNative = Capacitor.isNativePlatform();

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: safeStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNative,
    flowType: "pkce",
  },
});

// Expõe a URL e a chave (anon) para componentes de diagnóstico.
// A anon key é segura para expor — é a mesma do bundle público.
export const SUPABASE_INFO = {
  url: SUPABASE_URL,
  // Mostra apenas os primeiros/últimos chars da chave para não vazar a chave completa em logs
  keyPreview: `${SUPABASE_PUBLISHABLE_KEY.slice(0, 8)}…${SUPABASE_PUBLISHABLE_KEY.slice(-4)}`,
};
