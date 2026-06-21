import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Package, User, Phone, MapPin, Loader2, Circle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OrderItem {
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  payment_method: string;
  paid: boolean;
  paid_at: string | null;
  delivery_code: string | null;
  delivery_status: string | null;
  delivered_by: string | null;
  delivered_at: string | null;
  delivered_items: OrderItem[] | null;
  created_at: string;
}

export default function EntregaConfirmar() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"partial" | "full">("full");

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) {
      navigate("/");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !data) {
      toast({ title: "Pedido não encontrado", variant: "destructive" });
      navigate("/");
      return;
    }

    setOrder(data);

    // Se já tem itens entregues, marca eles como selecionados
    if (data.delivered_items && data.delivered_items.length > 0) {
      const deliveredIds = new Set(
        data.delivered_items.map((item: OrderItem) => item.productId || item.name || "")
      );
      setSelectedItems(deliveredIds);
    }

    setLoading(false);
  };

  const toggleItem = (itemKey: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const getItemKey = (item: OrderItem, index: number) => {
    return item.productId || item.productName || item.name || `item-${index}`;
  };

  const isItemDelivered = (itemKey: string) => {
    if (!order?.delivered_items) return false;
    return order.delivered_items.some(
      (item: OrderItem) => (item.productId || item.productName || item.name) === itemKey
    );
  };

  const handleConfirmPartial = async () => {
    if (!order || selectedItems.size === 0) return;
    setConfirming(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Faça login para confirmar", variant: "destructive" });
      navigate("/login");
      return;
    }

    // Admin sempre pode confirmar, sem precisar ser delivery_user
    // Se não for admin, verifica se é delivery_user
    let deliveryUserId: string | null = null;

    if (isAdmin) {
      // Admin pode confirmar sem ser vinculado
      deliveryUserId = null;
    } else {
      const { data: deliveryUser, error: deliveryError } = await supabase
        .from("delivery_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .single();

      if (deliveryError || !deliveryUser) {
        toast({ title: "Acesso negado", description: "Você não tem permissão para confirmar entregas.", variant: "destructive" });
        setConfirming(false);
        return;
      }
      deliveryUserId = deliveryUser.id;
    }

    // Acumula os itens entregues
    const itemsToDeliver = order.items.filter((item) => selectedItems.has(getItemKey(item, order.items.indexOf(item))));

    // Combina com itens já entregues
    const existingDelivered = order.delivered_items || [];
    const existingKeys = new Set(
      existingDelivered.map((item: OrderItem) => item.productId || item.productName || item.name)
    );
    const newItems = itemsToDeliver.filter(
      (item) => !existingKeys.has(getItemKey(item, order.items.indexOf(item)))
    );
    const allDelivered = [...existingDelivered, ...newItems];

    // Verifica se todos os itens foram entregues
    const allItemsDelivered = order.items.every((item) =>
      allDelivered.some((d) => (d.productId || d.productName || d.name) === getItemKey(item, order.items.indexOf(item)))
    );

    const newStatus = allItemsDelivered ? "entregue" : order.status;
    const newDeliveryStatus = allItemsDelivered ? "delivered" : "partial";

    const updateData: any = {
      status: newStatus,
      delivery_status: newDeliveryStatus,
      delivered_at: allItemsDelivered ? new Date().toISOString() : order.delivered_at,
      delivered_items: allDelivered,
    };

    // Só seta delivered_by se houver um delivery_user_id
    if (deliveryUserId) {
      updateData.delivered_by = deliveryUserId;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      toast({ title: "Erro ao confirmar", description: updateError.message, variant: "destructive" });
    } else {
      if (allItemsDelivered) {
        toast({ title: "Entrega completa!", description: `Pedido #${order.id.slice(0, 8).toUpperCase()} entregue.` });
      } else {
        toast({ title: "Entrega parcial!", description: `${selectedItems.size} item(s) marcado(s) como entregue.` });
      }
      fetchOrder();
    }

    setConfirming(false);
  };

  const handleConfirmFull = async () => {
    if (!order) return;
    setConfirming(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Faça login para confirmar", variant: "destructive" });
      navigate("/login");
      return;
    }

    // Admin sempre pode confirmar
    let deliveryUserId: string | null = null;

    if (isAdmin) {
      deliveryUserId = null;
    } else {
      const { data: deliveryUser, error: deliveryError } = await supabase
        .from("delivery_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .single();

      if (deliveryError || !deliveryUser) {
        toast({ title: "Acesso negado", description: "Você não tem permissão para confirmar entregas.", variant: "destructive" });
        setConfirming(false);
        return;
      }
      deliveryUserId = deliveryUser.id;
    }

    const updateData: any = {
      status: "entregue",
      delivery_status: "delivered",
      delivered_at: new Date().toISOString(),
      delivered_items: order.items,
    };

    if (deliveryUserId) {
      updateData.delivered_by = deliveryUserId;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      toast({ title: "Erro ao confirmar", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Entrega completa!", description: `Pedido #${order.id.slice(0, 8).toUpperCase()} entregue.` });
      fetchOrder();
    }

    setConfirming(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeliveryStatusBadge = () => {
    if (!order) return null;
    switch (order.delivery_status) {
      case "delivered":
        return <Badge className="bg-green-600">✓ Entregue</Badge>;
      case "partial":
        return <Badge className="bg-amber-500">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-bold">Pedido não encontrado</h2>
            <p className="text-muted-foreground mt-2">Este pedido pode não existir ou já foi entregue.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Voltar à loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFullyDelivered = order.status === "entregue" || order.delivery_status === "delivered";
  const hasPartialDelivery = order.delivery_status === "partial" ||
    (order.delivered_items && order.delivered_items.length > 0 && !isFullyDelivered);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-bold text-lg">Confirmar Entrega</h1>
          {order.delivery_code && (
            <p className="text-sm text-muted-foreground font-mono">
              Código: #{order.delivery_code}
            </p>
          )}
        </div>
      </header>

      {/* Status Badge */}
      <div className="container mx-auto px-4 py-4">
        {getDeliveryStatusBadge()}
      </div>

      {/* Order Details */}
      <main className="container mx-auto px-4 pb-8 space-y-4">
        {/* Cliente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium text-lg">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {order.customer_phone}
              </p>
            )}
            {order.customer_address && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {order.customer_address}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Itens com seleção para entrega parcial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Itens do Pedido ({order.items?.length || 0})</CardTitle>
            <CardDescription>
              {hasPartialDelivery && (
                <span className="text-amber-600 dark:text-amber-400">
                  {order.delivered_items?.length || 0} item(s) já entregue(s)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items?.map((item: OrderItem, idx: number) => {
              const itemKey = getItemKey(item, idx);
              const wasDelivered = isItemDelivered(itemKey);
              const isSelected = selectedItems.has(itemKey);

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    wasDelivered
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : isSelected
                      ? "bg-primary/5 border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  } ${isFullyDelivered ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    if (!isFullyDelivered && !wasDelivered) {
                      toggleItem(itemKey);
                    }
                  }}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    wasDelivered
                      ? "bg-green-600 border-green-600"
                      : isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  }`}>
                    {wasDelivered || isSelected ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : null}
                  </div>

                  <div className="flex-1">
                    <p className={`font-medium ${wasDelivered ? "line-through text-muted-foreground" : ""}`}>
                      {item.quantity}x {item.productName || item.name || "Item"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {((item.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {wasDelivered && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Entregue
                    </Badge>
                  )}
                </div>
              );
            })}

            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary text-lg">
                R$ {order.total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Confirmação */}
        {!isFullyDelivered ? (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-4 space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={mode === "full" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMode("full")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Entrega Completa
                </Button>
                <Button
                  variant={mode === "partial" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMode("partial")}
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Entrega Parcial
                </Button>
              </div>

              {mode === "partial" ? (
                <div>
                  <p className="text-center text-sm text-muted-foreground mb-3">
                    {selectedItems.size > 0
                      ? `${selectedItems.size} item(s) selecionado(s) para entrega`
                      : "Selecione os itens que está entregando"}
                  </p>
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600"
                    onClick={handleConfirmPartial}
                    disabled={confirming || selectedItems.size === 0}
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Confirmar {selectedItems.size > 0 ? `${selectedItems.size} Item(ns)` : "Itens Selecionados"}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-center text-sm text-muted-foreground mb-3">
                    Entregar todos os itens de uma vez
                  </p>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleConfirmFull}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Confirmar Entrega Completa
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500">
            <CardContent className="py-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-green-700 dark:text-green-400">
                Entrega Confirmada!
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {order.delivered_at
                  ? `Entregue em ${formatDate(order.delivered_at)} às ${formatTime(order.delivered_at)}`
                  : "Pedido entregue"}
              </p>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full" onClick={() => navigate("/admin/entregas")}>
          Ver todos os pedidos
        </Button>
      </main>
    </div>
  );
}
