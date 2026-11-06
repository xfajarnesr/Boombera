// Juga partides reals al navegador i comprova el manual.
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const R = require('../site/comu/regles.js');
const http = require('http');
const fs = require('fs');
const SITE = path.join(__dirname, '..', 'site');
const TIPUS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const servidor = http.createServer((q, r) => {
  let f = path.join(SITE, decodeURIComponent(q.url.split('?')[0]));
  if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': TIPUS[path.extname(f)] || 'application/octet-stream' }); r.end(d);
  });
});
const CAPTURES = process.env.CAPTURES;
const proves = Object.fromEntries(R.MODULS.map((m) => [m, require(`./moduls/${m}.js`)]));
const llegeix = async (p, moduls = R.MODULS) => {
  const base = await p.evaluate(() => ({
    numero: Number(document.querySelector('#serie').textContent.split('-')[1]),
    piles: Number(document.querySelector('#piles').dataset.n),
    indicadors: [...document.querySelectorAll('.indicador')].map((i) => ({ ences: i.dataset.ences === 'true' })),
  }));
  for (const m of moduls) Object.assign(base, await proves[m].llegeix(p));
  return base;
};
const total = (p) => p.evaluate(() => Number(document.querySelector('#temps').dataset.total));
const fusibles = (p) => p.evaluate(() => Number(document.querySelector('#errors').dataset.n));
const fet = (p, m) => p.evaluate((x) => document.querySelector('#fets').dataset[x] === 'true', m);
const captura = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };
const nivell = async (p, n) => { await p.waitForSelector('.nivell'); await p.click(`.nivell[data-nivell="${n}"]`); await p.waitForTimeout(senseAnim); };
const senseAnim = 150;

(async () => {
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const url = `${base}/index.html`;
  const urlManual = `${base}/manual/index.html`;
  const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await nav.newContext({ viewport: CAPTURES ? { width: 1366, height: 768 } : { width: 960, height: 540 } });
  const p = await ctx.newPage();
  // A les proves no hi ha targeta gràfica: es dibuixa poc perquè el rellotge no vagi carregat,
  // i es pot saltar temps per comprovar el final de la partida.
  await ctx.addInitScript(() => {
    window.__ms = 2000;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => setTimeout(() => raf(f), window.__ms);
    const ara = performance.now.bind(performance); let salt = 0; let fix = null;
    performance.now = () => (fix !== null ? fix + salt : ara() + salt);
    window.__salta = (ms) => { salt += ms; };
    window.__atura = () => { fix = ara(); };
    window.__segueix = () => { salt += fix - ara(); fix = null; };
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForSelector('.nivell', { timeout: 60000 });
  await p.waitForTimeout(1500);
  await captura(p, 'inici');
  assert.strictEqual(await p.locator('.nivell').count(), R.NIVELLS.length);

  // Cada nivell arrenca amb el seu temps i es pot guanyar sense errors, amb tots els seus mòduls.
  for (let k = 0; k < 2 * R.NIVELLS.length; k++) {
    const n = k % R.NIVELLS.length;
    const { moduls } = R.NIVELLS[n];
    await nivell(p, n);
    const inicial = await total(p);
    assert(inicial <= R.NIVELLS[n].segons && inicial >= R.NIVELLS[n].segons - 15, `temps del nivell: ${inicial}`);
    assert.strictEqual(await p.locator('#fets').evaluate((f, m) => m.every((x) => f.dataset[x] === 'false'), moduls), true);
    const b = await llegeix(p, moduls);
    await p.waitForTimeout(1300);
    if (n === R.NIVELLS.length - 1 && k < R.NIVELLS.length) await captura(p, 'joc');
    for (const m of [...moduls].sort(() => Math.random() - 0.5)) {
      assert.strictEqual(await fet(p, m), false);
      await proves[m].resol(p, R, b);
      await p.waitForFunction((x) => document.querySelector('#fets').dataset[x] === 'true', m, { timeout: 8000 })
        .catch(async (e) => { throw new Error(`${m} no queda resolt al nivell ${n + 1} (errors: ${await fusibles(p)}, fase: ${await p.evaluate(() => document.body.dataset.fase)}): ${e.message}`); });
    }
    await p.waitForFunction(() => document.body.dataset.fase === 'salvada', null, { timeout: 8000 });
    assert.strictEqual(await fusibles(p), 0);
  }
  await p.waitForTimeout(400);
  await captura(p, 'guanya');
  let q;
  const SIS = R.NIVELLS.findIndex((n) => n.moduls.length === 6 && ['contrasenya', 'simbols'].every((m) => n.moduls.includes(m)));
  assert(SIS >= 0, "hi ha d'haver un nivell de sis mòduls amb contrasenya i símbols");
  assert(R.MODULS.every((m) => R.NIVELLS.some((n) => n.moduls.includes(m))), 'tots els mòduls es juguen en algun nivell');
  console.log(`${2 * R.NIVELLS.length} partides guanyades sense errors, amb els ${R.MODULS.length} mòduls.`);

  // Contrasenya: enviar una paraula equivocada és error i no mou les lletres, i la bona resol el mòdul.
  await nivell(p, SIS);
  await p.waitForTimeout(800);
  q = await llegeix(p, R.NIVELLS[SIS].moduls);
  const rodets = await proves.contrasenya.llegeixRodets(p, R);
  const bona = proves.contrasenya.oracle(rodets, q.numero);
  const altra = proves.contrasenya.possibles(rodets).find((w) => w !== bona);
  await proves.contrasenya.escriu(p, R, rodets, altra);
  await p.locator('.envia-contrasenya').click();
  assert.strictEqual(await fusibles(p), 1, "l'altra paraula possible és un error");
  assert.strictEqual(await fet(p, 'contrasenya'), false);
  assert.strictEqual(await proves.contrasenya.actual(p), altra, 'les lletres es queden com estaven');
  await proves.contrasenya.escriu(p, R, rodets, bona);
  await p.locator('.envia-contrasenya').click();
  assert.strictEqual(await fet(p, 'contrasenya'), true);
  console.log("Contrasenya: l'altra paraula és error, i les lletres es queden.");

  // Símbols: una placa fora d'ordre és error i la seqüència torna a començar.
  const plaques = await proves.simbols.llegeixPlaques(p);
  const ordrePl = proves.simbols.oracle(plaques);
  await p.locator(`.placa[data-i="${ordrePl[0]}"]`).click();
  await p.locator(`.placa[data-i="${ordrePl[2]}"]`).click();
  assert.strictEqual(await fusibles(p), 2);
  assert.strictEqual(await p.evaluate(() => document.body.dataset.fase), 'petada', 'el nivell de sis mòduls peta amb 2 errors');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });
  await nivell(p, SIS);
  await p.waitForTimeout(800);
  const pl2 = await proves.simbols.llegeixPlaques(p);
  const o2 = proves.simbols.oracle(pl2);
  await p.locator(`.placa[data-i="${o2[0]}"]`).click();
  await p.locator(`.placa[data-i="${o2[2]}"]`).click();
  assert.strictEqual(await fusibles(p), 1);
  assert.strictEqual(await fet(p, 'simbols'), false);
  await proves.simbols.resol(p);
  assert.strictEqual(await fet(p, 'simbols'), true);
  console.log('Símbols: un error fa tornar a començar, i es pot acabar resolent.');
  await p.evaluate(() => { window.__salta(600000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });

  // Senyal i laberint: un canal equivocat és error i no toca el visor; topar amb una paret és error i la llum no es mou.
  const LM = R.NIVELLS.findIndex((n) => ['laberint', 'morse'].every((m) => n.moduls.includes(m)));
  const Lab = proves.laberint;
  const juga = async () => {
    await p.waitForSelector('.nivell');
    await p.click(`.nivell[data-nivell="${LM}"]`);
    await p.waitForFunction(() => document.body.dataset.fase === 'joc' && document.querySelector('#laberint') && document.querySelector('#morse'));
    return llegeix(p, R.NIVELLS[LM].moduls);
  };
  // Camina cap a la sortida fins a una casella amb alguna paret, i hi topa.
  const topa = async (piles) => {
    const v = await Lab.vista(p);
    const { idx, sortida } = Lab.oracle(v.marques, piles);
    const pas = Lab.passadissos(R.LABERINTS[idx].files);
    const paretDe = (c) => Object.keys(R.DIRECCIONS).find((d) => { const w = Lab.salta(c, d); return !w || !pas.has(`${c}>${w}`); });
    const cami = Lab.cami(R.LABERINTS[idx].files, v.pos, sortida);
    let pos = v.pos;
    for (let k = 0; !paretDe(pos); k++) {
      assert(k < cami.length - 1, 'el camí no té cap paret abans de la sortida');
      await Lab.mou(p, cami[k]); pos = Lab.salta(pos, cami[k]);
    }
    assert.strictEqual((await Lab.vista(p)).pos, pos);
    await Lab.mou(p, paretDe(pos));
    return pos;
  };
  q = await juga();
  await captura(p, 'laberint-morse');
  const paraulaMorse = proves.morse.desxifra(await proves.morse.observa(p));
  const canalBo = proves.morse.oracle(paraulaMorse, q.numero, q.piles);
  await proves.morse.posaCanal(p, (canalBo + 1) % 100);
  await p.locator('.envia-canal').dispatchEvent('click');
  assert.strictEqual(await fusibles(p), 1, 'un canal equivocat és error');
  assert.strictEqual(await fet(p, 'morse'), false);
  assert.strictEqual(await proves.morse.canal(p), (canalBo + 1) % 100, 'el visor es queda com estava');
  await proves.morse.posaCanal(p, canalBo);
  await p.locator('.envia-canal').dispatchEvent('click');
  assert.strictEqual(await fet(p, 'morse'), true);
  await topa(q.piles);
  assert.strictEqual(await fusibles(p), 2);
  await p.waitForFunction(() => document.body.dataset.fase === 'petada');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });
  q = await juga();
  const contra = await topa(q.piles);
  assert.strictEqual(await fusibles(p), 1, 'topar amb una paret és error');
  assert.strictEqual((await Lab.vista(p)).pos, contra, 'la llum es queda on era');
  assert.strictEqual(await fet(p, 'laberint'), false);
  await Lab.resol(p, R, q);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.laberint === 'true');
  console.log('Senyal: un canal equivocat és error. Laberint: una paret és error i la llum no es mou. Tots dos es resolen.');
  await p.evaluate(() => { window.__salta(600000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });

  // Seqüència: una tecla equivocada és error, repeteix la ronda, i els salts pugen també amb errors d'altres mòduls.
  const QUATRE = R.NIVELLS.findIndex((n) => n.moduls.length === 4);
  await nivell(p, QUATRE);
  await p.waitForTimeout(1300);
  q = await llegeix(p, R.NIVELLS[QUATRE].moduls);
  let f = await proves.sequencia.observa(p);
  await captura(p, 'sequencia-flaix');
  assert.strictEqual(f.length, R.SEQUENCIA.rondes[0]);
  const bona0 = proves.sequencia.oracle(f[0], q.piles, 0, q.numero);
  const dolentaSeq = R.SEQUENCIA.anell.find((c) => c !== bona0);
  await p.locator(`.tecla-seq[data-color="${dolentaSeq}"]`).click();
  assert.strictEqual(await fusibles(p), 1);
  assert.strictEqual(await fet(p, 'sequencia'), false);
  const repetits = await proves.sequencia.observa(p);
  assert.deepStrictEqual(repetits, f, 'la ronda es repeteix amb els mateixos flaixos');
  await proves.sequencia.resol(p, R, q);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.sequencia === 'true');
  assert.strictEqual(await fusibles(p), 1);
  console.log('Seqüència: un error repeteix la ronda i el salt nou resol el mòdul.');

  // Memòria: una tecla equivocada a l'etapa 2 és error i torna a l'etapa 1 amb la mateixa pantalla.
  const mem = () => p.evaluate(() => ({ pantalla: Number(document.querySelector('#pantalla-mem').dataset.valor), etapa: Number(document.querySelector('#pantalla-mem').dataset.etapa), ordre: [...document.querySelectorAll('.tecla-mem')].map((k) => Number(k.dataset.valor)) }));
  await proves.cables.resol(p, R, q);
  await proves.boto.resol(p, R, q);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.boto === 'true', null, { timeout: 8000 });
  const m0 = await mem();
  const pos0 = proves.memoria.oracle(0, m0.pantalla, m0.ordre, []);
  await p.locator(`.tecla-mem[data-i="${pos0}"]`).click();
  const m1 = await mem();
  assert.strictEqual(m1.etapa, 1);
  await captura(p, 'memoria');
  assert.notStrictEqual(m1.ordre.join(), m0.ordre.join(), 'les tecles canvien de lloc');
  const pos1 = proves.memoria.oracle(1, m1.pantalla, m1.ordre, [{ valor: m0.ordre[pos0], posicio: pos0 }]);
  await p.locator(`.tecla-mem[data-i="${(pos1 + 1) % 4}"]`).click();
  assert.strictEqual(await fusibles(p), 2, 'la memòria suma un error i el nivell peta amb 2');
  assert.strictEqual(await p.evaluate(() => document.body.dataset.fase), 'petada');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });
  await nivell(p, QUATRE);
  await p.waitForTimeout(800);
  const n0 = await mem();
  const npos0 = proves.memoria.oracle(0, n0.pantalla, n0.ordre, []);
  await p.locator(`.tecla-mem[data-i="${npos0}"]`).click();
  const n1 = await mem();
  const npos1 = proves.memoria.oracle(1, n1.pantalla, n1.ordre, [{ valor: n0.ordre[npos0], posicio: npos0 }]);
  await p.locator(`.tecla-mem[data-i="${(npos1 + 1) % 4}"]`).click();
  assert.strictEqual(await fusibles(p), 1);
  assert.deepStrictEqual(await mem(), n0, 'torna a la mateixa etapa 1');
  q = await llegeix(p, R.NIVELLS[QUATRE].moduls);
  await proves.memoria.resol(p, R);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.memoria === 'true');
  console.log("Memòria: un error torna a l'etapa 1 amb les mateixes pantalles, i es pot acabar resolent.");
  await p.evaluate(() => { window.__salta(600000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });
  await nivell(p, 1);
  await p.waitForTimeout(600);
  const totesSeq = await p.locator('.tecla-mem').count();
  assert.strictEqual(totesSeq, 0, 'un nivell sense memòria no porta les seves tecles');

  // Un error resta 30 s i no resol el mòdul.
  await p.waitForTimeout(700);
  let b = await llegeix(p, R.NIVELLS[1].moduls);
  const dolent = b.cables.findIndex((_, i) => i !== R.solucioCables(b));
  const t0 = await total(p);
  await p.locator(`.cable[data-i="${dolent}"]`).click();
  const t1 = await total(p);
  assert.strictEqual(await fusibles(p), 1);
  assert(t0 - t1 >= 29 && t0 - t1 <= 45, `penalització ${t0 - t1}`);
  assert.strictEqual(await fet(p, 'cables'), false);
  await captura(p, 'error');
  console.log(`Un error resta ${t0 - t1} s.`);

  // Fer el contrari del que toca al botó és error.
  await p.locator('#boto').hover();
  await p.mouse.down();
  if (R.solucioBoto(b) === 'clic') {
    await p.waitForFunction(() => document.querySelector('#llum').dataset.color);
    await p.waitForTimeout(150);
    await captura(p, 'llum');
  }
  await p.mouse.up();
  assert.strictEqual(await fusibles(p), 2);
  console.log("Fer l'acció contrària al botó és error.");

  // Tercer error: explota.
  await p.evaluate(() => { window.__ms = 0; });
  const altre = b.cables.findIndex((_, i) => i !== R.solucioCables(b) && i !== dolent);
  await p.locator(`.cable[data-i="${altre}"]`).click();
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  await p.waitForTimeout(350);
  await captura(p, 'petada-1');
  await p.waitForTimeout(1200);
  await captura(p, 'petada-2');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });
  await p.waitForTimeout(600);
  await captura(p, 'petada-3');
  assert.strictEqual(await p.textContent('#nota-titol'), 'Ha petat');
  console.log('El tercer error fa petar la bomba.');

  await p.evaluate(() => { window.__ms = 2000; });

  // Quan queda poc temps tot es torna vermell, i a 0:00 peta.
  await nivell(p, 0);
  await p.waitForTimeout(1300);
  await p.evaluate((d) => { window.__ms = 0; window.__salta((d - 12) * 1000); }, R.NIVELLS[0].segons);
  await p.waitForTimeout(1500);
  assert((await total(p)) <= 12, 'el salt de temps');
  await captura(p, 'tensio');
  // Espera el canvi de color, perquè les màquines lentes poden trigar uns quants fotogrames.
  await p.waitForFunction(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--alarma')) > 0, null, { timeout: 15000 })
    .catch(() => assert.fail('alarma activa'));
  await p.evaluate(() => { window.__ms = 2000; window.__salta(13000); });
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });
  assert((await p.textContent('#nota-text')).includes("S'ha acabat el temps"));
  console.log('A 0:00 la bomba peta.');

  // El nivell 3 peta amb menys errors.
  const lim = R.NIVELLS[2].errors;
  await nivell(p, 2);
  await p.waitForTimeout(1300);
  b = await llegeix(p, R.NIVELLS[2].moduls);
  const dolents = b.cables.map((_, i) => i).filter((i) => i !== R.solucioCables(b)).slice(0, lim);
  for (const i of dolents) await p.locator(`.cable[data-i="${i}"]`).click();
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  console.log(`El nivell 3 peta amb ${lim} errors.`);
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });

  // Teclat: es pot tallar sense ratolí.
  await nivell(p, 0);
  await p.waitForTimeout(1300);
  b = await llegeix(p, R.NIVELLS[0].moduls);
  await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).focus();
  await p.keyboard.press('Enter');
  assert.strictEqual(await fet(p, 'cables'), true);
  console.log('El teclat funciona per tallar.');

  // El joc no enllaça el manual.
  assert.strictEqual(await p.locator('a[href*="manual"]').count(), 0, 'el joc no ha d\'enllaçar el manual');

  // El manual surt de les dades, no porta la llista de primers i cap en cinc pàgines A4.
  await p.setViewportSize({ width: 1000, height: 1200 });
  await p.goto(urlManual);
  await p.waitForTimeout(200);
  const text = await p.textContent('#vista-manual');
  for (const r of R.REGLES_CABLES) assert(text.includes(r.pregunta), r.pregunta);
  for (const r of R.REGLES_BOTO) assert(text.includes(r.condicio), r.condicio);
  for (const l of Object.values(R.LLUMS)) assert(text.includes(l.text), l.text);
  for (const n of R.NIVELLS) assert(text.includes(n.nom), n.nom);
  for (const c of R.SEQUENCIA.anell) assert(text.includes(c), c);
  for (const c of Object.values(R.CATEGORIES_MEMORIA)) assert(text.includes(c), c);
  for (const f of R.REGLES_MEMORIA) for (const a of Object.values(f)) assert(text.includes(R.textMemoria(a)), R.textMemoria(a));
  for (const w of R.CONTRASENYA.paraules) assert(text.includes(w), w);
  for (const s of R.SIMBOLS) assert(text.includes(String(s.valor)), s.id);
  for (const w of R.MORSE.paraules) assert(text.includes(w.paraula) && text.includes(String(w.canal)), w.paraula);
  assert.strictEqual(await p.locator('.morse-alfabet > div').count(), 26);
  assert.strictEqual(await p.locator('svg.laberint').count(), R.LABERINTS.length);
  assert.strictEqual(await p.locator('svg.laberint .marca').count(), 2 * R.LABERINTS.length);
  assert.strictEqual(await p.locator('svg.laberint .sortida').count(), 4 * R.LABERINTS.length);
  assert.strictEqual(await p.locator('.simbol .nom-simbol').count(), 0, 'el manual no posa nom als símbols');
  assert.strictEqual(await p.locator('.simbol svg path').count(), R.SIMBOLS.length);
  assert(!/2, 3, 5(,| i) 7/.test(text), 'el manual no ha de portar la llista de primers');
  assert(text.includes(`v${R.VERSIO}`) && !text.includes('v1'), 'la versió ha de sortir de les regles');
  const FULLS = 5;
  assert.strictEqual(await p.locator('.full').count(), FULLS);
  for (let k = 0; k < FULLS; k++) {
    const sobra = await p.locator('.full').nth(k).evaluate((f) => { const peu = f.querySelector('.peu-full').getBoundingClientRect(); const ant = f.querySelector('.peu-full').previousElementSibling.getBoundingClientRect(); return peu.top - ant.bottom; });
    assert(sobra >= -1, `full ${k + 1}: el contingut xoca amb el peu`);
  }
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(pdf);
  assert.strictEqual(doc.getPageCount(), FULLS, `el manual ha de tenir ${FULLS} pàgines`);
  await p.emulateMedia({ media: 'print' });
  for (let k = 0; k < FULLS; k++) {
    const fora = await p.locator('.full').nth(k).evaluate((f) => f.scrollHeight - f.clientHeight);
    assert(fora <= 1, `full ${k + 1} es talla en imprimir: ${fora}px`);
  }
  await p.emulateMedia({ media: 'screen' });
  console.log(`El manual té ${FULLS} pàgines A4.`);

  assert.deepStrictEqual(errs, [], 'errors de consola: ' + errs.join('; '));
  await nav.close();
  servidor.close();
  console.log('Tot correcte.');
})().catch((e) => { console.error(e); process.exit(1); });
