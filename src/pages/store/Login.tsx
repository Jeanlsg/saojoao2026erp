import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { maskCpfCnpj } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X } from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";

export default function Login() {
  const { user, loading, isAdmin, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Redireciona após login baseado no tipo de usuário
  useEffect(() => {
    const redirectAfterLogin = async () => {
      if (!user || redirecting) return;

      setRedirecting(true);

      // Admin → painel admin (PDV)
      if (isAdmin) {
        navigate("/admin/pdv", { replace: true });
        return;
      }

      // Verifica se é entregador
      const { data } = await supabase
        .from("delivery_users")
        .select("id, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .single();

      if (data) {
        // É entregador → vai para área de entregas
        navigate("/admin/entregas", { replace: true });
      } else {
        // Cliente normal → vai para loja
        navigate("/", { replace: true });
      }
    };

    if (user && submitting) {
      redirectAfterLogin();
    }
  }, [user, submitting, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (user && !submitting) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name, cpfCnpj);
        toast({ title: "Código enviado!", description: "Verifique seu email para ativar sua conta." });
        navigate("/verify-email", { state: { email } });
        return;
      } else {
        await signInWithEmail(email, password);
        // O useEffect vai redirecionar baseado no tipo de usuário
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      // O useEffect vai redirecionar baseado no tipo de usuário
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-4">
      {/* Barra de ações no topo: voltar à loja (esquerda) + fechar (direita) */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/" aria-label="Voltar à loja">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Voltar à loja</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          aria-label="Fechar"
          className="h-9 w-9"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img
            src="/icon.png"
            alt="Escola Raul Pompéia"
            className="h-20 w-auto mx-auto mb-2 object-contain"
          />
          <CardTitle className="text-xl">Escola Raul Pompéia</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Arraiá da Escola Raul Pompéia
          </p>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full mb-3"
            size="lg"
            onClick={handleGoogleLogin}
            disabled={submitting}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Entrar com Google
          </Button>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <span className="relative flex justify-center text-[10px] uppercase bg-card px-2 text-muted-foreground">ou com email</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                  <Input id="cpfCnpj" placeholder="000.000.000-00 ou 00.000.000/0000-00" value={cpfCnpj} onChange={e => setCpfCnpj(maskCpfCnpj(e.target.value))} required />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          {!isSignUp && (
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="w-full text-center text-sm text-primary mt-2 hover:underline transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-sm text-muted-foreground mt-2 hover:text-foreground transition-colors"
          >
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
          </button>
          {isSignUp && (
            <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
              Ao criar uma conta, você concorda com nossos{" "}
              <Link to="/termos" className="underline hover:text-foreground">Termos de Uso</Link>{" "}
              e{" "}
              <Link to="/privacidade" className="underline hover:text-foreground">Política de Privacidade</Link>.
            </p>
          )}
        </CardContent>
      </Card>
      <LegalFooter />
      </div>
    </div>
  );
}
