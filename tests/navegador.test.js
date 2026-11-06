// Juga partides reals al navegador i comprova el manual.
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const R = require('../site/comu/regles.js');
const SITE = path.join(__dirname, '..', 'site');
const url = 'file://' + path.join(SITE, 'index.html');
const urlManual = 'file://' + path.join(SITE, 'manual', 'index.html');

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
const temps = (p) => p.evaluate(() => document.querySelector('#timer-svg').dataset.temps);
const toSec = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
const fusibles = (p) => p.locator('.fusible.cremat').count();

async function resolBoto(p, b) {
  const box = await p.locator('#boto').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  if (R.solucioBoto(b) === 'clic') { await p.mouse.up(); return; }
  await p.waitForFunction(() => document.querySelector('#llum').dataset.color);
  const llum = await p.evaluate(() => document.querySelector('#llum').dataset.color);
  for (;;) {
    const s = toSec(await temps(p)) % 60;
    if (R.LLUMS[llum].test(s)) break;
    await p.waitForTimeout(40);
  }
  await p.mouse.up();
}

(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 700 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForTimeout(250);

  // Partides guanyades amb les solucions calculades a partir del que es veu a la pantalla.
  let manten = 0, clics = 0;
  for (let k = 0; k < 6; k++) {
    await p.click('#comenca');
    const b = await llegeix(p);
    await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).click();
    assert.strictEqual(await p.locator('#mod-cables.fet').count(), 1);
    if (R.solucioBoto(b) === 'clic') clics++; else manten++;
    await resolBoto(p, b);
    await p.waitForSelector('#bomba.salvada', { timeout: 3000 });
    assert.strictEqual(await fusibles(p), 0);
  }
  console.log(`6 partides guanyades sense errors (${clics} amb clic, ${manten} mantenint).`);

  // Un error resta 30 s, encén un fusible i no resol el mòdul.
  await p.click('#comenca');
  let b = await llegeix(p);
  const dolent = b.cables.findIndex((_, i) => i !== R.solucioCables(b));
  const t0 = toSec(await temps(p));
  await p.locator(`.cable[data-i="${dolent}"]`).click();
  const t1 = toSec(await temps(p));
  assert.strictEqual(await fusibles(p), 1);
  assert(t0 - t1 >= 29 && t0 - t1 <= 32, `penalització ${t0 - t1}`);
  assert.strictEqual(await p.locator('#mod-cables.fet').count(), 0);
  await p.waitForTimeout(100);
  console.log(`Un error resta ${t0 - t1} s i encén un fusible.`);

  // Mantenir quan tocava clic, o clic quan tocava mantenir, és error.
  const box = await p.locator('#boto').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  if (R.solucioBoto(b) === 'clic') {
    await p.waitForFunction(() => document.querySelector('#llum').dataset.color);
  }
  await p.mouse.up();
  assert.strictEqual(await fusibles(p), 2);
  console.log('Fer l’acció contrària al botó és error.');

  // Tercer error: explota.
  const altre = (await llegeix(p)).cables.findIndex((_, i) => i !== R.solucioCables(b) && i !== dolent);
  await p.locator(`.cable[data-i="${altre}"]`).click();
  await p.waitForSelector('#bomba.petada', { timeout: 2000 });
  await p.waitForTimeout(600);
  assert((await p.textContent('#nota-titol')) === 'Ha petat');
  console.log('El tercer error fa petar la bomba.');

  // Teclat: es pot tallar i prémer sense ratolí.
  await p.click('#comenca');
  b = await llegeix(p);
  await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).focus();
  await p.keyboard.press('Enter');
  assert.strictEqual(await p.locator('#mod-cables.fet').count(), 1);
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
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(pdf);
  assert.strictEqual(doc.getPageCount(), 2, 'el manual ha de tenir 2 pàgines');
  console.log('El manual té 2 pàgines A4.');

  assert.deepStrictEqual(errs, [], 'errors de consola: ' + errs.join('; '));
  await nav.close();
  console.log('Tot correcte.');
})().catch((e) => { console.error(e); process.exit(1); });
