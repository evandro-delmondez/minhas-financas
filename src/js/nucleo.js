/* ---------- Minhas Finanças: núcleo (contas, datas, CSV, categorias, projeções) ----------
   Sem DOM: roda no navegador e no Node (testes). Valores em reais, gasto positivo, entrada negativa. */

// ---------- datas e dinheiro ----------
const pad2 = (n) => String(n).padStart(2, "0");
const isoDia = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const mesDe = (iso) => String(iso).slice(0, 7);
const somaMes = (ym, n) => { const [a, m] = ym.split("-").map(Number); const d = new Date(a, m - 1 + n, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
const diasNoMes = (ym) => { const [a, m] = ym.split("-").map(Number); return new Date(a, m, 0).getDate(); };
const dataNoMes = (ym, dia) => `${ym}-${pad2(Math.min(dia, diasNoMes(ym)))}`;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_C = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (ym, curto) => { const [a, m] = ym.split("-").map(Number); return curto ? `${MESES_C[m - 1]}/${String(a).slice(2)}` : `${MESES[m - 1]} de ${a}`; };
const diaMes = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const brl = (v) => { const n = Number(v) || 0, c = Math.abs(n) < 1000 && Math.round(n * 100) % 100 !== 0 ? 2 : 0; return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: c, minimumFractionDigits: c }); };
const brl2 = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const faixa = (a, b) => (Math.round(a) === Math.round(b) ? brl(a) : `${brl(a)} a ${brl(b)}`);
// "1.234,56", "1234.56", "R$ -50,00", "-1,234.56" → número
function numero(s) {
  if (typeof s === "number") return s;
  let t = String(s == null ? "" : s).replace(/R\$|\s| /g, "").trim();
  if (!t) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/^-/.test(t)) { neg = true; t = t.slice(1); }
  if (/-$/.test(t)) { neg = true; t = t.slice(0, -1); }
  const v = t.lastIndexOf(","), p = t.lastIndexOf(".");
  if (v >= 0 && p >= 0) t = v > p ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (v >= 0) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // "2.136" digitado = dois mil
  const n = parseFloat(t);
  return isNaN(n) ? 0 : neg ? -n : n;
}
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const uid = (p = "i") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
// segunda-feira da semana de iso
function segundaDe(iso) { const d = new Date(iso + "T12:00:00"); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return isoDia(d); }
function somaDias(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoDia(d); }

// ---------- CSV ----------
function lerCSV(texto) {
  const t = String(texto || "").replace(/^﻿/, "");
  const prim = t.split(/\r?\n/)[0] || "";
  const sep = (prim.match(/;/g) || []).length > (prim.match(/,/g) || []).length ? ";" : ",";
  const linhas = []; let campo = "", linha = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += c; continue; }
    if (c === '"') q = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((x) => String(x).trim()));
}
const dataBR = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(String(s).trim()); if (!m) return null; const a = m[3].length === 2 ? "20" + m[3] : m[3]; return `${a}-${pad2(m[2])}-${pad2(m[1])}`; };
const dataISO = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim()); return m ? m[0] : dataBR(s); };
const PARC_RE = /(?:parcela\s*)?(\d{1,2})\s*\/\s*(\d{1,2})\s*$/i;
function parcelaDe(desc) {
  const m = /parcela\s*(\d{1,2})\s*\/\s*(\d{1,2})/i.exec(desc) || PARC_RE.exec(desc);
  if (!m) return null; const k = +m[1], n = +m[2];
  return k >= 1 && n >= 2 && k <= n && n <= 48 ? { k, n } : null;
}
const baseParcela = (desc) => semAcento(desc).replace(/\s*-?\s*parcela\s*\d+\s*\/\s*\d+/i, "").replace(/\s+\d{1,2}\s*\/\s*\d{1,2}\s*$/, "").trim();

// Identifica o arquivo pelo cabeçalho e devolve {origem, itens:[{id,data,desc,valor,origem,comp,parc}]}
// comp = mês de competência: o da fatura (cartão) ou o da data (conta)
function importarCSV(texto, nomeArquivo = "") {
  const L = lerCSV(texto); if (!L.length) return { origem: null, itens: [], erro: "Arquivo vazio" };
  const cab = L[0].map((c) => semAcento(c).trim());
  const tem = (...ns) => ns.every((n) => cab.includes(n));
  const itens = []; let origem;
  const push = (o, i) => { o.id = o.origem.slice(0, 2) + hash(`${o.origem}|${o.data}|${o.desc}|${o.valor.toFixed(2)}|${i}`); itens.push(o); };
  if (tem("date", "title", "amount")) {
    origem = "nu-fatura";
    const ci = cab.indexOf("date"), ct = cab.indexOf("title"), ca = cab.indexOf("amount");
    const fm = /(\d{4})-(\d{2})-(\d{2})/.exec(nomeArquivo);
    let comp = fm ? `${fm[1]}-${fm[2]}` : null;
    const rows = L.slice(1).map((r) => ({ data: dataISO(r[ci]), desc: String(r[ct] || "").trim(), valor: numero(r[ca]) })).filter((r) => r.data);
    if (!comp) { const max = rows.map((r) => r.data).sort().pop(); comp = max ? somaMes(mesDe(max), 1) : null; }
    const vistos = {};
    rows.forEach((r) => { const k = r.data + r.desc + r.valor; vistos[k] = (vistos[k] || 0) + 1; push({ data: r.data, desc: r.desc, valor: r.valor, origem, comp, parc: parcelaDe(r.desc) }, vistos[k]); });
  } else if (tem("data", "valor", "identificador")) {
    origem = "nu-conta";
    const cd = cab.indexOf("data"), cv = cab.indexOf("valor"), cid = cab.indexOf("identificador"), cs = cab.findIndex((c) => c.startsWith("descri"));
    L.slice(1).forEach((r, i) => { const data = dataBR(r[cd]); if (!data) return; const v = numero(r[cv]);
      const o = { data, desc: String(r[cs] || "").trim(), valor: -v, origem, comp: mesDe(data) };
      o.id = "nu" + hash(String(r[cid] || "") + "|" + data + "|" + v + "|" + (r[cid] ? "" : i)); itens.push(o); });
  } else if (cab.some((c) => c.startsWith("lancamento"))) {
    origem = "bb-conta";
    const cd = cab.indexOf("data"), cl = cab.findIndex((c) => c.startsWith("lancamento")), cdt = cab.indexOf("detalhes"), cv = cab.indexOf("valor"), ctp = cab.findIndex((c) => c.startsWith("tipo"));
    const doc = cab.findIndex((c) => c.startsWith("n") && c.includes("doc"));
    L.slice(1).forEach((r, i) => {
      const lanc = String(r[cl] || "").trim(), nl = semAcento(lanc);
      if (!lanc || /saldo anterior|saldo do dia|^s a l d o|^saldo$/.test(nl)) return;
      const data = dataBR(r[cd]); if (!data) return;
      let v = numero(r[cv]); const tp = semAcento(r[ctp] || "");
      const gasto = /saida|debito/.test(tp) ? Math.abs(v) : /entrada|credito/.test(tp) ? -Math.abs(v) : -v;
      const desc = [lanc, String(r[cdt] || "").trim()].filter(Boolean).join(" · ");
      push({ data, desc, valor: gasto, origem, comp: mesDe(data), doc: r[doc] || "" }, `${r[doc] || ""}|${i}`);
    });
  } else return { origem: null, itens: [], erro: "Não reconheci o formato (esperava fatura Nubank, conta Nubank ou conta BB)" };
  return { origem, itens };
}

// OFX (Nubank e bancos em geral): <STMTTRN> com DTPOSTED, TRNAMT, MEMO/NAME e FITID
function importarOFX(texto, nomeArquivo = "") {
  const t = String(texto || ""), itens = [];
  const cartao = /<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(t), banco = /<BANKID>\s*0*1\s*</i.test(t) ? "bb" : "nu";
  const origem = cartao ? (banco === "bb" ? "bb-fatura" : "nu-fatura") : banco === "bb" ? "bb-conta" : "nu-conta";
  const campo = (bloco, tag) => { const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(bloco); return m ? m[1].trim() : ""; };
  const fm = /(\d{4})-(\d{2})-(\d{2})/.exec(nomeArquivo);
  for (const bloco of t.split(/<STMTTRN>/i).slice(1)) {
    const d = campo(bloco, "DTPOSTED"), v = numero(campo(bloco, "TRNAMT")), desc = campo(bloco, "MEMO") || campo(bloco, "NAME"), id = campo(bloco, "FITID");
    if (!/^\d{8}/.test(d) || !desc) continue;
    const data = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const comp = cartao && fm ? `${fm[1]}-${fm[2]}` : mesDe(data);
    itens.push({ id: "of" + hash(`${origem}|${id || data + desc + v}`), data, desc, valor: -v, origem, comp, parc: parcelaDe(desc) });
  }
  return itens.length ? { origem, itens } : { origem: null, itens: [], erro: "Não achei lançamentos neste OFX" };
}

// ---------- categorias ----------
const CATS = {
  restaurante: { n: "Restaurantes e saídas", cor: "orange" },
  delivery: { n: "Delivery", cor: "red" },
  mercado: { n: "Mercado", cor: "green" },
  online: { n: "Compras online", cor: "pink" },
  roupas: { n: "Roupas e acessórios", cor: "violet" },
  estudo: { n: "Cursos e estudo", cor: "indigo" },
  provas: { n: "Provas, inscrições e CRM", cor: "sky" },
  viagem: { n: "Viagens", cor: "cyan" },
  transporte: { n: "Uber e transporte", cor: "teal" },
  carro: { n: "Combustível e carro", cor: "amber" },
  saude: { n: "Farmácia e saúde", cor: "rose" },
  assinatura: { n: "Assinaturas", cor: "lime" },
  casa: { n: "Casa: água, luz, diarista", cor: "slate" },
  cuidados: { n: "Barbeiro e cuidados", cor: "brown" },
  pet: { n: "Pet", cor: "olive" },
  pessoas: { n: "Pix e pagamentos a pessoas", cor: "plum" },
  presentes: { n: "Presentes", cor: "magenta" },
  juros: { n: "Juros e tarifas", cor: "bad" },
  outros: { n: "Outros", cor: "gray" },
  renda: { n: "Renda (plantões e extras)", cor: "ok" },
  reembolso: { n: "Reembolsos e devoluções", cor: "ok" },
  ignorar: { n: "Fora das contas", cor: "gray" },
};
const R = (s) => new RegExp(s, "i");
const REGRAS = [
  ["ignorar", "pagamento recebido|pagamento de fatura|pagamento fatura|pagto cartao|pgto cartao|pagamento cartao|pagamento de cartao|aplicacao rdb|resgate rdb|dinheiro guardado|dinheiro resgatado|caixinha|transferencia entre contas|bb rende facil|aplicacao poupanca|resgate poupanca|^estorno de pagamento"],
  ["juros", "juros|\\biof\\b|multa|encargo|tarifa|cheque especial|limite da conta|saldo devedor|rotativo|pacote de servicos|\\bsms\\b|anuidade|mensalidade ultravioleta|mensalidade do plano"],
  ["delivery", "ifood|ifd\\*|rappi|ze delivery|aiqfome|99food|keeta"],
  ["online", "tiktok|shopee|mercadolivre|mercado livre|aliexpress|shein|amazon(?! ?prime| ?music)|amzn|magalu|magazine luiza|temu|kabum"],
  ["assinatura", "total ?pass|whitebook|claude|anthropic|apple\\.com|apple one|itunes|spotify|netflix|youtube|google one|adobe|lightroom|chatgpt|openai|amazon prime|amazon music|prime video|disney|hbomax|max\\.com|deezer|careon|dashcam|icloud"],
  ["estudo", "curem|convictus|medgrupo|medcurso|medycorp|\\bipm\\b|mentoria|estrategia med|sanar|medcel|aristo|hotmart|eduzz|kiwify|livraria|udemy"],
  ["provas", "vunesp|uerj|pagar\\.me|pagarme|instituto americano|crm-?df|crm-?go|cremego|\\bcfm\\b|\\bapm\\b|amrigs|enare|fundep|ibfc|cebraspe|\\bfgv\\b|inscricao|residencia medica"],
  ["viagem", "gol linhas|gol\\*|\\bgol\\b|latam|azul linhas|azul\\*|smiles|decolar|booking|airbnb|hotel|pousada|123milhas|maxmilhas|hurb"],
  ["transporte", "uber|99 ?app|99pop|99 tecnologia|cabify|estacionamento|estapar|zona azul|metro-?df"],
  ["carro", "posto|combust|\\bshell\\b|ipiranga|petrobras|br mania|lava ?jato|auto ?center|oficina|pneu|detran|autopecas"],
  ["saude", "drogasil|raia|drogaria|farmac|pague menos|ultrafarma|laborat|clinica|consulta|odonto|sabin"],
  ["mercado", "supermerc|\\bmercado\\b(?! ?livre| ?pago)|atacad|assai|carrefour|big box|hortifruti|dona de casa|pao de acucar|comper|tatico|condor|super adega|\\bsuper\\b"],
  ["restaurante", "restaur|\\bbar\\b|lanchon|burger|pizza|churrasc|\\bcafe|padaria|sorvet|acai|outback|madero|coco bambu|starbucks|sushi|cervej|boteco|\\bpub\\b|lanches|bistro|cantina|steak|grill"],
  ["roupas", "renner|riachuelo|\\bc&a\\b|\\bzara\\b|centauro|netshoes|nike|adidas|havaianas|nature|calcad|roupa|\\bmoda\\b|hering|aramis|dd conjunto|upalphaco|shopping"],
  ["casa", "caesb|neoenergia|\\bceb\\b|\\benel\\b|condominio|diarista|\\bvivo\\b|\\bclaro\\b"],
  ["cuidados", "barbear|barbearia|salao|cabeleir|estetica|perfum|boticario|sephora"],
  ["pet", "\\bpet\\b|petz|cobasi|veterin|racao"],
  ["presentes", "presente|floricultura|flores"],
].map(([c, s]) => [c, R(s)]);
// Regras pessoais (config): {pessoasDividem:[], meuNome:"", palavrasFazenda:[], fontesRenda:[], regras:[{t, cat}]}
function categorizar(t, cfg = {}) {
  const d = semAcento(t.desc);
  for (const r of cfg.regras || []) if (r && r.t && d.includes(semAcento(r.t))) return r.cat;
  const fz = (cfg.palavrasFazenda || []).filter(Boolean);
  if (fz.some((p) => d.includes(semAcento(p)))) return "ignorar";
  const nome = semAcento(cfg.meuNome || "").trim();
  if (nome && d.includes(nome) && /transfer|pix|ted|doc/.test(d)) return "ignorar";
  if (t.valor < 0) {
    if ((cfg.fontesRenda || []).some((p) => p && d.includes(semAcento(p)))) return "renda";
    if (/estorno|devolu|reembols|cashback|credito de/.test(d)) return "reembolso";
    for (const [c, re] of REGRAS) if (c === "ignorar" && re.test(d)) return c;
    if (/transferencia recebida|pix recebido|recebido pelo pix|recebimento|credito pix|pix - recebido/.test(d)) return "reembolso";
    return "reembolso";
  }
  for (const [c, re] of REGRAS) if (re.test(d)) return c;
  if ((cfg.pessoasDividem || []).some((p) => p && d.includes(semAcento(p)))) return "pessoas";
  if (/transferencia enviada|pix enviado|pix - enviado|enviado pelo pix|pix transf|transferencia pix|mercado ?pago|mercadopago|picpay|pix no credito|pagamento efetuado/.test(d)) return "pessoas";
  return "outros";
}
const catDe = (t, cfg, ajustes) => (ajustes && ajustes[t.id] && ajustes[t.id].cat) || categorizar(t, cfg);

// ---------- raio-X ----------
// tx: [{...}] já com cat. Devolve por mês de competência e por categoria (só gastos, sem "ignorar"/"renda"/"reembolso")
const CAT_FORA = new Set(["ignorar", "renda", "reembolso"]);
function raioX(tx, opts = {}) {
  const porMes = {}, porCat = {}, itensCat = {};
  for (const t of tx) {
    if (CAT_FORA.has(t.cat)) continue;
    if (opts.desde && t.comp < opts.desde) continue;
    if (opts.ate && t.comp > opts.ate) continue;
    const m = t.comp; porMes[m] = porMes[m] || { total: 0, cartao: 0, fora: 0, cats: {} };
    porMes[m].total += t.valor; porMes[m][/fatura/.test(t.origem || "") ? "cartao" : "fora"] += t.valor;
    porMes[m].cats[t.cat] = (porMes[m].cats[t.cat] || 0) + t.valor;
    porCat[t.cat] = (porCat[t.cat] || 0) + t.valor;
    (itensCat[t.cat] = itensCat[t.cat] || []).push(t);
  }
  const meses = Object.keys(porMes).sort(), n = meses.length || 1;
  const media = Object.entries(porCat).map(([cat, v]) => ({ cat, total: v, media: v / n })).sort((a, b) => b.total - a.total);
  return { meses, porMes, media, n, itensCat, totalMedio: meses.reduce((a, m) => a + porMes[m].total, 0) / n };
}
// Parcelas futuras: de cada compra parcelada, a fatura mais recente vista projeta as que faltam
function escadaParcelas(tx, aPartirDe) {
  const ult = {};
  for (const t of tx) {
    if (!/fatura/.test(t.origem || "") || !t.parc || t.valor <= 0) continue;
    const k = baseParcela(t.desc) + "|" + t.valor.toFixed(2) + "|" + t.parc.n;
    const comp0 = somaMes(t.comp, -(t.parc.k - 1)); // fatura da 1ª parcela
    const key = k + "|" + comp0;
    if (!ult[key] || ult[key].parc.k < t.parc.k) ult[key] = t;
  }
  const escada = {}, compras = [];
  for (const t of Object.values(ult)) {
    const fim = somaMes(t.comp, t.parc.n - t.parc.k);
    compras.push({ desc: t.desc.replace(/\s*-?\s*parcela\s*\d+\s*\/\s*\d+/i, "").trim(), valor: t.valor, n: t.parc.n, fim });
    for (let i = 0; i <= t.parc.n - t.parc.k; i++) { const m = somaMes(t.comp, i); if (!aPartirDe || m >= aPartirDe) escada[m] = (escada[m] || 0) + t.valor; }
  }
  compras.sort((a, b) => b.fim.localeCompare(a.fim) || b.valor - a.valor);
  return { escada, compras: compras.filter((c) => !aPartirDe || c.fim >= aPartirDe) };
}
// Recorrentes: mesmo estabelecimento em 2+ meses, sem parcela
const chaveLoja = (desc) => semAcento(desc).replace(/\d+/g, "").replace(/[^a-z ]/g, " ").replace(/\b(compra no debito|pagamento|transferencia|enviada|pelo pix)\b/g, "").replace(/\s+/g, " ").trim().slice(0, 28);
function recorrentes(tx) {
  const g = {};
  for (const t of tx) {
    if (t.parc || t.valor <= 0 || CAT_FORA.has(t.cat) || t.cat === "pessoas" || t.cat === "mercado" || t.cat === "restaurante" || t.cat === "delivery" || t.cat === "carro") continue;
    const k = chaveLoja(t.desc); if (k.length < 3) continue;
    (g[k] = g[k] || []).push(t);
  }
  return Object.entries(g).map(([k, ts]) => {
    const meses = [...new Set(ts.map((t) => t.comp))].sort();
    const ult = ts.sort((a, b) => a.data.localeCompare(b.data))[ts.length - 1];
    return { k, desc: ult.desc, valor: ult.valor, meses, cat: ult.cat, n: ts.length };
  }).filter((r) => r.meses.length >= 2 && r.n <= r.meses.length * 2).sort((a, b) => b.valor - a.valor);
}

// ---------- alertas ----------
function alertas({ tx, cfg, hoje }) {
  const out = [], mesAt = mesDe(hoje), mesAnt = somaMes(mesAt, -1);
  const doMes = (m) => tx.filter((t) => t.comp === m);
  const desde = cfg.regraDesde || "2026-11-21";
  const tik = tx.filter((t) => t.data >= somaDias(hoje, -45) && /tiktok/i.test(t.desc) && t.valor > 0);
  if (tik.length) out.push({ n: "warn", t: `TikTok Shop: ${tik.length} compra${tik.length > 1 ? "s" : ""} nos últimos 45 dias (${brl(tik.reduce((a, t) => a + t.valor, 0))})`, d: "Vale perguntar se cada uma era mesmo vontade sua ou impulso de feed. Somadas, viram uma passagem para Salvador." });
  for (const m of [mesAt, mesAnt]) {
    const ts = doMes(m); if (!ts.length) continue;
    const del = ts.filter((t) => t.cat === "delivery").reduce((a, t) => a + t.valor, 0);
    if (del > (cfg.tetoDelivery || 200)) out.push({ n: "warn", t: `Delivery em ${nomeMes(m, true)}: ${brl(del)}`, d: `A referência que você definiu é ${brl(cfg.tetoDelivery || 200)}. Se foi escolha, tudo bem: dá para compensar em outra parte do mês.` });
    const onl = ts.filter((t) => t.cat === "online").reduce((a, t) => a + t.valor, 0);
    if (onl > (cfg.tetoOnline || 200)) out.push({ n: "warn", t: `Compras online em ${nomeMes(m, true)}: ${brl(onl)}`, d: `A referência é ${brl(cfg.tetoOnline || 200)}. Esperar 48 horas antes de comprar ajuda a separar vontade de impulso.` });
  }
  const novas = tx.filter((t) => t.parc && t.parc.k === 1 && t.data >= desde && t.valor > 0);
  if (novas.length) out.push({ n: "warn", t: `Parcelamento novo: ${novas.map((t) => `${t.desc.replace(/\s*-?\s*parcela.*$/i, "")} (${t.parc.n}x ${brl(t.valor)})`).join(", ")}`, d: "Tudo bem parcelar quando cabe. O consultor mostra onde essa parcela entra nas próximas faturas e o que ajustar." });
  const che = tx.filter((t) => t.origem === "bb-conta" && t.data >= somaDias(hoje, -60) && /juros|iof|cheque especial|limite/i.test(semAcento(t.desc)) && t.valor > 0);
  if (che.length) out.push({ n: "bad", t: `Cheque especial no BB: ${brl(che.reduce((a, t) => a + t.valor, 0))} de juros e IOF nos últimos 60 dias`, d: "Mantenha a conta do BB no positivo ou encerre." });
  const sms = tx.filter((t) => t.data >= somaDias(hoje, -45) && /\bsms\b/i.test(semAcento(t.desc)) && t.valor > 0);
  if (sms.length) out.push({ n: "warn", t: `Tarifa de SMS ainda cobrada (${brl(sms[sms.length - 1].valor)})`, d: "Cancele no app do BB." });
  const jur = tx.filter((t) => t.data >= somaDias(hoje, -60) && t.origem === "nu-fatura" && /juros|multa|rotativo|encargo/i.test(semAcento(t.desc)) && t.valor > 0);
  if (jur.length) out.push({ n: "bad", t: `Juros ou multa no Nubank: ${brl(jur.reduce((a, t) => a + t.valor, 0))}`, d: "Fatura inteira, no débito automático." });
  const agua = tx.filter((t) => t.comp === mesAnt || t.comp === mesAt).filter((t) => /caesb/i.test(t.desc)).reduce((a, t) => Math.max(a, t.valor), 0);
  if (agua > 130) out.push({ n: "warn", t: `Água em ${brl(agua)} (normal: R$ 75 a 104)`, d: "Faça o teste de vazamento no hidrômetro antes de reclamar com a Caesb." });
  return out;
}

// ---------- renda: Meu Plantão + lançamentos ----------
const PL_TURNOS = { D: ["Diurno", 12], M: ["Matutino", 6], V: ["Vespertino", 6], N: ["Noturno", 12], N1: ["Noturno até 1h", 6], "18A": ["18 h", 18], "18B": ["18 h", 18], 24: ["24 h", 24], "24B": ["24 h", 24] };
const PL_NOITE = ["N", "N1", "18B", "24B"], PL_LONGO = ["24", "24B", "18A", "18B"];
const EST_PADRAO = { D: 1000, N: 1000, M: 800, V: 800, N1: 800, "18A": 1500, "18B": 1500, 24: 2000, "24B": 2000, sobreMin: 0, sobreMax: 600 };
// contagem de um plantão do Meu Plantão (mesma regra do app de plantões)
function plContagem(x, P) {
  const C = P.contagem || {};
  if (PL_LONGO.includes(x.turno)) { const a = C[x.data + "D"], b = C[x.data + "N"]; return a || b ? { n: ((a || {}).n || 0) + ((b || {}).n || 0), uti: ((a || {}).uti || 0) + ((b || {}).uti || 0) } : null; }
  if ((x.turno === "M" || x.turno === "V") && (P.escala || []).some((y) => y !== x && y.data === x.data && y.turno === (x.turno === "M" ? "V" : "M")))
    return C[x.data + x.turno] || (x.turno === "M" ? C[x.data + "D"] : null) || null;
  return C[x.data + (PL_NOITE.includes(x.turno) ? "N" : "D")] || null;
}
// plantões do mês trabalhado ym → [{data, turno, sobre, local, min, max, status}]
function plantoesDoMes(P, ym, est = EST_PADRAO, hojeIso) {
  if (!P || !Array.isArray(P.escala)) return [];
  const L = P.locais || {};
  return P.escala.filter((x) => x && String(x.data).startsWith(ym)).map((x) => {
    const loc = L[x.local] || {}; const nomeLocal = loc.nome || x.local || "";
    if (loc.ativo === false) return null;
    const turno = PL_TURNOS[x.turno] ? x.turno : "D";
    const rot = (x.sobre ? "Sobreaviso " : "") + PL_TURNOS[turno][0].toLowerCase();
    if (loc.tipo === "salario") return { data: x.data, rot, local: nomeLocal, min: 0, max: 0, status: "salário" };
    const c = x.manual || plContagem(x, P);
    const passou = x.data < hojeIso || +x.fimT;
    if (c && ((c.n || 0) + (c.uti || 0) > 0 || passou)) {
      const v = (c.n || 0) * (+loc.porAlta || 50) + (c.uti || 0) * (+loc.porUti || 150);
      return { data: x.data, rot, local: nomeLocal, min: v, max: v, status: "contado", n: c.n || 0, uti: c.uti || 0 };
    }
    // sem fichas contadas ainda: não é dinheiro. Paga R$ por ficha e por UTI, então não existe valor a estimar.
    if (x.sobre) return { data: x.data, rot, local: nomeLocal, min: 0, max: 0, status: passou ? "sem chamado" : "sobreaviso" };
    return { data: x.data, rot, local: nomeLocal, min: 0, max: 0, status: passou ? "sem fichas" : "marcado" };
  }).filter(Boolean).sort((a, b) => a.data.localeCompare(b.data));
}
// renda do mês trabalhado ym (recebida em diaSalario de ym+1)
function rendaDoMes(estado, ym, hojeIso) {
  const P = estado.plantaoCache && estado.plantaoCache.plantoes;
  const pls = P ? plantoesDoMes(P, ym, Object.assign({}, EST_PADRAO, (estado.config || {}).estimativas), hojeIso) : [];
  const usaPl = pls.length > 0;
  const lanc = (estado.rendas || []).filter((r) => r.ref === ym && !(usaPl && r.tipo === "plantao"));
  const min = pls.reduce((a, p) => a + p.min, 0) + lanc.reduce((a, r) => a + (+r.min || 0), 0);
  const max = pls.reduce((a, p) => a + p.max, 0) + lanc.reduce((a, r) => a + (+(r.max != null && r.max !== "" ? r.max : r.min) || 0), 0);
  const pago = P && P.pagos ? Object.entries(P.pagos).some(([k, v]) => k.startsWith(ym + "|") && v && v.ok) : false;
  return { ym, min, max, plantoes: pls, lanc, usaPl, pago, recebe: dataNoMes(somaMes(ym, 1), (estado.config || {}).diaSalario || 20) };
}

// ---------- orçamento ----------
const GRUPOS = { fix: { n: "Fixos", cor: "sky" }, vida: { n: "Estilo de vida", cor: "orange" }, cx: { n: "Caixinhas", cor: "green" } };
function totaisOrc(o) {
  const t = { fix: 0, vida: 0, cx: 0, total: 0 };
  for (const i of (o && o.itens) || []) { const v = +i.v || 0; t[GRUPOS[i.g] ? i.g : "fix"] += v; t.total += v; }
  return t;
}
function orcamentoDe(estado, ym) {
  const O = estado.orcamentos || {};
  if (O[ym]) return O[ym];
  const ant = Object.keys(O).filter((k) => k < ym).sort().pop();
  const base = ant ? O[ant] : { itens: estado.modeloItens || [] };
  return { renda: null, itens: base.itens.filter((i) => !i.ate || i.ate >= ym).filter((i) => !i.so || i.so === ym).map((i) => Object.assign({}, i)), novo: true };
}

// ---------- essencial × pausável e meu número mínimo ----------
const ESSENCIAL_RE = /mentoria|agua|luz|diarista|combust|manutenc|total ?pass|claude|whitebook|barbe|mensalidade|mercado|farmac|saude|prova|inscri/;
const ehEssencial = (i) => (i.ess != null ? !!i.ess : i.g !== "cx" && ESSENCIAL_RE.test(semAcento(i.n)));
function totaisEss(o) { const t = { ess: 0, pausavel: 0 }; for (const i of (o && o.itens) || []) t[ehEssencial(i) ? "ess" : "pausavel"] += +i.v || 0; return t; }
// ritmo: média por plantão com fichas contadas nos últimos 90 dias (sem sobreaviso)
function ritmo(estado, hojeIso) {
  const P = estado.plantaoCache && estado.plantaoCache.plantoes; if (!P) return null;
  const ini = somaDias(hojeIso, -90), ms = new Set(); for (let d = ini; d.slice(0, 7) <= hojeIso.slice(0, 7); d = somaDias(dataNoMes(d.slice(0, 7), 1), 32)) ms.add(d.slice(0, 7));
  const pl = [...ms].flatMap((m) => plantoesDoMes(P, m, EST_PADRAO, hojeIso)).filter((p) => p.status === "contado" && p.data >= ini && !/^sobreaviso/i.test(p.rot));
  if (pl.length < 3) return null;
  const v = pl.reduce((a, p) => a + p.min, 0), f = pl.reduce((a, p) => a + (p.n || 0) + (p.uti || 0), 0);
  return { plantoes: pl.length, mediaValor: v / pl.length, mediaFichas: f / pl.length };
}
// quanto preciso ganhar nos plantões de ymTrab (pagos em ymTrab+1) para cobrir o essencial e o orçamento inteiro
function numeroMinimo(estado, ymTrab, hojeIso) {
  const ymPag = somaMes(ymTrab, 1), o = orcamentoDe(estado, ymPag), te = totaisEss(o), ideal = totaisOrc(o).total;
  const r = rendaDoMes(estado, ymTrab, hojeIso), ganho = r.min, rt = ritmo(estado, hojeIso), valorFicha = 50;
  const falta = (alvo) => Math.max(0, alvo - ganho);
  const conta = (alvo) => ({ alvo, falta: falta(alvo), fichas: Math.ceil(falta(alvo) / valorFicha), plantoes: rt && rt.mediaValor ? Math.ceil(falta(alvo) / rt.mediaValor) : null });
  return { ymTrab, ymPag, recebe: r.recebe, ganho, marcados: r.plantoes.filter((p) => p.status === "marcado" || p.status === "sobreaviso").length, essencial: conta(te.ess), ideal: conta(ideal), ritmo: rt };
}

// ---------- conferência do orçamento com os extratos ----------
// fixo: vale a última cobrança; variável (água, luz, combustível, mercado...): a média dos últimos meses
const APELIDOS = [[/^agua/, ["caesb", "saneamento"]], [/^luz/, ["neoenergia", "energiaeletrica"]], [/claude/, ["anthropic"]], [/apple/, ["applecom", "apple.com"]], [/total ?pass/, ["totalpass"]], [/combust/, ["posto", "combust", "shell", "ipiranga", "petrobras"]], [/mentoria|ipm/, ["ipm"]]];
const VARIAVEL = /agua|luz|combust|mercado|farmac|saude|restaur|delivery|saida|compras|barbe/;
const compacto = (x) => semAcento(x).replace(/[^a-z0-9.]/g, "");
function confereOrcamento(itens, tx, hojeIso) {
  const desde = somaDias(hojeIso, -120), out = [];
  const recentes = tx.filter((t) => t.valor > 0 && t.data >= desde && !/\biof\b/i.test(semAcento(t.desc)) && t.cat !== "ignorar");
  for (const i of itens || []) {
    if (i.g === "cx" || !(+i.v > 0)) continue;
    const nome = semAcento(i.n), ap = APELIDOS.find(([re]) => re.test(nome));
    // categorias amplas (mercado, saídas, compras, farmácia...) não têm um nome único no extrato: ficam de fora
    if (VARIAVEL.test(nome) && !ap) continue;
    const chaves = ap ? ap[1] : nome.split(/\s+/).filter((w) => w.length >= 5 && !/^(conta|contas|plano|mensal|pessoal)$/.test(w)).slice(0, 2).map(compacto);
    if (!chaves.length) continue;
    const achados = recentes.filter((t) => { const d = compacto(t.desc); return chaves.some((k) => d.includes(compacto(k))) && !t.parc; });
    const porMes = {}; for (const t of achados) porMes[t.data.slice(0, 7)] = (porMes[t.data.slice(0, 7)] || 0) + t.valor;
    const meses = Object.keys(porMes).sort(); if (meses.length < 2) continue;
    const variavel = VARIAVEL.test(nome);
    const ult = meses.slice(-3), sug = variavel ? Math.round(ult.reduce((a, m) => a + porMes[m], 0) / ult.length) : Math.round(porMes[meses[meses.length - 1]] * 100) / 100;
    const dif = Math.abs(sug - +i.v);
    if (dif >= (variavel ? Math.max(10, +i.v * 0.1) : 0.05)) out.push({ id: i.id, n: i.n, atual: +i.v, sugerido: sug, variavel, base: variavel ? `média de ${ult.map((m) => nomeMes(m, true)).join(", ")}: ${ult.map((m) => brl(porMes[m])).join(" · ")}` : `última cobrança: ${brl2(porMes[meses[meses.length - 1]])} em ${nomeMes(meses[meses.length - 1], true)}` });
  }
  return out;
}

// ---------- caixinhas e meta ----------
const saldoCx = (estado, id, ate) => (estado.movimentos || []).filter((m) => m.cx === id && (!ate || m.data <= ate)).reduce((a, m) => a + (+m.valor || 0), 0);
// aporte previsto de cada caixinha no mês ym: o do orçamento do mês (se existe) ou o aporte padrão (a partir de aporteDesde)
function aportePrevisto(estado, cx, ym) {
  const o = (estado.orcamentos || {})[ym];
  if (o) return o.itens.filter((i) => i.cx === cx.id).reduce((a, i) => a + (+i.v || 0), 0);
  if (cx.aporteDesde && ym < cx.aporteDesde) return +cx.aporteAntes || 0;
  if (cx.aporteAte && ym > cx.aporteAte) return 0;
  return +cx.aporte || 0;
}
// projeção mês a mês do que está guardado (caixinhas que contam na meta), com rendimento mensal r (%)
function projetaMeta(estado, hojeIso, meses = 48) {
  const cfg = estado.config || {}, r = (+cfg.rendMes || 0) / 100;
  const cxs = (estado.caixinhas || []).filter((c) => c.naMeta);
  const reserva = (estado.caixinhas || []).find((c) => c.id === "reserva");
  let tot = cxs.reduce((a, c) => a + saldoCx(estado, c.id), 0), res = reserva ? saldoCx(estado, "reserva") : 0;
  const ini = { tot, res }, serie = [], mesAt = mesDe(hojeIso);
  // o depósito do mês corrente só entra se o dia do salário ainda não passou e ainda não foi distribuído
  const o0 = (estado.orcamentos || {})[mesAt];
  let ym = (+hojeIso.slice(8, 10) < (cfg.diaSalario || 20) && !(o0 && o0.distribuido)) ? mesAt : somaMes(mesAt, 1);
  for (let i = 0; i < meses; i++, ym = somaMes(ym, 1)) {
    tot = tot * (1 + r) + cxs.reduce((a, c) => a + aportePrevisto(estado, c, ym), 0);
    if (reserva) res = res * (1 + r) + aportePrevisto(estado, reserva, ym);
    serie.push({ ym, tot, res });
  }
  const custo = +cfg.custoMensal || 7000, metaG = +cfg.metaGuardado || 50000;
  const quando = (f) => { const s = serie.find(f); return s ? s.ym : null; };
  return {
    ini, serie, custo, metaG,
    marcos: [
      { n: "Reserva de 3 meses", alvo: 3 * custo, ym: ini.res >= 3 * custo ? "feito" : quando((s) => s.res >= 3 * custo), cor: "green" },
      { n: "Reserva de 6 meses", alvo: 6 * custo, ym: ini.res >= 6 * custo ? "feito" : quando((s) => s.res >= 6 * custo), cor: "sky" },
      { n: `${brl(metaG)} no Nubank (Ultravioleta grátis)`, alvo: metaG, ym: ini.tot >= metaG ? "feito" : quando((s) => s.tot >= metaG), cor: "violet" },
    ],
  };
}
// salário fixo: a caixinha Renda cobre a diferença entre o que entra e o salário
function suavizador(estado, hojeIso, meses = 6) {
  const cfg = estado.config || {}, sal = +cfg.salarioFixo || 0;
  let saldo = saldoCx(estado, "renda");
  const out = []; let ym = mesDe(hojeIso);
  for (let i = 0; i < meses; i++, ym = somaMes(ym, 1)) {
    const r = rendaDoMes(estado, somaMes(ym, -1), hojeIso);
    const sobra = r.min - sal; saldo += sobra;
    out.push({ ym, entra: r.min, entraMax: r.max, sal, sobra, saldo, recebe: r.recebe });
  }
  return out;
}

// ---------- mesada semanal ----------
function mesada(estado, tx, hojeIso) {
  const cfg = estado.config || {}, ini = segundaDe(hojeIso), fim = somaDias(ini, 6);
  const man = (estado.gastosSemana || []).filter((g) => g.data >= ini && g.data <= fim);
  const deb = tx.filter((t) => t.origem === "nu-conta" && t.valor > 0 && t.data >= ini && t.data <= fim && /compra no debito|debito/i.test(semAcento(t.desc)));
  const gasto = man.reduce((a, g) => a + (+g.valor || 0), 0) + deb.reduce((a, t) => a + t.valor, 0);
  const valor = +cfg.mesadaSemanal || 350, resta = valor - gasto, dias = diasEntre(hojeIso, fim) + 1;
  return { ini, fim, valor, gasto, resta, dias, porDia: resta / Math.max(1, dias), man, deb };
}

// ---------- calendário ----------
function gcal(titulo, ini, fim, det = "") {
  const a = ini.replace(/-/g, ""), b = somaDias(fim || ini, 1).replace(/-/g, "");
  return "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: titulo, dates: `${a}/${b}`, details: det || "Minhas Finanças", ctz: "America/Sao_Paulo" }).toString();
}
function eventos(estado, hojeIso, meses = 12) {
  const cfg = estado.config || {}, ev = [], m0 = mesDe(hojeIso);
  const venc = cfg.vencimentos || {}, fech = +cfg.diasFechamento || 9;
  for (let i = 0; i <= meses; i++) {
    const ym = somaMes(m0, i), ref = somaMes(ym, -1);
    const r = rendaDoMes(estado, ref, hojeIso);
    ev.push({ data: dataNoMes(ym, cfg.diaSalario || 20), t: `Salário: plantões de ${MESES[+ref.slice(5) - 1]}`, d: r.max ? `Previsto ${faixa(r.min, r.max)}. Primeiro paga a fatura, depois distribui nas caixinhas.` : "Primeiro paga a fatura, depois distribui nas caixinhas.", cor: "green", tipo: "salario" });
    const v = venc[ym] || dataNoMes(ym, +cfg.diaVencimento || 28);
    ev.push({ data: v, t: "Vencimento da fatura Nubank", d: (venc[ym] ? "" : "Data estimada. ") + "Débito automático.", cor: "violet", tipo: "fatura" });
    ev.push({ data: somaDias(v, -fech), t: "Fechamento da fatura Nubank", d: "Melhor dia de compra.", cor: "indigo", tipo: "fatura" });
    if (cfg.bbAtivo) ev.push({ data: dataNoMes(ym, 10), t: "Vencimento do Ourocard (BB)", d: "Decisão: parar de usar e cancelar.", cor: "amber", tipo: "fatura" });
  }
  const anos = [...new Set([m0.slice(0, 4), somaMes(m0, meses).slice(0, 4)])];
  for (const a of anos) {
    ev.push({ data: `${a}-01-02`, fim: `${a}-01-20`, t: "Nota Legal: indicações de créditos", d: "Resgatar em dinheiro (a partir de R$ 25) enquanto o carro não está no seu nome.", cor: "teal", tipo: "anual" });
    ev.push({ data: `${a}-01-31`, t: "CRM-DF: anuidade com 5% de desconto", d: "Confirmar o desconto de 80% para recém-formados.", cor: "sky", tipo: "anual" });
    ev.push({ data: `${a}-02-28`, t: "CRM-DF: anuidade com 3% de desconto", d: "", cor: "sky", tipo: "anual" });
    ev.push({ data: `${a}-03-31`, t: "CRM-DF: vencimento da anuidade", d: "Caixinha CRM.", cor: "sky", tipo: "anual" });
    ev.push({ data: `${a}-02-10`, t: "IPVA do Etios (paga a mãe)", d: "3% no DF, 10% de desconto à vista em fevereiro. Lembrar a mãe.", cor: "amber", tipo: "anual" });
  }
  for (const e of estado.eventos || []) ev.push({ data: e.data, fim: e.fim, t: e.t, d: e.d || "", cor: e.cor || "pink", tipo: "meu", id: e.id });
  for (const p of ((estado.milhas || {}).promocoes || [])) if (p.ate) ev.push({ data: p.ate, t: `Fim da promoção: ${p.prog} ${p.bonus ? p.bonus + "%" : ""}`.trim(), d: p.obs || "Inscreva-se antes de transferir.", cor: "orange", tipo: "milhas" });
  const lim = dataNoMes(somaMes(m0, meses), 31);
  return ev.filter((e) => (e.fim || e.data) >= hojeIso && e.data <= lim).sort((a, b) => a.data.localeCompare(b.data));
}

// ---------- milhas ----------
function milheiro(preco, taxas, milhas) {
  const m = +milhas || 0; if (!m) return null;
  const v = ((+preco || 0) - (+taxas || 0)) / m * 1000;
  return { v, veredito: v >= 20 ? "boa" : v < 15 ? "dinheiro" : "talvez" };
}

// ---------- junção (dois aparelhos) ----------
// transações: união por id (o lado com "em" maior vence no mesmo id)
function juntaTx(a = {}, b = {}) {
  const out = {};
  for (const m of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const mp = new Map();
    for (const t of [...(a[m] || []), ...(b[m] || [])]) { const x = mp.get(t.id); if (!x || (t.em || 0) > (x.em || 0)) mp.set(t.id, t); }
    out[m] = [...mp.values()].sort((x, y) => x.data.localeCompare(y.data));
  }
  return out;
}
// estado: vale o mais novo inteiro; listas com id (movimentos, rendas, gastos da semana, eventos) se unem, respeitando apagados
function juntaEstado(loc, rem) {
  if (!rem || typeof rem !== "object") return loc;
  if (!loc || typeof loc !== "object") return rem;
  const novo = (rem.em || 0) > (loc.em || 0) ? rem : loc, velho = novo === rem ? loc : rem;
  const r = JSON.parse(JSON.stringify(novo));
  const apag = new Set([...(loc.apagados || []), ...(rem.apagados || [])]);
  r.apagados = [...apag].slice(-500);
  for (const k of ["movimentos", "rendas", "gastosSemana", "eventos"]) {
    const ids = new Set((r[k] || []).map((x) => x.id));
    r[k] = (r[k] || []).concat((velho[k] || []).filter((x) => x && x.id && !ids.has(x.id))).filter((x) => !apag.has(x.id));
  }
  return r;
}

if (typeof module !== "undefined") module.exports = { confereOrcamento, importarOFX, numeroMinimo, ritmo, ehEssencial, totaisEss, numero, lerCSV, importarCSV, categorizar, catDe, CATS, raioX, escadaParcelas, recorrentes, alertas, plantoesDoMes, rendaDoMes, totaisOrc, orcamentoDe, saldoCx, aportePrevisto, projetaMeta, suavizador, mesada, eventos, milheiro, juntaTx, juntaEstado, somaMes, segundaDe, parcelaDe, dataNoMes, EST_PADRAO };
