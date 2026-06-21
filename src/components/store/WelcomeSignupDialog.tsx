import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { maskCpfCnpj } from "@/lib/masks";

const STORAGE_KEY = "welcomePopupDismissed";

export function WelcomeSignupDialog() {
  const { user, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user && !localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name, cpfCnpj);
      toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar." });
      handleClose();
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Bem-vindo ao Arraiá!</DialogTitle>
          <DialogDescription>
            Crie sua conta para aproveitar ofertas exclusivas e acompanhar seus pedidos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignup} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">Nome</Label>
            <Input
              id="signup-name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email">E-mail</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-cpfcnpj">CPF ou CNPJ</Label>
            <Input
              id="signup-cpfcnpj"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Senha</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar Conta"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => { handleClose(); navigate("/login"); }}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Entrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
