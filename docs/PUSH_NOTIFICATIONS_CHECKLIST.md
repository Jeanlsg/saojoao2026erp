# 📋 Checklist: Push Notifications Fora do App

## 📊 Status Geral

**Projeto:** Favorito Supermercado Coxim (`com.mercadinho.app`)
**Firebase:** superfavoritoapp-3b2dc
**Apple Team ID:** 2T9DJQRRG3
**APNs Key ID:** FRQ6UYNH6Z

---

## ✅ CONCLUÍDO

### Android
- [x] Projeto Firebase criado (`superfavoritoapp-3b2dc`)
- [x] `google-services.json` em `android/app/`
- [x] SHA-1 de release configurado (pendente após Play Store)
- [x] google-services plugin ativo no `build.gradle`

### iOS — Apple Developer
- [x] App ID `com.mercadinho.app` criado
- [x] Capability **Push Notifications** habilitada
- [x] APNs Key criada (`AuthKey_FRQ6UYNH6Z.p8`) — salva em `secrets/`
- [x] Key ID anotado: `FRQ6UYNH6Z`
- [x] Team ID anotado: `2T9DJQRRG3`
- [x] `google-services.json` (Android) e `.p8` adicionados ao `.gitignore`

### iOS — Firebase
- [x] App iOS adicionado ao Firebase (`Favorito iOS`)
- [x] `GoogleService-Info.plist` baixado
- [x] APNs configurado no Firebase Cloud Messaging (upload do `.p8`)
- [x] Key ID e Team ID preenchidos no Firebase

### iOS — Xcode
- [x] `npx cap open ios` executado
- [x] `GoogleService-Info.plist` adicionado ao projeto Xcode
- [x] Capability **Push Notifications** adicionada
- [x] Capability **Background Modes** adicionada
- [x] **Remote notifications** marcado

### Código (Push Registration)
- [x] `src/hooks/usePushRegistration.ts` implementado
- [x] Listener de token FCM/APNs
- [x] Salva token em `device_tokens`
- [x] Tabela `device_tokens` + migration aplicada

### Workload Identity Federation (Google Cloud)
- [x] `gcloud` instalado via Homebrew
- [x] Login com `superfavoritoapp@gmail.com`
- [x] APIs ativadas:
  - [x] `iamcredentials.googleapis.com`
  - [x] `sts.googleapis.com`
  - [x] `firebase.googleapis.com`
  - [x] `orgpolicy.googleapis.com`
- [x] **Service Account** criada: `firebase-admin-manual@superfavoritoapp-3b2dc.iam.gserviceaccount.com`
- [x] **Workload Identity Pool** criado: `supabase-pool`
- [x] **OIDC Provider** criado: `supabase-provider`
- [x] Issuer URI: `https://api.supabase.com`
- [x] Audience: `supabase-edge-function`
- [x] Service Account conectada ao Pool (workloadIdentityUser)
- [x] Permissão `firebase.admin` concedida à Service Account

### Arquivos de Configuração
- [x] `.gitignore` atualizado:
  - [x] `.env`, `.env.local`, `.env.wif`, `.env.production` protegidos
  - [x] `*.p8` e `AuthKey_*.p8` protegidos
  - [x] `secrets/` protegido
  - [x] `.env.example-wif` versionado
- [x] `.env.example-wif` criado (template versionado)
- [x] `.env.wif` criado (valores reais, não versionado)
- [x] `gcloud/` adicionado ao projeto (referência local)

### Edge Functions (parcialmente)
- [x] Helper compartilhado criado: `supabase/functions/_shared/wif-auth.ts`
- [x] `send-push-notification/index.ts` atualizada para usar WIF

---

## 🔄 EM ANDAMENTO

### Edge Functions (falta atualizar)
- [ ] `notify-order-status/index.ts` — atualizar para usar `getFirebaseAccessToken()` do WIF
- [ ] `send-promo-push/index.ts` — atualizar para usar `getFirebaseAccessToken()` do WIF

---

## ⏳ PENDENTE (ordem de prioridade)

### Supabase — Secrets nas Edge Functions
Para cada uma das 3 funções:
- [ ] `send-push-notification`
- [ ] `notify-order-status`
- [ ] `send-promo-push`

Adicionar **3 secrets** em cada:
- [ ] `GCP_PROJECT_ID` = `105868420375`
- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER` = `projects/105868420375/locations/global/workloadIdentityPools/supabase-pool/providers/supabase-provider`
- [ ] `GCP_SERVICE_ACCOUNT_EMAIL` = `firebase-admin-manual@superfavoritoapp-3b2dc.iam.gserviceaccount.com`

### Supabase — GUCs do Postgres
- [ ] Configurar `app.supabase_url` no banco
- [ ] Configurar `app.service_role_key` no banco
- [ ] Rodar `select pg_reload_conf();`

### Deploy das Edge Functions
- [ ] `supabase functions deploy send-push-notification`
- [ ] `supabase functions deploy notify-order-status`
- [ ] `supabase functions deploy send-promo-push`

### Testes
- [ ] `npm run build && npx cap sync`
- [ ] Instalar app em **device real** (Android e/ou iOS)
- [ ] Login com conta admin no app
- [ ] Ativar push nas **Configurações** do admin
- [ ] Fazer pedido de teste (de outra conta)
- [ ] Verificar notificação chega **com app fechado**
- [ ] Verificar notificação chega **com celular bloqueado**
- [ ] Tap na notificação abre tela correta (deep link)

---

## 📝 Comandos para continuar

### 1. Atualizar as 2 funções restantes
```bash
# Substituir o trecho de getFirebaseAccessToken por:
# import { getFirebaseAccessToken } from "../_shared/wif-auth.ts";
# E remover o uso de Deno.env.get("FCM_SERVICE_ACCOUNT")
```

### 2. Deploy das Edge Functions
```bash
supabase functions deploy send-push-notification
supabase functions deploy notify-order-status
supabase functions deploy send-promo-push
```

### 3. Configurar GUCs (Supabase SQL Editor)
```sql
alter database postgres set "app.supabase_url" = 'https://fjprpiucjrqoauowekuk.supabase.co';
alter database postgres set "app.service_role_key" = 'eyJhbG...SEU_TOKEN_AQUI';
select pg_reload_conf();
```

### 4. Adicionar Secrets no Supabase
Para cada uma das 3 funções, em **Edge Functions > [nome] > Secrets**:
- `GCP_PROJECT_ID` = `105868420375`
- `GCP_WORKLOAD_IDENTITY_PROVIDER` = `projects/105868420375/locations/global/workloadIdentityPools/supabase-pool/providers/supabase-provider`
- `GCP_SERVICE_ACCOUNT_EMAIL` = `firebase-admin-manual@superfavoritoapp-3b2dc.iam.gserviceaccount.com`

### 5. Build e testar
```bash
cd /Users/jeanlsg/Documents/programas/sites/mercadinhotestejl
npm run build
npx cap sync
# Android: npx cap open android → Run em device
# iOS: npx cap open ios → Run em device (NÃO simulador)
```

---

## 🔗 Links Úteis

| Recurso | Link |
|---------|------|
| Firebase Console | https://console.firebase.google.com/u/0/project/superfavoritoapp-3b2dc |
| Firebase Cloud Messaging | https://console.firebase.google.com/u/0/project/superfavoritoapp-3b2dc/settings/cloudmessaging |
| Apple Developer Identifiers | https://developer.apple.com/account/resources/identifiers/list |
| Apple APNs Keys | https://developer.apple.com/account/resources/authkeys/list |
| Supabase Edge Functions | https://supabase.com/dashboard/project/fjprpiucjrqoauowekuk/functions |
| Supabase SQL Editor | https://supabase.com/dashboard/project/fjprpiucjrqoauowekuk/sql/new |
| Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |

---

## 💾 Valores importantes salvos

```
GCP_PROJECT_ID=105868420375
GCP_WORKLOAD_IDENTITY_POOL=projects/105868420375/locations/global/workloadIdentityPools/supabase-pool
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/105868420375/locations/global/workloadIdentityPools/supabase-pool/providers/supabase-provider
GCP_SERVICE_ACCOUNT_EMAIL=firebase-admin-manual@superfavoritoapp-3b2dc.iam.gserviceaccount.com
APNS_KEY_ID=FRQ6UYNH6Z
APNS_TEAM_ID=2T9DJQRRG3
BUNDLE_ID=com.mercadinho.app
APPS_APPLE_ID=jeanlsg2001@gmail.com
APPS_FIREBASE=superfavoritoapp@gmail.com
APPS_SUPABASE=... (verificar)
```

---

## 📅 Última atualização

27 de maio de 2025 — 23h

**Boa noite! 🌙 Ao voltar, comece pela seção "🔄 EM ANDAMENTO" e depois "⏳ PENDENTE".**
