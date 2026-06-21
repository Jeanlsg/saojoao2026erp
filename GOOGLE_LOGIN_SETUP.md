# Login Google Nativo (iOS + Android) — Setup

Esse guia cobre o login Google **dentro do app** (sem abrir Safari/Chrome em separado),
usando o SDK nativo do Google Sign-In via `@capgo/capacitor-social-login`.

## Por que essa abordagem

A versão anterior abria o navegador via `Browser.open` e dependia de URL scheme
customizado (`com.mercadinho.app://auth/callback`) para retornar ao app. **Isso
falha no iOS** porque o SFSafariViewController bloqueia redirects para esquemas
custom — a aba fica presa, o app não volta.

A solução nativa:
1. SDK do Google abre um popup interno do iOS/Android (não é Safari)
2. Usuário escolhe a conta Google
3. SDK retorna um **ID Token** para o app (sem sair do app)
4. App envia o ID Token para o Supabase via `signInWithIdToken`
5. Supabase valida e cria a sessão

Resultado: login dura ~3 segundos, nunca sai do app, e funciona offline-friendly.

---

## Passo 1 — Pegar/criar OAuth Client IDs no Google Cloud

Você provavelmente já tem um Client ID do tipo **Web application** (esse é o que
o Supabase usa hoje em **Authentication → Providers → Google**). Vamos reaproveitá-lo
e criar mais um para iOS.

### 1.1. Encontrar o Web Client ID atual

1. Acesse https://console.cloud.google.com → selecione seu projeto
2. **APIs & Services → Credentials**
3. Localize o Client ID com tipo "Web application" (o que está no Supabase)
4. Copie o **Client ID** (formato `123-abc.apps.googleusercontent.com`)
5. Cole em `VITE_GOOGLE_WEB_CLIENT_ID` no `.env`:

```env
VITE_GOOGLE_WEB_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
```

### 1.2. Criar Client ID para iOS

1. Mesmo lugar (**Credentials**) → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **iOS**
3. Name: livre (ex.: "Favorito iOS")
4. Bundle ID: `com.mercadinho.app` (mesmo do `capacitor.config.ts`)
5. **Create**
6. Copie:
   - **Client ID** → cole em `VITE_GOOGLE_IOS_CLIENT_ID` no `.env`
   - **iOS URL scheme** (também chamado **Reversed Client ID**, formato
     `com.googleusercontent.apps.123-abc`) — guarde, vai precisar no Info.plist

```env
VITE_GOOGLE_IOS_CLIENT_ID="123456789-xyz.apps.googleusercontent.com"
```

### 1.3. (Opcional) Client ID para Android

Para Android, o plugin trabalha com o Web Client ID — **NÃO precisa** criar
client Android separado. O Google Cloud apenas exige que você cadastre o
SHA-1 do certificado de assinatura no projeto:

1. **Credentials** → encontre seu Client Web → ele já é o Server Client ID
2. Para SHA-1 do build de debug (development):
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Pega a linha `SHA1:` do `Variant: debug`.
3. **APIs & Services → Credentials** → crie um Client tipo **Android**
   apenas se quiser separar; ou se já existe, edite e adicione SHA-1 + package
   name `com.mercadinho.app`.

---

## Passo 2 — Configurar Info.plist (iOS)

Adicione o **Reversed Client ID** (do passo 1.2) ao `CFBundleURLTypes` do iOS.
Já existe um esquema (`com.mercadinho.app`); você adiciona MAIS UM:

Edite [ios/App/App/Info.plist](ios/App/App/Info.plist), localize o array
`CFBundleURLTypes` e adicione um novo dict:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.mercadinho.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.mercadinho.app</string>
        </array>
    </dict>
    <!-- ADICIONE ESTE BLOCO ABAIXO: -->
    <dict>
        <key>CFBundleURLName</key>
        <string>GoogleSignIn</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <!-- COLE AQUI O REVERSED CLIENT ID — ex.: com.googleusercontent.apps.123-abc -->
            <string>com.googleusercontent.apps.SEU_REVERSED_CLIENT_ID</string>
        </array>
    </dict>
</array>
```

---

## Passo 3 — Configurar Supabase (Authentication)

No **Supabase Dashboard → Authentication → Providers → Google**:

- **Enabled**: ON
- **Client ID (for OAuth)**: o **Web Client ID** (mesmo do `.env`)
- **Client Secret**: o secret correspondente do Web Client (já deve estar lá)
- **Authorized Client IDs** (campo separado, mais abaixo): adicione AMBOS:
  - O Web Client ID (já vem por padrão)
  - O **iOS Client ID** (separado por vírgula)

Esse campo "Authorized Client IDs" é crítico — é o que diz pro Supabase
"aceite ID tokens vindos desses outros clients OAuth". Sem ele, o
`signInWithIdToken` retorna erro tipo "audience mismatch".

---

## Passo 4 — Build & teste

### Windows (Android)
```bash
npm install
npm run build
npx cap sync
```
Depois Android Studio: Sync Gradle → Clean → Rebuild → Run.

### Mac (iOS)
```bash
git pull           # puxa as mudanças do .env, AuthContext, etc.
npm install
npm run build
npx cap sync ios
npx cap open ios
```
No Xcode: ▶️ Run no simulador ou device.

### Testar login
1. Toca em **"Entrar com Google"**
2. Aparece popup nativo do iOS/Android com sua(s) conta(s) Google
3. Escolhe a conta → autoriza
4. **Permanece dentro do app** — você é logado em ~2 segundos
5. Não há browser, não há redirect, não há "voltar pro app"

---

## Troubleshooting

### Erro "audience mismatch" / "invalid id_token"
- Falta cadastrar o iOS Client ID em **Authorized Client IDs** no Supabase.

### "VITE_GOOGLE_WEB_CLIENT_ID não definido"
- Você esqueceu de preencher no `.env`. Rebuild depois de preencher.

### iOS abre popup mas não retorna nada
- Reversed Client ID não está no Info.plist OU está errado.
- Confira que o Bundle ID no Google Cloud bate com o `appId` do
  `capacitor.config.ts` (`com.mercadinho.app`).

### Android: "DEVELOPER_ERROR"
- SHA-1 do certificado de assinatura não está cadastrado no Google Cloud.
- Para release builds, cadastre o SHA-1 do upload key da Play Store também.

### Aparece o popup mas nenhuma conta Google é listada
- O dispositivo/emulador não tem conta Google configurada. No emulador
  Android, vá em **Settings → Accounts → Add account → Google**.

---

## Web continua igual

No navegador (`npm run dev` ou deploy), o login Google **continua** usando
o fluxo OAuth via redirect do Supabase — nada muda. A detecção é automática
via `Capacitor.isNativePlatform()`.

---

## Resumindo as variáveis

| Lugar | Variável | Valor |
|-------|----------|-------|
| `.env` (raiz do repo) | `VITE_GOOGLE_WEB_CLIENT_ID` | Web Client ID (formato `…apps.googleusercontent.com`) |
| `.env` (raiz do repo) | `VITE_GOOGLE_IOS_CLIENT_ID` | iOS Client ID (opcional) |
| Supabase Dashboard | Client ID (Provider Google) | Web Client ID |
| Supabase Dashboard | Authorized Client IDs | Web Client ID + iOS Client ID |
| `ios/App/App/Info.plist` | CFBundleURLSchemes | Reversed Client ID (`com.googleusercontent.apps.…`) |
| Google Cloud Credentials | OAuth Client (iOS) | Bundle ID = `com.mercadinho.app` |
| Google Cloud Credentials | OAuth Client (Android) | Package = `com.mercadinho.app` + SHA-1 |
