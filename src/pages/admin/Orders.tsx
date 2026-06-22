import { useEffect, useState } from "react";
import { useAdmin, Order } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Settings as SettingsIcon, Package, QrCode, Check, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { DeliveryDialog } from "@/components/admin/DeliveryDialog";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<Order["status"], string> = {
  pendente: "bg-primary/20 text-primary",
  preparando: "bg-accent/20 text-accent",
  entregue: "bg-accent/30 text-accent",
  cancelado: "bg-destructive/20 text-destructive",
};

const paymentLabels: Record<string, string> = {
  dinheiro: "💵 Dinheiro",
  pix: "📱 Pix",
  credito: "💳 Crédito",
  debito: "💳 Débito",
};

interface DeliveryOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  items: any[];
  total: number;
  status: string;
  paid: boolean;
  delivery_code: string | null;
  delivery_status: string | null;
  delivered_items: any[] | null;
  delivered_by: string | null;
  delivered_at: string | null;
}

export default function Orders() {
  const { orders, updateOrderStatus, setOnNewOrder } = useAdmin();
  const { toast } = useToast();
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<DeliveryOrder | null>(null);

  // Register new order callback
  useEffect(() => {
    setOnNewOrder((order: Order) => {
      setNewOrderIds((prev) => new Set(prev).add(order.id));
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 5000);

      const valueStr = `R$ ${order.total.toFixed(2).replace(".", ",")}`;
      const customer = order.customerName || "Cliente";

      toast({
        title: "🔔 Novo Pedido!",
        description: `${customer} - ${valueStr}`,
      });
    });

    return () => setOnNewOrder(null);
  }, [toast, setOnNewOrder]);

  const handleOpenDelivery = async (orderId: string) => {
    // Seleciona apenas as colunas básicas primeiro (sempre existem)
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, items, total, status, paid, delivered_by, delivered_at")
      .eq("id", orderId)
      .single();

    if (error || !data) {
      toast({ title: "Erro ao carregar pedido", variant: "destructive" });
      return;
    }

    // Tenta carregar colunas opcionais de entrega (podem não existir se a migration não foi aplicada)
    let deliveryCode: string | null = null;
    let deliveryStatus: string | null = null;
    let deliveredItems: any[] | null = null;

    try {
      const { data: extra } = await supabase
        .from("orders")
        .select("delivery_code, delivery_status, delivered_items")
        .eq("id", orderId)
        .single();

      if (extra) {
        deliveryCode = extra.delivery_code || null;
        deliveryStatus = extra.delivery_status || null;
        deliveredItems = extra.delivered_items || null;
      }
    } catch {
      // Colunas opcionais não existem ainda, ignora
    }

    setSelectedDeliveryOrder({
      ...(data as DeliveryOrder),
      delivery_code: deliveryCode,
      delivery_status: deliveryStatus,
      delivered_items: deliveredItems,
    });
    setDeliveryDialogOpen(true);
  };

  const handleDeliveryUpdated = () => {
    // Atualização em tempo real via Realtime do AdminContext
    // Não recarrega a página para manter o admin na aba atual
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pedidos</h2>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/admin/configuracoes" title="Notificações">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Bell className="h-12 w-12 opacity-30" />
          <p>Nenhum pedido ainda. Os novos pedidos aparecerão aqui em tempo real.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 sm:hidden">
            {orders.map((order) => {
              const dateObj = new Date(order.createdAt);
              const fmtDate = dateObj.toLocaleDateString("pt-BR");
              const fmtTime = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const deliveredCount = (order as any).delivered_items?.length || 0;
              const totalItems = order.items?.length || 0;
              const isFullyDelivered = order.status === "entregue" || (order as any).delivery_status === "delivered";
              const isPartial = (order as any).delivery_status === "partial" ||
                (deliveredCount > 0 && !isFullyDelivered);
              return (
                <div
                  key={order.id}
                  className={`rounded-lg border border-border p-3 space-y-2 ${newOrderIds.has(order.id) ? "animate-pulse bg-primary/10" : "bg-card"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                          #{order.id.slice(0, 6).toUpperCase()}
                        </code>
                        {(order as any).tableNumber && (
                          <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            🍽️ Mesa {(order as any).tableNumber}
                          </Badge>
                        )}
                        {(order as any).delivery_code && (
                          <Badge variant="outline" className="font-mono text-[10px] gap-1">
                            <QrCode className="h-2.5 w-2.5" />
                            {(order as any).delivery_code}
                          </Badge>
                        )}
                      </div>
                      <div className="font-semibold text-foreground mt-1">{order.customerName || "Sem nome"}</div>
                      {order.customerPhone && (
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">{fmtDate} {fmtTime}</div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant="secondary" className={statusColors[order.status]}>
                        {order.status}
                      </Badge>
                      {isPartial && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500 text-[10px]">
                          {deliveredCount}/{totalItems} parcial
                        </Badge>
                      )}
                      {isFullyDelivered && (
                        <Badge variant="outline" className="text-green-600 border-green-500 text-[10px]">
                          ✓ Entregue
                        </Badge>
                      )}
                    </div>
                  </div>

                  {order.delivery && (
                    <div className="text-xs text-muted-foreground">
                      {order.delivery.method === "delivery" ? "📦 Entrega" : "🏪 Retirada"}
                      {order.delivery.method === "delivery" && order.delivery.address && (
                        <span> — {order.delivery.address}{order.delivery.number ? `, ${order.delivery.number}` : ""}</span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.quantity}x {item.productName}</span>
                        <span>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {paymentLabels[order.paymentMethod || "dinheiro"] || order.paymentMethod}
                      </span>
                      {order.paid ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 text-[10px] font-semibold">
                          ✓ Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold">
                          ⏳ Aguardando
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-foreground">R$ {order.total.toFixed(2).replace(".", ",")}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v as Order["status"])}>
                      <SelectTrigger className="h-11 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="preparando" disabled={!order.paid}>
                          Preparando{!order.paid && " (precisa estar pago)"}
                        </SelectItem>
                        <SelectItem value="entregue" disabled={!order.paid}>
                          Entregue{!order.paid && " (precisa estar pago)"}
                        </SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenDelivery(order.id)}
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      disabled={!order.paid}
                    >
                      <Package className="h-3.5 w-3.5" />
                      Entrega
                    </Button>
                  </div>

                  {/* Botão para marcar/desmarcar como pago */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant={order.paid ? "outline" : "default"}
                      size="sm"
                      onClick={() => updateOrderPaid(order.id, !order.paid)}
                      className={`w-full gap-1 ${
                        order.paid
                          ? "border-green-600 text-green-700 hover:bg-green-50"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {order.paid ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Pago
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3.5 w-3.5" /> Marcar como Pago
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="rounded-lg border border-border overflow-hidden hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36">Alterar</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const deliveredCount = (order as any).delivered_items?.length || 0;
                  const totalItems = order.items?.length || 0;
                  const isFullyDelivered = order.status === "entregue" || (order as any).delivery_status === "delivered";
                  const isPartial = (order as any).delivery_status === "partial" ||
                    (deliveredCount > 0 && !isFullyDelivered);

                  return (
                  <TableRow
                    key={order.id}
                    className={newOrderIds.has(order.id) ? "animate-pulse bg-primary/10" : ""}
                  >
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        #{order.id.slice(0, 6).toUpperCase()}
                      </code>
                      {(order as any).delivery_code && (
                        <div className="mt-1">
                          <Badge variant="outline" className="font-mono text-[10px] gap-1">
                            <QrCode className="h-2.5 w-2.5" />
                            {(order as any).delivery_code}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{order.customerName}</div>
                      {order.customerPhone && (
                        <span className="text-xs text-muted-foreground">{order.customerPhone}</span>
                      )}
                      {order.delivery && (
                        <div className="text-xs text-muted-foreground">
                          {order.delivery.method === "delivery" ? "📦 Entrega" : "🏪 Retirada"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
                      {isPartial && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {deliveredCount}/{totalItems} entregue(s)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {paymentLabels[order.paymentMethod || "dinheiro"] || order.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold">R$ {order.total.toFixed(2).replace(".", ",")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
                        {isPartial && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500">
                            Parcial
                          </Badge>
                        )}
                        {isFullyDelivered && (
                          <Badge variant="outline" className="text-green-600 border-green-500 bg-green-50 dark:bg-green-950/30">
                            ✓ Entregue
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v as Order["status"])}>
                        <SelectTrigger className="h-11 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="preparando" disabled={!order.paid}>
                            Preparando{!order.paid && " (pago)"}
                          </SelectItem>
                          <SelectItem value="entregue" disabled={!order.paid}>
                            Entregue{!order.paid && " (pago)"}
                          </SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={isFullyDelivered ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleOpenDelivery(order.id)}
                        title="Gerenciar Entrega"
                        className={!isFullyDelivered && order.paid ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                        disabled={!order.paid}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Entrega
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delivery Dialog */}
      <DeliveryDialog
        order={selectedDeliveryOrder}
        open={deliveryDialogOpen}
        onClose={() => setDeliveryDialogOpen(false)}
        onUpdated={handleDeliveryUpdated}
      />
    </div>
  );
}
