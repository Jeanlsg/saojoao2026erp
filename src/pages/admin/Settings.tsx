import { useEffect, useState } from "react";
import { supabase, SUPABASE_INFO } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings as SettingsIcon,
  Volume2,
  Bell,
  Smartphone,
  Printer,
  Truck,
  Workflow,
  Check,
  X,
  Database,
  Loader2,
  Radio,
  Calendar,
  Clock,
  MapPin,
  PartyPopper,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useOrderNotification } from "@/hooks/useOrderNotification";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";

const db = supabase as any;

export default function Settings() {
  const { toast } = useToast();
  const [autoAccept, setAutoAccept] = useState(false);
  const [loading, setLoading] = useState(true);

  // === Estado do evento ===
  const [eventName, setEventName] = useState("Arraiá da Escola Raul Pompéia");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("R. do Cobalto, 175 - Dom Avelar, Petrolina - PE");
  const [eventDescription, setEventDescription] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  const { prefs, update, requestBrowserPermission, requestMobilePermission } =
    useNotificationPreferences();
  const { notify } = useOrderNotification();
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  // === Estado do diagnóstico do banco ===
  type DBStatus = "idle" | "testing" | "ok" | "fail";
  const [dbStatus, setDbStatus] = useState<DBStatus>("idle");
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [rtStatus, setRtStatus] = useState<DBStatus>("idle");
  const [rtError, setRtError] = useState<string | null>(null);

  useEffect(() => {
    // Carrega auto_accept_orders
    db.from("store_settings")
      .select("*")
      .eq("key", "auto_accept_orders")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setAutoAccept(data.value === "true");
        setLoading(false);
      });

    // Carrega configurações do evento
    loadEventSettings();
  }, []);

  const loadEventSettings = async () => {
    const { data } = await db
      .from("store_settings")
      .select("*")
      .in("key", [
        "event_name",
        "event_date",
        "event_start_time",
        "event_end_time",
        "event_location",
        "event_description",
      ]);

    if (data) {
      data.forEach((row: any) => {
        if (row.key === "event_name") setEventName(row.value || "Arraiá da Escola Raul Pompéia");
        if (row.key === "event_date") setEventDate(row.value || "");
        if (row.key === "event_start_time") setEventStartTime(row.value || "");
        if (row.key === "event_end_time") setEventEndTime(row.value || "");
        if (row.key === "event_location") setEventLocation(row.value || "R. do Cobalto, 175 - Dom Avelar, Petrolina - PE");
        if (row.key === "event_description") setEventDescription(row.value || "");
      });
    }
  };

  const handleSaveEvent = async () => {
    setSavingEvent(true);
    try {
      const settings = [
        { key: "event_name", value: eventName },
        { key: "event_date", value: eventDate },
        { key: "event_start_time", value: eventStartTime },
        { key: "event_end_time", value: eventEndTime },
        { key: "event_location", value: eventLocation },
        { key: "event_description", value: eventDescription },
      ];

      for (const s of settings) {
        const { error } = await db.from("store_settings").upsert(
          { key: s.key, value: s.value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
        if (error) throw error;
      }

      toast({ title: "✓ Configurações do evento salvas!" });
    } catch (err: any) {
      console.error("Erro ao salvar evento:", err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleAutoAccept = async (checked: boolean) => {
    setAutoAccept(checked);
    await db.from("store_settings").upsert(
      { key: "auto_accept_orders", value: String(checked), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    toast({ title: checked ? "Aceite automático ativado" : "Aceite automático desativado" });
  };

  const handleBrowserToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestBrowserPermission();
      setBrowserPermission(Notification.permission);
      if (!granted) {
        toast({
          title: "Permissão negada",
          description: "Habilite notificações nas configurações do navegador.",
          variant: "destructive",
        });
        return;
      }
    }
    update("browserPush", checked);
  };

  const handleMobileToggle = async (checked: boolean) => {
    if (checked) {
      if (!isNative) {
        toast({
          title: "Disponível só no app",
          description: "Notificações nativas funcionam apenas no app instalado no celular.",
          variant: "destructive",
        });
        return;
      }
      const granted = await requestMobilePermission();
      if (!granted) {
        toast({
          title: "Permissão negada",
          description: "Habilite notificações nas configurações do app.",
          variant: "destructive",
        });
        return;
      }
    }
    update("mobilePush", checked);
  };

  const handleTest = () => {
    notify("🔔 Teste — Escola Raul Pompéia", "Esta é uma notificação de teste do painel administrativo.", {
      forceSound: true,
    });
    toast({ title: "Notificação de teste enviada" });
  };

  /** Testa SELECT real no banco e mede latência. */
  const handleTestDB = async () => {
    setDbStatus("testing");
    setDbError(null);
    setDbLatency(null);
    const t0 = performance.now();
    try {
      // Tabela `categories` é pequena e tem RLS public — bom alvo de teste
      const { error } = await supabase.from("categories").select("id").limit(1);
      const dt = Math.round(performance.now() - t0);
      if (error) {
        setDbStatus("fail");
        setDbError(error.message);
      } else {
        setDbStatus("ok");
        setDbLatency(dt);
      }
    } catch (err) {
      setDbStatus("fail");
      setDbError(err instanceof Error ? err.message : String(err));
    }
  };

  /** Testa o canal realtime — abre, espera SUBSCRIBED, fecha. */
  const handleTestRealtime = async () => {
    setRtStatus("testing");
    setRtError(null);
    const channel = supabase.channel(`diag-${Date.now()}`);
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setRtStatus("fail");
        setRtError("Timeout 5s — realtime não respondeu");
        supabase.removeChannel(channel);
      }
    }, 5000);
    channel.subscribe((status) => {
      if (resolved) return;
      if (status === "SUBSCRIBED") {
        resolved = true;
        clearTimeout(timer);
        setRtStatus("ok");
        supabase.removeChannel(channel);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        resolved = true;
        clearTimeout(timer);
        setRtStatus("fail");
        setRtError(status);
        supabase.removeChannel(channel);
      }
    });
  };


  if (loading)
    return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h2 className="text-xl sm:text-2xl font-bold">Configurações</h2>
      </div>

      {/* === Configurações do Evento === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-primary" />
            Configurações do Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome do evento */}
          <div className="space-y-1">
            <Label htmlFor="event-name" className="flex items-center gap-2">
              <PartyPopper className="h-3.5 w-3.5" />
              Nome do Evento
            </Label>
            <Input
              id="event-name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Arraiá da Escola Raul Pompéia"
            />
          </div>

          {/* Data e horários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="event-date" className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Data
              </Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-start" className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Início
              </Label>
              <Input
                id="event-start"
                type="time"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-end" className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Término
              </Label>
              <Input
                id="event-end"
                type="time"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Local */}
          <div className="space-y-1">
            <Label htmlFor="event-location" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Local
            </Label>
            <Input
              id="event-location"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="Endereço do evento"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="event-description">Descrição (opcional)</Label>
            <Textarea
              id="event-description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Informações adicionais sobre o evento..."
              rows={3}
            />
          </div>

          {/* Preview do evento */}
          {(eventName || eventDate || eventStartTime) && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Preview:</p>
              <p className="font-bold">{eventName || "Nome do Evento"}</p>
              {eventDate && (
                <p className="text-sm text-muted-foreground">
                  📅 {new Date(eventDate + "T00:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              {(eventStartTime || eventEndTime) && (
                <p className="text-sm text-muted-foreground">
                  🕐 {eventStartTime} {eventEndTime && `até ${eventEndTime}`}
                </p>
              )}
              {eventLocation && (
                <p className="text-sm text-muted-foreground">📍 {eventLocation}</p>
              )}
            </div>
          )}

          {/* Botão salvar */}
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              onClick={handleSaveEvent}
              disabled={savingEvent}
              className="gap-1.5"
            >
              {savingEvent ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Salvar configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === Notificações === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações de pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefRow
            icon={<Volume2 className="h-4 w-4" />}
            label="Alerta sonoro"
            hint="Toca um bipe duplo quando chega pedido novo (precisa do app aberto)."
            checked={prefs.sound}
            onChange={(v) => update("sound", v)}
          />

          <PrefRow
            icon={<Bell className="h-4 w-4" />}
            label="Notificação no navegador"
            hint={
              browserPermission === "denied"
                ? "Bloqueada. Vá nas configurações do navegador para liberar."
                : "Aparece notificação do sistema mesmo com a aba em segundo plano."
            }
            checked={prefs.browserPush && browserPermission === "granted"}
            onChange={handleBrowserToggle}
            disabled={browserPermission === "denied"}
          />

          <PrefRow
            icon={<Smartphone className="h-4 w-4" />}
            label="Notificação no celular (app aberto)"
            hint={
              !isNative
                ? "Disponível apenas no app instalado (Android/iOS)."
                : "Funciona com o app em background, mas pode parar se o sistema matar o app."
            }
            checked={prefs.mobilePush && isNative}
            onChange={handleMobileToggle}
            disabled={!isNative}
          />


          <div className="pt-2 border-t border-border flex justify-end">
            <Button variant="outline" size="sm" onClick={handleTest} className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Testar agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === Impressão automática === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            Impressão automática
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefRow
            icon={<Printer className="h-4 w-4" />}
            label="Cupom do pedido"
            hint="Imprime automaticamente o cupom assim que o pedido entra."
            checked={prefs.autoPrintReceipt}
            onChange={(v) => update("autoPrintReceipt", v)}
          />

          <PrefRow
            icon={<Truck className="h-4 w-4" />}
            label="Ficha de entrega"
            hint="Para pedidos com entrega, imprime ficha do entregador junto com o cupom."
            checked={prefs.autoPrintDelivery}
            onChange={(v) => update("autoPrintDelivery", v)}
          />
        </CardContent>
      </Card>

      {/* === Fluxo de pedidos === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            Fluxo de pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="auto-accept" className="text-sm font-medium block">
                Homologação automática
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pedidos novos passam de "Pendente" para "Preparando" sem ação manual
                (estoque é decrementado em ambos os casos).
              </p>
            </div>
            <Switch id="auto-accept" checked={autoAccept} onCheckedChange={handleAutoAccept} />
          </div>
        </CardContent>
      </Card>

      {/* === Diagnóstico do Banco de Dados (Supabase) === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Banco de dados
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs sm:text-sm">
          <DiagRow label="URL" value={SUPABASE_INFO.url} mono />
          <DiagRow label="Anon key" value={SUPABASE_INFO.keyPreview} mono />
          <DiagRow
            label="Sessão atual"
            value={user ? user.email ?? "logado" : "deslogado"}
            ok={!!user}
          />

          {/* Botões de teste */}
          <div className="pt-2 mt-1 border-t border-border flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestDB}
              disabled={dbStatus === "testing"}
              className="gap-1.5"
            >
              {dbStatus === "testing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              Testar SELECT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestRealtime}
              disabled={rtStatus === "testing"}
              className="gap-1.5"
            >
              {rtStatus === "testing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Radio className="h-3.5 w-3.5" />
              )}
              Testar Realtime
            </Button>
          </div>

          {/* Resultado SELECT */}
          {dbStatus === "ok" && (
            <DiagRow
              label="SELECT (categorias)"
              value={`OK em ${dbLatency} ms`}
              ok
            />
          )}
          {dbStatus === "fail" && (
            <DiagRow label="SELECT (categorias)" value={dbError ?? "falhou"} ok={false} />
          )}

          {/* Resultado Realtime */}
          {rtStatus === "ok" && <DiagRow label="Realtime (WebSocket)" value="conectado" ok />}
          {rtStatus === "fail" && (
            <DiagRow label="Realtime (WebSocket)" value={rtError ?? "falhou"} ok={false} />
          )}
        </CardContent>
      </Card>

      {/* === Status do dispositivo / permissões === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs sm:text-sm">
          <DiagRow label="Plataforma" value={isNative ? `App nativo (${Capacitor.getPlatform()})` : "Navegador"} />
          <DiagRow
            label="Permissão do navegador"
            value={browserPermission}
            ok={browserPermission === "granted"}
          />
          <DiagRow
            label="Notificação nativa disponível"
            value={isNative ? "Sim" : "Não (rode no app)"}
            ok={isNative}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface PrefRowProps {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function PrefRow({ icon, label, hint, checked, onChange, disabled }: PrefRowProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium block">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

interface DiagRowProps {
  label: string;
  value: string;
  ok?: boolean;
  mono?: boolean;
}

function DiagRow({ label, value, ok, mono }: DiagRowProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={`flex items-center gap-1.5 font-medium text-foreground text-right break-all ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {ok === true && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
        {ok === false && <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
        <span className="min-w-0 break-all">{value}</span>
      </span>
    </div>
  );
}
