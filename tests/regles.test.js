// Comprova les regles de cada mòdul contra un oracle escrit a part (a tests/moduls/).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../site/comu/regles.js');

const proves = Object.fromEntries(R.MODULS.map((m) => [m, require(`./moduls/${m}.js`)]));
for (const m of R.MODULS) {
  for (const f of ['3d.js', 'joc.js', 'manual.js']) assert(fs.existsSync(path.join(__dirname, '..', 'site', 'moduls', m, f)), `${m} no té ${f}`);
  console.log(`${m}: ${proves[m].regles(R)} correctes.`);
}
for (const n of R.NIVELLS) {
  assert(n.moduls.every((m) => R.MODULS.includes(m)), n.nom);
  assert(n.moduls.length <= 6, 'la bomba només té sis espais');
}

// Qualsevol bomba generada té una solució única a tots els mòduls.
const vistos = { c: new Set(), p: new Set(), w: new Set(), n: new Set(), cat: new Set() };
for (let k = 0; k < 100000; k++) {
  const b = R.generaBomba();
  assert(b.numero >= 10 && b.numero <= 99 && b.piles >= 1 && b.piles <= 4);
  assert(/^[^AEIOU]{3}$/.test(b.lletres));
  assert.strictEqual(new Set(b.indicadors.map((i) => i.etiqueta)).size, 2);
  for (const m of R.MODULS) proves[m].bomba(R, b);
  vistos.c.add(b.cables[0]); vistos.p.add(b.piles); vistos.w.add(b.boto.paraula); vistos.n.add(b.cables.length);
  b.memoria.etapes.forEach((e) => vistos.cat.add(R.categoriaMemoria(e.pantalla)));
}
assert(vistos.c.size === 5 && vistos.p.size === 4 && vistos.w.size === 4 && vistos.n.size === 3 && vistos.cat.size === 3);
console.log('Generador: 100000 bombes correctes, amb una solució única a cada mòdul.');
