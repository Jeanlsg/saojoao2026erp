import { Plus, Minus } from "lucide-react";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";

interface ProductListItemProps {
  product: Product;
}

export function ProductListItem({ product }: ProductListItemProps) {
  const { items, addItem, updateQuantity } = useCart();
  const { categories } = useStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const selected = quantity > 0;
  const category = categories.find((c) => c.id === product.categoryId);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-2 sm:p-3 shadow-soft transition-all duration-200 bg-white/60 dark:bg-white/10 backdrop-blur-xl border-white/40 dark:border-white/15 ${
        selected ? "ring-2 ring-accent border-accent" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-b from-muted/40 to-muted/10">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Tag de categoria */}
        {category && (
          <span className="absolute left-0.5 top-0.5 rounded bg-black/50 backdrop-blur-sm px-1 py-0.5 text-[7px] sm:text-[8px] font-semibold text-white leading-tight">
            {category.icon} {category.name}
          </span>
        )}
        {selected && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[8px] sm:text-[10px] font-extrabold shadow-sm">
            {quantity}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col min-w-0">
        <h3 className="text-xs sm:text-sm font-semibold leading-tight text-card-foreground line-clamp-2">
          {product.name}
        </h3>
        {product.unit && (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
            {product.unit}
          </span>
        )}
        <span className="mt-1 text-sm sm:text-base font-extrabold text-accent">
          R$ {product.price.toFixed(2).replace(".", ",")}
        </span>
        {product.wholesaleActive && product.wholesalePrice && product.wholesaleMinQty && (
          <span className="text-[9px] sm:text-[10px] text-primary font-semibold leading-tight">
            {product.wholesaleMinQty}+ un: R$ {product.wholesalePrice.toFixed(2).replace(".", ",")}/un
          </span>
        )}
      </div>

      {/* Controles */}
      <div className="flex-shrink-0">
        {quantity === 0 ? (
          <button
            onClick={() => addItem(product)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all active:scale-95 hover:brightness-110"
            aria-label={`Adicionar ${product.name}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-1.5 py-1">
            <button
              onClick={() => updateQuantity(product.id, quantity - 1)}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md text-foreground/80 hover:bg-card transition-colors"
              aria-label="Diminuir"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-bold text-foreground tabular-nums w-5 text-center">
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
  );
}
