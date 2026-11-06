// Regles i joc real dels interruptors. L'oracle fa la divisió i el binari pel seu compte.
const assert = require('assert');
function objectiu(d) {
  if (d % 4 === 0) return d / 4;
  if (d % 3 === 0) return d / 3;
  if (d % 5 === 0) return d / 5;
  return Math.floor(d / 10) + (d % 10);
}
// Posició de cada palanca, d'esquerra a dreta (true és amunt).
function oracle(d, numero) {
  const bits = objectiu(d).toString(2).padStart(5, '0').split('').map((x) => x === '1');
  return numero % 2 === 0 ? bits : bits.reverse();
}
const estat = (p) => p.evaluate(() => {
  const el = document.querySelector('#interruptors');
  return { d: Number(el.dataset.d), palanques: el.dataset.palanques.split('').map((x) => x === '1') };
});
// Mou les palanques fins a la combinació demanada, una a una, i espera que el mòdul ho reculli.
async function posa(p, vol) {
  const ara = (await estat(p)).palanques;
  for (let i = 0; i < vol.length; i++) {
    if (ara[i] === vol[i]) continue;
    await p.locator(`.palanca[data-i="${i}"]`).dispatchEvent('click');
    await p.waitForFunction(([k, v]) => document.querySelector('#interruptors').dataset.palanques[k] === v, [i, vol[i] ? '1' : '0']);
  }
  assert.deepStrictEqual((await estat(p)).palanques, vol);
}
module.exports = {
  oracle, objectiu, estat, posa,
  regles(R) {
    let casos = 0;
    const files = new Set();
    for (let d = R.INTERRUPTORS.minim; d <= R.INTERRUPTORS.maxim; d++) for (let numero = 10; numero <= 99; numero++) {
      const t = R.objectiuInterruptors(d);
      assert.strictEqual(t, objectiu(d), `objectiu de ${d}`);
      assert(Number.isInteger(t) && t >= 1 && t <= 31, `${d} dona ${t}, que no cap a cinc palanques`);
      assert.deepStrictEqual(R.solucioInterruptors({ numero, interruptors: { d } }), oracle(d, numero));
      files.add(R.filaInterruptors(d).objectiu);
      casos++;
    }
    assert.strictEqual(files.size, R.FILES_INTERRUPTORS.length, 'totes les files es fan servir');
    assert.deepStrictEqual(R.INTERRUPTORS.pesos, [16, 8, 4, 2, 1]);
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    const { d, inici } = b.interruptors;
    assert(d >= 10 && d <= 98 && inici.length === 5);
    const bona = oracle(d, b.numero);
    assert.deepStrictEqual(R.solucioInterruptors(b), bona);
    assert.notDeepStrictEqual(inici, bona, 'no pot començar resolt');
  },
  llegeix: async () => ({}),
  async resol(p, R, q) {
    const { d } = await estat(p);
    await posa(p, oracle(d, q.numero));
    await p.locator('.fixa').dispatchEvent('click');
  },
};
