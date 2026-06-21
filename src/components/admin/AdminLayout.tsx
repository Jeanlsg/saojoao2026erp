import { Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tag,
  Flame,
  ShoppingCart,
  Truck,
  Percent,
  Newspaper,
  Settings,
  ArrowLeft,
  Bell,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/contexts/AdminContext";

// Mapa rota → ícone + label curto. Mostrar só ícone em telas pequenas
// economiza espaço sem perder identificação.
const ROUTE_META: { match: RegExp; icon: React.ElementType; label: string }[] = [
  { match: /^\/admin\/produtos/, icon: Package, label: "Produtos" },
  { match: /^\/admin\/categorias/, icon: Tag, label: "Categorias" },
  { match: /^\/admin\/combos/, icon: Flame, label: "Combos" },
  { match: /^\/admin\/pedidos/, icon: ShoppingCart, label: "Pedidos" },
  { match: /^\/admin\/frete/, icon: Truck, label: "Frete" },
  { match: /^\/admin\/descontos/, icon: Percent, label: "Descontos" },
  { match: /^\/admin\/jornais/, icon: Newspaper, label: "Jornais" },
  { match: /^\/admin\/configuracoes/, icon: Settings, label: "Configurações" },
  { match: /^\/admin\/?$/, icon: LayoutDashboard, label: "Dashboard" },
];

function getRouteMeta(pathname: string) {
  return ROUTE_META.find((r) => r.match.test(pathname)) ?? ROUTE_META[ROUTE_META.length - 1];
}

export function AdminLayout() {
  const location = useLocation();
  const meta = getRouteMeta(location.pathname);
  const Icon = meta.icon;
  const { orders } = useAdmin();
  const pendingCount = orders.filter((o) => o.status === "pendente").length;
  const isOnOrders = location.pathname.startsWith("/admin/pedidos");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <header
            className="flex items-center border-b border-border bg-card px-2 sm:px-4 gap-2 sm:gap-3 pb-2 sticky top-0 z-10"
          >
            <SidebarTrigger className="shrink-0" />
            {/* Identificação da seção: ícone sempre visível, texto só em sm+ */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span className="text-sm sm:text-base font-bold text-foreground truncate">
                {meta.label}
              </span>
            </div>
            {/* Sino com badge de pedidos pendentes — feedback permanente.
                Quando já está em /pedidos, o sino fica "calado" (sem badge animada). */}
            <Button
              variant="ghost"
              size="icon"
              className="relative shrink-0"
              asChild
              title={pendingCount > 0 ? `${pendingCount} pedido(s) pendente(s)` : "Sem pedidos pendentes"}
            >
              <Link to="/admin/pedidos" aria-label="Pedidos pendentes">
                <Bell
                  className={`h-4 w-4 ${
                    pendingCount > 0 && !isOnOrders ? "text-destructive animate-pulse" : ""
                  }`}
                />
                {pendingCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground"
                    aria-hidden
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* Atalho rápido para a loja (só ícone — economia de espaço) */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              asChild
              title="Voltar à loja"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </header>
          <main className="flex-1 bg-background overflow-auto p-2 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
