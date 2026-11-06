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
const llegeix = (p) => p.evaluate(() => {
  const serie = document.querySelector('#serie').textContent;
  return {
    numero: Number(serie.split('-')[1]),
    piles: Number(document.querySelector('#piles').dataset.n),
    cables: [...document.querySelectorAll('.cable')].map((c) => c.dataset.color),
    indicadors: [...document.querySelectorAll('.indicador')].map((i) => ({ ences: i.dataset.ences === 'true' })),
    boto: { color: document.querySelector('#boto').dataset.color, paraula: document.querySelector('#boto').textContent },
  };
});
const total = (p) => p.evaluate(() => Number(document.querySelector('#temps').dataset.total));
const fusibles = (p) => p.evaluate(() => Number(document.querySelector('#errors').dataset.n));
const fet = (p, m) => p.evaluate((x) => document.querySelector('#fets').dataset[x] === 'true', m);
const captura = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };
const nivell = async (p, n) => { await p.waitForSelector('.nivell'); await p.click(`.nivell[data-nivell="${n}"]`); await p.waitForTimeout(senseAnim); };
const senseAnim = 150;

async function resolBoto(p, b) {
  const box = await p.locator('#boto').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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
}

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

  // Cada nivell arrenca amb el seu temps i es pot guanyar sense errors.
  let manten = 0, clics = 0;
  for (let k = 0; k < 6; k++) {
    const n = k % R.NIVELLS.length;
    await nivell(p, n);
    const inicial = await total(p);
    assert(inicial <= R.NIVELLS[n].segons && inicial >= R.NIVELLS[n].segons - 15, `temps del nivell: ${inicial}`);
    const b = await llegeix(p);
    await p.waitForTimeout(1300);
    if (k === 0) await captura(p, 'joc');
    await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).click();
    assert.strictEqual(await fet(p, 'cables'), true);
    if (R.solucioBoto(b) === 'clic') clics++; else manten++;
    await resolBoto(p, b);
    await p.waitForFunction(() => document.body.dataset.fase === 'salvada', null, { timeout: 8000 }).catch(async (e) => {
      console.log('Estat:', JSON.stringify(b), R.solucioBoto(b), await p.evaluate(() => ({ err: document.querySelector('#errors').textContent, f: { ...document.querySelector('#fets').dataset }, t: document.querySelector('#temps').textContent, fase: document.body.dataset.fase, llum: document.querySelector('#llum').textContent, box: document.querySelector('#boto').getBoundingClientRect().toJSON() })));
      throw e;
    });
    assert.strictEqual(await fusibles(p), 0);
  }
  await p.waitForTimeout(400);
  await captura(p, 'guanya');
  console.log(`6 partides guanyades sense errors (${clics} amb clic, ${manten} mantenint).`);

  // Un error resta 30 s i no resol el mòdul.
  await nivell(p, 1);
  await p.waitForTimeout(1300);
  let b = await llegeix(p);
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
  const box = await p.locator('#boto').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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
  await p.evaluate(() => { window.__ms = 0; window.__salta((240 - 12) * 1000); });
  await p.waitForTimeout(1500);
  assert((await total(p)) <= 12, 'el salt de temps');
  await captura(p, 'tensio');
  const vermell = await p.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--alarma')));
  assert(vermell > 0, 'alarma activa');
  await p.evaluate(() => { window.__ms = 2000; window.__salta(13000); });
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });
  assert((await p.textContent('#nota-text')).includes("S'ha acabat el temps"));
  console.log('A 0:00 la bomba peta.');

  // El nivell 3 peta amb menys errors.
  const lim = R.NIVELLS[2].errors;
  await nivell(p, 2);
  await p.waitForTimeout(1300);
  b = await llegeix(p);
  const dolents = b.cables.map((_, i) => i).filter((i) => i !== R.solucioCables(b)).slice(0, lim);
  for (const i of dolents) await p.locator(`.cable[data-i="${i}"]`).click();
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  console.log(`El nivell 3 peta amb ${lim} errors.`);
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 8000 });

  // Teclat: es pot tallar sense ratolí.
  await nivell(p, 0);
  await p.waitForTimeout(1300);
  b = await llegeix(p);
  await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).focus();
  await p.keyboard.press('Enter');
  assert.strictEqual(await fet(p, 'cables'), true);
  console.log('El teclat funciona per tallar.');

  // El joc no enllaça el manual.
  assert.strictEqual(await p.locator('a[href*="manual"]').count(), 0, 'el joc no ha d\'enllaçar el manual');

  // El manual surt de les dades i cap en dues pàgines A4.
  await p.setViewportSize({ width: 1000, height: 1200 });
  await p.goto(urlManual);
  await p.waitForTimeout(200);
  const text = await p.textContent('#vista-manual');
  for (const r of R.REGLES_CABLES) assert(text.includes(r.pregunta), r.pregunta);
  for (const r of R.REGLES_BOTO) assert(text.includes(r.condicio), r.condicio);
  for (const l of Object.values(R.LLUMS)) assert(text.includes(l.text), l.text);
  for (const n of R.NIVELLS) assert(text.includes(n.nom), n.nom);
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(pdf);
  assert.strictEqual(doc.getPageCount(), 2, 'el manual ha de tenir 2 pàgines');
  console.log('El manual té 2 pàgines A4.');

  assert.deepStrictEqual(errs, [], 'errors de consola: ' + errs.join('; '));
  await nav.close();
  servidor.close();
  console.log('Tot correcte.');
})().catch((e) => { console.error(e); process.exit(1); });
