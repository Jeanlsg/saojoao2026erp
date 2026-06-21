import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle2, XCircle, Package, CheckCheck, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

type Status = "pendente" | "preparando" | "entregue" | "cancelado" | "confirmado";

interface OrderRow {
  id: string;
  total: number;
  status: Status;
  items: { productName: string; quantity: number; price: number }[];
  payment_method: string;
  delivery: any;
  created_at: string;
  paid: boolean;
}

const STAGES: { key: Status; label: string; icon: any }[] = [
  { key: "pendente", label: "Pendente", icon: Clock },
  { key: "confirmado", label: "Confirmado", icon: CheckCircle2 },
  { key: "preparando", label: "Preparando", icon: ChefHat },
  { key: "entregue", label: "Entregue", icon: CheckCircle2 },
];

function StatusTimeline({ status }: { status: Status }) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm font-medium">
        <XCircle className="h-4 w-4" /> Pedido cancelado
      </div>
    );
  }
  const currentIdx = STAGES.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center justify-between gap-1">
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const reached = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={stage.key} className="flex-1 flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            } ${active ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : ""}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className={`mt-1 text-[10px] font-medium ${reached ? "text-foreground" : "text-muted-foreground"}`}>
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const markAsDelivered = async (orderId: string) => {
    setMarkingId(orderId);
    try {
      const { error } = await db.from("orders").update({ status: "entregue" }).eq("id", orderId);
      if (error) throw error;
      toast({
        title: "✓ Pedido marcado como entregue!",
        description: "Obrigado por confirmar o recebimento.",
      });
      // realtime vai atualizar a UI automaticamente
    } catch (err: any) {
      console.error("Error marking delivered:", err);
      const msg = err?.message || "";
      if (msg.includes("pago antes") || msg.includes("check_violation")) {
        toast({
          title: "⚠️ Aguardando confirmação do pagamento",
          description: "Só é possível marcar como entregue depois que o pagamento for confirmado.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      }
    } finally {
      setMarkingId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await db
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as OrderRow[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`my-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as OrderRow, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? (payload.new as OrderRow) : o)));
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-card shadow-sm border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <BackButton onClick={() => navigate("/")} />
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5" /> Meus Pedidos
            </h1>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Você ainda não fez nenhum pedido.</p>
            <Button onClick={() => navigate("/")} className="mt-4">Ver produtos</Button>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">Pedido #{order.id.slice(-6).toUpperCase()}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={order.status === "cancelado" ? "destructive" : "default"} className="capitalize">
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="py-2"><StatusTimeline status={order.status} /></div>
                <div className="border-t border-border pt-2 space-y-1">
                  {order.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{it.quantity}x {it.productName}</span>
                      <span className="text-muted-foreground">R$ {(it.quantity * it.price).toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">
                    {order.delivery?.method === "delivery" ? "Entrega" : "Retirada"} • {order.payment_method}
                  </span>
                  <span className="font-bold text-foreground">
                    R$ {Number(order.total).toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {/* Botão QR Code de entrega - aparece quando o pedido está confirmado */}
                {order.status === "confirmado" && order.paid && (
                  <Button
                    onClick={() => navigate(`/pedido/${order.id}`)}
                    className="w-full"
                    variant="outline"
                    size="sm"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Ver QR Code de Entrega
                  </Button>
                )}

                {/* Botão "Marcar como entregue" — só aparece se:
                    1. Pedido ainda não foi entregue/cancelado
                    2. Pedido já foi pago (paid=true) */}
                {order.status !== "entregue" && order.status !== "cancelado" && order.paid && (
                  <Button
                    onClick={() => markAsDelivered(order.id)}
                    disabled={markingId === order.id}
                    className="w-full"
                    variant="default"
                    size="sm"
                  >
                    {markingId === order.id ? (
                      <>Atualizando...</>
                    ) : (
                      <>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Marcar como entregue
                      </>
                    )}
                  </Button>
                )}

                {/* Aviso de aguardando pagamento */}
                {order.status !== "entregue" && order.status !== "cancelado" && !order.paid && (
                  <div className="text-center text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                    ⏳ Aguardando confirmação do pagamento para liberar a entrega
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
