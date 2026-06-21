import { Order } from "@/contexts/AdminContext";
import { forwardRef } from "react";

interface OrderReceiptProps {
  order: Order;
  storeName?: string;
}

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Cartão Crédito",
  debito: "Cartão Débito",
};

export const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(
  ({ order, storeName = "Escola Raul Pompéia" }, ref) => {
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString("pt-BR");
    const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return (
      <div
        ref={ref}
        className="print-receipt"
        style={{
          width: "80mm",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "4mm",
          color: "#000",
          background: "#fff",
        }}
      >
        {/* Header - Cupom Fiscal Style */}
        <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>{storeName}</div>
          <div style={{ fontSize: "9px" }}>CNPJ: 00.000.000/0001-00</div>
          <div style={{ fontSize: "9px" }}>R. do Cobalto, 175 - Dom Avelar, Petrolina - PE</div>
          <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "4px" }}>CUPOM FISCAL - NÃO É DOCUMENTO FISCAL</div>
          <div style={{ fontSize: "10px" }}>Nº {order.id.slice(0, 8)}</div>
          <div style={{ fontSize: "10px" }}>{formattedDate} {formattedTime}</div>
        </div>

        {/* Customer */}
        <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
          <div style={{ fontWeight: "bold" }}>Cliente: {order.customerName || "Não informado"}</div>
          {order.customerPhone && <div>Tel: {order.customerPhone}</div>}
          {order.delivery && (
            <div style={{ marginTop: "2px" }}>
              <div style={{ fontWeight: "bold" }}>
                {order.delivery.method === "delivery" ? "📦 ENTREGA" : "🏪 RETIRADA"}
              </div>
              {order.delivery.method === "delivery" && order.delivery.address && (
                <>
                  <div>{order.delivery.address}{order.delivery.number ? `, Nº ${order.delivery.number}` : ""}</div>
                  {order.delivery.complement && <div>{order.delivery.complement}</div>}
                  {order.delivery.reference && <div>Ref: {order.delivery.reference}</div>}
                  {order.delivery.distanceKm != null && <div>Dist: ~{order.delivery.distanceKm} km</div>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>ITENS:</div>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{item.quantity}x {item.productName}</span>
              <span>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginBottom: "4px" }}>
          {order.delivery?.method === "delivery" && order.delivery.freightPrice != null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Frete:</span>
              <span>R$ {order.delivery.freightPrice.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          {order.delivery?.method === "pickup" && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Frete:</span>
              <span>GRÁTIS</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", borderTop: "1px dashed #000", paddingTop: "4px" }}>
            <span>TOTAL:</span>
            <span>R$ {order.total.toFixed(2).replace(".", ",")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span>Pagamento:</span>
            <span>{paymentLabels[order.paymentMethod || "dinheiro"] || order.paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "10px", borderTop: "1px dashed #000", paddingTop: "4px" }}>
          <div>Obrigado pela preferência!</div>
          <div style={{ marginTop: "8px" }}>.</div>
        </div>
      </div>
    );
  }
);

OrderReceipt.displayName = "OrderReceipt";
