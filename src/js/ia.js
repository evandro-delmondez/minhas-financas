/* ---------- Assistente de IA: manda extrato, foto, print, PDF ou uma frase; ela devolve o que lançar ----------
   No Claude (artefato): usa a sua conta pelo recurso "sample", sem chave.
   No site instalado: usa a API da Anthropic com a sua chave, guardada só neste aparelho (nunca na nuvem nem no backup).
   Nada é lançado sem você conferir: a IA propõe, você marca e aplica. CSV de banco é lido pelo próprio app, sem IA. */
const IA_LS = "mf_ia_v1", IA_MODELO = "claude-opus-5-5";
const iaChave = () => (lsGet(IA_LS, {}) || {}).chave || "";
let iaSample = null, iaLimites = null;
const iaModo = () => (iaSample ? "claude" : iaChave() ? "api" : "");
(async () => { try { if (window.claude && window.claude.use) { iaSample = await window.claude.use("sample"); if (iaSample) iaLimites = await iaSample.limits().catch(() => null); } } catch (e) { iaSample = null; } })();

function iaInstrucoes() {
  const h = hoje(), cfg = estado.config, ymG = mesDe(rendaDoMes(estado, proxSalario(h), h).recebe);
  const ctx = {
    hoje: h, diaSalario: cfg.diaSalario, mesadaSemanal: cfg.mesadaSemanal,
    caixinhas: estado.caixinhas.map((c) => ({ id: c.id, nome: c.nome, saldo: Math.round(saldoCx(estado, c.id)) })),
    categorias: Object.fromEntries(Object.entries(CATS).map(([k, c]) => [k, c.n])),
    orcamentoDoMes: { mes: ymG, itens: orcamentoDe(estado, ymG).itens.map((i) => `${i.n} (${i.g}, R$ ${i.v})`) },
    meuNome: cfg.meuNome, fazenda: cfg.palavrasFazenda, quemPagaMinhaRenda: cfg.fontesRenda, amigosQueDividemConta: cfg.pessoasDividem,
  };
  return `Você é o assistente do app "Minhas Finanças" de um médico plantonista no Brasil. Ele manda documentos (extrato, fatura, comprovante, print, foto) ou frases soltas, e você transforma isso em lançamentos para o app. Responda SÓ com um objeto JSON, sem texto antes ou depois, sem cercas de código.

Contexto do app: ${JSON.stringify(ctx)}

Formato:
{"resumo": "uma frase dizendo o que você entendeu",
 "analise": "opcional: 2 a 6 linhas, separadas por \\n, com a leitura do mês quando vier um extrato ou fatura (para onde foi o dinheiro, o que chamou atenção, juros, parcelas novas, assinaturas repetidas). Em português simples.",
 "acoes": [ ... ]}

Tipos de ação (use só estes, com estes campos):
- {"tipo":"lancamento","data":"AAAA-MM-DD","desc":"texto do extrato","valor":123.45,"cat":"<chave de categorias>","origem":"nu-fatura|nu-conta|bb-conta|outro","fatura":"AAAA-MM (só para fatura de cartão: mês do vencimento)","parcela":"k/n (se houver)"} → uma linha de extrato ou fatura. valor positivo = gasto/saída; negativo = entrada/estorno. Liste TODAS as linhas do documento, uma ação por linha. Pagamento de fatura, transferência entre contas do próprio usuário, aplicação/resgate de caixinha e valores da fazenda: cat "ignorar".
- {"tipo":"gasto_mesada","data":"AAAA-MM-DD","valor":50,"desc":"bar"} → gasto avulso do dia a dia que ele conta em frase ("gastei 50 no bar").
- {"tipo":"renda","ref":"AAAA-MM (mês em que o trabalho foi feito)","desc":"Remoção VipMed","min":250,"max":250,"tipoRenda":"extra|plantao"} → renda que vai receber ou recebeu (plantão fora do Meu Plantão, remoção, UTI móvel).
- {"tipo":"caixinha","cx":"<id de caixinhas>","valor":500,"desc":"..."} → guardou (valor positivo) ou tirou (negativo) de uma caixinha.
- {"tipo":"evento","data":"AAAA-MM-DD","t":"título curto","d":"detalhe"} → data importante (prova, vencimento, inscrição).
- {"tipo":"pendencia","t":"o que fazer"} → tarefa.
- {"tipo":"orcamento","ym":"AAAA-MM","n":"nome do item","g":"fix|vida|cx","v":300,"p":"onde pagar"} → item novo ou valor novo no orçamento.
- {"tipo":"milhas","programa":"nubank|smiles|latam|azul","saldo":12000} → saldo de pontos ou milhas.

Regras: não invente valores nem datas; se faltar ano, use o mais provável a partir de hoje. Datas sempre AAAA-MM-DD. Valores como número com ponto decimal. Se não houver nada para lançar, devolva "acoes": [] e explique no resumo. Nunca inclua nada que pareça senha, número completo de cartão ou de conta.`;
}
function iaParse(txt) {
  const s = String(txt || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(s); } catch (e) {}
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1));
  throw new Error("A IA não respondeu no formato esperado");
}
const b64Arq = (f) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = () => erro(r.error); r.readAsDataURL(f); });
async function iaApi(texto, anexos) {
  const content = [];
  for (const a of anexos) {
    if (a.tipo === "img") content.push({ type: "image", source: { type: "base64", media_type: a.f.type || "image/jpeg", data: await b64Arq(a.f) } });
    else if (a.tipo === "pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: await b64Arq(a.f) } });
  }
  content.push({ type: "text", text: texto });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": iaChave(), "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: IA_MODELO, max_tokens: 16000, output_config: { effort: "low" }, fallbacks: "default", system: iaInstrucoes(), messages: [{ role: "user", content }] }),
  });
  if (!r.ok) { let m = ""; try { m = (await r.json()).error.message; } catch (e) {} throw new Error(r.status === 401 ? "Chave da API recusada: confira em Ajustes → IA" : r.status === 429 ? "Muitos pedidos seguidos: espere um minuto" : `Erro ${r.status}${m ? ": " + m : ""}`); }
  const j = await r.json();
  if (j.stop_reason === "refusal") throw new Error("A IA não quis processar este conteúdo");
  if (j.stop_reason === "max_tokens") throw new Error("O documento é grande demais para uma vez: mande uma parte por vez");
  return iaParse((j.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""));
}
async function iaClaude(texto, anexos) {
  const imgs = anexos.filter((a) => a.tipo === "img").map((a) => a.f);
  if (imgs.length && !(iaLimites && iaLimites.images)) throw new Error("Aqui não dá para mandar imagem: cole o texto ou use o site instalado");
  try { return await iaSample.json([{ role: "user", content: iaInstrucoes() + "\n\n---\n\n" + texto }], imgs.length ? { images: imgs } : {}); }
  catch (e) { throw new Error(e && e.code === "not_granted" ? "Permita o uso do Claude para este painel e tente de novo" : e && e.code === "rate_limited" ? "Muitos pedidos seguidos: espere um minuto" : (e && e.message) || "A IA não respondeu"); }
}
// PDF dentro do Claude: tira o texto com o pdf.js (o artefato não manda PDF para a IA)
let pdfjsP = null;
function carregaPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return (pdfjsP = pdfjsP || new Promise((ok, erro) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; ok(window.pdfjsLib); }; s.onerror = () => erro(new Error("Não consegui abrir o leitor de PDF")); document.head.appendChild(s); }));
}
async function textoDoPdf(f) {
  const lib = await carregaPdfjs(), doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; let out = "";
  for (let p = 1; p <= Math.min(doc.numPages, 30); p++) { const pg = await doc.getPage(p), c = await pg.getTextContent(); out += c.items.map((i) => i.str).join(" ") + "\n"; }
  return out;
}

// ---------- tela do assistente ----------
let iaAnexos = [];
function abreAssistente() {
  iaAnexos = [];
  const modo = iaModo();
  abreFolha("✨ Assistente", `
    <section class="hero areia"><span class="k">Mande o que tiver</span><span class="v" style="font-size:22px">Extrato, fatura, foto, print ou uma frase</span><span class="s">Ela lê, soma, categoriza e propõe os lançamentos. Você confere antes de entrar.</span></section>
    ${modo ? "" : `<div class="aviso"><span class="ico">🔑</span><div><b>IA desligada neste aparelho</b><br><small>No site instalado, a IA precisa da sua chave da API. CSV de banco funciona sem ela.</small><br><button class="lnk" id="iaCfg" type="button">Ligar a IA</button></div></div>`}
    <div class="grupo"><label class="campo col"><textarea id="iaTxt" style="font-family:var(--f);font-size:16px;min-height:110px" placeholder="Ex.: gastei 80 no bar com o Pedro hoje
Recebi 960 da DF Resgate referente a outubro
Guardei 500 na Reserva
Prova da UNIFESP dia 12/12, inscrição até 30/11"></textarea></label>
      <label class="li add" style="cursor:pointer"><span class="ico">📎</span><span class="t"><span>Anexar arquivos</span><small>CSV, PDF, foto ou print do extrato</small></span><input type="file" id="iaArq" multiple accept=".csv,.pdf,.txt,.ofx,image/*" hidden></label>
      <div id="iaLista"></div></div>
    <div class="acoes"><button class="btn" id="iaVai" type="button">✨ Analisar</button></div>
    <div class="grupo"><button class="li" id="iaGasto" type="button"><span class="ico" style="--c:var(--mar4)">🛍️</span><span class="t">Só lançar um gasto da mesada</span><span class="chev">›</span></button></div>
    <div id="iaRes"></div>`, (f) => {
    const cfg = $("#iaCfg", f); if (cfg) cfg.onclick = () => { fechaFolha(); setTimeout(folhaIaCfg, 300); };
    $("#iaGasto", f).onclick = () => { fechaFolha(); setTimeout(folhaGasto, 300); };
    const lista = () => { $("#iaLista", f).innerHTML = iaAnexos.map((a, i) => li({ em: { img: "🖼️", pdf: "📄", csv: "📊", txt: "📝" }[a.tipo], cor: "mar6", t: esc(a.f.name), s: a.tipo === "csv" ? "lido pelo app, sem IA" : `${Math.round(a.f.size / 1024)} KB`, v: "✕", vcls: "sec", attrs: `data-tiraanexo="${i}"` })).join(""); $$("[data-tiraanexo]", f).forEach((b) => (b.onclick = () => { iaAnexos.splice(+b.dataset.tiraanexo, 1); lista(); })); };
    $("#iaArq", f).onchange = (e) => {
      for (const a of e.target.files) iaAnexos.push({ f: a, tipo: /\.csv$/i.test(a.name) ? "csv" : /\.pdf$/i.test(a.name) || a.type === "application/pdf" ? "pdf" : /^image\//.test(a.type) ? "img" : "txt" });
      e.target.value = ""; lista();
    };
    $("#iaVai", f).onclick = async (e) => {
      const btn = e.currentTarget, txt = $("#iaTxt", f).value.trim(), res = $("#iaRes", f);
      if (!txt && !iaAnexos.length) { toast("Escreva algo ou anexe um arquivo"); return; }
      btn.disabled = true; btn.textContent = "Lendo…"; res.innerHTML = "";
      try {
        // 1) CSV de banco: o próprio app lê
        const csvs = iaAnexos.filter((a) => a.tipo === "csv"), resto = iaAnexos.filter((a) => a.tipo !== "csv"), extras = [];
        let rel = [];
        if (csvs.length) {
          for (const a of csvs) { const r = importarCSV(await lerArquivo(a.f), a.f.name); if (r.origem) rel = rel.concat(await importaArquivos([a.f])); else extras.push(`Arquivo ${a.f.name}:\n${(await lerArquivo(a.f)).slice(0, 60000)}`); }
        }
        // 2) o resto vai para a IA
        const txts = resto.filter((a) => a.tipo === "txt"); for (const a of txts) extras.push(`Arquivo ${a.f.name}:\n${(await lerArquivo(a.f)).slice(0, 60000)}`);
        let mand = resto.filter((a) => a.tipo === "img" || a.tipo === "pdf");
        if (!txt && !extras.length && !mand.length) { res.innerHTML = rel.length ? `<div class="grupo">${rel.map((r) => li({ em: r.ok ? "✅" : "⚠️", cor: r.ok ? "ok" : "warn", t: esc(r.t), s: esc(r.s) })).join("")}</div>` : ""; if (rel.length) { animar = true; redesenha(); toast("Extrato importado"); } return; }
        if (!iaModo()) throw new Error("Ligue a IA em Ajustes → IA para ler PDF, foto e frases");
        if (iaModo() === "claude") { for (const a of mand.filter((x) => x.tipo === "pdf")) { try { extras.push(`PDF ${a.f.name}:\n${(await textoDoPdf(a.f)).slice(0, 80000)}`); } catch (er) { throw new Error(`Não consegui ler ${a.f.name}: mande um print das páginas`); } } mand = mand.filter((x) => x.tipo === "img"); }
        const pedido = [txt && `Mensagem: ${txt}`, ...extras, mand.length && `Anexos: ${mand.map((a) => a.f.name).join(", ")}`].filter(Boolean).join("\n\n");
        const out = iaModo() === "claude" ? await iaClaude(pedido, mand) : await iaApi(pedido, mand);
        mostraProposta(f, out, rel);
      } catch (er) { res.innerHTML = `<div class="aviso" style="--c:var(--bad)"><span class="ico">⚠️</span><div><b>${esc(er.message || er)}</b></div></div>`; }
      finally { btn.disabled = false; btn.textContent = "✨ Analisar"; }
    };
  });
}
// descreve cada ação para conferir
function iaDescreve(a) {
  const cx = a.cx && cxDe(a.cx);
  switch (a.tipo) {
    case "gasto_mesada": return { em: "🛍️", cor: "mar4", t: esc(a.desc || "Gasto"), s: `mesada · ${diaMes(a.data || hoje())}`, v: brl(+a.valor) };
    case "renda": return { em: "💵", cor: "ok", t: esc(a.desc || "Renda"), s: `plantões/extras de ${nomeMes(a.ref || mesDe(hoje()), true)}`, v: faixa(+a.min || 0, +(a.max || a.min) || 0) };
    case "caixinha": return { em: cx ? emoCx(cx) : "🐷", cor: "mar5", t: `${+a.valor >= 0 ? "Guardar em" : "Tirar de"} ${esc(cx ? cx.nome : a.cx)}`, s: esc(a.desc || ""), v: brl(Math.abs(+a.valor)) };
    case "evento": return { em: "📅", cor: "mar2", t: esc(a.t), s: `${diaMes(a.data)}${a.d ? " · " + esc(a.d) : ""}` };
    case "pendencia": return { em: "✅", cor: "amber", t: esc(a.t), s: "pendência" };
    case "orcamento": return { em: EMO_GRUPO[a.g] || "📌", cor: COR_GRUPO[a.g] || "mar1", t: esc(a.n), s: `orçamento de ${nomeMes(a.ym || mesDe(hoje()), true)} · ${esc(a.p || "")}`, v: brl(+a.v) };
    case "milhas": return { em: "✈️", cor: "mar5", t: `Saldo ${esc(a.programa)}`, v: (+a.saldo || 0).toLocaleString("pt-BR") };
  }
  return null;
}
function mostraProposta(f, out, rel) {
  const acoes = (Array.isArray(out && out.acoes) ? out.acoes : []).filter((a) => a && a.tipo);
  const lancs = acoes.filter((a) => a.tipo === "lancamento" && a.data && isFinite(+a.valor)), outras = acoes.filter((a) => a.tipo !== "lancamento").map((a) => ({ a, d: iaDescreve(a) })).filter((x) => x.d);
  const gastoL = lancs.filter((a) => +a.valor > 0 && a.cat !== "ignorar").reduce((s, a) => s + +a.valor, 0);
  const porCat = {}; for (const a of lancs) if (+a.valor > 0 && a.cat !== "ignorar") porCat[a.cat] = (porCat[a.cat] || 0) + +a.valor;
  $("#iaRes", f).innerHTML = `
    ${rel.length ? `<div class="grupo">${rel.map((r) => li({ em: r.ok ? "✅" : "⚠️", cor: r.ok ? "ok" : "warn", t: esc(r.t), s: esc(r.s) })).join("")}</div>` : ""}
    <section class="bloco"><div class="tit">O que a IA entendeu</div><div class="aviso" style="--c:var(--mar1)"><span class="ico">✨</span><div><b>${esc(out.resumo || "Pronto")}</b>${out.analise ? `<br><small style="white-space:pre-line">${esc(out.analise)}</small>` : ""}</div></div></section>
    ${lancs.length ? `<section class="bloco"><div class="tit">Extrato · ${lancs.length} linhas<b class="num">${brl(gastoL)} em gastos</b></div><div class="grupo">
      <label class="li"><span class="ico" style="--c:var(--mar1)">📥</span><span class="t"><span>Lançar as ${lancs.length} linhas</span><small>${Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, v]) => `${EMO_CAT[c] || ""} ${brl(v)}`).join(" · ")}</small></span><input type="checkbox" class="troca" data-iaL checked></label>
      <details style="padding:0 14px 10px"><summary class="rod" style="padding:6px 0">Ver linhas</summary>${lancs.slice(0, 200).map((a) => `<div class="rod" style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><span>${diaMes(a.data)} ${EMO_CAT[a.cat] || ""} ${esc(a.desc)}</span><b class="num">${brl2(+a.valor)}</b></div>`).join("")}</details></div></section>` : ""}
    ${outras.length ? `<section class="bloco"><div class="tit">Lançamentos</div><div class="grupo">${outras.map((x, i) => `<label class="li"><span class="ico" style="--c:var(--${x.d.cor})">${x.d.em}</span><span class="t"><span>${x.d.t}</span>${x.d.s ? `<small>${x.d.s}</small>` : ""}</span>${x.d.v ? `<span class="v">${x.d.v}</span>` : ""}<input type="checkbox" class="troca" data-iaA="${i}" checked></label>`).join("")}</div></section>` : ""}
    ${lancs.length || outras.length ? `<button class="btn" id="iaAplica" type="button">Lançar no app</button>` : ""}`;
  const ap = $("#iaAplica", f);
  if (ap) ap.onclick = () => {
    const usaL = $("[data-iaL]", f) && $("[data-iaL]", f).checked, sel = outras.filter((_, i) => $(`[data-iaA="${i}"]`, f).checked).map((x) => x.a);
    const n = aplicaAcoes(usaL ? lancs : [], sel);
    fechaFolha(); animar = true; redesenha();
    if (n) festa("✨", `${n} ${n === 1 ? "lançamento feito" : "lançamentos feitos"}`); else toast("Nada novo para lançar");
  };
}
function aplicaAcoes(lancs, acoes) {
  const h = hoje(), mudou = new Set(); let n = 0;
  for (const a of lancs) {
    const data = /^\d{4}-\d\d-\d\d$/.test(a.data) ? a.data : h, valor = Math.round(+a.valor * 100) / 100, desc = String(a.desc || "").slice(0, 140);
    const origem = ["nu-fatura", "nu-conta", "bb-conta"].includes(a.origem) ? a.origem : "ia";
    const comp = origem === "nu-fatura" && /^\d{4}-\d\d$/.test(a.fatura || "") ? a.fatura : mesDe(data);
    const parc = /^(\d+)\/(\d+)$/.test(a.parcela || "") ? { k: +a.parcela.split("/")[0], n: +a.parcela.split("/")[1] } : parcelaDe(desc);
    const t = { id: "ia" + hash(`${origem}|${data}|${desc}|${valor.toFixed(2)}`), data, desc, valor, origem, comp, parc, em: Date.now() };
    const lista = (txs[comp] = txs[comp] || []);
    // já existe (mesmo id, ou mesma data e valor vindos do CSV): não duplica
    if (lista.some((x) => x.id === t.id || (x.data === t.data && Math.abs(x.valor - t.valor) < 0.005 && semAcento(x.desc).slice(0, 6) === semAcento(t.desc).slice(0, 6)))) continue;
    lista.push(t); mudou.add(comp); n++;
    if (CATS[a.cat] && a.cat !== categorizar(t, estado.config)) estado.ajustes[t.id] = { cat: a.cat };
  }
  for (const m of mudou) txs[m].sort((x, y) => x.data.localeCompare(y.data));
  for (const a of acoes) {
    if (a.tipo === "gasto_mesada" && +a.valor) estado.gastosSemana.push({ id: uid("g"), data: a.data || h, valor: +a.valor, desc: a.desc || "", em: Date.now() });
    else if (a.tipo === "renda" && +a.min) estado.rendas.push({ id: uid("r"), ref: /^\d{4}-\d\d$/.test(a.ref || "") ? a.ref : mesDe(h), desc: a.desc || "Renda", min: +a.min, max: +(a.max || a.min), tipo: a.tipoRenda === "plantao" ? "plantao" : "extra", em: Date.now() });
    else if (a.tipo === "caixinha" && cxDe(a.cx) && +a.valor) estado.movimentos.push({ id: uid("m"), cx: a.cx, data: h, valor: +a.valor, desc: a.desc || (+a.valor > 0 ? "Depósito" : "Retirada"), em: Date.now() });
    else if (a.tipo === "evento" && a.t && /^\d{4}-\d\d-\d\d$/.test(a.data || "")) estado.eventos.push({ id: uid("e"), data: a.data, fim: "", t: a.t, d: a.d || "", em: Date.now() });
    else if (a.tipo === "pendencia" && a.t) estado.pendencias.push({ id: uid("p"), t: a.t, feito: false });
    else if (a.tipo === "orcamento" && a.n) { const O = garanteOrc(/^\d{4}-\d\d$/.test(a.ym || "") ? a.ym : mesDe(h)), ex = O.itens.find((i) => semAcento(i.n) === semAcento(a.n)); if (ex) ex.v = +a.v || 0; else O.itens.push({ id: uid("o"), n: a.n, g: GRUPOS[a.g] ? a.g : "vida", v: +a.v || 0, p: a.p || "" }); }
    else if (a.tipo === "milhas" && estado.milhas.saldos[a.programa] != null) estado.milhas.saldos[a.programa] = +a.saldo || 0;
    else continue;
    n++;
  }
  if (n) salva([...mudou]);
  return n;
}
function folhaIaCfg() {
  const modo = iaModo();
  abreFolha("IA", `${modo === "claude" ? `<div class="aviso" style="--c:var(--ok)"><span class="ico">✅</span><div><b>Ligada pela sua conta do Claude</b><br><small>Dentro do Claude, a IA usa a sua própria conta: não precisa de chave. Fotos e prints vão direto; PDF tem o texto lido aqui e enviado.</small></div></div>` : ""}
    <div class="grupo">${campo("Chave da API (site instalado)", `<input id="iaK" type="password" autocomplete="off" placeholder="${iaChave() ? "guardada neste aparelho" : "sk-ant-…"}">`)}</div>
    <p class="rod">Crie em console.anthropic.com → API Keys. Ela fica só neste aparelho, nunca vai para a nuvem nem para o backup. Cada leitura é cobrada na sua conta da API (um extrato custa centavos). Modelo: Claude Opus 5.5.</p>
    ${iaChave() ? `<div class="grupo"><button class="li perigo" id="iaEsq" type="button">Esquecer a chave</button></div>` : ""}`, (f) => {
    $("#folhaDir").onclick = () => { const k = $("#iaK", f).value.trim(); if (k) { if (!/^sk-ant-/.test(k)) { toast("A chave começa com sk-ant-"); return; } lsSet(IA_LS, { chave: k }); toast("IA ligada neste aparelho"); } fechaFolha(); redesenha(); };
    const e = $("#iaEsq", f); if (e) e.onclick = () => { try { localStorage.removeItem(IA_LS); } catch (er) {} fechaFolha(); redesenha(); toast("Chave apagada deste aparelho"); };
  }, "Salvar");
}

inicia();
