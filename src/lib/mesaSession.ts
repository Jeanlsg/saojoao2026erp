// Sistema de autenticação por mesa (sem necessidade de cadastro)
// Cada mesa é um login único — só um dispositivo por mesa

const STORAGE_KEY = "mesa_session";

export interface MesaSession {
  numero: number;
  nome_cliente: string;
  device_id: string;
  created_at: string;
}

export function getMesaSession(): MesaSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setMesaSession(session: MesaSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearMesaSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getDeviceId(): string {
  let id = localStorage.getItem("device_id");
  if (!id) {
    // Gera um ID único para o dispositivo
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("device_id", id);
  }
  return id;
}
