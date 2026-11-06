// Regles i joc real de la contrasenya. L'oracle porta la seva pròpia llista i la seva pròpia suma.
const assert = require('assert');
const LLISTA = 'ANGLE ARREL BOIRA CARTA CLAUS CORBA CREMA DADES DOTZE EIXOS ERROR FERRO FORMA FOSCA FUSTA GRAUS LLUMS MARXA MITJA NEGRE PLOMA PORTA QUART RADIS RECTA SENAR SETZE SIGNE SUMAR TECLA'.split(' ');
const possibles = (rodets) => LLISTA.filter((p) => [...p].every((l, i) => rodets[i].includes(l)));
function oracle(rodets, numero) {
  const f = possibles(rodets);
  assert.strictEqual(f.length, 2, `hi ha d'haver dues paraules, i n'hi ha ${f.length}`);
  return (Math.floor(numero / 10) + numero % 10) % 2 === 0 ? f[0] : f[1];
}
// dispatchEvent evita esperar que l'animació s'aturi a cada clic: el botó i el seu codi són els mateixos.
const clica = (p, sel, i) => p.locator(`${sel}[data-i="${i}"]`).dispatchEvent('click');
const actual = (p) => p.evaluate(() => document.querySelector('#rodets').dataset.paraula);
// Com qui desactiva: fa donar tota la volta a cada rodet i va llegint les lletres.
async function llegeixRodets(p, R) {
  const rodets = [];
  for (let i = 0; i < R.CONTRASENYA.rodets; i++) {
    const r = [];
    for (let k = 0; k < R.CONTRASENYA.lletres; k++) { r.push((await actual(p))[i]); await clica(p, '.rodet-amunt', i); }
    rodets.push(r);
  }
  return rodets;
}
async function escriu(p, R, rodets, paraula) {
  const n = R.CONTRASENYA.lletres;
  for (let i = 0; i < rodets.length; i++) {
    const cal = (rodets[i].indexOf(paraula[i]) - rodets[i].indexOf((await actual(p))[i]) + n) % n;
    // Fa servir les dues fletxes, per comprovar que totes dues funcionen.
    if (cal <= n / 2) for (let k = 0; k < cal; k++) await clica(p, '.rodet-amunt', i);
    else for (let k = 0; k < n - cal; k++) await clica(p, '.rodet-avall', i);
  }
  assert.strictEqual(await actual(p), paraula);
}
module.exports = {
  oracle, llegeixRodets, escriu, actual, possibles,
  regles(R) {
    assert.deepStrictEqual(R.CONTRASENYA.paraules, LLISTA);
    assert.deepStrictEqual([...LLISTA].sort(), LLISTA, 'en ordre alfabètic');
    assert.strictEqual(new Set(LLISTA).size, LLISTA.length);
    LLISTA.forEach((p) => assert(/^[A-Z]{5}$/.test(p), p));
    let casos = 0;
    for (let a = 0; a < LLISTA.length; a++) for (let c = a + 1; c < LLISTA.length; c++) {
      for (const numero of [10, 11, 47, 48, 99]) {
        const rodets = [...LLISTA[a]].map((l, i) => [l, LLISTA[c][i]]);
        if (possibles(rodets).length !== 2) continue;
        const b = { numero, contrasenya: { rodets } };
        assert.strictEqual(R.solucioContrasenya(b), oracle(rodets, numero));
        casos++;
      }
    }
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    const { rodets, inici } = b.contrasenya;
    assert.strictEqual(rodets.length, 5);
    rodets.forEach((r) => assert.strictEqual(new Set(r).size, 4, 'quatre lletres diferents'));
    const sol = oracle(rodets, b.numero);
    assert.strictEqual(R.solucioContrasenya(b), sol);
    assert(!LLISTA.includes(inici.map((p, i) => rodets[i][p]).join('')), 'els rodets no comencen en una paraula de la llista');
  },
  llegeix: async () => ({}),
  async resol(p, R, q) {
    const rodets = await llegeixRodets(p, R);
    await escriu(p, R, rodets, oracle(rodets, q.numero));
    await p.locator('.envia-contrasenya').click();
  },
};
