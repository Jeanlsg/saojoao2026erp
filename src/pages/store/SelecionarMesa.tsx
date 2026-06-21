import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Utensils, LogOut, User, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { setMesaSession, clearMesaSession, getMesaSession, getDeviceId } from "@/lib/mesaSession";
import { haptOk, haptErr } from "@/lib/haptics";

export default function SelecionarMesa() {
  const navigate = useNavigate();
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
    if (isNaN(mesaNum) || mesaNum < 1 || mesaNum > 999) {
      haptErr();
      toast({ title: "Número de mesa inválido", description: "Digite um número entre 1 e 999.", variant: "destructive" });
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
                min="1"
                max="999"
                placeholder="Ex: 5"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="text-lg text-center font-bold"
                required
                autoFocus
                disabled={saving}
              />
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
                required
                disabled={saving}
              />
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
