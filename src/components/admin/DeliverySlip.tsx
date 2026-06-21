import { Order } from "@/contexts/AdminContext";
import { forwardRef } from "react";

interface DeliverySlipProps {
  order: Order;
  storeName?: string;
}

const paymentLabels: Record<string, string> = {
  dinheiro: "💵 Dinheiro",
  pix: "📱 Pix",
  credito: "💳 Cartão de Crédito",
  debito: "💳 Cartão de Débito",
};

export const DeliverySlip = forwardRef<HTMLDivElement, DeliverySlipProps>(
  ({ order, storeName = "Escola Raul Pompéia" }, ref) => {
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString("pt-BR");
    const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "4mm",
          color: "#000",
          background: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>🚚 FICHA DE ENTREGA</div>
          <div style={{ fontSize: "10px" }}>{storeName}</div>
          <div style={{ fontSize: "10px" }}>Pedido #{order.id.slice(0, 8)}</div>
          <div style={{ fontSize: "10px" }}>{formattedDate} {formattedTime}</div>
        </div>

        {/* Customer Info */}
        <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>📋 DADOS DO CLIENTE</div>
          <div><strong>Nome:</strong> {order.customerName || "Não informado"}</div>
          {order.customerPhone && <div><strong>Telefone:</strong> {order.customerPhone}</div>}
        </div>

        {/* Delivery Address */}
        {order.delivery && order.delivery.method === "delivery" && (
          <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>📍 ENDEREÇO DE ENTREGA</div>
            {order.delivery.address && (
              <div style={{ fontSize: "13px" }}>
                {order.delivery.address}
                {order.delivery.number ? `, Nº ${order.delivery.number}` : ""}
              </div>
            )}
            {order.delivery.complement && <div>Complemento: {order.delivery.complement}</div>}
            {order.delivery.reference && <div>Referência: {order.delivery.reference}</div>}
            {order.delivery.cep && <div>CEP: {order.delivery.cep}</div>}
            {order.delivery.distanceKm != null && (
              <div style={{ marginTop: "2px", fontSize: "11px" }}>
                Distância: ~{order.delivery.distanceKm} km
                {order.delivery.durationMin != null && ` (~${order.delivery.durationMin} min)`}
              </div>
            )}
          </div>
        )}

        {order.delivery && order.delivery.method === "pickup" && (
          <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>🏪 RETIRADA NA LOJA</div>
          </div>
        )}

        {/* Order Items */}
        <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>📦 ITENS DO PEDIDO</div>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{item.quantity}x {item.productName}</span>
              <span>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
            </div>
          ))}
        </div>

        {/* Payment & Total */}
        <div style={{ marginBottom: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span><strong>Pagamento:</strong></span>
            <span>{paymentLabels[order.paymentMethod || "dinheiro"] || order.paymentMethod}</span>
          </div>
          {order.delivery?.method === "delivery" && order.delivery.freightPrice != null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Frete:</span>
              <span>R$ {order.delivery.freightPrice.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", borderTop: "2px solid #000", paddingTop: "6px", marginTop: "4px" }}>
            <span>TOTAL:</span>
            <span>R$ {order.total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "10px", borderTop: "1px dashed #000", paddingTop: "4px" }}>
          <div>Entregue com cuidado! 🙏</div>
          <div style={{ marginTop: "8px" }}>.</div>
        </div>
      </div>
    );
  }
);

DeliverySlip.displayName = "DeliverySlip";
