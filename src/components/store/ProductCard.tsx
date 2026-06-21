import { Plus, Minus } from "lucide-react";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const { categories } = useStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const selected = quantity > 0;
  const category = categories.find((c) => c.id === product.categoryId);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated active:scale-[0.99] bg-white/60 dark:bg-white/10 backdrop-blur-xl border-white/40 dark:border-white/15 ${
        selected ? "ring-2 ring-accent border-accent" : ""
      }`}
    >
      {/* Imagem do produto */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-muted/40 to-muted/10">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Reflexo de vitrine */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 via-white/10 to-transparent dark:from-white/10 dark:via-white/5" />
        {/* Tag de categoria */}
        {category && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/50 backdrop-blur-sm px-1.5 py-0.5 text-[8px] sm:text-[10px] font-semibold text-white leading-tight shadow-sm">
            {category.icon} {category.name}
          </span>
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] sm:text-xs font-extrabold shadow-md">
            {quantity}
          </span>
        )}
      </div>

      {/* Info do produto */}
      <div className="flex flex-1 flex-col p-2 sm:p-3">
        <h3 className="text-xs sm:text-sm font-semibold leading-tight text-card-foreground line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.unit && (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
            {product.unit}
          </span>
        )}

        {/* Preço + ação — altura fixa para manter cards alinhados */}
        <div className="mt-auto pt-2 sm:pt-2.5">
          <span className="block text-sm sm:text-base font-extrabold text-accent leading-none">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </span>
          {product.wholesaleActive && product.wholesalePrice && product.wholesaleMinQty && (
            <span className="block text-[9px] sm:text-[10px] text-primary font-semibold mt-0.5 leading-tight">
              {product.wholesaleMinQty}+ un: R$ {product.wholesalePrice.toFixed(2).replace(".", ",")}/un
            </span>
          )}

          {/* Controle de quantidade — sempre abaixo do preço, centralizado */}
          <div className="mt-2 flex items-center justify-center h-8 sm:h-9">
            {quantity === 0 ? (
              <button
                onClick={() => addItem(product)}
                className="flex h-8 w-full sm:h-9 items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium shadow-sm transition-all active:scale-95 hover:brightness-110"
                aria-label={`Adicionar ${product.name}`}
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Adicionar</span>
              </button>
            ) : (
              <div className="flex items-center justify-between w-full rounded-lg bg-muted/60 h-8 sm:h-9 px-1">
                <button
                  onClick={() => updateQuantity(product.id, quantity - 1)}
                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md text-foreground/80 hover:bg-card transition-colors"
                  aria-label="Diminuir"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-sm sm:text-base font-bold text-foreground tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => addItem(product)}
                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:brightness-110 transition-colors"
                  aria-label="Adicionar mais"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
