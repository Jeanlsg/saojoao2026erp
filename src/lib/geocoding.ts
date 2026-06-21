// Utilitários de CEP/geocoding usados pelo app.
// O cálculo de distância e geocoding agora ocorrem na edge function
// `calculate-route` (Google Geocoding + Distance Matrix). Aqui sobrou
// apenas o formatador de CEP usado na UI.

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}
