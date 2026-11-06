// Regles i joc real del mòdul de seqüència. L'oracle fa els salts d'un en un, sense mòdul aritmètic.
const assert = require('assert');
const HORARI = { vermell: 'groc', groc: 'blau', blau: 'verd', verd: 'vermell' };
const ANTI = Object.fromEntries(Object.entries(HORARI).map(([a, b]) => [b, a]));
function oracle(flaix, piles, errors, numero) {
  const mapa = numero % 2 === 0 ? HORARI : ANTI;
  let c = flaix;
  for (let i = 0; i < piles + errors; i++) c = mapa[c];
  return c;
}
// Mira els flaixos de veritat, tal com els veuria qui desactiva.
const observa = (p) => p.evaluate(() => new Promise((ok, ko) => {
  const el = document.querySelector('#senyal');
  const rellotge = setTimeout(() => { o.disconnect(); ko(new Error(`seqüència sense ronda sencera: n ${el.dataset.n}, fase ${document.body.dataset.fase}`)); }, 60000);
  let vist = [];
  const mira = () => {
    const i = Number(el.dataset.i); const llarg = Number(el.dataset.llarg);
    if (i === 0) vist = [];
    if (i !== vist.length) return;
    vist.push(el.dataset.color);
    if (vist.length === llarg) { o.disconnect(); clearTimeout(rellotge); ok(vist); }
  };
  const o = new MutationObserver(mira);
  o.observe(el, { attributes: true, attributeFilter: ['data-n'] });
}));
const errors = (p) => p.evaluate(() => Number(document.querySelector('#errors').dataset.n));
module.exports = {
  oracle, observa,
  regles(R) {
    let casos = 0;
    const respostes = new Set();
    for (let numero = 10; numero <= 99; numero++) for (let piles = 1; piles <= 4; piles++) for (let e = 0; e <= 2; e++) {
      const b = { numero, piles };
      const sortides = new Set();
      for (const flaix of R.SEQUENCIA.anell) {
        const r = R.respostaSequencia(b, flaix, e);
        assert.strictEqual(r, oracle(flaix, piles, e, numero), `${flaix} ${piles} ${e} ${numero}`);
        sortides.add(r); respostes.add(`${flaix}:${r}`);
        casos++;
      }
      assert.strictEqual(sortides.size, 4, 'cada color ha de portar a una tecla diferent');
    }
    assert.strictEqual(respostes.size, 16, 'totes les traduccions han de ser possibles');
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    const s = b.sequencia;
    assert.strictEqual(s.flaixos.length, Math.max(...R.SEQUENCIA.rondes));
    assert.deepStrictEqual([...s.tecles].sort(), [...R.SEQUENCIA.anell].sort());
    assert(s.flaixos.every((c) => R.SEQUENCIA.anell.includes(c)));
  },
  llegeix: async () => ({}),
  async resol(p, R, b) {
    for (let r = 0; r < R.SEQUENCIA.rondes.length; r++) {
      const flaixos = await observa(p);
      assert.strictEqual(flaixos.length, R.SEQUENCIA.rondes[r], 'llargada de la ronda');
      for (const flaix of flaixos) {
        const e = await errors(p);
        await p.locator(`.tecla-seq[data-color="${oracle(flaix, b.piles, e, b.numero)}"]`).click();
      }
    }
  },
};
