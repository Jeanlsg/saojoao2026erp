import { useState } from "react";
import { useAdmin, type DiscountRule } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormDialogBar } from "@/components/admin/FormDialogBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";

const emptyRule: Omit<DiscountRule, "id"> = {
  name: "", description: "", discountPercent: 5,
  ruleType: "first_purchase", minOrders: 0, active: true,
  minOrderValue: null, maxDistanceKm: null,
};

const ruleTypeLabels: Record<string, string> = {
  first_purchase: "Primeira compra",
  order_count: "Quantidade de pedidos",
  free_freight: "Desconto no frete",
};

export default function Discounts() {
  const { discountRules, addDiscountRule, updateDiscountRule, deleteDiscountRule } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [form, setForm] = useState<Omit<DiscountRule, "id">>(emptyRule);

  const openNew = () => { setEditing(null); setForm(emptyRule); setDialogOpen(true); };
  const openEdit = (r: DiscountRule) => {
    setEditing(r);
    setForm({
      name: r.name, description: r.description, discountPercent: r.discountPercent,
      ruleType: r.ruleType, minOrders: r.minOrders, active: r.active,
      minOrderValue: r.minOrderValue, maxDistanceKm: r.maxDistanceKm,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) {
      updateDiscountRule({ ...editing, ...form });
    } else {
      addDiscountRule({ ...form, id: crypto.randomUUID() } as DiscountRule);
    }
    setDialogOpen(false);
  };

  const getConditionLabel = (r: DiscountRule) => {
    if (r.ruleType === "first_purchase") return "Nenhum pedido anterior";
    if (r.ruleType === "order_count") return `Mínimo ${r.minOrders} pedidos`;
    if (r.ruleType === "free_freight") {
      const parts: string[] = [];
      if (r.minOrderValue != null) parts.push(`Compra ≥ R$ ${r.minOrderValue.toFixed(2).replace(".", ",")}`);
      if (r.maxDistanceKm != null) parts.push(`Até ${r.maxDistanceKm} km`);
      return parts.length > 0 ? parts.join(" • ") : "Sem restrição";
    }
    return "-";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Percent className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:inline">Descontos para Clientes</span>
          <span className="sm:hidden">Descontos</span>
        </h2>
        <Button onClick={openNew} size="sm" className="sm:size-default">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Nova Regra</span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure regras de desconto automáticas para clientes cadastrados. Inclui descontos em produtos e no frete.
      </p>

      {/* Mobile Cards */}
      <div className="space-y-3 sm:hidden">
        {discountRules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma regra de desconto criada ainda</p>
        ) : (
          discountRules.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{r.name}</p>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <Badge variant={r.active ? "default" : "secondary"}>
                  {r.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">
                  {r.discountPercent}%
                </Badge>
                <span>{ruleTypeLabels[r.ruleType] || r.ruleType}</span>
              </div>
              <p className="text-xs text-muted-foreground">{getConditionLabel(r)}</p>
              <div className="flex gap-1 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteDiscountRule(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="rounded-lg border border-border overflow-hidden hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discountRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma regra de desconto criada ainda
                </TableCell>
              </TableRow>
            ) : (
              discountRules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{r.name}</p>
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{ruleTypeLabels[r.ruleType] || r.ruleType}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">
                      {r.discountPercent}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getConditionLabel(r)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.active ? "default" : "secondary"}>
                      {r.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDiscountRule(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <FormDialogBar
            title={editing ? "Editar Regra" : "Nova Regra de Desconto"}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleSave}
            submitLabel={editing ? "Salvar" : "Criar"}
            submitDisabled={!form.name}
          />
          <div className="space-y-4">
            <div>
              <Label>Nome da Regra</Label>
              <Input
                placeholder="Ex: Frete grátis acima de R$ 100"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição da promoção"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo da Regra</Label>
              <Select
                value={form.ruleType}
                onValueChange={(v) => setForm({ ...form, ruleType: v as DiscountRule["ruleType"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_purchase">Primeira compra</SelectItem>
                  <SelectItem value="order_count">Quantidade de pedidos</SelectItem>
                  <SelectItem value="free_freight">Desconto no frete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.ruleType === "order_count" && (
              <div>
                <Label>Mínimo de pedidos anteriores</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.minOrders}
                  onChange={(e) => setForm({ ...form, minOrders: Number(e.target.value) })}
                />
              </div>
            )}

            {form.ruleType === "free_freight" && (
              <>
                <div>
                  <Label>Valor mínimo do pedido (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 100.00 (deixe vazio para sem mínimo)"
                    value={form.minOrderValue ?? ""}
                    onChange={(e) => setForm({
                      ...form,
                      minOrderValue: e.target.value ? Number(e.target.value) : null,
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Valor mínimo do carrinho para ativar o desconto no frete</p>
                </div>
                <div>
                  <Label>Distância máxima (km)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ex: 5 (deixe vazio para qualquer distância)"
                    value={form.maxDistanceKm ?? ""}
                    onChange={(e) => setForm({
                      ...form,
                      maxDistanceKm: e.target.value ? Number(e.target.value) : null,
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Distância máxima para a entrega ser elegível ao desconto</p>
                </div>
              </>
            )}

            <div>
              <Label>Desconto no {form.ruleType === "free_freight" ? "frete" : "pedido"} (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
              />
              {form.ruleType === "free_freight" && (
                <p className="text-xs text-muted-foreground mt-1">Use 100% para frete totalmente grátis</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
              <Label>Regra ativa</Label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
