// Regles i joc real dels cables amb ratlles. L'oracle porta el seu propi diagrama.
const assert = require('assert');
const PRIMERS = [2, 3, 5, 7];
// Clau: ratlles, LED, primer, vermell (1 o 0).
const DIAGRAMA = {
  '0000': 'N', '1000': 'S', '0100': 'T', '0010': 'M', '0001': 'I',
  '1100': 'N', '1010': 'T', '1001': 'M', '0110': 'I', '0101': 'S', '0011': 'T',
  '1110': 'S', '1101': 'I', '1011': 'N', '0111': 'M', '1111': 'T',
};
function talla(c, b) {
  const clau = [Boolean(c.ratlla), c.led, PRIMERS.includes(c.xifra), c.color === 'vermell' || c.ratlla === 'vermell'].map((x) => (x ? 1 : 0)).join('');
  return {
    T: true, N: false, S: b.numero % 2 === 0, I: b.indicadors.some((i) => i.ences), M: c.xifra > b.piles,
  }[DIAGRAMA[clau]];
}
const oracle = (b, cables) => cables.map((c, i) => (talla(c, b) ? i : -1)).filter((i) => i >= 0);
const llegeixCables = (p) => p.evaluate(() => [...document.querySelectorAll('.ratllat')].map((c) => ({
  color: c.dataset.color, ratlla: c.dataset.ratlla || null, led: c.dataset.led === 'true', xifra: Number(c.dataset.xifra),
})));
module.exports = {
  oracle, llegeixCables,
  regles(R) {
    const colors = Object.keys(R.COLORS_RATLLES);
    const cables = [];
    for (const color of colors) for (const ratlla of [null, ...colors.filter((c) => c !== color)])
      for (const led of [false, true]) for (let xifra = 1; xifra <= 9; xifra++) cables.push({ color, ratlla, led, xifra });
    let casos = 0;
    const zones = new Set();
    const lletres = {};
    for (const c of cables) for (let numero = 10; numero <= 99; numero++) for (let piles = 1; piles <= 4; piles++)
      for (const a of [false, true]) for (const e of [false, true]) {
        const b = { numero, piles, indicadors: [{ ences: a }, { ences: e }] };
        assert.strictEqual(R.calTallarRatlles(b, c), talla(c, b), JSON.stringify({ c, numero, piles, a, e }));
        zones.add(R.zonaRatlles(c));
        casos++;
      }
    assert.strictEqual(zones.size, 16, 'les 16 zones del diagrama es poden donar');
    Object.values(R.ZONES_RATLLES).forEach((l) => { lletres[l] = (lletres[l] || 0) + 1; });
    assert.deepStrictEqual(lletres, { T: 4, N: 3, S: 3, I: 3, M: 3 });
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    const { cables } = b.ratlles;
    assert(cables.length >= 4 && cables.length <= 6);
    cables.forEach((c) => {
      assert(c.ratlla !== c.color && c.xifra >= 1 && c.xifra <= 9);
    });
    const bons = oracle(b, cables);
    assert.deepStrictEqual(R.solucioRatlles(b), bons);
    assert(bons.length >= 1 && bons.length < cables.length, 'com a mínim un per tallar i un per deixar');
  },
  llegeix: async (p) => ({ ratlles: { cables: await llegeixCables(p) } }),
  async resol(p, R, q) {
    for (const i of oracle(q, q.ratlles.cables)) await p.locator(`.ratllat[data-i="${i}"]`).dispatchEvent('click');
  },
};
