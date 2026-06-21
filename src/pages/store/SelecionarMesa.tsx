import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Utensils, LogOut, User, AlertCircle, ShieldCheck, Monitor } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setMesaSession, clearMesaSession, getMesaSession, getDeviceId } from "@/lib/mesaSession";
import { haptOk, haptErr } from "@/lib/haptics";

export default function SelecionarMesa() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Se já tem mesa logada, vai direto para o cardápio
    const session = getMesaSession();
    if (session) {
      navigate("/cardapio");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mesaNum = parseInt(numero, 10);
    if (isNaN(mesaNum) || mesaNum < 0 || mesaNum > 999) {
      haptErr();
      toast({ title: "Número de mesa inválido", description: "Digite um número entre 0 e 999.", variant: "destructive" });
      return;
    }

    // Mesa 0: só admin logado pode acessar (vai para o painel admin)
    if (mesaNum === 0) {
      if (!isAdmin) {
        haptErr();
        toast({
          title: "Acesso restrito",
          description: "Mesa 0 é exclusiva para administradores. Faça login como admin.",
          variant: "destructive",
        });
        return;
      }

      // Salva mesa 0 localmente (admin) e vai para o painel
      setMesaSession({
        numero: 0,
        nome_cliente: user?.email || "Admin",
        device_id: getDeviceId(),
        created_at: new Date().toISOString(),
      });

      haptOk();
      toast({ title: "Acesso Admin liberado!", description: "Bem-vindo ao painel!" });
      navigate("/admin/pdv");
      return;
    }

    if (!nome.trim()) {
      haptErr();
      toast({ title: "Digite seu nome", variant: "destructive" });
      return;
    }

    setSaving(true);

    const deviceId = getDeviceId();

    try {
      // Tenta reivindicar a mesa via RPC
      const { data, error } = await supabase.rpc("claim_mesa", {
        p_numero: mesaNum,
        p_device_id: deviceId,
        p_nome_cliente: nome.trim(),
      });

      // Se a função não existir, segue sem bloqueio (fallback)
      if (error && !error.message?.includes("function") && !error.message?.includes("does not exist")) {
        throw error;
      }

      // Se a função existe e retornou erro de mesa ocupada
      if (data && Array.isArray(data) && data.length > 0 && !data[0].success) {
        haptErr();
        toast({
          title: "Mesa ocupada",
          description: data[0].message || "Mesa ocupada por outro dispositivo.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Sucesso! Salva a sessão local
      setMesaSession({
        numero: mesaNum,
        nome_cliente: nome.trim(),
        device_id: deviceId,
        created_at: new Date().toISOString(),
      });

      haptOk();
      toast({ title: `Bem-vindo(a), ${nome.trim()}!`, description: `Mesa ${mesaNum} vinculada.` });
      navigate("/cardapio");
    } catch (err: any) {
      console.error("Erro ao reivindicar mesa:", err);
      // Fallback: se a função RPC não existir, salva só localmente
      const isFnMissing = err?.message?.includes("function") || err?.message?.includes("does not exist");

      if (isFnMissing) {
        // Continua sem verificação no servidor
        setMesaSession({
          numero: mesaNum,
          nome_cliente: nome.trim(),
          device_id: deviceId,
          created_at: new Date().toISOString(),
        });
        haptOk();
        toast({
          title: `Bem-vindo(a), ${nome.trim()}!`,
          description: `Mesa ${mesaNum} vinculada. (Modo local)`,
        });
        navigate("/cardapio");
      } else {
        haptErr();
        toast({
          title: "Erro",
          description: err.message || "Não foi possível vincular a mesa.",
          variant: "destructive",
        });
        setSaving(false);
      }
    }
  };

  const handleLogout = () => {
    const session = getMesaSession();
    if (session) {
      // Libera a mesa no servidor
      supabase.rpc("release_mesa", {
        p_numero: session.numero,
        p_device_id: session.device_id,
      });
    }
    clearMesaSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Utensils className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Bem-vindo!</CardTitle>
            <CardDescription>
              Informe o número da sua mesa e seu nome para começar
            </CardDescription>
          </div>
          {isAdmin && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>
                Você está logado como admin. Use a <strong>mesa 0</strong> para acessar o painel.
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero" className="flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Número da mesa
              </Label>
              <Input
                id="numero"
                type="number"
                min="0"
                max="999"
                placeholder={isAdmin ? "Ex: 5 (ou 0 para admin)" : "Ex: 5"}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="text-lg text-center font-bold"
                required
                autoFocus
                disabled={saving}
              />
              {isAdmin && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  <span>Digite <strong>0</strong> para abrir o painel de admin</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Seu nome
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Como podemos te chamar?"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="text-lg"
                required={!isAdmin}
                disabled={saving}
              />
              {isAdmin && (
                <p className="text-[10px] text-muted-foreground">
                  (Opcional para mesa 0 - admin)
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                Apenas um dispositivo por mesa
              </p>
              <p>Se outra pessoa selecionar a mesma mesa, ela será avisada que está em uso.</p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" size="lg" disabled={saving}>
                {saving ? "Vinculando..." : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleLogout}
                title="Limpar sessão salva"
                disabled={saving}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-border space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    await signOut();
                    clearMesaSession();
                    window.location.href = "/admin/login";
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta admin
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
