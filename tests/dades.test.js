// Dades: el nucli (equips, partides i millors), l'Apps Script de debò sobre un full de mentida, el progrés i els codis.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../site/comu/regles.js');
const N = require('../site/dades/nucli.js');
const { creaGoogle } = require('./fals-google.js');
const { codi } = require('../scripts/apps-script.js');
const { empremta } = require('../scripts/codis.js');

// Progrés: la secció 1 és oberta, i cada secció s'obre amb tres missions superades de l'anterior, les que siguin.
assert.deepStrictEqual(R.seccionsObertes([]), [1]);
assert.deepStrictEqual(R.seccionsObertes(['1.1', '1.2']), [1]);
assert.deepStrictEqual(R.seccionsObertes(['1.1', '1.2', '1.4']), [1, 2]);
assert.deepStrictEqual(R.seccionsObertes(['1.1', '1.2', '1.3', '2.2', '2.3', '2.4']), [1, 2, 3]);
assert.deepStrictEqual(R.seccionsObertes(['5.1']), [1, 5], 'una secció amb alguna missió superada (en mode obert) queda oberta');
assert.deepStrictEqual(R.missionsObertes([]), ['1.1', '1.2', '1.3', '1.4']);
assert.deepStrictEqual(R.modulsOberts([]), ['cables', 'boto']);
assert.deepStrictEqual(R.modulsOberts(['1.1', '1.2', '1.3']), ['cables', 'boto', 'sequencia', 'memoria']);
assert.strictEqual(R.PROGRES.perObrir, 3);
assert.deepStrictEqual(N.CODIS, R.NIVELLS.map((n) => n.codi), "el nucli i l'Apps Script coneixen les mateixes missions que les regles");
console.log('Progrés: la secció 1 és oberta i cada secció s\'obre amb tres missions de l\'anterior.');

// Noms: majúscules, accents, espais i signes no compten.
for (const [a, b] of [['Tigres Àgils', 'tigres  agils'], ['Els Llamps', 'ELS LLAMPS '], ['Col·legues', 'col legues'], ['Pingüins-3', 'pinguins 3'], ['Ça va', 'ca va']]) assert.strictEqual(N.normalitza(a), N.normalitza(b), `${a} = ${b}`);
assert.notStrictEqual(N.normalitza('Tigres'), N.normalitza('Tigre'));
// Millor partida: menys errors i, si n'hi ha igual, més marge.
assert.deepStrictEqual(N.millor({ errors: 1, marge: 90 }, { errors: 0, marge: 10 }), { errors: 0, marge: 10 });
assert.deepStrictEqual(N.millor({ errors: 1, marge: 30 }, { errors: 1, marge: 60 }), { errors: 1, marge: 60 });
assert.deepStrictEqual(N.millor({ errors: 0, marge: 60 }, { errors: 2, marge: 120 }), { errors: 0, marge: 60 });

// L'Apps Script de debò, amb un full de mentida.
const g = creaGoogle();
const crida = g.crida;
let r = crida({ accio: 'creaEquip', nom: '  Tigres   Àgils ', membres: ['Aina M.', 'Pau R.', 'aina m.', ''] });
assert(r.ok, JSON.stringify(r));
assert.strictEqual(r.equip.nom, 'Tigres Àgils');
assert.deepStrictEqual(r.equip.membres, ['Aina M.', 'Pau R.'], 'sense membres repetits ni buits');
assert.strictEqual(r.equip.intents, undefined, "l'equip no veu els intents");
const tigres = r.equip.id;
assert.strictEqual(crida({ accio: 'creaEquip', nom: 'TIGRES AGILS', membres: ['A', 'B'] }).error, 'existeix', 'no es pot crear un equip que ja existeix');
assert.strictEqual(crida({ accio: 'creaEquip', nom: 'X', membres: ['A', 'B'] }).error, 'nom-curt');
assert.strictEqual(crida({ accio: 'creaEquip', nom: 'Lleons', membres: ['A'] }).error, 'pocs-membres');
assert.strictEqual(crida({ accio: 'creaEquip', nom: 'Lleons', membres: ['A', 'B', 'C', 'D', 'E'] }).error, 'massa-membres');
assert.strictEqual(crida({ accio: 'recuperaEquip', nom: 'Lleons' }).error, 'no-existeix');
assert.strictEqual(crida({ accio: 'recuperaEquip', nom: 'tigres agils' }).equip.id, tigres);
assert.strictEqual(crida({ accio: 'afegeixMembre', equip: tigres, membre: 'PAU R.' }).error, 'repetit');
assert.deepStrictEqual(crida({ accio: 'afegeixMembre', equip: tigres, membre: 'Joan T.' }).equip.membres, ['Aina M.', 'Pau R.', 'Joan T.']);
assert(crida({ accio: 'afegeixMembre', equip: tigres, membre: 'Nil P.' }).ok);
assert.strictEqual(crida({ accio: 'afegeixMembre', equip: tigres, membre: 'Cinquè' }).error, 'massa-membres');

const partida = (id, missio, guanyada, errors, marge) => ({ id, equip: tigres, missio, guanyada, errors, marge, agent: 'Aina M.', guia: 'Pau R.', versio: R.VERSIO });
r = crida({ accio: 'desaPartides', equip: tigres, partides: [partida('p1', '1.1', true, 1, 80), partida('p2', '1.1', true, 0, 20), partida('p3', '1.1', true, 0, 50), partida('p4', '1.2', false, 3, 0)] });
assert.deepStrictEqual(r.equip.millors, { 1.1: { errors: 0, marge: 50 } });
// Si una partida arriba dues vegades (una connexió que cau), només compta una.
r = crida({ accio: 'desaPartides', equip: tigres, partides: [partida('p1', '1.1', true, 1, 80), partida('p5', '9.9', true, 0, 10), partida('p6', '1.3', true, 7, 10), { ...partida('p7', '1.3', true, 0, 10), equip: 'no-hi-es' }] });
assert.strictEqual(g.files('Partides').length - 1, 4, 'ni repetides, ni missions que no existeixen, ni dades impossibles, ni equips que no existeixen');
assert.deepStrictEqual(r.desades, ['p1', 'p5', 'p6', 'p7'], "el navegador sap que pot treure-les totes de la cua");

// Professorat: sense la clau bona no es pot llegir ni esborrar res.
assert.strictEqual(crida({ accio: 'tauler' }).error, 'clau');
assert.strictEqual(crida({ accio: 'tauler', clau: 'dolenta' }).error, 'clau');
assert.strictEqual(crida({ accio: 'esborraEquip', equip: tigres }).error, 'clau');
const t = crida({ accio: 'tauler', clau: 'clau-de-prova' });
assert.deepStrictEqual(t.equips[0].intents, { 1.1: 3, 1.2: 1 }, 'el tauler sí que veu els intents');
assert.strictEqual(t.partides.length, 4);
assert.strictEqual(creaGoogle({ clau: null }).crida({ accio: 'tauler', clau: '' }).error, 'clau', 'sense clau posada, el tauler no obre');

// El full: textos com a text (1.1 no es torna un nombre), noms que no es converteixen en fórmules, i la pestanya Millors.
const lleons = crida({ accio: 'creaEquip', nom: '=HYPERLINK("x")', membres: ['A', 'B'] }).equip.id;
assert(g.pestanyes.Equips.cel.some((f) => f[1] === '=HYPERLINK("x")'), "el nom es guarda tal qual, com a text (amb l'apòstrof, el full no el llegeix com a fórmula)");
const fp = g.files('Partides');
assert.deepStrictEqual(fp[0], ['Id', 'Data', 'Id equip', 'Equip', 'Missió', 'Guanyada', 'Errors', 'Marge (s)', 'Agent', 'Guia', 'Versió regles']);
assert.strictEqual(fp[1][4], '1.1');
const millors = g.files('Millors');
assert.deepStrictEqual(millors[0].slice(0, 4), ['Equip', 'Membres', 'Superades', '1.1']);
const filaT = millors.find((f) => f[0] === 'Tigres Àgils');
assert.strictEqual(filaT[3], '0:50 · 0 err');
assert.strictEqual(filaT[filaT.length - 1], 4, 'partides jugades');

// Fusionar i esborrar.
crida({ accio: 'desaPartides', equip: lleons, partides: [{ ...partida('q1', '1.3', true, 0, 99), equip: lleons }] });
r = crida({ accio: 'fusiona', de: lleons, a: tigres, clau: 'clau-de-prova' });
assert(r.ok && r.equip.millors['1.3']);
assert.strictEqual(crida({ accio: 'recuperaEquip', nom: '=HYPERLINK("x")' }).error, 'no-existeix');
assert(crida({ accio: 'esborraPartida', id: 'p4', clau: 'clau-de-prova' }).ok);
assert.strictEqual(crida({ accio: 'tauler', clau: 'clau-de-prova' }).partides.length, 4);
assert(crida({ accio: 'esborraEquip', equip: tigres, clau: 'clau-de-prova' }).ok);
assert.strictEqual(g.files('Equips').length, 1, 'només la capçalera');
assert.strictEqual(g.files('Partides').length, 1);
// Peticions estranyes: no peta, contesta un error.
assert.strictEqual(JSON.parse(g.post('no és json')).error, 'servidor');
assert.strictEqual(crida({ accio: 'res' }).error, 'accio');
// Moltes partides: el full creix quan cal.
const g2 = creaGoogle();
const e2 = g2.crida({ accio: 'creaEquip', nom: 'Molts', membres: ['A', 'B'] }).equip.id;
g2.crida({ accio: 'desaPartides', equip: e2, partides: Array.from({ length: 1200 }, (_, i) => ({ id: `m${i}`, equip: e2, missio: '1.1', guanyada: i % 2 === 0, errors: 1, marge: i % 300 })) });
assert.strictEqual(g2.files('Partides').length, 1201);
assert.deepStrictEqual(g2.crida({ accio: 'recuperaEquip', nom: 'molts' }).equip.millors['1.1'], { errors: 1, marge: 298 });
console.log("Apps Script: equips sense repetits (ni per majúscules ni accents), partides sense duplicats, millors, tauler amb clau, fusionar i esborrar.");

// apps-script/Codi.gs és al dia: és el que s'enganxa al full.
assert.strictEqual(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Codi.gs'), 'utf8'), codi(), 'cal tornar a fer apps-script/Codi.gs: node scripts/apps-script.js');

// Codis ocults: al repositori només hi ha les empremtes.
const codis = fs.readFileSync(path.join(__dirname, '..', 'site', 'comu', 'codis.js'), 'utf8');
const c = JSON.parse(codis.slice(codis.indexOf('{'), codis.lastIndexOf('}') + 1));
assert.deepStrictEqual(Object.keys(c), ['sal', 'obre', 'demo', 'tauler']);
assert(['obre', 'demo', 'tauler'].every((k) => /^[0-9a-f]{64}$/.test(c[k])) && new Set([c.obre, c.demo, c.tauler]).size === 3);
assert.strictEqual(empremta('s', 'Obre-la  CAIXA'), empremta('s', 'obre la caixa'), 'els codis es comparen sense majúscules ni guions');
console.log('Codis: al repositori només hi ha les empremtes.');
console.log('Dades correctes.');
