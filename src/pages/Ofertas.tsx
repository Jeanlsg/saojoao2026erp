import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useCart } from "@/contexts/CartContext";
import { FlyerPage } from "@/components/store/FlyerCard";
import { Product } from "@/data/products";
import { StoreHeader } from "@/components/store/StoreHeader";
import { BottomNav } from "@/components/store/BottomNav";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

interface Flyer {
  id: string;
  title: string;
  subtitle: string;
  validDate: string | null;
  minDeliveryValue: number | null;
  productIds: string[];
}

export default function Ofertas() {
  const { products } = useStore();
  const { addItem, items: cartItems } = useCart();
  const { toast } = useToast();
  const [flyers, setFlyers] = useState<Flyer[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("flyers").select("*").eq("active", true).order("created_at", { ascending: false });
      if (data) {
        setFlyers(data.map((f: any) => ({
          id: f.id,
          title: f.title,
          subtitle: f.subtitle || "",
          validDate: f.valid_date,
          minDeliveryValue: f.min_delivery_value != null ? Number(f.min_delivery_value) : null,
          productIds: f.product_ids || [],
        })));
      }
    };
    load();
  }, []);

  const flyerProducts = (flyer: Flyer): Product[] =>
    flyer.productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as Product[];

  const getQuantity = (productId: string) =>
    cartItems.find((i) => i.product.id === productId)?.quantity ?? 0;

  const handleProductClick = (product: Product) => {
    addItem(product);
    toast({
      title: "Adicionado ao carrinho",
      description: product.name,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0 pt-0">
      <StoreHeader />
      <div className="container py-4">
        <BackButton to="/" className="mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">📰 Jornais de Ofertas</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Toque em um produto para adicioná-lo ao carrinho.
        </p>

        {flyers.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum jornal de ofertas disponível no momento.</p>
        ) : (
          <div className="space-y-6">
            {flyers.map((flyer) => {
              const prods = flyerProducts(flyer);
              if (prods.length === 0) return null;
              return (
                <FlyerPage
                  key={flyer.id}
                  title={flyer.title}
                  subtitle={flyer.subtitle}
                  validDate={flyer.validDate}
                  minDeliveryValue={flyer.minDeliveryValue}
                  products={prods}
                  onProductClick={handleProductClick}
                  getQuantity={getQuantity}
                />
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
