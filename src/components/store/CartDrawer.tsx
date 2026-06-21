import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LocalPixDialog } from "./LocalPixDialog";
import { useCart } from "@/contexts/CartContext";
import { useStore, type DiscountRule } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Minus, Trash2, ShoppingBag, MapPin, Loader2, Clock, Store, Truck,
  CreditCard, Banknote, Smartphone, Percent, ChevronLeft, ArrowRight, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCep } from "@/lib/geocoding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { haptOk, haptErr } from "@/lib/haptics";

type DeliveryMethod = "delivery" | "pickup" | null;
type PaymentMethod = "dinheiro" | "pix" | "credito" | "debito";
type Step = "items" | "checkout";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart, totalPrice, totalItems, appliedCombos, totalDiscount, wholesaleDiscount, finalPrice } = useCart();
  const { storeCep, calculateFreight, getApplicableDiscount, getFreightDiscount, whatsappNumber } = useStore();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("items");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [customerCep, setCustomerCep] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerComplement, setCustomerComplement] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [freightPrice, setFreightPrice] = useState<number | null>(null);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // PIX payment dialog state
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);
  const [pixTotal, setPixTotal] = useState<number>(0);

  useEffect(() => {
    if (isOpen && user) {
      getApplicableDiscount(user.id).then(setAppliedDiscount);
      if (profile?.full_name && !customerName) setCustomerName(profile.full_name);
      if (profile?.phone && !customerPhone) setCustomerPhone(profile.phone);
    } else if (!user) {
      setAppliedDiscount(null);
    }
  }, [isOpen, user, profile]);

  // Quando o carrinho fica vazio (depois de finalizar ou limpar), volta ao step inicial.
  useEffect(() => {
    if (items.length === 0) setStep("items");
  }, [items.length]);

  const handleCalculateFreight = async () => {
    const cleanCep = customerCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setFreightError("CEP inválido. Digite 8 dígitos.");
      return;
    }

    setFreightLoading(true);
    setFreightError("");
    setFreightPrice(null);

    try {
      const { data, error } = await supabase.functions.invoke("calculate-route", {
        body: { storeCep: storeCep.replace(/\D/g, ""), customerCep: cleanCep },
      });

      if (error) throw error;
      if (data.error) {
        setFreightError(data.error);
        return;
      }

      setDistanceKm(data.distanceKm);
      setDurationMin(data.durationMin);
      setCustomerAddress(data.customerAddress);

      const price = calculateFreight(data.distanceKm);
      console.log(`[Frete] distância retornada: ${data.distanceKm} km | preço calculado: ${price}`);
      if (price === null) {
        setFreightError(
          `Endereço a ${data.distanceKm} km — fora das faixas de entrega cadastradas. Verifique as faixas em Admin → Frete ou tente retirada na loja.`
        );
        setFreightPrice(null);
        return;
      }
      setFreightPrice(price);
    } catch {
      setFreightError("Erro ao calcular o frete. Tente novamente.");
    } finally {
      setFreightLoading(false);
    }
  };

  const resetDelivery = () => {
    setDeliveryMethod(null);
    setCustomerCep("");
    setCustomerNumber("");
    setCustomerComplement("");
    setCustomerReference("");
    setFreightPrice(null);
    setFreightError("");
    setCustomerAddress("");
    setDistanceKm(null);
    setDurationMin(null);
    setPaymentMethod("dinheiro");
    setCustomerName("");
    setCustomerPhone("");
  };

  const userDiscountValue = appliedDiscount ? finalPrice * (appliedDiscount.discountPercent / 100) : 0;
  const priceAfterUserDiscount = finalPrice - userDiscountValue;
  const rawFreightValue = deliveryMethod === "delivery" && freightPrice !== null ? freightPrice : 0;

  const freightDiscountRule = deliveryMethod === "delivery" && freightPrice !== null
    ? getFreightDiscount(priceAfterUserDiscount, distanceKm)
    : null;
  const freightDiscountValue = freightDiscountRule
    ? rawFreightValue * (freightDiscountRule.discountPercent / 100)
    : 0;
  const freightValue = rawFreightValue - freightDiscountValue;
  const grandTotal = priceAfterUserDiscount + freightValue;

  const fullDeliveryAddress = customerAddress
    ? `${customerAddress}${customerNumber ? `, Nº ${customerNumber}` : ""}${customerComplement ? ` - ${customerComplement}` : ""}`
    : "";

  const canSubmit = customerName.trim() !== "" && deliveryMethod !== null
    && !(deliveryMethod === "delivery" && (freightPrice === null || !customerNumber));

  const handleFinalize = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const db = supabase as any;
    const orderId = crypto.randomUUID();

    try {
      const orderData: any = {
        id: orderId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total: grandTotal,
        status: "pendente",
        payment_method: paymentMethod,
        user_id: user?.id || null,
      };

      if (deliveryMethod) {
        orderData.delivery = {
          method: deliveryMethod,
          address: customerAddress || undefined,
          number: customerNumber || undefined,
          complement: customerComplement || undefined,
          reference: customerReference || undefined,
          cep: customerCep.replace(/\D/g, "") || undefined,
          freightPrice: freightPrice ?? undefined,
          distanceKm: distanceKm ?? undefined,
          durationMin: durationMin ?? undefined,
        };
      }

      const { error } = await db.from("orders").insert(orderData);
      if (error) throw error;

      // Se for PIX, abrir dialog de pagamento com QR
      if (paymentMethod === "pix") {
        setPixOrderId(orderId);
        setPixTotal(grandTotal);
        setPixDialogOpen(true);
        // Não fecha o carrinho — usuário fica na tela de PIX
      } else {
        // Outros métodos (dinheiro, cartão): fluxo antigo com WhatsApp
        const itemsText = items.map((i) => `${i.quantity}x ${i.product.name}`).join("\n");
        const whatsMsg = encodeURIComponent(
          `🛒 *Novo Pedido #${orderId.slice(0, 8)}*\n\n` +
          `*Cliente:* ${customerName}\n` +
          (customerPhone ? `*Tel:* ${customerPhone}\n` : "") +
          `\n*Itens:*\n${itemsText}\n\n` +
          `*Pagamento:* ${paymentMethod}\n` +
          `*Total:* R$ ${grandTotal.toFixed(2).replace(".", ",")}\n` +
          (deliveryMethod === "delivery" ? `\n*Entrega:* ${fullDeliveryAddress}\n` : "\n*Retirada na loja*\n")
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${whatsMsg}`, "_blank");
      }

      haptOk();
      toast({ title: "✅ Pedido criado!", description: "Confirme o pagamento para finalizar." });
      clearCart();
      resetDelivery();
      setStep("items");
      setIsOpen(false);
    } catch (err) {
      console.error("Error creating order:", err);
      haptErr();
      toast({ title: "Erro", description: "Não foi possível enviar o pedido.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Drawer open={isOpen} onOpenChange={setIsOpen} shouldScaleBackground={false}>
      {/* Bottom sheet (HIG iOS): desliza de baixo p/ cima; arrastar p/ baixo fecha.
          h-[92vh] dá altura fixa p/ o fluxo de itens + checkout rolarem internamente.
          px-0: o conteúdo interno controla o padding. */}
      <DrawerContent className="flex h-[92vh] flex-col px-0 sm:mx-auto sm:max-w-md">
        <div className="p-4 border-b border-border space-y-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            {step === "checkout" ? (
              <button
                onClick={() => setStep("items")}
                className="flex items-center justify-center h-8 w-8 -ml-1 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Voltar para itens"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <ShoppingBag className="h-5 w-5 text-accent" />
            )}
            <span className="flex-1">
              {step === "items" ? `Carrinho (${totalItems})` : "Finalizar pedido"}
            </span>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {step === "items" ? "Itens do seu carrinho de compras" : "Endereço, pagamento e confirmação"}
          </DrawerDescription>

          {/* Step indicator */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <StepDot label="Itens" active={step === "items"} done={step !== "items"} />
              <div className={`h-0.5 flex-1 ${step === "checkout" ? "bg-accent" : "bg-border"}`} />
              <StepDot label="Entrega e pagamento" active={step === "checkout"} done={false} />
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-6">
            <ShoppingBag className="h-16 w-16 opacity-30" />
            <p className="text-sm">Seu carrinho está vazio</p>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Continuar comprando</Button>
          </div>
        ) : step === "items" ? (
          <ItemsStep
            items={items}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            totalPrice={totalPrice}
            appliedCombos={appliedCombos}
            totalDiscount={totalDiscount}
            finalPrice={finalPrice}
            onAddMore={() => setIsOpen(false)}
            onContinue={() => setStep("checkout")}
            onClear={() => { clearCart(); resetDelivery(); }}
          />
        ) : (
          <CheckoutStep
            customerName={customerName} setCustomerName={setCustomerName}
            customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
            paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
            deliveryMethod={deliveryMethod} setDeliveryMethod={setDeliveryMethod}
            customerCep={customerCep} setCustomerCep={setCustomerCep}
            customerNumber={customerNumber} setCustomerNumber={setCustomerNumber}
            customerComplement={customerComplement} setCustomerComplement={setCustomerComplement}
            customerReference={customerReference} setCustomerReference={setCustomerReference}
            customerAddress={customerAddress}
            distanceKm={distanceKm} durationMin={durationMin}
            freightLoading={freightLoading} freightError={freightError}
            freightPrice={freightPrice}
            handleCalculateFreight={handleCalculateFreight}
            setFreightPrice={setFreightPrice}
            setFreightError={setFreightError}
            setCustomerAddress={setCustomerAddress}
            storeCep={storeCep}
            totalPrice={totalPrice}
            appliedCombos={appliedCombos}
            appliedDiscount={appliedDiscount} userDiscountValue={userDiscountValue}
            freightDiscountRule={freightDiscountRule}
            rawFreightValue={rawFreightValue} freightValue={freightValue}
            grandTotal={grandTotal}
            canSubmit={canSubmit}
            submitting={submitting}
            handleFinalize={handleFinalize}
          />
        )}
      </DrawerContent>
    </Drawer>

    {/* Dialog de pagamento PIX local — renderizado fora do Drawer */}
    {pixOrderId && (
      <LocalPixDialog
        open={pixDialogOpen}
        onOpenChange={setPixDialogOpen}
        orderId={pixOrderId}
        total={pixTotal}
      />
    )}
    </>
  );
}

// =================================================================
// Sub-components
// =================================================================

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          active ? "bg-accent shadow-md" : done ? "bg-accent/60" : "bg-border"
        }`}
      />
      <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

interface ItemsStepProps {
  items: ReturnType<typeof useCart>["items"];
  updateQuantity: (id: string, q: number) => void;
  removeItem: (id: string) => void;
  totalPrice: number;
  appliedCombos: ReturnType<typeof useCart>["appliedCombos"];
  totalDiscount: number;
  finalPrice: number;
  onAddMore: () => void;
  onContinue: () => void;
  onClear: () => void;
}

function ItemsStep({
  items, updateQuantity, removeItem, totalPrice, appliedCombos, totalDiscount, finalPrice,
  onAddMore, onContinue, onClear,
}: ItemsStepProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div key={item.product.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
            <img src={item.product.image} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover" />
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground line-clamp-1 pr-2">{item.product.name}</span>
                <button onClick={() => removeItem(item.product.id)} className="relative text-muted-foreground hover:text-destructive before:absolute before:-inset-2 before:content-['']">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="relative flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground before:absolute before:-inset-2 before:content-['']"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="relative flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-md before:absolute before:-inset-2 before:content-['']"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-sm font-bold text-black">
                  R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={onAddMore}
          className="w-full rounded-xl h-11 border-dashed border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Adicionar mais itens
        </Button>
      </div>

      <div className="border-t border-border p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-sm font-medium text-foreground">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
          </div>
          {appliedCombos.length > 0 && appliedCombos.map((ac) => (
            <div key={ac.combo.id} className="flex justify-between items-center">
              <span className="text-sm text-accent">🎉 {ac.combo.name} (-{ac.combo.discountPercent}%)</span>
              <span className="text-sm font-medium text-accent">
                - R$ {ac.discount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          ))}
          {wholesaleDiscount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary">📦 Desconto atacado</span>
              <span className="text-sm font-medium text-primary">
                - R$ {wholesaleDiscount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-border">
            <span className="text-sm font-medium text-foreground">Total parcial</span>
            <span className="text-xl font-bold text-foreground">
              R$ {(totalPrice - totalDiscount).toFixed(2).replace(".", ",")}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Frete e descontos extras aparecem na próxima etapa.
          </p>
        </div>

        <Button
          className="w-full rounded-xl h-12 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
          onClick={onContinue}
        >
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full text-center text-xs text-muted-foreground hover:text-destructive">
              Limpar carrinho
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso remove todos os itens do seu carrinho. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

interface CheckoutStepProps {
  customerName: string; setCustomerName: (v: string) => void;
  customerPhone: string; setCustomerPhone: (v: string) => void;
  paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void;
  deliveryMethod: DeliveryMethod; setDeliveryMethod: (m: DeliveryMethod) => void;
  customerCep: string; setCustomerCep: (v: string) => void;
  customerNumber: string; setCustomerNumber: (v: string) => void;
  customerComplement: string; setCustomerComplement: (v: string) => void;
  customerReference: string; setCustomerReference: (v: string) => void;
  customerAddress: string;
  distanceKm: number | null; durationMin: number | null;
  freightLoading: boolean; freightError: string;
  freightPrice: number | null;
  handleCalculateFreight: () => void;
  setFreightPrice: (n: number | null) => void;
  setFreightError: (s: string) => void;
  setCustomerAddress: (s: string) => void;
  storeCep: string;
  totalPrice: number;
  appliedCombos: ReturnType<typeof useCart>["appliedCombos"];
  appliedDiscount: DiscountRule | null;
  userDiscountValue: number;
  freightDiscountRule: DiscountRule | null;
  rawFreightValue: number; freightValue: number;
  grandTotal: number;
  canSubmit: boolean; submitting: boolean;
  handleFinalize: () => void;
}

function CheckoutStep(props: CheckoutStepProps) {
  const {
    customerName, setCustomerName, customerPhone, setCustomerPhone,
    paymentMethod, setPaymentMethod, deliveryMethod, setDeliveryMethod,
    customerCep, setCustomerCep, customerNumber, setCustomerNumber,
    customerComplement, setCustomerComplement, customerReference, setCustomerReference,
    customerAddress, distanceKm, durationMin,
    freightLoading, freightError, freightPrice, handleCalculateFreight,
    setFreightPrice, setFreightError, setCustomerAddress,
    storeCep, totalPrice, appliedCombos, appliedDiscount, userDiscountValue,
    freightDiscountRule, rawFreightValue, freightValue, grandTotal,
    canSubmit, submitting, handleFinalize,
  } = props;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Customer Info */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">Seus dados</p>
          <div>
            <Label className="text-xs text-muted-foreground">Nome *</Label>
            <Input
              placeholder="Seu nome completo"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Telefone (WhatsApp)</Label>
            <Input
              placeholder="(67) 99999-9999"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Delivery method selection — vem antes do pagamento por afetar frete */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium text-foreground">Como deseja receber?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setDeliveryMethod("delivery"); setFreightPrice(null); }}
              className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all text-sm ${
                deliveryMethod === "delivery"
                  ? "border-accent bg-accent/10 text-accent font-semibold shadow-md"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              <Truck className="h-5 w-5" />
              Entrega
            </button>
            <button
              onClick={() => { setDeliveryMethod("pickup"); setFreightPrice(null); }}
              className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all text-sm ${
                deliveryMethod === "pickup"
                  ? "border-accent bg-accent/10 text-accent font-semibold shadow-md"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              <Store className="h-5 w-5" />
              Retirada
            </button>
          </div>

          {deliveryMethod === "delivery" && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Seu CEP"
                  value={customerCep}
                  onChange={(e) => {
                    setCustomerCep(formatCep(e.target.value));
                    setFreightPrice(null);
                    setFreightError("");
                    setCustomerAddress("");
                  }}
                  maxLength={9}
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleCalculateFreight}
                  disabled={freightLoading || customerCep.replace(/\D/g, "").length < 8}
                  className="h-9"
                >
                  {freightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>

              {freightError && (
                <p className="text-xs text-destructive">{freightError}</p>
              )}

              {customerAddress && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {customerAddress}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Número *</Label>
                      <Input
                        placeholder="Nº"
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Complemento</Label>
                      <Input
                        placeholder="Apto, bloco..."
                        value={customerComplement}
                        onChange={(e) => setCustomerComplement(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Referência</Label>
                    <Input
                      placeholder="Próximo a..."
                      value={customerReference}
                      onChange={(e) => setCustomerReference(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  {freightPrice !== null && (
                    <div className="rounded-lg bg-background p-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Distância: ~{distanceKm !== null && distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`}
                        {durationMin !== null && (
                          <span className="ml-2 inline-flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> ~{durationMin} min
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-bold text-accent">
                        Frete: {freightDiscountRule && freightValue <= 0
                          ? <><span className="line-through text-muted-foreground font-normal mr-1">R$ {rawFreightValue.toFixed(2).replace(".", ",")}</span> GRÁTIS</>
                          : freightDiscountRule
                            ? <><span className="line-through text-muted-foreground font-normal mr-1">R$ {rawFreightValue.toFixed(2).replace(".", ",")}</span> R$ {freightValue.toFixed(2).replace(".", ",")}</>
                            : <>R$ {rawFreightValue.toFixed(2).replace(".", ",")}</>
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {deliveryMethod === "pickup" && (
            <div className="rounded-lg bg-background p-3 space-y-1">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Store className="h-4 w-4 text-accent" />
                Retirar na loja
              </p>
              <p className="text-xs text-muted-foreground">
                Retire seu pedido na loja sem custo de frete.
              </p>
              {storeCep && (
                <p className="text-xs text-muted-foreground">
                  CEP da loja: {formatCep(storeCep)}
                </p>
              )}
              <p className="text-sm font-bold text-accent">Frete: Grátis</p>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium text-foreground">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "dinheiro", label: "Dinheiro", icon: Banknote },
              { value: "pix", label: "Pix", icon: Smartphone },
              { value: "credito", label: "Crédito", icon: CreditCard },
              { value: "debito", label: "Débito", icon: CreditCard },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all text-xs ${
                  paymentMethod === value
                    ? "border-accent bg-accent/10 text-accent font-semibold shadow-md"
                    : "border-border text-muted-foreground hover:border-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer totals */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-sm font-medium text-foreground">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
          </div>
          {appliedCombos.length > 0 && appliedCombos.map((ac) => (
            <div key={ac.combo.id} className="flex justify-between items-center">
              <span className="text-sm text-accent">🎉 {ac.combo.name} (-{ac.combo.discountPercent}%)</span>
              <span className="text-sm font-medium text-accent">
                - R$ {ac.discount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          ))}
          {wholesaleDiscount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary">📦 Desconto atacado</span>
              <span className="text-sm font-medium text-primary">
                - R$ {wholesaleDiscount.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
          {appliedDiscount && userDiscountValue > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-accent flex items-center gap-1">
                <Percent className="h-3 w-3" /> {appliedDiscount.name} (-{appliedDiscount.discountPercent}%)
              </span>
              <span className="text-sm font-medium text-accent">
                - R$ {userDiscountValue.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
          {deliveryMethod === "delivery" && freightPrice !== null && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Frete</span>
                <span className={`text-sm font-medium ${freightDiscountRule ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  R$ {rawFreightValue.toFixed(2).replace(".", ",")}
                </span>
              </div>
              {freightDiscountRule && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-accent flex items-center gap-1">
                    🚚 {freightDiscountRule.name} (-{freightDiscountRule.discountPercent}%)
                  </span>
                  <span className="text-sm font-bold text-accent">
                    {freightValue <= 0 ? "GRÁTIS" : `R$ ${freightValue.toFixed(2).replace(".", ",")}`}
                  </span>
                </div>
              )}
            </>
          )}
          {deliveryMethod === "pickup" && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Frete</span>
              <span className="text-sm font-medium text-accent">Grátis</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-border">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">
              R$ {grandTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>
        <Button
          className="w-full rounded-xl h-12 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
          disabled={!canSubmit || submitting}
          onClick={handleFinalize}
        >
          {submitting
            ? "Enviando..."
            : !customerName.trim()
              ? "Informe seu nome"
              : deliveryMethod === null
                ? "Escolha a forma de recebimento"
                : deliveryMethod === "delivery" && freightPrice === null
                  ? "Calcule o frete para continuar"
                  : deliveryMethod === "delivery" && !customerNumber
                    ? "Informe o número do endereço"
                    : "Finalizar Pedido"}
        </Button>
      </div>
    </>
  );
}
