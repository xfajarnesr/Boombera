// Regles i joc real del mòdul de memòria. L'oracle escriu la taula a part, cel·la per cel·la.
const assert = require('assert');
function categoria(d) { return [1, 4, 9].includes(d) ? 'q' : [2, 3, 5, 7].includes(d) ? 'p' : 'c'; }
function oracle(etapa, pantalla, ordre, h) {
  const gran = ordre.indexOf(Math.max(...ordre)); const petita = ordre.indexOf(Math.min(...ordre));
  switch (`${etapa}${categoria(pantalla)}`) {
    case '0q': return gran;
    case '0p': return petita;
    case '0c': return 1;
    case '1q': return ordre.indexOf(h[0].valor);
    case '1p': return h[0].posicio;
    case '1c': return petita;
    case '2q': return h[1].posicio;
    case '2p': return ordre.indexOf(h[0].valor);
    case '2c': return gran;
    case '3q': return ordre.indexOf(h[1].valor);
    case '3p': return h[2].posicio;
    case '3c': return (h[0].valor + h[1].valor + h[2].valor) % 2 === 0 ? gran : petita;
  }
}
const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
const combina = (n, k, d = 1) => (k === 0 ? [[]] : d > n ? [] : [...combina(n, k - 1, d + 1).map((r) => [d, ...r]), ...combina(n, k, d + 1)]);
function jugaTot(R, b) {
  const h = [];
  b.memoria.etapes.forEach((e, i) => {
    const pos = R.solucioMemoria(b, i, h);
    assert.strictEqual(pos, oracle(i, e.pantalla, e.ordre, h));
    assert(Number.isInteger(pos) && pos >= 0 && pos < 4, `posició ${pos}`);
    h.push({ valor: e.ordre[pos], posicio: pos });
  });
}
module.exports = {
  oracle,
  regles(R) {
    assert.deepStrictEqual([...Array(9)].map((_, i) => R.categoriaMemoria(i + 1)).join(), 'quadrat,primer,primer,quadrat,primer,cap,primer,cap,quadrat');
    let casos = 0;
    const totsOrdres = perms([1, 2, 3, 4]);
    const conjunts = combina(9, 4);
    const prova = (etapa, valors, h) => {
      for (const idx of totsOrdres) {
        const ordre = idx.map((i) => valors[i - 1]);
        for (let pantalla = 1; pantalla <= 9; pantalla++) {
          const etapes = []; etapes[etapa] = { pantalla, ordre };
          const pos = R.solucioMemoria({ memoria: { etapes } }, etapa, h);
          assert.strictEqual(pos, oracle(etapa, pantalla, ordre, h), `etapa ${etapa + 1}`);
          assert(pos >= 0 && pos < 4, `posició ${pos}`);
          casos++;
        }
      }
    };
    // Totes les tecles possibles a les etapes 1 i 2, i totes les històries sobre conjunts de mostra a les altres.
    const histories = (valors, n) => {
      if (n === 0) return [[]];
      const curtes = histories(valors, n - 1); const res = [];
      for (const c of curtes) for (const valor of valors) for (let posicio = 0; posicio < 4; posicio++) res.push([...c, { valor, posicio }]);
      return res;
    };
    for (const v of conjunts) { prova(0, v, []); for (const h of histories(v, 1)) prova(1, v, h); }
    for (const v of [[1, 2, 3, 4], [2, 5, 6, 9], [1, 3, 7, 8]]) {
      for (const h of histories(v, 2)) prova(2, v, h);
      for (const h of histories(v, 3).filter((_, i) => i % 7 === 0)) prova(3, v, h);
    }
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    assert.strictEqual(b.memoria.etapes.length, R.MEMORIA.etapes);
    const valors = [...b.memoria.etapes[0].ordre].sort().join();
    assert.strictEqual(new Set(b.memoria.etapes[0].ordre).size, 4);
    b.memoria.etapes.forEach((e, i) => {
      assert.strictEqual([...e.ordre].sort().join(), valors, 'els valors no canvien');
      assert(e.pantalla >= 1 && e.pantalla <= 9);
      if (i) assert.notStrictEqual(e.ordre.join(), b.memoria.etapes[i - 1].ordre.join());
    });
    jugaTot(R, b);
  },
  llegeix: async () => ({}),
  async resol(p, R) {
    const h = [];
    for (let e = 0; e < R.MEMORIA.etapes; e++) {
      const { pantalla, ordre, etapa } = await p.evaluate(() => ({
        pantalla: Number(document.querySelector('#pantalla-mem').dataset.valor),
        etapa: Number(document.querySelector('#pantalla-mem').dataset.etapa),
        ordre: [...document.querySelectorAll('.tecla-mem')].map((k) => Number(k.dataset.valor)),
      }));
      assert.strictEqual(etapa, e, 'etapa actual');
      const pos = oracle(e, pantalla, ordre, h);
      h.push({ valor: ordre[pos], posicio: pos });
      await p.locator(`.tecla-mem[data-i="${pos}"]`).click();
    }
  },
};
