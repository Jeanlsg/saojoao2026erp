import { MapPin, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";

const STORE_ADDRESS = "R. do Cobalto, 175 - Dom Avelar, Petrolina - PE, 56322-450";
const MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.391912083526!2d-40.5016661!3d-9.3951786!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMjMnNDMuNCJTIDQwwrAzMCcwNC4wIlc!5e0!3m2!1spt-BR!2sbr!4v1773001860996!5m2!1spt-BR!2sbr";

export default function StoreLocation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="container flex items-center gap-3 pt-1 pb-3">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-lg font-bold text-foreground">Nossa Localização</h1>
        </div>
      </header>

      {/* Map */}
      <div className="w-full">
        <iframe
          title="Localização Escola Raul Pompéia"
          src={MAPS_EMBED_URL}
          className="h-[50vh] w-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Info */}
      <div className="container space-y-6 py-6">
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Endereço</p>
              <p className="text-sm text-muted-foreground">{STORE_ADDRESS}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Horário de Funcionamento</p>
              <p className="text-sm text-muted-foreground">Segunda a Sábado: 07:00 – 22:00</p>
              <p className="text-sm text-muted-foreground">Domingo: 07:00 – 12:00</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Telefone</p>
              <p className="text-sm text-muted-foreground">(67) 3291-1234</p>
            </div>
          </div>
        </div>

        <Button className="w-full" size="lg" asChild>
          <a
            href="https://maps.app.goo.gl/NhCFynTyE175id1GA"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Abrir no Google Maps
          </a>
        </Button>
      </div>
    </div>
  );
}
