// Juga partides reals al navegador i comprova el manual.
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const R = require('../site/comu/regles.js');
const { servidor, CAPTURES, proves, cara, depressa, quieta, gira, caraDe, veu, llegeixCarcassa, llegeix, idx, total, fusibles, fet, captura, fotogrames, nivell, pausaCaptura, SITE, rellotge, modeDemo, saltaIntro, ARGS } = require('./ajuda.js');

(async () => {
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const url = `${base}/index.html`;
  const urlManual = `${base}/manual/index.html`;
  const nav = await chromium.launch({ args: ARGS });
  const ctx = await nav.newContext({ viewport: CAPTURES ? { width: 1366, height: 768 } : { width: 960, height: 540 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  // A les proves no hi ha targeta gràfica: es dibuixa poc perquè el rellotge no vagi carregat,
  // i es pot saltar temps per comprovar el final de la partida.
  await ctx.addInitScript(rellotge(2000) + modeDemo + saltaIntro);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForSelector('.nivell', { timeout: 60000 });
  await quieta(p);
  await captura(p, 'inici');
  assert.strictEqual(await p.locator('.nivell').count(), R.NIVELLS.length);

  // Les 24 missions a la pantalla d'inici, agrupades en sis seccions, sense el nom de cap curs.
  assert.strictEqual(await p.locator('.seccio').count(), R.SECCIONS.length);
  for (const [i, sec] of R.SECCIONS.entries()) assert.strictEqual(await p.locator('.seccio').nth(i).locator('.nivell').count(), sec.missions.length);
  assert(R.SECCIONS.every((sec) => sec.nom) && !(await p.textContent('#nota')).match(/\bnivell\b/i));

  // Cada missió porta els mòduls, el temps i els errors que diu. Una segona pestanya amb «moviment reduït»
  // fa que la càmera no entri volant i que la nota surti de seguida després d'acabar.
  const ctxR = await nav.newContext({ viewport: { width: 960, height: 540 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  // Aquí només es llegeixen dades: es dibuixa molt poc perquè cada missió vagi de pressa a les màquines lentes.
  await ctxR.addInitScript(rellotge(30000) + modeDemo + saltaIntro);
  // En aquesta pestanya els fotogrames són molt espaiats: les esperes comproven l'estat cada 100 ms, no a cada fotograma.
  const POLL = { polling: 100 };
  // Els clics de Playwright esperen que l'element estigui quiet durant dos fotogrames: aquí es prem directament.
  const prem = (sel) => r.evaluate((x) => document.querySelector(x).click(), sel);
  const r = await ctxR.newPage();
  r.on('pageerror', (e) => errs.push(e.message));
  await r.goto(url);
  await r.waitForFunction(() => document.querySelector('.nivell'), null, { ...POLL, timeout: 60000 });
  for (const [n, m] of R.NIVELLS.entries()) {
    await r.waitForFunction(() => !document.querySelector('#nota').hidden, null, POLL);
    // Mentre es llegeix, el rellotge de la pàgina està aturat: el temps surt exacte encara que la màquina vagi lenta.
    await r.evaluate(() => window.__atura());
    await prem(`.nivell[data-nivell="${n}"]`);
    // Amb el rellotge aturat, la bomba es queda armant-se: les dades ja hi són.
    await r.waitForFunction(() => document.body.dataset.fase === 'armant', null, POLL);
    const v = await r.evaluate(() => ({
      missio: { ...document.querySelector('#missio').dataset },
      espais: [...document.querySelectorAll('#espais li')].map((l) => ({ id: l.dataset.modul, cara: Number(l.dataset.cara) })),
      instancies: [...document.querySelectorAll('#dianes .instancia')].map((d) => ({ id: d.dataset.instancia, modul: d.dataset.modul, dianes: d.querySelectorAll('.diana').length })),
      temps: Number(document.querySelector('#temps').dataset.total),
      errors: document.querySelector('#errors').textContent,
      max: Number(document.querySelector('#errors').dataset.max),
    }));
    const ids = R.instancies(m.moduls);
    assert.strictEqual(v.missio.codi, m.codi);
    assert.deepStrictEqual(v.missio.moduls.split(' '), m.moduls, `${m.nom}: mòduls`);
    assert.deepStrictEqual(v.espais.map((e) => e.id), ids.map((x) => x.id), `${m.nom}: cada mòdul té el seu espai`);
    assert(v.espais.every((e) => e.cara === 0 || e.cara === 1));
    assert.deepStrictEqual(v.instancies.map((x) => [x.id, x.modul]), ids.map((x) => [x.id, x.nom]), `${m.nom}: instàncies`);
    assert(v.instancies.every((x) => x.dianes > 0), `${m.nom}: cada mòdul té alguna cosa per prémer`);
    assert.strictEqual(v.temps, m.segons, `${m.nom}: temps`);
    assert.strictEqual(v.errors, `0 de ${m.errors}`, `${m.nom}: errors`);
    assert.strictEqual(v.max, m.errors);
    await r.evaluate(() => window.__segueix());
    await r.waitForFunction(() => document.body.dataset.fase === 'joc', null, POLL);
    await r.evaluate(() => window.__salta(1200000));
    await r.waitForFunction(() => document.body.dataset.fase === 'petada', null, { ...POLL, timeout: 30000 });
  }
  await r.waitForFunction(() => !document.querySelector('#nota').hidden, null, POLL);

  // Missió lliure: es trien mòduls, temps i errors, la configuració va a l'enllaç, i obrir l'enllaç la recupera.
  await prem('#obre-lliure');
  assert.strictEqual(await r.isVisible('#lliure'), true);
  assert.strictEqual(await r.isVisible('#nivells'), false);
  await prem('#comenca-lliure');
  assert((await r.textContent('#lliure-avis')).includes('mòdul'), 'sense mòduls no es pot començar');
  for (const mm of ['simbols', 'cables', 'morse']) await prem(`#lliure-moduls input[value="${mm}"]`);
  await r.selectOption('#lliure-temps', '210');
  await prem('#lliure-errors input[value="1"]');
  const enllac = new URL(r.url());
  assert.deepStrictEqual([enllac.searchParams.get('m'), enllac.searchParams.get('t'), enllac.searchParams.get('e')], ['cables,simbols,morse', '210', '1']);
  if (CAPTURES) await r.screenshot({ path: path.join(CAPTURES, 'lliure.png') });
  await prem('#comenca-lliure');
  await r.waitForFunction(() => document.body.dataset.fase === 'joc', null, POLL);
  assert.deepStrictEqual(await r.evaluate(() => ({ ...document.querySelector('#missio').dataset })), { codi: 'lliure', moduls: 'cables simbols morse', segons: '210', errors: '1' });
  await r.evaluate(() => window.__salta(1200000));
  await r.waitForFunction(() => document.body.dataset.fase === 'petada', null, { ...POLL, timeout: 30000 });
  await r.goto(`${url}?m=ratlles,boto,boto,xx&t=599&e=2`);
  await r.waitForFunction(() => document.querySelector('#lliure:not([hidden])'), null, { ...POLL, timeout: 60000 });
  assert.deepStrictEqual(await r.evaluate(() => [...document.querySelectorAll('#lliure-moduls input:checked')].map((i) => i.value)), ['boto', 'ratlles']);
  assert.strictEqual(await r.inputValue('#lliure-temps'), '599');
  assert.strictEqual(await r.evaluate(() => document.querySelector('#lliure-errors input:checked').value), '2');
  await r.goto(`${url}?m=cables&t=1234&e=2`);
  await r.waitForFunction(() => document.querySelector('.nivell'), null, { ...POLL, timeout: 60000 });
  assert.strictEqual(await r.isVisible('#lliure'), false, 'un enllaç dolent no obre la missió lliure');
  await ctxR.close();
  console.log(`Les ${R.NIVELLS.length} missions porten els mòduls, el temps i els errors que diuen. La missió lliure es configura i es comparteix per enllaç.`);

  // Abans del compte enrere, la bomba s'arma: mentre dura, el rellotge no compta i no es pot girar.
  {
    const n = idx('1.1');
    await p.waitForSelector('.nivell'); await fotogrames(p);
    await p.evaluate(() => window.__atura());
    await p.click(`.nivell[data-nivell="${n}"]`);
    await p.waitForFunction(() => document.body.dataset.fase === 'armant');
    assert.strictEqual(await total(p), R.NIVELLS[n].segons, "durant l'armat el rellotge no compta");
    assert.strictEqual(await p.locator('#gira').isVisible(), false);
    assert.strictEqual(await p.evaluate(() => document.querySelector('#escena').dataset.quieta), 'false');
    await p.evaluate(() => window.__segueix());
    await p.waitForFunction(() => document.body.dataset.fase === 'joc');
    await quieta(p);
    assert(await total(p) >= R.NIVELLS[n].segons - 2, 'el compte enrere comença en acabar l\'armat');
    await p.evaluate(() => { window.__salta(600000); });
    await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
    console.log("Armat: la bomba s'arma abans del compte enrere, i mentrestant el rellotge no compta.");
  }

  // Es juga sencera una missió de cada secció, sense errors. A la secció 1, amb dos mòduls iguals.
  const JUGA = ['1.4', '2.4', '3.4', '4.4', '5.4', '6.3'];
  for (const codi of JUGA) {
    const n = idx(codi);
    const ids = R.instancies(R.NIVELLS[n].moduls);
    await nivell(p, n);
    assert.strictEqual(await p.locator('#fets').evaluate((f, m) => m.every((x) => f.dataset[x] === 'false'), ids.map((x) => x.id)), true);
    const b = await llegeix(p, R.NIVELLS[n].moduls);
    if (codi === '1.4') {
      await captura(p, 'dos-iguals');
      assert.strictEqual(ids.filter((x) => x.nom === 'cables').length, 2);
      assert.strictEqual(await p.locator('#boto, #boto-2').count(), 2, 'dos botons, cada un amb el seu identificador');
    }
    if (codi === '6.3') await captura(p, 'joc');
    // En ordre aleatori, però acabant una cara abans de girar cap a l'altra.
    const ara = await cara(p);
    const ordre = await Promise.all([...ids].sort(() => Math.random() - 0.5).map(async (x) => ({ ...x, c: (await caraDe(p, x.id)) === ara ? 0 : 1 })));
    for (const { id, nom } of ordre.sort((x, y) => x.c - y.c)) {
      assert.strictEqual(await fet(p, id), false);
      await veu(p, id);
      await proves[nom].resol(p, R, b.inst[id], id);
      await p.waitForFunction((x) => document.querySelector('#fets').dataset[x] === 'true', id, { timeout: 30000 })
        .catch(async (e) => { throw new Error(`${id} no queda resolt a la missió ${codi} (errors: ${await fusibles(p)}, fase: ${await p.evaluate(() => document.body.dataset.fase)}): ${e.message}`); });
    }
    await p.waitForFunction(() => document.body.dataset.fase === 'salvada', null, { timeout: 30000 });
    assert.strictEqual(await fusibles(p), 0);
    assert.strictEqual(await p.textContent('#segell'), 'Desactivada');
    assert.strictEqual(await p.locator('#segell').isVisible(), true, 'en desactivar-la surt el segell');
  }
  await pausaCaptura(p, 400);
  await captura(p, 'guanya');
  let q;
  const SIS = idx('3.4');
  assert(R.NIVELLS[SIS].moduls.length === 6 && ['contrasenya', 'simbols'].every((m) => R.NIVELLS[SIS].moduls.includes(m)) && R.NIVELLS[SIS].errors === 2);
  console.log(`${JUGA.length} missions guanyades sense errors (una de cada secció, amb els ${R.MODULS.length} mòduls i dos mòduls iguals a la secció 1), girant la bomba per llegir la carcassa i resoldre les dues cares.`);

  // Girar: les dianes de la cara amagada no es poden prémer, ni cap mentre gira, ni es pot girar amb un botó premut.
  const TOTS = idx('6.3');
  await nivell(p, TOTS);
  q = await llegeix(p, R.NIVELLS[TOTS].moduls);
  const cablesAmagats = (await caraDe(p, 'cables')) !== (await cara(p));
  if (!cablesAmagats) await gira(p, 'ArrowLeft');
  assert.notStrictEqual(await caraDe(p, 'cables'), await cara(p), 'els cables queden a la cara amagada');
  const tall = `.cable[data-i="${R.solucioCables(q)}"]`;
  assert.strictEqual(await p.locator(tall).isVisible(), false, 'la diana de la cara amagada no es veu');
  assert.strictEqual(await p.locator(tall).getAttribute('data-amagada'), 'true');
  // Ni amb un clic de debò al lloc on era, ni amb un esdeveniment enviat directament.
  await p.locator(tall).dispatchEvent('click');
  const almig = await p.evaluate((sel) => { const d = document.querySelector(sel); const r = d.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === d; }, tall);
  assert.strictEqual(almig, false, 'al lloc de la diana amagada no hi ha res per prémer');
  assert.strictEqual(await fet(p, 'cables'), false, 'un cable de la cara amagada no es pot tallar');
  assert.strictEqual(await fusibles(p), 0);
  // Mentre gira, no es pot prémer res de cap cara.
  await p.locator('#gira').click();
  assert.strictEqual(await p.evaluate(() => document.body.dataset.girant), 'true');
  assert.strictEqual(await p.locator('.diana[data-amagada="false"]').count(), 0, 'mentre gira, cap diana és activa');
  await p.locator(tall).dispatchEvent('click');
  assert.strictEqual(await fet(p, 'cables'), false, 'mentre gira no es pot tallar');
  await p.waitForFunction(() => document.body.dataset.girant === 'false');
  await quieta(p);
  await p.locator(tall).click();
  assert.strictEqual(await fet(p, 'cables'), true, 'girada la bomba, el cable es pot tallar');
  // Amb el botó premut no es pot girar.
  await veu(p, 'boto');
  const caraBoto = await cara(p);
  await proves.boto.mante(p);
  await p.keyboard.press('ArrowRight');
  assert.strictEqual(await p.evaluate(() => document.body.dataset.girant), 'false', 'no es pot girar amb el botó premut');
  assert.strictEqual(await cara(p), caraBoto);
  await proves.boto.deixa(p);
  await gira(p, 'ArrowLeft');
  console.log('Girar: la cara amagada no es pot prémer, ni res mentre gira, ni es pot girar amb el botó premut. Les fletxes del teclat també giren.');
  await p.evaluate(() => { window.__salta(900000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });

  // Contrasenya: enviar una paraula equivocada és error i no mou les lletres, i la bona resol el mòdul.
  await nivell(p, SIS);
  q = await llegeix(p, R.NIVELLS[SIS].moduls);
  await veu(p, 'contrasenya');
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
  await veu(p, 'simbols');
  const plaques = await proves.simbols.llegeixPlaques(p);
  const ordrePl = proves.simbols.oracle(plaques);
  await p.locator(`.placa[data-i="${ordrePl[0]}"]`).click();
  await p.locator(`.placa[data-i="${ordrePl[2]}"]`).click();
  assert.strictEqual(await fusibles(p), 2);
  assert.strictEqual(await p.evaluate(() => document.body.dataset.fase), 'petada', 'el nivell de sis mòduls peta amb 2 errors');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  await nivell(p, SIS);
  await veu(p, 'simbols');
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
  const LM = idx('4.4');
  assert(['laberint', 'morse'].every((m) => R.NIVELLS[LM].moduls.includes(m)) && R.NIVELLS[LM].errors === 2);
  const Lab = proves.laberint;
  const juga = async () => {
    await nivell(p, LM);
    await p.waitForFunction(() => document.body.dataset.fase === 'joc' && document.querySelector('#laberint') && document.querySelector('#morse'));
    return llegeix(p, R.NIVELLS[LM].moduls);
  };
  // Camina cap a la sortida fins a una casella amb alguna paret, i hi topa.
  const topa = async (piles) => {
    await veu(p, 'laberint');
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
  await fotogrames(p);
  await captura(p, 'laberint-morse');
  await veu(p, 'morse');
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
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  q = await juga();
  const contra = await topa(q.piles);
  assert.strictEqual(await fusibles(p), 1, 'topar amb una paret és error');
  assert.strictEqual((await Lab.vista(p)).pos, contra, 'la llum es queda on era');
  assert.strictEqual(await fet(p, 'laberint'), false);
  await veu(p, 'laberint');
  await Lab.resol(p, R, q);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.laberint === 'true');
  console.log('Senyal: un canal equivocat és error. Laberint: una paret és error i la llum no es mou. Tots dos es resolen.');
  await p.evaluate(() => { window.__salta(600000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });

  // Interruptors i cables amb ratlles: errors reals i com es queda cada mòdul després.
  const NOUS = idx('5.4');
  assert(['interruptors', 'ratlles'].every((m) => R.NIVELLS[NOUS].moduls.includes(m)) && R.NIVELLS[NOUS].errors === 2);
  const Int = proves.interruptors; const Rat = proves.ratlles;
  const jugaNous = async () => {
    await nivell(p, NOUS);
    await p.waitForFunction(() => document.body.dataset.fase === 'joc' && document.querySelector('#interruptors') && document.querySelector('.ratllat'));
    return llegeix(p, R.NIVELLS[NOUS].moduls);
  };
  q = await jugaNous();
  await fotogrames(p);
  await captura(p, 'interruptors-ratlles');
  // Una combinació equivocada: error, i les palanques es queden on són.
  await veu(p, 'interruptors');
  const { d } = await Int.estat(p);
  const bonaInt = Int.oracle(d, q.numero);
  const dolentaInt = bonaInt.map((a, i) => (i === 2 ? !a : a));
  await Int.posa(p, dolentaInt);
  await p.locator('.fixa').dispatchEvent('click');
  await p.waitForFunction(() => Number(document.querySelector('#errors').dataset.n) === 1);
  assert.strictEqual(await fet(p, 'interruptors'), false);
  assert.deepStrictEqual((await Int.estat(p)).palanques, dolentaInt, 'les palanques es queden com estaven');
  await Int.posa(p, bonaInt);
  await p.locator('.fixa').dispatchEvent('click');
  await p.waitForFunction(() => document.querySelector('#fets').dataset.interruptors === 'true');
  // Tallar un cable que no toca és el segon error: el nivell peta.
  await veu(p, 'ratlles');
  const bonsRat = Rat.oracle(q, q.ratlles.cables);
  const dolentRat = q.ratlles.cables.findIndex((_, i) => !bonsRat.includes(i));
  await p.locator(`.ratllat[data-i="${dolentRat}"]`).dispatchEvent('click');
  await p.waitForFunction(() => document.body.dataset.fase === 'petada');
  assert.strictEqual(await fusibles(p), 2);
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  // Ara al revés: un cable equivocat és un error, es queda tallat, i el mòdul no es resol fins a l'últim bo.
  q = await jugaNous();
  await veu(p, 'ratlles');
  const bons2 = Rat.oracle(q, q.ratlles.cables);
  const dolent2 = q.ratlles.cables.findIndex((_, i) => !bons2.includes(i));
  await p.locator(`.ratllat[data-i="${dolent2}"]`).dispatchEvent('click');
  await p.waitForFunction(() => Number(document.querySelector('#errors').dataset.n) === 1);
  assert.strictEqual(await p.getAttribute(`.ratllat[data-i="${dolent2}"]`, 'data-tallat'), 'true', 'el cable es queda tallat');
  assert.strictEqual(await fet(p, 'ratlles'), false);
  for (const [k, i] of bons2.entries()) {
    assert.strictEqual(await fet(p, 'ratlles'), false, 'encara falten cables');
    await p.locator(`.ratllat[data-i="${i}"]`).dispatchEvent('click');
    await p.waitForFunction((x) => document.querySelector(`.ratllat[data-i="${x}"]`).dataset.tallat === 'true', i);
    if (k < bons2.length - 1) assert.strictEqual(await fusibles(p), 1, 'un cable bo no és error');
  }
  await p.waitForFunction(() => document.querySelector('#fets').dataset.ratlles === 'true');
  assert.strictEqual(await fusibles(p), 1);
  console.log("Interruptors: una combinació equivocada és error i les palanques es queden. Ratlles: un cable dolent és error i es queda tallat; el mòdul es resol amb l'últim bo.");
  await p.evaluate(() => { window.__salta(600000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });

  // Seqüència: una tecla equivocada és error, repeteix la ronda, i els salts pugen també amb errors d'altres mòduls.
  const QUATRE = idx('2.4');
  assert(['cables', 'boto', 'sequencia', 'memoria'].every((m) => R.NIVELLS[QUATRE].moduls.includes(m)) && R.NIVELLS[QUATRE].errors === 2);
  await nivell(p, QUATRE);
  q = await llegeix(p, R.NIVELLS[QUATRE].moduls);
  await veu(p, 'sequencia');
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
  await veu(p, 'cables');
  await proves.cables.resol(p, R, q);
  await veu(p, 'boto');
  await proves.boto.resol(p, R, q);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.boto === 'true', null, { timeout: 30000 });
  await veu(p, 'memoria');
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
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  await nivell(p, QUATRE);
  await veu(p, 'memoria');
  const n0 = await mem();
  const npos0 = proves.memoria.oracle(0, n0.pantalla, n0.ordre, []);
  await p.locator(`.tecla-mem[data-i="${npos0}"]`).click();
  const n1 = await mem();
  const npos1 = proves.memoria.oracle(1, n1.pantalla, n1.ordre, [{ valor: n0.ordre[npos0], posicio: npos0 }]);
  await p.locator(`.tecla-mem[data-i="${(npos1 + 1) % 4}"]`).click();
  assert.strictEqual(await fusibles(p), 1);
  assert.deepStrictEqual(await mem(), n0, 'torna a la mateixa etapa 1');
  q = await llegeix(p, R.NIVELLS[QUATRE].moduls);
  await veu(p, 'memoria');
  await proves.memoria.resol(p, R);
  await p.waitForFunction(() => document.querySelector('#fets').dataset.memoria === 'true');
  console.log("Memòria: un error torna a l'etapa 1 amb les mateixes pantalles, i es pot acabar resolent.");
  await p.evaluate(() => { window.__salta(600000); });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 15000 });
  const CB = idx('1.3');
  assert.deepStrictEqual(R.NIVELLS[CB].moduls, ['cables', 'boto']);
  assert.strictEqual(R.NIVELLS[CB].errors, 3);
  await nivell(p, CB);
  const totesSeq = await p.locator('.tecla-mem').count();
  assert.strictEqual(totesSeq, 0, 'una missió sense memòria no porta les seves tecles');

  // Un error resta 30 s i no resol el mòdul.
  let b = await llegeix(p, R.NIVELLS[CB].moduls);
  await veu(p, 'cables');
  const dolent = b.cables.findIndex((_, i) => i !== R.solucioCables(b));
  const t0 = await total(p);
  // Rellotge aturat: així es pot llegir la tensió just després de l'error, encara que la màquina vagi lenta.
  await p.evaluate(() => window.__atura());
  await p.locator(`.cable[data-i="${dolent}"]`).click();
  const t1 = await total(p);
  assert.strictEqual(await fusibles(p), 1);
  assert(t0 - t1 >= 29 && t0 - t1 <= 45, `penalització ${t0 - t1}`);
  assert.strictEqual(await fet(p, 'cables'), false);
  await captura(p, 'error');
  console.log(`Un error resta ${t0 - t1} s.`);
  // Amb marge, la tensió puja uns segons i després torna gairebé on era; no entra la capa de l'últim error.
  const tensio = () => p.evaluate(() => ({ t: Number(document.querySelector('#temps').dataset.tensio), ultim: document.querySelector('#temps').dataset.ultim, tic: Number(document.querySelector('#temps').dataset.tic) }));
  const desDe = async (tic) => { await p.waitForFunction((n) => Number(document.querySelector('#temps').dataset.tic) > n + 1, tic); return tensio(); };
  const just = await desDe((await tensio()).tic);
  assert.strictEqual(just.ultim, 'false', 'amb dos errors de marge no és l\'últim');
  await p.evaluate(() => { window.__segueix(); window.__salta(6000); });
  const despres = await desDe(just.tic);
  assert(despres.t < just.t - 0.1, `la tensió torna a baixar després d'un error: ${just.t} → ${despres.t}`);
  console.log(`Tensió: després d'un error amb marge, ${just.t.toFixed(2)} i 6 s més tard ${despres.t.toFixed(2)}.`);

  // Fer el contrari del que toca al botó és error.
  await veu(p, 'boto');
  if (R.solucioBoto(b) === 'clic') {
    await proves.boto.mante(p);
    await p.waitForFunction(() => document.querySelector('#llum').dataset.color);
    await captura(p, 'llum');
    await proves.boto.deixa(p);
  } else await proves.boto.clicSec(p);
  await p.waitForFunction(() => Number(document.querySelector('#errors').dataset.n) === 2);
  assert.strictEqual(await fet(p, 'boto'), false);
  // Ara només queda un error: entra la capa de l'últim error, i s'hi queda.
  await p.waitForFunction(() => document.querySelector('#temps').dataset.ultim === 'true');
  console.log("Fer l'acció contrària al botó és error.");

  // Tercer error: explota.
  await veu(p, 'cables');
  await p.evaluate(() => { window.__ms = 0; });
  const altre = b.cables.findIndex((_, i) => i !== R.solucioCables(b) && i !== dolent);
  await p.locator(`.cable[data-i="${altre}"]`).click();
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  await pausaCaptura(p, 350);
  await captura(p, 'petada-1');
  await pausaCaptura(p, 1200);
  await captura(p, 'petada-2');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  await pausaCaptura(p, 600);
  await captura(p, 'petada-3');
  assert.strictEqual(await p.textContent('#nota-titol'), 'Ha petat');
  console.log('El tercer error fa petar la bomba.');

  await p.evaluate(() => { window.__ms = 2000; });

  // Quan queda poc temps tot es torna vermell, i a 0:00 peta.
  await nivell(p, CB);
  // Els colors dels cables s'han de distingir encara que l'alarma ho tenyeixi tot de vermell:
  // es llegeix el color de la pantalla al mig de cada cable, sense alarma i amb l'alarma al màxim.
  await veu(p, 'cables');
  const colorsCables = async () => {
    const cs = await p.evaluate(() => [...document.querySelectorAll('[data-instancia="cables"] .cable')].map((c) => {
      const r = c.getBoundingClientRect(); return { color: c.dataset.color, x: r.x + r.width / 2, y: r.y + r.height * 0.45 };
    }));
    const px = await p.evaluate((pts) => window.__esc.llegeixColors(pts), cs.map((c) => [c.x, c.y]));
    return cs.map((c, i) => ({ color: c.color, rgb: px[i] }));
  };
  const separacio = (llista) => {
    let min = Infinity;
    llista.forEach((a) => llista.forEach((b) => { if (a.color !== b.color) min = Math.min(min, Math.hypot(...a.rgb.map((v, k) => v - b.rgb[k]))); }));
    return min;
  };
  const calma = await colorsCables();
  await p.evaluate((d) => { window.__ms = 0; window.__salta((d - 12) * 1000); }, R.NIVELLS[CB].segons);
  await p.waitForFunction(() => Number(document.querySelector('#temps').dataset.total) <= 12, null, { timeout: 15000 })
    .catch(() => assert.fail('el salt de temps'));
  // Amb el rellotge aturat, perquè a una màquina lenta no arribi a 0:00 abans de comprovar l'alarma.
  await p.evaluate(() => window.__atura());
  await captura(p, 'tensio');
  await p.waitForFunction(() => Number(document.querySelector('#temps').dataset.tensio) > 0.9, null, { timeout: 15000 });
  const alarma = await colorsCables();
  const [sc, sa] = [separacio(calma), separacio(alarma)];
  if (sc < Infinity) {
    assert(sa >= 40 && sa >= sc * 0.5, `amb l'alarma, els colors dels cables es confonen: ${sa.toFixed(0)} (sense alarma ${sc.toFixed(0)}) ${JSON.stringify(alarma)}`);
    console.log(`Colors dels cables: separació mínima ${sc.toFixed(0)} sense alarma i ${sa.toFixed(0)} amb l'alarma al màxim.`);
  }
  // Espera el canvi de color, perquè les màquines lentes poden trigar uns quants fotogrames.
  await p.waitForFunction(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--alarma')) > 0, null, { timeout: 15000 })
    .catch(async () => assert.fail(`alarma activa: ${JSON.stringify(await p.evaluate(() => ({ fase: document.body.dataset.fase, alarma: getComputedStyle(document.documentElement).getPropertyValue('--alarma'), temps: document.querySelector('#temps').dataset.total, ms: window.__ms })))}`));
  await p.evaluate(() => { window.__segueix(); window.__ms = 2000; window.__salta(13000); });
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });
  assert((await p.textContent('#nota-text')).includes("S'ha acabat el temps"));
  console.log('A 0:00 la bomba peta.');

  // L'última missió peta al primer error.
  const ULT = idx('6.4');
  const lim = R.NIVELLS[ULT].errors;
  assert.strictEqual(lim, 1);
  await nivell(p, ULT);
  b = await llegeix(p, R.NIVELLS[ULT].moduls);
  await veu(p, 'cables');
  const dolents = b.cables.map((_, i) => i).filter((i) => i !== R.solucioCables(b)).slice(0, lim);
  for (const i of dolents) await p.locator(`.cable[data-i="${i}"]`).click();
  await p.waitForFunction(() => document.body.dataset.fase === 'petada', null, { timeout: 20000 });
  assert((await p.textContent('#nota-text')).includes('Heu fet un error'));
  console.log('La missió 6.4 peta al primer error.');
  await p.waitForFunction(() => !document.querySelector('#nota').hidden, null, { timeout: 30000 });

  // Teclat: es pot tallar sense ratolí.
  await nivell(p, CB);
  b = await llegeix(p, R.NIVELLS[CB].moduls);
  await veu(p, 'cables');
  await p.locator(`.cable[data-i="${R.solucioCables(b)}"]`).focus();
  await p.keyboard.press('Enter');
  assert.strictEqual(await fet(p, 'cables'), true);
  console.log('El teclat funciona per tallar.');

  // Nom, lema i controls amb icones: altaveu i pantalla completa.
  assert.strictEqual(await p.title(), 'Boombera');
  assert.strictEqual(await p.locator('#so svg').count(), 1);
  assert.strictEqual(await p.locator('#pantalla svg').count(), 1);
  // La barra de girar, a sota: «Davant · Darrere», amb la cara que es veu marcada.
  assert.deepStrictEqual(await p.locator('#gira .cara').allTextContents(), ['Davant', 'Darrere']);
  const marcada = () => p.evaluate(() => getComputedStyle(document.querySelector(`#gira .cara[data-c="${document.body.dataset.cara}"]`)).backgroundColor);
  const noMarcada = () => p.evaluate(() => getComputedStyle(document.querySelector(`#gira .cara[data-c="${1 - Number(document.body.dataset.cara)}"]`)).backgroundColor);
  assert.notStrictEqual(await marcada(), await noMarcada(), 'la cara que es veu està marcada');
  const gb = await p.locator('#gira').boundingBox(); const vp = p.viewportSize();
  assert(gb.y + gb.height > vp.height * 0.85 && Math.abs(gb.x + gb.width / 2 - vp.width / 2) < 30, 'la barra de girar és a sota, al centre');
  // Dos interruptors de so: la música de tensió i els sons dels botons, cada un pel seu compte.
  for (const id of ['#so', '#musica']) {
    const altre = id === '#so' ? '#musica' : '#so';
    const et = await p.getAttribute(id, 'aria-label'); const etAltre = await p.getAttribute(altre, 'aria-label');
    await p.locator(id).dispatchEvent('click');
    await p.waitForFunction(([x, e]) => document.querySelector(x).getAttribute('aria-label') !== e && document.querySelector(x).getAttribute('aria-pressed') === 'false', [id, et]);
    assert.strictEqual(await p.getAttribute(altre, 'aria-label'), etAltre, "silenciar-ne un no toca l'altre");
    await p.locator(id).dispatchEvent('click');
    await p.waitForFunction(([x, e]) => document.querySelector(x).getAttribute('aria-label') === e, [id, et]);
  }
  assert.deepStrictEqual(await p.evaluate(() => [localStorage.getItem('boombera.so.musica'), localStorage.getItem('boombera.so.efectes')]), ['si', 'si']);
  assert(!(await p.textContent('body')).includes('Curtcircuit'), 'el nom antic no surt al joc');
  console.log("Boombera: la música i els sons dels botons es silencien per separat, i hi ha la barra de girar a sota.");

  // El joc només enllaça el manual des de la portada (per a la Guia): fora de la portada no se'n veu cap enllaç.
  assert.deepStrictEqual(await p.evaluate(() => [...document.querySelectorAll('a[href*="manual"]')].map((a) => a.closest('#portada') ? a.id : 'fora')), ['portada-manual'], "el manual només s'enllaça des de la portada");
  assert.strictEqual(await p.locator('a[href*="manual"]:visible').count(), 0, 'durant la partida no es veu cap enllaç al manual');

  // El manual surt de les dades, no porta la llista de primers i cap en sis pàgines A4.
  await p.setViewportSize({ width: 1000, height: 1200 });
  await p.goto(urlManual);
  await p.waitForFunction((n) => document.querySelectorAll('#t-nivells tr').length === n && document.fonts.status === 'loaded', R.SECCIONS.length);
  // Graella de missions: una fila per secció, una casella per missió, amb el temps i els errors.
  assert.strictEqual(await p.locator('#t-nivells td[data-codi]').count(), R.NIVELLS.length);
  for (const n of R.NIVELLS) {
    const t = await p.textContent(`#t-nivells td[data-codi="${n.codi}"]`);
    const fmt = `${Math.floor(n.segons / 60)}:${String(n.segons % 60).padStart(2, '0')}`;
    assert(t.includes(n.codi) && t.includes(fmt) && t.includes(n.errors === 1 ? '1 error' : `${n.errors} errors`), `casella ${n.codi}: ${t}`);
  }
  const text = await p.textContent('#vista-manual');
  assert(text.includes('Boombera') && text.includes('Parla o peta') && !text.includes('Curtcircuit'), 'nom i lema al manual');
  for (const r of R.REGLES_CABLES) assert(text.includes(r.pregunta), r.pregunta);
  for (const r of R.REGLES_BOTO) assert(text.includes(r.condicio), r.condicio);
  for (const l of Object.values(R.LLUMS)) assert(text.includes(l.text), l.text);
  for (const sec of R.SECCIONS) assert(text.includes(sec.nom), sec.nom);
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
  for (const f of R.FILES_INTERRUPTORS) assert(text.includes(f.condicio) && text.includes(f.objectiu), f.condicio);
  for (const c of R.CONJUNTS_RATLLES) assert(text.includes(c.text), c.text);
  for (const a of Object.values(R.ACCIONS_RATLLES)) assert(text.includes(a.text), a.text);
  // Cada lletra del diagrama cau de debò dins la zona que diu: es comprova amb la geometria de les el·lipses dibuixades.
  const zones = await p.evaluate(() => {
    const el = [...document.querySelectorAll('svg.venn ellipse')].filter((e) => !e.classList.contains('trac-doble-dins')).map((e) => {
      const a = Number(e.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]) * Math.PI / 180;
      return ['cx', 'cy', 'rx', 'ry'].reduce((o, k) => ({ ...o, [k]: Number(e.getAttribute(k)) }), { a });
    });
    const dins = (e, x, y) => { const c = Math.cos(e.a); const s = Math.sin(e.a); const u = ((x - e.cx) * c + (y - e.cy) * s) / e.rx; const v = (-(x - e.cx) * s + (y - e.cy) * c) / e.ry; return u * u + v * v < 1; };
    return [...document.querySelectorAll('svg.venn .lletra-zona')].map((t) => {
      const x = Number(t.getAttribute('x')); const y = Number(t.getAttribute('y'));
      return { zona: t.dataset.zona, lletra: t.textContent, calc: el.map((e, k) => (dins(e, x, y) ? 'RLPV'[k] : '')).join('') };
    });
  });
  assert.strictEqual(zones.length, 16);
  for (const z of zones) {
    assert.strictEqual(z.calc, z.zona, `la lletra de la zona «${z.zona}» cau a «${z.calc}»`);
    assert.strictEqual(z.lletra, R.ZONES_RATLLES[z.zona]);
  }
  assert(!/2, 3, 5(,| i) 7/.test(text), 'el manual no ha de portar la llista de primers');
  assert(text.includes(`v${R.VERSIO}`) && !text.includes('v1'), 'la versió ha de sortir de les regles');
  const FULLS = 6;
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
