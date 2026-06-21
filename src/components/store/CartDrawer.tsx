import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { LocalPixDialog } from "./LocalPixDialog";
import { useCart } from "@/contexts/CartContext";
import { useStore, type DiscountRule } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMesaSession, type MesaSession } from "@/lib/mesaSession";
import {
  Plus, Minus, Trash2, ShoppingBag, Loader2, Store,
  CreditCard, Banknote, Smartphone, Percent, ChevronLeft, ArrowRight, ShoppingCart, Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { haptOk, haptErr } from "@/lib/haptics";

type PaymentMethod = "dinheiro" | "pix" | "credito" | "debito";
type Step = "items" | "checkout";

export function CartDrawer() {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart, totalPrice, totalItems, appliedCombos, totalDiscount, wholesaleDiscount, finalPrice } = useCart();
  const { getApplicableDiscount } = useStore();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("items");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [mesaSession, setMesaSessionState] = useState<MesaSession | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // PIX payment dialog state
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);
  const [pixTotal, setPixTotal] = useState<number>(0);

  useEffect(() => {
    const session = getMesaSession();
    setMesaSessionState(session);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && user) {
      getApplicableDiscount(user.id).then(setAppliedDiscount);
    } else if (!user) {
      setAppliedDiscount(null);
    }
  }, [isOpen, user]);

  // Quando o carrinho fica vazio (depois de finalizar ou limpar), volta ao step inicial.
  useEffect(() => {
    if (items.length === 0) setStep("items");
  }, [items.length]);

  const userDiscountValue = appliedDiscount ? finalPrice * (appliedDiscount.discountPercent / 100) : 0;
  const grandTotal = finalPrice - userDiscountValue;

  const canSubmit = mesaSession !== null;

  const handleFinalize = async () => {
    if (!mesaSession || submitting) return;
    setSubmitting(true);

    const db = supabase as any;
    const orderId = crypto.randomUUID();

    try {
      // Monta o orderData com os campos básicos (sempre funcionam)
      const orderData: any = {
        id: orderId,
        customer_name: mesaSession.nome_cliente,
        customer_phone: null,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total: grandTotal,
        status: "pendente",
        payment_method: paymentMethod,
        user_id: null,
      };

      // Tenta adicionar colunas opcionais (caso a migration tenha sido aplicada)
      try {
        orderData.table_number = String(mesaSession.numero);
        orderData.mesa_device_id = mesaSession.device_id;
      } catch {
        // Colunas opcionais não existem
      }

      const { error } = await db.from("orders").insert(orderData);
      if (error) throw error;

      // Se for PIX, abre o dialog de pagamento
      if (paymentMethod === "pix") {
        setPixOrderId(orderId);
        setPixTotal(grandTotal);
        setPixDialogOpen(true);
      } else {
        const paymentLabel = paymentMethod === "credito"
          ? "Cartão de Crédito"
          : paymentMethod === "debito"
          ? "Cartão de Débito"
          : "Dinheiro";

        const message = `🍡 *Pedido #${orderId.slice(0, 8).toUpperCase()}*\n\n` +
          `*Mesa:* ${mesaSession.numero}\n` +
          `*Cliente:* ${mesaSession.nome_cliente}\n` +
          `*Itens:*\n${items.map((i) => `  - ${i.quantity}x ${i.product.name} (R$ ${(i.product.price * i.quantity).toFixed(2).replace(".", ",")})`).join("\n")}\n\n` +
          `*Total:* R$ ${grandTotal.toFixed(2).replace(".", ",")}\n` +
          `*Pagamento:* ${paymentLabel}\n\n` +
          `Pedido será entregue na mesa ${mesaSession.numero}.`;

        try {
          await db.functions.invoke("send-whatsapp-notification", {
            body: { orderId, message, customerPhone: "" },
          });
        } catch (e) {
          console.error("WhatsApp notification failed:", e);
        }

        haptOk();
        toast({
          title: "✅ Pedido enviado!",
          description: `Pedido para mesa ${mesaSession.numero}.`,
          action: (
            <button
              onClick={() => navigate("/meus-pedidos-mesa")}
              className="text-sm font-medium underline"
            >
              Ver meus pedidos
            </button>
          ),
        });
        clearCart();
        setStep("items");
        setIsOpen(false);
      }
    } catch (err: any) {
      console.error("Error creating order:", err);
      haptErr();
      toast({
        title: "Erro",
        description: err.message || "Não foi possível enviar o pedido.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePixConfirm = async () => {
    haptOk();
    toast({ title: "✅ Pedido enviado!", description: "Aguarde confirmação do pagamento." });
    clearCart();
    setStep("items");
    setPixDialogOpen(false);
    setIsOpen(false);
  };

  const handlePixClose = () => {
    clearCart();
    setStep("items");
    setPixDialogOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="max-h-[95vh]">
        <div className="flex flex-col h-full max-h-[95vh]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step === "checkout" && (
                <Button variant="ghost" size="icon" onClick={() => setStep("items")} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <DrawerTitle className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {step === "items" ? "Carrinho" : "Finalizar Pedido"}
              </DrawerTitle>
              {step === "items" && items.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                  {totalItems}
                </span>
              )}
            </div>
          </div>

          <DrawerDescription className="sr-only">
            {step === "items" ? "Itens do carrinho" : "Finalização do pedido"}
          </DrawerDescription>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {step === "items" ? (
              <>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <ShoppingBag className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Carrinho vazio</p>
                    <p className="text-sm">Adicione produtos para continuar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex gap-3 rounded-xl border border-border bg-background p-3"
                      >
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                              Sem foto
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-primary font-bold text-sm">
                            R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 ml-auto"
                              onClick={() => removeItem(item.product.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Dados da Mesa */}
                {mesaSession && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Pedido da mesa</p>
                    <p className="text-2xl font-bold text-primary">
                      🍽️ Mesa {mesaSession.numero}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cliente: <span className="font-medium text-foreground">{mesaSession.nome_cliente}</span>
                    </p>
                  </div>
                )}

                {/* Tipo de venda (local) */}
                <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Retirada no local
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Os produtos serão retirados diretamente no evento.
                  </p>
                </div>

                {/* Forma de pagamento */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Forma de pagamento</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("dinheiro")}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                        paymentMethod === "dinheiro"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <Banknote className={`h-5 w-5 ${paymentMethod === "dinheiro" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">Dinheiro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("pix")}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                        paymentMethod === "pix"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <Smartphone className={`h-5 w-5 ${paymentMethod === "pix" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">PIX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("credito")}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                        paymentMethod === "credito"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <CreditCard className={`h-5 w-5 ${paymentMethod === "credito" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">Crédito</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("debito")}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                        paymentMethod === "debito"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <CreditCard className={`h-5 w-5 ${paymentMethod === "debito" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">Débito</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border p-4 space-y-3 bg-background">
              {step === "items" ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descontos</span>
                        <span>- R$ {totalDiscount.toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    {userDiscountValue > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {appliedDiscount?.name}
                        </span>
                        <span>- R$ {userDiscountValue.toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">R$ {grandTotal.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => setStep("checkout")}
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {grandTotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleFinalize}
                    disabled={!canSubmit || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Finalizar Pedido
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DrawerContent>

      {/* PIX Dialog */}
      <LocalPixDialog
        open={pixDialogOpen}
        onClose={handlePixClose}
        orderId={pixOrderId ?? undefined}
        amount={pixTotal}
        onConfirm={handlePixConfirm}
      />
    </Drawer>
  );
}
