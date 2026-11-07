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
const tic = (p) => p.evaluate(() => Number(document.querySelector('#temps').dataset.tic || 0));
// Espera dues passades del rellotge: llavors el temps pintat ja és el de veritat, encara que la màquina vagi lenta.
async function rellotgeAlDia(p) {
  const t = await tic(p);
  await p.waitForFunction((x) => Number(document.querySelector('#temps').dataset.tic) >= x + 2, t);
}
// Si a la bomba hi ha dos botons, el segon és «boto-2» i els seus elements porten «-2» (#boto-2, #llum-2).
const sufix = (id) => id.slice('boto'.length);
// Un clic sec: baixa i puja dins el mateix pas de la pàgina, perquè en una màquina lenta no s'arribi a encendre la llum.
const clicSec = (p, id = 'boto') => p.evaluate((sel) => {
  const b = document.querySelector(sel);
  const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse' };
  b.dispatchEvent(new PointerEvent('pointerdown', o));
  b.dispatchEvent(new PointerEvent('pointerup', o));
}, `#boto${sufix(id)}`);
// Mantén premut amb el ratolí de veritat. hover() espera que el botó estigui quiet, però si la càmera
// encara es movia i el clic cau fora, s'aparta el ratolí (perquè no faci clic enlloc) i es torna a provar.
async function mante(p, id = 'boto') {
  const sel = `#boto${sufix(id)}`;
  for (let k = 0; k < 4; k++) {
    await p.locator(sel).hover();
    await p.mouse.down();
    const premut = await p.waitForFunction((x) => document.querySelector(x).dataset.premut === 'true', sel, { timeout: 4000 }).then(() => true, () => false);
    if (premut) return;
    await p.mouse.move(2, 2);
    await p.mouse.up();
  }
  throw new Error('el botó no queda premut després de 4 intents');
}
async function deixa(p, id = 'boto') {
  await p.mouse.up();
  await p.waitForFunction((x) => document.querySelector(x).dataset.premut === 'false', `#boto${sufix(id)}`);
}
module.exports = {
  oracle, clicSec, mante, deixa, rellotgeAlDia,
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
  llegeix: (p, id = 'boto') => p.evaluate((sel) => ({ boto: { color: document.querySelector(sel).dataset.color, paraula: document.querySelector(sel).textContent } }), `#boto${sufix(id)}`),
  async resol(p, R, b, id = 'boto') {
    if (R.solucioBoto(b) === 'clic') { await clicSec(p, id); return; }
    await mante(p, id);
    const selLlum = `#llum${sufix(id)}`;
    await p.waitForFunction((x) => document.querySelector(x).dataset.color, selLlum);
    const llum = await p.evaluate((x) => document.querySelector(x).dataset.color, selLlum);
    // Amb el rellotge aturat es comprova la regla sense dependre de la velocitat de la màquina.
    await p.evaluate(() => window.__atura());
    await rellotgeAlDia(p);
    for (let k = 0; k < 60; k++) {
      if (R.LLUMS[llum].test((await total(p)) % 60)) break;
      const abans = await total(p);
      await p.evaluate(() => window.__salta(1000));
      await p.waitForFunction((t) => Number(document.querySelector('#temps').dataset.total) !== t, abans);
      await rellotgeAlDia(p);
    }
    await deixa(p, id);
    await p.evaluate(() => window.__segueix());
  },
};
