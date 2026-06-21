import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PackageCheck,
  Package,
  Check,
  Search,
  User,
  Phone,
  Clock,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  items: any[];
  total: number;
  status: string;
  payment_method: string;
  paid: boolean;
  paid_at: string | null;
  delivered_by: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface DeliveryUser {
  id: string;
  name: string;
  user_id: string;
}

export default function Entregas() {
  const navigate = useNavigate();
  const { user: authUser, isAdmin, signOut } = useAuth();
  const [deliveryUser, setDeliveryUser] = useState<DeliveryUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"pendentes" | "entregues">("pendentes");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    if (!authUser) {
      navigate("/login");
      return;
    }

    // Admin não tem acesso a esta página — redireciona para pedidos
    if (isAdmin) {
      navigate("/admin/pedidos", { replace: true });
      return;
    }

    // Busca dados do entregador
    const { data, error } = await supabase
      .from("delivery_users")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("active", true)
      .single();

    if (error || !data) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      signOut();
      navigate("/login");
      return;
    }

    setDeliveryUser(data);
    fetchOrders();
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["confirmado", "pendente", "entregue"])
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar pedidos", variant: "destructive" });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate(isAdmin ? "/admin/login" : "/login");
  };

  const handleConfirmDelivery = async (orderId: string) => {
    if (!deliveryUser) return;
    setConfirmingId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({
        status: "entregue",
        delivered_by: deliveryUser.id,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Erro ao confirmar entrega", variant: "destructive" });
    } else {
      toast({ title: "Entrega confirmada!" });
      fetchOrders();
    }
    setConfirmingId(null);
  };

  const filteredOrders = orders
    .filter((o) => {
      if (filter === "pendentes") return o.status !== "entregue";
      return o.status === "entregue";
    })
    .filter((o) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        o.customer_name.toLowerCase().includes(searchLower) ||
        o.id.toLowerCase().includes(searchLower)
      );
    });

  const pendingCount = orders.filter((o) => o.status !== "entregue").length;
  const deliveredCount = orders.filter((o) => o.status === "entregue").length;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  if (!deliveryUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold">Entregas</h1>
                <p className="text-sm text-muted-foreground">Olá, {deliveryUser.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={fetchOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === "pendentes" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pendentes")}
              className="gap-1"
            >
              <Package className="h-3 w-3" />
              Pendentes
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
              )}
            </Button>
            <Button
              variant={filter === "entregues" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("entregues")}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Entregues
              {deliveredCount > 0 && (
                <Badge variant="secondary" className="ml-1">{deliveredCount}</Badge>
              )}
            </Button>
          </div>

          {/* Busca */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      {/* Lista de Pedidos */}
      <main className="container mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <PackageCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {filter === "pendentes"
                  ? "Nenhum pedido pendente de entrega"
                  : "Nenhuma entrega confirmada ainda"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className={order.status === "entregue" ? "opacity-75" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {order.customer_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(order.created_at)} às {formatTime(order.created_at)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      R$ {order.total.toFixed(2).replace(".", ",")}
                    </p>
                    <Badge
                      variant={order.status === "entregue" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {order.status === "entregue" ? "Entregue" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Telefone do cliente */}
                {order.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Phone className="h-4 w-4" />
                    {order.customer_phone}
                  </div>
                )}

                {/* Itens */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {order.items?.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.productName || item.name || "Item"}
                      </span>
                      <span className="text-muted-foreground">
                        R$ {((item.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                  {order.items?.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{order.items.length - 5} outros itens
                    </p>
                  )}
                </div>

                {/* Botão de confirmar entrega */}
                {order.status !== "entregue" && (
                  <div className="mt-4">
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleConfirmDelivery(order.id)}
                      disabled={confirmingId === order.id}
                    >
                      {confirmingId === order.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirmar Entrega
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Info de entrega */}
                {order.status === "entregue" && order.delivered_at && (
                  <div className="mt-3 text-center text-xs text-muted-foreground">
                    <Check className="h-3 w-3 inline mr-1" />
                    Entregue em {formatDate(order.delivered_at)} às {formatTime(order.delivered_at)}
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
