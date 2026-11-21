/* ---------- Minhas Finanças: telas ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const vIn = (v) => (v == null || v === "" ? "" : String(Math.round(+v * 100) / 100).replace(".", ","));
const hoje = () => { try { const h = localStorage.getItem("mf_hoje"); if (/^\d{4}-\d\d-\d\d$/.test(h || "")) return h; } catch (e) {} return isoDia(new Date()); };
let toastT = null, desfazer = null;
function toast(msg, acao) {
  const el = $("#toast"); el.hidden = false;
  el.innerHTML = esc(msg) + (acao ? ` <button class="btn sm" id="toastAcao" style="margin-left:8px">${esc(acao.rot)}</button>` : "");
  if (acao) $("#toastAcao").onclick = () => { acao.fn(); el.hidden = true; };
  clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), acao ? 7000 : 2600);
}
async function copia(txt, btn) {
  try { await navigator.clipboard.writeText(txt); toast("Copiado"); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = txt; ta.className = "inp"; btn.after(ta); ta.select(); toast("Selecione e copie o texto"); }
}

// ---------- estado padrão (sem dados pessoais: o plano entra pela nuvem ou pelo backup) ----------
const CX_PADRAO = () => [
  { id: "reserva", nome: "Reserva de emergência", cor: "green", meta: 42000, aporte: 0, naMeta: true },
  { id: "renda", nome: "Renda (salário fixo)", cor: "teal", meta: 0, aporte: 0, naMeta: true },
  { id: "livre", nome: "Livre (mesada)", cor: "orange", meta: 0, aporte: 0, naMeta: false },
];
function ESTADO_PADRAO() {
  return {
    v: 1, em: 0, config: {
      diaSalario: 20, mesadaSemanal: 350, tetoOnline: 200, tetoDelivery: 200, dolar: 5.5, pontosPorDolar: 2.2, rendMes: 0,
      metaGuardado: 50000, custoMensal: 7000, salarioFixo: 0, diaVencimento: 28, diasFechamento: 9, vencimentos: {}, bbAtivo: false,
      meuNome: "", pessoasDividem: [], palavrasFazenda: ["fazenda"], fontesRenda: [], regras: [], regraDesde: "", estimativas: {},
      milheiroRef: 25, trechoMilhas: 13000, parcelasManual: {}, raioxRef: [],
    },
    orcamentos: {}, modeloItens: [], caixinhas: CX_PADRAO(), movimentos: [], rendas: [], gastosSemana: [], eventos: [], pendencias: [],
    milhas: { saldos: { nubank: 0, smiles: 0, latam: 0, azul: 0 }, promocoes: [] }, ajustes: {}, plantaoCache: null, apagados: [],
  };
}
function migra(e) {
  const D = ESTADO_PADRAO();
  if (!e || typeof e !== "object") return D;
  if (Array.isArray(e.itens) && e.renda != null && !e.config) e = deAntigo(e);
  for (const k in D) if (e[k] == null) e[k] = D[k];
  e.config = Object.assign({}, D.config, e.config);
  e.milhas = Object.assign({}, D.milhas, e.milhas); e.milhas.saldos = Object.assign({}, D.milhas.saldos, e.milhas.saldos);
  for (const o of Object.values(e.orcamentos || {})) for (const i of o.itens || []) { if (!i.id) i.id = uid("o"); if (!GRUPOS[i.g]) i.g = ["res", "son", "col"].includes(i.g) ? "cx" : "fix"; }
  return e;
}
// plano do painel antigo: {renda, guardado, itens:[{n,g,v,p}]}
function deAntigo(a) {
  const e = ESTADO_PADRAO(), ym = mesDe(hoje()), cxs = e.caixinhas;
  const acha = (txt) => { const t = semAcento(txt); return cxs.find((c) => t.includes(semAcento(c.nome.split(" ")[0]))); };
  const itens = a.itens.map((i) => {
    const g = ["res", "son", "col"].includes(i.g) ? "cx" : i.g === "vida" ? "vida" : "fix";
    let cx = g === "cx" ? acha(i.p || i.n) : null;
    if (g === "cx" && !cx) { cx = { id: uid("c"), nome: String(i.n).replace(/^caixinha\s*/i, "").split(":")[0].trim(), cor: "violet", meta: 0, aporte: 0, naMeta: true }; cxs.push(cx); }
    return { id: uid("o"), n: i.n, g, v: +i.v || 0, p: cx ? "Caixinha " + cx.nome : i.p || "", ...(cx ? { cx: cx.id } : {}) };
  });
  e.orcamentos[ym] = { renda: +a.renda || null, itens }; e.modeloItens = itens.map((i) => Object.assign({}, i));
  if (+a.guardado) e.movimentos.push({ id: uid("m"), cx: "reserva", data: hoje(), valor: +a.guardado, desc: "Saldo inicial (painel antigo)" });
  e.config.rendMes = +a.rend || 0;
  return e;
}

const todasTx = () => {
  const cfg = estado.config, aj = estado.ajustes || {};
  return Object.values(txs).flat().map((t) => Object.assign({}, t, { cat: catDe(t, cfg, aj), ign: aj[t.id] && aj[t.id].ign }));
};
const cxDe = (id) => (estado.caixinhas || []).find((c) => c.id === id);
const apaga = (lista, id) => { estado[lista] = (estado[lista] || []).filter((x) => x.id !== id); estado.apagados = [...(estado.apagados || []), id].slice(-500); };

// ---------- abas ----------
const ABAS = [
  ["inicio", "Início", "green"], ["orcamento", "Orçamento", "sky"], ["caixinhas", "Caixinhas", "teal"], ["renda", "Renda", "indigo"],
  ["extratos", "Extratos", "slate"], ["raiox", "Raio-X", "orange"], ["calendario", "Calendário", "pink"], ["milhas", "Milhas", "violet"], ["ajustes", "Ajustes", "gray"],
];
const ui = Object.assign({ aba: "inicio", mes: null, txMes: "", txCat: "", txBusca: "", rxPer: 6 }, lsGet(LS.ui, {}));
const guardaUi = () => lsSet(LS.ui, { aba: ui.aba, rxPer: ui.rxPer });
function vaiPara(aba) { if (!ABAS.some((a) => a[0] === aba)) aba = "inicio"; ui.aba = aba; guardaUi(); if (location.hash !== "#" + aba) try { history.replaceState(null, "", "#" + aba); } catch (e) { location.hash = aba; } redesenha(); window.scrollTo({ top: 0 }); }
function desenhaAbas() {
  $("#abas").innerHTML = ABAS.map(([k, n, c]) => `<button class="aba" role="tab" style="--c:var(--${c})" aria-selected="${ui.aba === k}" data-aba="${k}"><span class="pt"></span>${n}</button>`).join("");
  $$("#abas [data-aba]").forEach((b) => (b.onclick = () => vaiPara(b.dataset.aba)));
  const sel = $("#abas [aria-selected=true]"); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function redesenha() {
  if (!estado) return;
  const h = hoje(), d = new Date(h + "T12:00:00");
  $("#hojeTxt").textContent = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  desenhaAbas();
  const el = $("#corpo");
  try { ({ inicio: telaInicio, orcamento: telaOrcamento, caixinhas: telaCaixinhas, renda: telaRenda, extratos: telaExtratos, raiox: telaRaiox, calendario: telaCalendario, milhas: telaMilhas, ajustes: telaAjustes })[ui.aba](el, h); }
  catch (e) { console.error(e); el.innerHTML = `<div class="card bad"><h2>Não consegui montar esta tela</h2><p class="note">${esc(e.message || e)}. Seus dados estão salvos; me mande esta frase.</p></div>`; }
  mostraSelo();
}
// liga campos com data-k="caminho.no.estado" (número quando data-num)
function ligaCampos(el, depois) {
  $$("[data-k]", el).forEach((i) => {
    i.onchange = () => {
      const path = i.dataset.k.split("."); let o = estado; for (const p of path.slice(0, -1)) o = o[p] = o[p] || {};
      const k = path[path.length - 1];
      o[k] = i.type === "checkbox" ? i.checked : i.dataset.num != null ? numero(i.value) : i.dataset.lista != null ? i.value.split(",").map((s) => s.trim()).filter(Boolean) : i.value.trim();
      salva(); if (depois !== false) redesenha();
    };
  });
}
const proxSalario = (h) => { const dia = estado.config.diaSalario || 20, ym = mesDe(h); return +h.slice(8, 10) <= dia ? somaMes(ym, -1) : ym; };
const em = (n) => (n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`);

// ---------- Início ----------
function telaInicio(el, h) {
  const ref1 = proxSalario(h), r1 = rendaDoMes(estado, ref1, h), r2 = rendaDoMes(estado, somaMes(ref1, 1), h);
  const ymGasto = mesDe(r1.recebe), o = orcamentoDe(estado, ymGasto), t = totaisOrc(o), renda = o.renda != null ? +o.renda : r1.min;
  const o2 = orcamentoDe(estado, mesDe(r2.recebe)), t2 = totaisOrc(o2);
  const tx = todasTx(), ms = mesada(estado, tx, h), pm = projetaMeta(estado, h), al = alertas({ tx, cfg: estado.config, hoje: h });
  const evs = eventos(estado, h, 3).slice(0, 6), dias1 = diasEntre(h, r1.recebe);
  const contados = r1.plantoes.filter((p) => p.status === "contado").length, prev = r1.plantoes.length - contados;
  const meta = pm.metaG, pct = Math.min(100, (pm.ini.tot / meta) * 100);
  const pend = (estado.pendencias || []).filter((p) => !p.feito);
  el.innerHTML = `
  <div class="grade g2">
    <section class="card destaque" style="--c:var(--green)">
      <span class="rot">Próximo salário · ${diaMes(r1.recebe)} (${em(dias1)})</span>
      <div class="big">${r1.max ? faixa(r1.min, r1.max) : "sem previsão"}</div>
      <p class="note">Plantões de ${MESES[+ref1.slice(5) - 1]}${r1.usaPl ? ` · ${contados} contados no Meu Plantão${prev ? `, ${prev} previstos` : ""}` : r1.lanc.length ? ` · ${r1.lanc.length} lançamentos` : ""}${r1.pago ? " · marcado como recebido" : ""}</p>
      <div class="kpis">
        <div class="kpi"><span class="rot">Orçamento de ${MESES[+ymGasto.slice(5) - 1]}</span><b>${brl(t.total)}</b></div>
        <div class="kpi"><span class="rot">${renda - t.total >= 0 ? "Sobra" : "Estouro"}</span><b>${brl(renda - t.total)}</b></div>
        <div class="kpi"><span class="rot">Caixinhas</span><b>${brl(t.cx)}</b></div>
      </div>
      <div class="acoes"><button class="btn sm" data-ir="orcamento">Ver orçamento</button><button class="btn sm" data-ir="renda">Ver plantões</button></div>
    </section>
    <section class="card" style="--c:var(--indigo)">
      <span class="rot">Depois · ${diaMes(r2.recebe)} · plantões de ${MESES[+r2.ym.slice(5) - 1]}</span>
      <div class="med">${r2.max ? faixa(r2.min, r2.max) : "nenhum plantão marcado ainda"}</div>
      <p>Para ${MESES[+mesDe(r2.recebe).slice(5) - 1]}, os fixos somam <b>${brl(t2.fix)}</b>. ${r2.min ? `Sobram <b>${brl(r2.min - t2.fix)}</b> para estilo de vida e caixinhas.` : ""}</p>
      ${r2.min && r2.min < (estado.config.salarioFixo || 8000) ? `<div class="alerta warn">Mês fraco à vista: a previsão está abaixo de ${brl(estado.config.salarioFixo || 8000)}. A caixinha Renda cobre a diferença.</div>` : ""}
      <p class="note">${r2.plantoes.length} plantões na escala de ${MESES[+r2.ym.slice(5) - 1]}. Estimativa por turno em Renda.</p>
    </section>
    <section class="card" style="--c:var(--orange)">
      <div class="cab"><h2>Mesada da semana</h2><span class="note">${diaMes(ms.ini)} a ${diaMes(ms.fim)}</span></div>
      <div class="cab"><div><span class="rot">Resta</span><div class="big" style="color:var(--${ms.resta < 0 ? "bad" : "orange"})">${brl(ms.resta)}</div></div><div class="note" style="text-align:right">de ${brl(ms.valor)}<br>${ms.resta > 0 ? `${brl(ms.porDia)} por dia até domingo` : "Semana fechada"}</div></div>
      <div class="prog" style="--c:var(--orange)"><i style="width:${Math.min(100, Math.max(0, (ms.gasto / ms.valor) * 100))}%"></i></div>
      <form class="acoes" id="fGasto"><input class="inp n" id="gValor" inputmode="decimal" placeholder="R$" aria-label="Valor gasto" style="max-width:110px"><input class="inp" id="gDesc" placeholder="Onde (ex.: bar com o Pedro)" aria-label="Descrição" style="flex:1 1 140px"><button class="btn pri">Lançar</button></form>
      ${ms.man.length || ms.deb.length ? `<ul class="lista">${ms.man.map((g) => `<li><span class="note">${diaMes(g.data)}</span><span class="cresce">${esc(g.desc || "gasto")}</span><b class="num">${brl(g.valor)}</b><button class="btn sm x" data-tiragasto="${g.id}" aria-label="Apagar">✕</button></li>`).join("")}${ms.deb.map((t) => `<li><span class="note">${diaMes(t.data)}</span><span class="cresce">${esc(t.desc)} <span class="chip">débito</span></span><b class="num">${brl(t.valor)}</b></li>`).join("")}</ul>` : `<p class="note">Lance aqui o que gastar no débito. As compras no débito do extrato do Nubank entram sozinhas.</p>`}
    </section>
    <section class="card" style="--c:var(--violet)">
      <div class="cab"><h2>Meta de ${brl(meta)}</h2><b class="num">${pct.toFixed(0)}%</b></div>
      <div class="prog" style="--c:var(--violet)"><i style="width:${pct}%"></i></div>
      <p class="note">${brl(pm.ini.tot)} guardados nas caixinhas que contam na meta.</p>
      <ul class="lista">${pm.marcos.map((m) => `<li><span class="dot" style="--c:var(--${m.cor})"></span><span class="cresce">${esc(m.n)}</span><b>${m.ym === "feito" ? "feito" : m.ym ? nomeMes(m.ym, true) : "depois de 4 anos"}</b></li>`).join("")}</ul>
    </section>
    <section class="card" style="--c:var(--bad)">
      <h2>Alertas</h2>
      ${al.length ? al.map((a) => `<div class="alerta ${a.n}"><div><b>${esc(a.t)}</b><br><span class="note">${esc(a.d)}</span></div></div>`).join("") : `<p class="note">Nada fora das regras${Object.keys(txs).length ? " nos extratos importados" : ". Importe os extratos para o app vigiar TikTok, delivery, parcelas novas e cheque especial"}.</p>`}
    </section>
    <section class="card" style="--c:var(--pink)">
      <div class="cab"><h2>Próximas datas</h2><button class="btn sm" data-ir="calendario">Calendário</button></div>
      ${evs.map((e) => diaHtml(e, h)).join("")}
    </section>
    <section class="card" style="--c:var(--amber)">
      <div class="cab"><h2>Pendências</h2><span class="note">${pend.length} abertas</span></div>
      <ul class="lista">${(estado.pendencias || []).map((p) => `<li><label class="chk cresce"><input type="checkbox" data-pend="${p.id}" ${p.feito ? "checked" : ""}> <span style="${p.feito ? "text-decoration:line-through;color:var(--muted)" : ""}">${esc(p.t)}</span></label><button class="btn sm x" data-tirapend="${p.id}" aria-label="Apagar">✕</button></li>`).join("")}</ul>
      <form class="acoes" id="fPend"><input class="inp" id="pTxt" placeholder="Nova pendência" aria-label="Nova pendência" style="flex:1"><button class="btn">Adicionar</button></form>
    </section>
  </div>`;
  $$("[data-ir]", el).forEach((b) => (b.onclick = () => vaiPara(b.dataset.ir)));
  $("#fGasto").onsubmit = (e) => { e.preventDefault(); const v = numero($("#gValor").value); if (!v) { toast("Digite o valor"); return; } estado.gastosSemana.push({ id: uid("g"), data: h, valor: v, desc: $("#gDesc").value.trim(), em: Date.now() }); estado.gastosSemana = estado.gastosSemana.filter((g) => g.data >= somaDias(h, -90)); salva(); redesenha(); toast("Gasto lançado"); };
  $$("[data-tiragasto]", el).forEach((b) => (b.onclick = () => { apaga("gastosSemana", b.dataset.tiragasto); salva(); redesenha(); }));
  $$("[data-pend]", el).forEach((c) => (c.onchange = () => { const p = estado.pendencias.find((x) => x.id === c.dataset.pend); p.feito = c.checked; p.em = Date.now(); salva(); redesenha(); }));
  $$("[data-tirapend]", el).forEach((b) => (b.onclick = () => { estado.pendencias = estado.pendencias.filter((x) => x.id !== b.dataset.tirapend); salva(); redesenha(); }));
  $("#fPend").onsubmit = (e) => { e.preventDefault(); const t = $("#pTxt").value.trim(); if (!t) return; estado.pendencias.push({ id: uid("p"), t, feito: false }); salva(); redesenha(); };
}
function diaHtml(e, h) {
  const d = new Date(e.data + "T12:00:00"), n = diasEntre(h, e.data);
  return `<div class="dia" style="--c:var(--${e.cor || "slate"})"><div class="d">${d.getDate()}<small>${MESES_C[d.getMonth()]}</small></div><div><b>${esc(e.t)}</b>${e.fim ? ` <span class="note">até ${diaMes(e.fim)}</span>` : ""} <span class="chip" style="--c:var(--${n <= 3 ? "bad" : "slate"})">${n < 0 ? "em andamento" : em(n)}</span>${e.d ? `<br><span class="note">${esc(e.d)}</span>` : ""}<br><a class="note" href="${gcal(e.t, e.data, e.fim, e.d)}" target="_blank" rel="noopener">Pôr no Google Agenda</a>${e.id ? ` · <button class="btn sm" data-tiraev="${e.id}">Apagar</button>` : ""}</div></div>`;
}

// ---------- Orçamento ----------
const ONDES = ["Ultravioleta", "Pix", "Nubank débito (caixinha Livre)", "Débito automático Nubank", "BB débito", "Boleto"];
function garanteOrc(ym) {
  if (!estado.orcamentos[ym]) { const o = orcamentoDe(estado, ym); delete o.novo; estado.orcamentos[ym] = o; }
  return estado.orcamentos[ym];
}
function telaOrcamento(el, h) {
  const ym = ui.mes || mesDe(rendaDoMes(estado, proxSalario(h), h).recebe); ui.mes = ym;
  const o = orcamentoDe(estado, ym), t = totaisOrc(o), r = rendaDoMes(estado, somaMes(ym, -1), h);
  const renda = o.renda != null ? +o.renda : r.min, sobra = renda - t.total;
  const cxs = estado.caixinhas;
  const ondeCx = cxs.map((c) => "Caixinha " + c.nome);
  const porOnde = {}; for (const i of o.itens) porOnde[i.p || "sem forma"] = (porOnde[i.p || "sem forma"] || 0) + (+i.v || 0);
  const parcUV = (estado.config.parcelasManual || {})[ym] || 0, escImp = escadaParcelas(todasTx(), ym).escada[ym] || 0, parc = Math.max(escImp, parcUV);
  const uv = Object.entries(porOnde).filter(([k]) => /ultravioleta/i.test(k)).reduce((a, [, v]) => a + v, 0);
  const seg = (v, c, n) => (v > 0 ? `<span style="flex:${v};--c:var(--${c})" title="${n}: ${brl(v)}"></span>` : "");
  el.innerHTML = `
  <section class="card" style="--c:var(--sky)">
    <div class="cab"><button class="btn sm x" data-mes="-1" aria-label="Mês anterior">◀</button><h2 style="flex:1;text-align:center">Orçamento de ${nomeMes(ym)}</h2><button class="btn sm x" data-mes="1" aria-label="Próximo mês">▶</button></div>
    ${o.novo ? `<p class="note" style="text-align:center">Ainda não montado: mostrando a base do mês anterior. Ao editar, ele vira o orçamento de ${MESES[+ym.slice(5) - 1]}.</p>` : ""}
    <div class="campos">
      <label class="f">Renda do mês (R$)<input class="inp n" id="oRenda" inputmode="decimal" value="${o.renda != null ? vIn(o.renda) : ""}" placeholder="${vIn(r.min)} (previsão)"></label>
      <div class="kpi" style="--c:var(--indigo)"><span class="rot">Previsão dos plantões de ${MESES_C[+r.ym.slice(5) - 1]}</span><b>${r.max ? faixa(r.min, r.max) : "—"}</b></div>
      <div class="kpi" style="--c:var(--${sobra >= 0 ? "ok" : "bad"})"><span class="rot">${sobra >= 0 ? "Sobra" : "Estouro"}</span><b>${brl(sobra)}</b></div>
    </div>
    <div class="barra" role="img" aria-label="Divisão da renda">${seg(t.fix, "sky", "Fixos")}${seg(t.vida, "orange", "Estilo de vida")}${seg(t.cx, "green", "Caixinhas")}${seg(Math.max(0, sobra), "line", "Sobra")}</div>
    <div class="kpis">${Object.entries(GRUPOS).map(([g, G]) => `<div class="kpi" style="--c:var(--${G.cor})"><span class="rot">${G.n}</span><b>${brl(t[g])}</b><span class="note">${renda ? Math.round((t[g] / renda) * 100) : 0}% da renda</span></div>`).join("")}</div>
    ${sobra > 0 ? `<p class="note">Se a renda vier maior, a diferença vai inteira para a Reserva.</p>` : sobra < 0 ? `<div class="alerta bad">O orçamento passa da renda em ${brl(-sobra)}. Corte em estilo de vida ou nas caixinhas.</div>` : ""}
    <datalist id="ondes">${[...ONDES, ...ondeCx].map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
    ${Object.entries(GRUPOS).map(([g, G]) => `<div class="orc-grupo"><h3><span><span class="tag-g" style="--c:var(--${G.cor})"></span> ${G.n}</span><span class="num">${brl(t[g])}</span></h3>
      ${o.itens.filter((i) => i.g === g).map((i) => `<div class="linha-orc" data-id="${i.id}">
        <input class="inp" data-f="n" value="${esc(i.n)}" aria-label="Item">
        <select class="inp g-sel" data-f="g" aria-label="Grupo">${Object.entries(GRUPOS).map(([k, x]) => `<option value="${k}" ${k === i.g ? "selected" : ""}>${x.n}</option>`).join("")}</select>
        <input class="inp n" data-f="v" inputmode="decimal" value="${vIn(i.v)}" aria-label="Valor por mês">
        <input class="inp onde" data-f="p" list="ondes" value="${esc(i.p || "")}" placeholder="Onde pagar" aria-label="Onde pagar">
        <button class="btn sm x" data-tira="${i.id}" aria-label="Apagar ${esc(i.n)}">✕</button></div>`).join("")}
      <div><button class="btn sm" data-novo="${g}">+ Item em ${G.n.toLowerCase()}</button></div></div>`).join("")}
    <div class="acoes">
      ${o.distribuido ? `<span class="chip ok">Distribuído nas caixinhas em ${diaMes(o.distribuido)}</span><button class="btn sm" id="oDesfaz">Desfazer distribuição</button>` : `<button class="btn verde" id="oDistr">Dia ${estado.config.diaSalario}: distribuir nas caixinhas</button>`}
      <button class="btn sm" id="oModelo">Usar como modelo dos próximos meses</button>
    </div>
    <p class="note">Distribuir lança nas caixinhas o valor dos itens cujo "onde pagar" é uma caixinha. Itens com data de fim (ex.: última parcela) saem sozinhos dos meses seguintes.</p>
  </section>
  <div class="grade">
    <section class="card" style="--c:var(--violet)"><h2>Fatura do Ultravioleta prevista</h2>
      <ul class="lista"><li><span class="cresce">Itens do orçamento no Ultravioleta</span><b class="num">${brl(uv)}</b></li><li><span class="cresce">Parcelas antigas ${escImp > parcUV ? "(das faturas importadas)" : "(planilha da consultoria)"}</span><b class="num">${brl(parc)}</b></li><li><span class="cresce"><b>Fatura estimada</b></span><b class="num">${brl(uv + parc)}</b></li></ul>
      <p class="note">${uv + parc >= 8000 ? "Passa de R$ 8 mil: a mensalidade do Ultravioleta sai de graça neste ciclo." : "Abaixo de R$ 8 mil: paga a mensalidade de R$ 89. Nunca gaste a mais para bater a meta."}</p></section>
    <section class="card" style="--c:var(--slate)"><h2>Por forma de pagamento</h2>
      <ul class="lista">${Object.entries(porOnde).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span class="cresce">${esc(k)}</span><b class="num">${brl(v)}</b></li>`).join("")}</ul></section>
  </div>`;
  $$("[data-mes]", el).forEach((b) => (b.onclick = () => { ui.mes = somaMes(ym, +b.dataset.mes); redesenha(); }));
  $("#oRenda").onchange = (e) => { const O = garanteOrc(ym); O.renda = e.target.value.trim() === "" ? null : numero(e.target.value); salva(); redesenha(); };
  $$(".linha-orc", el).forEach((row) => $$("[data-f]", row).forEach((inp) => (inp.onchange = () => {
    const O = garanteOrc(ym), it = O.itens.find((x) => x.id === row.dataset.id); if (!it) return;
    const f = inp.dataset.f; it[f] = f === "v" ? numero(inp.value) : inp.value.trim();
    if (f === "p") { const c = cxs.find((c) => semAcento("Caixinha " + c.nome) === semAcento(it.p)); if (c) it.cx = c.id; else delete it.cx; }
    salva(); redesenha();
  })));
  $$("[data-tira]", el).forEach((b) => (b.onclick = () => {
    const O = garanteOrc(ym), i = O.itens.findIndex((x) => x.id === b.dataset.tira); if (i < 0) return;
    const [it] = O.itens.splice(i, 1); salva(); redesenha();
    toast(`"${it.n}" apagado`, { rot: "Desfazer", fn: () => { O.itens.splice(i, 0, it); salva(); redesenha(); } });
  }));
  $$("[data-novo]", el).forEach((b) => (b.onclick = () => { const O = garanteOrc(ym); O.itens.push({ id: uid("o"), n: "Novo item", g: b.dataset.novo, v: 0, p: "" }); salva(); redesenha(); const ul = $$(`.linha-orc input[data-f=n]`); const last = ul.filter((x) => x.value === "Novo item").pop(); if (last) { last.focus(); last.select(); } }));
  const dist = $("#oDistr");
  if (dist) dist.onclick = () => {
    const O = garanteOrc(ym), data = dataNoMes(ym, estado.config.diaSalario || 20);
    const its = O.itens.filter((i) => i.cx && cxDe(i.cx) && +i.v);
    if (!its.length) { toast('Nenhum item com "onde pagar" numa caixinha'); return; }
    its.forEach((i) => estado.movimentos.push({ id: uid("m"), cx: i.cx, data, valor: +i.v, desc: `${i.n} (${nomeMes(ym, true)})`, orc: ym, em: Date.now() }));
    O.distribuido = h; salva(); redesenha(); toast(`${its.length} depósitos lançados nas caixinhas`);
  };
  const des = $("#oDesfaz");
  if (des) des.onclick = () => { const O = garanteOrc(ym); estado.movimentos.filter((m) => m.orc === ym).forEach((m) => apaga("movimentos", m.id)); delete O.distribuido; salva(); redesenha(); };
  $("#oModelo").onclick = () => { estado.modeloItens = o.itens.filter((i) => !i.so).map((i) => Object.assign({}, i)); salva(); toast("Modelo atualizado: os meses ainda não montados partem deste"); };
}

// ---------- Caixinhas ----------
function telaCaixinhas(el, h) {
  const pm = projetaMeta(estado, h, 60), cfg = estado.config, sv = suavizador(estado, h, 6);
  const pct = Math.min(100, (pm.ini.tot / pm.metaG) * 100);
  const marcosSerie = pm.serie.filter((_, i) => i % 3 === 2).slice(0, 12);
  const maxS = Math.max(pm.metaG, ...marcosSerie.map((s) => s.tot));
  el.innerHTML = `
  <div class="grade g2">
  <section class="card destaque" style="--c:var(--violet)">
    <span class="rot">Guardado no Nubank (caixinhas da meta)</span>
    <div class="big">${brl(pm.ini.tot)} <span style="font-size:.5em;opacity:.8">de ${brl(pm.metaG)}</span></div>
    <div class="prog"><i style="width:${pct}%"></i></div>
    <div class="kpis">${pm.marcos.map((m) => `<div class="kpi"><span class="rot">${esc(m.n.replace(/ \(.*\)/, ""))}</span><b>${m.ym === "feito" ? "feito" : m.ym ? nomeMes(m.ym, true) : "—"}</b><span class="note">${brl(m.alvo)}</span></div>`).join("")}</div>
    <div class="escada" aria-label="Projeção a cada 3 meses">${marcosSerie.map((s) => `<div><b>${(s.tot / 1000).toFixed(0)}k</b><div class="col" style="height:${(s.tot / maxS) * 100}%;--c:rgba(255,255,255,.75)"></div><small>${nomeMes(s.ym, true)}</small></div>`).join("")}</div>
    <div class="campos"><label class="f" style="color:inherit">Rendimento ao mês (%)<input class="inp n" data-k="config.rendMes" data-num inputmode="decimal" value="${vIn(cfg.rendMes)}" placeholder="0 = conservador"></label>
    <label class="f" style="color:inherit">Custo de vida por mês (R$)<input class="inp n" data-k="config.custoMensal" data-num inputmode="decimal" value="${vIn(cfg.custoMensal)}"></label>
    <label class="f" style="color:inherit">Meta (R$)<input class="inp n" data-k="config.metaGuardado" data-num inputmode="decimal" value="${vIn(cfg.metaGuardado)}"></label></div>
    <p class="note">Projeção pelos depósitos dos orçamentos já montados e, nos outros meses, pelo aporte padrão de cada caixinha. A caixinha Turbo rende 120% do CDI: coloque o rendimento se quiser ver as datas com juros.</p>
  </section>
  <section class="card" style="--c:var(--teal)">
    <h2>Salário fixo de si mesmo</h2>
    <p>Todo pagamento do hospital cai na caixinha <b>Renda</b>; no dia ${cfg.diaSalario} você tira dela um salário igual todo mês. O que passa vai para a Reserva; no mês fraco, a Renda cobre.</p>
    <label class="f">Meu salário fixo (R$ por mês)<input class="inp n" data-k="config.salarioFixo" data-num inputmode="decimal" value="${vIn(cfg.salarioFixo)}" placeholder="ex.: 8000"></label>
    <div class="rolar"><table><thead><tr><th>Dia ${cfg.diaSalario}</th><th class="n">Entra (mín.)</th><th class="n">Sobra/falta</th><th class="n">Caixinha Renda</th></tr></thead>
    <tbody>${sv.map((s) => `<tr><td>${nomeMes(s.ym, true)}</td><td class="n">${s.entra ? brl(s.entra) : "—"}</td><td class="n" style="color:var(--${s.sobra < 0 ? "bad" : "ok"})">${s.entra ? brl(s.sobra) : "—"}</td><td class="n" style="color:var(--${s.saldo < 0 ? "bad" : "ink"})">${brl(s.saldo)}</td></tr>`).join("")}</tbody></table></div>
    <p class="note">Meses sem plantão marcado aparecem como zero: a conta fica mais real à medida que a escala entra.${sv.some((s) => s.saldo < 0) ? " <b>A Renda fica negativa em algum mês: aumente o aporte nela ou reduza o salário.</b>" : ""}</p>
  </section>
  </div>
  <div class="grade">${estado.caixinhas.map((c) => cxHtml(c, h)).join("")}
    <section class="card liso"><h3>Nova caixinha</h3><form class="acoes" id="fNovaCx"><input class="inp" id="ncNome" placeholder="Nome (ex.: Viagem Salvador)" aria-label="Nome da caixinha" style="flex:1"><button class="btn pri">Criar</button></form></section>
  </div>`;
  ligaCampos(el);
  $$("[data-cxmov]", el).forEach((f) => (f.onsubmit = (e) => {
    e.preventDefault(); const id = f.dataset.cxmov, v = numero($("[name=v]", f).value), sinal = e.submitter && e.submitter.value === "tirar" ? -1 : 1;
    if (!v) { toast("Digite o valor"); return; }
    estado.movimentos.push({ id: uid("m"), cx: id, data: h, valor: sinal * Math.abs(v), desc: $("[name=d]", f).value.trim() || (sinal > 0 ? "Depósito" : "Retirada"), em: Date.now() });
    salva(); redesenha(); toast(sinal > 0 ? "Guardado" : "Retirada lançada");
  }));
  $$("[data-tiramov]", el).forEach((b) => (b.onclick = () => { apaga("movimentos", b.dataset.tiramov); salva(); redesenha(); }));
  $$("[data-cxcfg]", el).forEach((i) => (i.onchange = () => {
    const [id, f] = i.dataset.cxcfg.split("."), c = cxDe(id); if (!c) return;
    c[f] = i.type === "checkbox" ? i.checked : ["meta", "aporte", "aporteAntes"].includes(f) ? numero(i.value) : i.value.trim();
    salva(); redesenha();
  }));
  $$("[data-tiracx]", el).forEach((b) => (b.onclick = () => {
    const c = cxDe(b.dataset.tiracx); if (!c) return;
    if (Math.abs(saldoCx(estado, c.id)) > 0.01) { toast("Zere o saldo antes de apagar a caixinha"); return; }
    estado.caixinhas = estado.caixinhas.filter((x) => x.id !== c.id); salva(); redesenha();
    toast(`Caixinha ${c.nome} apagada`, { rot: "Desfazer", fn: () => { estado.caixinhas.push(c); salva(); redesenha(); } });
  }));
  $("#fNovaCx").onsubmit = (e) => { e.preventDefault(); const n = $("#ncNome").value.trim(); if (!n) return; const cores = ["violet", "pink", "cyan", "amber", "lime", "rose"]; estado.caixinhas.push({ id: uid("c"), nome: n, cor: cores[estado.caixinhas.length % cores.length], meta: 0, aporte: 0, naMeta: true }); salva(); redesenha(); };
}
function cxHtml(c, h) {
  const s = saldoCx(estado, c.id), movs = estado.movimentos.filter((m) => m.cx === c.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
  const ap = aportePrevisto(estado, c, mesDe(h)), p = c.meta ? Math.min(100, (s / c.meta) * 100) : 0;
  return `<section class="card cx" style="--c:var(--${c.cor || "green"})">
    <div class="cab"><h3>${esc(c.nome)}</h3><b style="color:var(--${s < 0 ? "bad" : "ink"})">${brl(s)}</b></div>
    ${c.meta ? `<div class="prog" style="--c:var(--${c.cor || "green"})"><i style="width:${p}%"></i></div><span class="note">${p.toFixed(0)}% de ${brl(c.meta)}${c.naMeta ? " · conta na meta" : ""}</span>` : `<span class="note">${c.naMeta ? "Conta na meta dos R$ 50 mil" : "Fora da meta"}</span>`}
    <span class="note">Aporte previsto em ${MESES[+mesDe(h).slice(5) - 1]}: <b>${brl(ap)}</b></span>
    <form class="acoes" data-cxmov="${c.id}"><input class="inp n" name="v" inputmode="decimal" placeholder="R$" aria-label="Valor" style="max-width:100px"><input class="inp" name="d" placeholder="Descrição" aria-label="Descrição" style="flex:1 1 100px"><button class="btn sm verde" value="guardar">Guardar</button><button class="btn sm" value="tirar">Tirar</button></form>
    ${movs.length ? `<ul class="lista mini">${movs.map((m) => `<li><span class="note">${diaMes(m.data)}</span><span class="cresce">${esc(m.desc)}</span><b class="num" style="color:var(--${m.valor < 0 ? "bad" : "ok"})">${brl(m.valor)}</b><button class="btn sm x" data-tiramov="${m.id}" aria-label="Apagar">✕</button></li>`).join("")}</ul>` : ""}
    <details><summary>Ajustar</summary><div class="campos" style="margin-top:8px">
      <label class="f">Nome<input class="inp" data-cxcfg="${c.id}.nome" value="${esc(c.nome)}"></label>
      <label class="f">Meta (R$)<input class="inp n" data-cxcfg="${c.id}.meta" inputmode="decimal" value="${vIn(c.meta)}"></label>
      <label class="f">Aporte padrão (R$/mês)<input class="inp n" data-cxcfg="${c.id}.aporte" inputmode="decimal" value="${vIn(c.aporte)}"></label>
      <label class="f">A partir de<input class="inp" type="month" data-cxcfg="${c.id}.aporteDesde" value="${esc(c.aporteDesde || "")}"></label>
      <label class="f">Antes disso (R$/mês)<input class="inp n" data-cxcfg="${c.id}.aporteAntes" inputmode="decimal" value="${vIn(c.aporteAntes)}"></label>
      <label class="f">Até<input class="inp" type="month" data-cxcfg="${c.id}.aporteAte" value="${esc(c.aporteAte || "")}"></label>
      <label class="f">Cor<select class="inp" data-cxcfg="${c.id}.cor">${["green", "teal", "sky", "indigo", "violet", "pink", "orange", "amber", "lime", "cyan", "rose", "slate"].map((k) => `<option ${k === c.cor ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label class="chk"><input type="checkbox" data-cxcfg="${c.id}.naMeta" ${c.naMeta ? "checked" : ""}> Conta na meta</label>
    </div><button class="btn sm perigo" data-tiracx="${c.id}" style="margin-top:8px">Apagar caixinha</button></details>
  </section>`;
}

// ---------- Renda ----------
function telaRenda(el, h) {
  const pc = estado.plantaoCache, cfg = estado.config, est = Object.assign({}, EST_PADRAO, cfg.estimativas);
  const meses = [-2, -1, 0, 1].map((i) => somaMes(mesDe(h), i));
  const corSt = { contado: "ok", previsto: "indigo", sobreaviso: "amber", "sem chamado": "slate", "sem contagem": "warn", "salário": "teal" };
  el.innerHTML = `
  <section class="card" style="--c:var(--indigo)">
    <div class="cab"><h2>Meu Plantão</h2>${pc ? `<span class="chip ok">${pc.plantoes.escala.length} plantões · lido ${new Date(pc.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>` : `<span class="chip warn">ainda não ligado</span>`}</div>
    <p>O app lê a escala e as contagens de pacientes do Meu Plantão (R$ 50 por paciente, R$ 150 por UTI, pelo valor de cada local) e projeta o que entra no dia ${cfg.diaSalario} do mês seguinte. Plantão ainda sem contagem entra pela estimativa do turno.</p>
    <div class="acoes"><button class="btn pri" id="plGh" ${gh.chave ? "" : "disabled"}>Ler do GitHub agora</button><span class="note">${gh.chave ? `De ${esc(gh.plRepo || gh.repo)}/${esc(gh.plArquivo || "meus-padroes.json")}` : "Para ler sozinho, preencha a chave do GitHub em Ajustes."}</span></div>
    <details><summary>Ou cole o backup do Meu Plantão</summary><p class="note">No Meu Plantão: Backup → Copiar. Cole aqui (só os plantões são lidos; nada de paciente).</p><textarea class="inp" id="plCola" placeholder='{"app":"receituario-plantao", ...}'></textarea><div class="acoes"><button class="btn" id="plLer">Ler plantões</button></div></details>
  </section>
  <div class="grade g2">${meses.map((ym) => {
    const r = rendaDoMes(estado, ym, h);
    return `<section class="card" style="--c:var(--${ym < mesDe(h) ? "green" : ym === mesDe(h) ? "indigo" : "sky"})">
      <div class="cab"><div><span class="rot">Plantões de ${nomeMes(ym)}</span><div class="med">${r.max ? faixa(r.min, r.max) : "R$ 0"}</div></div><span class="chip ${r.pago ? "ok" : ""}">${r.pago ? "recebido" : "recebe " + diaMes(r.recebe)}</span></div>
      ${r.plantoes.length ? `<ul class="lista mini">${r.plantoes.map((p) => `<li><span class="note">${diaMes(p.data)}</span><span class="cresce">${esc(p.rot)} · ${esc(p.local)}${p.n != null ? ` · ${p.n} pac.${p.uti ? ` + ${p.uti} UTI` : ""}` : ""}</span><span class="chip" style="--c:var(--${corSt[p.status] || "slate"})">${p.status}</span><b class="num">${faixa(p.min, p.max)}</b></li>`).join("")}</ul>` : ""}
      ${r.lanc.length ? `<ul class="lista mini">${r.lanc.map((l) => `<li data-rid="${l.id}"><input class="inp" data-rf="desc" value="${esc(l.desc)}" aria-label="Descrição" style="flex:1 1 140px"><input class="inp n" data-rf="min" inputmode="decimal" value="${vIn(l.min)}" aria-label="Valor mínimo" style="width:90px"><input class="inp n" data-rf="max" inputmode="decimal" value="${vIn(l.max)}" aria-label="Valor máximo" placeholder="máx." style="width:90px"><span class="chip" style="--c:var(--${l.tipo === "extra" ? "pink" : "indigo"})">${l.tipo === "extra" ? "extra" : "plantão"}</span><button class="btn sm x" data-tirar="${l.id}" aria-label="Apagar">✕</button></li>`).join("")}</ul>` : ""}
      ${r.usaPl && (estado.rendas || []).some((x) => x.ref === ym && x.tipo === "plantao") ? `<p class="note">Os plantões lançados à mão neste mês ficam de fora: vale a escala do Meu Plantão.</p>` : ""}
      ${!r.plantoes.length && !r.lanc.length ? `<p class="note">Nada marcado.</p>` : ""}
    </section>`;
  }).join("")}</div>
  <div class="grade">
    <section class="card" style="--c:var(--pink)"><h2>Lançar renda à mão</h2>
      <p class="note">Para plantões fora do Meu Plantão e extras (VipMed, UTI Móvel, DF Resgate). Use mínimo e máximo para valores incertos, como sobreaviso.</p>
      <form id="fRenda" class="campos">
        <label class="f">Mês trabalhado<input class="inp" type="month" id="rRef" value="${mesDe(h)}"></label>
        <label class="f">Descrição<input class="inp" id="rDesc" placeholder="Remoção VipMed"></label>
        <label class="f">Valor (mín.)<input class="inp n" id="rMin" inputmode="decimal"></label>
        <label class="f">Máximo (opcional)<input class="inp n" id="rMax" inputmode="decimal"></label>
        <label class="f">Tipo<select class="inp" id="rTipo"><option value="extra">Extra</option><option value="plantao">Plantão</option></select></label>
        <div class="acoes" style="align-self:end"><button class="btn pri">Lançar</button></div>
      </form></section>
    <section class="card" style="--c:var(--amber)"><h2>Estimativa por turno</h2>
      <p class="note">Vale para plantão marcado e ainda sem contagem. Plantão cheio costuma dar R$ 950 a 1.250; meio, uns R$ 800. Sobreaviso só paga se chamarem.</p>
      <div class="campos">${[["D", "Diurno 12 h"], ["N", "Noturno 12 h"], ["M", "Matutino 6 h"], ["V", "Vespertino 6 h"], ["N1", "Noturno até 1h"], ["18A", "18 h"], ["24", "24 h"], ["sobreMin", "Sobreaviso (mín.)"], ["sobreMax", "Sobreaviso (máx.)"]].map(([k, n]) => `<label class="f">${n}<input class="inp n" data-est="${k}" inputmode="decimal" value="${vIn(est[k])}"></label>`).join("")}</div></section>
  </div>`;
  const aplica = (P) => { estado.plantaoCache = { em: Date.now(), plantoes: P }; salva(); redesenha(); toast(`${P.escala.length} plantões lidos`); };
  $("#plGh").onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = "Lendo…"; try { aplica(await lePlantoesGitHub()); } catch (er) { toast(er.message || String(er)); b.disabled = false; b.textContent = "Ler do GitHub agora"; } };
  $("#plLer").onclick = () => { try { aplica(achaPlantoes(JSON.parse($("#plCola").value))); } catch (er) { toast(er instanceof SyntaxError ? "Não é um backup válido: copie de novo no Meu Plantão" : er.message); } };
  $("#fRenda").onsubmit = (e) => { e.preventDefault(); const v = numero($("#rMin").value); if (!v || !$("#rRef").value) { toast("Preencha mês e valor"); return; }
    const mx = $("#rMax").value.trim(); estado.rendas.push({ id: uid("r"), ref: $("#rRef").value, desc: $("#rDesc").value.trim() || "Renda", min: v, max: mx ? numero(mx) : v, tipo: $("#rTipo").value, em: Date.now() }); salva(); redesenha(); toast("Renda lançada"); };
  $$("[data-rid]", el).forEach((li) => $$("[data-rf]", li).forEach((i) => (i.onchange = () => { const r = estado.rendas.find((x) => x.id === li.dataset.rid); if (!r) return; const f = i.dataset.rf; r[f] = f === "desc" ? i.value.trim() : i.value.trim() === "" && f === "max" ? r.min : numero(i.value); r.em = Date.now(); salva(); redesenha(); })));
  $$("[data-tirar]", el).forEach((b) => (b.onclick = () => { const r = estado.rendas.find((x) => x.id === b.dataset.tirar); apaga("rendas", b.dataset.tirar); salva(); redesenha(); toast("Lançamento apagado", { rot: "Desfazer", fn: () => { estado.rendas.push(r); estado.apagados = estado.apagados.filter((x) => x !== r.id); salva(); redesenha(); } }); }));
  $$("[data-est]", el).forEach((i) => (i.onchange = () => { estado.config.estimativas = Object.assign({}, estado.config.estimativas, { [i.dataset.est]: numero(i.value) }); salva(); redesenha(); }));
}

// ---------- Extratos ----------
async function lerArquivo(f) {
  const buf = await f.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { return new TextDecoder("iso-8859-1").decode(buf); }
}
async function importaArquivos(files) {
  const rel = [], mudou = new Set();
  for (const f of files) {
    if (!/\.csv$/i.test(f.name)) { rel.push(`${f.name}: só CSV (as faturas em PDF do BB ficam de fora)`); continue; }
    const r = importarCSV(await lerArquivo(f), f.name);
    if (!r.origem) { rel.push(`${f.name}: ${r.erro}`); continue; }
    let novas = 0;
    for (const t of r.itens) { const m = t.comp; txs[m] = txs[m] || []; if (!txs[m].some((x) => x.id === t.id)) { t.em = Date.now(); txs[m].push(t); novas++; mudou.add(m); } }
    rel.push(`${f.name}: ${novas} novas de ${r.itens.length} (${{ "nu-fatura": "fatura Nubank", "nu-conta": "conta Nubank", "bb-conta": "conta BB" }[r.origem]})`);
  }
  for (const m of mudou) txs[m].sort((a, b) => a.data.localeCompare(b.data));
  salva([...mudou]);
  return rel;
}
function telaExtratos(el, h) {
  const tx = todasTx().sort((a, b) => b.data.localeCompare(a.data)), meses = Object.keys(txs).sort().reverse();
  const f = tx.filter((t) => (!ui.txMes || t.comp === ui.txMes) && (!ui.txCat || t.cat === ui.txCat) && (!ui.txBusca || semAcento(t.desc).includes(semAcento(ui.txBusca))));
  const mostra = f.slice(0, 300);
  el.innerHTML = `
  <section class="card" style="--c:var(--slate)">
    <h2>Importar extratos</h2>
    <label class="drop" id="drop"><b>Escolha ou arraste os arquivos CSV</b><span class="note">Fatura Nubank (Nubank_AAAA-MM-DD.csv), conta Nubank (NU_…csv) e conta BB (latin1). Pode mandar vários de uma vez; o que já foi importado não duplica.</span><input type="file" id="arq" accept=".csv,text/csv" multiple style="max-width:100%"></label>
    <div id="rel"></div>
    <p class="note">Ficam de fora das contas: pagamento de fatura, transferências entre suas contas, caixinhas e valores da fazenda (ajuste as palavras em Ajustes).</p>
  </section>
  <section class="card liso">
    <div class="campos">
      <label class="f">Mês<select class="inp" id="fMes"><option value="">Todos</option>${meses.map((m) => `<option value="${m}" ${m === ui.txMes ? "selected" : ""}>${nomeMes(m)} (${txs[m].length})</option>`).join("")}</select></label>
      <label class="f">Categoria<select class="inp" id="fCat"><option value="">Todas</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === ui.txCat ? "selected" : ""}>${c.n}</option>`).join("")}</select></label>
      <label class="f">Buscar<input class="inp" id="fBusca" value="${esc(ui.txBusca)}" placeholder="ex.: tiktok"></label>
    </div>
    <p class="note">${f.length} lançamentos · gastos ${brl(f.filter((t) => t.valor > 0 && !CAT_FORA.has(t.cat)).reduce((a, t) => a + t.valor, 0))}${f.length > 300 ? " · mostrando os 300 mais recentes" : ""}</p>
    ${mostra.length ? `<div class="rolar"><table><thead><tr><th>Data</th><th>Descrição</th><th class="n">Valor</th><th>Categoria</th></tr></thead><tbody>${mostra.map((t) => `<tr style="${t.cat === "ignorar" ? "opacity:.55" : ""}"><td class="num">${diaMes(t.data)}<br><span class="note mini">${{ "nu-fatura": "fatura", "nu-conta": "Nubank", "bb-conta": "BB" }[t.origem] || ""}</span></td><td>${esc(t.desc)}${t.parc ? ` <span class="chip" style="--c:var(--violet)">${t.parc.k}/${t.parc.n}</span>` : ""}</td><td class="n" style="color:var(--${t.valor < 0 ? "ok" : "ink"})">${brl2(t.valor)}</td><td><select class="inp" data-tcat="${t.id}" style="--c:var(--${CATS[t.cat].cor});border-left:5px solid var(--c);min-width:150px">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === t.cat ? "selected" : ""}>${c.n}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>` : `<div class="vazio">Nenhum extrato importado ainda.</div>`}
    ${ui.txMes ? `<div class="acoes"><button class="btn sm perigo" id="apagaMes">Apagar os lançamentos de ${nomeMes(ui.txMes)}</button></div>` : ""}
  </section>`;
  const arq = $("#arq"), drop = $("#drop");
  const vai = async (files) => { const rel = await importaArquivos([...files]); $("#rel").innerHTML = rel.map((x) => `<div class="alerta" style="--c:var(--sky)">${esc(x)}</div>`).join(""); setTimeout(() => { redesenha(); $("#rel") && ($("#rel").innerHTML = rel.map((x) => `<div class="alerta" style="--c:var(--sky)">${esc(x)}</div>`).join("")); }, 0); };
  arq.onchange = () => vai(arq.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("sobre"); };
  drop.ondragleave = () => drop.classList.remove("sobre");
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("sobre"); vai(e.dataTransfer.files); };
  $("#fMes").onchange = (e) => { ui.txMes = e.target.value; redesenha(); };
  $("#fCat").onchange = (e) => { ui.txCat = e.target.value; redesenha(); };
  $("#fBusca").onchange = (e) => { ui.txBusca = e.target.value; redesenha(); };
  $$("[data-tcat]", el).forEach((s) => (s.onchange = () => {
    const t = tx.find((x) => x.id === s.dataset.tcat); estado.ajustes[t.id] = { cat: s.value }; salva(); redesenha();
    const palavra = chaveLoja(t.desc).split(" ").filter((w) => w.length > 2).slice(0, 2).join(" ");
    if (palavra) toast(`Categoria trocada`, { rot: `Sempre "${palavra}"`, fn: () => { estado.config.regras.push({ t: palavra, cat: s.value }); salva(); redesenha(); toast("Regra criada (veja em Ajustes)"); } });
  }));
  const am = $("#apagaMes");
  if (am) am.onclick = () => { const m = ui.txMes, bk = txs[m]; delete txs[m]; ui.txMes = ""; salva([m]); if (nuvem.db) nuvem.db.doc("tx/" + m).delete().catch(() => {}); redesenha(); toast("Lançamentos apagados", { rot: "Desfazer", fn: () => { txs[m] = bk; salva([m]); redesenha(); } }); };
}

// ---------- Raio-X ----------
function telaRaiox(el, h) {
  const tx = todasTx(), todos = [...new Set(tx.map((t) => t.comp))].sort();
  const ate = todos.filter((m) => m <= mesDe(h)).pop(), desde = ate && ui.rxPer ? somaMes(ate, -(ui.rxPer - 1)) : null;
  const rx = raioX(tx, { desde, ate }), esc0 = escadaParcelas(tx, mesDe(h)), ref = estado.config.raioxRef || [];
  const man = estado.config.parcelasManual || {}, escada = {};
  for (const k of new Set([...Object.keys(esc0.escada), ...Object.keys(man)])) escada[k] = Math.max(esc0.escada[k] || 0, man[k] || 0);
  const em0 = Object.keys(esc0.escada).some((k) => esc0.escada[k] >= (man[k] || 0));
  const esK = Object.keys(escada).filter((m) => m >= mesDe(h)).sort().slice(0, 12), esMax = Math.max(1, ...esK.map((k) => escada[k]));
  const max = Math.max(1, ...rx.media.map((m) => m.media)), jur = tx.filter((t) => t.cat === "juros" && t.valor > 0 && (!desde || t.comp >= desde));
  const rec = recorrentes(tx.filter((t) => !desde || t.comp >= desde)), al = alertas({ tx, cfg: estado.config, hoje: h });
  const cart = rx.meses.reduce((a, m) => a + rx.porMes[m].cartao, 0) / rx.n, fora = rx.meses.reduce((a, m) => a + rx.porMes[m].fora, 0) / rx.n;
  el.innerHTML = `
  ${tx.length ? `<section class="card destaque" style="--c:var(--orange)">
    <div class="cab"><span class="rot">Gasto real por mês · ${rx.meses.length ? `${nomeMes(rx.meses[0], true)} a ${nomeMes(rx.meses[rx.meses.length - 1], true)}` : ""}</span>
      <select class="inp" id="rxPer" style="max-width:150px;color:var(--ink)" aria-label="Período">${[[3, "3 meses"], [6, "6 meses"], [12, "12 meses"], [0, "Tudo"]].map(([v, n]) => `<option value="${v}" ${+ui.rxPer === v ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="big">${brl(rx.totalMedio)}</div>
    <div class="kpis"><div class="kpi"><span class="rot">Na fatura</span><b>${brl(cart)}</b></div><div class="kpi"><span class="rot">Fora do cartão</span><b>${brl(fora)}</b></div><div class="kpi"><span class="rot">Juros e tarifas</span><b>${brl(jur.reduce((a, t) => a + t.valor, 0))}</b></div></div>
  </section>` : `<section class="card" style="--c:var(--orange)"><h2>Raio-X</h2><p>Importe os extratos em <b>Extratos</b> para ver o gasto real por categoria, as parcelas, os juros e as assinaturas. Enquanto isso, fica a referência da consultoria abaixo.</p></section>`}
  <div class="grade g2">
    ${rx.media.length ? `<section class="card" style="--c:var(--orange)"><h2>Por categoria (média por mês)</h2><div class="barras">${rx.media.map((m) => `<details class="br" style="--c:var(--${CATS[m.cat].cor})"><summary><span><span class="dot"></span> ${CATS[m.cat].n}</span></summary><b class="num">${brl(m.media)}</b><span class="trilho"><i style="width:${(m.media / max) * 100}%"></i></span><ul class="lista mini" style="grid-column:1/-1">${rx.itensCat[m.cat].sort((a, b) => b.valor - a.valor).slice(0, 8).map((t) => `<li><span class="note">${diaMes(t.data)}</span><span class="cresce">${esc(t.desc)}</span><b class="num">${brl(t.valor)}</b></li>`).join("")}</ul></details>`).join("")}</div><p class="note">Toque numa categoria para ver as maiores compras.</p></section>` : ""}
    ${ref.length ? `<section class="card" style="--c:var(--slate)"><h2>Referência: jul a nov/2026</h2><p class="note">Média por categoria na fatura, levantada na consultoria.</p><div class="barras">${ref.map((r) => `<div class="br" style="--c:var(--${(CATS[r.cat] || CATS.outros).cor})"><span><span class="dot"></span> ${esc(r.n || (CATS[r.cat] || {}).n)}</span><b class="num">${brl(r.v)}</b><span class="trilho"><i style="width:${(r.v / Math.max(...ref.map((x) => x.v))) * 100}%"></i></span></div>`).join("")}</div>${estado.config.raioxNota ? `<p class="note">${esc(estado.config.raioxNota)}</p>` : ""}</section>` : ""}
    <section class="card" style="--c:var(--violet)"><h2>Parcelas já contratadas</h2>
      ${esK.length ? `<div class="escada">${esK.map((k) => `<div><b>${Math.round(escada[k]).toLocaleString("pt-BR")}</b><div class="col" style="height:${(escada[k] / esMax) * 100}%"></div><small>${nomeMes(k, true)}</small></div>`).join("")}</div>` : `<p class="note">Sem parcelas futuras.</p>`}
      <p class="note">${em0 ? "Calculado das faturas importadas (vale o maior entre elas e a planilha da consultoria)." : "Da planilha da consultoria (importe as faturas para o app calcular sozinho)."} Antecipar só compensa com a reserva pronta e desconto acima de 1% ao mês.</p>
      ${esc0.compras.length ? `<details><summary>Compras parceladas (${esc0.compras.length})</summary><ul class="lista mini">${esc0.compras.map((c) => `<li><span class="cresce">${esc(c.desc)}</span><span class="note">${c.n}x ${brl(c.valor)}</span><b>até ${nomeMes(c.fim, true)}</b></li>`).join("")}</ul></details>` : ""}
    </section>
    <section class="card" style="--c:var(--bad)"><h2>Alertas</h2>${al.length ? al.map((a) => `<div class="alerta ${a.n}"><div><b>${esc(a.t)}</b><br><span class="note">${esc(a.d)}</span></div></div>`).join("") : `<p class="note">Nenhum alerta nos extratos importados.</p>`}</section>
    ${jur.length ? `<section class="card" style="--c:var(--bad)"><h2>Juros e tarifas</h2><ul class="lista mini">${jur.sort((a, b) => b.data.localeCompare(a.data)).map((t) => `<li><span class="note">${diaMes(t.data)}</span><span class="cresce">${esc(t.desc)}</span><b class="num">${brl2(t.valor)}</b></li>`).join("")}</ul></section>` : ""}
    ${rec.length ? `<section class="card" style="--c:var(--lime)"><h2>Repetem todo mês</h2><ul class="lista mini">${rec.map((r) => `<li><span class="dot" style="--c:var(--${CATS[r.cat].cor})"></span><span class="cresce">${esc(r.desc)}</span><span class="note">${r.meses.length} meses</span><b class="num">${brl2(r.valor)}</b></li>`).join("")}</ul><p class="note">Assinaturas e cobranças que aparecem em 2 meses ou mais. Corte o que não usa.</p></section>` : ""}
    ${rx.meses.length ? `<section class="card liso"><h2>Mês a mês</h2><div class="rolar"><table><thead><tr><th>Mês</th><th class="n">Fatura</th><th class="n">Fora</th><th class="n">Total</th></tr></thead><tbody>${rx.meses.map((m) => `<tr><td>${nomeMes(m, true)}</td><td class="n">${brl(rx.porMes[m].cartao)}</td><td class="n">${brl(rx.porMes[m].fora)}</td><td class="n"><b>${brl(rx.porMes[m].total)}</b></td></tr>`).join("")}</tbody></table></div><p class="note">Fatura pelo mês de vencimento; conta pelo mês da data.</p></section>` : ""}
  </div>`;
  const per = $("#rxPer"); if (per) per.onchange = () => { ui.rxPer = +per.value; guardaUi(); redesenha(); };
}

// ---------- Calendário ----------
function telaCalendario(el, h) {
  const evs = eventos(estado, h, 12), por = {};
  for (const e of evs) (por[mesDe(e.data < h ? h : e.data)] = por[mesDe(e.data < h ? h : e.data)] || []).push(e);
  el.innerHTML = `
  <div class="grade g2">
    <section class="card" style="--c:var(--pink)"><h2>Adicionar data</h2>
      <form id="fEv" class="campos"><label class="f">Data<input class="inp" type="date" id="eData" value="${h}"></label><label class="f">Até (opcional)<input class="inp" type="date" id="eFim"></label><label class="f" style="grid-column:1/-1">O quê<input class="inp" id="eT" placeholder="ex.: Prova da UNIFESP"></label><label class="f" style="grid-column:1/-1">Detalhe<input class="inp" id="eD"></label><div class="acoes"><button class="btn pri">Adicionar</button></div></form>
      <p class="note">O dia ${estado.config.diaSalario} (salário), o fechamento e o vencimento da fatura, CRM, Nota Legal e IPVA entram sozinhos. Datas de vencimento do Nubank em Ajustes.</p>
    </section>
    ${Object.entries(por).map(([m, l]) => `<section class="card" style="--c:var(--sky)"><h2>${nomeMes(m)}</h2>${l.map((e) => diaHtml(e, h)).join("")}</section>`).join("")}
  </div>`;
  $("#fEv").onsubmit = (e) => { e.preventDefault(); const t = $("#eT").value.trim(), d = $("#eData").value; if (!t || !d) { toast("Preencha data e o quê"); return; } estado.eventos.push({ id: uid("e"), data: d, fim: $("#eFim").value || "", t, d: $("#eD").value.trim(), em: Date.now() }); salva(); redesenha(); toast("Data adicionada"); };
  $$("[data-tiraev]", el).forEach((b) => (b.onclick = () => { apaga("eventos", b.dataset.tiraev); salva(); redesenha(); }));
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
  const liq = (c) => c.pts * vm * (1 + bonus / 100) - c.custo;
  el.innerHTML = `
  <div class="grade g2">
    <section class="card destaque" style="--c:var(--violet)"><span class="rot">Pontos e milhas</span><div class="big">${Math.round(tot).toLocaleString("pt-BR")}</div>
      <div class="campos">${[["nubank", "Nubank (pontos)"], ["smiles", "Smiles"], ["latam", "LATAM Pass"], ["azul", "Azul Fidelidade"]].map(([k, n]) => `<label class="f" style="color:inherit">${n}<input class="inp n" data-k="milhas.saldos.${k}" data-num inputmode="numeric" value="${vIn(M.saldos[k])}" style="color:var(--ink)"></label>`).join("")}</div>
      <div class="kpis"><div class="kpi"><span class="rot">Por mês</span><b>${Math.round(ptsMes).toLocaleString("pt-BR")} pts</b></div><div class="kpi"><span class="rot">Por ano, com ${bonus}% de bônus</span><b>${Math.round(anoMilhas).toLocaleString("pt-BR")}</b></div><div class="kpi"><span class="rot">Trechos BSB–SSA</span><b>~${trechos.toFixed(1).replace(".", ",")}</b></div></div>
      <div class="campos"><label class="f" style="color:inherit">Gasto no cartão por mês<input class="inp n" data-k="config.gastoCartao" data-num inputmode="decimal" value="${vIn(cfg.gastoCartao)}" placeholder="${vIn(gasto)}" style="color:var(--ink)"></label><label class="f" style="color:inherit">Dólar (R$)<input class="inp n" data-k="config.dolar" data-num inputmode="decimal" value="${vIn(cfg.dolar)}" style="color:var(--ink)"></label><label class="f" style="color:inherit">Bônus típico (%)<input class="inp n" data-k="config.bonusTipico" data-num inputmode="decimal" value="${vIn(bonus)}" style="color:var(--ink)"></label><label class="f" style="color:inherit">Milhas por trecho<input class="inp n" data-k="config.trechoMilhas" data-num inputmode="numeric" value="${vIn(cfg.trechoMilhas)}" style="color:var(--ink)"></label></div>
    </section>
    <section class="card" style="--c:var(--cyan)"><h2>Essa passagem vale em milhas?</h2>
      <div class="campos"><label class="f">Preço em dinheiro (R$)<input class="inp n" data-calc="preco" inputmode="decimal" value="${vIn(calc.preco)}"></label><label class="f">Taxas em milhas (R$)<input class="inp n" data-calc="taxas" inputmode="decimal" value="${vIn(calc.taxas)}"></label><label class="f">Milhas pedidas<input class="inp n" data-calc="milhas" inputmode="numeric" value="${vIn(calc.milhas)}"></label></div>
      ${mc ? `<div class="alerta ${mc.veredito === "boa" ? "ok" : mc.veredito === "dinheiro" ? "bad" : "warn"}"><div><b class="med">R$ ${mc.v.toFixed(2).replace(".", ",")} o milheiro</b><br>${mc.veredito === "boa" ? "Boa troca: emita com milhas." : mc.veredito === "dinheiro" ? "Pague em dinheiro e guarde as milhas." : "Depende: vale se as milhas estão paradas ou perto de vencer."}</div></div>` : ""}
      <p class="note">(preço − taxas) ÷ milhas × 1.000. Acima de R$ 20 é boa troca; abaixo de R$ 15, pague em dinheiro.</p>
    </section>
    <section class="card" style="--c:var(--orange)"><h2>Promoções de transferência</h2>
      <ul class="lista">${(M.promocoes || []).map((p) => `<li><span class="cresce"><b>${esc(p.prog)}</b> ${p.bonus ? `+${p.bonus}%` : ""}${p.obs ? ` · <span class="note">${esc(p.obs)}</span>` : ""}</span><span class="note">${p.ate ? "até " + diaMes(p.ate) : ""}</span>${p.ate ? `<a class="btn sm" href="${gcal("Transferir pontos: " + p.prog, p.ate, "", "Inscrever-se na promoção antes de transferir.")}" target="_blank" rel="noopener">Agenda</a>` : ""}<button class="btn sm x" data-tirapromo="${p.id}" aria-label="Apagar">✕</button></li>`).join("") || `<li class="note">Nenhuma anotada. Já houve até 110–130% na Azul, 70% na Smiles e 25% na LATAM.</li>`}</ul>
      <form id="fPromo" class="campos"><label class="f">Programa<select class="inp" id="pProg"><option>Azul Fidelidade</option><option>Smiles</option><option>LATAM Pass</option><option>Livelo</option></select></label><label class="f">Bônus (%)<input class="inp n" id="pBonus" inputmode="numeric"></label><label class="f">Até<input class="inp" type="date" id="pAte"></label><label class="f">Obs.<input class="inp" id="pObs" placeholder="clube no mês"></label><div class="acoes"><button class="btn pri">Anotar</button></div></form>
    </section>
    <section class="card" style="--c:var(--indigo)"><h2>Ultravioleta ou Croma?</h2>
      <div class="rolar"><table><thead><tr><th></th><th class="n">Ultravioleta</th><th class="n">Croma</th></tr></thead><tbody>
        <tr><td>Pontos por ano</td><td class="n">${Math.round(uv.pts).toLocaleString("pt-BR")}</td><td class="n">${Math.round(cr.pts).toLocaleString("pt-BR")}</td></tr>
        <tr><td>Mensalidade por ano</td><td class="n">${brl(uv.custo)}</td><td class="n">${brl(cr.custo)}</td></tr>
        <tr><td>Saldo (milhas com bônus a R$ ${cfg.milheiroRef}/mil − mensalidade)</td><td class="n"><b>${brl(liq(uv))}</b></td><td class="n"><b>${brl(liq(cr))}</b></td></tr></tbody></table></div>
      <p class="note">Com ${brl(gasto)} por mês no cartão. O Ultravioleta zera com R$ 8 mil na fatura ou R$ 50 mil guardados no Nubank; o Croma, com R$ 4 mil. Sala VIP (4 por ano) e IOF zero só no Ultravioleta.</p>
    </section>
    <section class="card liso"><h2>Regras das milhas</h2><ul style="margin:0;padding-left:18px;display:grid;gap:4px">
      <li>No app do Nubank, escolher <b>pontos</b>, não cashback. Os pontos não vencem.</li>
      <li>Só transferir com bônus, e inscrever-se na promoção <b>antes</b>.</li>
      <li>Clube só no mês da transferência. Milhas de bônus vencem em 6 a 12 meses: transfira só o da próxima viagem.</li>
      <li>Passagem sempre com milhas e à vista, nunca parcelada.</li>
      <li>Priority Pass: 4 acessos por ano, VIP Club do embarque doméstico de Brasília (24h).</li></ul></section>
  </div>`;
  ligaCampos(el);
  $$("[data-calc]", el).forEach((i) => (i.onchange = () => { M.calc = Object.assign({}, calc, { [i.dataset.calc]: numero(i.value) }); salva(); redesenha(); }));
  $("#fPromo").onsubmit = (e) => { e.preventDefault(); M.promocoes = M.promocoes || []; M.promocoes.push({ id: uid("pr"), prog: $("#pProg").value, bonus: numero($("#pBonus").value), ate: $("#pAte").value, obs: $("#pObs").value.trim() }); salva(); redesenha(); };
  $$("[data-tirapromo]", el).forEach((b) => (b.onclick = () => { M.promocoes = M.promocoes.filter((p) => p.id !== b.dataset.tirapromo); salva(); redesenha(); }));
}

// ---------- Ajustes ----------
function telaAjustes(el, h) {
  const cfg = estado.config, cop = (lsGet(LS.copias, []) || []).slice().reverse();
  const venc = Object.entries(cfg.vencimentos || {}).sort().map(([, d]) => d).join(", ");
  el.innerHTML = `
  <div class="grade g2">
    <section class="card" style="--c:var(--green)"><h2>Onde ficam os dados</h2>
      <p>${nuvem.modo === "claude" ? "<b>Nuvem do artefato no Claude</b>: o mesmo plano aparece em qualquer aparelho em que você abrir este painel, logado na sua conta." : nuvem.modo === "github" ? `<b>GitHub</b>: arquivo ${esc(gh.arquivo || "minhas-financas.json")} no repositório privado ${esc(gh.repo)}.` : "<b>Só neste aparelho.</b> Ligue a nuvem do GitHub abaixo para não depender dele."}</p>
      <p class="note">Toda mudança também fica guardada neste aparelho, com cópias de segurança. ${nuvem.em ? `Última ida à nuvem: ${hhmm(nuvem.em)}.` : ""}</p>
      <details ${nuvem.modo === "claude" ? "" : "open"}><summary>GitHub (site instalado e Meu Plantão)</summary>
        <div class="campos" style="margin-top:8px">
          <label class="f">Repositório privado (dono/nome)<input class="inp" id="ghRepo" autocomplete="off" spellcheck="false" placeholder="usuario/plantao-modelos" value="${esc(gh.repo || "")}"></label>
          <label class="f">Arquivo das finanças<input class="inp" id="ghArq" spellcheck="false" value="${esc(gh.arquivo || "minhas-financas.json")}"></label>
          <label class="f">Plantões: repositório<input class="inp" id="ghPlRepo" spellcheck="false" placeholder="igual ao de cima" value="${esc(gh.plRepo || "")}"></label>
          <label class="f">Plantões: arquivo<input class="inp" id="ghPlArq" spellcheck="false" value="${esc(gh.plArquivo || "meus-padroes.json")}"></label>
          <label class="f" style="grid-column:1/-1">Chave do GitHub (leitura e escrita nesse repositório)<input class="inp" id="ghChave" type="password" autocomplete="off" placeholder="${gh.chave ? "guardada neste aparelho" : "github_pat_…"}"></label>
        </div>
        <div class="acoes" style="margin-top:8px"><button class="btn pri" id="ghLiga">Guardar e sincronizar</button>${gh.chave ? `<button class="btn perigo" id="ghDesliga">Esquecer a chave</button>` : ""}</div>
        <p class="note">Pode ser a mesma chave da nuvem do Meu Plantão. Ela fica só neste aparelho. ${nuvem.modo === "claude" ? "Dentro do Claude o GitHub não é alcançável: aqui use Renda → colar o backup." : ""}</p>
      </details>
    </section>
    <section class="card" style="--c:var(--slate)"><h2>Backup</h2>
      <p class="note">Copie para guardar ou para levar ao site instalado. A chave do GitHub não vai junto.</p>
      <div class="acoes"><button class="btn" id="bkCopia">Copiar backup</button><button class="btn" id="bkBaixa">Baixar arquivo</button></div>
      <textarea class="inp" id="bkTxt" placeholder="Cole aqui um backup do Minhas Finanças (ou o plano do painel antigo)"></textarea>
      <div class="acoes"><button class="btn pri" id="bkImporta">Importar backup</button></div>
      ${cop.length ? `<details><summary>Cópias de segurança deste aparelho (${cop.length})</summary><ul class="lista mini">${cop.map((c, i) => `<li><span class="cresce">${new Date(c.em).toLocaleString("pt-BR")}</span><span class="note">${c.nTx} lançamentos</span><button class="btn sm" data-volta="${i}">Voltar a esta</button></li>`).join("")}</ul></details>` : ""}
    </section>
    <section class="card" style="--c:var(--indigo)"><h2>Datas e limites</h2>
      <div class="campos">
        <label class="f">Dia do salário<input class="inp n" data-k="config.diaSalario" data-num inputmode="numeric" value="${cfg.diaSalario}"></label>
        <label class="f">Mesada por semana (R$)<input class="inp n" data-k="config.mesadaSemanal" data-num inputmode="decimal" value="${vIn(cfg.mesadaSemanal)}"></label>
        <label class="f">Teto compras online (R$)<input class="inp n" data-k="config.tetoOnline" data-num inputmode="decimal" value="${vIn(cfg.tetoOnline)}"></label>
        <label class="f">Teto delivery (R$)<input class="inp n" data-k="config.tetoDelivery" data-num inputmode="decimal" value="${vIn(cfg.tetoDelivery)}"></label>
        <label class="f">Vencimento padrão da fatura<input class="inp n" data-k="config.diaVencimento" data-num inputmode="numeric" value="${cfg.diaVencimento}"></label>
        <label class="f">Fecha quantos dias antes<input class="inp n" data-k="config.diasFechamento" data-num inputmode="numeric" value="${cfg.diasFechamento}"></label>
        <label class="f">Sem parcela nova desde<input class="inp" type="date" data-k="config.regraDesde" value="${esc(cfg.regraDesde)}"></label>
        <label class="chk"><input type="checkbox" data-k="config.bbAtivo" ${cfg.bbAtivo ? "checked" : ""}> Ourocard (BB) ainda ativo</label>
        <label class="f" style="grid-column:1/-1">Vencimentos do Nubank já conhecidos (AAAA-MM-DD, separados por vírgula)<input class="inp" id="vencs" value="${esc(venc)}"></label>
      </div></section>
    <section class="card" style="--c:var(--orange)"><h2>Regras de categoria</h2>
      <div class="campos">
        <label class="f" style="grid-column:1/-1">Meu nome nos extratos (transferência para mim mesmo fica de fora)<input class="inp" data-k="config.meuNome" value="${esc(cfg.meuNome)}"></label>
        <label class="f" style="grid-column:1/-1">Fazenda: palavras que tiram o lançamento das contas<input class="inp" data-k="config.palavrasFazenda" data-lista value="${esc((cfg.palavrasFazenda || []).join(", "))}"></label>
        <label class="f" style="grid-column:1/-1">Quem paga minha renda (entrada vira renda)<input class="inp" data-k="config.fontesRenda" data-lista value="${esc((cfg.fontesRenda || []).join(", "))}"></label>
        <label class="f" style="grid-column:1/-1">Amigos com quem divido contas<input class="inp" data-k="config.pessoasDividem" data-lista value="${esc((cfg.pessoasDividem || []).join(", "))}"></label>
      </div>
      <ul class="lista mini">${(cfg.regras || []).map((r, i) => `<li><span class="cresce">"${esc(r.t)}" → ${esc((CATS[r.cat] || {}).n || r.cat)}</span><button class="btn sm x" data-tiraregra="${i}" aria-label="Apagar regra">✕</button></li>`).join("")}</ul>
      <form id="fRegra" class="acoes"><input class="inp" id="rgT" placeholder="Texto na descrição" aria-label="Texto" style="flex:1 1 140px"><select class="inp" id="rgC" aria-label="Categoria" style="flex:1 1 140px">${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.n}</option>`).join("")}</select><button class="btn">Criar regra</button></form>
    </section>
  </div>`;
  ligaCampos(el);
  $("#vencs").onchange = (e) => { const v = {}; e.target.value.split(/[,;\s]+/).forEach((d) => { if (/^\d{4}-\d\d-\d\d$/.test(d)) v[d.slice(0, 7)] = d; }); cfg.vencimentos = v; salva(); redesenha(); };
  $("#ghLiga").onclick = async () => {
    const repo = $("#ghRepo").value.trim(), ch = $("#ghChave").value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { toast("Repositório no formato dono/nome"); return; }
    gh = Object.assign({}, gh, { repo, arquivo: $("#ghArq").value.trim() || "minhas-financas.json", plRepo: $("#ghPlRepo").value.trim(), plArquivo: $("#ghPlArq").value.trim() || "meus-padroes.json" });
    if (ch) gh.chave = ch;
    lsSet(LS.gh, gh);
    if (nuvem.modo !== "claude" && gh.chave) { nuvem.modo = "github"; pend.est = true; await sincroniza(); }
    redesenha(); toast(nuvem.erro || "Guardado");
  };
  const gd = $("#ghDesliga"); if (gd) gd.onclick = () => { delete gh.chave; lsSet(LS.gh, gh); if (nuvem.modo === "github") nuvem.modo = "local"; redesenha(); toast("Chave apagada deste aparelho; os dados continuam aqui"); };
  const bk = () => JSON.stringify({ app: "minhas-financas", v: 1, exportadoEm: new Date().toISOString(), estado, tx: txs });
  $("#bkCopia").onclick = (e) => copia(bk(), e.currentTarget);
  $("#bkBaixa").onclick = async () => {
    const nome = `minhas-financas-${h}.json`;
    try { const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; if (dl) { await dl.save({ filename: nome, data: bk() }); return; } } catch (e) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bk()], { type: "application/json" })); a.download = nome; a.click();
  };
  $("#bkImporta").onclick = () => {
    let d; try { d = JSON.parse($("#bkTxt").value); } catch (e) { toast("Não é um backup válido"); return; }
    const antes = { estado, txs };
    if (d && d.app === "minhas-financas" && d.estado) { estado = migra(d.estado); txs = juntaTx(txs, d.tx || {}); }
    else if (d && Array.isArray(d.itens)) { estado = migra(deAntigo(d)); }
    else { toast("Formato desconhecido"); return; }
    salva(Object.keys(txs)); redesenha();
    toast("Backup importado", { rot: "Desfazer", fn: () => { estado = antes.estado; txs = antes.txs; salva(Object.keys(txs)); redesenha(); } });
  };
  $$("[data-volta]", el).forEach((b) => (b.onclick = () => { const c = cop[+b.dataset.volta]; const ant = estado; estado = migra(JSON.parse(JSON.stringify(c.estado))); salva(); redesenha(); toast("Cópia restaurada", { rot: "Desfazer", fn: () => { estado = ant; salva(); redesenha(); } }); }));
  $$("[data-tiraregra]", el).forEach((b) => (b.onclick = () => { cfg.regras.splice(+b.dataset.tiraregra, 1); salva(); redesenha(); }));
  $("#fRegra").onsubmit = (e) => { e.preventDefault(); const t = $("#rgT").value.trim(); if (!t) return; cfg.regras.push({ t, cat: $("#rgC").value }); salva(); redesenha(); };
}

// ---------- começo ----------
function telaBoasVindas() {
  $("#corpo").innerHTML = `<section class="card" style="--c:var(--green)"><h2>Bem-vindo ao Minhas Finanças</h2>
    <p>Orçamento do mês, caixinhas, renda dos plantões, extratos, raio-X, calendário e milhas num lugar só.</p>
    <p class="note">Para trazer o seu plano: cole um backup em Ajustes, ou ligue a nuvem do GitHub onde ele já está.</p>
    <div class="acoes"><button class="btn pri" id="bvZero">Começar do zero</button><button class="btn" id="bvAjustes">Ir para Ajustes</button></div></section>`;
  $("#bvZero").onclick = () => { estado = ESTADO_PADRAO(); salva(); vaiPara("orcamento"); };
  $("#bvAjustes").onclick = () => { estado = ESTADO_PADRAO(); estado.em = 0; lsSet(LS.est, estado); vaiPara("ajustes"); };
}
async function inicia() {
  const hs = location.hash.slice(1); if (ABAS.some((a) => a[0] === hs)) ui.aba = hs;
  window.addEventListener("hashchange", () => { const k = location.hash.slice(1); if (k && k !== ui.aba && ABAS.some((a) => a[0] === k)) { ui.aba = k; redesenha(); } });
  if (estado) { estado = migra(estado); redesenha(); }
  else { $("#selo").textContent = "Procurando seu plano…"; }
  await iniciaNuvem();
  if (!estado) { telaBoasVindas(); desenhaAbas(); mostraSelo(); }
  else redesenha();
  if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude|claudeusercontent/.test(location.hostname) && window.MF_SITE) navigator.serviceWorker.register("sw.js").catch(() => {});
}
inicia();
