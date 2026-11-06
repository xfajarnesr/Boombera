// Regles i joc real del mòdul de cables.
const assert = require('assert');
const primers = new Set([11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]);
const suma = (n) => Math.floor(n / 10) + (n % 10);
function oracle(b) {
  const c = b.cables, n = c.length;
  switch (c[0]) {
    case 'vermell': return c.slice(1).includes('vermell') ? c.lastIndexOf('vermell') : 1;
    case 'blau': return primers.has(b.numero) ? 2 : n - 2;
    case 'groc': return b.piles > 2 ? 0 : 1;
    case 'verd': return n % 2 ? (n - 1) / 2 : n - 1;
    case 'negre': return suma(b.numero) % 3 === 0 ? c.findIndex((x) => x !== 'negre') : n - 1;
  }
}
module.exports = {
  regles(R) {
    const colors = Object.keys(R.COLORS_CABLE);
    const seqs = [];
    (function g(p) {
      if (p.length >= 3 && R.senseMesDeDos(p)) seqs.push(p);
      if (p.length < 5) colors.forEach((c) => g([...p, c]));
    })([]);
    let casos = 0;
    const talls = new Set();
    for (const cables of seqs) for (let numero = 10; numero <= 99; numero++) for (let piles = 1; piles <= 4; piles++) {
      const b = { cables, numero, piles, indicadors: [], boto: {} };
      const i = R.solucioCables(b);
      assert(Number.isInteger(i) && i >= 0 && i < cables.length, `índex invàlid ${i} per ${cables}`);
      assert.strictEqual(i, oracle(b), `no coincideix: ${cables} ${numero} ${piles}`);
      assert.strictEqual(R.REGLES_CABLES.filter((x) => x.primer === cables[0]).length, 1, 'cal exactament una fila per color');
      const { regla, tall } = R.reglaCables(b);
      talls.add(`${regla.primer}:${tall}`);
      casos++;
    }
    assert.strictEqual(talls.size, 10, `resultats de cables assolits: ${talls.size} de 10`);
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    assert(b.cables.length >= 3 && b.cables.length <= 5 && R.senseMesDeDos(b.cables));
    assert.strictEqual(R.solucioCables(b), oracle(b));
  },
  llegeix: (p) => p.evaluate(() => ({ cables: [...document.querySelectorAll('.cable')].map((c) => c.dataset.color) })),
  async resol(p, R, b) {
    await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).click();
  },
};
