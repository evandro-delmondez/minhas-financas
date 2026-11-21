const test = require("node:test"), assert = require("node:assert/strict");
const N = require("../src/js/nucleo.js");

test("números em pt-BR e en", () => {
  assert.equal(N.numero("1.234,56"), 1234.56);
  assert.equal(N.numero("-50,00"), -50);
  assert.equal(N.numero("1234.5"), 1234.5);
  assert.equal(N.numero("R$ 2.136"), 2136);
  assert.equal(N.numero("-1,234.56"), -1234.56);
});

test("fatura Nubank: vírgula decimal entre aspas, parcela e mês pelo nome do arquivo", () => {
  const csv = 'date,title,amount\n2026-11-20,Curem - Parcela 6/12,"132,50"\n2026-11-21,Tiktok Shop,"89,90"\n2026-11-25,Pagamento recebido,"-4.000,00"\n2026-11-26,Ifood,"55,00"\n';
  const r = N.importarCSV(csv, "Nubank_2026-12-28.csv");
  assert.equal(r.origem, "nu-fatura");
  assert.equal(r.itens.length, 4);
  assert.equal(r.itens[0].comp, "2026-12");
  assert.deepEqual(r.itens[0].parc, { k: 6, n: 12 });
  assert.equal(r.itens[2].valor, -4000);
  const cats = r.itens.map((t) => N.categorizar(t, {}));
  assert.deepEqual(cats, ["estudo", "online", "ignorar", "delivery"]);
  // reimportar não muda os ids
  assert.deepEqual(N.importarCSV(csv, "Nubank_2026-12-28.csv").itens.map((t) => t.id), r.itens.map((t) => t.id));
});

test("conta Nubank: ponto decimal, saída vira gasto, fazenda e transferência própria ficam de fora", () => {
  const csv = "Data,Valor,Identificador,Descrição\n01/11/2026,-220.00,a1,Transferência enviada pelo Pix - VILANI SOUZA - •••\n02/11/2026,5000.00,a2,Transferência recebida pelo Pix - HOSPITAL SANTA LUCIA SA\n03/11/2026,-35.50,a3,Compra no débito - BAR DO ZE\n04/11/2026,1200.00,a4,Transferência recebida pelo Pix - ACOUGUE BOI GORDO\n05/11/2026,-300.00,a5,Transferência enviada pelo Pix - EVANDRO DELMONDEZ OLIVEIRA - BB\n06/11/2026,-1000.00,a6,Aplicação RDB\n";
  const r = N.importarCSV(csv, "NU_1.csv");
  assert.equal(r.origem, "nu-conta");
  assert.equal(r.itens[0].valor, 220);
  const cfg = { regras: [{ t: "vilani", cat: "casa" }], palavrasFazenda: ["açougue"], meuNome: "Evandro Delmondez", fontesRenda: ["Santa Lucia"] };
  assert.deepEqual(r.itens.map((t) => N.categorizar(t, cfg)), ["casa", "renda", "restaurante", "ignorar", "ignorar", "ignorar"]);
});

test("conta BB em latin1: ignora linhas de saldo e usa o tipo do lançamento", () => {
  const csv = '"Data","Lançamento","Detalhes","N° documento","Valor","Tipo Lançamento"\n"01/11/2026","Saldo Anterior","","","100,00",""\n"03/11/2026","Pagamento de Boleto","CAESB","123","227,00","Saída"\n"05/11/2026","Tarifa SMS","","","5,00","Saída"\n"05/11/2026","Saldo do dia","","","0,00",""\n"10/11/2026","Juros Cheque Especial","","","3,10","Saída"\n';
  const r = N.importarCSV(csv);
  assert.equal(r.origem, "bb-conta");
  assert.equal(r.itens.length, 3);
  assert.equal(r.itens[0].valor, 227);
  assert.deepEqual(r.itens.map((t) => N.categorizar(t, {})), ["casa", "juros", "juros"]);
  const tx = r.itens.map((t) => ({ ...t, cat: N.categorizar(t, {}) }));
  const al = N.alertas({ tx, cfg: {}, hoje: "2026-11-21" }).map((a) => a.t).join(" | ");
  assert.match(al, /Cheque especial/); assert.match(al, /SMS/); assert.match(al, /Água em R\$/);
});

test("escada de parcelas projeta as que faltam", () => {
  const tx = [{ origem: "nu-fatura", desc: "Curem - Parcela 6/12", valor: 132.5, comp: "2026-12", data: "2026-11-20", parc: { k: 6, n: 12 } },
    { origem: "nu-fatura", desc: "Curem - Parcela 5/12", valor: 132.5, comp: "2026-11", data: "2026-10-20", parc: { k: 5, n: 12 } }];
  const e = N.escadaParcelas(tx, "2026-12");
  assert.equal(Object.keys(e.escada).length, 7); // dez a jun
  assert.equal(e.escada["2027-06"], 132.5);
  assert.equal(e.compras[0].fim, "2027-06");
});

test("Meu Plantão: só fichas contadas viram dinheiro; marcado e sobreaviso valem zero", () => {
  const P = { escala: [{ data: "2026-11-03", turno: "N", local: "hsls" }, { data: "2026-11-28", turno: "D", local: "hsls" }, { data: "2026-11-29", turno: "N", local: "hsls", sobre: true }],
    contagem: { "2026-11-03N": { n: 18, uti: 1 } }, locais: { hsls: { nome: "Santa Lúcia", tipo: "porAlta", porAlta: 50, porUti: 150 } }, pagos: {} };
  const pl = N.plantoesDoMes(P, "2026-11", N.EST_PADRAO, "2026-11-21");
  assert.deepEqual(pl.map((p) => [p.status, p.min, p.max]), [["contado", 1050, 1050], ["marcado", 0, 0], ["sobreaviso", 0, 0]]);
  const r = N.rendaDoMes({ plantaoCache: { plantoes: P }, rendas: [{ ref: "2026-11", tipo: "plantao", min: 999 }, { ref: "2026-11", tipo: "extra", min: 250 }], config: {} }, "2026-11", "2026-11-21");
  assert.equal(r.min, 1050 + 250); // confirmado: só o contado e o extra; o manual sai quando há escala
  assert.equal(r.max, 1050 + 250); // sem estimativa nenhuma: plantão sem fichas vale zero
  assert.equal(r.recebe, "2026-12-20");
});

test("plano do brief: renda de novembro é só o confirmado (R$ 11.150) e a meta é projetada", () => {
  const fs = require("node:fs"), p = __dirname + "/../dados/semente-estado.json";
  if (!fs.existsSync(p)) return;
  const e = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.equal(N.totaisOrc(e.orcamentos["2026-12"]).total, 13650);
  const r = N.rendaDoMes(e, "2026-11", "2026-11-21"); assert.equal(r.min, 11150); assert.equal(r.max, 11150); // só o confirmado
  const jan = N.orcamentoDe(e, "2027-01");
  assert.ok(!jan.itens.some((i) => /Presentes|Convictus/.test(i.n)), "presentes e cabine saem em janeiro");
  const pm = N.projetaMeta(e, "2026-11-21", 60);
  assert.ok(pm.marcos.every((m) => m.ym), JSON.stringify(pm.marcos));
});

test("junção de dois aparelhos não perde movimentos nem transações", () => {
  const a = { em: 2, movimentos: [{ id: "m1", valor: 10 }], rendas: [], apagados: [] }, b = { em: 1, movimentos: [{ id: "m2", valor: 20 }], rendas: [], apagados: [] };
  assert.deepEqual(N.juntaEstado(a, b).movimentos.map((m) => m.id).sort(), ["m1", "m2"]);
  const c = { em: 3, movimentos: [{ id: "m1" }], apagados: ["m2"] };
  assert.deepEqual(N.juntaEstado(c, b).movimentos.map((m) => m.id), ["m1"]);
  const t = N.juntaTx({ "2026-11": [{ id: "x", data: "2026-11-01" }] }, { "2026-11": [{ id: "y", data: "2026-11-02" }], "2026-10": [{ id: "z", data: "2026-10-02" }] });
  assert.equal(t["2026-11"].length, 2); assert.equal(t["2026-10"].length, 1);
});

test("milheiro e mesada", () => {
  assert.equal(N.milheiro(780, 40, 14000).veredito, "boa");
  assert.equal(N.milheiro(300, 40, 20000).veredito, "dinheiro");
  const m = N.mesada({ config: { mesadaSemanal: 350 }, gastosSemana: [{ data: "2026-11-23", valor: 100 }, { data: "2026-11-16", valor: 999 }] }, [], "2026-11-25");
  assert.equal(m.ini, "2026-11-23"); assert.equal(m.resta, 250);
});

test("meu número mínimo: fichas e plantões que faltam para o essencial e para o orçamento", () => {
  const P = { escala: ["2026-11-02", "2026-11-05", "2026-11-09", "2026-12-01"].map((d, i) => ({ data: d, turno: "N", local: "h" })), contagem: { "2026-11-02N": { n: 20, uti: 0 }, "2026-11-05N": { n: 20, uti: 0 }, "2026-11-09N": { n: 20, uti: 0 }, "2026-12-01N": { n: 10, uti: 0 } }, locais: { h: { tipo: "porAlta", porAlta: 50, porUti: 150 } } };
  const e = { config: { diaSalario: 20 }, plantaoCache: { plantoes: P }, rendas: [], orcamentos: { "2027-01": { itens: [{ n: "Mercado", g: "vida", v: 900 }, { n: "Total Pass", g: "fix", v: 300 }, { n: "Salvador", g: "vida", v: 600 }, { n: "Reserva", g: "cx", v: 1000 }] } } };
  const nm = N.numeroMinimo(e, "2026-12", "2026-12-05");
  assert.equal(nm.ganho, 500);
  assert.equal(nm.essencial.alvo, 1200); assert.equal(nm.essencial.falta, 700); assert.equal(nm.essencial.fichas, 14);
  assert.equal(nm.ideal.alvo, 2800); assert.equal(nm.ideal.falta, 2300);
  assert.equal(nm.ritmo.plantoes, 4); assert.equal(nm.essencial.plantoes, 1); // média 875 por plantão
});

test("OFX: conta e cartão, com parcela e mês da fatura pelo nome do arquivo", () => {
  const conta = "<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>0260</BANKID></BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261103000000[-3:BRT]<TRNAMT>-35.50<FITID>abc1<MEMO>Compra no débito - BAR DO ZE</STMTTRN><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261120<TRNAMT>5000.00<FITID>abc2<MEMO>Transferência recebida - SANTA LUCIA</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>";
  const r = N.importarOFX(conta, "extrato.ofx");
  assert.equal(r.origem, "nu-conta"); assert.equal(r.itens.length, 2);
  assert.equal(r.itens[0].data, "2026-11-03"); assert.equal(r.itens[0].valor, 35.5); assert.equal(r.itens[1].valor, -5000);
  const cartao = "<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><BANKTRANLIST><STMTTRN><DTPOSTED>20261120<TRNAMT>-132.50<FITID>x9<MEMO>Curem - Parcela 6/12</STMTTRN></BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>";
  const c = N.importarOFX(cartao, "Nubank_2026-12-28.ofx");
  assert.equal(c.origem, "nu-fatura"); assert.equal(c.itens[0].comp, "2026-12"); assert.deepEqual(c.itens[0].parc, { k: 6, n: 12 });
});

test("conferência: fixo pela última cobrança, variável pela média, IOF e parcela fora", () => {
  const tx = [["2026-09-03", "Totalpass", 299.9], ["2026-10-03", "Totalpass", 299.9], ["2026-11-03", "Totalpass", 299.9], ["2026-11-07", "IOF de Totalpass", 4],
    ["2026-09-10", "Pagamento Fatura de Água · CAESB", 83.44], ["2026-10-13", "Pagamento Fatura de Água · CAESB", 104.04], ["2026-11-10", "Pagamento Fatura de Água · CAESB", 226.92],
    ["2026-10-26", "Ig*Whitebook", 59.9], ["2026-11-26", "Ig*Whitebook", 59.9]].map(([data, desc, valor]) => ({ data, desc, valor, cat: "assinatura" }));
  const itens = [{ id: "a", n: "Total Pass", g: "fix", v: 300 }, { id: "b", n: "Água", g: "fix", v: 150 }, { id: "c", n: "Whitebook", g: "fix", v: 59.9 }, { id: "d", n: "Reserva", g: "cx", v: 1000 }];
  const cf = N.confereOrcamento(itens, tx, "2026-11-21");
  assert.deepEqual(cf.map((c) => [c.id, c.sugerido]), [["a", 299.9]]); // água: média 138 contra 150 fica dentro da margem de 10% das contas variáveis
});
