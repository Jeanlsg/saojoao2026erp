import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Product, Category, Combo, FreightRange } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

export interface DiscountRule {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  ruleType: "first_purchase" | "order_count" | "free_freight";
  minOrders: number;
  minOrderValue: number | null;
  maxDistanceKm: number | null;
  active: boolean;
}

interface StoreContextType {
  products: Product[];
  categories: Category[];
  combos: Combo[];
  freightRanges: FreightRange[];
  discountRules: DiscountRule[];
  storeCep: string;
  whatsappNumber: string;
  loading: boolean;
  loadError: boolean;
  reloadData: () => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setCombos: React.Dispatch<React.SetStateAction<Combo[]>>;
  setFreightRanges: React.Dispatch<React.SetStateAction<FreightRange[]>>;
  setDiscountRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  setStoreCep: (cep: string) => void;
  calculateFreight: (distanceKm: number) => number | null;
  getFreightDiscount: (cartTotal: number, distanceKm: number | null) => DiscountRule | null;
  getApplicableDiscount: (userId: string | null) => Promise<DiscountRule | null>;
  lowStockProducts: Product[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [freightRanges, setFreightRanges] = useState<FreightRange[]>([]);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [storeCep, setStoreCepState] = useState("01001-000");
  const [whatsappNumber, setWhatsappNumber] = useState("5567999999999");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [
        { data: cats },
        { data: prods },
        { data: cmbs },
        { data: frs },
        { data: settings },
        { data: rules },
      ] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("products").select("*"),
        supabase.from("combos").select("*"),
        supabase.from("freight_ranges").select("*"),
        supabase.from("store_settings").select("*"),
        supabase.from("discount_rules").select("*"),
      ]);

      if (cats) setCategories(cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon })));
      if (prods) setProducts(prods.map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), image: p.image,
        categoryId: p.category_id || "", description: p.description ?? undefined, unit: p.unit ?? undefined, stock: p.stock,
        promoPrice: p.promo_price != null ? Number(p.promo_price) : null,
        showInOffers: p.show_in_offers || false,
        wholesalePrice: p.wholesale_price != null ? Number(p.wholesale_price) : null,
        wholesaleMinQty: p.wholesale_min_qty != null ? Number(p.wholesale_min_qty) : null,
        wholesaleActive: p.wholesale_active || false,
      })));
      if (cmbs) setCombos(cmbs.map((c) => ({
        id: c.id, name: c.name, description: c.description,
        discountPercent: Number(c.discount_percent),
        image: c.image, productIds: c.product_ids || [],
      })));
      if (frs) setFreightRanges(frs.map((f) => ({
        id: f.id, minKm: Number(f.min_km), maxKm: Number(f.max_km), price: Number(f.price),
      })));
      if (settings) {
        const cepSetting = (settings as any[]).find((s) => s.key === "store_cep");
        const whatsappSetting = (settings as any[]).find((s) => s.key === "whatsapp_number");
        if (cepSetting) setStoreCepState(cepSetting.value);
        if (whatsappSetting) setWhatsappNumber(whatsappSetting.value);
      }
      if (rules) setDiscountRules(rules.map((r) => ({
        id: r.id, name: r.name, description: r.description || "",
        discountPercent: Number(r.discount_percent),
        ruleType: r.rule_type as DiscountRule["ruleType"], minOrders: r.min_orders || 0,
        minOrderValue: r.min_order_value != null ? Number(r.min_order_value) : null,
        maxDistanceKm: r.max_distance_km != null ? Number(r.max_distance_km) : null,
        active: r.active,
      })));
    } catch (err) {
      console.error("[StoreContext] Failed to load data:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribeProducts = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel("store-products")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const p = payload.new as any;
        setProducts((prev) => prev.map((x) => (x.id === p.id ? {
          ...x, name: p.name, price: Number(p.price),
          promoPrice: p.promo_price != null ? Number(p.promo_price) : null,
          image: p.image, categoryId: p.category_id || "", description: p.description,
          unit: p.unit, stock: p.stock, showInOffers: p.show_in_offers || false,
          wholesalePrice: p.wholesale_price != null ? Number(p.wholesale_price) : null,
          wholesaleMinQty: p.wholesale_min_qty != null ? Number(p.wholesale_min_qty) : null,
          wholesaleActive: p.wholesale_active || false,
        } : x)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, (payload) => {
        const p = payload.new as any;
        setProducts((prev) => prev.find((x) => x.id === p.id) ? prev : [...prev, {
          id: p.id, name: p.name, price: Number(p.price),
          promoPrice: p.promo_price != null ? Number(p.promo_price) : null,
          image: p.image, categoryId: p.category_id || "", description: p.description,
          unit: p.unit, stock: p.stock, showInOffers: p.show_in_offers || false,
          wholesalePrice: p.wholesale_price != null ? Number(p.wholesale_price) : null,
          wholesaleMinQty: p.wholesale_min_qty != null ? Number(p.wholesale_min_qty) : null,
          wholesaleActive: p.wholesale_active || false,
        }]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "products" }, (payload) => {
        setProducts((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
      })
      .subscribe();
    channelRef.current = channel;
  }, []);

  useEffect(() => {
    loadData();
    subscribeProducts();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [loadData, subscribeProducts]);

  const setStoreCep = useCallback((cep: string) => {
    setStoreCepState(cep);
    supabase.from("store_settings").upsert(
      { key: "store_cep", value: cep, updated_at: new Date().toISOString() } as any,
      { onConflict: "key" } as any
    ).then();
  }, []);

  const calculateFreight = useCallback((distanceKm: number): number | null => {
    if (freightRanges.length === 0) return null;
    const sorted = [...freightRanges].sort((a, b) => a.minKm - b.minKm);
    for (const r of sorted) {
      if (distanceKm >= r.minKm && distanceKm <= r.maxKm) return r.price;
    }
    return null;
  }, [freightRanges]);

  const getApplicableDiscount = useCallback(async (userId: string | null): Promise<DiscountRule | null> => {
    if (!userId) return null;
    const activeRules = discountRules.filter((r) => r.active);
    if (activeRules.length === 0) return null;

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["entregue", "preparando"]);

    const orderCount = count || 0;
    let bestRule: DiscountRule | null = null;

    for (const rule of activeRules) {
      if (rule.ruleType === "first_purchase" && orderCount === 0) {
        if (!bestRule || rule.discountPercent > bestRule.discountPercent) bestRule = rule;
      }
      if (rule.ruleType === "order_count" && orderCount >= rule.minOrders) {
        if (!bestRule || rule.discountPercent > bestRule.discountPercent) bestRule = rule;
      }
    }
    return bestRule;
  }, [discountRules]);

  const getFreightDiscount = useCallback((cartTotal: number, distanceKm: number | null): DiscountRule | null => {
    const freightRules = discountRules.filter((r) => r.active && r.ruleType === "free_freight");
    if (freightRules.length === 0) return null;

    let bestRule: DiscountRule | null = null;
    for (const rule of freightRules) {
      const meetsMinValue = rule.minOrderValue == null || cartTotal >= rule.minOrderValue;
      const meetsMaxDistance = rule.maxDistanceKm == null || (distanceKm != null && distanceKm <= rule.maxDistanceKm);
      if (meetsMinValue && meetsMaxDistance) {
        if (!bestRule || rule.discountPercent > bestRule.discountPercent) bestRule = rule;
      }
    }
    return bestRule;
  }, [discountRules]);

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 5), [products]);

  return (
    <StoreContext.Provider
      value={{
        products, categories, combos, freightRanges, discountRules,
        storeCep, whatsappNumber, loading, loadError, reloadData: loadData,
        setProducts, setCategories, setCombos, setFreightRanges, setDiscountRules,
        setStoreCep, calculateFreight, getFreightDiscount, getApplicableDiscount,
        lowStockProducts,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
