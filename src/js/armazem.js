/* ---------- Armazenamento à prova de falha ----------
   1) Toda mudança grava na hora neste aparelho (localStorage) e guarda uma cópia de segurança (últimas 10).
   2) Depois de 1,5 s sem mexer, envia para a nuvem: o banco do artefato (no Claude) ou um arquivo num
      repositório privado do GitHub (site instalado). As duas juntam sem perder: estado mais novo vence,
      transações e movimentos se unem por id.
   3) Selo "Salvo às HH:MM" e aviso ao sair com algo ainda não enviado.
   A chave do GitHub fica neste aparelho e vai junto no backup (não na nuvem: é ela que abre a nuvem).
   A chave da IA vai no próprio plano (estado.chaves), então viaja pela nuvem privada e pelo backup. */
const LS = { est: "mf_estado_v1", tx: "mf_tx_v1", copias: "mf_copias_v1", gh: "mf_gh_v1", pend: "mf_pend_v1", ui: "mf_ui_v1" };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

let estado = lsGet(LS.est, null);
let txs = lsGet(LS.tx, {}) || {};          // {"AAAA-MM": [transações]}
let pend = lsGet(LS.pend, { est: false, tx: [] }) || { est: false, tx: [] };
let gh = lsGet(LS.gh, {}) || {};           // {repo, chave, arquivo, plRepo, plArquivo}
const nuvem = { modo: "local", estado: "", em: 0, erro: "", db: null, rodando: false, deNovo: false, t: null, desligaSnap: null };
let salvoLocalEm = 0;

function guardaCopia() {
  const c = lsGet(LS.copias, []) || [];
  const ult = c[c.length - 1];
  if (ult && Date.now() - ult.em < 10 * 60e3) c.pop();   // no máximo uma cópia a cada 10 minutos
  c.push({ em: Date.now(), estado, nTx: Object.values(txs).reduce((a, l) => a + l.length, 0) });
  while (c.length > 10) c.shift();
  lsSet(LS.copias, c);
}
// chamada a cada mudança. mesesTx: meses de transações alterados
function salva(mesesTx) {
  estado.em = Date.now();
  const ok1 = lsSet(LS.est, estado), ok2 = mesesTx && mesesTx.length ? lsSet(LS.tx, txs) : true;
  if (ok1 && ok2) salvoLocalEm = Date.now();
  pend.est = true; if (mesesTx) pend.tx = [...new Set([...(pend.tx || []), ...mesesTx])];
  lsSet(LS.pend, pend);
  guardaCopia();
  agendaNuvem();
  mostraSelo();
}
const hhmm = (t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
function mostraSelo() {
  const el = document.getElementById("selo"); if (!el) return;
  let txt, cl;
  if (nuvem.modo === "local") { txt = salvoLocalEm ? `Salvo neste aparelho às ${hhmm(salvoLocalEm)}` : "Salvo neste aparelho"; cl = "pend"; }
  else if (nuvem.erro) { txt = nuvem.erro; cl = "erro"; }
  else if (pend.est || (pend.tx || []).length) { txt = nuvem.rodando ? "Salvando na nuvem…" : "Alterações a salvar…"; cl = "pend"; }
  else { txt = nuvem.em ? `Salvo às ${hhmm(nuvem.em)}` : "Salvo"; cl = "ok"; }
  el.textContent = txt; el.className = "selo " + cl;
  el.title = nuvem.modo === "claude" ? "Nuvem do artefato no Claude + cópia neste aparelho" : nuvem.modo === "github" ? `GitHub (${gh.repo}) + cópia neste aparelho` : "Só neste aparelho: ligue a nuvem em Ajustes";
}
function agendaNuvem() { if (nuvem.modo === "local") return; clearTimeout(nuvem.t); nuvem.t = setTimeout(sincroniza, 1500); }
window.addEventListener("beforeunload", (e) => { if (nuvem.modo !== "local" && (pend.est || (pend.tx || []).length)) { sincroniza(); e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && (pend.est || (pend.tx || []).length)) sincroniza(); if (document.visibilityState === "visible" && nuvem.modo === "github") sincroniza(); });
addEventListener("online", () => agendaNuvem());

// ---------- nuvem do artefato (Claude) ----------
const ehJson = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
async function claudeLe() {
  const db = nuvem.db, out = { estado: null, tx: {} };
  const d = await db.doc("fin/estado").get();
  if (d.exists) out.estado = ehJson(d.data().json);
  const q = await db.collection("tx").get();
  for (const doc of q.docs) { const v = ehJson(doc.data().json); if (Array.isArray(v)) out.tx[doc.id] = v; }
  return out;
}
async function claudeEscreve(meses) {
  const db = nuvem.db;
  for (const m of meses) await db.doc("tx/" + m).set({ json: JSON.stringify(txs[m] || []), em: Date.now() });
  await db.doc("fin/estado").set({ json: JSON.stringify(estado), em: estado.em || Date.now() });
}
// ---------- GitHub (site instalado) ----------
const ghHdr = (raw) => ({ Authorization: "Bearer " + gh.chave, Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json" });
const ghUrl = (repo, arq) => `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(arq)}`;
const b64 = (t) => { const a = new TextEncoder().encode(t); let s = ""; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
async function ghErro(r) { let m = ""; try { m = (await r.json()).message || ""; } catch (e) {} return new Error(`${r.status}${m ? ": " + m : ""}`); }
async function ghLeArquivo(repo, arq) {
  const r = await fetch(ghUrl(repo, arq), { cache: "no-store", headers: ghHdr() });
  if (r.status === 404) return { sha: null, d: null };
  if (!r.ok) throw await ghErro(r);
  const j = await r.json(); let txt = "";
  if (j.content) txt = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  else { const r2 = await fetch(ghUrl(repo, arq), { cache: "no-store", headers: ghHdr(true) }); if (!r2.ok) throw await ghErro(r2); txt = await r2.text(); } // acima de 1 MB
  return { sha: j.sha, d: ehJson(txt) };
}
async function ghEscreve(d, sha) {
  const r = await fetch(ghUrl(gh.repo, gh.arquivo || "minhas-financas.json"), { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, ghHdr()), body: JSON.stringify({ message: "minhas finanças", content: b64(JSON.stringify(d)), ...(sha ? { sha } : {}) }) });
  if (r.status === 409 || r.status === 422) { const e = await ghErro(r); if (r.status === 409 || /sha/i.test(e.message)) throw new Error("conflito"); throw e; }
  if (!r.ok) throw await ghErro(r);
}

// junta o que veio da nuvem; devolve true se mudou algo aqui
function juntaRemoto(rem) {
  let mudou = false;
  if (rem.estado && typeof rem.estado === "object") {
    const novo = juntaEstado(estado, rem.estado);
    if (JSON.stringify(novo) !== JSON.stringify(estado)) { estado = migra(novo); lsSet(LS.est, estado); mudou = true; }
  }
  if (rem.tx && Object.keys(rem.tx).length) {
    const j = juntaTx(txs, rem.tx);
    for (const m of Object.keys(j)) if (JSON.stringify(j[m]) !== JSON.stringify(rem.tx[m] || [])) pend.tx = [...new Set([...(pend.tx || []), m])];
    if (JSON.stringify(j) !== JSON.stringify(txs)) { txs = j; lsSet(LS.tx, txs); mudou = true; }
  }
  return mudou;
}
async function sincroniza() {
  if (nuvem.modo === "local") return;
  if (!estado) { // ainda sem plano neste aparelho: só traz o da nuvem
    try { const rem = nuvem.modo === "claude" ? await claudeLe() : await ghLeArquivo(gh.repo, gh.arquivo || "minhas-financas.json").then((r) => (r.d ? { estado: r.d.estado, tx: r.d.tx } : {})); if (rem && rem.estado) { estado = migra(rem.estado); txs = juntaTx(txs, rem.tx || {}); lsSet(LS.est, estado); lsSet(LS.tx, txs); nuvem.em = Date.now(); } } catch (e) { nuvem.erro = "Sem conexão com a nuvem"; }
    mostraSelo(); return;
  }
  if (nuvem.rodando) { nuvem.deNovo = true; return; }
  nuvem.rodando = true; mostraSelo();
  try {
    if (nuvem.modo === "claude") {
      const rem = await claudeLe();
      const antes = JSON.stringify(estado);
      if (juntaRemoto(rem)) redesenha();
      const remTxt = rem.estado ? JSON.stringify(rem.estado) : "";
      if (pend.est || remTxt !== JSON.stringify(estado) || antes !== JSON.stringify(estado)) {
        const meses = [...new Set([...(pend.tx || []), ...Object.keys(txs).filter((m) => !rem.tx[m])])];
        await claudeEscreve(meses);
      }
    } else {
      for (let t = 0; t < 2; t++) {
        const { sha, d } = await ghLeArquivo(gh.repo, gh.arquivo || "minhas-financas.json");
        if (d && juntaRemoto({ estado: d.estado, tx: d.tx })) redesenha();
        if (d && JSON.stringify(d.estado) === JSON.stringify(estado) && JSON.stringify(d.tx) === JSON.stringify(txs)) break;
        try { await ghEscreve({ app: "minhas-financas", v: 1, em: new Date().toISOString(), estado, tx: txs }, sha); break; }
        catch (e) { if (e.message !== "conflito" || t) throw e; }
      }
    }
    pend = { est: false, tx: [] }; lsSet(LS.pend, pend);
    nuvem.em = Date.now(); nuvem.erro = "";
  } catch (e) {
    const m = String((e && (e.message || e.code)) || e);
    nuvem.erro = /^40[13]/.test(m) ? "Chave do GitHub recusada" : /^404/.test(m) ? "Repositório não encontrado" : /quota/.test(m) ? "Nuvem cheia: apague extratos antigos" : "Sem conexão: salvo neste aparelho";
    console.warn("nuvem:", e);
  }
  nuvem.rodando = false; mostraSelo();
  if (nuvem.deNovo) { nuvem.deNovo = false; return sincroniza(); }
}
async function iniciaNuvem() {
  try {
    const db = window.claude && window.claude.use ? await window.claude.use("db") : null;
    if (db) {
      nuvem.db = db; nuvem.modo = "claude"; mostraSelo();
      await sincroniza();
      // outro aparelho mudou: traz (se não há nada pendente aqui)
      nuvem.desligaSnap = db.doc("fin/estado").onSnapshot((s) => {
        if (!s.exists || s.metadata.hasPendingWrites) return;
        const r = ehJson(s.data().json); if (!r || !estado || (r.em || 0) <= (estado.em || 0) || pend.est) return;
        if (juntaRemoto({ estado: r })) redesenha();
      }, () => {});
      return;
    }
  } catch (e) { console.warn(e); }
  if (gh.repo && gh.chave) { nuvem.modo = "github"; mostraSelo(); await sincroniza(); return; }
  nuvem.modo = "local"; mostraSelo();
}
// Meu Plantão: lê os plantões do arquivo de padrões no GitHub
async function lePlantoesGitHub() {
  const repo = gh.plRepo || gh.repo, arq = gh.plArquivo || "meus-padroes.json";
  if (!repo || !gh.chave) throw new Error("Preencha o repositório e a chave em Ajustes");
  const { d } = await ghLeArquivo(repo, arq);
  if (!d) throw new Error(`${arq} não encontrado em ${repo}`);
  return achaPlantoes(d);
}
// aceita o arquivo da nuvem do Meu Plantão, o backup copiado ou o próprio objeto de plantões
function achaPlantoes(d) {
  const P = d && (d.model && d.model.plantoes || d.plantoes || (Array.isArray(d.escala) ? d : null));
  if (!P || !Array.isArray(P.escala)) throw new Error("Não achei os plantões nesse conteúdo");
  return { escala: P.escala.map((x) => ({ id: x.id, data: x.data, turno: x.turno, local: x.local, sobre: !!x.sobre, manual: x.manual || null, fimT: x.fimT || 0 })), contagem: P.contagem || {}, locais: P.locais || {}, pagos: P.pagos || {}, meta: P.meta || 0 };
}
