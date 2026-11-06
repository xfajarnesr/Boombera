// Comprova les regles contra un oracle escrit a part, amb totes les combinacions possibles.
const R = require('../site/comu/regles.js');
const assert = require('assert');

const primers = new Set([11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]);
const suma = (n) => Math.floor(n / 10) + (n % 10);

function oracleCable(b) {
  const c = b.cables, n = c.length;
  switch (c[0]) {
    case 'vermell': return c.slice(1).includes('vermell') ? c.lastIndexOf('vermell') : 1;
    case 'blau': return primers.has(b.numero) ? 2 : n - 2;
    case 'groc': return b.piles > 2 ? 0 : 1;
    case 'verd': return n % 2 ? (n - 1) / 2 : n - 1;
    case 'negre': return suma(b.numero) % 3 === 0 ? c.findIndex((x) => x !== 'negre') : n - 1;
  }
}
function oracleBoto(b) {
  switch (b.boto.paraula) {
    case 'PREM': return b.piles % 2 === 0 ? 'mantén' : 'clic';
    case 'ATURA': return b.boto.color === 'vermell' ? 'clic' : 'mantén';
    case 'ARA': return b.indicadors.some((i) => i.ences) ? 'mantén' : 'clic';
    case 'NO': return b.numero % 4 === 0 ? 'clic' : 'mantén';
  }
}

const colors = Object.keys(R.COLORS_CABLE);
const seqs = [];
(function g(p) {
  if (p.length >= 3 && R.senseMesDeDos(p)) seqs.push(p);
  if (p.length < 5) colors.forEach((c) => g([...p, c]));
})([]);

let casosCables = 0;
const talls = new Set();
for (const cables of seqs) for (let numero = 10; numero <= 99; numero++) for (let piles = 1; piles <= 4; piles++) {
  const b = { cables, numero, piles, indicadors: [], boto: {} };
  const i = R.solucioCables(b);
  assert(Number.isInteger(i) && i >= 0 && i < cables.length, `índex invàlid ${i} per ${cables}`);
  assert.strictEqual(i, oracleCable(b), `no coincideix: ${cables} ${numero} ${piles}`);
  const r = R.REGLES_CABLES.filter((x) => x.primer === cables[0]);
  assert.strictEqual(r.length, 1, 'cal exactament una fila per color');
  const { regla, tall } = R.reglaCables(b);
  talls.add(`${regla.primer}:${tall}`);
  casosCables++;
}
assert.strictEqual(talls.size, 10, `resultats de cables assolits: ${talls.size} de 10`);

let casosBoto = 0;
const accions = new Set();
for (const paraula of R.PARAULES) for (const color of Object.keys(R.COLORS_BOTO)) for (let numero = 10; numero <= 99; numero++)
  for (let piles = 1; piles <= 4; piles++) for (const a of [false, true]) for (const c of [false, true]) {
    const b = { numero, piles, cables: [], boto: { paraula, color }, indicadors: [{ ences: a }, { ences: c }] };
    const acc = R.solucioBoto(b);
    assert(['clic', 'mantén'].includes(acc));
    assert.strictEqual(acc, oracleBoto(b));
    accions.add(`${paraula}:${acc}`);
    casosBoto++;
  }
assert.strictEqual(accions.size, 8, 'totes les accions del botó han de ser possibles');

// Cada llum ha de donar sempre un moment per deixar anar, sense esperes llargues.
for (const [nom, l] of Object.entries(R.LLUMS)) {
  const vals = Array.from({ length: 60 }, (_, s) => s).filter((s) => l.test(s));
  let pitjor = 0;
  vals.forEach((v, i) => { const seg = vals[(i + 1) % vals.length]; pitjor = Math.max(pitjor, (seg - v + 60) % 60 || 60); });
  assert(vals.length > 0, nom);
  assert(pitjor <= 15, `${nom}: espera de ${pitjor} s`);
  console.log(`llum ${nom}: ${vals.length} moments per minut, espera màxima ${pitjor} s`);
}

// El generador només crea bombes vàlides.
const vistos = { c: new Set(), p: new Set(), w: new Set(), n: new Set() };
for (let k = 0; k < 100000; k++) {
  const b = R.generaBomba();
  assert(b.cables.length >= 3 && b.cables.length <= 5 && R.senseMesDeDos(b.cables));
  assert(b.numero >= 10 && b.numero <= 99 && b.piles >= 1 && b.piles <= 4);
  assert(/^[^AEIOU]{3}$/.test(b.lletres));
  assert.strictEqual(new Set(b.indicadors.map((i) => i.etiqueta)).size, 2);
  assert.strictEqual(R.solucioCables(b), oracleCable(b));
  assert.strictEqual(R.solucioBoto(b), oracleBoto(b));
  vistos.c.add(b.cables[0]); vistos.p.add(b.piles); vistos.w.add(b.boto.paraula); vistos.n.add(b.cables.length);
}
assert(vistos.c.size === 5 && vistos.p.size === 4 && vistos.w.size === 4 && vistos.n.size === 3);

console.log(`Cables: ${casosCables} combinacions correctes. Botó: ${casosBoto} combinacions correctes. Generador: 100000 bombes correctes.`);
