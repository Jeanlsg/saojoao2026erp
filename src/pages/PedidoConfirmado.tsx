import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Package, User, Phone, Check, Clock, MapPin, Share2, CircleCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  items: any[];
  total: number;
  status: string;
  payment_method: string;
  paid: boolean;
  paid_at: string | null;
  delivery_code: string | null;
  delivery_status: string | null;
  delivered_items: any[] | null;
  created_at: string;
}

export default function PedidoConfirmado() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  const getDeliveryQRUrl = () => {
    if (!orderId) return "";
    // URL para o entregador escanear
    return `${window.location.origin}/entrega/${orderId}`;
  };

  const copyLink = async () => {
    const url = getDeliveryQRUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!", description: "Cole para o entregador escanear." });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const shareLink = async () => {
    const url = getDeliveryQRUrl();
    const text = `🍡 Meu pedido #${orderId?.slice(0, 8).toUpperCase()} está pronto!\n\nEntregue este código ao entregador para confirmar a entrega.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pedido Arraiá",
          text,
          url,
        });
      } catch {
        // Usuário cancelou ou erro
      }
    } else {
      copyLink();
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-bold">Pedido não encontrado</h2>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Voltar à loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDelivered = order.status === "entregue" || order.delivery_status === "delivered";
  const isPartial = order.delivery_status === "partial" || (order.delivered_items && order.delivered_items.length > 0);
  const qrUrl = getDeliveryQRUrl();

  // Lista de itens já entregues
  const deliveredItems = order.delivered_items || [];
  const deliveredKeys = new Set(
    deliveredItems.map((item: any) => item.productId || item.productName || item.name)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
            isDelivered ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
          }`}>
            {isDelivered ? (
              <Check className="h-6 w-6 text-green-600" />
            ) : (
              <QrCode className="h-6 w-6 text-primary" />
            )}
          </div>
          <h1 className={`font-bold text-lg ${
            isDelivered ? "text-green-700 dark:text-green-400" : ""
          }`}>
            {isDelivered ? "Pedido Entregue!" : "Pedido Confirmado!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </header>

      {/* Status Badge */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {isDelivered && (
            <Badge className="bg-green-600 text-white px-3 py-1">
              <Check className="h-3 w-3 mr-1" /> Entregue
            </Badge>
          )}
          {isPartial && !isDelivered && (
            <Badge className="bg-amber-500 text-white px-3 py-1">
              <CircleCheck className="h-3 w-3 mr-1" /> Entrega Parcial
            </Badge>
          )}
          {!isDelivered && !isPartial && (
            <Badge variant="secondary" className="px-3 py-1">
              Aguardando Entrega
            </Badge>
          )}
        </div>
      </div>

      {/* QR Code para Entrega */}
      {!isDelivered && (
        <div className="container mx-auto px-4 pb-4">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-base flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                Código de Entrega
              </CardTitle>
              <CardDescription>
                Mostre este código ao entregador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Código textual grande */}
              <div className="text-center">
                <p className="font-mono font-bold text-4xl tracking-widest text-primary">
                  {order.delivery_code || order.id.slice(0, 6)}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl border-2 border-border shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(qrUrl)}`}
                    alt="QR Code de Entrega"
                    className="w-40 h-40"
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1" onClick={copyLink}>
                  <Share2 className="h-4 w-4" />
                  Copiar
                </Button>
                <Button className="flex-1 gap-1" onClick={shareLink}>
                  <Share2 className="h-4 w-4" />
                  Enviar
                </Button>
              </div>

              {/* Instrução */}
              <p className="text-xs text-center text-muted-foreground">
                O entregador vai escanear este QR Code para confirmar a entrega.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detalhes do Pedido */}
      <main className="container mx-auto px-4 pb-8 space-y-4">
        {/* Cliente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            {order.customer_phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </span>
                <span>{order.customer_phone}</span>
              </div>
            )}
            {order.customer_address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Endereço
                </span>
                <span className="text-right max-w-[60%]">{order.customer_address}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Data
              </span>
              <span>{formatDate(order.created_at)} às {formatTime(order.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={
                  order.status === "entregue" ? "default" :
                  order.status === "confirmado" ? "secondary" :
                  "outline"
                }
                className={order.status === "entregue" ? "bg-green-600" : ""}
              >
                {order.status === "entregue" ? (
                  <><Check className="h-3 w-3 mr-1" /> Entregue</>
                ) : order.status === "confirmado" ? (
                  "Confirmado"
                ) : order.status === "pendente" ? (
                  "Pendente de Pagamento"
                ) : (
                  order.status
                )}
              </Badge>
              {isPartial && !isDelivered && (
                <Badge className="bg-amber-500 text-white">
                  <CircleCheck className="h-3 w-3 mr-1" />
                  {deliveredItems.length}/{order.items?.length || 0} itens entregues
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Itens ({order.items?.length || 0})
            </CardTitle>
            {isPartial && (
              <CardDescription className="text-amber-600 dark:text-amber-400">
                {deliveredItems.length} já entregue(s)
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.items?.map((item: any, idx: number) => {
                const itemKey = item.productId || item.productName || item.name || `item-${idx}`;
                const wasDelivered = deliveredKeys.has(itemKey);

                return (
                  <div
                    key={idx}
                    className={`flex justify-between items-center ${
                      wasDelivered ? "opacity-60" : ""
                    }`}
                  >
                    <span className={wasDelivered ? "line-through text-muted-foreground" : ""}>
                      {item.quantity}x {item.productName || item.name || "Item"}
                      {wasDelivered && (
                        <Check className="h-3 w-3 inline ml-2 text-green-600" />
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      R$ {((item.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary text-lg">
                R$ {order.total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pagamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="capitalize">
                {order.payment_method === "pix" ? "PIX" :
                 order.payment_method === "dinheiro" ? "Dinheiro" :
                 order.payment_method === "credito" ? "Cartão de Crédito" :
                 order.payment_method === "debito" ? "Cartão de Débito" : order.payment_method}
              </span>
              <Badge variant={order.paid ? "default" : "secondary"} className={order.paid ? "bg-green-600" : ""}>
                {order.paid ? "Pago" : "Pendente"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Voltar à Loja
        </Button>
      </main>
    </div>
  );
}
