import { LayoutDashboard, Package, Tag, Flame, ShoppingCart, ArrowLeft, Truck, Percent, Newspaper, Settings, LogOut, Monitor } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Frente de Caixa", url: "/admin/pdv", icon: Monitor },
  // Produtos engloba estoque (alerta + ajuste inline) — antes era uma página separada.
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Categorias", url: "/admin/categorias", icon: Tag },
  { title: "Combos", url: "/admin/combos", icon: Flame },
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
  { title: "Frete", url: "/admin/frete", icon: Truck },
  { title: "Descontos", url: "/admin/descontos", icon: Percent },
  { title: "Jornais", url: "/admin/jornais", icon: Newspaper },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-auto pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 px-2">
            <div className={`flex items-center gap-2 min-w-0 ${collapsed ? "justify-center" : ""}`}>
              <img
                src="/logo-escola.png"
                alt="Escola Raul Pompéia"
                className={`object-contain shrink-0 ${collapsed ? "h-8 w-8" : "h-9 w-9"}`}
              />
              {!collapsed && (
                <span
                  className="text-[11px] font-bold uppercase text-sidebar-foreground leading-tight min-w-0 truncate"
                  title="Escola Raul Pompéia"
                >
                  Escola
                  <br />
                  Raul Pompéia
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" className="hover:bg-sidebar-accent/50 text-sidebar-foreground/60">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Voltar à Loja</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
