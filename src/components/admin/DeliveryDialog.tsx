import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, CheckCircle2, Loader2 } from "lucide-react";
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
  items: OrderItem[];
  total: number;
  status: string;
  paid: boolean;
  delivery_code: string | null;
  delivery_status: string | null;
  delivered_items: OrderItem[] | null;
  delivered_by: string | null;
  delivered_at: string | null;
}

interface DeliveryDialogProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function DeliveryDialog({ order, open, onClose, onUpdated }: DeliveryDialogProps) {
  const { isAdmin } = useAuth();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState<"partial" | "full">("full");

  useEffect(() => {
    if (!order) {
      setSelectedItems(new Set());
      return;
    }

    // Marca como selecionados os itens já entregues
    if (order.delivered_items && order.delivered_items.length > 0) {
      const deliveredIds = new Set(
        order.delivered_items.map((item: OrderItem) =>
          item.productId || item.productName || item.name || ""
        )
      );
      setSelectedItems(deliveredIds);
    } else {
      setSelectedItems(new Set());
    }
  }, [order]);

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
      (item: OrderItem) =>
        (item.productId || item.productName || item.name) === itemKey
    );
  };

  const handleConfirmPartial = async () => {
    if (!order || selectedItems.size === 0) return;
    setConfirming(true);

    try {
      // Acumula os itens entregues
      const itemsToDeliver = order.items.filter((item) => {
        const idx = order.items.indexOf(item);
        return selectedItems.has(getItemKey(item, idx));
      });

      // Combina com itens já entregues
      const existingDelivered = order.delivered_items || [];
      const existingKeys = new Set(
        existingDelivered.map((item: OrderItem) =>
          item.productId || item.productName || item.name
        )
      );
      const newItems = itemsToDeliver.filter((item) => {
        const idx = order.items.indexOf(item);
        const key = getItemKey(item, idx);
        return !existingKeys.has(key);
      });
      const allDelivered = [...existingDelivered, ...newItems];

      // Verifica se todos os itens foram entregues
      const allItemsDelivered = order.items.every((item) => {
        const idx = order.items.indexOf(item);
        const key = getItemKey(item, idx);
        return allDelivered.some(
          (d) => (d.productId || d.productName || d.name) === key
        );
      });

      const newStatus = allItemsDelivered ? "entregue" : "confirmado";
      const allItemsDeliveredAt = allItemsDelivered ? new Date().toISOString() : null;

      // Tenta atualizar com colunas novas primeiro
      const updateData: any = {
        status: newStatus,
        delivered_at: allItemsDelivered ? new Date().toISOString() : order.delivered_at,
      };

      // Tenta incluir colunas opcionais (podem não existir)
      try {
        const { error } = await supabase
          .from("orders")
          .update({
            ...updateData,
            delivery_status: allItemsDelivered ? "delivered" : "partial",
            delivered_items: allDelivered,
          })
          .eq("id", order.id);

        if (error) throw error;
      } catch {
        // Se falhar, tenta só com as colunas básicas
        const { error } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", order.id);

        if (error) throw error;
      }

      if (allItemsDelivered) {
        toast({ title: "Entrega completa!", description: "Todos os itens foram entregues." });
      } else {
        toast({ title: "Entrega parcial!", description: `${selectedItems.size} item(s) marcado(s).` });
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmFull = async () => {
    if (!order) return;
    setConfirming(true);

    try {
      const updateData: any = {
        status: "entregue",
        delivered_at: new Date().toISOString(),
      };

      // Tenta com colunas novas primeiro
      try {
        const { error } = await supabase
          .from("orders")
          .update({
            ...updateData,
            delivery_status: "delivered",
            delivered_items: order.items,
          })
          .eq("id", order.id);

        if (error) throw error;
      } catch {
        // Fallback só com colunas básicas
        const { error } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", order.id);

        if (error) throw error;
      }

      toast({ title: "Entrega confirmada!", description: "Todos os itens foram entregues." });
      onUpdated();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  if (!order) return null;

  const isFullyDelivered = order.status === "entregue" || order.delivery_status === "delivered";
  const hasPartial = order.delivery_status === "partial" ||
    (order.delivered_items && order.delivered_items.length > 0 && !isFullyDelivered);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirmar Entrega
            {order.delivery_code && (
              <Badge variant="outline" className="font-mono ml-2">
                #{order.delivery_code}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
            )}
            <p className="text-sm mt-1">
              Total: <span className="font-bold text-primary">R$ {order.total.toFixed(2).replace(".", ",")}</span>
            </p>
          </div>

          {/* Status atual */}
          {isFullyDelivered && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <Check className="h-5 w-5 inline mr-2 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Pedido já foi entregue completamente
              </span>
            </div>
          )}

          {hasPartial && !isFullyDelivered && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
              <Circle className="h-5 w-5 inline mr-2 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Entrega parcial: {order.delivered_items?.length || 0} de {order.items?.length} itens
              </span>
            </div>
          )}

          {/* Itens */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Itens do Pedido</p>
            {order.items?.map((item: OrderItem, idx: number) => {
              const itemKey = getItemKey(item, idx);
              const wasDelivered = isItemDelivered(itemKey);
              const isSelected = selectedItems.has(itemKey);

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    wasDelivered
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : isSelected
                      ? "bg-primary/5 border-primary"
                      : "bg-background border-border"
                  } ${isFullyDelivered ? "opacity-60" : "cursor-pointer hover:border-primary/50"}`}
                  onClick={() => {
                    if (!isFullyDelivered && !wasDelivered) {
                      toggleItem(itemKey);
                    }
                  }}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    wasDelivered
                      ? "bg-green-600 border-green-600"
                      : isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  }`}>
                    {(wasDelivered || isSelected) && (
                      <Check className="h-4 w-4 text-white" />
                    )}
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
          </div>

          {/* Modo de entrega */}
          {!isFullyDelivered && (
            <div className="flex gap-2 pt-2">
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!isFullyDelivered && (
            mode === "partial" ? (
              <Button
                onClick={handleConfirmPartial}
                disabled={confirming || selectedItems.size === 0}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar {selectedItems.size > 0 ? `${selectedItems.size} Itens` : "Itens"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleConfirmFull}
                disabled={confirming}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Tudo
                  </>
                )}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
