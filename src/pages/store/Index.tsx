import { useState, useMemo } from "react";
import { useStore } from "@/contexts/StoreContext";
import { StoreHeader } from "@/components/store/StoreHeader";
import { PromoBanner } from "@/components/store/PromoBanner";
import { CategoryBar } from "@/components/store/CategoryBar";
import { SearchBar, ViewMode } from "@/components/store/SearchBar";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductListItem } from "@/components/store/ProductListItem";
import { WelcomeSignupDialog } from "@/components/store/WelcomeSignupDialog";
import { ComboSuggestionDialog } from "@/components/store/ComboSuggestionDialog";
import { BottomNav } from "@/components/store/BottomNav";
import { LegalFooter } from "@/components/LegalFooter";

const Index = () => {
  const { products, categories, loading } = useStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeCategory) {
      filtered = filtered.filter((p) => p.categoryId === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [activeCategory, search, products]);

  const groupedProducts = useMemo(() => {
    if (activeCategory || search.trim()) {
      return [{ category: null, items: filteredProducts }];
    }
    return categories
      .map((cat) => ({
        category: cat,
        items: filteredProducts.filter((p) => p.categoryId === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredProducts, activeCategory, search, categories]);

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <StoreHeader />
      <PromoBanner />

      <CategoryBar activeCategory={activeCategory} onSelect={setActiveCategory} />

      <div className="container py-2 sm:py-3">
        <SearchBar value={search} onChange={setSearch} viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <main id="products-section" className="container pb-8">
        {groupedProducts.map((group, idx) => (
          <section key={group.category?.id || idx} className="mb-4 sm:mb-6">
            {group.category && (
              <h2 className="mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
                <span className="text-base sm:text-lg">{group.category.icon}</span>
                {group.category.name}
              </h2>
            )}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {group.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {group.items.map((product) => (
                  <ProductListItem key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        ))}
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-lg">Nenhum produto encontrado</p>
            <p className="text-sm">Tente buscar por outro nome</p>
          </div>
        )}
      </main>

      <WelcomeSignupDialog />
      <ComboSuggestionDialog />
      <LegalFooter />
      <BottomNav />
    </div>
  );
};

export default Index;
