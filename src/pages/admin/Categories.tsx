import { useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Category } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormDialogBar } from "@/components/admin/FormDialogBar";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";

const EMOJI_OPTIONS = ["🛒", "🥤", "🍎", "🍞", "🧀", "🧹", "🧴", "🍖", "🐟", "🍫", "🥛", "🥚", "🌽", "🍕", "🧊"];

export default function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");

  const openNew = () => { setEditing(null); setName(""); setIcon("🛒"); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setIcon(c.icon); setDialogOpen(true); };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editing) {
      updateCategory({ ...editing, name, icon });
    } else {
      addCategory({ id: name.toLowerCase().replace(/\s+/g, "-"), name, icon });
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Categorias</h2>
        <Button onClick={openNew} size="sm" className="sm:size-default">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Nova Categoria</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          return (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <div>
                    <p className="font-bold text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{count} produto(s)</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)} disabled={count > 0}>
                    <Trash2 className={`h-4 w-4 ${count > 0 ? "text-muted-foreground" : "text-destructive"}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <FormDialogBar
            title={editing ? "Editar Categoria" : "Nova Categoria"}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleSave}
            submitLabel={editing ? "Salvar" : "Criar"}
            submitDisabled={!name.trim()}
          />
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`text-2xl p-1 rounded-md border-2 transition-all ${
                      icon === e ? "border-primary bg-primary/10" : "border-transparent hover:border-border"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
