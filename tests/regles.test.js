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
  assert(n.moduls.length <= R.PARTIDA.espaisCara * R.PARTIDA.cares, 'la bomba només té dotze espais');
  assert(n.segons < 600, `${n.nom}: el temporitzador només té una xifra per als minuts`);
  assert.strictEqual(new Set(n.moduls).size, n.moduls.length, `${n.nom}: mòduls repetits`);
}
for (const m of R.MODULS) assert(R.NIVELLS.some((n) => n.moduls.includes(m)), `${m} no surt a cap nivell`);

// Qualsevol bomba generada té una solució única a tots els mòduls.
const vistos = { pp: new Set(), rn: new Set(), int: new Set(), rat: new Set(), c: new Set(), p: new Set(), w: new Set(), n: new Set(), cat: new Set(), lab: new Set(), mor: new Set() };
for (let k = 0; k < 100000; k++) {
  const b = R.generaBomba();
  assert(b.numero >= 10 && b.numero <= 99 && b.piles >= 1 && b.piles <= 4);
  assert(/^[^AEIOU]{3}$/.test(b.lletres));
  assert.strictEqual(new Set(b.indicadors.map((i) => i.etiqueta)).size, 2);
  for (const m of R.MODULS) proves[m].bomba(R, b);
  // La carcassa: una peça per ranura, alguna a cada cara, i els portapiles sumen les piles.
  const llocs = b.ranures.map((r) => `${r.cara}:${r.ranura}`);
  assert.strictEqual(new Set(llocs).size, llocs.length, 'dues peces a la mateixa ranura');
  assert(b.ranures.every((r) => r.cara >= 0 && r.cara < R.PARTIDA.cares && r.ranura >= 0 && r.ranura < R.PARTIDA.ranuresCara));
  assert.strictEqual(new Set(b.ranures.map((r) => r.cara)).size, R.PARTIDA.cares, 'la carcassa ha de tenir peces a totes dues cares');
  const portapiles = b.ranures.filter((r) => r.tipus === 'piles');
  assert(portapiles.length >= 1 && portapiles.length <= 2 && portapiles.every((r) => r.n >= 1));
  assert.strictEqual(portapiles.reduce((s, r) => s + r.n, 0), b.piles);
  assert.strictEqual(b.ranures.filter((r) => r.tipus === 'serie').length, 1);
  assert.deepStrictEqual(b.ranures.filter((r) => r.tipus === 'indicador').map((r) => r.i).sort(), [0, 1]);
  vistos.pp.add(portapiles.length); b.ranures.forEach((r) => vistos.rn.add(`${r.tipus}:${r.cara}:${r.ranura}`));
  vistos.c.add(b.cables[0]); vistos.p.add(b.piles); vistos.w.add(b.boto.paraula); vistos.n.add(b.cables.length);
  vistos.lab.add(`${b.laberint.idx}:${b.piles}`); vistos.mor.add(b.morse.paraula);
  vistos.int.add(R.filaInterruptors(b.interruptors.d).objectiu);
  b.ratlles.cables.forEach((c) => vistos.rat.add(R.zonaRatlles(c)));
  b.memoria.etapes.forEach((e) => vistos.cat.add(R.categoriaMemoria(e.pantalla)));
}
assert(vistos.c.size === 5 && vistos.p.size === 4 && vistos.w.size === 4 && vistos.n.size === 3 && vistos.cat.size === 3);
assert(vistos.int.size === 4 && vistos.rat.size === 16, 'surten totes les files dels interruptors i les 16 zones');
assert(vistos.lab.size === 24 && vistos.mor.size === 12, 'surten tots els laberints, sortides i paraules');
assert(vistos.pp.size === 2 && vistos.rn.size === 3 * 8, 'les piles a vegades es parteixen i cada peça surt a totes les ranures');

// Els mòduls: amb pocs, tots a la cara del davant; amb més, repartits amb algun a cada cara.
for (const n of R.NIVELLS) for (let k = 0; k < 2000; k++) {
  const e = R.repartimentEspais(n.moduls);
  assert.strictEqual(e.length, R.PARTIDA.espaisCara * R.PARTIDA.cares);
  assert.deepStrictEqual(e.filter(Boolean).sort(), [...n.moduls].sort());
  const darrere = e.slice(R.PARTIDA.espaisCara).filter(Boolean).length;
  if (n.moduls.length <= R.PARTIDA.modulsUnaCara) assert.strictEqual(darrere, 0, `${n.nom}: no hauria de fer servir la cara de darrere`);
  else assert(darrere >= 1 && darrere < n.moduls.length, `${n.nom}: ha de tenir mòduls a totes dues cares`);
}
console.log('Carcassa i espais: les peces es reparteixen a l\'atzar entre les dues cares.');
console.log('Generador: 100000 bombes correctes, amb una solució única a cada mòdul.');
