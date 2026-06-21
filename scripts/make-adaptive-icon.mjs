// Gera assets/icon-foreground.png e assets/icon-background.png para o
// @capacitor/assets produzir um ícone ADAPTATIVO bem enquadrado:
//   - foreground: a logo com FOLGA (dentro da safe-zone), centralizada, fundo transparente
//   - background: branco sólido (a logo tem azul que sumiria num fundo azul)
// Rode: node scripts/make-adaptive-icon.mjs  (depois: npx @capacitor/assets generate && npx cap sync)
import sharp from "sharp";

const SIZE = 1024;
const FG_WIDTH = Math.round(SIZE * 0.76); // ~12% de folga de cada lado (clear de máscaras redondas/squircle)

// Fundo branco sólido
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: "#ffffff" } })
  .png()
  .toFile("assets/icon-background.png");

// Logo: remove a borda transparente, redimensiona p/ ~76% da largura e centraliza
const logo = await sharp("assets/icon.png")
  .trim()
  .resize({ width: FG_WIDTH, fit: "inside" })
  .png()
  .toBuffer();

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: logo, gravity: "center" }])
  .png()
  .toFile("assets/icon-foreground.png");

console.log("OK: assets/icon-foreground.png + assets/icon-background.png");
