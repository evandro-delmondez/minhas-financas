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
        const ir = async (a) => { await p.evaluate((x) => (location.hash = x), a); await p.waitForFunction((x) => document.getElementById("titulo").textContent.length && location.hash === "#" + x, a); await p.waitForTimeout(50); };
        if (fs.existsSync(BK)) {
          await p.click("#bvImporta");
          await p.waitForSelector("#bkTxt");
          await p.fill("#bkTxt", fs.readFileSync(BK, "utf8"));
          await p.click("#folhaDir");
          await p.waitForSelector(".hero");
        } else await p.click("#bvZero");
        for (const a of ABAS) {
          await ir(a);
          const txt = await p.textContent("#corpo");
          assert.ok(!/Não consegui montar/.test(txt), `${a}: ${txt.slice(0, 200)}`);
          const larg = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(larg <= 1, `${a} rola para o lado (${larg}px)`);
        }
        // fluxo: importar CSV, mudar item do orçamento, distribuir, persistir após recarregar
        await ir("extratos");
        await p.setInputFiles("#arq", { name: "Nubank_2026-12-28.csv", mimeType: "text/csv", buffer: Buffer.from('date,title,amount\n2026-11-20,Curem - Parcela 6/12,"132,50"\n2026-11-21,Tiktok Shop,"89,90"\n') });
        await p.waitForSelector("text=2 novas de 2");
        await ir("inicio");
        assert.match(await p.textContent("#corpo"), /TikTok Shop de novo/);
        await ir("orcamento");
        if (fs.existsSync(BK)) assert.match(await p.textContent("#corpo"), /Dezembro de 2026/);
        await p.click("#oDistr").catch(() => {});
        await p.waitForTimeout(300);
        await p.reload(); await p.waitForSelector(".tela"); await ir("caixinhas");
        const c = await p.textContent("#corpo");
        if (fs.existsSync(BK)) assert.match(c, /R\$\s?1\.464/);
        assert.match(await p.textContent("#selo"), /Salvo neste aparelho/);
        // plano antigo (com os 4 valores incertos): ao importar, a correção tira os R$ 2.500 a mais
        if (fs.existsSync(path.join(__dirname, "../dados/backup-antigo.json")) && nome === "computador") {
          const ctx3 = await b.newContext({ viewport: vp }), p3 = await ctx3.newPage();
          await p3.addInitScript(() => localStorage.setItem("mf_hoje", "2026-11-21"));
          await p3.goto(url); await p3.click("#bvImporta"); await p3.waitForSelector("#bkTxt");
          await p3.fill("#bkTxt", fs.readFileSync(path.join(__dirname, "../dados/backup-antigo.json"), "utf8"));
          await p3.click("#folhaDir"); await p3.waitForTimeout(1200);
          const heroTxt = await p3.textContent(".hero .v");
          assert.match(heroTxt, /11\.150/); assert.doesNotMatch(heroTxt, /13\.650|14\.800/);
          await ctx3.close();
        }
        // assistente de IA com a API simulada: frase → proposta → lançar
        await p.evaluate(() => localStorage.setItem("mf_ia_v1", JSON.stringify({ chave: "sk-ant-teste" })));
        await p.route("https://api.anthropic.com/v1/messages", (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ resumo: "Um gasto e uma renda extra", acoes: [{ tipo: "gasto_mesada", data: "2026-11-21", valor: 80, desc: "bar com o Pedro" }, { tipo: "renda", ref: "2026-11", desc: "DF Resgate", min: 960, max: 960, tipoRenda: "extra" }, { tipo: "lancamento", data: "2026-11-10", desc: "Ifood", valor: 55, cat: "delivery", origem: "nu-conta" }] }) }] }) }));
        await ir("inicio");
        await p.click("#fab");
        await p.fill("#iaTxt", "gastei 80 no bar com o Pedro e recebi 960 da DF Resgate");
        await p.click("#iaVai");
        await p.waitForSelector("#iaAplica");
        const corpoIa = await p.textContent("#folha");
        assert.match(corpoIa, /Um gasto e uma renda extra/); assert.match(corpoIa, /DF Resgate/);
        await p.click("#iaAplica");
        await p.waitForTimeout(1200);
        assert.match(await p.textContent("#corpo"), /R\$\s?270/); // mesada 350 − 80
        // chave da IA vai no plano (nuvem e backup); chave do GitHub volta pelo backup
        await ir("ajustes");
        await p.click("#iaAbre"); await p.fill("#iaK", "sk-ant-teste-123"); await p.click("#folhaDir"); await p.waitForTimeout(400);
        const est = await p.evaluate(() => JSON.parse(localStorage.getItem("mf_estado_v1")));
        assert.equal(est.chaves.ia, "sk-ant-teste-123");
        if (nome === "computador") {
          await p.route("https://api.github.com/**", (rt) => rt.abort());
          const ctx2 = await b.newContext({ viewport: vp }), p2 = await ctx2.newPage();
          await p2.route("https://api.github.com/**", (rt) => rt.abort());
          await p2.goto(url); await p2.waitForSelector("#bvImporta"); await p2.click("#bvImporta"); await p2.waitForSelector("#bkTxt");
          await p2.fill("#bkTxt", JSON.stringify({ app: "minhas-financas", v: 1, estado: est, tx: {}, chaves: { gh: { repo: "dono/privado", chave: "github_pat_teste", arquivo: "minhas-financas.json" } } }));
          await p2.click("#folhaDir"); await p2.waitForTimeout(500);
          const g = await p2.evaluate(() => JSON.parse(localStorage.getItem("mf_gh_v1")));
          assert.equal(g.chave, "github_pat_teste"); assert.equal(g.repo, "dono/privado");
          assert.equal(await p2.evaluate(() => JSON.parse(localStorage.getItem("mf_estado_v1")).chaves.ia), "sk-ant-teste-123");
          await ctx2.close();
        }
        if (nome === "celular") for (const a of ["inicio", "orcamento", "caixinhas", "extratos"]) { await ir(a); await p.waitForTimeout(1100); await p.screenshot({ path: path.join(__dirname, `../dist/tela-${a}.png`), fullPage: true }); }
        assert.deepEqual(erros, []);
        await ctx.close();
      });
    }
  } finally { await b.close(); srv.close(); }
});
