import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useStore } from "@/contexts/StoreContext";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ChevronLeft, ChevronRight, Tag, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PromoBanner() {
  const { combos, products } = useStore();
  const { addItem } = useCart();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build slides from combos + promo products
  type Slide = { type: "combo"; combo: typeof combos[0] } | { type: "product"; product: typeof products[0] };

  const promoProducts = products.filter(
    (p) => (p as any).promoPrice != null && (p as any).promoPrice > 0 && (p as any).promoPrice < p.price && (p as any).showInOffers
  );

  const slides: Slide[] = [
    ...combos.map((c) => ({ type: "combo" as const, combo: c })),
    ...promoProducts.map((p) => ({ type: "product" as const, product: p })),
  ];

  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), 4000);
  }, [emblaApi]);

  const pauseAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null; }
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => startAutoplay(), 40000);
  }, [startAutoplay]);

  const scrollPrev = useCallback(() => { emblaApi?.scrollPrev(); pauseAutoplay(); }, [emblaApi, pauseAutoplay]);
  const scrollNext = useCallback(() => { emblaApi?.scrollNext(); pauseAutoplay(); }, [emblaApi, pauseAutoplay]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onPointerDown = () => pauseAutoplay();
    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", onPointerDown);
    startAutoplay();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [emblaApi, startAutoplay, pauseAutoplay]);

  const getComboOriginalPrice = (productIds: string[]) =>
    productIds.reduce((sum, id) => {
      const p = products.find((x) => x.id === id);
      return sum + (p?.price || 0);
    }, 0);

  if (slides.length === 0) {
    return (
      <section className="container py-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <Flame className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <h2 className="text-xl font-bold">🔥 Ofertas Especiais</h2>
          <p className="mt-1 text-sm opacity-90">Em breve, novas promoções imperdíveis!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-bold text-foreground">Ofertas Especiais</h2>
      </div>

      <div className="relative group/carousel flex items-center gap-2">
        {/* Left arrow */}
        {slides.length > 1 && (
          <button
            onClick={scrollPrev}
            className="hidden sm:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-opacity opacity-0 group-hover/carousel:opacity-100 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div ref={emblaRef} className="overflow-hidden rounded-2xl flex-1">
          <div className="flex">
            {slides.map((slide, idx) => {
              if (slide.type === "combo") {
                const combo = slide.combo;
                const originalPrice = getComboOriginalPrice(combo.productIds);
                const promoPrice = originalPrice * (1 - combo.discountPercent / 100);
                return (
                  <div key={`combo-${combo.id}`} className="min-w-0 flex-[0_0_100%] px-1">
                    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                       <div className="relative h-36 sm:h-56 overflow-hidden">
                        <img src={combo.image} alt={combo.name} className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground border-0 text-xs font-bold">
                          {combo.discountPercent}% OFF
                        </Badge>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h3 className="text-lg font-bold drop-shadow">{combo.name}</h3>
                          <p className="text-xs opacity-90 line-clamp-1">{combo.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground line-through">
                            R$ {originalPrice.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-xl font-extrabold text-destructive">
                            R$ {promoPrice.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <button
                          onClick={() => combo.productIds.forEach((id) => {
                            const p = products.find((x) => x.id === id);
                            if (p) addItem(p);
                          })}
                          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-transform active:scale-95"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Pedir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const product = slide.product;
                const promo = (product as any).promoPrice!;
                const discountPct = Math.round((1 - promo / product.price) * 100);
                return (
                  <div key={`promo-${product.id}`} className="min-w-0 flex-[0_0_100%] px-1">
                    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                      <div className="relative h-36 sm:h-56 overflow-hidden">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground border-0 text-xs font-bold">
                          <Tag className="mr-1 h-3 w-3" />
                          {discountPct}% OFF
                        </Badge>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h3 className="text-lg font-bold drop-shadow">{product.name}</h3>
                          {product.unit && <p className="text-xs opacity-90">{product.unit}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground line-through">
                            R$ {product.price.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-xl font-extrabold text-destructive">
                            R$ {promo.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <button
                          onClick={() => addItem({ ...product, price: promo })}
                          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-transform active:scale-95"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Pedir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Right arrow */}
        {slides.length > 1 && (
          <button
            onClick={scrollNext}
            className="hidden sm:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-opacity opacity-0 group-hover/carousel:opacity-100 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === selectedIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
