import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Lock, ChevronLeft, Truck, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { haptOk, haptErr } from "@/lib/haptics";

export default function LoginEntregador() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim() || !pin.trim()) {
      toast({ title: "Preencha telefone e PIN", variant: "destructive" });
      return;
    }

    if (pin.length !== 4) {
      toast({ title: "PIN deve ter 4 dígitos", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Verifica o PIN e pega o email
      const { data, error } = await supabase.functions.invoke("verify-delivery-pin", {
        body: {
          phone: phone.replace(/\D/g, ""),
          pin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Faz login com a senha fixa (ou podemos gerar magic link)
      // Como o entregador tem um email genérico e senha aleatória,
      // usamos o método de signInWithPassword com uma senha fixa de fallback
      // OU usamos o verifyOTP com magic link

      // Solução mais simples: usar a senha que foi definida na criação
      // Mas como não temos como saber a senha, vamos usar o approach de
      // gerar uma senha temporária e atualizar
      // (Solução mais simples: usar o método de generateLink e extrair o token)

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: data.email,
      });

      // Se não temos acesso admin via supabase client, usamos o verifyOtp
      // Vamos fazer diferente: o usuário vai usar o link para entrar
      if (linkError) {
        // Fallback: gera um OTP de 6 dígitos
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: data.email,
          options: { shouldCreateUser: false },
        });

        if (otpError) throw otpError;

        // Pede para o usuário inserir o código que recebeu
        const otpCode = prompt("Enviamos um código de acesso para o email do sistema. Digite o código:");
        if (!otpCode) {
          setLoading(false);
          return;
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: otpCode,
          type: "email",
        });

        if (verifyError) throw verifyError;
      } else {
        // Extrai o token do link
        const url = new URL(linkData.properties.action_link);
        const token = url.searchParams.get("token");
        if (!token) throw new Error("Token não encontrado");

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "magiclink",
        });

        if (verifyError) throw verifyError;
      }

      haptOk();
      toast({ title: `Bem-vindo(a), ${data.name}!` });
      navigate("/admin/entregas", { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      haptErr();
      toast({
        title: "Erro",
        description: err.message || "Não foi possível entrar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">App de Entregas</CardTitle>
            <CardDescription>
              Entre com seu <strong>telefone</strong> e <strong>PIN de 4 dígitos</strong>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(87) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                PIN
              </Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                placeholder="****"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="text-lg text-center tracking-[0.5em] font-mono"
              />
              <p className="text-xs text-muted-foreground">
                O PIN foi definido pelo administrador ao criar seu cadastro.
              </p>
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

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Admin? Faça login em{" "}
              <Link to="/admin/login" className="text-primary hover:underline">
                outra página
              </Link>
            </p>
          </div>

          <div className="mt-3 text-center">
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
