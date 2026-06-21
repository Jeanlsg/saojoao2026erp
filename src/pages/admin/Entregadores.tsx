import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Phone,
  ShieldCheck,
  Search,
  Mail,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DeliveryUser {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  pin: string | null;
  active: boolean;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
}

export default function Entregadores() {
  const [users, setUsers] = useState<DeliveryUser[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DeliveryUser | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    phone: "",
    pin: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Busca entregadores
    const { data: deliveryData } = await supabase
      .from("delivery_users")
      .select("*")
      .order("created_at", { ascending: false });

    // Busca usuários do auth para vincular
    const { data: authData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");

    // Cria lista de usuários autenticados
    const { data: sessions } = await supabase.auth.admin.listUsers();
    const usersList: AuthUser[] = (sessions?.users || [])
      .map((u) => ({ id: u.id, email: u.email || "" }))
      .sort((a, b) => a.email.localeCompare(b.email));

    setUsers(deliveryData || []);
    setAuthUsers(usersList);
    setLoading(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) ||
      authUsers.find((a) => a.id === u.user_id)?.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ user_id: "", name: "", phone: "", pin: "" });
    setDialogOpen(true);
  };

  const openEdit = (user: DeliveryUser) => {
    setEditingUser(user);
    setFormData({
      user_id: user.user_id || "",
      name: user.name,
      phone: user.phone || "",
      pin: user.pin || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (formData.pin && (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin))) {
      toast({ title: "PIN deve ter 4 dígitos numéricos", variant: "destructive" });
      return;
    }

    setSaving(true);

    const data = {
      user_id: formData.user_id || null,
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      pin: formData.pin || null,
      updated_at: new Date().toISOString(),
    };

    if (editingUser) {
      const { error } = await supabase
        .from("delivery_users")
        .update(data)
        .eq("id", editingUser.id);

      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Entregador atualizado!" });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      // Cria o entregador via Edge Function (gera email genérico automaticamente)
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "create-delivery-user",
          {
            body: {
              name: formData.name.trim(),
              phone: formData.phone.trim() || null,
              pin: formData.pin || null,
            },
          }
        );

        if (fnError) throw fnError;
        if (fnData?.error) throw new Error(fnData.error);

        toast({
          title: "✅ Entregador criado!",
          description: `Email gerado: ${fnData.email}`,
        });
        setDialogOpen(false);
        fetchData();
      } catch (err: any) {
        console.error("Error creating delivery user:", err);
        toast({
          title: "Erro ao criar",
          description: err.message || "Não foi possível criar o entregador.",
          variant: "destructive",
        });
      }
    }
    setSaving(false);
  };

  const toggleActive = async (user: DeliveryUser) => {
    const { error } = await supabase
      .from("delivery_users")
      .update({ active: !user.active, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ title: user.active ? "Entregador desativado" : "Entregador ativado" });
      fetchData();
    }
  };

  const getUserEmail = (userId: string | null) => {
    if (!userId) return null;
    return authUsers.find((u) => u.id === userId)?.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Entregadores</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Entregador
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{filteredUsers.length} entregadores</Badge>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email (Login)</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum entregador encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const userEmail = getUserEmail(user.user_id);
                return (
                  <TableRow key={user.id} className={!user.active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {userEmail ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {userEmail}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {user.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.pin ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {"*".repeat(user.pin.length)}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(user)}
                        >
                          {user.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Entregador" : "Novo Entregador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vincular a usuário (opcional)</label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData({ ...formData, user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {authUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se vinculado, o entregador faz login normal e é redirecionado automaticamente.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome completo *</label>
              <Input
                placeholder="Nome do entregador"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input
                placeholder="(87) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PIN (4 dígitos)</label>
              <Input
                type="password"
                maxLength={4}
                placeholder="****"
                value={formData.pin}
                onChange={(e) =>
                  setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Usado para login rápido no celular.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
