import { Clock, MapPin, ShoppingCart, User, LogOut, Settings, Package, Utensils, ShieldCheck, Sun, Moon } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMesaSession, clearMesaSession } from "@/lib/mesaSession";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function StoreHeader() {
  const now = new Date();
  const hour = now.getHours();
  const isOpen = hour >= 7 && hour < 22;
  const { user, profile, isAdmin, signOut } = useAuth();
  const [mesa, setMesa] = useState(getMesaSession());

  useEffect(() => {
    const interval = setInterval(() => setMesa(getMesaSession()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-card shadow-md">
      <div className="container flex items-center justify-between pt-1.5 pb-1.5 sm:pt-3 sm:pb-3">
        {/* Logo + Address */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src="/icon.png"
            alt="Escola Raul Pompéia"
            className="h-12 w-auto sm:h-16 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <Link
              to="/localizacao"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-none">R. do Cobalto, 175 - Dom Avelar, Petrolina - PE</span>
            </Link>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>07:00 - 22:00</span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 ${
                  isOpen ? "border-accent text-accent" : "border-destructive text-destructive"
                }`}
              >
                {isOpen ? "Aberto" : "Fechado"}
              </Badge>
            </div>
            {mesa && (
              <button
                onClick={() => {
                  if (confirm(`Deseja trocar a mesa ${mesa.numero}?`)) {
                    clearMesaSession();
                    window.location.href = "/selecionar-mesa";
                  }
                }}
                className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                title="Clique para trocar de mesa"
              >
                <Utensils className="h-2.5 w-2.5" />
                <span>Mesa {mesa.numero} • {mesa.nome_cliente}</span>
              </button>
            )}
          </div>
        </div>

        {/* Actions - hidden on mobile (bottom nav handles it) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {!user && (
            <Button variant="outline" size="sm" asChild className="gap-1">
              <Link to="/admin/login">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin/Entregas
              </Link>
            </Button>
          )}
          <ThemeToggle isDark={isDark} setTheme={setTheme} />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{profile?.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil"><User className="h-4 w-4 mr-2" /> Meu perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/meus-pedidos"><Package className="h-4 w-4 mr-2" /> Meus pedidos</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Settings className="h-4 w-4 mr-2" /> Painel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">
                <User className="h-4 w-4 mr-1" /> Entrar
              </Link>
            </Button>
          )}
          <CartButton />
        </div>

        {/* Mobile: only cart button visible in header */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <ThemeToggle isDark={isDark} setTheme={setTheme} />
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/admin">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <CartButton />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle({ isDark, setTheme }: { isDark: boolean; setTheme: (t: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 w-8"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function CartButton() {
  const { totalItems, setIsOpen } = useCart();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative rounded-lg sm:rounded-xl bg-primary p-2 sm:p-3 text-primary-foreground transition-transform active:scale-95"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {totalItems}
        </span>
      )}
    </button>
  );
}
