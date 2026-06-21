import { Home, ShoppingCart, User, Newspaper } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";

/**
 * Navegação inferior (mobile). Segue a HIG: 3–5 abas, fixa na base com blur,
 * e ícone PREENCHIDO (fill) na aba ativa / contorno na inativa.
 * Localização da loja saiu da tab bar — fica acessível pelo endereço no StoreHeader.
 */
export function BottomNav() {
  const { totalItems, isOpen, setIsOpen } = useCart();
  const { user } = useAuth();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isOfertas = location.pathname === "/ofertas";
  const isProfile = location.pathname === "/perfil" || location.pathname === "/meus-pedidos";

  // Cada item tem px-3/py-1.5 → área de toque ≥44pt de altura (HIG).
  const itemClass = (active: boolean) =>
    `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
      active ? "text-primary" : "text-muted-foreground"
    }`;
  const iconFill = (active: boolean) => (active ? "fill-current" : "");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around py-1.5">
        <Link to="/" className={itemClass(isHome)}>
          <Home className={`h-5 w-5 ${iconFill(isHome)}`} />
          <span className="text-[10px] font-medium">Início</span>
        </Link>

        <Link to="/ofertas" className={itemClass(isOfertas)}>
          <Newspaper className={`h-5 w-5 ${iconFill(isOfertas)}`} />
          <span className="text-[10px] font-medium">Jornal</span>
        </Link>

        <button onClick={() => setIsOpen(true)} className={itemClass(isOpen)}>
          <div className="relative">
            <ShoppingCart className={`h-5 w-5 ${iconFill(isOpen)}`} />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Carrinho</span>
        </button>

        <Link to={user ? "/perfil" : "/login"} className={itemClass(isProfile)}>
          <User className={`h-5 w-5 ${iconFill(isProfile)}`} />
          <span className="text-[10px] font-medium">{user ? "Perfil" : "Entrar"}</span>
        </Link>
      </div>
    </nav>
  );
}
