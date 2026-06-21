import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, CheckCircle2, Package, ChefHat, Users, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMesaSession } from "@/lib/mesaSession";
import { toast } from "@/hooks/use-toast";
import { haptOk, haptErr } from "@/lib/haptics";

interface Order {
  id: string;
  customer_name: string;
  table_number: string | null;
  items: any[];
  total: number;
  status: string;
  payment_method: string;
  paid: boolean;
  delivery_code: string | null;
  delivery_status: string | null;
  delivered_items: any[] | null;
  delivered_by: string | null;
  delivered_at: string | null;
  created_at: string;
}

const STAGES = [
  { key: "pendente", label: "Recebido", icon: Clock, color: "text-amber-500" },
  { key: "confirmado", label: "Confirmado", icon: Check, color: "text-blue-500" },
  { key: "preparando", label: "Preparando", icon: ChefHat, color: "text-purple-500" },
  { key: "entregue", label: "Entregue", icon: CheckCircle2, color: "text-green-600" },
];

export default function MeusPedidosMesa() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [mesa, setMesa] = useState(getMesaSession());

  useEffect(() => {
    if (!mesa) {
      navigate("/selecionar-mesa");
      return;
    }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!mesa) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("table_number", String(mesa.numero))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast({ title: "Erro ao carregar pedidos", variant: "destructive" });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const handleConfirmDelivery = async (orderId: string) => {
    if (!confirm("Confirma que recebeu este pedido? Esta ação não pode ser desfeita.")) {
      return;
    }
    setConfirming(orderId);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "entregue",
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      haptOk();
      toast({ title: "Entrega confirmada!", description: "Obrigado!" });
      fetchOrders();
    } catch (err: any) {
      haptErr();
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(null);
    }
  };

  const getStage = (order: Order) => {
    if (order.status === "cancelado") return null;
    if (order.status === "entregue" || order.delivery_status === "delivered") {
      return STAGES[3];
    }
    if (order.status === "preparando") {
      return STAGES[2];
    }
    if (order.status === "confirmado" && order.paid) {
      return STAGES[1];
    }
    return STAGES[0];
  };

  // Calcula a posição na fila de atendimento para um pedido
  // Considera apenas pedidos pendentes (não entregues) ordenados por created_at ASC
  const getQueuePosition = (orderId: string): { position: number; total: number } | null => {
    const pendingOrders = orders
      .filter((o) => o.status !== "entregue" && o.status !== "cancelado")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const index = pendingOrders.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    return {
      position: index + 1,
      total: pendingOrders.length,
    };
  };

  const getDeliveredItems = (order: Order): string[] => {
    if (!order.delivered_items) return [];
    return order.delivered_items.map((item: any) =>
      item.productId || item.productName || item.name || ""
    );
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!mesa) return null;

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-card shadow-md border-b">
        <div className="container py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-lg font-bold">Meus Pedidos</h1>
            <p className="text-xs text-muted-foreground">
              Mesa {mesa.numero} • {mesa.nome_cliente}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={fetchOrders}>
            ↻ Atualizar
          </Button>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum pedido ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Seus pedidos vão aparecer aqui
              </p>
              <Button className="mt-4" onClick={() => navigate("/cardapio")}>
                Fazer pedido
              </Button>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const stage = getStage(order);
            const isDelivered = order.status === "entregue" || order.delivery_status === "delivered";
            const isPartial = order.delivery_status === "partial";
            const deliveredKeys = new Set(getDeliveredItems(order));
            const StageIcon = stage?.icon || Package;
            const queuePosition = getQueuePosition(order.id);

            return (
              <Card key={order.id} className={isDelivered ? "opacity-75" : ""}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        R$ {Number(order.total).toFixed(2).replace(".", ",")}
                      </p>
                      {order.delivery_code && (
                        <Badge variant="outline" className="font-mono text-xs">
                          🔖 {order.delivery_code}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Posição na fila */}
                  {queuePosition && !isDelivered && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0">
                        <span className="text-base font-bold">#{queuePosition.position}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Sua posição na fila</p>
                        <p className="font-medium text-sm">
                          {queuePosition.position === 1
                            ? "Você é o próximo!"
                            : queuePosition.position <= 3
                            ? `Você está entre os primeiros`
                            : `Aguarde, sua vez está chegando`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {queuePosition.position}/{queuePosition.total}
                      </Badge>
                    </div>
                  )}

                  {/* Status */}
                  {stage && (
                    <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                      <StageIcon className={`h-5 w-5 ${stage.color}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">Status atual</p>
                        <p className="font-medium">{stage.label}</p>
                      </div>
                      {isPartial && (
                        <Badge variant="outline" className="ml-auto text-amber-600 border-amber-500">
                          Parcial
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="flex items-center justify-between gap-1">
                    {STAGES.map((s, i) => {
                      const isPast = isDelivered ||
                        (stage && STAGES.findIndex(st => st.key === stage.key) >= i);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`h-2 w-full rounded-full ${
                              isPast ? "bg-primary" : "bg-muted"
                            }`}
                          />
                          <span className={`text-[10px] ${isPast ? "text-foreground" : "text-muted-foreground"}`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5">
                    {order.items.map((item: any, idx: number) => {
                      const itemKey = item.productId || item.productName || item.name || `item-${idx}`;
                      const wasDelivered = deliveredKeys.has(itemKey);
                      return (
                        <div
                          key={idx}
                          className={`flex justify-between text-sm ${
                            wasDelivered ? "opacity-60 line-through" : ""
                          }`}
                        >
                          <span>
                            {item.quantity}x {item.productName || item.name || "Item"}
                            {wasDelivered && (
                              <Check className="inline h-3 w-3 ml-1 text-green-600" />
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            R$ {((item.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botão confirmar entrega (se não entregue e pago) */}
                  {!isDelivered && order.paid && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleConfirmDelivery(order.id)}
                      disabled={confirming === order.id}
                      variant="default"
                    >
                      <Check className="h-4 w-4" />
                      {confirming === order.id ? "Confirmando..." : "Confirmar Recebimento"}
                    </Button>
                  )}

                  {isDelivered && order.delivered_at && (
                    <div className="text-center text-xs text-green-600 font-medium py-1">
                      ✓ Entregue em {formatTime(order.delivered_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
