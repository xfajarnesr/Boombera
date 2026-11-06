// Regles i joc real del mòdul del botó.
const assert = require('assert');
function oracle(b) {
  switch (b.boto.paraula) {
    case 'PREM': return b.piles % 2 === 0 ? 'mantén' : 'clic';
    case 'ATURA': return b.boto.color === 'vermell' ? 'clic' : 'mantén';
    case 'ARA': return b.indicadors.some((i) => i.ences) ? 'mantén' : 'clic';
    case 'NO': return b.numero % 4 === 0 ? 'clic' : 'mantén';
  }
}
const total = (p) => p.evaluate(() => Number(document.querySelector('#temps').dataset.total));
module.exports = {
  regles(R) {
    let casos = 0;
    const accions = new Set();
    for (const paraula of R.PARAULES) for (const color of Object.keys(R.COLORS_BOTO)) for (let numero = 10; numero <= 99; numero++)
      for (let piles = 1; piles <= 4; piles++) for (const a of [false, true]) for (const c of [false, true]) {
        const b = { numero, piles, cables: [], boto: { paraula, color }, indicadors: [{ ences: a }, { ences: c }] };
        const acc = R.solucioBoto(b);
        assert(['clic', 'mantén'].includes(acc));
        assert.strictEqual(acc, oracle(b));
        accions.add(`${paraula}:${acc}`);
        casos++;
      }
    assert.strictEqual(accions.size, 8, 'totes les accions del botó han de ser possibles');
    // Cada llum ha de donar sempre un moment per deixar anar, sense esperes llargues.
    for (const [nom, l] of Object.entries(R.LLUMS)) {
      const vals = Array.from({ length: 60 }, (_, s) => s).filter((s) => l.test(s));
      let pitjor = 0;
      vals.forEach((v, i) => { const seg = vals[(i + 1) % vals.length]; pitjor = Math.max(pitjor, (seg - v + 60) % 60 || 60); });
      assert(vals.length > 0, nom);
      assert(pitjor <= 15, `${nom}: espera de ${pitjor} s`);
    }
    return `${casos} combinacions`;
  },
  bomba(R, b) { assert.strictEqual(R.solucioBoto(b), oracle(b)); },
  llegeix: (p) => p.evaluate(() => ({ boto: { color: document.querySelector('#boto').dataset.color, paraula: document.querySelector('#boto').textContent } })),
  async resol(p, R, b) {
    // hover() espera que el botó estigui quiet: si la càmera encara entra, el clic cauria fora.
    await p.locator('#boto').hover();
    await p.mouse.down();
    if (R.solucioBoto(b) === 'clic') { await p.mouse.up(); return; }
    await p.waitForFunction(() => document.querySelector('#llum').dataset.color);
    const llum = await p.evaluate(() => document.querySelector('#llum').dataset.color);
    // Amb el rellotge aturat es comprova la regla sense dependre de la velocitat de la màquina.
    await p.evaluate(() => window.__atura());
    for (;;) {
      if (R.LLUMS[llum].test((await total(p)) % 60)) break;
      const abans = await total(p);
      await p.evaluate(() => window.__salta(1000));
      await p.waitForFunction((t) => Number(document.querySelector('#temps').dataset.total) !== t, abans);
    }
    await p.mouse.up();
    await p.evaluate(() => window.__segueix());
  },
};
