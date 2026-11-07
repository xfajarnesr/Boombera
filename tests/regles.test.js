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
// Missions: sis seccions de quatre, amb mòduls, temps i errors fixats.
assert.strictEqual(R.SECCIONS.length, 6);
assert(R.SECCIONS.every((s) => s.missions.length === 4 && s.nom));
assert.strictEqual(R.NIVELLS.length, 24);
const nomsCursos = /\b(ESO|batx|batxillerat|primària|curs)\b|\d\s*r\b|\d\s*n\b/i;
for (const n of R.NIVELLS) {
  assert(n.moduls.every((m) => R.MODULS.includes(m)), n.nom);
  assert(n.moduls.length >= 1 && n.moduls.length <= R.PARTIDA.espaisCara * R.PARTIDA.cares, 'la bomba només té dotze espais');
  assert(n.segons <= R.PARTIDA.maxSegons && n.segons < 600, `${n.nom}: el temporitzador només té una xifra per als minuts`);
  assert(n.errors >= 1 && n.errors <= R.PARTIDA.maxErrors, `${n.nom}: la bomba té ${R.PARTIDA.maxErrors} llums d'error`);
  // Un mòdul pot sortir dues vegades, però no més.
  assert(n.moduls.every((m) => n.moduls.filter((x) => x === m).length <= 2), `${n.nom}: un mòdul més de dues vegades`);
  assert.strictEqual(n.codi, `${n.seccio}.${R.SECCIONS[n.seccio - 1].missions.indexOf(R.SECCIONS[n.seccio - 1].missions.find((x) => x.moduls === n.moduls)) + 1}`);
  assert(!nomsCursos.test(n.nom) && !R.SECCIONS.some((s) => nomsCursos.test(s.nom)), 'les missions no porten el nom de cap curs');
}
for (const m of R.MODULS) assert(R.NIVELLS.some((n) => n.moduls.includes(m)), `${m} no surt a cap missió`);
// Cada mòdul s'aprèn sol: la primera missió on surt no porta cap altre mòdul nou.
const coneguts = new Set();
for (const n of R.NIVELLS) {
  const nous = [...new Set(n.moduls.filter((m) => !coneguts.has(m)))];
  assert(nous.length <= 1, `${n.nom} presenta ${nous.length} mòduls nous alhora: ${nous}`);
  nous.forEach((m) => coneguts.add(m));
}
// Dins de cada secció, l'última missió és la més llarga i la que aguanta menys errors.
for (const s of R.SECCIONS) {
  const [, , , ultima] = s.missions;
  assert(s.missions.every((x) => x.moduls.length <= ultima.moduls.length && x.errors >= ultima.errors), s.nom);
}
// La secció 1 porta dos mòduls iguals a la mateixa bomba.
assert(R.SECCIONS[0].missions.some((x) => x.moduls.length === 2 && x.moduls[0] === x.moduls[1]));
// L'última missió fa servir tots els mòduls i peta al primer error.
assert.deepStrictEqual([...R.NIVELLS[23].moduls].sort(), [...R.MODULS].sort());
assert.strictEqual(R.NIVELLS[23].errors, 1);

// Instàncies: la segona vegada que surt un mòdul, porta «-2».
assert.deepStrictEqual(R.instancies(['cables', 'boto', 'cables']).map((x) => x.id), ['cables', 'boto', 'cables-2']);
// Missió lliure: mòduls vàlids sense repetir, i temps i errors de la llista.
assert.deepStrictEqual(R.missioLliure(['boto', 'cables', 'boto', 'res'], 300, 2).moduls, ['cables', 'boto']);
assert.strictEqual(R.missioLliure([], 300, 2), null);
assert.strictEqual(R.missioLliure(['cables'], 1000, 2), null);
assert.strictEqual(R.missioLliure(['cables'], 300, 4), null);
assert(R.LLIURE.segons.every((t) => t >= 60 && t <= R.PARTIDA.maxSegons));
// Cada instància repetida té dades pròpies amb la mateixa carcassa, i una solució única.
for (let k = 0; k < 5000; k++) {
  const b = R.generaBomba();
  for (const m of R.MODULS) { const b2 = { ...b, [m]: R.generaModul(m, Math.random, b) }; proves[m].bomba(R, b2); }
}
console.log(`Missions: ${R.NIVELLS.length} en ${R.SECCIONS.length} seccions, cada mòdul s'aprèn sol abans de barrejar-lo.`);

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

// Els mòduls van a qualsevol dels dotze espais, a l'atzar: amb el temps, surten a totes dues cares.
for (const n of R.NIVELLS) {
  const ids = R.instancies(n.moduls).map((x) => x.id);
  const cares = new Set();
  for (let k = 0; k < 400; k++) {
    const e = R.repartimentEspais(ids);
    assert.strictEqual(e.length, R.PARTIDA.espaisCara * R.PARTIDA.cares);
    assert.deepStrictEqual(e.filter(Boolean).sort(), [...ids].sort());
    e.forEach((x, i) => { if (x) cares.add(Math.floor(i / R.PARTIDA.espaisCara)); });
  }
  assert.strictEqual(cares.size, 2, `${n.nom}: els mòduls han de poder anar a totes dues cares`);
}
console.log('Carcassa i espais: les peces es reparteixen a l\'atzar entre les dues cares.');
console.log('Generador: 100000 bombes correctes, amb una solució única a cada mòdul.');
