import { useMemo, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormDialogBar } from "@/components/admin/FormDialogBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";

const emptyProduct: Omit<Product, "id"> = {
  name: "",
  price: 0,
  image: "",
  categoryId: "",
  unit: "un",
  description: "",
  stock: 0,
};

const formatCurrency = (price: number) => `R$ ${price.toFixed(2).replace(".", ",")}`;

type StockStatus = "esgotado" | "critico" | "baixo" | "normal";

function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return "esgotado";
  if (stock <= 5) return "critico";
  if (stock <= 15) return "baixo";
  return "normal";
}

const STATUS_META: Record<StockStatus, { label: string; className: string }> = {
  esgotado: {
    label: "Esgotado",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  critico: {
    label: "Crítico",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  baixo: {
    label: "Baixo",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  normal: {
    label: "Normal",
    className: "bg-accent/15 text-accent border-accent/30",
  },
};

const stockTextClass = (status: StockStatus) =>
  status === "critico" || status === "esgotado"
    ? "text-destructive"
    : status === "baixo"
    ? "text-primary"
    : "text-foreground";

export default function Products() {
  const { products, categories, addProduct, updateProduct, deleteProduct, lowStockProducts } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (onlyLowStock) list = list.filter((p) => p.stock <= 15);
    return list;
  }, [products, search, onlyLowStock]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyProduct);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      price: product.price,
      image: product.image,
      categoryId: product.categoryId,
      unit: product.unit,
      description: product.description,
      stock: product.stock,
      wholesalePrice: product.wholesalePrice,
      wholesaleMinQty: product.wholesaleMinQty,
      wholesaleActive: product.wholesaleActive,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.categoryId || !form.image) return;
    if (editing) {
      updateProduct({ ...editing, ...form });
    } else {
      addProduct({ ...form, id: `p${Date.now()}` } as Product);
    }
    setDialogOpen(false);
  };

  /** Ajuste rápido inline de estoque (pelo card / tabela). */
  const adjustStock = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateProduct({ ...product, stock: Math.max(0, product.stock + delta) });
  };

  const setStockExact = (productId: string, value: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateProduct({ ...product, stock: Math.max(0, Math.floor(value)) });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Produtos</h2>
        <Button onClick={openNew} size="sm" className="shrink-0 sm:size-default">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Novo Produto</span>
        </Button>
      </div>

      {/* === Alerta de estoque baixo (vinha de Inventory) === */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />
              <span className="font-bold text-sm sm:text-base text-destructive">
                Estoque Baixo ({lowStockProducts.length})
              </span>
            </div>
            <Button
              variant={onlyLowStock ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyLowStock((v) => !v)}
              className="text-xs h-7"
            >
              {onlyLowStock ? "Mostrar todos" : "Filtrar"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowStockProducts.map((p) => (
              <Badge key={p.id} variant="destructive" className="text-[10px] sm:text-xs font-normal">
                {p.name}: {p.stock}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Input
        placeholder="Buscar produto..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full sm:max-w-sm"
      />

      {/* === MOBILE: cards com ajuste de estoque inline === */}
      <div className="space-y-2 sm:hidden">
        {filteredProducts.map((product) => {
          const status = getStockStatus(product.stock);
          const meta = STATUS_META[status];
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => openEdit(product)}
              className={`w-full text-left rounded-lg border bg-card p-2.5 transition-all active:scale-[0.99] hover:shadow-md hover:border-primary/40 ${
                status === "critico" || status === "esgotado" ? "border-destructive/30" : "border-border"
              }`}
              aria-label={`Editar ${product.name}`}
            >
              <div className="flex items-start gap-2.5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-12 w-12 shrink-0 rounded object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {categoryById.get(product.categoryId) || product.categoryId} · {formatCurrency(product.price)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-base font-extrabold leading-none ${stockTextClass(status)}`}>
                      {product.stock}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {product.unit || "un"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-4 font-bold ${meta.className}`}
                    >
                      {meta.label}
                    </Badge>
                  </div>
                </div>
                {/* Excluir fica isolado — stopPropagation pra não disparar o editor */}
                <div className="shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 relative before:absolute before:-inset-2 before:content-['']"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProduct(product.id);
                    }}
                    aria-label="Excluir produto"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {/* Ajuste rápido de estoque — botões com stopPropagation pra não abrir editor */}
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Ajustar estoque (toque no card pra editar)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 relative before:absolute before:-inset-y-2 before:content-['']"
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustStock(product.id, -1);
                    }}
                    aria-label="Diminuir 1"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 relative before:absolute before:-inset-y-2 before:content-['']"
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustStock(product.id, +1);
                    }}
                    aria-label="Aumentar 1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </button>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        )}
      </div>

      {/* === DESKTOP: tabela com input de estoque + botões − / + === */}
      <div className="hidden rounded-lg border border-border sm:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-44">Estoque</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const status = getStockStatus(product.stock);
              const meta = STATUS_META[status];
              const stop = (e: React.MouseEvent | React.PointerEvent | React.ChangeEvent) =>
                e.stopPropagation();
              return (
                <TableRow
                  key={product.id}
                  // Linha inteira clicável — abre o editor. Botões de estoque/excluir
                  // usam stopPropagation para não disparar o editor no mesmo clique.
                  onClick={() => openEdit(product)}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    status === "critico" || status === "esgotado" ? "bg-destructive/5" : ""
                  }`}
                >
                  <TableCell>
                    <img src={product.image} alt={product.name} className="h-10 w-10 rounded object-cover" />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryById.get(product.categoryId) || product.categoryId}
                  </TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={stop}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 relative before:absolute before:-inset-y-2 before:content-['']"
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustStock(product.id, -1);
                        }}
                        aria-label="Diminuir estoque"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={product.stock}
                        onClick={stop}
                        onChange={(e) => setStockExact(product.id, Number(e.target.value))}
                        className={`w-16 h-8 text-center font-bold ${stockTextClass(status)}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 relative before:absolute before:-inset-y-2 before:content-['']"
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustStock(product.id, +1);
                        }}
                        aria-label="Aumentar estoque"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProduct(product.id);
                        }}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto [&>button]:hidden">
          <FormDialogBar
            title={editing ? "Editar Produto" : "Novo Produto"}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleSave}
            submitLabel={editing ? "Salvar" : "Criar"}
            submitDisabled={!form.name || !form.categoryId || !form.image}
          />

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
                />
              </div>

              <div>
                <Label>Unidade</Label>
                <Select value={form.unit || "un"} onValueChange={(value) => setForm({ ...form, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="pct">Pacote</SelectItem>
                    <SelectItem value="L">Litro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.description || ""}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div>
              <Label>Estoque</Label>
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })}
              />
            </div>

            <div>
              <Label>Imagem do Produto</Label>
              <ImagePicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
            </div>

            {/* === Preço de Atacado === */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Preço de Atacado</Label>
                <Switch
                  checked={form.wholesaleActive || false}
                  onCheckedChange={(checked) => setForm({ ...form, wholesaleActive: checked })}
                />
              </div>
              {form.wholesaleActive && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Preço por unidade (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.wholesalePrice || ""}
                      onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value) || null })}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Qtd. mínima</Label>
                    <Input
                      type="number"
                      min="2"
                      value={form.wholesaleMinQty || ""}
                      onChange={(e) => setForm({ ...form, wholesaleMinQty: Number(e.target.value) || null })}
                      placeholder="Ex: 6"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
