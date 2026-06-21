# Sons de notificação

Coloque aqui o arquivo **`new-order.mp3`** com o som de novo pedido (o app
procura por esse caminho exato: `/sounds/new-order.mp3`).

Se o arquivo não existir, o app usa automaticamente um bipe sintetizado
via Web Audio API (sem dependências externas).

## Como obter um som apropriado

Sites de áudio livre/royalty-free com sons de notificação:
- https://pixabay.com/sound-effects/search/notification/
- https://freesound.org (precisa criar conta)
- https://mixkit.co/free-sound-effects/notification/

Procure por algo com 1–2 segundos, "alert", "ding" ou "bell".

## Para Android (notificações nativas em background)

Adicione **uma cópia do arquivo** em:
```
android/app/src/main/res/raw/new_order.mp3
```
> Importante: o Android exige nome com underscore (`new_order`, não `new-order`)
> e tudo em minúsculas. Sem extensão no `LocalNotifications.schedule({ sound: "new_order" })`.

## Para iOS (notificações nativas em background)

Converta o `.mp3` para `.caf` (formato preferido pelo APNs) ou mantenha `.mp3`,
e adicione ao bundle do Xcode:
1. Abra `ios/App/App.xcworkspace` no Xcode
2. Arraste `new-order.mp3` (ou `.caf`) para a pasta `App` no project navigator
3. Marque "Copy items if needed" e o target `App`
4. No código já usamos `sound: "new-order.mp3"` no LocalNotifications (iOS)

## Conversão MP3 → CAF (opcional, recomendado iOS)

```bash
afconvert -f caff -d aac -b 64000 new-order.mp3 new-order.caf
```

(`afconvert` é builtin no macOS)
