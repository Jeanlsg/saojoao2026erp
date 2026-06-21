import { Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Users, Clock, Trophy, Wallet, Receipt } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { cn } from "@/lib/utils";

type StatCard = {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  accent?: "blue" | "red" | "neutral";
  highlight?: boolean;
};

export default function Dashboard() {
  const { products, orders, combos, lowStockProducts } = useAdmin();

  const deliveredOrders = orders.filter((o) => o.status === "entregue");
  const totalSales = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pendente").length;
  const preparingOrders = orders.filter((o) => o.status === "preparando").length;
  const avgTicket = deliveredOrders.length ? totalSales / deliveredOrders.length : 0;
  const conversionRate = orders.length ? (deliveredOrders.length / orders.length) * 100 : 0;

  const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

  const cards: StatCard[] = [
    { title: "Pedidos totais", value: orders.length, hint: `${pendingOrders} aguardando atendimento`, icon: Users, accent: "blue" },
    { title: "Pedidos entregues", value: deliveredOrders.length, hint: `${orders.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0}% de conclusão`, icon: ShoppingCart, accent: "blue" },
    { title: "Em preparação", value: preparingOrders, hint: "No fluxo da loja", icon: Clock, accent: "neutral" },
    { title: "Pendentes", value: pendingOrders, hint: "Sem confirmação", icon: Receipt, accent: "neutral" },
    { title: "Taxa de conversão", value: `${conversionRate.toFixed(1)}%`, hint: `${deliveredOrders.length} entregues / ${orders.length - deliveredOrders.length} abertos`, icon: TrendingUp, accent: "blue" },
    { title: "Receita ganha", value: fmt(totalSales), hint: "Pedidos finalizados", icon: Trophy, accent: "red", highlight: true },
    { title: "Produtos cadastrados", value: products.length, hint: `${combos.length} combos ativos`, icon: Package, accent: "blue" },
    { title: "Ticket médio", value: fmt(avgTicket), hint: "Por venda concluída", icon: Wallet, accent: "neutral" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Visão geral de performance — Arraiá da Escola Raul Pompéia
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <StatCardItem key={card.title} {...card} />
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/5 via-card to-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Estoque baixo</h3>
              <p className="text-xs text-muted-foreground">Reabasteça antes que esgote</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span
                key={p.id}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary/10 text-secondary font-semibold border border-secondary/20"
              >
                {p.name} · {p.stock} un
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Últimos pedidos</h3>
            <p className="text-xs text-muted-foreground">Movimentações recentes da loja</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{orders.length} no total</span>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 5).map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{order.customerName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
                </p>
              </div>
              <div className="text-right pl-3">
                <p className="font-bold text-sm text-foreground">{fmt(order.total)}</p>
                <span
                  className={cn(
                    "inline-block mt-0.5 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold",
                    order.status === "pendente" && "bg-primary/15 text-primary",
                    order.status === "preparando" && "bg-secondary/15 text-secondary",
                    order.status === "entregue" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    order.status === "cancelado" && "bg-destructive/15 text-destructive",
                  )}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum pedido registrado ainda
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCardItem({ title, value, hint, icon: Icon, accent = "neutral", highlight }: StatCard) {
  const accentRing =
    accent === "blue"
      ? "before:bg-primary/60"
      : accent === "red"
      ? "before:bg-secondary/70"
      : "before:bg-muted-foreground/30";

  const iconStyles =
    accent === "blue"
      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
      : accent === "red"
      ? "bg-secondary/10 text-secondary ring-1 ring-secondary/20"
      : "bg-muted text-muted-foreground ring-1 ring-border";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        // top accent bar
        "before:absolute before:left-0 before:top-0 before:h-1 before:w-full before:content-['']",
        accentRing,
        highlight
          ? "border-secondary/40 bg-gradient-to-br from-secondary/5 via-card to-card"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", iconStyles)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      <p
        className={cn(
          "mt-3 text-3xl font-extrabold tracking-tight",
          highlight ? "text-secondary" : "text-foreground",
        )}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

      {/* decorative blur */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity",
          accent === "blue" && "bg-primary/20",
          accent === "red" && "bg-secondary/20",
          accent === "neutral" && "bg-muted-foreground/10",
        )}
      />
    </div>
  );
}
