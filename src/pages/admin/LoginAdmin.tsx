import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"admin" | "entregador" | null>(null);

  // Função para verificar se o user_id é admin (consulta direta ao banco)
  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    return !!(data && data.length > 0);
  };

  // Detecta o tipo de usuário automaticamente após login
  const detectAndRedirect = async (userId: string) => {
    try {
      // Verifica se é admin
      const isAdminUser = await checkIsAdmin(userId);
      if (isAdminUser) {
        setUserType("admin");
        setTimeout(() => {
          window.location.href = "/admin/pdv";
        }, 100);
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
        setTimeout(() => {
          window.location.href = "/admin/entregas";
        }, 100);
        return;
      }

      // Não é nenhum dos dois
      toast({
        title: "Acesso negado",
        description: "Esta conta não tem permissão de admin ou entregador.",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      setLoading(false);
    } catch (err) {
      console.error("Erro ao detectar tipo de usuário:", err);
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
      setLoading(false);
    }
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

  // Se já está logado como admin, redireciona direto
  useEffect(() => {
    const checkAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await detectAndRedirect(user.id);
      }
    };
    checkAndRedirect();
  }, []);

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
              <ShieldCheck className="h-3 w-3" />
              {userType === "admin"
                ? "Redirecionando para Painel Admin..."
                : "Redirecionando para App de Entregas..."}
            </div>
          )}
        </CardHeader>
        <CardContent>
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

          <div className="mt-6 text-center">
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
