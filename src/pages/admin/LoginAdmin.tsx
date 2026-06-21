import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, ChevronLeft, Loader2, ShieldCheck, Truck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, isAdmin: checkIsAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"admin" | "entregador" | null>(null);

  // Detecta o tipo de usuário automaticamente após login
  const detectAndRedirect = async (userId: string) => {
    // Verifica se é admin
    const isAdminUser = await checkIsAdmin();
    if (isAdminUser) {
      setUserType("admin");
      navigate("/admin/pdv", { replace: true });
      return;
    }

    // Se não é admin, verifica se é entregador
    const { data: delivery } = await supabase
      .from("delivery_users")
      .select("id, active")
      .eq("user_id", userId)
      .eq("active", true)
      .single();

    if (delivery) {
      setUserType("entregador");
      navigate("/admin/entregas", { replace: true });
      return;
    }

    // Não é nenhum dos dois
    toast({
      title: "Acesso negado",
      description: "Esta conta não tem permissão de admin ou entregador. Use a página de login comum.",
      variant: "destructive",
    });
    // Volta para a loja
    navigate("/", { replace: true });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Preencha email e senha", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await detectAndRedirect(user.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      toast({ title: "Erro ao entrar", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await detectAndRedirect(user.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      toast({ title: "Erro ao entrar com Google", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Acesso Staff</CardTitle>
            <CardDescription>
              Login para <strong>administradores</strong> e <strong>entregadores</strong> cadastrados
            </CardDescription>
          </div>

          {userType && (
            <div className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
              {userType === "admin" ? (
                <><ShieldCheck className="h-3 w-3" /> Redirecionando para Painel Admin...</>
              ) : (
                <><Truck className="h-3 w-3" /> Redirecionando para App de Entregas...</>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Login com Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-3"
            size="lg"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Entrar com Google
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative flex justify-center text-[10px] uppercase bg-card px-2 text-muted-foreground">
              ou com email
            </span>
          </div>

          {/* Login com email/senha */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Sua conta precisa estar cadastrada como admin ou entregador.
            <br />
            Clientes devem entrar pela{" "}
            <Link to="/" className="text-primary hover:underline">
              página inicial
            </Link>.
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
            >
              <ChevronLeft className="h-3 w-3" />
              Voltar à loja
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
