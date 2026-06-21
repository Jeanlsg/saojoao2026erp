import { useState, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { useStore } from "@/contexts/StoreContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LocalPixDialog } from "@/components/store/LocalPixDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Banknote,
  Check,
  User,
  X,
  Printer,
} from "lucide-react";

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
}

export default function PDV() {
  const { products, categories } = useAdmin();
  const { updateOrderPaid } = useAdmin();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customerName, setCustomerName] = useState("");
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "dinheiro" | null>(null);
  const [changeAmount, setChangeAmount] = useState("");
  const [lastSale, setLastSale] = useState<{ name: string; total: number } | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeValue, setChangeValue] = useState(0);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products.filter((p) => p.stock > 0);
    return products.filter((p) => p.categoryId === selectedCategory && p.stock > 0);
  }, [products, selectedCategory]);

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.promoPrice ?? product.price,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.productId !== productId);
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setPaymentMethod(null);
    setChangeAmount("");
    setLastSale(null);
  };

  const getChange = () => {
    const paid = parseFloat(changeAmount) || 0;
    return paid - total;
  };

  const handleCobrar = (method: "pix" | "dinheiro") => {
    if (cart.length === 0) return;
    setPaymentMethod(method);
    if (method === "pix") {
      finalizeSale();
    }
  };

  const finalizeSale = async () => {
    if (cart.length === 0) return;

    const items = cart.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
    }));

    try {
      const { data, error } = await import("@/integrations/supabase/client").then(
        (m) => m.supabase
      );

      const { data: orderData, error: orderError } = await data
        .from("orders")
        .insert({
          customer_name: customerName || "Balcão",
          customer_phone: null,
          items,
          total,
          status: paymentMethod === "pix" ? "confirmado" : "pendente",
          payment_method: paymentMethod === "pix" ? "pix" : "dinheiro",
          paid: paymentMethod === "pix",
          paid_at: paymentMethod === "pix" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setCurrentOrderId(orderData.id);

      if (paymentMethod === "pix") {
        setPixDialogOpen(true);
      }
    } catch (err) {
      console.error("[PDV] Erro ao finalizar venda:", err);
    }
  };

  const handlePixConfirm = () => {
    if (currentOrderId) {
      updateOrderPaid(currentOrderId, true);
      setLastSale({ name: customerName || "Balcão", total });
      setShowChangeModal(false);
    }
    setPixDialogOpen(false);
    setCart([]);
    setCustomerName("");
    setPaymentMethod(null);
    setCurrentOrderId(null);
  };

  const handleDinheiroConfirm = () => {
    const paid = parseFloat(changeAmount) || 0;
    if (paid < total) return;

    setChangeValue(paid - total);
    setShowChangeModal(true);
  };

  const handleFinishSale = () => {
    if (currentOrderId) {
      updateOrderPaid(currentOrderId, true);
      setLastSale({ name: customerName || "Balcão", total });
    }
    setShowChangeModal(false);
    setCart([]);
    setCustomerName("");
    setPaymentMethod(null);
    setChangeAmount("");
    setCurrentOrderId(null);
    setLastSale(null);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
        {/* Grid de Produtos */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Categorias */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-wrap">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Produtos */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-center p-3 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all active:scale-95 text-left"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-sm text-center line-clamp-2 w-full">
                    {product.name}
                  </span>
                  <span className="text-primary font-bold mt-1">
                    R$ {product.promoPrice ?? product.price}
                  </span>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {product.stock} un
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Carrinho / Caixa */}
        <div className="w-full lg:w-96 flex flex-col bg-card rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Caixa</span>
            {cart.length > 0 && (
              <Badge className="ml-auto">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>
            )}
          </div>

          {/* Nome do Cliente */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do cliente (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Itens do Carrinho */}
          <ScrollArea className="flex-1 p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhum item</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 p-2 bg-background rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {item.price.toFixed(2).replace(".", ",")} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          const p = products.find((pr) => pr.id === item.productId);
                          if (p) addToCart(p);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold w-16 text-right">
                      R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Total e Ações */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {paymentMethod === "dinheiro" && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <label className="text-sm font-medium">Valor recebido</label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  className="text-lg font-bold"
                />
                {parseFloat(changeAmount) >= total && (
                  <p className="text-sm text-green-600 font-medium">
                    Troco: R$ {getChange().toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => handleCobrar("pix")}
                disabled={cart.length === 0}
              >
                <QrCode className="h-4 w-4" />
                PIX
              </Button>
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => handleCobrar("dinheiro")}
                disabled={cart.length === 0}
              >
                <Banknote className="h-4 w-4" />
                Dinheiro
              </Button>
            </div>

            {paymentMethod === "dinheiro" && parseFloat(changeAmount) >= total && (
              <Button className="w-full gap-1" onClick={handleDinheiroConfirm}>
                <Check className="h-4 w-4" />
                Confirmar Pagamento
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full gap-1 text-muted-foreground"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog PIX */}
      <LocalPixDialog
        open={pixDialogOpen}
        onClose={() => {
          setPixDialogOpen(false);
          setCart([]);
          setCustomerName("");
          setPaymentMethod(null);
        }}
        orderId={currentOrderId}
        amount={total}
        onConfirm={handlePixConfirm}
      />

      {/* Modal de Troco */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 w-80 text-center space-y-4">
            <Printer className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-bold">Venda Concluída!</h2>
            <p className="text-muted-foreground">
              Troco: <span className="font-bold text-2xl text-primary">R$ {changeValue.toFixed(2).replace(".", ",")}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cliente: {customerName || "Balcão"}
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button className="flex-1 gap-1" onClick={handleFinishSale}>
                <Check className="h-4 w-4" />
                Novo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de venda sem troco */}
      {lastSale && !showChangeModal && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6" />
            <div>
              <p className="font-bold">Venda realizada!</p>
              <p className="text-sm opacity-90">
                {lastSale.name} — R$ {lastSale.total.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 ml-2"
              onClick={() => setLastSale(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
