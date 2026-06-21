import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Utensils, LogOut, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { setMesaSession, clearMesaSession, getMesaSession, getDeviceId } from "@/lib/mesaSession";

export default function SelecionarMesa() {
  const navigate = useNavigate();
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    // Se já tem mesa logada, vai direto para loja
    const session = getMesaSession();
    if (session) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const mesaNum = parseInt(numero, 10);
    if (isNaN(mesaNum) || mesaNum < 1 || mesaNum > 999) {
      toast({ title: "Número de mesa inválido", description: "Digite um número entre 1 e 999.", variant: "destructive" });
      return;
    }

    if (!nome.trim()) {
      toast({ title: "Digite seu nome", variant: "destructive" });
      return;
    }

    setMesaSession({
      numero: mesaNum,
      nome_cliente: nome.trim(),
      device_id: getDeviceId(),
      created_at: new Date().toISOString(),
    });

    toast({ title: `Bem-vindo(a), ${nome.trim()}!`, description: `Mesa ${mesaNum} vinculada.` });
    navigate("/");
  };

  const handleLogout = () => {
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
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" size="lg">
                Entrar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleLogout}
                title="Limpar sessão salva"
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
