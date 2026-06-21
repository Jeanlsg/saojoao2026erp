import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormDialogBar } from "@/components/admin/FormDialogBar";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Newspaper, Eye } from "lucide-react";
import { FlyerPage } from "@/components/store/FlyerCard";
import { Product } from "@/data/products";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

interface Flyer {
  id: string;
  title: string;
  subtitle: string;
  validDate: string | null;
  minDeliveryValue: number | null;
  productIds: string[];
  active: boolean;
}

const emptyFlyer: Omit<Flyer, "id"> = {
  title: "Super Quinta",
  subtitle: "APROVEITE",
  validDate: null,
  minDeliveryValue: 90,
  productIds: [],
  active: true,
};

export default function Flyers() {
  const { products } = useAdmin();
  const { toast } = useToast();
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState<Flyer | null>(null);
  const [form, setForm] = useState<Omit<Flyer, "id">>(emptyFlyer);
  const [promoPrices, setPromoPrices] = useState<Record<string, number | undefined>>({});
  const [searchProduct, setSearchProduct] = useState("");

  const loadFlyers = useCallback(async () => {
    const { data } = await db.from("flyers").select("*").order("created_at", { ascending: false });
    if (data) {
      setFlyers(data.map((f: any) => ({
        id: f.id,
        title: f.title,
        subtitle: f.subtitle || "",
        validDate: f.valid_date,
        minDeliveryValue: f.min_delivery_value != null ? Number(f.min_delivery_value) : null,
        productIds: f.product_ids || [],
        active: f.active,
      })));
    }
  }, []);

  useEffect(() => { loadFlyers(); }, [loadFlyers]);

  const openNew = () => { setEditing(null); setForm(emptyFlyer); setPromoPrices({}); setSearchProduct(""); setDialogOpen(true); };
  const openEdit = (f: Flyer) => {
    setEditing(f);
    setForm({ title: f.title, subtitle: f.subtitle, validDate: f.validDate, minDeliveryValue: f.minDeliveryValue, productIds: [...f.productIds], active: f.active });
    const initialPrices: Record<string, number> = {};
    f.productIds.forEach(id => {
      const p = products.find(prod => prod.id === id);
      if (p?.promoPrice) initialPrices[id] = p.promoPrice;
    });
    setPromoPrices(initialPrices);
    setSearchProduct("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || form.productIds.length === 0) {
      toast({ title: "Preencha o título e selecione ao menos 1 produto", variant: "destructive" });
      return;
    }
    const record = {
      title: form.title,
      subtitle: form.subtitle,
      valid_date: form.validDate || null,
      min_delivery_value: form.minDeliveryValue,
      product_ids: form.productIds,
      active: form.active,
    };

    if (editing) {
      await db.from("flyers").update(record).eq("id", editing.id);
    } else {
      await db.from("flyers").insert(record);
    }

    // Atualiza os preços promocionais nos produtos
    for (const pid of form.productIds) {
      const price = promoPrices[pid];
      await db.from("products").update({ promo_price: price || null }).eq("id", pid);
    }

    toast({ title: editing ? "Jornal atualizado!" : "Jornal criado!" });
    setDialogOpen(false);
    loadFlyers();
  };

  const handleDelete = async (id: string) => {
    await db.from("flyers").delete().eq("id", id);
    toast({ title: "Jornal excluído" });
    loadFlyers();
  };

  const toggleProduct = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const filteredProducts = searchProduct.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(searchProduct.toLowerCase()))
    : products;

  const selectedProducts: Product[] = form.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];

  const flyerProducts = (f: Flyer): Product[] =>
    f.productIds.map((id) => {
      const p = products.find((prod) => prod.id === id);
      if (p) return { ...p, promoPrice: promoPrices[p.id] !== undefined ? promoPrices[p.id] : p.promoPrice };
      return null;
    }).filter(Boolean) as Product[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Newspaper className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:inline">Jornais de Ofertas</span>
          <span className="sm:hidden">Jornais</span>
        </h2>
        <Button onClick={openNew} size="sm" className="sm:size-default">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Novo Jornal</span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Crie jornais promocionais automaticamente a partir dos seus produtos. Eles aparecerão na página inicial e em /ofertas.
      </p>

      {flyers.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum jornal criado ainda.</p>
      ) : (
        <div className="space-y-3">
          {flyers.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{f.title}</p>
                  {f.subtitle && <p className="text-xs text-muted-foreground">{f.subtitle}</p>}
                  <p className="text-xs text-muted-foreground">
                    {f.productIds.length} produtos
                    {f.validDate && ` • Válido: ${new Date(f.validDate + "T12:00:00").toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <Badge variant={f.active ? "default" : "secondary"}>
                  {f.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => { setEditing(f); setForm({ title: f.title, subtitle: f.subtitle, validDate: f.validDate, minDeliveryValue: f.minDeliveryValue, productIds: f.productIds, active: f.active }); setPreviewOpen(true); }}>
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(f.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <FormDialogBar
            title={editing ? "Editar Jornal" : "Novo Jornal de Ofertas"}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleSave}
            submitLabel={editing ? "Salvar" : "Criar"}
            submitDisabled={!form.title || form.productIds.length === 0}
          />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Super Quinta" />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="APROVEITE" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de validade</Label>
                <Input type="date" value={form.validDate || ""} onChange={(e) => setForm({ ...form, validDate: e.target.value || null })} />
              </div>
              <div>
                <Label>Entrega mínima (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.minDeliveryValue ?? ""} onChange={(e) => setForm({ ...form, minDeliveryValue: e.target.value ? Number(e.target.value) : null })} placeholder="90.00" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
              <Label>Jornal ativo</Label>
            </div>

            {/* Product selection */}
            <div>
              <Label>Produtos selecionados ({form.productIds.length}/6)</Label>
              {selectedProducts.length > 0 && (
                <div className="space-y-2 mt-2 mb-4">
                  {selectedProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 bg-muted/50 px-2 py-1.5 rounded-md border border-border/50">
                      <span className="flex-1 text-sm font-medium truncate">{p.name} <span className="text-xs text-muted-foreground font-normal ml-1">(R$ {p.price.toFixed(2).replace(".", ",")})</span></span>
                      <div className="w-28 relative">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">R$</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Oferta" 
                          value={promoPrices[p.id] ?? ""} 
                          onChange={(e) => setPromoPrices(prev => ({ ...prev, [p.id]: e.target.value ? Number(e.target.value) : undefined }))}
                          className="h-8 text-xs pl-7"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => toggleProduct(p.id)}>✕</Button>
                    </div>
                  ))}
                </div>
              )}
              <Input placeholder="Buscar produto..." value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} className="mb-2" />
              <div className="max-h-48 overflow-y-auto border border-border rounded-md">
                {filteredProducts.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox
                      checked={form.productIds.includes(p.id)}
                      onCheckedChange={() => toggleProduct(p.id)}
                      disabled={!form.productIds.includes(p.id) && form.productIds.length >= 6}
                    />
                    <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Live preview */}
            {selectedProducts.length > 0 && (
              <div>
                <Label className="mb-2 block">Preview</Label>
                <div className="scale-75 origin-top-left">
                  <FlyerPage
                    title={form.title}
                    subtitle={form.subtitle}
                    validDate={form.validDate}
                    minDeliveryValue={form.minDeliveryValue}
                    products={selectedProducts.map(p => ({
                      ...p,
                      promoPrice: promoPrices[p.id] !== undefined ? promoPrices[p.id] : p.promoPrice
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview do Jornal</DialogTitle>
          </DialogHeader>
          {editing && (
            <FlyerPage
              title={form.title}
              subtitle={form.subtitle}
              validDate={form.validDate}
              minDeliveryValue={form.minDeliveryValue}
              products={flyerProducts(editing)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
