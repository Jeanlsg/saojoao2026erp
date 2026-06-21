import { useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Combo } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormDialogBar } from "@/components/admin/FormDialogBar";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Plus, Pencil, Trash2 } from "lucide-react";

const emptyCombo = { name: "", description: "", discountPercent: 10, image: "", productIds: [] as string[] };

export default function Combos() {
  const { combos, products, addCombo, updateCombo, deleteCombo } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [form, setForm] = useState(emptyCombo);

  const openNew = () => { setEditing(null); setForm(emptyCombo); setDialogOpen(true); };
  const openEdit = (c: Combo) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description, discountPercent: c.discountPercent, image: c.image, productIds: [...c.productIds] });
    setDialogOpen(true);
  };

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id],
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.image || form.productIds.length === 0) return;
    if (editing) {
      updateCombo({ ...editing, ...form });
    } else {
      addCombo({ ...form, id: `c${Date.now()}` } as Combo);
    }
    setDialogOpen(false);
  };

  const getOriginalPrice = (productIds: string[]) =>
    productIds.reduce((sum, id) => {
      const p = products.find((x) => x.id === id);
      return sum + (p?.price || 0);
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Combos & Promoções</h2>
        <Button onClick={openNew} size="sm" className="sm:size-default">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Novo Combo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {combos.map((combo) => {
          const originalPrice = getOriginalPrice(combo.productIds);
          const promoPrice = originalPrice * (1 - combo.discountPercent / 100);
          return (
            <Card key={combo.id} className="overflow-hidden">
              <div className="h-32 overflow-hidden">
                <img src={combo.image} alt={combo.name} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground">{combo.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{combo.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-xs text-muted-foreground line-through">R$ {originalPrice.toFixed(2).replace(".", ",")}</span>
                    <span className="ml-2 font-bold text-accent">R$ {promoPrice.toFixed(2).replace(".", ",")}</span>
                    <span className="ml-1 text-xs font-bold text-destructive">-{combo.discountPercent}%</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(combo)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCombo(combo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <FormDialogBar
            title={editing ? "Editar Combo" : "Novo Combo"}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleSave}
            submitLabel={editing ? "Salvar" : "Criar"}
            submitDisabled={!form.name || !form.image || form.productIds.length === 0}
          />
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input type="number" step="1" min="1" max="99" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} />
              {form.productIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original: R$ {getOriginalPrice(form.productIds).toFixed(2).replace(".", ",")} →
                  Com desconto: R$ {(getOriginalPrice(form.productIds) * (1 - form.discountPercent / 100)).toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>
            <div>
              <Label>Imagem</Label>
              <ImagePicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
            </div>
            <div>
              <Label>Produtos do Combo</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 mt-1 border border-border rounded-lg p-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1">
                    <Checkbox checked={form.productIds.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                    <img src={p.image} alt="" className="h-6 w-6 rounded object-cover" />
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
