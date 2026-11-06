// Regles i joc real dels símbols. L'oracle porta la seva pròpia taula de valors.
const assert = require('assert');
const VALORS = { ona: 1, alef: 2, diferent: 3, parabola: 4, beta: 5, perpendicular: 6, arrel: 7, cercle: 8, mi: 9, pertot: 10, quadrat: 11, integral: 12, espiral: 13, pi: 14, buit: 15, cub: 16, alfa: 17, dividit: 18, sigma: 19, mesmenys: 20, hexagon: 21, theta: 22, angle: 23, infinit: 24 };
function oracle(plaques) {
  const v = plaques.map((id) => VALORS[id]);
  const parell = v.filter((x) => x % 2 === 1).length % 2 === 0;
  return v.map((_, i) => i).sort((x, y) => (parell ? v[x] - v[y] : v[y] - v[x]));
}
const llegeixPlaques = (p) => p.evaluate(() => [...document.querySelectorAll('.placa')].map((k) => k.dataset.simbol));
module.exports = {
  oracle, llegeixPlaques,
  regles(R) {
    const n = Object.keys(VALORS).length;
    assert.strictEqual(R.SIMBOLS.length, n);
    assert.strictEqual(new Set(R.SIMBOLS.map((s) => s.nom)).size, n);
    assert(!R.SIMBOLS.some((s) => s.id === 'delta'), 'el delta és fora: sembla un triangle qualsevol');
    R.SIMBOLS.forEach((s) => {
      assert.strictEqual(s.valor, VALORS[s.id], s.id);
      assert(/^[Mm]/.test(s.d), `${s.id}: camí buit`);
    });
    const ids = Object.keys(VALORS); let casos = 0;
    for (let a = 0; a < n; a++) for (let c = a + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const plaques = [ids[e], ids[a], ids[d], ids[c]];
      assert.deepStrictEqual(R.solucioSimbols({ simbols: { plaques } }), oracle(plaques));
      casos++;
    }
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    const { plaques } = b.simbols;
    assert.strictEqual(new Set(plaques).size, 4);
    const ordre = R.solucioSimbols(b);
    assert.deepStrictEqual(ordre, oracle(plaques));
    const v = ordre.map((i) => VALORS[plaques[i]]);
    const puja = v.every((x, i) => !i || x > v[i - 1]); const baixa = v.every((x, i) => !i || x < v[i - 1]);
    assert(puja || baixa, 'hi ha un sol ordre possible');
  },
  llegeix: async () => ({}),
  async resol(p) {
    for (const i of oracle(await llegeixPlaques(p))) await p.locator(`.placa[data-i="${i}"]`).click();
  },
};
