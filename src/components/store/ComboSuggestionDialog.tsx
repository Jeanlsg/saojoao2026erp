import { useCart } from "@/contexts/CartContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Gift } from "lucide-react";

export function ComboSuggestionDialog() {
  const { comboSuggestion, dismissComboSuggestion, addItem } = useCart();

  if (!comboSuggestion) return null;

  const { combo, missingProducts } = comboSuggestion;

  const handleAdd = (product: typeof missingProducts[0]) => {
    addItem(product);
    dismissComboSuggestion();
  };

  return (
    <Dialog open={!!comboSuggestion} onOpenChange={(open) => !open && dismissComboSuggestion()}>
      <DialogContent className="max-w-sm mx-auto [&>button]:hidden">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">
              Quase um combo!
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione mais {missingProducts.length === 1 ? "1 item" : `${missingProducts.length} itens`} e ganhe{" "}
              <span className="font-bold text-primary">{combo.discountPercent}% de desconto</span> no{" "}
              <span className="font-semibold">{combo.name}</span>
            </p>
          </div>

          <div className="w-full space-y-2 mt-1">
            {missingProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-2"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <button
                  onClick={() => handleAdd(product)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all active:scale-95 hover:brightness-110 flex-shrink-0"
                  aria-label={`Adicionar ${product.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={dismissComboSuggestion}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            Agora não
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
