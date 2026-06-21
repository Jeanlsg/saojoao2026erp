import { useAuth } from "@/contexts/AuthContext";
import { Flame } from "lucide-react";

export function HeroBanner() {
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Cliente";

  return (
    <section className="container py-3 sm:py-4">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/90 to-primary p-4 sm:p-6 md:p-8 text-primary-foreground">
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold opacity-90 mb-1">
            <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Ofertas do dia
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight">
            Olá, {firstName}!
          </h2>
          <p className="mt-1.5 text-sm opacity-90">
            Bem-vindo ao <span className="font-bold">Arraiá da Escola Raul Pompéia</span>! Aproveite <span className="font-bold underline">comidas típicas</span>, lanches, bebidas e brinquedos. Venha participar da nossa Festa Junina! 🎉
          </p>
          <button
            onClick={() => {
              document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="mt-4 rounded-full bg-card text-foreground px-5 py-2.5 text-sm font-bold shadow-lg transition-transform active:scale-95 hover:shadow-xl"
          >
            Ver Produtos
          </button>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary-foreground/10" />
        <div className="absolute -right-4 bottom-0 h-28 w-28 rounded-full bg-primary-foreground/5" />
        <div className="absolute right-20 top-4 h-16 w-16 rounded-full bg-primary-foreground/10" />
      </div>
    </section>
  );
}
