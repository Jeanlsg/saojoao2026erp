import { useEffect, useState } from "react";
import { Copy, Check, X, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface LocalPixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  total: number;
}

/**
 * Dialog PIX local (sem integração com banco).
 *
 * Fluxo:
 * 1. Cliente finaliza o pedido
 * 2. Este dialog gera um QR Code PIX com o valor exato da compra
 * 3. Cliente paga pelo app do banco
 * 4. Cliente mostra o comprovante ao responsável do evento
 * 5. Admin marca o pedido como "Pago" no painel → baixa no estoque acontece
 */
export function LocalPixDialog({
  open,
  onOpenChange,
  orderId,
  total,
}: LocalPixDialogProps) {
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<{ brCode: string; qrCodeUrl: string } | null>(null);

  // Gera o QR Code PIX ao abrir o dialog
  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;

    const generate = async () => {
      try {
        // Import dinâmico para evitar carregar a lib em outras telas
        const { generatePixPayload } = await import("@/lib/pix");

        // Configuração padrão — virá do store_settings (configurável pelo admin depois)
        const pixConfig = {
          pixKey: "87999999999", // TODO: pegar do store_settings (chave PIX real)
          merchantName: "Escola Raul Pompeia",
          merchantCity: "Petrolina",
          cep: "56322-450",
        };

        // txid curto = primeiros 8 chars do id do pedido
        const txid = orderId.replace(/-/g, "").substring(0, 8).toUpperCase();

        const data = generatePixPayload(total, txid, pixConfig);

        if (!cancelled) setPixData(data);
      } catch (err) {
        console.error("PIX gen error:", err);
        toast({
          title: "Erro ao gerar PIX",
          description: "Tente novamente ou pague em dinheiro.",
          variant: "destructive",
        });
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [open, orderId, total]);

  const copyBrCode = async () => {
    if (!pixData?.brCode) return;
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Pagar com PIX
            <Badge variant="outline" className="ml-auto">
              R$ {total.toFixed(2).replace(".", ",")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instruções */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300">
            <strong>Como pagar:</strong>
            <ol className="mt-1 list-decimal pl-4 space-y-0.5">
              <li>Abra o app do seu banco</li>
              <li>Escolha pagar com PIX QR Code</li>
              <li>Escaneie o código abaixo</li>
              <li>Confirme o valor de <strong>R$ {total.toFixed(2).replace(".", ",")}</strong></li>
              <li>Mostre o comprovante ao caixa 🍡</li>
            </ol>
          </div>

          {/* QR Code */}
          {pixData && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center bg-white p-4 rounded-lg border-2 border-border">
                <img
                  src={pixData.qrCodeUrl}
                  alt="QR Code PIX"
                  className="w-56 h-56"
                  loading="eager"
                />
              </div>

              {/* Código copia-e-cola */}
              <Button
                variant="outline"
                onClick={copyBrCode}
                className="w-full"
                size="lg"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Código copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar código PIX (se preferir digitar)
                  </>
                )}
              </Button>

              {/* Detalhes */}
              <div className="w-full text-center text-xs text-muted-foreground space-y-1">
                <p>
                  Pedido:{" "}
                  <code className="text-foreground">#{orderId.slice(0, 8).toUpperCase()}</code>
                </p>
                <p className="text-[10px]">
                  Após pagar, mostre o comprovante ao caixa para confirmação.
                </p>
              </div>
            </div>
          )}

          {!pixData && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
