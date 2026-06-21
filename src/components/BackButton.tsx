import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BackButtonProps {
  /** Rota de destino — renderiza um <Link>. */
  to?: string;
  /** Ação de voltar — ex.: () => navigate(-1). Usado quando não há `to`. */
  onClick?: () => void;
  /** Texto ao lado do chevron. Default "Voltar" (permitido pela HIG). */
  label?: string;
  className?: string;
}

/**
 * Botão "Voltar" no padrão HIG iOS: chevron `‹` + rótulo, no canto superior
 * esquerdo, na cor de tint (primary). Área de toque ≥44pt (h-11).
 * Substitui os ícones soltos (ArrowLeft) que a HIG desaconselha para "voltar".
 */
export function BackButton({ to, onClick, label = "Voltar", className }: BackButtonProps) {
  const cls = `inline-flex items-center gap-0.5 -ml-1.5 h-11 pr-2 rounded-md text-primary hover:bg-muted/60 transition-colors ${className ?? ""}`;
  const inner = (
    <>
      <ChevronLeft className="h-6 w-6" />
      <span className="text-base font-medium">{label}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-label={label} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {inner}
    </button>
  );
}
