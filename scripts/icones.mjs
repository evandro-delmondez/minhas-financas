// Gera os PNG do ícone a partir do icon.svg (uma vez; precisa do Playwright)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
const b = await chromium.launch(); const p = await b.newPage();
for (const s of [180, 192, 512]) {
  await p.setViewportSize({ width: s, height: s });
  await p.setContent(`<style>html,body{margin:0}</style>${svg.replace("<svg ", `<svg width="${s}" height="${s}" `).replace('rx="112"', 'rx="0"')}`);
  await p.screenshot({ path: new URL(`../public/icon-${s}.png`, import.meta.url).pathname });
}
await b.close();
