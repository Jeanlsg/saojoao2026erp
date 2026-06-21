# Push Notifications — Setup Completo (FCM + APNs)

Guia passo-a-passo para ativar push notifications **reais** (que funcionam com
o app totalmente fechado ou celular bloqueado).

---

## Visão geral da arquitetura

```
[ Cliente faz pedido ]
        ↓
[ INSERT em orders ]
        ↓ trigger pg_net
[ Edge Function send-push-notification ]
        ↓ FCM HTTP v1
[ Google FCM ]
        ↓ entrega
[ Celulares dos admins ]

[ Admin muda status do pedido ]
        ↓
[ UPDATE em orders (status changed) ]
        ↓ trigger pg_net
[ Edge Function notify-order-status ]
        ↓ FCM HTTP v1
[ Celular do cliente ]

[ Admin envia promoção ]
        ↓
[ Edge Function send-promo-push ]
        ↓ FCM HTTP v1
[ Todos os clientes com token ]
```

Componentes envolvidos:

| Onde | O que | Status |
|------|-------|--------|
| `supabase/migrations/...device_tokens_and_push_trigger.sql` | Tabela + trigger novo pedido | ✅ pronto |
| `supabase/migrations/...order_status_push_trigger.sql` | Trigger mudança de status | ✅ pronto |
| `supabase/functions/send-push-notification/index.ts` | Push para admins (novo pedido) | ✅ pronto |
| `supabase/functions/notify-order-status/index.ts` | Push para cliente (status mudou) | ✅ pronto |
| `supabase/functions/send-promo-push/index.ts` | Push de promoção (admin → todos) | ✅ pronto |
| `src/hooks/usePushRegistration.ts` | Registra token FCM no Supabase | ✅ pronto |
| Firebase Project + Service Account | Externo | ⚠️ você faz |
| `google-services.json` em `android/app/` | Android | ✅ já existe |
| `GoogleService-Info.plist` em `ios/App/App/` | iOS | ⚠️ você faz |
| APNs key no Firebase | iOS | ⚠️ você faz |
| `FCM_SERVICE_ACCOUNT` em Supabase secrets | Edge Functions | ⚠️ você faz |
| `app.supabase_url` + `app.service_role_key` em DB GUCs | Triggers | ⚠️ você faz |

---

## Passo 1 — Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. **Add project** → nome livre (ex.: "Favorito Supermercado")
3. Pode pular Google Analytics se quiser

---

## Passo 2 — Configurar Android

1. No [Firebase Console](https://console.firebase.google.com), ícone de Android **(adicionar app Android)**
2. **Android package name**: `com.mercadinho.app` (mesmo do `capacitor.config.ts`)
3. **App nickname**: livre (ex.: "Favorito Android")
4. **SHA-1**: opcional para FCM básico
5. **Download `google-services.json`**
6. Coloque o arquivo em:
   ```
   android/app/google-services.json
   ```
7. O `build.gradle` do app já tem o bloco que detecta o arquivo e ativa o plugin
   `com.google.gms.google-services` automaticamente:
   ```gradle
   try {
     def servicesJSON = file('google-services.json')
     if (servicesJSON.text) {
       apply plugin: 'com.google.gms.google-services'
     }
   } catch(Exception e) { ... }
   ```
8. No `android/build.gradle` (root), adicione na seção `dependencies` do `buildscript` (se ainda não tiver):
   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```

---

## Passo 3 — Configurar iOS

1. No [Firebase Console](https://console.firebase.google.com), ícone de iOS **(adicionar app iOS)**
2. **Bundle ID**: `com.mercadinho.app`
3. Download `GoogleService-Info.plist`
4. Abra `ios/App/App.xcworkspace` no Xcode (no Mac)
5. Arraste o `GoogleService-Info.plist` para a pasta `App` no project navigator
   (marque "Copy items if needed" e o target `App`)
6. **Capabilities**: target `App` → **Signing & Capabilities** → **+ Capability** → **Push Notifications**
7. Também adicione **Background Modes** → marque **Remote notifications**

### APNs Key (necessária para iOS)

1. [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) → **+**
2. Marque "Apple Push Notifications service (APNs)" → Continue → Register
3. **Download** o arquivo `.p8` (você só pode baixar uma vez!)
4. Anote o **Key ID** e o **Team ID** (visível em [Membership](https://developer.apple.com/account#MembershipDetailsCard))
5. No [Firebase Console → Project Settings → Cloud Messaging](https://console.firebase.google.com/project/_/settings/cloudmessaging) → seção **Apple app configuration** → **Upload** o `.p8`
6. Cole Key ID + Team ID

---

## Passo 4 — Service Account JSON (para a Edge Function)

1. [Firebase Console → Project Settings → Service Accounts](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk)
2. Clique em **Generate new private key** → confirma
3. Um arquivo `.json` é baixado (chave privada — **mantenha em sigilo**)
4. Abra o arquivo, copie **TODO o conteúdo** (incluindo `{` e `}`)
5. No [Supabase Dashboard → Edge Functions](https://supabase.com/dashboard/project/fjprpiucjrqoauowekuk/functions):
   - Selecione cada função (`send-push-notification`, `notify-order-status`, `send-promo-push`)
   - Aba **Secrets** → **Add secret**
   - Nome: `FCM_SERVICE_ACCOUNT`
   - Valor: cole o JSON inteiro
   - **Save**

---

## Passo 5 — Configurar GUCs do Postgres (para os triggers funcionarem)

Os triggers precisam saber a URL do Supabase e o service_role_key para chamar
as Edge Functions. Configure UMA VEZ no [SQL Editor do Supabase](https://supabase.com/dashboard/project/fjprpiucjrqoauowekuk/sql/new):

```sql
alter database postgres set "app.supabase_url" = 'https://fjprpiucjrqoauowekuk.supabase.co';
alter database postgres set "app.service_role_key" = 'SEU_SERVICE_ROLE_KEY';
```

> O `service_role_key` está em [Project Settings → API](https://supabase.com/dashboard/project/fjprpiucjrqoauowekuk/settings/api) → `service_role` (secret).
> Trate como senha — ele tem privilégios totais.

Depois, recarregue as GUCs:
```sql
select pg_reload_conf();
```

---

## Passo 6 — Deploy das Edge Functions

Com o Supabase CLI:

```bash
supabase functions deploy send-push-notification
supabase functions deploy notify-order-status
supabase functions deploy send-promo-push
```

Ou pelo Dashboard:
1. **Edge Functions** → **Create a new function** para cada uma
2. Cole o conteúdo do respectivo `index.ts`
3. **Deploy**

> Importante: adicione o secret `FCM_SERVICE_ACCOUNT` em CADA uma das 3 funções.

---

## Passo 7 — Aplicar as migrations

As migrations criam:
- `20260508120000_device_tokens_and_push_trigger.sql`: Tabela `device_tokens` + trigger para novo pedido
- `20260527120100_order_status_push_trigger.sql`: Trigger para mudança de status do pedido

Aplique pelo CLI:
```bash
supabase db push
```

Ou cole o SQL de cada arquivo no **SQL Editor** do Dashboard.

---

## Passo 8 — Build & instalar o app

No Mac (para iOS) ou Windows (Android Studio):

```bash
npm install
npm run build
npx cap sync
# iOS:
npx cap open ios
# Android:
npx cap open android
```

No app instalado:
1. Login com conta admin
2. **Configurações → Push real (app fechado) → ON**
3. Sistema pede permissão → ✅ Permitir
4. Faça um pedido pelo app cliente (em outro device ou aba anônima)
5. Notificação chega no celular do admin **mesmo com o app fechado**
6. Toque na notificação → app abre direto em `/admin/pedidos`

---

## Troubleshooting

### "FCM_SERVICE_ACCOUNT não configurado"
- Edge Function não tem a secret. Vá em Edge Functions → send-push-notification → Secrets.

### Notificação não chega (mas Edge Function retorna `sent: 1`)
- Token expirado: é raro, mas FCM marca como `UNREGISTERED` e a função apaga sozinho.
  Reabra o app — um novo token será registrado.
- iOS: verifique se Push Notifications + Background Modes (Remote notifications) estão habilitados no Xcode.
- Android: verifique se `google-services.json` está em `android/app/` (não em `android/`).

### Trigger não dispara
- Confirme as GUCs:
  ```sql
  select current_setting('app.supabase_url', true);
  select current_setting('app.service_role_key', true);
  ```
  Devem retornar valores (não vazios).
- Confirme que a extensão pg_net está ativada:
  ```sql
  select extname from pg_extension where extname = 'pg_net';
  ```
- Cheque os logs da Edge Function no Dashboard.

### Cliente comum recebe notificação de novo pedido
- Não deveria — a Edge Function `send-push-notification` só lê tokens cujos `user_id` estão em `user_roles` com `role='admin'`. Confirme que o cliente comum não está na tabela `user_roles` como admin por engano.

---

## Push de Promoções (admin)

Para enviar push de promoção para todos os clientes, chame a Edge Function
`send-promo-push` passando o token do admin autenticado:

```ts
const { data, error } = await supabase.functions.invoke("send-promo-push", {
  body: {
    title: "🔥 Oferta Relâmpago!",
    body: "Arroz 5kg por apenas R$ 19,90 — só hoje!",
    route: "/ofertas", // rota que abre ao tocar na notificação
  },
});
// data = { sent: 142, attempted: 150, invalidatedTokens: 3 }
```

A função valida que quem chama é admin (via token JWT). Envia para TODOS os
dispositivos registrados em batches de 50.

---

## Sons customizados nas push reais

A Edge Function envia o payload com:
- Android: `sound: "new_order"` (esperado em `android/app/src/main/res/raw/new_order.mp3`)
- iOS: `sound: "new-order.mp3"` (esperado no bundle do Xcode)

Se o arquivo não existir, o sistema cai para som padrão de notificação.
Veja [public/sounds/README.md](public/sounds/README.md) para detalhes.

---

## Custos

- **FCM**: gratuito (Google não cobra por mensagens FCM padrão)
- **Supabase Edge Functions**: free tier inclui 500K invocações/mês, suficiente
  para milhares de pedidos/dia
- **APNs**: gratuito, mas precisa de Apple Developer Program ($99/ano para publicar na App Store)

---

## Privacidade

A tabela `device_tokens`:
- RLS: usuário só vê os próprios tokens
- Service role lê todos (necessário para a Edge Function enviar push)
- Tokens são deletados em cascata se o usuário for excluído (`on delete cascade`)
- Tokens inválidos são limpos automaticamente quando o FCM responde `UNREGISTERED`
