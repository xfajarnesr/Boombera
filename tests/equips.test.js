// Equips, rols, progrés, codis ocults i tauler, contra l'Apps Script de debò sobre un Google de mentida.
// També es prova el mode sense full de càlcul (les dades només al navegador).
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const { servidor, CAPTURES, proves, quieta, veu, llegeix, captura, fotogrames, R, CODIS_PROVA, rellotge, saltaIntro, ARGS, espera } = require('./ajuda.js');
const { creaGoogle } = require('./fals-google.js');

const GOOGLE = 'https://script.google.com/macros/s/PROVA/exec';
const CLAU = 'clau-de-prova';
const COLUMNES_P = require('../site/dades/nucli.js').COLUMNES.partides;

(async () => {
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const url = `${base}/index.html`;
  const nav = await chromium.launch({ args: ARGS });
  const g = creaGoogle({ clau: CLAU });
  let caigut = false; let peticions = 0;
  const errs = [];
  // Cada context és un ordinador d'aula: el seu navegador, connectat al «full» de mentida.
  async function ordinador({ remot = true, ms = 2000, reduit = false, registraTot = false } = {}) {
    const ctx = await nav.newContext({ viewport: CAPTURES ? { width: 1366, height: 768 } : { width: 960, height: 540 }, reducedMotion: reduit ? 'reduce' : 'no-preference', acceptDownloads: true, serviceWorkers: 'block' });
    await ctx.addInitScript(rellotge(ms) + saltaIntro);
    if (remot) {
      await ctx.route('**/comu/config.js', (rt) => rt.fulfill({ contentType: 'text/javascript', body: `window.BOOMBERA_CONFIG = { servidor: '${GOOGLE}', registraTot: ${registraTot} };` }));
      await ctx.route(`${GOOGLE}*`, (rt) => {
        if (caigut) return rt.abort('internetdisconnected');
        peticions++;
        return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: g.post(rt.request().postData()) });
      });
    }
    return ctx;
  }
  const pagina = async (ctx, adreca = url) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    // Només s'espera el document: després, cada prova espera l'estat que necessita.
    await p.goto(adreca, { waitUntil: 'domcontentloaded', timeout: 60000 });
    return p;
  };
  const panell = (p, nom) => p.waitForFunction((x) => document.body.dataset.panell === x && !document.querySelector('#nota').hidden, nom, { timeout: 60000 });
  const partides = () => g.files('Partides').length - 1;
  const oberts = (p) => p.evaluate(() => [...document.querySelectorAll('.nivell:not(:disabled)')].map((b) => b.dataset.codi));
  const xips = (p) => p.evaluate(() => [...document.querySelectorAll('#lliure-moduls input:not(:disabled)')].map((i) => i.value));
  const text = (p, s) => p.evaluate((x) => document.querySelector(x).textContent, s);
  // Tria una missió, posa els rols i comença. Espera que la càmera hagi acabat d'entrar.
  async function juga(p, codi, rols) {
    await fotogrames(p);
    await p.locator(`.nivell[data-codi="${codi}"]`).click();
    await panell(p, 'rols');
    if (rols) { await p.selectOption('#rol-agent', rols.agent); await p.selectOption('#rol-guia', rols.guia); }
    await p.locator('#rols-comenca').click();
    await p.waitForFunction(() => document.body.dataset.fase === 'joc');
    await quieta(p);
  }
  const petaAra = async (p) => {
    await p.evaluate(() => window.__salta(1200000));
    await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 30000 });
    await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  };
  const codi = async (p, c) => {
    await p.keyboard.press('Control+Alt+KeyB');
    await panell(p, 'codi');
    await p.fill('#codi-text', c);
    await p.locator('#codi button[type="submit"]').click();
  };

  /* ---------- Un equip nou ---------- */
  const A = await ordinador();
  const a = await pagina(A);
  await panell(a, 'entra');
  await quieta(a);
  assert.strictEqual(await a.isVisible('#tria'), false, 'sense equip no es veuen les missions');
  await captura(a, 'equip-entra');
  await a.fill('#nou-nom', ' Tigres  Àgils ');
  const camps = a.locator('#nou-membres input');
  await camps.nth(0).fill('Aina M.');
  await a.locator('#nou-equip button[type="submit"]').click();
  await a.waitForFunction(() => document.querySelector('#entra-avis').dataset.error === 'pocs-membres');
  await camps.nth(1).fill('Pau R.');
  await a.locator('#nou-equip button[type="submit"]').click();
  await panell(a, 'missions');
  assert.strictEqual(await text(a, '#equip-nom'), 'Tigres Àgils');
  assert.strictEqual(await text(a, '#equip-membres'), 'Aina M., Pau R.');
  assert.strictEqual(g.files('Equips').length, 2, "l'equip és al full");
  // Al començar només hi ha la secció 1, i a la missió lliure només els seus mòduls.
  assert.deepStrictEqual(await oberts(a), ['1.1', '1.2', '1.3', '1.4']);
  assert.strictEqual(await a.locator('.nivell[data-bloquejada="true"]').count(), 20);
  assert((await text(a, '.seccio[data-seccio="2"] h3')).includes("Supera'n 3 de la 1"));
  assert.strictEqual(await text(a, '.seccio[data-seccio="1"] .compte'), '0/4');
  await a.locator('.seccio[data-seccio="2"] .nivell').first().dispatchEvent('click');
  assert.strictEqual(await a.evaluate(() => document.body.dataset.panell), 'missions', 'una missió bloquejada no es pot triar');
  await a.locator('#obre-lliure').click();
  await panell(a, 'lliure');
  assert.deepStrictEqual(await xips(a), ['cables', 'boto']);
  await a.locator('#torna-missions').click();
  await panell(a, 'missions');
  await captura(a, 'equip-missions');
  console.log("Equip nou: cal un nom i dues persones. Només hi ha la secció 1 i, a la missió lliure, només els seus mòduls.");

  /* ---------- Rols ---------- */
  await a.locator('.nivell[data-codi="1.1"]').click();
  await panell(a, 'rols');
  const rols = () => a.evaluate(() => ({ agent: document.querySelector('#rol-agent').value, guia: document.querySelector('#rol-guia').value }));
  assert.deepStrictEqual(await rols(), { agent: 'Aina M.', guia: 'Pau R.' });
  await a.locator('#inverteix').click();
  assert.deepStrictEqual(await rols(), { agent: 'Pau R.', guia: 'Aina M.' }, 'els rols es poden invertir');
  await a.locator('#inverteix').click();
  await a.fill('#rols-nou', 'Joan T.');
  await a.locator('#rols-afegeix-boto').click();
  await a.waitForFunction(() => document.querySelectorAll('#rol-agent option').length === 3);
  assert.deepStrictEqual(await rols(), { agent: 'Aina M.', guia: 'Pau R.' }, 'afegir algú no canvia els rols triats');
  assert(g.files('Equips')[1][3].includes('Joan T.'), 'la persona nova és al full');
  await a.selectOption('#rol-guia', 'Aina M.');
  assert.strictEqual(await a.isDisabled('#rols-comenca'), true, 'no pot fer els dos rols la mateixa persona');
  assert((await text(a, '#rols-avis')).includes('diferent'));
  await a.selectOption('#rol-guia', 'Pau R.');
  await captura(a, 'rols');
  await a.locator('#rols-comenca').click();
  await a.waitForFunction(() => document.body.dataset.fase === 'joc');
  await quieta(a);
  console.log("Rols: Agent i Guia, es poden invertir, no pot ser la mateixa persona i s'hi pot afegir algú a l'equip.");

  /* ---------- Una partida guanyada es desa ---------- */
  const b = await llegeix(a, R.NIVELLS[0].moduls);
  for (const { id, nom } of R.instancies(R.NIVELLS[0].moduls)) {
    await veu(a, id);
    await proves[nom].resol(a, R, b.inst[id], id);
    await a.waitForFunction((x) => document.querySelector('#fets').dataset[x] === 'true', id, { timeout: 30000 });
  }
  await a.waitForFunction(() => document.body.dataset.fase === 'salvada', null, { timeout: 30000 });
  await a.waitForFunction(() => !document.querySelector('#nota').hidden);
  await espera(() => partides() === 1, 'la partida guanyada arriba al full');
  const fila = g.files('Partides')[1];
  assert.deepStrictEqual([fila[4], fila[5], fila[6], fila[8], fila[9], fila[10]], ['1.1', true, 0, 'Aina M.', 'Pau R.', R.VERSIO]);
  // Detall per mòdul: quan s'ha resolt cada mòdul i la seqüència de la partida.
  const COLS = require('../site/dades/nucli.js').COLUMNES.partides;
  assert.strictEqual(fila[COLS.indexOf('estat')], 'guanyada');
  assert(Number.isInteger(fila[COLS.indexOf('t_cables')]), `segon en què s'ha resolt: ${fila[COLS.indexOf('t_cables')]}`);
  assert.strictEqual(fila[COLS.indexOf('e_cables')], 0);
  assert(/fet cables .*fet cables-2|fet cables-2 .*fet cables/.test(fila[COLS.indexOf('seq')]), fila[COLS.indexOf('seq')]);
  const nota = await text(a, '#nota-text');
  assert(nota.includes('Missió superada!'), nota);
  // Amb tres persones, qui feia de guia passa a fer d'agent i la següent fa de guia.
  assert(nota.includes('Ara canvieu: Pau R. a la bomba i Joan T. amb el manual.'), nota);
  assert(!/intent/i.test(await text(a, '#nota')), "els alumnes no veuen els intents");
  await a.waitForFunction(() => document.querySelector('.nivell[data-codi="1.1"]').dataset.superada === 'true');
  const marge = Number(fila[7]);
  assert.strictEqual(await a.getAttribute('.nivell[data-codi="1.1"] .millor', 'data-marge'), String(marge));
  assert.strictEqual(await text(a, '.seccio[data-seccio="1"] .compte'), '1/4');
  await captura(a, 'equip-guanya');
  console.log(`Partida guanyada: al full amb la missió, els errors, el marge (${marge} s) i els rols. A la pantalla, la marca i el millor resultat.`);

  /* ---------- Una partida perduda també es desa, però no es veu ---------- */
  await juga(a, '1.2');
  assert.strictEqual(await a.evaluate(() => document.querySelector('#rol-agent').value), 'Pau R.', 'per defecte, qui feia de guia fa d\'agent');
  await petaAra(a);
  await espera(() => partides() === 2, 'la partida perduda arriba al full');
  assert.strictEqual(g.files('Partides')[2][5], false);
  assert((await text(a, '#nota-text')).includes('Ara canvieu: Joan T. a la bomba i Aina M. amb el manual.'));
  assert.strictEqual(await a.getAttribute('.nivell[data-codi="1.2"]', 'data-superada'), 'false');
  console.log('Partida perduda: va al full (per al tauler) però no surt enlloc a la pantalla.');

  /* ---------- Un altre ordinador: recuperar l'equip i no poder-lo duplicar ---------- */
  const tigres = g.crida({ accio: 'recuperaEquip', nom: 'tigres agils' }).equip.id;
  const posa = (id, missio, guanyada, errors, marge) => g.crida({ accio: 'desaPartides', equip: tigres, partides: [{ id, equip: tigres, missio, guanyada, errors, marge, agent: 'Aina M.', guia: 'Pau R.', versio: R.VERSIO }] });
  posa('a1', '1.2', true, 2, 40);
  posa('a2', '1.3', true, 0, 70);
  posa('a3', '1.1', true, 0, marge + 7);
  posa('a4', '1.1', true, 1, 140);
  const B = await ordinador();
  const bb = await pagina(B);
  await panell(bb, 'entra');
  await bb.fill('#nou-nom', 'TIGRES AGILS');
  await bb.locator('#nou-membres input').nth(0).fill('X');
  await bb.locator('#nou-membres input').nth(1).fill('Y');
  await bb.locator('#nou-equip button[type="submit"]').click();
  await bb.waitForFunction(() => document.querySelector('#entra-avis').dataset.error === 'existeix');
  assert.strictEqual(g.files('Equips').length, 2, 'no es crea un equip repetit');
  await bb.locator('#pest-recupera').click();
  await bb.fill('#recupera-nom', 'Tigres agil');
  await bb.locator('#recupera-equip button[type="submit"]').click();
  await bb.waitForFunction(() => document.querySelector('#entra-avis').dataset.error === 'no-existeix');
  assert((await text(bb, '#entra-avis')).includes("Repasseu com l'havíeu escrit"));
  assert.strictEqual(await bb.locator('#entra li, #entra option').count(), 0, 'no es mostra cap llista d\'equips');
  await bb.fill('#recupera-nom', '  tígres   ÀGILS');
  await bb.locator('#recupera-equip button[type="submit"]').click();
  await panell(bb, 'missions');
  assert.strictEqual(await text(bb, '#equip-nom'), 'Tigres Àgils');
  // Tres de la secció 1: s'obre la 2, i a la missió lliure, els seus mòduls.
  assert.deepStrictEqual(await oberts(bb), ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4']);
  assert.deepStrictEqual(await xips(bb), ['cables', 'boto', 'sequencia', 'memoria']);
  assert.strictEqual(await bb.getAttribute('.nivell[data-codi="1.1"] .millor', 'data-marge'), String(marge + 7), 'el millor és el de menys errors i més marge');
  assert.strictEqual(await bb.getAttribute('.nivell[data-codi="1.1"] .millor', 'data-errors'), '0');
  assert.strictEqual(await text(bb, '.seccio[data-seccio="1"] .compte'), '3/4');
  await captura(bb, 'equip-recupera');
  await A.close();
  console.log("Un altre ordinador: no es pot crear un equip repetit, un nom que no existeix avisa, i el nom es troba sense majúscules ni accents. Amb tres de la secció 1 s'obre la 2.");

  /* ---------- Sense connexió: la partida espera a la cua ---------- */
  caigut = true;
  await juga(bb, '1.4');
  await petaAra(bb);
  await bb.waitForFunction(() => document.querySelector('#pendents').dataset.n === '1');
  assert((await text(bb, '#pendents')).includes('per enviar'));
  const abans = partides();
  caigut = false;
  await bb.evaluate(() => window.dispatchEvent(new Event('online')));
  await bb.waitForFunction(() => document.querySelector('#pendents').dataset.n === '0', null, { timeout: 30000 });
  assert.strictEqual(partides(), abans + 1);
  await bb.evaluate(() => window.dispatchEvent(new Event('online')));
  await fotogrames(bb);
  assert.strictEqual(partides(), abans + 1, 'no es duplica');
  // Sense connexió, crear un equip avisa i es pot jugar sense desar.
  caigut = true;
  await bb.locator('#canvia-equip').click();
  await panell(bb, 'entra');
  await bb.locator('#pest-nou').click();
  await bb.fill('#nou-nom', 'Els Llamps');
  await bb.locator('#nou-membres input').nth(0).fill('Nil P.');
  await bb.locator('#nou-membres input').nth(1).fill('Ona V.');
  await bb.locator('#nou-equip button[type="submit"]').click();
  await bb.waitForFunction(() => document.querySelector('#entra-avis').dataset.error === 'xarxa');
  caigut = false;
  await bb.locator('#sense-equip').click();
  await panell(bb, 'missions');
  assert.deepStrictEqual(await oberts(bb), ['1.1', '1.2', '1.3', '1.4'], 'sense equip es comença de zero');
  assert.strictEqual(await bb.isVisible('#equip-barra'), false);
  const n0 = peticions;
  await bb.locator('.nivell[data-codi="1.1"]').click();
  await bb.waitForFunction(() => document.body.dataset.fase === 'joc');
  await quieta(bb);
  await petaAra(bb);
  assert.strictEqual(peticions, n0, 'sense equip no es desa res');
  console.log("Sense connexió: la partida es queda a la cua i s'envia una sola vegada quan torna. Sense equip es juga sense desar.");

  /* ---------- Els primers dies: també s'envien les partides sense equip, les lliures i les abandonades ---------- */
  {
    const altres = () => g.files('Altres partides').slice(1);
    const CA = require('../site/dades/nucli.js').COLUMNES.altres;
    const D = await ordinador({ registraTot: true });
    const d = await pagina(D);
    await panell(d, 'entra');
    await d.locator('#sense-equip').click();
    await panell(d, 'missions');
    await fotogrames(d);
    await d.locator('.nivell[data-codi="1.1"]').click();
    await d.waitForFunction(() => document.body.dataset.fase === 'joc');
    await quieta(d);
    await petaAra(d);
    await espera(() => altres().length === 1, 'la partida sense equip arriba a «Altres partides»');
    let f = altres()[0];
    assert.deepStrictEqual([f[CA.indexOf('equip')], f[CA.indexOf('missio')], f[CA.indexOf('moduls')], f[CA.indexOf('estat')], f[CA.indexOf('max_errors')]], ['', '1.1', 'cables cables-2', 'perduda', R.NIVELLS[0].errors]);
    // Una missió lliure també hi va, amb els mòduls triats.
    await d.locator('#obre-lliure').click();
    await panell(d, 'lliure');
    await d.locator('#lliure-moduls input[value="boto"]').check();
    await d.locator('#comenca-lliure').click();
    await d.waitForFunction(() => document.body.dataset.fase === 'joc');
    await quieta(d);
    await petaAra(d);
    await espera(() => altres().length === 2, 'la missió lliure arriba a «Altres partides»');
    f = altres()[1];
    assert.deepStrictEqual([f[CA.indexOf('missio')], f[CA.indexOf('moduls')]], ['lliure', 'boto']);
    // Si es tanca o es recarrega la pestanya a mitja bomba, la partida s'envia com a abandonada.
    await panell(d, 'missions');
    await fotogrames(d);
    await d.locator('.nivell[data-codi="1.2"]').click();
    await d.waitForFunction(() => document.body.dataset.fase === 'joc');
    await d.reload({ waitUntil: 'domcontentloaded' });
    await espera(() => altres().length === 3, 'la partida abandonada arriba a «Altres partides»');
    f = altres()[2];
    assert.deepStrictEqual([f[CA.indexOf('missio')], f[CA.indexOf('estat')]], ['1.2', 'abandonada']);
    // Amb equip, l'abandonada va a Partides (no compta com a superada).
    const n1 = partides();
    // (L'adreça encara porta la missió lliure d'abans: es torna a l'adreça neta.)
    await d.goto(url, { waitUntil: 'domcontentloaded' });
    await panell(d, 'entra');
    await d.locator('#pest-recupera').click();
    await d.fill('#recupera-nom', 'tigres agils');
    await d.locator('#recupera-equip button[type="submit"]').click();
    await panell(d, 'missions');
    await juga(d, '1.3');
    await d.reload({ waitUntil: 'domcontentloaded' });
    await espera(() => partides() === n1 + 1, 'la partida abandonada de l\'equip arriba a Partides');
    const fa = g.files('Partides').slice(-1)[0];
    assert.deepStrictEqual([fa[4], fa[5], fa[COLUMNES_P.indexOf('estat')]], ['1.3', false, 'abandonada']);
    assert.strictEqual(altres().length, 3, 'la de l\'equip no va a «Altres partides»');
    await D.close();
    console.log('Primers dies (registraTot): les partides sense equip i les lliures van a «Altres partides», i les abandonades s\'envien en tancar la pestanya.');
  }

  /* ---------- Codis ocults ---------- */
  await codi(bb, 'això no és res');
  await bb.waitForFunction(() => document.querySelector('#codi-avis').dataset.error === 'codi');
  await bb.locator('#codi-tanca').click();
  await panell(bb, 'missions');
  await codi(bb, CODIS_PROVA.obre.toUpperCase());
  await panell(bb, 'missions');
  assert.strictEqual((await oberts(bb)).length, R.NIVELLS.length, 'el codi obre totes les missions');
  assert.strictEqual(await bb.isVisible('#mode-barra'), true);
  await bb.locator('#surt-mode').click();
  await bb.waitForFunction(() => document.body.dataset.mode === '');
  assert.deepStrictEqual(await oberts(bb), ['1.1', '1.2', '1.3', '1.4']);
  await B.close();
  // Demostració: tot obert, sense equip i sense desar.
  const C = await ordinador({ reduit: true });
  const c = await pagina(C);
  await panell(c, 'entra');
  // Cinc tocs al lema també obren el camp del codi.
  await c.locator('#nota .lema').click({ clickCount: 5 });
  await panell(c, 'codi');
  await c.fill('#codi-text', CODIS_PROVA.demo);
  await c.locator('#codi button[type="submit"]').click();
  await panell(c, 'missions');
  assert.strictEqual((await oberts(c)).length, R.NIVELLS.length);
  const n1 = peticions;
  await c.locator('.nivell[data-codi="6.4"]').click();
  await c.waitForFunction(() => document.body.dataset.fase === 'joc');
  await petaAra(c);
  assert.strictEqual(peticions, n1, 'en demostració no es desa res');
  // El mode es manté en recarregar la pestanya.
  await c.reload({ waitUntil: 'domcontentloaded' });
  await panell(c, 'missions');
  assert.strictEqual(await c.evaluate(() => document.body.dataset.mode), 'demo');
  await codi(c, CODIS_PROVA.tauler);
  await c.waitForURL(/tauler\//, { waitUntil: 'domcontentloaded' });
  console.log('Codis: un codi dolent no fa res; el d\'obrir ho obre tot; el de demostració no desa res; el del tauler hi porta. Cinc tocs al lema o Ctrl+Alt+B obren el camp.');

  /* ---------- Tauler del professorat ---------- */
  await c.waitForFunction(() => document.body.dataset.estat === 'clau');
  await c.fill('#clau', 'dolenta');
  await c.locator('#entra button').click();
  await c.waitForFunction(() => document.querySelector('#entra-avis').textContent.includes('no és bona'));
  await c.fill('#clau', CLAU);
  await c.check('#recorda');
  await c.locator('#entra button').click();
  await c.waitForFunction(() => document.body.dataset.estat === 'llest');
  const t = (s) => c.evaluate((x) => document.querySelector(x).textContent, s);
  assert((await t('#equips')).includes('Tigres Àgils'));
  assert.strictEqual(await c.locator(`tr[data-equip="${tigres}"] td.sup`).count(), 3);
  assert((await t(`tr[data-equip="${tigres}"] td[data-codi="1.1"]`)).includes('3 int'), 'el tauler mostra els intents');
  assert((await t(`tr[data-equip="${tigres}"] td[data-codi="1.4"]`)).includes('1 int'));
  await captura(c, 'tauler');
  // La clau queda recordada en aquest ordinador.
  await c.reload({ waitUntil: 'domcontentloaded' });
  await c.waitForFunction(() => document.body.dataset.estat === 'llest');
  // Detall: esborrar una partida, amb un segon clic per confirmar.
  await c.locator(`tr[data-equip="${tigres}"] .nom`).click();
  await c.waitForFunction(() => !document.querySelector('#detall').hidden);
  const files = await c.locator('#detall tr[data-partida]').count();
  assert.strictEqual(files, partides());
  const p0 = partides();
  const esb = c.locator('#detall tr[data-partida="a4"] button');
  await esb.click();
  assert.strictEqual(partides(), p0, 'el primer clic només demana confirmació');
  await esb.click();
  await espera(() => partides() === p0 - 1, "la partida s'esborra del full");
  await c.waitForFunction((n) => document.querySelectorAll('#detall tr[data-partida]').length === n, p0 - 1);
  // CSV
  const [baixa] = await Promise.all([c.waitForEvent('download'), c.locator('#csv-millors').click()]);
  const csv = require('fs').readFileSync(await baixa.path(), 'utf8');
  assert(csv.startsWith('﻿"Equip";"Membres";"Superades";"1.1"') && csv.includes('"Tigres Àgils"'), csv.slice(0, 120));
  // Fusionar un equip repetit dins d'un altre.
  g.crida({ accio: 'creaEquip', nom: 'Tigres 2', membres: ['Aina M.', 'Pau R.'] });
  await c.locator('#actualitza').click();
  await c.waitForFunction(() => document.querySelectorAll('#equips tbody tr[data-equip]').length === 2);
  const dos = g.crida({ accio: 'recuperaEquip', nom: 'Tigres 2' }).equip.id;
  await c.locator(`tr[data-equip="${dos}"] .nom`).click();
  await c.waitForFunction(() => document.querySelector('#fusiona-a'));
  await c.selectOption('#fusiona-a', tigres);
  await c.locator('#detall [data-accio="fusiona"]').click();
  await c.locator('#detall [data-accio="fusiona"]').click();
  await c.waitForFunction(() => document.querySelectorAll('#equips tbody tr[data-equip]').length === 1);
  assert.strictEqual(g.files('Equips').length, 2);
  console.log('Tauler: demana la clau i la recorda, mostra equips, millors i intents, esborra partides, fusiona equips i baixa el CSV.');

  await C.close();
  /* ---------- Sense full de càlcul: tot al navegador ---------- */
  const L = await ordinador({ remot: false, reduit: true, ms: 30000 });
  const l = await pagina(L);
  await panell(l, 'entra');
  await l.fill('#nou-nom', 'Local');
  await l.locator('#nou-membres input').nth(0).fill('A B.');
  await l.locator('#nou-membres input').nth(1).fill('C D.');
  await l.locator('#nou-equip button[type="submit"]').click();
  await panell(l, 'missions');
  await l.reload({ waitUntil: 'domcontentloaded' });
  await panell(l, 'missions');
  assert.strictEqual(await text(l, '#equip-nom'), 'Local', "l'equip es manté en recarregar");
  const l2 = await pagina(L);
  await panell(l2, 'entra');
  await l2.locator('#pest-recupera').click();
  await l2.fill('#recupera-nom', 'local');
  await l2.locator('#recupera-equip button[type="submit"]').click();
  await panell(l2, 'missions');
  const lt = await pagina(L, `${base}/tauler/`);
  await lt.waitForFunction(() => document.body.dataset.estat === 'llest');
  assert((await lt.textContent('#equips')).includes('Local'));
  assert.strictEqual(await lt.evaluate(() => window.BOOMBERA_CONFIG.servidor), '', 'aquest ordinador no té full de càlcul');
  console.log("Sense full de càlcul: l'equip i el tauler funcionen amb les dades d'aquest navegador.");

  assert.deepStrictEqual(errs, [], 'errors de consola: ' + errs.join('; '));
  await nav.close();
  servidor.close();
  console.log('Equips correctes.');
})().catch((e) => { console.error(e); process.exit(1); });
