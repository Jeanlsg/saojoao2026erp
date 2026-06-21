import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Product, Combo } from "@/data/products";
import { useStore } from "@/contexts/StoreContext";
import { tapLight, haptSelect } from "@/lib/haptics";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AppliedCombo {
  combo: Combo;
  discount: number;
}

export interface ComboSuggestion {
  combo: Combo;
  missingProducts: Product[];
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  appliedCombos: AppliedCombo[];
  totalDiscount: number;
  wholesaleDiscount: number;
  finalPrice: number;
  comboSuggestion: ComboSuggestion | null;
  dismissComboSuggestion: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [comboSuggestion, setComboSuggestion] = useState<ComboSuggestion | null>(null);
  const { combos, products: allProducts } = useStore();

  const dismissComboSuggestion = useCallback(() => setComboSuggestion(null), []);

  /** Verifica se ao adicionar um produto, 2 itens de algum combo ficam no carrinho (mas não todos). */
  const checkComboSuggestion = useCallback((updatedItems: CartItem[]) => {
    const cartProductIds = updatedItems.map((i) => i.product.id);

    for (const combo of combos) {
      if (combo.productIds.length < 3) continue; // combo precisa ter pelo menos 3 itens para sugerir
      const presentIds = combo.productIds.filter((pid) => cartProductIds.includes(pid));
      const missingIds = combo.productIds.filter((pid) => !cartProductIds.includes(pid));

      // Sugerir quando tem exatamente 2+ presentes mas não todos
      if (presentIds.length >= 2 && missingIds.length > 0) {
        const missingProducts = missingIds
          .map((pid) => allProducts.find((p) => p.id === pid))
          .filter(Boolean) as Product[];
        if (missingProducts.length > 0) {
          setComboSuggestion({ combo, missingProducts });
          return;
        }
      }
    }
  }, [combos, allProducts]);

  const addItem = useCallback((product: Product) => {
    tapLight();
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updated = [...prev, { product, quantity: 1 }];
      }
      // Verificar sugestão de combo após atualizar
      setTimeout(() => checkComboSuggestion(updated), 0);
      return updated;
    });
  }, [checkComboSuggestion]);

  const removeItem = useCallback((productId: string) => {
    tapLight();
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    haptSelect();
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [items]);

  /** Calcula combos aplicados e quantas unidades de cada produto são "consumidas" pelo combo. */
  const appliedCombos = useMemo(() => {
    const result: AppliedCombo[] = [];
    const cartProductIds = items.map((i) => i.product.id);

    combos.forEach((combo) => {
      const allPresent = combo.productIds.every((pid) => cartProductIds.includes(pid));
      if (allPresent && combo.productIds.length > 0) {
        const comboOriginalPrice = combo.productIds.reduce((sum, pid) => {
          const product = allProducts.find((p) => p.id === pid) || items.find((i) => i.product.id === pid)?.product;
          return sum + (product?.price || 0);
        }, 0);
        const discount = comboOriginalPrice * (combo.discountPercent / 100);
        result.push({ combo, discount });
      }
    });

    return result;
  }, [items, combos, allProducts]);

  /** Mapa de quantas unidades de cada produto são consumidas por combos ativos. */
  const comboConsumedUnits = useMemo(() => {
    const consumed: Record<string, number> = {};
    appliedCombos.forEach(({ combo }) => {
      combo.productIds.forEach((pid) => {
        consumed[pid] = (consumed[pid] || 0) + 1;
      });
    });
    return consumed;
  }, [appliedCombos]);

  /** Calcula desconto de atacado considerando que unidades do combo não contam. */
  const wholesaleDiscount = useMemo(() => {
    let discount = 0;
    items.forEach((item) => {
      const p = item.product;
      if (!p.wholesaleActive || !p.wholesalePrice || !p.wholesaleMinQty) return;

      const consumedByCombo = comboConsumedUnits[p.id] || 0;
      const availableForWholesale = item.quantity - consumedByCombo;

      if (availableForWholesale >= p.wholesaleMinQty) {
        // Desconto = diferença entre preço normal e atacado × unidades elegíveis
        const savings = (p.price - p.wholesalePrice) * availableForWholesale;
        discount += savings;
      }
    });
    return discount;
  }, [items, comboConsumedUnits]);

  const totalDiscount = useMemo(() =>
    appliedCombos.reduce((sum, ac) => sum + ac.discount, 0) + wholesaleDiscount,
    [appliedCombos, wholesaleDiscount]
  );

  const finalPrice = useMemo(() => Math.max(0, totalPrice - totalDiscount), [totalPrice, totalDiscount]);

  return (
    <CartContext.Provider
      value={{
        items, isOpen, setIsOpen, addItem, removeItem, updateQuantity, clearCart,
        totalItems, totalPrice, appliedCombos, totalDiscount, wholesaleDiscount, finalPrice,
        comboSuggestion, dismissComboSuggestion,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
