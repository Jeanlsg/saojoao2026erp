import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Product, Category, Combo, FreightRange } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore, DiscountRule } from "@/contexts/StoreContext";
import { dispatchOrderNotification } from "@/hooks/useOrderNotification";
import { useToast } from "@/hooks/use-toast";
import { App } from "@capacitor/app";

interface OrderDeliveryInfo {
  method: "delivery" | "pickup";
  address?: string;
  number?: string;
  complement?: string;
  reference?: string;
  cep?: string;
  freightPrice?: number;
  distanceKm?: number;
  durationMin?: number;
}

interface Order {
  id: string;
  items: { productName: string; quantity: number; price: number }[];
  total: number;
  status: "pendente" | "preparando" | "entregue" | "cancelado" | "confirmado";
  customerName: string;
  customerPhone?: string;
  createdAt: string;
  delivery?: OrderDeliveryInfo;
  paymentMethod?: string;
  userId?: string;
  paid: boolean;
  paidAt?: string;
  tableNumber?: string;
  deliveryCode?: string;
  deliveryStatus?: string;
  deliveredBy?: string;
  deliveredAt?: string;
  deliveredItems?: any[];
}

interface AdminContextType {
  products: Product[];
  categories: Category[];
  combos: Combo[];
  orders: Order[];
  freightRanges: FreightRange[];
  discountRules: DiscountRule[];
  storeCep: string;
  setStoreCep: (cep: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  addCombo: (combo: Combo) => void;
  updateCombo: (combo: Combo) => void;
  deleteCombo: (id: string) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  updateOrderPaid: (id: string, paid: boolean) => void;
  addFreightRange: (range: FreightRange) => void;
  updateFreightRange: (range: FreightRange) => void;
  deleteFreightRange: (id: string) => void;
  calculateFreight: (distanceKm: number) => number | null;
  addDiscountRule: (rule: DiscountRule) => void;
  updateDiscountRule: (rule: DiscountRule) => void;
  deleteDiscountRule: (id: string) => void;
  getFreightDiscount: (cartTotal: number, distanceKm: number | null) => DiscountRule | null;
  getApplicableDiscount: (userId: string | null) => Promise<DiscountRule | null>;
  lowStockProducts: Product[];
  loading: boolean;
  loadError: boolean;
  reloadData: () => void;
  setOnNewOrder: (cb: ((order: Order) => void) | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const {
    products, setProducts, categories, setCategories, combos, setCombos,
    freightRanges, setFreightRanges, discountRules, setDiscountRules,
    storeCep, setStoreCep, calculateFreight, getFreightDiscount,
    getApplicableDiscount, lowStockProducts, loading, loadError, reloadData,
  } = store;

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onNewOrderRef = useRef<((order: Order) => void) | null>(null);
  const autoAcceptRef = useRef<boolean>(false);
  const updateOrderStatusRef = useRef<((id: string, status: Order["status"]) => void) | null>(null);
  const { isAdmin } = useAuth();
  const isAdminRef = useRef(isAdmin);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

  const setOnNewOrder = useCallback((cb: ((order: Order) => void) | null) => {
    onNewOrderRef.current = cb;
  }, []);

  const mapOrder = (o: any): Order => ({
    id: o.id,
    items: o.items as any[],
    total: Number(o.total),
    status: o.status as Order["status"],
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    createdAt: o.created_at,
    delivery: o.delivery as OrderDeliveryInfo | undefined,
    paymentMethod: o.payment_method,
    userId: o.user_id,
    paid: o.paid ?? false,
    paidAt: o.paid_at,
    tableNumber: o.table_number,
    deliveryCode: o.delivery_code,
    deliveryStatus: o.delivery_status,
    deliveredBy: o.delivered_by,
    deliveredAt: o.delivered_at,
    deliveredItems: o.delivered_items,
  });

  const subscribeRealtime = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = mapOrder(payload.new);
        setOrders((prev) => {
          if (prev.find((o) => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });
        onNewOrderRef.current?.(newOrder);
        if (isAdminRef.current) {
          const customer = newOrder.customerName || "Cliente";
          const valueStr = `R$ ${newOrder.total.toFixed(2).replace(".", ",")}`;
          dispatchOrderNotification(
            "🔔 Novo Pedido!",
            `${customer} — ${valueStr}`,
            { extra: { orderId: newOrder.id } }
          );
        }
        if (autoAcceptRef.current && newOrder.status === "pendente") {
          setTimeout(() => updateOrderStatusRef.current?.(newOrder.id, "preparando"), 500);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = mapOrder(payload.new);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings", filter: "key=eq.auto_accept_orders" }, (payload) => {
        autoAcceptRef.current = (payload.new as any)?.value === "true";
      })
      .subscribe();
    channelRef.current = channel;
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (ords) setOrders(ords.map(mapOrder));

      const { data: settings } = await supabase
        .from("store_settings")
        .select("*")
        .eq("key", "auto_accept_orders")
        .maybeSingle();
      if (settings) autoAcceptRef.current = (settings as any).value === "true";
    } catch (err) {
      console.error("[AdminContext] Failed to load orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    subscribeRealtime();

    const appStateListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) subscribeRealtime();
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      appStateListener.then((l) => l.remove());
    };
  }, [loadOrders, subscribeRealtime]);

  const addProduct = useCallback((p: Product) => {
    setProducts((prev) => [...prev, p]);
    supabase.from("products").insert({
      id: p.id, name: p.name, price: p.price, image: p.image,
      category_id: p.categoryId, description: p.description, unit: p.unit, stock: p.stock,
      promo_price: p.promoPrice ?? null, show_in_offers: p.showInOffers ?? false,
      wholesale_price: p.wholesalePrice ?? null, wholesale_min_qty: p.wholesaleMinQty ?? null,
      wholesale_active: p.wholesaleActive ?? false,
    }).then(({ error }) => {
      if (error) console.error("[AdminContext] addProduct:", error.message);
    });
  }, [setProducts]);

  const updateProduct = useCallback((p: Product) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    supabase.from("products").update({
      name: p.name, price: p.price, image: p.image,
      category_id: p.categoryId, description: p.description, unit: p.unit, stock: p.stock,
      promo_price: p.promoPrice ?? null, show_in_offers: p.showInOffers ?? false,
      wholesale_price: p.wholesalePrice ?? null, wholesale_min_qty: p.wholesaleMinQty ?? null,
      wholesale_active: p.wholesaleActive ?? false,
    }).eq("id", p.id).then(({ error }) => {
      if (error) console.error("[AdminContext] updateProduct:", error.message);
    });
  }, [setProducts]);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((x) => x.id !== id));
    supabase.from("products").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[AdminContext] deleteProduct:", error.message);
    });
  }, [setProducts]);

  const addCategory = useCallback((c: Category) => {
    setCategories((prev) => [...prev, c]);
    supabase.from("categories").insert({ id: c.id, name: c.name, icon: c.icon }).then(({ error }) => {
      if (error) console.error("[AdminContext] addCategory:", error.message);
    });
  }, [setCategories]);

  const updateCategory = useCallback((c: Category) => {
    setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    supabase.from("categories").update({ name: c.name, icon: c.icon }).eq("id", c.id).then(({ error }) => {
      if (error) console.error("[AdminContext] updateCategory:", error.message);
    });
  }, [setCategories]);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((x) => x.id !== id));
    supabase.from("categories").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[AdminContext] deleteCategory:", error.message);
    });
  }, [setCategories]);

  const addCombo = useCallback((c: Combo) => {
    setCombos((prev) => [...prev, c]);
    supabase.from("combos").insert({
      id: c.id, name: c.name, description: c.description,
      discount_percent: c.discountPercent, image: c.image, product_ids: c.productIds,
    }).then(({ error }) => {
      if (error) console.error("[AdminContext] addCombo:", error.message);
    });
  }, [setCombos]);

  const updateCombo = useCallback((c: Combo) => {
    setCombos((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    supabase.from("combos").update({
      name: c.name, description: c.description,
      discount_percent: c.discountPercent, image: c.image, product_ids: c.productIds,
    }).eq("id", c.id).then(({ error }) => {
      if (error) console.error("[AdminContext] updateCombo:", error.message);
    });
  }, [setCombos]);

  const deleteCombo = useCallback((id: string) => {
    setCombos((prev) => prev.filter((x) => x.id !== id));
    supabase.from("combos").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[AdminContext] deleteCombo:", error.message);
    });
  }, [setCombos]);

  const updateOrderStatus = useCallback((id: string, status: Order["status"]) => {
    // Permite mudança livre de status - admin controla tudo
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    supabase.from("orders").update({ status }).eq("id", id).then(({ error }) => {
      if (error) {
        console.error("[AdminContext] updateOrderStatus:", error.message);
        toastRef.current({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  }, []);

  const updateOrderPaid = useCallback((id: string, paid: boolean) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paid, paidAt: paid ? new Date().toISOString() : undefined } : o)));
    // Quando paid=true, o trigger do banco muda status para 'confirmado' e baixa estoque
    // Quando paid=false (cancelar), o trigger devolve estoque
    supabase.from("orders").update({ paid }).eq("id", id).then(({ error }) => {
      if (error) console.error("[AdminContext] updateOrderPaid:", error.message);
      // Recarregar pedido para pegar status e paid_at atualizados
      supabase.from("orders").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setOrders((prev) => prev.map((o) => (o.id === id ? mapOrder(data) : o)));
        }
      });
    });
  }, []);

  const addFreightRange = useCallback((r: FreightRange) => {
    setFreightRanges((prev) => [...prev, r]);
    supabase.from("freight_ranges").insert({ id: r.id, min_km: r.minKm, max_km: r.maxKm, price: r.price }).then(({ error }) => {
      if (error) console.error("[AdminContext] addFreightRange:", error.message);
    });
  }, [setFreightRanges]);

  const updateFreightRange = useCallback((r: FreightRange) => {
    setFreightRanges((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    supabase.from("freight_ranges").update({ min_km: r.minKm, max_km: r.maxKm, price: r.price }).eq("id", r.id).then(({ error }) => {
      if (error) console.error("[AdminContext] updateFreightRange:", error.message);
    });
  }, [setFreightRanges]);

  const deleteFreightRange = useCallback((id: string) => {
    setFreightRanges((prev) => prev.filter((x) => x.id !== id));
    supabase.from("freight_ranges").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[AdminContext] deleteFreightRange:", error.message);
    });
  }, [setFreightRanges]);

  const addDiscountRule = useCallback((r: DiscountRule) => {
    setDiscountRules((prev) => [...prev, r]);
    supabase.from("discount_rules").insert({
      id: r.id, name: r.name, description: r.description,
      discount_percent: r.discountPercent, rule_type: r.ruleType,
      min_orders: r.minOrders, active: r.active,
      min_order_value: r.minOrderValue, max_distance_km: r.maxDistanceKm,
    }).then(({ error }) => {
      if (error) console.error("[AdminContext] addDiscountRule:", error.message);
    });
  }, [setDiscountRules]);

  const updateDiscountRule = useCallback((r: DiscountRule) => {
    setDiscountRules((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    supabase.from("discount_rules").update({
      name: r.name, description: r.description,
      discount_percent: r.discountPercent, rule_type: r.ruleType,
      min_orders: r.minOrders, active: r.active,
      min_order_value: r.minOrderValue, max_distance_km: r.maxDistanceKm,
    }).eq("id", r.id).then(({ error }) => {
      if (error) console.error("[AdminContext] updateDiscountRule:", error.message);
    });
  }, [setDiscountRules]);

  const deleteDiscountRule = useCallback((id: string) => {
    setDiscountRules((prev) => prev.filter((x) => x.id !== id));
    supabase.from("discount_rules").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[AdminContext] deleteDiscountRule:", error.message);
    });
  }, [setDiscountRules]);

  return (
    <AdminContext.Provider
      value={{
        products, categories, combos, orders, freightRanges, discountRules,
        storeCep, setStoreCep,
        addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory,
        addCombo, updateCombo, deleteCombo,
        updateOrderStatus,
        addFreightRange, updateFreightRange, deleteFreightRange,
        calculateFreight,
        addDiscountRule, updateDiscountRule, deleteDiscountRule,
        getApplicableDiscount, getFreightDiscount,
        lowStockProducts, loading: loading || ordersLoading, loadError, reloadData, setOnNewOrder,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export type { Order };
export { type DiscountRule } from "@/contexts/StoreContext";
