// Calcula a posição na fila de atendimento para um pedido
// Considera apenas pedidos pendentes (não entregues) ordenados por created_at ASC

export function getOrderQueuePosition<T extends { id: string; status: string; created_at: string }>(
  orderId: string,
  orders: T[]
): { position: number; total: number } | null {
  const pendingOrders = orders
    .filter((o) => o.status !== "entregue" && o.status !== "cancelado")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const index = pendingOrders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  return {
    position: index + 1,
    total: pendingOrders.length,
  };
}
