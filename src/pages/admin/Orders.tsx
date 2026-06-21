import { useEffect, useRef, useState, useCallback } from "react";
import { useAdmin, Order } from "@/contexts/AdminContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Bell, FileText, Truck, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { OrderReceipt } from "@/components/admin/OrderReceipt";
import { DeliverySlip } from "@/components/admin/DeliverySlip";
import { getNotificationPrefs } from "@/hooks/useNotificationPreferences";
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

type PrintMode = "receipt" | "delivery" | null;

export default function Orders() {
  const { orders, updateOrderStatus, setOnNewOrder } = useAdmin();
  const { toast } = useToast();
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

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

      // Som / browser push / mobile push são disparados globalmente
      // pelo AdminContext. Aqui só toast (visual da página) e highlight.
      toast({
        title: "🔔 Novo Pedido!",
        description: `${customer} - ${valueStr}`,
      });

      // Auto-impressão respeita as preferências por tipo
      const prefs = getNotificationPrefs();
      if (prefs.autoPrintReceipt) {
        setPrintMode("receipt");
        setPrintOrder(order);
      } else if (prefs.autoPrintDelivery && order.delivery?.method === "delivery") {
        setPrintMode("delivery");
        setPrintOrder(order);
      }
    });

    return () => setOnNewOrder(null);
  }, [toast, setOnNewOrder]);

  // Handle printing
  useEffect(() => {
    if (!printOrder || !printMode) return;

    const ref = printMode === "receipt" ? receiptRef : deliveryRef;

    const timer = setTimeout(() => {
      if (!ref.current) return;

      const printWindow = window.open("", "_blank", "width=350,height=600");
      if (printWindow) {
        const title = printMode === "receipt"
          ? `Cupom #${printOrder.id.slice(0, 8)}`
          : `Entrega #${printOrder.id.slice(0, 8)}`;

        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { margin: 0; padding: 0; }
                @media print {
                  body { margin: 0; }
                  @page { margin: 0; size: 80mm auto; }
                }
              </style>
            </head>
            <body>${ref.current?.innerHTML || ""}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }

      // Após imprimir cupom, encadeia ficha de entrega se ativado nas preferências
      const prefs = getNotificationPrefs();
      if (
        printMode === "receipt" &&
        printOrder.delivery?.method === "delivery" &&
        prefs.autoPrintDelivery
      ) {
        setTimeout(() => setPrintMode("delivery"), 500);
      } else {
        setPrintOrder(null);
        setPrintMode(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [printOrder, printMode]);

  const handlePrintReceipt = useCallback((order: Order) => {
    setPrintMode("receipt");
    setPrintOrder(order);
  }, []);

  const handlePrintDelivery = useCallback((order: Order) => {
    setPrintMode("delivery");
    setPrintOrder(order);
  }, []);

  const handlePrintBoth = useCallback((order: Order) => {
    setPrintMode("receipt");
    setPrintOrder(order);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pedidos</h2>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/admin/configuracoes" title="Notificações e impressão">
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
              return (
                <div
                  key={order.id}
                  className={`rounded-lg border border-border p-3 space-y-2 ${newOrderIds.has(order.id) ? "animate-pulse bg-primary/10" : "bg-card"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{order.customerName || "Sem nome"}</div>
                      {order.customerPhone && (
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">{fmtDate} {fmtTime}</div>
                    </div>
                    <Badge variant="secondary" className={statusColors[order.status]}>
                      {order.status}
                    </Badge>
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
                    <Button
                      type="button"
                      variant={order.paid ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateOrderPaid(order.id, !order.paid)}
                      className={order.paid ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {order.paid ? "✓ Pago" : "Marcar Pago"}
                    </Button>
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
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(order)} title="Cupom">
                        <FileText className="h-4 w-4" />
                      </Button>
                      {order.delivery?.method === "delivery" && (
                        <Button variant="outline" size="sm" onClick={() => handlePrintDelivery(order)} title="Ficha Entrega">
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handlePrintBoth(order)} title="Ambos">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36">Alterar</TableHead>
                  <TableHead className="w-28">Imprimir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={newOrderIds.has(order.id) ? "animate-pulse bg-primary/10" : ""}
                  >
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
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {paymentLabels[order.paymentMethod || "dinheiro"] || order.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold">R$ {order.total.toFixed(2).replace(".", ",")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[order.status]}>
                        {order.status}
                      </Badge>
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handlePrintReceipt(order)} title="Imprimir Cupom">
                          <FileText className="h-4 w-4" />
                        </Button>
                        {order.delivery?.method === "delivery" && (
                          <Button variant="ghost" size="sm" onClick={() => handlePrintDelivery(order)} title="Imprimir Ficha de Entrega">
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handlePrintBoth(order)} title="Imprimir Ambos">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Hidden receipts for printing */}
      {printOrder && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <OrderReceipt ref={receiptRef} order={printOrder} />
          <DeliverySlip ref={deliveryRef} order={printOrder} />
        </div>
      )}
    </div>
  );
}
