// Gera as duas versões do Minhas Finanças a partir de src/:
//   dist/site/                 PWA para o GitHub Pages (instala no iPhone, abre sem internet, nuvem no GitHub)
//   dist/claude/financas.html  painel no Claude (artefato com a nuvem do próprio artefato)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => readFileSync(join(root, p), "utf8");
const pkg = JSON.parse(r("package.json"));
const strip = (t) => t.replace(/^if \(typeof module.*$/gm, "");
const js = [`const APP_VERSION=${JSON.stringify(pkg.version)};`, strip(r("src/js/nucleo.js")), r("src/js/armazem.js"), r("src/js/app.js"), r("src/js/ia.js")].join("\n");
const css = r("src/styles.css");
const tpl = r("src/index.html").replace("/*__CSS__*/", () => css);
const comJs = (pre) => tpl.replace("/*__JS__*/", () => `(()=>{\n${pre}\n${js}\n})();`);

const head = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#15803D">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Finanças">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">`;
const site = comJs("window.MF_SITE=true;")
  .replace("<!--SITE_HEAD-->", head).replace("<!--SITE_BODY-->", "</head>\n<body>").replace("<!--SITE_END-->", "</body>\n</html>")
  .replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "");
const claude = comJs("").replace(/<!--SITE_\w+-->\n?/g, "");

rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(join(root, "dist/site"), { recursive: true });
mkdirSync(join(root, "dist/claude"), { recursive: true });
writeFileSync(join(root, "dist/site/index.html"), site);
writeFileSync(join(root, "dist/claude/financas.html"), claude);
for (const f of readdirSync(join(root, "public"))) if (f !== "sw.js") copyFileSync(join(root, "public", f), join(root, "dist/site", f));
const h = createHash("sha256").update(site).update(pkg.version).digest("hex").slice(0, 10);
writeFileSync(join(root, "dist/site/sw.js"), r("public/sw.js").replace("__CACHE__", "mf-" + h));
console.log(`build ${pkg.version}: site ${(site.length / 1024).toFixed(0)} KB · claude ${(claude.length / 1024).toFixed(0)} KB`);
