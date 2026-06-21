import { useState, useEffect } from "react";
import { Clock, MapPin, ShoppingCart, User, LogOut, Settings, Package, Utensils } from "lucide-react";
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

  useEffect(() => {
    // Quando o usuário muda (login/logout), recarrega a mesa
    setMesa(getMesaSession());
  }, [user]);

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
          {user ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/perfil">
                <User className="h-4 w-4 mr-1" /> {profile?.full_name?.split(" ")[0] || "Perfil"}
              </Link>
            </Button>
          ) : null}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                clearMesaSession();
                window.location.href = "/selecionar-mesa";
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          )}
          <CartButton />
        </div>

        {/* Mobile: only cart button visible in header */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/admin">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => {
                await signOut();
                clearMesaSession();
                window.location.href = "/selecionar-mesa";
              }}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
          <CartButton />
        </div>
      </div>
    </header>
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
