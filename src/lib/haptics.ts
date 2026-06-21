// Haptics (Taptic Engine) — feedback tátil seguindo a HIG do iOS.
// No-op no navegador (só dispara em app nativo iOS/Android via Capacitor),
// e nunca lança erro: se o plugin falhar, ignora silenciosamente.
import { Capacitor } from "@capacitor/core";

let Haptics: any;
let ImpactStyle: any;
let NotificationType: any;
let loaded = false;
let loading = false;

// Lazy load haptics module only when needed in native context
const loadHaptics = async () => {
  if (loaded || !Capacitor.isNativePlatform()) return;
  if (loading) {
    // Wait for existing load to complete
    while (loading) await new Promise(r => setTimeout(r, 10));
    return;
  }

  loading = true;
  try {
    const module = await import("@capacitor/haptics");
    Haptics = module.Haptics;
    ImpactStyle = module.ImpactStyle;
    NotificationType = module.NotificationType;
    loaded = true;
  } catch {
    /* plugin indisponível — ignora */
  } finally {
    loading = false;
  }
};

const isNative = () => Capacitor.isNativePlatform();
const safe = (fn: () => Promise<unknown>) => {
  if (!isNative()) return;
  try {
    void fn().catch(() => undefined);
  } catch {
    /* plugin indisponível — ignora */
  }
};

/** Toque leve — ações comuns (ex.: adicionar item ao carrinho). */
export const tapLight = () => {
  void loadHaptics().then(() => {
    safe(() => Haptics?.impact?.({ style: ImpactStyle?.Light }) ?? Promise.resolve());
  });
};

/** Toque médio — navegação / abrir modal. */
export const tapMedium = () => {
  void loadHaptics().then(() => {
    safe(() => Haptics?.impact?.({ style: ImpactStyle?.Medium }) ?? Promise.resolve());
  });
};

/** Sucesso — salvar, finalizar pedido, ativar switch. */
export const haptOk = () => {
  void loadHaptics().then(() => {
    safe(() => Haptics?.notification?.({ type: NotificationType?.Success }) ?? Promise.resolve());
  });
};

/** Erro — validação falhou, pedido não enviado. */
export const haptErr = () => {
  void loadHaptics().then(() => {
    safe(() => Haptics?.notification?.({ type: NotificationType?.Error }) ?? Promise.resolve());
  });
};

/** Seleção — mudar quantidade, trocar valor em picker. */
export const haptSelect = () => {
  void loadHaptics().then(() => {
    safe(() => Haptics?.selectionChanged?.() ?? Promise.resolve());
  });
};
