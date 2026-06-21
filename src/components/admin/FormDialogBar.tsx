import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FormDialogBarProps {
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
}

/**
 * Barra de ações de modal estilo HIG iOS para os formulários do admin:
 *   [ Cancelar ]            Título            [ Salvar ]
 * Cancelar à esquerda (discreto), Salvar à direita (primário, negrito).
 * Substitui o par DialogHeader + DialogFooter.
 *
 * IMPORTANTE: use no DialogContent a classe `[&>button]:hidden` para ocultar o
 * "X" embutido do shadcn (canto superior direito) — senão ele se sobrepõe ao Salvar.
 * Inclui o DialogTitle (obrigatório para acessibilidade do Radix Dialog).
 */
export function FormDialogBar({
  title,
  onCancel,
  onSubmit,
  submitLabel = "Salvar",
  submitDisabled,
}: FormDialogBarProps) {
  return (
    <div className="-mt-2 mb-2 flex items-center justify-between gap-2 border-b border-border pb-3">
      <Button variant="ghost" size="sm" onClick={onCancel} className="-ml-2 text-muted-foreground">
        Cancelar
      </Button>
      <DialogTitle className="flex-1 truncate text-center text-base font-semibold">
        {title}
      </DialogTitle>
      <Button size="sm" onClick={onSubmit} disabled={submitDisabled} className="font-bold">
        {submitLabel}
      </Button>
    </div>
  );
}
