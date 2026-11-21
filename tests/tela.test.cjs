// Abre o site gerado, importa o plano e passa por todas as abas no celular (390 px) e no computador
const test = require("node:test"), assert = require("node:assert/strict");
let chromium; try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/playwright")); }
const fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const DIST = path.join(__dirname, "../dist/site");
const BK = path.join(__dirname, "../dados/minhas-financas-backup.json");
const ABAS = ["inicio", "orcamento", "caixinhas", "renda", "extratos", "raiox", "calendario", "milhas", "ajustes"];

function serve() {
  return new Promise((ok) => { const s = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html"; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : f.endsWith(".js") ? "text/javascript" : "application/octet-stream" }); r.end(fs.readFileSync(f)); }); s.listen(0, () => ok(s)); });
}

test("telas", async (t) => {
  const srv = await serve(), url = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch();
  try {
    for (const [nome, vp] of [["celular", { width: 390, height: 844 }], ["computador", { width: 1280, height: 900 }]]) {
      await t.test(nome, async () => {
        const ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage(), erros = [];
        p.on("pageerror", (e) => erros.push(e.message));
        await p.addInitScript(() => localStorage.setItem("mf_hoje", "2026-11-21"));
        await p.goto(url);
        await p.waitForSelector("#bvZero");
        if (fs.existsSync(BK)) {
          await p.click("#bvAjustes");
          await p.fill("#bkTxt", fs.readFileSync(BK, "utf8"));
          await p.click("#bkImporta");
        } else await p.click("#bvZero");
        for (const a of ABAS) {
          await p.click(`[data-aba=${a}]`);
          const txt = await p.textContent("#corpo");
          assert.ok(!/Não consegui montar/.test(txt), `${a}: ${txt.slice(0, 200)}`);
          const larg = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(larg <= 1, `${a} rola para o lado (${larg}px)`);
        }
        // fluxo: importar CSV, mudar item do orçamento, distribuir, persistir após recarregar
        await p.click("[data-aba=extratos]");
        await p.setInputFiles("#arq", { name: "Nubank_2026-12-28.csv", mimeType: "text/csv", buffer: Buffer.from('date,title,amount\n2026-11-20,Curem - Parcela 6/12,"132,50"\n2026-11-21,Tiktok Shop,"89,90"\n') });
        await p.waitForSelector("text=2 novas de 2");
        await p.click("[data-aba=inicio]");
        assert.match(await p.textContent("#corpo"), /TikTok Shop de novo/);
        await p.click("[data-aba=orcamento]");
        if (fs.existsSync(BK)) assert.match(await p.textContent("#corpo"), /Orçamento de dezembro de 2026/);
        await p.click("#oDistr").catch(() => {});
        await p.reload(); await p.click("[data-aba=caixinhas]");
        const c = await p.textContent("#corpo");
        if (fs.existsSync(BK)) assert.match(c, /R\$\s?1\.464/);
        assert.match(await p.textContent("#selo"), /Salvo neste aparelho/);
        if (nome === "celular") for (const a of ["inicio", "orcamento"]) { await p.click(`[data-aba=${a}]`); await p.screenshot({ path: path.join(__dirname, `../dist/tela-${a}.png`), fullPage: true }); }
        assert.deepEqual(erros, []);
        await ctx.close();
      });
    }
  } finally { await b.close(); srv.close(); }
});
