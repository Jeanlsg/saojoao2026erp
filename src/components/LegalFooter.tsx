import { Link } from "react-router-dom";
import { FileText, Shield } from "lucide-react";

/**
 * Footer minimalista com links legais.
 * Usado em páginas públicas (Index, Login, etc.)
 */
export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/termos" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <FileText className="h-3 w-3" />
          Termos
        </Link>
        <span className="text-border">•</span>
        <Link to="/privacidade" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Shield className="h-3 w-3" />
          Privacidade
        </Link>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-2">
        Escola Raul Pompéia • Arraiá da Escola Raul Pompéia
      </p>
    </footer>
  );
}
