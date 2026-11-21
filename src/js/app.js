/* ---------- Minhas Finanças: telas (visual Oceano, estilo iPhone) ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const vIn = (v) => (v == null || v === "" ? "" : String(Math.round(+v * 100) / 100).replace(".", ","));
const hoje = () => { try { const h = localStorage.getItem("mf_hoje"); if (/^\d{4}-\d\d-\d\d$/.test(h || "")) return h; } catch (e) {} return isoDia(new Date()); };
const mesNome = (ym) => MESES[+ym.slice(5) - 1];
const DIAS_S = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaSem = (iso) => DIAS_S[new Date(iso + "T12:00:00").getDay()];
const em = (n) => (n === 0 ? "hoje" : n === 1 ? "amanhã" : n < 0 ? "agora" : `em ${n} dias`);

// ---------- emojis ----------
const EMO_CAT = { restaurante: "🍽️", delivery: "🛵", mercado: "🛒", online: "📦", roupas: "👕", estudo: "📚", provas: "📝", viagem: "✈️", transporte: "🚕", carro: "⛽", saude: "💊", assinatura: "🔁", casa: "🏠", cuidados: "💈", pet: "🐾", pessoas: "🤝", presentes: "🎁", juros: "⚠️", outros: "🧾", renda: "💵", reembolso: "↩️", ignorar: "🚫" };
const EMO_GRUPO = { fix: "📌", vida: "🥂", cx: "🐷" };
const COR_GRUPO = { fix: "mar1", vida: "mar2", cx: "mar5" };
const EMO_CX = { reserva: "🛟", renda: "💼", crm: "🩺", provas: "📝", carro: "🚗", sonhos: "✨", livre: "🎈" };
const EMO_ITEM = [[/mentoria|curso|ipm/i, "🎓"], [/agua|luz/i, "💡"], [/diarista/i, "🧹"], [/combust/i, "⛽"], [/carro/i, "🚗"], [/total ?pass|academia/i, "🏋️"], [/claude/i, "🤖"], [/whitebook/i, "🩺"], [/apple/i, "🍎"], [/lightroom|dashcam/i, "📷"], [/barbe/i, "💈"], [/convictus|cabine/i, "📖"], [/ultravioleta|mensalidade/i, "💳"], [/prova|inscri/i, "📝"], [/mercado/i, "🛒"], [/restaurante|saida|delivery/i, "🍽️"], [/salvador|viagem/i, "✈️"], [/compras|pessoal/i, "🛍️"], [/farmacia|saude/i, "💊"], [/presente/i, "🎁"], [/reserva/i, "🛟"], [/renda/i, "💼"], [/crm/i, "🩺"], [/sonho/i, "✨"]];
const emoItem = (i) => i.em || (EMO_ITEM.find(([re]) => re.test(semAcento(i.n))) || [])[1] || EMO_GRUPO[i.g] || "•";
const emoCx = (c) => c.em || EMO_CX[c.id] || "💰";
const corC = (cat) => (CATS[cat] || CATS.outros).cor;

// ---------- pecinhas ----------
let toastT = null;
function toast(msg, acao) {
  const el = $("#toast"); el.hidden = false;
  el.innerHTML = `<span>${esc(msg)}</span>` + (acao ? `<button id="toastAcao" type="button">${esc(acao.rot)}</button>` : "");
  if (acao) $("#toastAcao").onclick = () => { acao.fn(); el.hidden = true; };
  clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), acao ? 7000 : 2600);
}
async function copia(txt) { try { await navigator.clipboard.writeText(txt); toast("Copiado"); return true; } catch (e) { return false; } }
const li = ({ em: e, cor, t, s, v, vcls, chev, attrs = "", extra = "", cls = "" }) => {
  const T = attrs.includes("data-") ? "button" : "div";
  return `<${T} class="li ${cls}" ${attrs} ${T === "button" ? 'type="button"' : ""}>${e != null ? `<span class="ico" style="--c:var(--${cor || "mar1"})">${e}</span>` : ""}<span class="t"><span>${t}</span>${s ? `<small>${s}</small>` : ""}${extra}</span>${v != null ? `<span class="v ${vcls || ""}">${v}</span>` : ""}${chev ? `<span class="chev">›</span>` : ""}</${T}>`;
};
const barra = (pct, cor) => `<span class="bar" style="--c:var(--${cor || "mar1"})"><i style="--w:${Math.max(0, Math.min(100, pct || 0)).toFixed(1)}%"></i></span>`;
const conta = (v, f = brl) => `<span class="conta num" data-v="${v}" data-f="${f === brl ? "b" : "p"}">${f(v)}</span>`;
const campo = (rot, input) => `<label class="campo"><span>${rot}</span>${input}</label>`;

// folha que sobe (editar sem poluir a tela)
function abreFolha(titulo, html, liga, dir) {
  const f = $("#folha");
  f.innerHTML = `<div class="folha-fundo" data-fecha></div><div class="folha" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="folha-cab"><button class="lnk" data-fecha type="button">Fechar</button><b>${esc(titulo)}</b>${dir ? `<button class="lnk dir" id="folhaDir" type="button">${esc(dir)}</button>` : "<span></span>"}</div>${html}</div>`;
  f.hidden = false; document.body.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("on")));
  $$("[data-fecha]", f).forEach((b) => (b.onclick = fechaFolha));
  if (liga) liga($(".folha", f));
  const prim = $("input:not([type=checkbox]):not([type=file]),select,textarea", f); if (prim && !matchMedia("(pointer:coarse)").matches) setTimeout(() => prim.focus(), 320);
}
function fechaFolha() { const f = $("#folha"); f.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => { if (!f.classList.contains("on")) { f.hidden = true; f.innerHTML = ""; } }, 280); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#folha").hidden) fechaFolha(); });

// comemoração: confete nas cores do oceano
function festa(emoji, msg) {
  const cv = $("#festa"), box = $("#festaMsg");
  box.innerHTML = `<b>${emoji}</b><span>${esc(msg)}</span>`; box.classList.add("on"); setTimeout(() => box.classList.remove("on"), 2600);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cv.hidden = false; const ctx = cv.getContext("2d"), W = (cv.width = innerWidth), H = (cv.height = innerHeight);
  const cores = ["#0A84C6", "#0BB3A4", "#2BD4C2", "#5AC8FA", "#1D4E89", "#FF8A65", "#FFFFFF"];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * 0.42, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: 3 + Math.random() * 5, c: cores[(Math.random() * cores.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3 }));
  const t0 = performance.now();
  (function quadro(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
    if (t - t0 < 2200) requestAnimationFrame(quadro); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
  })(t0);
}
// números que sobem contando (só ao entrar numa tela)
function animaContas(el) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  $$(".conta", el).forEach((s) => {
    const fim = +s.dataset.v, fmt = s.dataset.f === "b" ? brl : (x) => Math.round(x) + "%"; if (!fim) return;
    const t0 = performance.now(), dur = 700;
    (function q(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); s.textContent = fmt(fim * e); if (k < 1) requestAnimationFrame(q); else s.textContent = fmt(fim); })(t0);
  });
}

// ---------- estado padrão (sem dados pessoais: o plano entra pela nuvem ou pelo backup) ----------
const CX_PADRAO = () => [
  { id: "reserva", nome: "Reserva de emergência", cor: "mar1", meta: 42000, aporte: 0, naMeta: true },
  { id: "renda", nome: "Renda (salário fixo)", cor: "mar2", meta: 0, aporte: 0, naMeta: true },
  { id: "livre", nome: "Livre (mesada)", cor: "mar4", meta: 0, aporte: 0, naMeta: false },
];
function ESTADO_PADRAO() {
  return {
    v: 1, em: 0, config: {
      diaSalario: 20, mesadaSemanal: 350, tetoOnline: 200, tetoDelivery: 200, dolar: 5.5, pontosPorDolar: 2.2, rendMes: 0,
      metaGuardado: 50000, custoMensal: 7000, salarioFixo: 0, diaVencimento: 28, diasFechamento: 9, vencimentos: {}, bbAtivo: false,
      meuNome: "", pessoasDividem: [], palavrasFazenda: ["fazenda"], fontesRenda: [], regras: [], regraDesde: "", estimativas: {},
      milheiroRef: 25, trechoMilhas: 13000, bonusTipico: 80, parcelasManual: {}, raioxRef: [],
    },
    orcamentos: {}, modeloItens: [], caixinhas: CX_PADRAO(), movimentos: [], rendas: [], gastosSemana: [], eventos: [], pendencias: [],
    milhas: { saldos: { nubank: 0, smiles: 0, latam: 0, azul: 0 }, promocoes: [] }, ajustes: {}, plantaoCache: null, apagados: [], festas: {}, chaves: {},
  };
}
const COR_ANTIGA = { green: "mar1", teal: "mar2", sky: "mar6", indigo: "mar5", violet: "violet", orange: "mar4", amber: "amber" };
function migra(e) {
  const D = ESTADO_PADRAO();
  if (!e || typeof e !== "object") return D;
  if (Array.isArray(e.itens) && e.renda != null && !e.config) e = deAntigo(e);
  for (const k in D) if (e[k] == null) e[k] = D[k];
  e.config = Object.assign({}, D.config, e.config);
  e.milhas = Object.assign({}, D.milhas, e.milhas); e.milhas.saldos = Object.assign({}, D.milhas.saldos, e.milhas.saldos);
  for (const o of Object.values(e.orcamentos || {})) for (const i of o.itens || []) { if (!i.id) i.id = uid("o"); if (!GRUPOS[i.g]) i.g = ["res", "son", "col"].includes(i.g) ? "cx" : "fix"; }
  for (const c of e.caixinhas) if (!/^mar\d$/.test(c.cor || "") && !["violet", "amber", "orange", "pink", "plum"].includes(c.cor)) c.cor = COR_ANTIGA[c.cor] || "mar1";
  // correção (v1.3): o plano inicial somava a novembro 1 noturno e 3 sobreavisos que não existem no Meu Plantão
  // (R$ 2.500 a mais). Saem os 4, e a renda de dezembro deixa de ficar presa em 13.650 e passa a seguir a previsão.
  e.mig = e.mig || {};
  // v1.6: o texto entre parênteses (ou depois de ":") vira o detalhe cinza; água e luz separadas; Lightroom e Dazz Cam separados
  if (!e.mig.detalhes) {
    const ajusta = (itens) => itens.flatMap((i) => {
      let it = Object.assign({}, i);
      const m = /^(.*?)\s*\((.+)\)\s*$/.exec(it.n) || (!/^\w+\s*\+/.test(it.n) && /^([^:]{2,40}):\s*(.+)$/.exec(it.n));
      if (m && !it.obs) { it.n = m[1].trim(); it.obs = m[2].trim(); }
      if (/^agua \+ luz/.test(semAcento(it.n))) {
        const v = +it.v || 0, va = v === 350 ? 150 : Math.round(v * 0.43), base = { g: it.g, p: it.p, ess: true, ate: it.ate, so: it.so, cx: it.cx };
        return [Object.assign({}, base, { id: it.id, n: "Água", obs: "Caesb · normal R$ 75 a 104 · checar vazamento", v: va }), Object.assign({}, base, { id: it.id + "l", n: "Luz", obs: "Neoenergia · normal R$ 118 a 206", v: v - va })];
      }
      if (/lightroom \+ dash ?cam/.test(semAcento(it.n))) {
        const base = { g: it.g, p: it.p, ess: false };
        return [Object.assign({}, base, { id: it.id, n: "Lightroom", obs: "R$ 7,90 por mês", v: 7.9 }), Object.assign({}, base, { id: it.id + "d", n: "Dazz Cam", obs: "R$ 19,90 por ano", v: 1.66 })];
      }
      return [it];
    });
    for (const o of Object.values(e.orcamentos || {})) if (Array.isArray(o.itens)) o.itens = ajusta(o.itens);
    if (Array.isArray(e.modeloItens)) e.modeloItens = ajusta(e.modeloItens);
    e.mig.detalhes = true;
  }
  if (!e.mig.rendaConfirmada) {
    const incertos = (e.rendas || []).filter((r) => (r.id === "rnot" && /incerto/i.test(r.desc)) || (/^rs\d$/.test(r.id) && /sobreaviso/i.test(r.desc)));
    if (incertos.length) { e.rendas = e.rendas.filter((r) => !incertos.includes(r)); e.apagados = [...(e.apagados || []), ...incertos.map((r) => r.id)]; const dez = e.orcamentos && e.orcamentos["2026-12"]; if (dez && +dez.renda === 13650) dez.renda = null; e.em = Math.max(e.em || 0, Date.now()); }
    e.mig.rendaConfirmada = true;
  }
  return e;
}
function deAntigo(a) {
  const e = ESTADO_PADRAO(), ym = mesDe(hoje()), cxs = e.caixinhas;
  const acha = (txt) => { const t = semAcento(txt); return cxs.find((c) => t.includes(semAcento(c.nome.split(" ")[0]))); };
  const itens = a.itens.map((i) => {
    const g = ["res", "son", "col"].includes(i.g) ? "cx" : i.g === "vida" ? "vida" : "fix";
    let cx = g === "cx" ? acha(i.p || i.n) : null;
    if (g === "cx" && !cx) { cx = { id: uid("c"), nome: String(i.n).replace(/^caixinha\s*/i, "").split(":")[0].trim(), cor: "mar6", meta: 0, aporte: 0, naMeta: true }; cxs.push(cx); }
    return { id: uid("o"), n: i.n, g, v: +i.v || 0, p: cx ? "Caixinha " + cx.nome : i.p || "", ...(cx ? { cx: cx.id } : {}) };
  });
  e.orcamentos[ym] = { renda: +a.renda || null, itens }; e.modeloItens = itens.map((i) => Object.assign({}, i));
  if (+a.guardado) e.movimentos.push({ id: uid("m"), cx: "reserva", data: hoje(), valor: +a.guardado, desc: "Saldo inicial (painel antigo)" });
  e.config.rendMes = +a.rend || 0;
  return e;
}

const todasTx = () => { const cfg = estado.config, aj = estado.ajustes || {}; return Object.values(txs).flat().map((t) => Object.assign({}, t, { cat: catDe(t, cfg, aj) })); };
const cxDe = (id) => (estado.caixinhas || []).find((c) => c.id === id);
const apaga = (lista, id) => { estado[lista] = (estado[lista] || []).filter((x) => x.id !== id); estado.apagados = [...(estado.apagados || []), id].slice(-500); };
const proxSalario = (h) => { const dia = estado.config.diaSalario || 20, ym = mesDe(h); return +h.slice(8, 10) <= dia ? somaMes(ym, -1) : ym; };
function garanteOrc(ym) { if (!estado.orcamentos[ym]) { const o = orcamentoDe(estado, ym); delete o.novo; estado.orcamentos[ym] = o; } return estado.orcamentos[ym]; }

// ---------- abas ----------
const ABAS = [["inicio", "Início", "🏠"], ["orcamento", "Orçamento", "📊"], ["caixinhas", "Caixinhas", "🐷"], ["extratos", "Extratos", "💳"], ["mais", "Mais", "☰"]];
const MAIS = [["consultor", "Consultor", "💬", "mar5"], ["renda", "Renda e plantões", "🩺", "mar1"], ["raiox", "Raio-X", "🔎", "mar6"], ["calendario", "Calendário", "📅", "mar2"], ["milhas", "Milhas", "✈️", "mar5"], ["ajustes", "Ajustes", "⚙️", "gray"]];
const TITULOS = { consultor: "Consultor", inicio: "Início", orcamento: "Orçamento", caixinhas: "Caixinhas", extratos: "Extratos", mais: "Mais", renda: "Renda", raiox: "Raio-X", calendario: "Calendário", milhas: "Milhas", ajustes: "Ajustes" };
const ui = Object.assign({ aba: "inicio", mes: null, txMes: "", txCat: "", rxPer: 6 }, lsGet(LS.ui, {}));
const guardaUi = () => lsSet(LS.ui, { aba: ui.aba, rxPer: ui.rxPer, tema: ui.tema });
let animar = true;
function vaiPara(aba) {
  if (!TITULOS[aba]) aba = "inicio";
  if (!$("#folha").hidden) fechaFolha();
  ui.aba = aba; guardaUi(); animar = true;
  if (location.hash !== "#" + aba) try { history.replaceState(null, "", "#" + aba); } catch (e) {}
  redesenha(); window.scrollTo({ top: 0 });
}
function desenhaAbas() {
  const sel = MAIS.some((m) => m[0] === ui.aba) ? "mais" : ui.aba;
  $("#abas").innerHTML = ABAS.map(([k, n, e]) => `<button class="aba" role="tab" aria-selected="${sel === k}" data-aba="${k}" type="button"><i aria-hidden="true">${e}</i>${n}</button>`).join("");
  $$("#abas [data-aba]").forEach((b) => (b.onclick = () => vaiPara(b.dataset.aba)));
}
function aplicaTema() { const t = ui.tema; if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); }
function redesenha() {
  if (!estado) return;
  const h = hoje(), d = new Date(h + "T12:00:00");
  $("#titulo").textContent = TITULOS[ui.aba] || "Início";
  const dt = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); $("#hojeTxt").textContent = dt.charAt(0).toUpperCase() + dt.slice(1);
  desenhaAbas();
  const el = $("#corpo"), y = window.scrollY;
  $("#app").classList.toggle("anima", animar);
  try { ({ inicio: telaInicio, orcamento: telaOrcamento, caixinhas: telaCaixinhas, extratos: telaExtratos, mais: telaMais, consultor: telaConsultor, renda: telaRenda, raiox: telaRaiox, calendario: telaCalendario, milhas: telaMilhas, ajustes: telaAjustes })[ui.aba](el, h); }
  catch (e) { console.error(e); el.innerHTML = `<div class="tela"><div class="aviso" style="--c:var(--bad)"><span class="ico">⚠️</span><div><b>Não consegui montar esta tela</b><br><small>${esc(e.message || e)}. Seus dados estão salvos; me mande esta frase.</small></div></div></div>`; }
  $("#fab").hidden = ["ajustes", "mais", "consultor"].includes(ui.aba);
  if (animar) { animaContas(el); animar = false; setTimeout(() => $("#app").classList.remove("anima"), 1000); } else window.scrollTo({ top: y });
  mostraSelo();
}
const ligaCampos = (el) => $$("[data-k]", el).forEach((i) => (i.onchange = () => {
  const path = i.dataset.k.split("."); let o = estado; for (const p of path.slice(0, -1)) o = o[p] = o[p] || {};
  const k = path[path.length - 1];
  o[k] = i.type === "checkbox" ? i.checked : i.dataset.num != null ? numero(i.value) : i.dataset.lista != null ? i.value.split(",").map((s) => s.trim()).filter(Boolean) : i.value.trim();
  salva(); redesenha();
}));

// ---------- lançar gasto da mesada ----------
function folhaGasto() {
  const h = hoje();
  abreFolha("Lançar gasto", `<div class="grupo">${campo("Valor", `<input id="gV" inputmode="decimal" placeholder="R$ 0,00">`)}${campo("Onde", `<input id="gD" placeholder="ex.: bar com o Pedro">`)}${campo("Dia", `<input id="gDt" type="date" value="${h}">`)}</div>
    <p class="rod">Sai da mesada da semana (${brl(estado.config.mesadaSemanal)}). As compras no débito do extrato do Nubank entram sozinhas.</p>`, (f) => {
    $("#folhaDir").onclick = () => {
      const v = numero($("#gV", f).value); if (!v) { toast("Digite o valor"); return; }
      estado.gastosSemana.push({ id: uid("g"), data: $("#gDt", f).value || h, valor: v, desc: $("#gD", f).value.trim(), em: Date.now() });
      estado.gastosSemana = estado.gastosSemana.filter((g) => g.data >= somaDias(h, -90));
      salva(); fechaFolha(); redesenha(); toast(`Gasto de ${brl(v)} lançado`);
    };
  }, "Lançar");
}

// ---------- Início ----------
function telaInicio(el, h) {
  const cfg = estado.config, ref1 = proxSalario(h), r1 = rendaDoMes(estado, ref1, h), r2 = rendaDoMes(estado, somaMes(ref1, 1), h);
  const ymG = mesDe(r1.recebe), o = orcamentoDe(estado, ymG), t = totaisOrc(o), renda = o.renda != null ? +o.renda : r1.min, sobra = renda - t.total;
  const t2 = totaisOrc(orcamentoDe(estado, mesDe(r2.recebe)));
  const tx = todasTx(), ms = mesada(estado, tx, h), pm = projetaMeta(estado, h), al = alertas({ tx, cfg, hoje: h });
  const evs = eventos(estado, h, 2).slice(0, 4), dias1 = diasEntre(h, r1.recebe);
  const contados = r1.plantoes.filter((p) => p.status === "contado").length;
  const pct = Math.min(100, (pm.ini.tot / pm.metaG) * 100), proxMarco = pm.marcos.find((m) => m.ym !== "feito");
  const pend = (estado.pendencias || []).filter((p) => !p.feito);
  const ultExtrato = Object.keys(txs).sort().pop();
  festaSemana(h, tx);
  el.innerHTML = `<div class="tela">
    <section class="hero">
      <span class="k">Próximo salário · ${diaSem(r1.recebe)}, ${diaMes(r1.recebe)} · ${em(dias1)}</span>
      <span class="v num">${r1.max ? conta(r1.min) : "—"}${r1.max > r1.min ? ` <small>pode chegar a ${brl(r1.max)}</small>` : ""}</span>
      <span class="s">Plantões de ${mesNome(ref1)}${r1.usaPl ? ` · ${contados} contados no Meu Plantão` : ""}${r1.pago ? " · recebido" : ""}</span>
      <div class="pils"><span class="pil">Orçado<b class="num">${brl(t.total)}</b></span><span class="pil">${sobra >= 0 ? "Sobra" : "Estouro"}<b class="num">${brl(sobra)}</b></span><span class="pil">Caixinhas<b class="num">${brl(t.cx)}</b></span></div>
    </section>
    <div class="duo">
      <button class="tile" data-ir="mesada" type="button"><span class="ico" style="--c:var(--mar4)">🛍️</span><span class="k">Mesada da semana</span><span class="v" style="${ms.resta < 0 ? "color:var(--bad)" : ""}">${conta(ms.resta)}</span>${barra((ms.gasto / ms.valor) * 100, ms.resta < 0 ? "bad" : "mar4")}<span class="s">${ms.resta > 0 ? `${brl(ms.porDia)} por dia até dom.` : "semana fechada"}</span></button>
      <button class="tile" data-ir="caixinhas" type="button"><span class="ico" style="--c:var(--mar5)">🐷</span><span class="k">Meta ${brl(pm.metaG)}</span><span class="v">${conta(pct, (x) => Math.round(x) + "%")}</span>${barra(pct, "mar5")}<span class="s">${proxMarco && proxMarco.ym ? `${esc(proxMarco.n.split(" (")[0])}: ${nomeMes(proxMarco.ym, true)}` : `${brl(pm.ini.tot)} guardados`}</span></button>
    </div>
    ${numeroHtml(h)}
    <div class="grupo"><button class="li" data-ir="consultor" type="button"><span class="ico cheio" style="--c:var(--mar5)">💬</span><span class="t"><span>Conversar com o consultor</span><small>Pergunte qualquer coisa: compras, plantões, metas, o mês que vem</small></span><span class="chev">›</span></button><button class="li" data-ir="assistente" type="button"><span class="ico cheio" style="--c:var(--mar2)">✨</span><span class="t"><span>Mandar para a IA</span><small>Extrato do mês, foto, print ou só uma frase: ela lança e calcula</small></span><span class="chev">›</span></button>
      ${li({ em: "📥", cor: "mar1", t: "Extrato do mês", s: ultExtrato ? `último importado: ${nomeMes(ultExtrato)}` : "nenhum importado ainda", chev: true, attrs: 'data-ir="extratos"' })}</div>
    <section class="bloco"><div class="tit">${mesNome(ymG)}<button data-ir="orcamento" type="button">Ver tudo</button></div>
      <div class="grupo">${Object.entries(GRUPOS).map(([g, G]) => li({ em: EMO_GRUPO[g], cor: COR_GRUPO[g], t: G.n, s: o.itens.filter((i) => i.g === g).slice(0, 3).map((i) => esc(i.n.split(" (")[0])).join(", "), v: brl(t[g]), chev: true, attrs: 'data-ir="orcamento"' })).join("")}</div></section>
    <section class="bloco"><div class="tit">Depois · ${diaMes(r2.recebe)}</div>
      <div class="grupo">${li({ em: "🔭", cor: "mar6", t: r2.max ? `${faixa(r2.min, r2.max)}` : "Nenhum plantão marcado ainda", s: `Plantões de ${mesNome(r2.ym)}${r2.plantoes.length ? ` · ${r2.plantoes.length} na escala` : ""}`, chev: true, attrs: 'data-ir="renda"' })}
      ${r2.min ? li({ em: "🧮", cor: "mar2", t: "Livre depois dos fixos", s: `fixos de ${mesNome(mesDe(r2.recebe))}: ${brl(t2.fix)}`, v: brl(r2.min - t2.fix) }) : ""}</div>
      ${r2.min && cfg.salarioFixo && r2.min < cfg.salarioFixo ? `<div class="aviso"><span class="ico">🌊</span><div><b>Mês fraco à vista</b><br><small>A previsão está abaixo do seu salário fixo de ${brl(cfg.salarioFixo)}. A caixinha Renda cobre a diferença.</small></div></div>` : ""}</section>
    ${al.length ? `<section class="bloco"><div class="tit">Atenção</div>${al.map((a) => `<div class="aviso" style="--c:var(--${a.n === "bad" ? "bad" : "warn"})"><span class="ico">${a.n === "bad" ? "🚨" : "⚠️"}</span><div><b>${esc(a.t)}</b><br><small>${esc(a.d)}</small></div></div>`).join("")}</section>` : ""}
    <section class="bloco"><div class="tit">Próximas datas<button data-ir="calendario" type="button">Calendário</button></div>
      <div class="grupo">${evs.map((e) => evLi(e, h)).join("")}</div></section>
    <section class="bloco"><div class="tit">Pendências · ${pend.length}</div>
      <div class="grupo">${pend.map((p) => `<label class="li"><input type="checkbox" class="troca" data-pend="${p.id}"><span class="t">${esc(p.t)}</span></label>`).join("") || `<div class="vazio">Nada pendente 🌊</div>`}
      <button class="li add" data-novapend type="button"><span class="ico">＋</span><span class="t">Nova pendência</span></button></div>
      ${(estado.pendencias || []).some((p) => p.feito) ? `<details class="grupo"><summary class="li" style="color:var(--sec)">Concluídas · ${estado.pendencias.filter((p) => p.feito).length}</summary>${estado.pendencias.filter((p) => p.feito).map((p) => `<label class="li"><input type="checkbox" class="troca" data-pend="${p.id}" checked><span class="t" style="color:var(--sec);text-decoration:line-through">${esc(p.t)}</span></label>`).join("")}</details>` : ""}</section>
  </div>`;
  $$("[data-ir]", el).forEach((b) => (b.onclick = () => (b.dataset.ir === "mesada" ? folhaMesada(h) : b.dataset.ir === "assistente" ? abreAssistente() : b.dataset.ir === "numero" ? folhaNumero(h) : vaiPara(b.dataset.ir))));
  $$("[data-pend]", el).forEach((c) => (c.onchange = () => { const p = estado.pendencias.find((x) => x.id === c.dataset.pend); p.feito = c.checked; p.em = Date.now(); salva(); if (c.checked) toast("Feito ✓ · está em Concluídas"); if (c.checked && !estado.pendencias.some((x) => !x.feito)) festa("🎉", "Todas as pendências resolvidas!"); setTimeout(redesenha, 350); }));
  $("[data-novapend]", el).onclick = () => abreFolha("Nova pendência", `<div class="grupo"><label class="campo col"><input id="pT" placeholder="O que fazer"></label></div>`, (f) => { $("#folhaDir").onclick = () => { const t = $("#pT", f).value.trim(); if (!t) return; estado.pendencias.push({ id: uid("p"), t, feito: false }); salva(); fechaFolha(); redesenha(); }; }, "Adicionar");
  ligaEv(el);
}
// ---------- meu número mínimo ----------
function numeroHtml(h) {
  const nm = numeroMinimo(estado, mesDe(h), h), e = nm.essencial, i = nm.ideal, mx = Math.max(i.alvo, nm.ganho, 1);
  const msg = e.falta > 0 ? `Faltam <b>${brl(e.falta)}</b> para o essencial: ${e.fichas} fichas${e.plantoes ? `, uns ${e.plantoes} plantões no seu ritmo` : ""}.` : i.falta > 0 ? `Essencial garantido ✓ Faltam <b>${brl(i.falta)}</b> para o orçamento inteiro: ${i.fichas} fichas${i.plantoes ? `, uns ${i.plantoes} plantões` : ""}.` : `Orçamento de ${mesNome(nm.ymPag)} inteiro garantido ✓ O que vier a mais vai para a reserva.`;
  return `<button class="tile" data-ir="numero" type="button" style="gap:6px"><span class="k">🎯 Meu número · plantões de ${mesNome(nm.ymTrab)} → salário de ${diaMes(nm.recebe)}</span>
    <span class="v">${conta(nm.ganho)} <span style="font-size:14px;font-weight:500;color:var(--sec)">ganhos de ${brl(e.alvo)} essenciais</span></span>
    <span class="pilha" style="height:10px"><i style="--w:${(Math.min(nm.ganho, mx) / mx) * 100}%;--c:var(--mar2)"></i></span>
    <span class="s" style="display:flex;justify-content:space-between"><span>essencial ${brl(e.alvo)}</span><span>orçamento ${brl(i.alvo)}</span></span>
    <span class="s" style="font-size:14px;color:var(--txt)">${msg}</span></button>`;
}
function folhaNumero(h) {
  const nm = numeroMinimo(estado, mesDe(h), h), o = orcamentoDe(estado, nm.ymPag), rt = nm.ritmo;
  const ess = o.itens.filter(ehEssencial), pau = o.itens.filter((x) => !ehEssencial(x));
  abreFolha("Meu número", `<section class="hero"><span class="k">Plantões de ${mesNome(nm.ymTrab)} · caem em ${diaMes(nm.recebe)}</span><span class="v num">${brl(nm.ganho)}</span><span class="s">ganhos até agora, só fichas contadas${nm.marcados ? ` · ${nm.marcados} plantões marcados ainda sem fichas (valem zero até acontecer)` : ""}</span>
      <div class="pils"><span class="pil">Essencial<b>${brl(nm.essencial.alvo)}</b></span><span class="pil">Orçamento<b>${brl(nm.ideal.alvo)}</b></span>${rt ? `<span class="pil">Seu ritmo<b>${brl(Math.round(rt.mediaValor))}/plantão</b></span>` : ""}</div></section>
    <div class="grupo">${li({ em: "🛟", cor: "mar2", t: "Para o essencial", s: nm.essencial.falta ? `${nm.essencial.fichas} fichas${nm.essencial.plantoes ? ` · uns ${nm.essencial.plantoes} plantões` : ""}` : "garantido", v: nm.essencial.falta ? brl(nm.essencial.falta) : "✓" })}${li({ em: "🌊", cor: "mar1", t: "Para o orçamento inteiro", s: nm.ideal.falta ? `${nm.ideal.fichas} fichas${nm.ideal.plantoes ? ` · uns ${nm.ideal.plantoes} plantões` : ""}` : "garantido", v: nm.ideal.falta ? brl(nm.ideal.falta) : "✓" })}</div>
    <p class="rod">${rt ? `Seu ritmo nos últimos 90 dias: ${rt.plantoes} plantões, média de ${Math.round(rt.mediaFichas)} fichas e ${brl(Math.round(rt.mediaValor))} por plantão. É só referência: o dinheiro só conta quando as fichas existem.` : "Quando houver pelo menos 3 plantões com fichas nos últimos 90 dias, aparece quantos plantões isso dá no seu ritmo."}</p>
    <section class="bloco"><div class="tit">Essencial · ${brl(ess.reduce((a, x) => a + +x.v, 0))}</div><div class="grupo">${ess.map((x) => li({ em: emoItem(x), cor: "mar2", t: esc(x.n), v: brl(+x.v) })).join("")}</div></section>
    <section class="bloco"><div class="tit">Pausável · ${brl(pau.reduce((a, x) => a + +x.v, 0))}</div><div class="grupo">${pau.map((x) => li({ em: emoItem(x), cor: "gray", t: esc(x.n), v: brl(+x.v) })).join("")}</div><p class="rod">Mude o que é essencial tocando no item em Orçamento.</p></section>`);
}
function folhaMesada(h) {
  const ms = mesada(estado, todasTx(), h);
  abreFolha("Mesada da semana", `<section class="hero areia"><span class="k">${diaMes(ms.ini)} a ${diaMes(ms.fim)}</span><span class="v num">${brl(ms.resta)}</span><span class="s">restam de ${brl(ms.valor)} · ${ms.resta > 0 ? `${brl(ms.porDia)} por dia` : "semana fechada"}</span></section>
    <button class="btn" id="mLanca" type="button">＋ Lançar gasto</button>
    <div class="grupo">${ms.man.map((g) => li({ em: "🛍️", cor: "mar4", t: esc(g.desc || "Gasto"), s: `${diaSem(g.data)}, ${diaMes(g.data)}`, v: brl(g.valor), attrs: `data-tg="${g.id}"` })).join("")}${ms.deb.map((t) => li({ em: "💳", cor: "mar1", t: esc(t.desc.replace(/^compra no d[eé]bito\s*-\s*/i, "")), s: `${diaMes(t.data)} · débito do extrato`, v: brl(t.valor) })).join("") || (ms.man.length ? "" : `<div class="vazio">Nada gasto nesta semana ainda 🌊</div>`)}</div>
    ${ms.man.length ? `<p class="rod">Toque num gasto lançado para apagar.</p>` : ""}`, (f) => {
    $("#mLanca", f).onclick = () => { fechaFolha(); setTimeout(folhaGasto, 300); };
    $$("[data-tg]", f).forEach((b) => (b.onclick = () => { const g = estado.gastosSemana.find((x) => x.id === b.dataset.tg); apaga("gastosSemana", b.dataset.tg); salva(); fechaFolha(); redesenha(); toast("Gasto apagado", { rot: "Desfazer", fn: () => { estado.gastosSemana.push(g); estado.apagados = estado.apagados.filter((x) => x !== g.id); salva(); redesenha(); } }); }));
  });
}
// comemora a semana fechada dentro da mesada (uma vez por semana)
function festaSemana(h, tx) {
  const ant = somaDias(segundaDe(h), -7), chave = "sem" + ant; estado.festas = estado.festas || {};
  if (estado.festas[chave] || !(estado.gastosSemana || []).some((g) => g.data >= ant && g.data <= somaDias(ant, 6))) return;
  const m = mesada(estado, tx, somaDias(ant, 6)); estado.festas[chave] = true; lsSet(LS.est, estado);
  if (m.resta >= 0) setTimeout(() => festa("🏝️", `Semana passada dentro da mesada: sobraram ${brl(m.resta)}`), 600);
}
function evLi(e, h) {
  const d = new Date(e.data + "T12:00:00"), n = diasEntre(h, e.data);
  return `<button class="li" type="button" data-ev="${esc(JSON.stringify({ t: e.t, d: e.d, data: e.data, fim: e.fim || "", id: e.id || "" }))}"><span class="data" style="--c:var(--${({ salario: "mar2", fatura: "mar1", anual: "mar5", milhas: "orange", meu: "mar6" })[e.tipo] || "mar1"})">${d.getDate()}<small>${MESES_C[d.getMonth()]}</small></span><span class="t"><span>${esc(e.t)}</span><small>${e.fim ? `até ${diaMes(e.fim)} · ` : ""}${diaSem(e.data)} · ${em(n)}</small></span><span class="chev">›</span></button>`;
}
function ligaEv(el) {
  $$("[data-ev]", el).forEach((b) => (b.onclick = () => {
    const e = JSON.parse(b.dataset.ev);
    abreFolha("Data", `<div class="grupo">${li({ em: "📅", cor: "mar1", t: esc(e.t), s: `${diaSem(e.data)}, ${diaMes(e.data)}${e.fim ? ` até ${diaMes(e.fim)}` : ""}` })}${e.d ? `<div class="li sem-ico"><span class="t"><small style="font-size:15px">${esc(e.d)}</small></span></div>` : ""}</div>
      <a class="btn" href="${gcal(e.t, e.data, e.fim, e.d)}" target="_blank" rel="noopener">Pôr no Google Agenda</a>
      ${e.id ? `<div class="grupo"><button class="li perigo" id="evApaga" type="button">Apagar esta data</button></div>` : ""}`, (f) => {
      const a = $("#evApaga", f); if (a) a.onclick = () => { apaga("eventos", e.id); salva(); fechaFolha(); redesenha(); };
    });
  }));
}

// ---------- Orçamento ----------
const ONDES = ["Ultravioleta", "Pix", "Débito automático Nubank", "BB débito", "Boleto"];
function telaOrcamento(el, h) {
  const ym = ui.mes || mesDe(rendaDoMes(estado, proxSalario(h), h).recebe); ui.mes = ym;
  const o = orcamentoDe(estado, ym), t = totaisOrc(o), r = rendaDoMes(estado, somaMes(ym, -1), h);
  const renda = o.renda != null ? +o.renda : r.min, sobra = renda - t.total, base = Math.max(renda, t.total) || 1;
  const parcUV = (estado.config.parcelasManual || {})[ym] || 0, escImp = escadaParcelas(todasTx(), ym).escada[ym] || 0, parc = Math.max(escImp, parcUV);
  const uv = o.itens.filter((i) => /ultravioleta/i.test(i.p || "")).reduce((a, i) => a + (+i.v || 0), 0);
  el.innerHTML = `<div class="tela">
    <div class="mes"><button data-mes="-1" aria-label="Mês anterior" type="button">‹</button><b>${nomeMes(ym).replace(/^./, (c) => c.toUpperCase())}</b><button data-mes="1" aria-label="Próximo mês" type="button">›</button></div>
    <section class="hero">
      <span class="k">${sobra >= 0 ? "Sobra do mês" : "Estouro do mês"}</span>
      <span class="v num">${conta(sobra)}</span>
      <span class="s">Renda ${brl(renda)}${o.renda == null ? " (previsão dos plantões)" : ""} · orçado ${brl(t.total)}</span>
      <span class="pilha" style="margin-top:12px;background:rgba(255,255,255,.2)">${Object.keys(GRUPOS).map((g) => `<i style="--w:${(t[g] / base) * 100}%;--c:${g === "fix" ? "#FFFFFF" : g === "vida" ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.45)"}"></i>`).join("")}</span>
      <div class="pils">${Object.entries(GRUPOS).map(([g, G]) => `<span class="pil">${G.n}<b class="num">${brl(t[g])}</b></span>`).join("")}<span class="pil">Essencial<b class="num">${brl(totaisEss(o).ess)}</b></span></div>
    </section>
    ${(() => { const cf = confereOrcamento(o.itens, todasTx(), h); return cf.length ? `<button class="aviso" id="oConf" type="button" style="--c:var(--mar1);text-align:left;width:100%"><span class="ico">🔎</span><div><b>Conferi com os seus extratos: ${cf.length} ${cf.length === 1 ? "valor diferente" : "valores diferentes"}</b><br><small>${cf.slice(0, 3).map((c) => esc(c.n)).join(", ")}${cf.length > 3 ? "…" : ""} · toque para ver e ajustar</small></div></button>` : ""; })()}
    <button class="btn" id="oIA" type="button">✨ Montar o plano com o consultor</button>
    ${o.novo ? `<div class="aviso" style="--c:var(--mar1)"><span class="ico">📝</span><div><b>Mês ainda não montado</b><br><small>Mostrando a base do mês anterior. Ao mudar qualquer coisa, vira o orçamento de ${mesNome(ym)}.</small></div></div>` : ""}
    <section class="bloco"><div class="tit">Renda</div><div class="grupo">${li({ em: "💵", cor: "mar2", t: "Renda do mês", s: `previsão dos plantões de ${mesNome(r.ym)}: ${r.max ? faixa(r.min, r.max) : "nenhum"}`, v: brl(renda), chev: true, attrs: 'data-renda="1"' })}</div></section>
    ${sobra < 0 ? `<div class="aviso" style="--c:var(--bad)"><span class="ico">🚨</span><div><b>Passou da renda em ${brl(-sobra)}</b><br><small>Corte em estilo de vida ou nas caixinhas.</small></div></div>` : ""}
    ${Object.entries(GRUPOS).map(([g, G]) => `<section class="bloco"><div class="tit">${G.n}<b class="num">${brl(t[g])}</b></div><div class="grupo">
      ${o.itens.filter((i) => i.g === g).map((i) => li({ em: emoItem(i), cor: COR_GRUPO[g], t: esc(i.n), s: (ehEssencial(i) ? '<span class="etq" style="--c:var(--mar2)">essencial</span> ' : '<span class="etq">pausável</span> ') + esc([i.obs, i.p, i.ate ? `até ${nomeMes(i.ate, true)}` : "", i.so ? `só em ${nomeMes(i.so, true)}` : ""].filter(Boolean).join(" · ")), v: brl(+i.v || 0), chev: true, attrs: `data-item="${i.id}"` })).join("")}
      <button class="li add" data-novo="${g}" type="button"><span class="ico">＋</span><span class="t">Adicionar em ${G.n.toLowerCase()}</span></button></div></section>`).join("")}
    <section class="bloco">
      ${o.distribuido ? `<div class="aviso" style="--c:var(--ok)"><span class="ico">✅</span><div><b>Distribuído nas caixinhas em ${diaMes(o.distribuido)}</b><br><button class="lnk" id="oDesfaz" type="button">Desfazer distribuição</button></div></div>` : `<button class="btn" id="oDistr" type="button">Dia ${estado.config.diaSalario}: guardar nas caixinhas</button><p class="rod">Quando o salário cair: pague a fatura e separe no app do Nubank o valor de cada caixinha deste orçamento. Depois toque aqui para registrar: o app soma esses valores no saldo de cada caixinha, para acompanhar as metas.</p>`}
      <button class="btn sec" id="oModelo" type="button">Usar como modelo dos próximos meses</button>
    </section>
    <section class="bloco"><div class="tit">Fatura do Ultravioleta prevista</div><div class="grupo">
      ${li({ em: "💳", cor: "mar1", t: "Itens do orçamento", v: brl(uv) })}${li({ em: "🧩", cor: "mar5", t: "Parcelas antigas", s: escImp > parcUV ? "das faturas importadas" : "planilha da consultoria", v: brl(parc) })}${li({ em: "🧾", cor: "mar2", t: "<b>Fatura estimada</b>", v: brl(uv + parc) })}</div>
      <p class="rod">${uv + parc >= 8000 ? "Passa de R$ 8 mil: a mensalidade sai de graça neste ciclo." : "Abaixo de R$ 8 mil: paga a mensalidade de R$ 89. Nunca gaste a mais para bater a meta."}</p></section>
  </div>`;
  $$("[data-mes]", el).forEach((b) => (b.onclick = () => { ui.mes = somaMes(ym, +b.dataset.mes); animar = true; redesenha(); }));
  $("[data-renda]", el).onclick = () => abreFolha("Renda do mês", `<div class="grupo">${campo("Renda (R$)", `<input id="fR" inputmode="decimal" value="${o.renda != null ? vIn(o.renda) : ""}" placeholder="${vIn(r.min)}">`)}</div><p class="rod">Em branco, usa a previsão dos plantões de ${mesNome(r.ym)} (${r.max ? faixa(r.min, r.max) : "nenhum"}), que se atualiza sozinha.</p>`, (f) => {
    $("#folhaDir").onclick = () => { const O = garanteOrc(ym), v = $("#fR", f).value.trim(); O.renda = v === "" ? null : numero(v); salva(); fechaFolha(); redesenha(); };
  }, "Salvar");
  $$("[data-item]", el).forEach((b) => (b.onclick = () => folhaItem(ym, b.dataset.item)));
  $("#oIA", el).onclick = () => folhaPlanoIA(ym);
  const oc = $("#oConf", el); if (oc) oc.onclick = () => folhaConfere(ym, h);
  $$("[data-novo]", el).forEach((b) => (b.onclick = () => folhaItem(ym, null, b.dataset.novo)));
  const dist = $("#oDistr", el);
  if (dist) dist.onclick = () => {
    const O = garanteOrc(ym), data = dataNoMes(ym, estado.config.diaSalario || 20), its = O.itens.filter((i) => i.cx && cxDe(i.cx) && +i.v);
    if (!its.length) { toast('Nenhum item com "onde pagar" numa caixinha'); return; }
    const antes = projetaMeta(estado, h).ini;
    its.forEach((i) => estado.movimentos.push({ id: uid("m"), cx: i.cx, data, valor: +i.v, desc: `${i.n} (${nomeMes(ym, true)})`, orc: ym, em: Date.now() }));
    O.distribuido = h; salva(); redesenha();
    if (!checaMetas(antes)) festa("💸", `${brl(its.reduce((a, i) => a + +i.v, 0))} distribuídos em ${its.length} caixinhas`);
  };
  const des = $("#oDesfaz", el); if (des) des.onclick = () => { const O = garanteOrc(ym); estado.movimentos.filter((m) => m.orc === ym).forEach((m) => apaga("movimentos", m.id)); delete O.distribuido; salva(); redesenha(); };
  $("#oModelo", el).onclick = () => { estado.modeloItens = o.itens.filter((i) => !i.so).map((i) => Object.assign({}, i)); salva(); toast("Os meses ainda não montados partem deste"); };
}
function folhaConfere(ym, h) {
  const cf = confereOrcamento(orcamentoDe(estado, ym).itens, todasTx(), h);
  abreFolha("Conferência com os extratos", `<p class="rod">Comparei cada item do orçamento com o que saiu de verdade nos seus extratos. Fixos: vale a última cobrança. Variáveis (água, luz, combustível, mercado): a média dos últimos meses. Marque o que quer ajustar.</p>
    <div class="grupo">${cf.map((c, i) => `<label class="li"><span class="ico" style="--c:var(--mar1)">${emoItem({ n: c.n, g: "fix" })}</span><span class="t"><span>${esc(c.n)}: ${brl2(c.atual)} → <b>${brl2(c.sugerido)}</b></span><small>${esc(c.base)}</small></span><input type="checkbox" class="troca" data-cf="${i}" checked></label>`).join("")}</div>`, (f) => {
    $("#folhaDir").onclick = () => {
      const O = garanteOrc(ym); let n = 0;
      cf.forEach((c, i) => { if ($(`[data-cf="${i}"]`, f).checked) { const it = O.itens.find((x) => x.id === c.id); if (it) { it.v = c.sugerido; n++; } } });
      salva(); fechaFolha(); animar = true; redesenha(); toast(n ? `${n} ${n === 1 ? "valor ajustado" : "valores ajustados"} com os extratos` : "Nada ajustado");
    };
  }, "Ajustar");
}
function folhaItem(ym, id, grupoNovo) {
  const o = orcamentoDe(estado, ym), i = id ? o.itens.find((x) => x.id === id) : { n: "", g: grupoNovo, v: "", p: "" };
  const ondes = [...ONDES, ...estado.caixinhas.map((c) => "Caixinha " + c.nome)];
  abreFolha(id ? "Editar item" : "Novo item", `<div class="grupo">
      ${campo("Nome", `<input id="iN" value="${esc(i.n)}" placeholder="ex.: Mercado">`)}
      ${campo("Valor por mês", `<input id="iV" inputmode="decimal" value="${vIn(i.v)}" placeholder="R$ 0,00">`)}
      ${campo("Detalhe", `<input id="iO" value="${esc(i.obs || "")}" placeholder="ex.: 14 parcelas de R$ 2.136">`)}
      ${campo("Grupo", `<select id="iG">${Object.entries(GRUPOS).map(([k, G]) => `<option value="${k}" ${k === i.g ? "selected" : ""}>${G.n}</option>`).join("")}</select>`)}
      ${campo("Onde pagar", `<input id="iP" list="ondes" value="${esc(i.p || "")}" placeholder="Ultravioleta"><datalist id="ondes">${ondes.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>`)}
      ${campo("Emoji", `<input id="iE" value="${esc(i.em || "")}" placeholder="${emoItem(i)}" maxlength="4">`)}
      ${campo("Termina em", `<input id="iA" type="month" value="${esc(i.ate || "")}">`)}
      ${campo("Essencial (não dá para pausar)", `<input type="checkbox" class="troca" id="iEss" ${ehEssencial(i) ? "checked" : ""}>`)}
    </div>
    <p class="rod">"Onde pagar" igual a uma caixinha faz o valor ir para ela ao distribuir. "Termina em" tira o item dos meses seguintes (ex.: última parcela).</p>
    ${id ? `<div class="grupo"><button class="li perigo" id="iX" type="button">Apagar item</button></div>` : ""}`, (f) => {
    $("#folhaDir").onclick = () => {
      const n = $("#iN", f).value.trim(); if (!n) { toast("Dê um nome ao item"); return; }
      const O = garanteOrc(ym); let it = id ? O.itens.find((x) => x.id === id) : null;
      if (!it) { it = { id: uid("o") }; O.itens.push(it); }
      Object.assign(it, { n, v: numero($("#iV", f).value), g: $("#iG", f).value, p: $("#iP", f).value.trim(), obs: $("#iO", f).value.trim() });
      const e = $("#iE", f).value.trim(); if (e) it.em = e; else delete it.em;
      const a = $("#iA", f).value; if (a) it.ate = a; else delete it.ate;
      it.ess = $("#iEss", f).checked;
      const c = estado.caixinhas.find((c) => semAcento("Caixinha " + c.nome) === semAcento(it.p)); if (c) it.cx = c.id; else delete it.cx;
      salva(); fechaFolha(); redesenha(); toast(id ? "Item salvo" : "Item adicionado");
    };
    const x = $("#iX", f); if (x) x.onclick = () => {
      const O = garanteOrc(ym), k = O.itens.findIndex((y) => y.id === id), [it] = O.itens.splice(k, 1);
      salva(); fechaFolha(); redesenha(); toast(`"${it.n}" apagado`, { rot: "Desfazer", fn: () => { O.itens.splice(k, 0, it); salva(); redesenha(); } });
    };
  }, "Salvar");
}

// ---------- Caixinhas ----------
// comemora marcos cruzados (devolve true se comemorou)
function checaMetas(antes) {
  const pm = projetaMeta(estado, hoje());
  if (antes.tot < pm.metaG && pm.ini.tot >= pm.metaG) { setTimeout(() => festa("🏆", `${brl(pm.metaG)} guardados! Ultravioleta de graça`), 700); return true; }
  for (const m of pm.marcos.slice(0, 2)) if (antes.res < m.alvo && pm.ini.res >= m.alvo) { setTimeout(() => festa("🛟", `${m.n} completa!`), 700); return true; }
  return false;
}
function telaCaixinhas(el, h) {
  const pm = projetaMeta(estado, h, 60), cfg = estado.config, sv = suavizador(estado, h, 6);
  const pct = Math.min(100, (pm.ini.tot / pm.metaG) * 100);
  const serie = pm.serie.filter((_, i) => i % 3 === 2).slice(0, 8), mx = Math.max(pm.metaG, ...serie.map((s) => s.tot));
  el.innerHTML = `<div class="tela">
    <section class="hero fundo">
      <span class="k">Guardado no Nubank</span>
      <span class="v num">${conta(pm.ini.tot)} <small>de ${brl(pm.metaG)}</small></span>
      <span class="bar" style="margin-top:8px"><i style="--w:${pct}%"></i></span>
      <div class="pils">${pm.marcos.map((m) => `<span class="pil">${esc(m.n.split(" (")[0].replace(/ no Nubank/, ""))}<b>${m.ym === "feito" ? "✓ feito" : m.ym ? nomeMes(m.ym, true) : "—"}</b></span>`).join("")}</div>
    </section>
    <details class="grupo"><summary class="li"><span class="ico" style="--c:var(--mar1)">💡</span><span class="t"><span>Como as caixinhas funcionam</span><small>toque para ler</small></span></summary><div class="li sem-ico"><span class="t" style="font-size:14.5px;line-height:1.55">Cada caixinha aqui é espelho de uma caixinha no app do Nubank. O dinheiro fica lá, rendendo; aqui você vê o saldo e a meta.<br><br><b>Todo dia 20</b>, quando o salário cai: 1) pague a fatura; 2) no Nubank, separe o valor de cada caixinha do orçamento do mês; 3) aqui, em Orçamento, toque em <b>Guardar nas caixinhas</b> para registrar.<br><br><b>Reserva</b>: emergência, a meta de 6 meses de custo. <b>Renda</b>: o colchão que cobre mês fraco (como fevereiro). <b>CRM, Provas, Carro</b>: contas certas que não são mensais. <b>Sonhos</b>: troca do carro e viagens. <b>Livre</b>: a mesada da semana, gasta no débito.<br><br>Tirou dinheiro de uma caixinha no Nubank? Toque nela e use <b>Tirar</b>.</span></div></details>
    <section class="bloco"><div class="tit">Caixinhas</div><div class="grupo">
      ${estado.caixinhas.map((c) => { const s = saldoCx(estado, c.id); return li({ em: emoCx(c), cor: c.cor || "mar1", t: esc(c.nome), s: c.meta ? `${Math.min(100, (s / c.meta) * 100).toFixed(0)}% de ${brl(c.meta)}` : c.naMeta ? "conta na meta" : "fora da meta", v: brl(s), chev: true, attrs: `data-cx="${c.id}"`, extra: c.meta ? barra((s / c.meta) * 100, c.cor || "mar1") : "" }); }).join("")}
      <button class="li add" data-novacx type="button"><span class="ico">＋</span><span class="t">Nova caixinha</span></button></div></section>
    <section class="bloco"><div class="tit">Projeção a cada 3 meses</div><div class="grupo"><div class="colunas">${serie.map((s) => `<div><b>${(s.tot / 1000).toFixed(0)} mil</b><i style="--h:${(s.tot / mx) * 100}%;--c:${s.tot >= pm.metaG ? "var(--mar2)" : "var(--mar1)"}"></i><small>${nomeMes(s.ym, true)}</small></div>`).join("")}</div></div>
      <div class="grupo">${campo("Rendimento ao mês (%)", `<input data-k="config.rendMes" data-num inputmode="decimal" value="${vIn(cfg.rendMes)}" placeholder="0">`)}${campo("Custo de vida por mês", `<input data-k="config.custoMensal" data-num inputmode="decimal" value="${vIn(cfg.custoMensal)}">`)}${campo("Meta", `<input data-k="config.metaGuardado" data-num inputmode="decimal" value="${vIn(cfg.metaGuardado)}">`)}</div>
      <p class="rod">Pelos depósitos dos orçamentos montados e, nos outros meses, pelo aporte padrão de cada caixinha. A Turbo rende 120% do CDI: ponha o rendimento para ver as datas com juros.</p></section>
    <section class="bloco"><div class="tit">Salário fixo de si mesmo</div>
      <div class="grupo">${campo("Meu salário fixo", `<input data-k="config.salarioFixo" data-num inputmode="decimal" value="${vIn(cfg.salarioFixo)}" placeholder="ex.: 8000">`)}</div>
      <div class="grupo">${sv.map((s) => li({ em: s.entra ? (s.sobra >= 0 ? "🌊" : "🏜️") : "·", cor: s.sobra >= 0 ? "mar2" : "orange", t: `${nomeMes(s.ym, true)} · entra ${s.entra ? brl(s.entra) : "—"}`, s: s.entra ? `${s.sobra >= 0 ? "sobra" : "falta"} ${brl(Math.abs(s.sobra))}` : "sem plantões marcados", v: `<span style="color:var(--${s.saldo < 0 ? "bad" : "txt"})">${brl(s.saldo)}</span>` })).join("")}</div>
      <p class="rod">À direita, o saldo da caixinha Renda depois de tirar o salário. Todo pagamento do hospital cai nela; no mês fraco, ela cobre.</p></section>
  </div>`;
  ligaCampos(el);
  $$("[data-cx]", el).forEach((b) => (b.onclick = () => folhaCx(b.dataset.cx, h)));
  $("[data-novacx]", el).onclick = () => folhaCxCfg(null);
}
function folhaCx(id, h) {
  const c = cxDe(id), s = saldoCx(estado, id), movs = estado.movimentos.filter((m) => m.cx === id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 12);
  abreFolha(c.nome, `<section class="hero ${id === "renda" ? "areia" : ""}"><span class="k">${emoCx(c)} Saldo</span><span class="v num">${brl(s)}</span><span class="s">${c.meta ? `${Math.min(100, (s / c.meta) * 100).toFixed(0)}% de ${brl(c.meta)} · ` : ""}aporte previsto em ${mesNome(mesDe(h))}: ${brl(aportePrevisto(estado, c, mesDe(h)))}</span>${c.meta ? `<span class="bar" style="margin-top:8px"><i style="--w:${Math.min(100, (s / c.meta) * 100)}%"></i></span>` : ""}</section>
    <div class="grupo">${campo("Valor", `<input id="cV" inputmode="decimal" placeholder="R$ 0,00">`)}${campo("Descrição", `<input id="cD" placeholder="opcional">`)}</div>
    <div class="acoes"><button class="btn" id="cG" type="button">Guardar</button><button class="btn sec" id="cT" type="button">Tirar</button></div>
    <section class="bloco"><div class="tit">Movimentos</div><div class="grupo">${movs.map((m) => li({ em: m.valor < 0 ? "↗️" : "↘️", cor: m.valor < 0 ? "orange" : "mar2", t: esc(m.desc), s: `${diaMes(m.data)}/${m.data.slice(2, 4)}`, v: `<span style="color:var(--${m.valor < 0 ? "bad" : "ok"})">${brl(m.valor)}</span>`, attrs: `data-mv="${m.id}"` })).join("") || `<div class="vazio">Nenhum movimento ainda</div>`}</div>${movs.length ? `<p class="rod">Toque num movimento para apagar.</p>` : ""}</section>
    <div class="grupo"><button class="li" id="cCfg" type="button"><span class="ico" style="--c:var(--gray)">⚙️</span><span class="t">Ajustar caixinha</span><span class="chev">›</span></button></div>`, (f) => {
    const mov = (sinal) => {
      const v = numero($("#cV", f).value); if (!v) { toast("Digite o valor"); return; }
      const antes = projetaMeta(estado, h).ini, antesCx = saldoCx(estado, id);
      estado.movimentos.push({ id: uid("m"), cx: id, data: h, valor: sinal * Math.abs(v), desc: $("#cD", f).value.trim() || (sinal > 0 ? "Depósito" : "Retirada"), em: Date.now() });
      salva(); fechaFolha(); redesenha();
      if (sinal < 0) return toast("Retirada lançada");
      if (c.meta && antesCx < c.meta && antesCx + Math.abs(v) >= c.meta) festa(emoCx(c), `${c.nome}: meta batida!`);
      else if (!checaMetas(antes)) toast(`${brl(v)} guardados em ${c.nome}`);
    };
    $("#cG", f).onclick = () => mov(1); $("#cT", f).onclick = () => mov(-1);
    $$("[data-mv]", f).forEach((b) => (b.onclick = () => { const m = estado.movimentos.find((x) => x.id === b.dataset.mv); apaga("movimentos", m.id); salva(); fechaFolha(); redesenha(); toast("Movimento apagado", { rot: "Desfazer", fn: () => { estado.movimentos.push(m); estado.apagados = estado.apagados.filter((x) => x !== m.id); salva(); redesenha(); } }); }));
    $("#cCfg", f).onclick = () => { fechaFolha(); setTimeout(() => folhaCxCfg(id), 300); };
  });
}
function folhaCxCfg(id) {
  const c = id ? cxDe(id) : { nome: "", cor: "mar6", meta: 0, aporte: 0, naMeta: true };
  const cores = { mar1: "Azul oceano", mar2: "Verde-água", mar3: "Água-marinha", mar4: "Céu", mar5: "Azul profundo", mar6: "Azul claro", violet: "Lavanda", orange: "Coral", amber: "Areia", pink: "Anêmona" };
  abreFolha(id ? "Ajustar caixinha" : "Nova caixinha", `<div class="grupo">
    ${campo("Nome", `<input id="xN" value="${esc(c.nome)}" placeholder="ex.: Viagem Salvador">`)}
    ${campo("Emoji", `<input id="xE" value="${esc(c.em || "")}" placeholder="${emoCx(c)}" maxlength="4">`)}
    ${campo("Meta", `<input id="xM" inputmode="decimal" value="${vIn(c.meta)}" placeholder="R$ 0">`)}
    ${campo("Aporte por mês", `<input id="xA" inputmode="decimal" value="${vIn(c.aporte)}" placeholder="R$ 0">`)}
    ${campo("A partir de", `<input id="xD" type="month" value="${esc(c.aporteDesde || "")}">`)}
    ${campo("Antes disso, por mês", `<input id="xB" inputmode="decimal" value="${vIn(c.aporteAntes)}" placeholder="R$ 0">`)}
    ${campo("Até", `<input id="xT" type="month" value="${esc(c.aporteAte || "")}">`)}
    ${campo("Conta na meta dos R$ 50 mil", `<input type="checkbox" class="troca" id="xMeta" ${c.naMeta ? "checked" : ""}>`)}
    ${campo("Cor", `<select id="xC">${Object.entries(cores).map(([k, n]) => `<option value="${k}" ${k === c.cor ? "selected" : ""}>${n}</option>`).join("")}</select>`)}
  </div>${id ? `<div class="grupo"><button class="li perigo" id="xX" type="button">Apagar caixinha</button></div>` : ""}`, (f) => {
    $("#folhaDir").onclick = () => {
      const n = $("#xN", f).value.trim(); if (!n) { toast("Dê um nome"); return; }
      let x = id ? cxDe(id) : null; if (!x) { x = { id: uid("c") }; estado.caixinhas.push(x); }
      Object.assign(x, { nome: n, meta: numero($("#xM", f).value), aporte: numero($("#xA", f).value), aporteDesde: $("#xD", f).value, aporteAntes: numero($("#xB", f).value), aporteAte: $("#xT", f).value, naMeta: $("#xMeta", f).checked, cor: $("#xC", f).value });
      const e = $("#xE", f).value.trim(); if (e) x.em = e; else delete x.em;
      salva(); fechaFolha(); redesenha(); toast("Caixinha salva");
    };
    const xx = $("#xX", f); if (xx) xx.onclick = () => {
      if (Math.abs(saldoCx(estado, id)) > 0.01) { toast("Zere o saldo antes de apagar"); return; }
      const cc = cxDe(id); estado.caixinhas = estado.caixinhas.filter((y) => y.id !== id); salva(); fechaFolha(); redesenha();
      toast(`${cc.nome} apagada`, { rot: "Desfazer", fn: () => { estado.caixinhas.push(cc); salva(); redesenha(); } });
    };
  }, "Salvar");
}

// ---------- Extratos ----------
async function lerArquivo(f) { const buf = await f.arrayBuffer(); try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { return new TextDecoder("iso-8859-1").decode(buf); } }
async function importaArquivos(files) {
  const rel = [], mudou = new Set();
  for (const f of files) {
    if (!/\.(csv|ofx)$/i.test(f.name)) { rel.push({ ok: false, t: f.name, s: "vai para a IA" }); continue; }
    const r = /\.ofx$/i.test(f.name) ? importarOFX(await lerArquivo(f), f.name) : importarCSV(await lerArquivo(f), f.name);
    if (!r.origem) { rel.push({ ok: false, t: f.name, s: r.erro }); continue; }
    let novas = 0;
    for (const t of r.itens) { const m = t.comp; txs[m] = txs[m] || []; if (!txs[m].some((x) => x.id === t.id)) { t.em = Date.now(); txs[m].push(t); novas++; mudou.add(m); } }
    rel.push({ ok: true, t: f.name, s: `${novas} novas de ${r.itens.length} · ${{ "nu-fatura": "fatura Nubank", "nu-conta": "conta Nubank", "bb-conta": "conta BB", "bb-fatura": "fatura Ourocard" }[r.origem]}` });
  }
  for (const m of mudou) txs[m].sort((a, b) => a.data.localeCompare(b.data));
  if (mudou.size) salva([...mudou]);
  return rel;
}
let relImport = [];
function telaExtratos(el, h) {
  const tx = todasTx().sort((a, b) => b.data.localeCompare(a.data)), meses = Object.keys(txs).sort().reverse();
  if (ui.txMes && !txs[ui.txMes]) ui.txMes = "";
  const f = tx.filter((t) => (!ui.txMes || t.comp === ui.txMes) && (!ui.txCat || t.cat === ui.txCat) && (!ui.txBusca || semAcento(t.desc).includes(semAcento(ui.txBusca))));
  const gastos = f.filter((t) => t.valor > 0 && !CAT_FORA.has(t.cat)).reduce((a, t) => a + t.valor, 0);
  const porDia = {}; for (const t of f.slice(0, 250)) (porDia[t.data] = porDia[t.data] || []).push(t);
  const orig = { "nu-fatura": "fatura Nubank", "nu-conta": "Nubank", "bb-conta": "BB", "bb-fatura": "Ourocard", ia: "pela IA" };
  el.innerHTML = `<div class="tela">
    <label class="hero areia" id="drop" style="cursor:pointer"><span class="k">Extrato do mês</span><span class="v" style="font-size:24px">📥 Anexar extratos</span><span class="s">Pode selecionar tudo de uma vez: CSV e OFX o app lê na hora; PDF (fatura do Ourocard), comprovantes de Pix, fotos e prints vão para a IA, e você confere antes de lançar. O que já entrou não duplica.</span><input type="file" id="arq" accept=".csv,.ofx,.pdf,.txt,text/csv,application/pdf,image/*" multiple hidden></label>
    ${relImport.length ? `<div class="grupo" id="rel">${relImport.map((r) => li({ em: r.ok ? "✅" : "⚠️", cor: r.ok ? "ok" : "warn", t: esc(r.t), s: esc(r.s) })).join("")}</div>` : ""}
    ${meses.length ? `<div class="chips"><button class="chip" data-fm="" aria-pressed="${!ui.txMes}" type="button">Todos</button>${meses.map((m) => `<button class="chip" data-fm="${m}" aria-pressed="${ui.txMes === m}" type="button">${nomeMes(m, true)}</button>`).join("")}</div>
    <div class="grupo">${campo("🔎", `<input id="fBusca" value="${esc(ui.txBusca || "")}" placeholder="Buscar (ex.: tiktok)" style="width:100%;text-align:left">`)}${campo("Categoria", `<select id="fCat"><option value="">Todas</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === ui.txCat ? "selected" : ""}>${EMO_CAT[k]} ${c.n}</option>`).join("")}</select>`)}</div>
    <p class="rod">${f.length} lançamentos · ${brl(gastos)} em gastos${f.length > 250 ? " · mostrando os 250 mais recentes" : ""}</p>
    ${Object.entries(porDia).map(([d, ts]) => `<section class="bloco"><div class="tit">${diaSem(d)}, ${diaMes(d)}</div><div class="grupo">${ts.map((t) => li({ em: EMO_CAT[t.cat], cor: corC(t.cat), t: esc(t.desc), s: `${CATS[t.cat].n}${t.parc ? ` · parcela ${t.parc.k}/${t.parc.n}` : ""} · ${orig[t.origem] || ""}`, v: `<span style="color:var(--${t.valor < 0 ? "ok" : t.cat === "ignorar" ? "sec" : "txt"})">${t.valor < 0 ? "+" : ""}${brl2(Math.abs(t.valor))}</span>`, attrs: `data-tx="${t.id}"` })).join("")}</div></section>`).join("")}
    ${ui.txMes ? `<div class="grupo"><button class="li perigo" id="apagaMes" type="button">Apagar os lançamentos de ${nomeMes(ui.txMes)}</button></div>` : ""}`
    : `<div class="grupo"><div class="vazio">Nenhum extrato ainda. No Mac, os arquivos ficam em FATURAS/FATURAS NUBANK, EXTRATO NUBANK e EXTRATO BB.</div></div>`}
    <p class="rod">Ficam de fora das contas: pagamento de fatura, transferências entre suas contas, caixinhas e valores da fazenda.</p>
  </div>`;
  const arq = $("#arq", el), drop = $("#drop", el);
  const vai = async (files) => {
    const todos = [...files], locais = todos.filter((f) => /\.(csv|ofx)$/i.test(f.name)), ia = todos.filter((f) => !/\.(csv|ofx)$/i.test(f.name));
    relImport = locais.length ? await importaArquivos(locais) : [];
    animar = true; redesenha();
    if (ia.length) abreAssistente(ia, `Extratos, faturas e comprovantes anexados (${ia.map((f) => f.name).join(", ")}). Liste todas as linhas como lançamentos; fatura do Ourocard é origem "bb-fatura" com "fatura" = mês do vencimento.`);
  };
  arq.onchange = () => vai(arq.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.style.opacity = ".8"; };
  drop.ondragleave = () => (drop.style.opacity = "");
  drop.ondrop = (e) => { e.preventDefault(); vai(e.dataTransfer.files); };
  $$("[data-fm]", el).forEach((b) => (b.onclick = () => { ui.txMes = b.dataset.fm; redesenha(); }));
  const fc = $("#fCat", el); if (fc) fc.onchange = () => { ui.txCat = fc.value; redesenha(); };
  const fb = $("#fBusca", el); if (fb) fb.onchange = () => { ui.txBusca = fb.value; redesenha(); };
  $$("[data-tx]", el).forEach((b) => (b.onclick = () => {
    const t = tx.find((x) => x.id === b.dataset.tx), palavra = chaveLoja(t.desc).split(" ").filter((w) => w.length > 2).slice(0, 2).join(" ");
    abreFolha("Lançamento", `<div class="grupo">${li({ em: EMO_CAT[t.cat], cor: corC(t.cat), t: esc(t.desc), s: `${diaMes(t.data)}/${t.data.slice(0, 4)}`, v: brl2(t.valor) })}</div>
      <section class="bloco"><div class="tit">Categoria</div><div class="grupo">${Object.entries(CATS).map(([k, c]) => `<button class="li" data-c="${k}" type="button"><span class="ico" style="--c:var(--${c.cor})">${EMO_CAT[k]}</span><span class="t">${c.n}</span>${k === t.cat ? '<span class="v" style="color:var(--ac)">✓</span>' : ""}</button>`).join("")}</div></section>
      ${palavra ? `<div class="grupo">${campo(`Sempre que aparecer "${esc(palavra)}"`, `<input type="checkbox" class="troca" id="sempre">`)}</div>` : ""}`, (f) => {
      $$("[data-c]", f).forEach((c) => (c.onclick = () => {
        estado.ajustes[t.id] = { cat: c.dataset.c };
        if ($("#sempre", f) && $("#sempre", f).checked) estado.config.regras.push({ t: palavra, cat: c.dataset.c });
        salva(); fechaFolha(); redesenha(); toast(`${EMO_CAT[c.dataset.c]} ${CATS[c.dataset.c].n}`);
      }));
    });
  }));
  const am = $("#apagaMes", el);
  if (am) am.onclick = () => { const m = ui.txMes, bk = txs[m]; delete txs[m]; ui.txMes = ""; salva([m]); if (nuvem.db) nuvem.db.doc("tx/" + m).delete().catch(() => {}); redesenha(); toast("Lançamentos apagados", { rot: "Desfazer", fn: () => { txs[m] = bk; salva([m]); redesenha(); } }); };
}

// ---------- Mais ----------
function telaMais(el) {
  el.innerHTML = `<div class="tela"><div class="grupo">${MAIS.map(([k, n, e, c]) => li({ em: e, cor: c, t: n, chev: true, attrs: `data-ir="${k}"` }).replace('class="ico"', 'class="ico cheio"')).join("")}</div>
    <p class="rod">Minhas Finanças ${typeof APP_VERSION !== "undefined" ? APP_VERSION : ""} · visual Oceano</p></div>`;
  $$("[data-ir]", el).forEach((b) => (b.onclick = () => vaiPara(b.dataset.ir)));
}

// ---------- Renda ----------
function telaRenda(el, h) {
  const pc = estado.plantaoCache, cfg = estado.config, est = Object.assign({}, EST_PADRAO, cfg.estimativas);
  const meses = [-1, 0, 1, -2].map((i) => somaMes(mesDe(h), i));
  const corSt = { contado: "ok", marcado: "mar1", sobreaviso: "amber", "sem chamado": "gray", "sem fichas": "warn", "salário": "mar2" };
  el.innerHTML = `<div class="tela">
    <section class="bloco"><div class="tit">Meu Plantão</div><div class="grupo">
      ${li({ em: "🩺", cor: "mar1", t: pc ? `${pc.plantoes.escala.length} plantões lidos` : "Ainda não ligado", s: pc ? `atualizado ${new Date(pc.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "a renda vem dos lançamentos abaixo" })}
      ${gh.chave ? `<button class="li add" id="plGh" type="button"><span class="ico">↻</span><span class="t">Ler do GitHub agora</span></button>` : ""}
      <button class="li add" id="plCola" type="button"><span class="ico">📋</span><span class="t">Colar o backup do Meu Plantão</span></button></div>
      <p class="rod">R$ 50 por ficha e R$ 150 por UTI (pelo valor de cada local). Só conta o que já tem fichas, igual ao Meu Plantão: plantão marcado vale zero até acontecer. O dinheiro cai no dia ${cfg.diaSalario} do mês seguinte.</p></section>
    ${meses.map((ym) => {
      const r = rendaDoMes(estado, ym, h);
      return `<section class="bloco"><div class="tit">Plantões de ${nomeMes(ym)}<b class="num">${r.max ? faixa(r.min, r.max) : "R$ 0"}</b></div><div class="grupo">
        ${li({ em: r.pago ? "✅" : "📆", cor: r.pago ? "ok" : "mar2", t: r.pago ? "Recebido" : `Cai em ${diaSem(r.recebe)}, ${diaMes(r.recebe)}`, s: `${r.plantoes.length} plantões${r.lanc.length ? ` · ${r.lanc.length} lançamentos` : ""}` })}
        ${r.plantoes.map((p) => li({ em: /notur/i.test(p.rot) ? "🌙" : /sobre/i.test(p.rot) ? "📟" : "☀️", cor: corSt[p.status] || "mar1", t: `${diaMes(p.data)} · ${esc(p.rot)}`, s: `<span class="etq" style="--c:var(--${corSt[p.status] || "gray"})">${p.status}</span>${p.n != null ? ` ${p.n} fichas${p.uti ? ` + ${p.uti} UTI` : ""}` : ""}`, v: p.status === "contado" ? brl(p.min) : "—", vcls: p.status === "contado" ? "" : "sec" })).join("")}
        ${r.lanc.map((l) => li({ em: l.tipo === "extra" ? "🚑" : "🏥", cor: l.tipo === "extra" ? "orange" : "mar6", t: esc(l.desc), s: l.tipo === "extra" ? "extra" : "plantão à mão", v: faixa(+l.min || 0, +(l.max != null && l.max !== "" ? l.max : l.min) || 0), chev: true, attrs: `data-rl="${l.id}"` })).join("")}
        <button class="li add" data-nr="${ym}" type="button"><span class="ico">＋</span><span class="t">Lançar renda</span></button></div>
        ${r.usaPl && (estado.rendas || []).some((x) => x.ref === ym && x.tipo === "plantao") ? `<p class="rod">Os plantões lançados à mão ficam de fora: vale a escala do Meu Plantão.</p>` : ""}</section>`;
    }).join("")}
  </div>`;
  const aplica = (P) => { estado.plantaoCache = { em: Date.now(), plantoes: P }; salva(); fechaFolha(); animar = true; redesenha(); toast(`${P.escala.length} plantões lidos`); };
  const g = $("#plGh", el); if (g) g.onclick = async () => { g.style.opacity = ".5"; try { aplica(await lePlantoesGitHub()); } catch (er) { toast(er.message || String(er)); g.style.opacity = ""; } };
  $("#plCola", el).onclick = () => abreFolha("Backup do Meu Plantão", `<div class="grupo"><label class="campo col"><span class="rod" style="padding:0">No Meu Plantão: Backup → Copiar. Cole aqui; só os plantões são lidos, nada de paciente.</span><textarea id="plT" placeholder='{"app":"receituario-plantao", ...}'></textarea></label></div>`, (f) => {
    $("#folhaDir").onclick = () => { try { aplica(achaPlantoes(JSON.parse($("#plT", f).value))); } catch (er) { toast(er instanceof SyntaxError ? "Não é um backup válido: copie de novo" : er.message); } };
  }, "Ler");
  const folhaR = (ym, id) => {
    const r = id ? estado.rendas.find((x) => x.id === id) : { ref: ym, desc: "", min: "", max: "", tipo: "extra" };
    abreFolha(id ? "Editar renda" : "Lançar renda", `<div class="grupo">${campo("Descrição", `<input id="rD" value="${esc(r.desc)}" placeholder="Remoção VipMed">`)}${campo("Mês trabalhado", `<input id="rM" type="month" value="${esc(r.ref)}">`)}${campo("Valor", `<input id="rV" inputmode="decimal" value="${vIn(r.min)}" placeholder="R$ 0">`)}${campo("Máximo (se incerto)", `<input id="rX" inputmode="decimal" value="${r.max != null && +r.max !== +r.min ? vIn(r.max) : ""}" placeholder="opcional">`)}${campo("Tipo", `<select id="rT"><option value="extra" ${r.tipo === "extra" ? "selected" : ""}>Extra</option><option value="plantao" ${r.tipo === "plantao" ? "selected" : ""}>Plantão</option></select>`)}</div>
      ${id ? `<div class="grupo"><button class="li perigo" id="rApaga" type="button">Apagar</button></div>` : ""}`, (f) => {
      $("#folhaDir").onclick = () => {
        const v = numero($("#rV", f).value); if (!v || !$("#rM", f).value) { toast("Preencha mês e valor"); return; }
        let x = id ? estado.rendas.find((y) => y.id === id) : null; if (!x) { x = { id: uid("r") }; estado.rendas.push(x); }
        const mx = $("#rX", f).value.trim();
        Object.assign(x, { ref: $("#rM", f).value, desc: $("#rD", f).value.trim() || "Renda", min: v, max: mx ? numero(mx) : v, tipo: $("#rT", f).value, em: Date.now() });
        salva(); fechaFolha(); redesenha(); toast("Renda salva");
      };
      const a = $("#rApaga", f); if (a) a.onclick = () => { apaga("rendas", id); salva(); fechaFolha(); redesenha(); toast("Lançamento apagado", { rot: "Desfazer", fn: () => { estado.rendas.push(r); estado.apagados = estado.apagados.filter((x) => x !== r.id); salva(); redesenha(); } }); };
    }, "Salvar");
  };
  $$("[data-nr]", el).forEach((b) => (b.onclick = () => folhaR(b.dataset.nr)));
  $$("[data-rl]", el).forEach((b) => (b.onclick = () => folhaR(null, b.dataset.rl)));
}

// ---------- Raio-X ----------
function telaRaiox(el, h) {
  const tx = todasTx(), todos = [...new Set(tx.map((t) => t.comp))].sort();
  const ate = todos.filter((m) => m <= mesDe(h)).pop(), desde = ate && ui.rxPer ? somaMes(ate, -(ui.rxPer - 1)) : null;
  const rx = raioX(tx, { desde, ate }), e0 = escadaParcelas(tx, mesDe(h)), ref = estado.config.raioxRef || [];
  const man = estado.config.parcelasManual || {}, escada = {};
  for (const k of new Set([...Object.keys(e0.escada), ...Object.keys(man)])) escada[k] = Math.max(e0.escada[k] || 0, man[k] || 0);
  const imp = Object.keys(e0.escada).some((k) => e0.escada[k] >= (man[k] || 0));
  const esK = Object.keys(escada).filter((m) => m >= mesDe(h)).sort().slice(0, 10), esMax = Math.max(1, ...esK.map((k) => escada[k]));
  const max = Math.max(1, ...rx.media.map((m) => m.media)), jur = tx.filter((t) => t.cat === "juros" && t.valor > 0 && (!desde || t.comp >= desde));
  const rec = recorrentes(tx.filter((t) => !desde || t.comp >= desde)), al = alertas({ tx, cfg: estado.config, hoje: h });
  const cart = rx.meses.reduce((a, m) => a + rx.porMes[m].cartao, 0) / rx.n, fora = rx.meses.reduce((a, m) => a + rx.porMes[m].fora, 0) / rx.n;
  const refMax = Math.max(1, ...ref.map((x) => x.v));
  el.innerHTML = `<div class="tela">
    ${tx.length ? `<div class="seg" role="group" aria-label="Período">${[[3, "3 meses"], [6, "6 meses"], [12, "12 meses"], [0, "Tudo"]].map(([v, n]) => `<button data-per="${v}" aria-pressed="${+ui.rxPer === v}" type="button">${n}</button>`).join("")}</div>
    <section class="hero"><span class="k">Gasto real por mês${rx.meses.length ? ` · ${nomeMes(rx.meses[0], true)} a ${nomeMes(rx.meses[rx.meses.length - 1], true)}` : ""}</span><span class="v num">${conta(rx.totalMedio)}</span>
      <div class="pils"><span class="pil">Na fatura<b class="num">${brl(cart)}</b></span><span class="pil">Fora do cartão<b class="num">${brl(fora)}</b></span><span class="pil">Juros e tarifas<b class="num">${brl(jur.reduce((a, t) => a + t.valor, 0))}</b></span></div></section>
    <section class="bloco"><div class="tit">Por categoria · média por mês</div><div class="grupo">${rx.media.map((m) => li({ em: EMO_CAT[m.cat], cor: corC(m.cat), t: CATS[m.cat].n, v: brl(m.media), chev: true, attrs: `data-rc="${m.cat}"`, extra: barra((m.media / max) * 100, corC(m.cat)) })).join("")}</div></section>`
    : `<section class="hero"><span class="k">Raio-X</span><span class="v" style="font-size:24px">🔎 Anexe os extratos</span><span class="s">Em Extratos ou pela IA (✨). Aí aparecem o gasto real por categoria, as parcelas, os juros e as assinaturas. Abaixo, a referência da consultoria.</span></section>`}
    ${ref.length ? `<section class="bloco"><div class="tit">Referência · jul a nov/2026</div><div class="grupo">${ref.map((r) => li({ em: EMO_CAT[r.cat] || "🧾", cor: corC(r.cat), t: esc(r.n || CATS[r.cat].n), v: brl(r.v), extra: barra((r.v / refMax) * 100, corC(r.cat)) })).join("")}</div>${estado.config.raioxNota ? `<p class="rod">${esc(estado.config.raioxNota)}</p>` : ""}</section>` : ""}
    <section class="bloco"><div class="tit">Parcelas já contratadas</div><div class="grupo">${esK.length ? `<div class="colunas">${esK.map((k) => `<div><b>${Math.round(escada[k]).toLocaleString("pt-BR")}</b><i style="--h:${(escada[k] / esMax) * 100}%;--c:var(--mar5)"></i><small>${nomeMes(k, true)}</small></div>`).join("")}</div>` : `<div class="vazio">Sem parcelas futuras 🎉</div>`}
      ${e0.compras.slice(0, 12).map((c) => li({ em: "🧩", cor: "mar5", t: esc(c.desc), s: `${c.n}x de ${brl(c.valor)}`, v: `até ${nomeMes(c.fim, true)}`, vcls: "sec" })).join("")}</div>
      <p class="rod">${imp ? "Das faturas importadas (vale o maior entre elas e a planilha da consultoria)." : "Da planilha da consultoria; importe as faturas para o app calcular sozinho."} Antecipar só compensa com a reserva pronta e desconto acima de 1% ao mês.</p></section>
    ${al.length ? `<section class="bloco"><div class="tit">Alertas</div>${al.map((a) => `<div class="aviso" style="--c:var(--${a.n === "bad" ? "bad" : "warn"})"><span class="ico">${a.n === "bad" ? "🚨" : "⚠️"}</span><div><b>${esc(a.t)}</b><br><small>${esc(a.d)}</small></div></div>`).join("")}</section>` : ""}
    ${jur.length ? `<section class="bloco"><div class="tit">Juros e tarifas</div><div class="grupo">${jur.sort((a, b) => b.data.localeCompare(a.data)).map((t) => li({ em: "⚠️", cor: "bad", t: esc(t.desc), s: diaMes(t.data), v: brl2(t.valor) })).join("")}</div></section>` : ""}
    ${rec.length ? `<section class="bloco"><div class="tit">Repetem todo mês</div><div class="grupo">${rec.map((r) => li({ em: EMO_CAT[r.cat], cor: corC(r.cat), t: esc(r.desc), s: `${r.meses.length} meses`, v: brl2(r.valor) })).join("")}</div><p class="rod">Corte o que não usa.</p></section>` : ""}
    ${rx.meses.length ? `<section class="bloco"><div class="tit">Mês a mês</div><div class="grupo">${rx.meses.slice().reverse().map((m) => li({ em: "🗓️", cor: "mar6", t: nomeMes(m), s: `fatura ${brl(rx.porMes[m].cartao)} · fora ${brl(rx.porMes[m].fora)}`, v: brl(rx.porMes[m].total) })).join("")}</div></section>` : ""}
  </div>`;
  $$("[data-per]", el).forEach((b) => (b.onclick = () => { ui.rxPer = +b.dataset.per; guardaUi(); animar = true; redesenha(); }));
  $$("[data-rc]", el).forEach((b) => (b.onclick = () => { const c = b.dataset.rc; abreFolha(CATS[c].n, `<div class="grupo">${rx.itensCat[c].sort((a, b) => b.valor - a.valor).slice(0, 30).map((t) => li({ em: EMO_CAT[c], cor: corC(c), t: esc(t.desc), s: diaMes(t.data), v: brl2(t.valor) })).join("")}</div>`); }));
}

// ---------- Calendário ----------
function telaCalendario(el, h) {
  const evs = eventos(estado, h, 12), por = {};
  for (const e of evs) { const m = mesDe(e.data < h ? h : e.data); (por[m] = por[m] || []).push(e); }
  el.innerHTML = `<div class="tela">
    <div class="grupo"><button class="li add" id="novoEv" type="button"><span class="ico">＋</span><span class="t">Adicionar data</span></button></div>
    ${Object.entries(por).map(([m, l]) => `<section class="bloco"><div class="tit">${nomeMes(m)}</div><div class="grupo">${l.map((e) => evLi(e, h)).join("")}</div></section>`).join("")}
    <p class="rod">Salário, fechamento e vencimento da fatura, CRM, Nota Legal e IPVA entram sozinhos. As datas de vencimento do Nubank ficam em Ajustes.</p>
  </div>`;
  ligaEv(el);
  $("#novoEv", el).onclick = () => abreFolha("Nova data", `<div class="grupo">${campo("O quê", `<input id="eT" placeholder="Prova da UNIFESP">`)}${campo("Dia", `<input id="eD" type="date" value="${h}">`)}${campo("Até (opcional)", `<input id="eF" type="date">`)}${campo("Detalhe", `<input id="eX" placeholder="opcional">`)}</div>`, (f) => {
    $("#folhaDir").onclick = () => { const t = $("#eT", f).value.trim(), d = $("#eD", f).value; if (!t || !d) { toast("Preencha o quê e o dia"); return; } estado.eventos.push({ id: uid("e"), data: d, fim: $("#eF", f).value || "", t, d: $("#eX", f).value.trim(), em: Date.now() }); salva(); fechaFolha(); redesenha(); toast("Data adicionada"); };
  }, "Adicionar");
}

// ---------- Milhas ----------
function telaMilhas(el, h) {
  const M = estado.milhas, cfg = estado.config, tx = todasTx();
  const rx = raioX(tx.filter((t) => t.origem === "nu-fatura"), { desde: somaMes(mesDe(h), -6) });
  const gasto = +cfg.gastoCartao || Math.round(rx.totalMedio) || 7000;
  const ptsMes = (gasto / (+cfg.dolar || 5.5)) * (+cfg.pontosPorDolar || 2.2), bonus = +cfg.bonusTipico || 80;
  const anoMilhas = ptsMes * 12 * (1 + bonus / 100), trechos = anoMilhas / (+cfg.trechoMilhas || 13000);
  const tot = Object.values(M.saldos).reduce((a, v) => a + (+v || 0), 0);
  const calc = M.calc || { preco: 780, taxas: 40, milhas: 14000 }, mc = milheiro(calc.preco, calc.taxas, calc.milhas);
  const vm = (+cfg.milheiroRef || 25) / 1000, usd = gasto / (+cfg.dolar || 5.5);
  const uv = { pts: usd * 2.2 * 12, custo: gasto >= 8000 ? 0 : 89 * 12 }, cr = { pts: usd * 1.4 * 12, custo: gasto >= 4000 ? 0 : 39 * 12 };
  const liq = (c) => c.pts * vm * (1 + bonus / 100) - c.custo, n0 = (x) => Math.round(x).toLocaleString("pt-BR");
  el.innerHTML = `<div class="tela">
    <section class="hero fundo"><span class="k">Pontos e milhas</span><span class="v num">${n0(tot)}</span><span class="s">~${n0(ptsMes)} pontos por mês · ${n0(anoMilhas)} milhas por ano com ${bonus}% de bônus</span>
      <div class="pils"><span class="pil">Trechos BSB–SSA por ano<b>✈️ ~${trechos.toFixed(1).replace(".", ",")}</b></span></div></section>
    <section class="bloco"><div class="tit">Saldos</div><div class="grupo">${[["nubank", "💜 Nubank (pontos)"], ["smiles", "🟠 Smiles"], ["latam", "🔴 LATAM Pass"], ["azul", "🔵 Azul Fidelidade"]].map(([k, n]) => campo(n, `<input data-k="milhas.saldos.${k}" data-num inputmode="numeric" value="${vIn(M.saldos[k])}" placeholder="0">`)).join("")}</div></section>
    <section class="bloco"><div class="tit">Essa passagem vale em milhas?</div><div class="grupo">${campo("Preço em dinheiro", `<input data-calc="preco" inputmode="decimal" value="${vIn(calc.preco)}">`)}${campo("Taxas em milhas", `<input data-calc="taxas" inputmode="decimal" value="${vIn(calc.taxas)}">`)}${campo("Milhas pedidas", `<input data-calc="milhas" inputmode="numeric" value="${vIn(calc.milhas)}">`)}</div>
      ${mc ? `<div class="aviso" style="--c:var(--${mc.veredito === "boa" ? "ok" : mc.veredito === "dinheiro" ? "bad" : "warn"})"><span class="ico">${mc.veredito === "boa" ? "✈️" : mc.veredito === "dinheiro" ? "💵" : "🤔"}</span><div><b>R$ ${mc.v.toFixed(2).replace(".", ",")} o milheiro</b><br><small>${mc.veredito === "boa" ? "Boa troca: emita com milhas." : mc.veredito === "dinheiro" ? "Pague em dinheiro e guarde as milhas." : "Depende: vale se as milhas estão paradas ou perto de vencer."}</small></div></div>` : ""}
      <p class="rod">(preço − taxas) ÷ milhas × 1.000. Acima de R$ 20, boa troca; abaixo de R$ 15, pague em dinheiro.</p></section>
    <section class="bloco"><div class="tit">Promoções de transferência</div><div class="grupo">
      ${(M.promocoes || []).map((p) => li({ em: "🎯", cor: "orange", t: `${esc(p.prog)}${p.bonus ? ` +${p.bonus}%` : ""}`, s: [p.ate ? "até " + diaMes(p.ate) : "", esc(p.obs || "")].filter(Boolean).join(" · "), chev: true, attrs: `data-pr="${p.id}"` })).join("") || `<div class="vazio">Já houve até 110–130% na Azul, 70% na Smiles e 25% na LATAM.</div>`}
      <button class="li add" id="novaPr" type="button"><span class="ico">＋</span><span class="t">Anotar promoção</span></button></div></section>
    <section class="bloco"><div class="tit">Ultravioleta ou Croma?</div><div class="grupo">
      ${li({ em: "🟣", cor: "violet", t: "Ultravioleta", s: `${n0(uv.pts)} pontos/ano · mensalidade ${brl(uv.custo)}/ano`, v: brl(liq(uv)) })}${li({ em: "⚪", cor: "gray", t: "Croma", s: `${n0(cr.pts)} pontos/ano · mensalidade ${brl(cr.custo)}/ano`, v: brl(liq(cr)) })}
      ${campo("Gasto no cartão por mês", `<input data-k="config.gastoCartao" data-num inputmode="decimal" value="${vIn(cfg.gastoCartao)}" placeholder="${vIn(gasto)}">`)}${campo("Bônus típico (%)", `<input data-k="config.bonusTipico" data-num inputmode="decimal" value="${vIn(bonus)}">`)}${campo("Dólar", `<input data-k="config.dolar" data-num inputmode="decimal" value="${vIn(cfg.dolar)}">`)}</div>
      <p class="rod">Saldo = milhas com bônus a R$ ${cfg.milheiroRef} o milheiro menos a mensalidade. O Ultravioleta zera com R$ 8 mil na fatura ou R$ 50 mil guardados; o Croma, com R$ 4 mil. Sala VIP e IOF zero só no Ultravioleta.</p></section>
    <section class="bloco"><div class="tit">Regras</div><div class="grupo">${[["💜", "No app do Nubank, escolher pontos, não cashback"], ["🎯", "Só transferir com bônus, e inscrever-se antes"], ["⏳", "Clube só no mês da transferência; bônus vence em 6 a 12 meses"], ["💳", "Passagem com milhas e à vista, nunca parcelada"], ["🛋️", "Priority Pass: 4 acessos por ano na VIP Club de Brasília"]].map(([e, t]) => li({ em: e, cor: "mar6", t })).join("")}</div></section>
  </div>`;
  ligaCampos(el);
  $$("[data-calc]", el).forEach((i) => (i.onchange = () => { M.calc = Object.assign({}, calc, { [i.dataset.calc]: numero(i.value) }); salva(); redesenha(); }));
  const folhaPr = (id) => {
    const p = id ? M.promocoes.find((x) => x.id === id) : { prog: "Azul Fidelidade", bonus: "", ate: "", obs: "" };
    abreFolha(id ? "Promoção" : "Anotar promoção", `<div class="grupo">${campo("Programa", `<select id="pP">${["Azul Fidelidade", "Smiles", "LATAM Pass", "Livelo"].map((x) => `<option ${x === p.prog ? "selected" : ""}>${x}</option>`).join("")}</select>`)}${campo("Bônus (%)", `<input id="pB" inputmode="numeric" value="${vIn(p.bonus)}">`)}${campo("Até", `<input id="pA" type="date" value="${esc(p.ate)}">`)}${campo("Obs.", `<input id="pO" value="${esc(p.obs)}" placeholder="clube no mês">`)}</div>
      ${id && p.ate ? `<a class="btn sec" href="${gcal("Transferir pontos: " + p.prog, p.ate, "", "Inscrever-se na promoção antes de transferir.")}" target="_blank" rel="noopener">Pôr no Google Agenda</a>` : ""}
      ${id ? `<div class="grupo"><button class="li perigo" id="pX" type="button">Apagar</button></div>` : ""}`, (f) => {
      $("#folhaDir").onclick = () => { M.promocoes = M.promocoes || []; let x = id ? M.promocoes.find((y) => y.id === id) : null; if (!x) { x = { id: uid("pr") }; M.promocoes.push(x); } Object.assign(x, { prog: $("#pP", f).value, bonus: numero($("#pB", f).value), ate: $("#pA", f).value, obs: $("#pO", f).value.trim() }); salva(); fechaFolha(); redesenha(); };
      const xx = $("#pX", f); if (xx) xx.onclick = () => { M.promocoes = M.promocoes.filter((y) => y.id !== id); salva(); fechaFolha(); redesenha(); };
    }, "Salvar");
  };
  $("#novaPr", el).onclick = () => folhaPr(null);
  $$("[data-pr]", el).forEach((b) => (b.onclick = () => folhaPr(b.dataset.pr)));
}

// ---------- Ajustes ----------
function telaAjustes(el, h) {
  const cfg = estado.config, cop = (lsGet(LS.copias, []) || []).slice().reverse();
  const venc = Object.entries(cfg.vencimentos || {}).sort().map(([, d]) => d).join(", ");
  el.innerHTML = `<div class="tela">
    <section class="bloco"><div class="tit">Aparência</div><div class="seg" role="group" aria-label="Tema">${[["", "Igual ao iPhone"], ["light", "Claro"], ["dark", "Escuro"]].map(([v, n]) => `<button data-tema="${v}" aria-pressed="${(ui.tema || "") === v}" type="button">${n}</button>`).join("")}</div></section>
    <section class="bloco"><div class="tit">Onde ficam os dados</div><div class="grupo">
      ${li({ em: nuvem.modo === "local" ? "📱" : "☁️", cor: nuvem.modo === "local" ? "warn" : "ok", t: nuvem.modo === "claude" ? "Nuvem do artefato no Claude" : nuvem.modo === "github" ? `GitHub · ${esc(gh.repo)}` : "Só neste aparelho", s: `${nuvem.em ? `última ida à nuvem às ${hhmm(nuvem.em)} · ` : ""}cópia de segurança neste aparelho` })}
      <button class="li" id="ghAbre" type="button"><span class="ico" style="--c:var(--gray)">🐙</span><span class="t"><span>GitHub</span><small>${gh.chave ? `ligado · ${esc(gh.repo || "")}` : "para o site instalado e para ler o Meu Plantão"}</small></span><span class="chev">›</span></button>
      <button class="li" id="iaAbre" type="button"><span class="ico" style="--c:var(--mar2)">✨</span><span class="t"><span>IA</span><small>${iaModo() === "claude" ? "ligada pela sua conta do Claude" : iaChave() ? "ligada com a sua chave da API" : "no site instalado, precisa de uma chave da API"}</small></span><span class="chev">›</span></button></div></section>
    <section class="bloco"><div class="tit">Backup</div><div class="grupo">
      <button class="li" id="bkCopia" type="button"><span class="ico" style="--c:var(--mar1)">📋</span><span class="t">Copiar backup</span></button>
      <button class="li" id="bkBaixa" type="button"><span class="ico" style="--c:var(--mar1)">⬇️</span><span class="t">Baixar arquivo</span></button>
      <button class="li" id="bkImporta" type="button"><span class="ico" style="--c:var(--mar2)">📥</span><span class="t">Importar backup</span><span class="chev">›</span></button>
      ${cop.length ? `<button class="li" id="bkCopias" type="button"><span class="ico" style="--c:var(--gray)">🕘</span><span class="t"><span>Cópias de segurança</span><small>${cop.length} neste aparelho</small></span><span class="chev">›</span></button>` : ""}</div>
      <p class="rod">O backup leva junto as chaves do GitHub e da IA, para um aparelho novo já abrir tudo ligado. Guarde o arquivo só para você e não mande para ninguém.</p></section>
    <section class="bloco"><div class="tit">Datas e limites</div><div class="grupo">
      ${campo("Dia do salário", `<input data-k="config.diaSalario" data-num inputmode="numeric" value="${cfg.diaSalario}">`)}
      ${campo("Mesada por semana", `<input data-k="config.mesadaSemanal" data-num inputmode="decimal" value="${vIn(cfg.mesadaSemanal)}">`)}
      ${campo("Teto de compras online", `<input data-k="config.tetoOnline" data-num inputmode="decimal" value="${vIn(cfg.tetoOnline)}">`)}
      ${campo("Teto de delivery", `<input data-k="config.tetoDelivery" data-num inputmode="decimal" value="${vIn(cfg.tetoDelivery)}">`)}
      ${campo("Vencimento padrão da fatura", `<input data-k="config.diaVencimento" data-num inputmode="numeric" value="${cfg.diaVencimento}">`)}
      ${campo("Fecha quantos dias antes", `<input data-k="config.diasFechamento" data-num inputmode="numeric" value="${cfg.diasFechamento}">`)}
      ${campo("Sem parcela nova desde", `<input type="date" data-k="config.regraDesde" value="${esc(cfg.regraDesde)}">`)}
      ${campo("Ourocard (BB) ainda ativo", `<input type="checkbox" class="troca" data-k="config.bbAtivo" ${cfg.bbAtivo ? "checked" : ""}>`)}
      <label class="campo col"><span>Vencimentos do Nubank (AAAA-MM-DD, separados por vírgula)</span><input id="vencs" value="${esc(venc)}"></label></div></section>
    <section class="bloco"><div class="tit">Regras de categoria</div><div class="grupo">
      <label class="campo col"><span>Meu nome nos extratos</span><input data-k="config.meuNome" value="${esc(cfg.meuNome)}" placeholder="transferência para mim fica de fora"></label>
      <label class="campo col"><span>Fazenda: palavras que tiram das contas</span><input data-k="config.palavrasFazenda" data-lista value="${esc((cfg.palavrasFazenda || []).join(", "))}"></label>
      <label class="campo col"><span>Quem paga minha renda</span><input data-k="config.fontesRenda" data-lista value="${esc((cfg.fontesRenda || []).join(", "))}"></label>
      <label class="campo col"><span>Amigos com quem divido contas</span><input data-k="config.pessoasDividem" data-lista value="${esc((cfg.pessoasDividem || []).join(", "))}"></label></div>
      <div class="grupo">${(cfg.regras || []).map((r, i) => li({ em: EMO_CAT[r.cat] || "🏷️", cor: corC(r.cat), t: `"${esc(r.t)}"`, s: (CATS[r.cat] || {}).n || r.cat, attrs: `data-rg="${i}"`, v: "✕", vcls: "sec" })).join("")}
      <button class="li add" id="novaRg" type="button"><span class="ico">＋</span><span class="t">Nova regra</span></button></div>
      <p class="rod">Toque numa regra para apagar.</p></section>
  </div>`;
  ligaCampos(el);
  $$("[data-tema]", el).forEach((b) => (b.onclick = () => { ui.tema = b.dataset.tema; guardaUi(); if (ui.tema) document.documentElement.setAttribute("data-theme", ui.tema); else document.documentElement.removeAttribute("data-theme"); redesenha(); }));
  $("#vencs", el).onchange = (e) => { const v = {}; e.target.value.split(/[,;\s]+/).forEach((d) => { if (/^\d{4}-\d\d-\d\d$/.test(d)) v[d.slice(0, 7)] = d; }); cfg.vencimentos = v; salva(); redesenha(); };
  $("#iaAbre", el).onclick = folhaIaCfg;
  $("#ghAbre", el).onclick = () => abreFolha("GitHub", `<div class="grupo">
      <label class="campo col"><span>Repositório privado (dono/nome)</span><input id="ghRepo" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="usuario/plantao-modelos" value="${esc(gh.repo || "")}"></label>
      <label class="campo col"><span>Arquivo das finanças</span><input id="ghArq" spellcheck="false" autocapitalize="off" value="${esc(gh.arquivo || "minhas-financas.json")}"></label>
      <label class="campo col"><span>Plantões: repositório (vazio = o mesmo)</span><input id="ghPlRepo" spellcheck="false" autocapitalize="off" value="${esc(gh.plRepo || "")}"></label>
      <label class="campo col"><span>Plantões: arquivo</span><input id="ghPlArq" spellcheck="false" autocapitalize="off" value="${esc(gh.plArquivo || "meus-padroes.json")}"></label>
      <label class="campo col"><span>Chave do GitHub</span><input id="ghChave" type="password" autocomplete="off" placeholder="${gh.chave ? "guardada neste aparelho" : "github_pat_…"}"></label></div>
    <p class="rod">Pode ser a mesma chave da nuvem do Meu Plantão. Ela fica neste aparelho e vai junto no backup: num aparelho novo, importar o backup já liga tudo.${nuvem.modo === "claude" ? " Dentro do Claude o GitHub não é alcançável: use Renda → colar o backup." : ""}</p>
    ${gh.chave ? `<div class="grupo"><button class="li perigo" id="ghEsquece" type="button">Esquecer a chave neste aparelho</button></div>` : ""}`, (f) => {
    $("#folhaDir").onclick = async () => {
      const repo = $("#ghRepo", f).value.trim(), ch = $("#ghChave", f).value.trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { toast("Repositório no formato dono/nome"); return; }
      gh = Object.assign({}, gh, { repo, arquivo: $("#ghArq", f).value.trim() || "minhas-financas.json", plRepo: $("#ghPlRepo", f).value.trim(), plArquivo: $("#ghPlArq", f).value.trim() || "meus-padroes.json" });
      if (ch) gh.chave = ch; lsSet(LS.gh, gh); fechaFolha();
      if (nuvem.modo !== "claude" && gh.chave) { nuvem.modo = "github"; pend.est = true; await sincroniza(); }
      if (gh.chave) lePlantoesGitHub().then((P) => { estado.plantaoCache = { em: Date.now(), plantoes: P }; salva(); redesenha(); }).catch(() => {});
      redesenha(); toast(nuvem.erro || "GitHub ligado");
    };
    const e = $("#ghEsquece", f); if (e) e.onclick = () => { delete gh.chave; lsSet(LS.gh, gh); if (nuvem.modo === "github") nuvem.modo = "local"; fechaFolha(); redesenha(); toast("Chave apagada deste aparelho"); };
  }, "Salvar");
  const bk = () => JSON.stringify({ app: "minhas-financas", v: 1, exportadoEm: new Date().toISOString(), estado, tx: txs, chaves: gh.chave ? { gh } : {} });
  $("#bkCopia", el).onclick = async () => { if (!(await copia(bk()))) abreFolha("Backup", `<div class="grupo"><label class="campo col"><span class="rod" style="padding:0">Selecione tudo e copie.</span><textarea readonly>${esc(bk())}</textarea></label></div>`); };
  $("#bkBaixa", el).onclick = async () => {
    const nome = `minhas-financas-${h}.json`;
    try { const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; if (dl) { await dl.save({ filename: nome, data: bk() }); return; } } catch (e) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bk()], { type: "application/json" })); a.download = nome; a.click();
  };
  $("#bkImporta", el).onclick = folhaImporta;
  const bc = $("#bkCopias", el); if (bc) bc.onclick = () => abreFolha("Cópias de segurança", `<div class="grupo">${cop.map((c, i) => li({ em: "🕘", cor: "gray", t: new Date(c.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), s: `${c.nTx} lançamentos`, v: "Voltar", vcls: "sec", attrs: `data-volta="${i}"` })).join("")}</div>`, (f) => {
    $$("[data-volta]", f).forEach((b) => (b.onclick = () => { const c = cop[+b.dataset.volta], ant = estado; estado = migra(JSON.parse(JSON.stringify(c.estado))); salva(); fechaFolha(); redesenha(); toast("Cópia restaurada", { rot: "Desfazer", fn: () => { estado = ant; salva(); redesenha(); } }); }));
  });
  $$("[data-rg]", el).forEach((b) => (b.onclick = () => { const r = cfg.regras.splice(+b.dataset.rg, 1)[0]; salva(); redesenha(); toast("Regra apagada", { rot: "Desfazer", fn: () => { cfg.regras.push(r); salva(); redesenha(); } }); }));
  $("#novaRg", el).onclick = () => abreFolha("Nova regra", `<div class="grupo">${campo("Texto na descrição", `<input id="rgT" placeholder="ex.: kaue">`)}${campo("Categoria", `<select id="rgC">${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${EMO_CAT[k]} ${c.n}</option>`).join("")}</select>`)}</div>`, (f) => {
    $("#folhaDir").onclick = () => { const t = $("#rgT", f).value.trim(); if (!t) return; cfg.regras.push({ t, cat: $("#rgC", f).value }); salva(); fechaFolha(); redesenha(); };
  }, "Criar");
}
function folhaImporta() {
  abreFolha("Importar backup", `<div class="grupo"><label class="campo col"><span class="rod" style="padding:0">Cole um backup do Minhas Finanças (ou o plano do painel antigo), ou escolha o arquivo.</span><textarea id="bkTxt"></textarea><input type="file" id="bkArq" accept=".json,application/json"></label></div>`, (f) => {
    $("#bkArq", f).onchange = async (e) => { const a = e.target.files[0]; if (a) $("#bkTxt", f).value = await a.text(); };
    $("#folhaDir").onclick = () => {
      let d; try { d = JSON.parse($("#bkTxt", f).value); } catch (e) { toast("Não é um backup válido"); return; }
      const antes = { estado, txs };
      if (d && d.app === "minhas-financas" && d.estado) {
        estado = migra(d.estado); txs = juntaTx(txs, d.tx || {});
        // chaves que vieram no backup: o aparelho novo já abre com a nuvem, os plantões e a IA ligados
        const g = d.chaves && d.chaves.gh;
        if (g && g.repo && g.chave && !gh.chave) { gh = Object.assign({}, g); lsSet(LS.gh, gh); if (nuvem.modo !== "claude") { nuvem.modo = "github"; setTimeout(() => { sincroniza(); lePlantoesGitHub().then((P) => { estado.plantaoCache = { em: Date.now(), plantoes: P }; salva(); redesenha(); }).catch(() => {}); }, 200); } }
      }
      else if (d && Array.isArray(d.itens)) estado = migra(deAntigo(d));
      else { toast("Formato desconhecido"); return; }
      salva(Object.keys(txs)); fechaFolha(); animar = true; vaiPara("inicio");
      toast("Plano importado", { rot: "Desfazer", fn: () => { estado = antes.estado; txs = antes.txs; salva(Object.keys(txs)); redesenha(); } });
    };
  }, "Importar");
}

// ---------- começo ----------
function telaBoasVindas() {
  $("#titulo").textContent = "Bem-vindo";
  $("#corpo").innerHTML = `<div class="tela"><section class="hero"><span class="k">Minhas Finanças</span><span class="v" style="font-size:28px">🌊 Seu dinheiro, calmo e no lugar</span><span class="s">Orçamento, caixinhas, renda dos plantões, extratos, raio-X, calendário e milhas.</span></section>
    <button class="btn" id="bvImporta" type="button">Trazer meu plano (backup)</button><button class="btn sec" id="bvZero" type="button">Começar do zero</button>
    <p class="rod">Se o plano já está no GitHub, ligue em Ajustes → GitHub.</p></div>`;
  $("#bvZero").onclick = () => { estado = ESTADO_PADRAO(); salva(); vaiPara("orcamento"); };
  $("#bvImporta").onclick = () => { estado = ESTADO_PADRAO(); estado.em = 0; lsSet(LS.est, estado); vaiPara("ajustes"); setTimeout(folhaImporta, 50); };
}
async function inicia() {
  aplicaTema();
  const hs = location.hash.slice(1); if (TITULOS[hs]) ui.aba = hs;
  window.addEventListener("hashchange", () => { const k = location.hash.slice(1); if (k && k !== ui.aba && TITULOS[k]) { if (!$("#folha").hidden) fechaFolha(); ui.aba = k; animar = true; redesenha(); } });
  $("#fab").onclick = abreAssistente;
  if (estado) { estado = migra(estado); redesenha(); }
  await iniciaNuvem();
  if (!estado) { telaBoasVindas(); desenhaAbas(); mostraSelo(); } else { animar = !$("#corpo .tela"); redesenha(); }
  // site instalado com GitHub: atualiza os plantões ao abrir
  if (estado && nuvem.modo === "github" && gh.chave && (!estado.plantaoCache || Date.now() - estado.plantaoCache.em > 30 * 60e3)) lePlantoesGitHub().then((P) => { estado.plantaoCache = { em: Date.now(), plantoes: P }; salva(); redesenha(); }).catch(() => {});
  if ("serviceWorker" in navigator && location.protocol === "https:" && window.MF_SITE) navigator.serviceWorker.register("sw.js").then((r) => r.update()).catch(() => {});
  checaVersao(true);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checaVersao(false); });
}
// site instalado: confere se há versão nova publicada. Ao abrir, atualiza sozinho; ao voltar para o app, oferece.
const versaoN = (v) => String(v || "0").split(".").map((x) => +x || 0).reduce((a, x) => a * 1000 + x, 0);
async function checaVersao(aoAbrir) {
  if (!window.MF_SITE || !navigator.onLine) return;
  try {
    const txt = await (await fetch(location.pathname + "?v=" + Date.now(), { cache: "no-store" })).text();
    const m = /APP_VERSION="([\d.]+)"/.exec(txt); if (!m || versaoN(m[1]) <= versaoN(APP_VERSION)) return;
    const vai = () => location.replace(location.pathname + "?atualizado=" + m[1] + location.hash);
    if (aoAbrir && $("#folha").hidden && !(pend.est || (pend.tx || []).length)) vai();
    else toast(`Versão nova (${m[1]}) disponível`, { rot: "Atualizar", fn: () => { sincroniza(); setTimeout(vai, 600); } });
  } catch (e) {}
}
