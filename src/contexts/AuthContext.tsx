import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { SocialLogin } from "@capgo/capacitor-social-login";

const NATIVE_OAUTH_REDIRECT = "com.mercadinho.app://auth/callback";

// Web Client ID do Google Cloud — o MESMO usado pelo Supabase Auth.
// Em projetos Vite, expomos via VITE_GOOGLE_WEB_CLIENT_ID no .env.
// Esse ID é o do "OAuth 2.0 Client ID" do TIPO **Web application**.
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

// iOS Client ID separado (opcional — apenas se você criou um do tipo iOS).
// Se não setar, o plugin usa o web client ID em fallback.
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;

let socialLoginInitialized = false;
async function ensureSocialLoginInitialized() {
  if (socialLoginInitialized || !Capacitor.isNativePlatform()) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    // Erro VISÍVEL — antes era warn silencioso, então o app caía pro fluxo web
    // (que abre Safari) sem o usuário entender o motivo.
    throw new Error(
      "VITE_GOOGLE_WEB_CLIENT_ID não está definido no .env do build atual. " +
      "Rebuild o app no Mac com o .env preenchido (npm run build && npx cap sync ios)."
    );
  }
  console.log("[Auth] Inicializando SocialLogin com Google (plataforma nativa)…");
  await SocialLogin.initialize({
    google: {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iOSClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
      iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
      mode: "online",
    },
  });
  socialLoginInitialized = true;
  console.log("[Auth] SocialLogin inicializado.");
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: { full_name: string; phone: string; address: string; avatar_url: string; cpf_cnpj: string } | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, cpfCnpj?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
      try {
        await Browser.close();
      } catch {
        // Browser may already be closed
      }
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }
      const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("full_name, phone, address, avatar_url, cpf_cnpj").eq("id", userId).single();
    if (data) {
      // Sync profile with auth metadata if profile fields are empty
      const currentUser = (await supabase.auth.getUser()).data.user;
      const meta = currentUser?.user_metadata;
      if (meta && (!data.full_name || !data.avatar_url)) {
        const updates: { full_name?: string; avatar_url?: string } = {};
        if (!data.full_name && (meta.full_name || meta.name)) updates.full_name = meta.full_name || meta.name;
        if (!data.avatar_url && (meta.avatar_url || meta.picture)) updates.avatar_url = meta.avatar_url || meta.picture;
        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("id", userId);
          setProfile({ ...data, ...updates });
          return;
        }
      }
      setProfile(data);
    }
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    setIsAdmin(!!(data && data.length > 0));
  };

  const signInWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform();
    console.log("[Auth] signInWithGoogle — plataforma nativa?", isNative);

    if (isNative) {
      // Em apps nativos: usa o SDK nativo do Google Sign-In (sem browser, sem URL scheme).
      // Recebe um id_token e troca por sessão Supabase via signInWithIdToken.
      // Esse fluxo NÃO sai do app — popup nativo do iOS/Android, sem Safari.
      await ensureSocialLoginInitialized();

      console.log("[Auth] Chamando SocialLogin.login…");
      const result: any = await SocialLogin.login({
        provider: "google",
        options: { scopes: ["email", "profile"] },
      });
      console.log("[Auth] Resposta do SocialLogin:", JSON.stringify(result, null, 2));

      // Extrai id_token (o nome do campo varia entre versões do plugin).
      const idToken: string | undefined =
        result?.result?.idToken ??
        result?.result?.id_token ??
        result?.idToken ??
        result?.id_token;

      if (!idToken) {
        throw new Error(
          "ID Token não veio na resposta do Google. Confira o console (Xcode → View → Debug Area) " +
          "para ver o payload completo retornado pelo plugin."
        );
      }

      console.log("[Auth] Trocando ID token por sessão Supabase…");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) {
        // Erros típicos aqui: "Unacceptable audience" → falta cadastrar o iOS Client ID
        // em Authorized Client IDs no Supabase Dashboard
        throw new Error(`Supabase rejeitou o token: ${error.message}`);
      }
      console.log("[Auth] Login Google nativo OK.");
      return;
    }

    // Web: fluxo OAuth padrão via redirect
    console.log("[Auth] Plataforma web — usando OAuth redirect tradicional");
    const redirectTo = `${window.location.origin}/`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          // Força a tela de seleção de conta sempre — evita travar quando
          // há múltiplas contas Google no navegador.
          prompt: "select_account",
        },
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, name: string, cpfCnpj?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    // Save cpf_cnpj to profile if provided
    if (cpfCnpj && data.user) {
      await supabase.from("profiles").update({ cpf_cnpj: cpfCnpj }).eq("id", data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Tira o usuário também da sessão nativa do Google (se logou nativamente).
    if (Capacitor.isNativePlatform()) {
      try {
        await SocialLogin.logout({ provider: "google" });
      } catch {
        // Ignora — usuário pode não ter logado via Google nativo
      }
    }
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
