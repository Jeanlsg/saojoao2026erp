import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Package, FileText, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { maskCpfCnpj } from "@/lib/masks";
import { BackButton } from "@/components/BackButton";

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setCpfCnpj(profile.cpf_cnpj || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, address, cpf_cnpj: cpfCnpj })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-card shadow-sm border-b border-border">
        <div className="container flex items-center gap-2 pt-1 pb-3">
          <BackButton to="/" />
          <h1 className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5" /> Meu Perfil
          </h1>
        </div>
      </header>

      <main className="container py-4 space-y-4 max-w-md">
        <Card>
          <CardHeader className="items-center text-center pb-2">
            <Avatar className="h-20 w-20 mb-2">
              <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {(fullName || user?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-base">{fullName || "Sem nome"}</CardTitle>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cpf">CPF / CNPJ</Label>
              <Input id="cpf" value={cpfCnpj} onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Endereço de entrega</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Button variant="ghost" className="w-full justify-start rounded-none h-12" asChild>
              <Link to="/meus-pedidos"><Package className="h-4 w-4 mr-2" /> Meus pedidos</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start rounded-none h-12" asChild>
              <Link to="/termos"><FileText className="h-4 w-4 mr-2" /> Termos de Uso</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start rounded-none h-12" asChild>
              <Link to="/privacidade"><Shield className="h-4 w-4 mr-2" /> Política de Privacidade</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start rounded-none h-12 text-destructive hover:text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
