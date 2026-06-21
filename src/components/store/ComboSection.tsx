import { useStore } from "@/contexts/StoreContext";
import { useCart } from "@/contexts/CartContext";
import { Flame, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ComboSection() {
  const { combos, products } = useStore();
  const { addItem } = useCart();

  const handleAddCombo = (productIds: string[]) => {
    productIds.forEach((id) => {
      const product = products.find((p) => p.id === id);
      if (product) addItem(product);
    });
  };

  const getOriginalPrice = (productIds: string[]) =>
    productIds.reduce((sum, id) => {
      const p = products.find((x) => x.id === id);
      return sum + (p?.price || 0);
    }, 0);

  if (combos.length === 0) return null;

  return (
    <section className="container py-2">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-bold text-foreground">Ofertas Especiais</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {combos.map((combo) => {
          const originalPrice = getOriginalPrice(combo.productIds);
          const promoPrice = originalPrice * (1 - combo.discountPercent / 100);
          return (
            <div
              key={combo.id}
              className="min-w-[260px] max-w-[280px] flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="relative h-32 overflow-hidden">
                <img
                  src={combo.image}
                  alt={combo.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground border-0 text-[10px] font-bold">
                  {combo.discountPercent}% OFF
                </Badge>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-card-foreground">{combo.name}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                  {combo.description}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground line-through">
                      R$ {originalPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-lg font-extrabold text-accent">
                      R$ {promoPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddCombo(combo.productIds)}
                    className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-md transition-transform active:scale-95 hover:shadow-lg"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Pedir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
