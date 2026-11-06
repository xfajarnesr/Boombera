// Regles i joc real del senyal. L'oracle porta el seu alfabet morse, les seves paraules i els seus canals.
const assert = require('assert');
const ALFABET = 'A.- B-... C-.-. D-.. E. F..-. G--. H.... I.. J.--- K-.- L.-.. M-- N-. O--- P.--. Q--.- R.-. S... T- U..- V...- W.-- X-..- Y-.-- Z--..'
  .split(' ').reduce((o, x) => ({ ...o, [x.slice(1)]: x[0] }), {});
const CANALS = { TEMPS: 12, VOLTS: 17, RADAR: 23, PILOT: 28, METRE: 31, SEGON: 36, MINUT: 42, FLAIX: 47, ESPIA: 53, CODIS: 58, SERRA: 64, TIGRE: 69 };
const oracle = (paraula, numero, piles) => CANALS[paraula] + (numero % 2 ? -piles : piles);
const desxifra = (senyals) => senyals.map((l) => ALFABET[l]).join('');
// Mira la bombeta com qui desactiva: curt, llarg i pauses. Llegeix una volta sencera, de pausa llarga a pausa llarga.
// Si en 90 s no ha vist una volta sencera, falla i diu què ha vist, en lloc de quedar-se penjat.
const observa = (p) => p.evaluate(() => new Promise((ok, ko) => {
  const el = document.querySelector('#morse');
  const rellotge = setTimeout(() => { o.disconnect(); ko(new Error(`senyal sense volta sencera: estat ${el.dataset.estat}, n ${el.dataset.n}, fase ${document.body.dataset.fase}, fet ${document.querySelector('#fets').dataset.morse}`)); }, 90000);
  let lletres = null; let actual = '';
  const mira = () => {
    const e = el.dataset.estat;
    if (Number(el.dataset.n) === 1) { lletres = []; actual = ''; }
    if (e === 'paraula') {
      if (lletres) { lletres.push(actual); o.disconnect(); clearTimeout(rellotge); ok(lletres); return; }
      lletres = []; actual = ''; return;
    }
    if (!lletres) return;
    if (e === 'curt') actual += '.';
    else if (e === 'llarg') actual += '-';
    else if (e === 'lletra') { lletres.push(actual); actual = ''; }
  };
  const o = new MutationObserver(mira);
  o.observe(el, { attributes: true, attributeFilter: ['data-n'] });
}));
const canal = (p) => p.evaluate(() => Number(document.querySelector('#morse').dataset.canal));
async function posaCanal(p, n) {
  const ara = await canal(p);
  const d = [Math.floor(ara / 10), ara % 10]; const vol = [Math.floor(n / 10), n % 10];
  for (let i = 0; i < 2; i++) {
    const cal = (vol[i] - d[i] + 10) % 10;
    if (cal <= 5) for (let k = 0; k < cal; k++) await p.locator(`.canal-amunt[data-i="${i}"]`).dispatchEvent('click');
    else for (let k = 0; k < 10 - cal; k++) await p.locator(`.canal-avall[data-i="${i}"]`).dispatchEvent('click');
  }
  assert.strictEqual(await canal(p), n);
}
module.exports = {
  oracle, observa, desxifra, posaCanal, canal,
  regles(R) {
    assert.deepStrictEqual(Object.fromEntries(Object.entries(R.MORSE.codi).map(([l, c]) => [c, l])), ALFABET);
    assert.deepStrictEqual(Object.fromEntries(R.MORSE.paraules.map((x) => [x.paraula, x.canal])), CANALS);
    const codis = R.MORSE.paraules.map((x) => [...x.paraula].map((l) => R.MORSE.codi[l]).join(' '));
    assert.strictEqual(new Set(codis).size, codis.length, 'cada paraula sona diferent');
    assert.strictEqual(new Set(Object.values(CANALS)).size, 12);
    let casos = 0;
    for (const paraula of Object.keys(CANALS)) for (let numero = 10; numero <= 99; numero++) for (let piles = 1; piles <= 4; piles++) {
      const c = R.canalMorse({ numero, piles, morse: { paraula } });
      assert.strictEqual(c, oracle(paraula, numero, piles));
      assert(c >= 0 && c <= 99, 'el canal cap al visor');
      casos++;
    }
    return `${casos} combinacions`;
  },
  bomba(R, b) {
    assert(b.morse.paraula in CANALS);
    assert.strictEqual(R.canalMorse(b), oracle(b.morse.paraula, b.numero, b.piles));
  },
  llegeix: async () => ({}),
  async resol(p, R, q) {
    const paraula = desxifra(await observa(p));
    assert(paraula in CANALS, `paraula llegida: ${paraula}`);
    await posaCanal(p, oracle(paraula, q.numero, q.piles));
    await p.locator('.envia-canal').dispatchEvent('click');
  },
};
