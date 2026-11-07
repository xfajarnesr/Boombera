// La portada, el «Com es juga», el mòbil i l'app instal·lable (manifest, icones i service worker sense connexió).
// Totes les esperes són d'estat: les úniques pauses són per a les captures (CAPTURES).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const assert = require('assert');
const R = require('../site/comu/regles.js');
const Logo = require('../site/comu/logo.js');
const { T } = require('../site/comu/textos.js');
const { genera, fitxers } = require('../scripts/app.js');
const { servidor, CAPTURES, captura, pausaCaptura, quieta, SITE, rellotge, modeDemo, saltaIntro, ARGS, CODIS_PROVA } = require('./ajuda.js');

// Mida d'una PNG, llegida de la capçalera.
const midaPng = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

(async () => {
  /* ---------- Fitxers de l'app ---------- */
  assert.strictEqual(fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8'), genera(), 'sw.js no està al dia: fes npm run app');
  const llista = fitxers();
  for (const f of ['index.html', 'joc.js', 'app.js', 'manifest.webmanifest', 'comu/config.js', 'comu/logo.js', 'comu/textos.js', 'vendor/three.module.min.js', 'icones/icona-192.png']) assert(llista.includes(f), `el service worker ha de guardar ${f}`);
  assert(!llista.some((f) => /^(manual|tauler)\//.test(f) || /manual\.js$/.test(f)), 'el manual i el tauler no van a la memòria de l\'app');
  const man = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(man.name, 'Boombera'); assert.strictEqual(man.lang, 'ca'); assert.strictEqual(man.orientation, 'landscape');
  assert.strictEqual(man.start_url, './');
  for (const i of man.icons) {
    const f = path.join(SITE, i.src); assert(fs.existsSync(f), `falta la icona ${i.src}`);
    if (i.type === 'image/png') assert.deepStrictEqual(midaPng(f).join('x'), i.sizes, `${i.src}: mida`);
  }
  assert(man.icons.some((i) => i.purpose === 'maskable'), 'cal una icona adaptable');
  for (const i of Logo.ICONES) assert.deepStrictEqual(midaPng(path.join(SITE, 'icones', i.nom)), [i.mida, i.mida], `${i.nom}: mida`);
  assert.strictEqual(fs.readFileSync(path.join(SITE, 'icones', 'icona.svg'), 'utf8'), Logo.icona() + '\n', 'icona.svg no està al dia: fes npm run icones');
  assert.strictEqual(T.comEsJuga.passos.length, 3);
  // L'adreça del full és la d'una aplicació web d'Apps Script (o buida, i llavors es desa al navegador).
  const config = {}; new Function('window', fs.readFileSync(path.join(SITE, 'comu', 'config.js'), 'utf8'))(config);
  assert(config.BOOMBERA_CONFIG.servidor === '' || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.BOOMBERA_CONFIG.servidor), "config.js: l'adreça ha d'acabar en /exec");
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  assert(html.includes('rel="manifest"') && html.includes('apple-touch-icon'));
  console.log("Fitxers de l'app: el service worker està al dia, el manifest i les icones hi són i no es guarda el manual ni el tauler.");

  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${servidor.address().port}`;
  const url = `${base}/index.html`;
  const nav = await chromium.launch({ args: ARGS });
  const errs = [];
  const vigila = (p) => {
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    return p;
  };
  const panell = (p, nom) => p.waitForFunction((x) => document.body.dataset.panell === x, nom, { timeout: 60000 });
  const visible = (p, s) => p.isVisible(s);

  /* ---------- Portada i «Com es juga» en un PC ---------- */
  const PC = { viewport: CAPTURES ? { width: 1366, height: 768 } : { width: 960, height: 540 }, serviceWorkers: 'block' };
  const ctx = await nav.newContext(PC);
  await ctx.addInitScript(rellotge(300));
  const p = vigila(await ctx.newPage());
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await panell(p, 'portada');
  assert.strictEqual(await visible(p, '#portada'), true);
  assert.strictEqual(await visible(p, '#nota'), false, 'a la portada no hi ha la nota');
  assert.strictEqual(await p.getAttribute('#portada-logo', 'aria-label'), 'Boombera');
  assert.strictEqual((await p.textContent('#portada-logo')).replace(/\s/g, ''), 'BMBERA', 'les dues O són el visor dibuixat');
  assert.strictEqual(await p.locator('#portada-logo .logo-visor polygon[fill="#ff2a14"]').count(), 12, 'dos zeros de set segments, amb el del mig apagat');
  assert.strictEqual(await p.textContent('#portada-lema'), 'Parla o peta');
  assert.strictEqual(await p.textContent('#portada-missions'), 'Missions');
  assert.strictEqual(await p.locator('#portada-lliure').count(), 0, 'la missió lliure no surt a la portada');
  // El manual es pot obrir des de la portada, abans d'entrar l'equip, en una altra pestanya.
  assert.strictEqual(await p.getAttribute('#portada-manual', 'href'), 'manual/');
  assert.strictEqual(await p.getAttribute('#portada-manual', 'target'), '_blank');
  assert((await p.textContent('#portada-manual')).includes('Manual per a la Guia'));
  assert((await p.locator('#portada-manual').boundingBox()).height >= 44, 'el manual és un botó gran');
  // «Missions» és el botó principal: més gran que el del manual i amb la lletra més grossa.
  const [bm, bman] = [await p.locator('#portada-missions').boundingBox(), await p.locator('#portada-manual').boundingBox()];
  assert(bm.width * bm.height > 1.5 * bman.width * bman.height, 'Missions té més pes que el manual');
  const lletra = (sel) => p.evaluate((x) => parseFloat(getComputedStyle(document.querySelector(x)).fontSize), sel);
  assert(await lletra('#portada-missions') > await lletra('#portada-manual b'), 'Missions té la lletra més grossa');
  // L'arrencada de la portada s'acaba sola (o amb una tecla) i deixa tot a la vista.
  await p.waitForFunction(() => document.body.dataset.arrencada === 'feta', null, { timeout: 10000 });
  assert.strictEqual(await p.evaluate(() => getComputedStyle(document.querySelector('.portada-botons')).opacity), '1');
  const respostaManual = await p.request.get(`${base}/manual/`);
  assert.strictEqual(respostaManual.status(), 200, 'la pàgina del manual existeix');
  assert.strictEqual(await p.locator('#gira').isVisible(), false);
  await quieta(p);
  await pausaCaptura(p, 1500);
  await captura(p, 'app-portada');

  // Primera vegada: «Missions» obre el «Com es juga», tres passos, i després el pas d'entrar l'equip.
  await p.locator('#portada-missions').click();
  await p.waitForFunction(() => !document.querySelector('#com-es-juga').hidden);
  for (const [i, pas] of T.comEsJuga.passos.entries()) {
    await p.waitForFunction((n) => document.querySelector('#com-es-juga').dataset.pas === String(n), i + 1);
    assert.strictEqual(await p.textContent('#cej-titol'), pas.titol);
    assert.strictEqual(await p.textContent('#cej-etiqueta'), `Com es juga · ${i + 1}/3`);
    if (i === 0) { await captura(p, 'app-com-es-juga'); assert((await p.textContent('#cej-text')).includes('Agent') && (await p.textContent('#cej-text')).includes('Guia')); }
    assert.strictEqual(await p.textContent('#cej-seguent'), i === 2 ? 'Som-hi' : 'Següent');
    await p.locator('#cej-seguent').click();
  }
  await panell(p, 'entra');
  assert.strictEqual(await visible(p, '#com-es-juga'), false);
  assert.strictEqual(await visible(p, '#nota'), true);
  assert.strictEqual(await p.evaluate(() => localStorage.getItem('boombera.comEsJuga')), '1');
  // «Torna a l'inici» porta a la portada. La segona vegada ja no surt el «Com es juga».
  await p.locator('#entra-torna').click();
  await panell(p, 'portada');
  await p.locator('#portada-missions').click();
  await panell(p, 'entra');
  assert.strictEqual(await visible(p, '#com-es-juga'), false);
  // En recarregar la pestanya no torna a sortir la portada.
  await p.reload({ waitUntil: 'domcontentloaded' });
  await panell(p, 'entra');
  // El botó «?» el torna a obrir quan es vol, i «Tanca» el tanca. També es tanca amb Esc.
  await p.locator('#ajuda').click();
  await p.waitForFunction(() => document.querySelector('#com-es-juga').dataset.pas === '1' && !document.querySelector('#com-es-juga').hidden);
  assert.strictEqual(await p.textContent('#cej-salta'), 'Tanca');
  await p.locator('#cej-salta').click();
  await p.waitForFunction(() => document.querySelector('#com-es-juga').hidden);
  await p.locator('#ajuda').click();
  await p.waitForFunction(() => !document.querySelector('#com-es-juga').hidden);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.querySelector('#com-es-juga').hidden);
  assert.strictEqual(await p.evaluate(() => document.body.dataset.panell), 'entra');
  // Sense equip, «Torna a l'inici» porta a la portada.
  await p.locator('#entra-torna').click();
  await panell(p, 'portada');
  // Cinc tocs al lema de la portada obren el camp del codi; «Tanca» torna a la portada.
  await p.locator('#portada-lema').click({ clickCount: 5 });
  await panell(p, 'codi');
  assert.strictEqual(await visible(p, '#nota'), true);
  await p.locator('#codi-tanca').click();
  await panell(p, 'portada');
  // Amb el codi de demostració, la portada ho diu i «Missions» va directe a les missions.
  await p.locator('#portada-lema').click({ clickCount: 5 });
  await panell(p, 'codi');
  await p.fill('#codi-text', CODIS_PROVA.demo);
  await p.locator('#codi [type="submit"]').click();
  await panell(p, 'missions');
  await p.locator('#ajuda').click();
  await p.waitForFunction(() => !document.querySelector('#com-es-juga').hidden);
  await p.locator('#cej-salta').click();
  // Durant la missió no hi ha el botó «?».
  await p.locator('.nivell[data-codi="1.1"]').click();
  await p.waitForFunction(() => document.body.dataset.fase === 'joc');
  assert.strictEqual(await visible(p, '#ajuda'), false);
  assert.strictEqual(await visible(p, '#gira-mobil'), false, "en un PC no surt l'avís de girar el mòbil");
  // En un PC no hi ha zones per ampliar (només amb el dit).
  assert.strictEqual(await p.locator('.zona').count(), 0);
  // L'indicador ocult de rendiment: Ctrl + Alt + D. Es pot forçar un graó de qualitat i tornar a l'automàtica.
  await p.keyboard.press('Control+Alt+d');
  await p.waitForFunction(() => !document.querySelector('#diag').hidden && document.querySelector('#diag-dades').textContent.includes('qualitat'));
  await p.locator('#diag-tria button', { hasText: 'mínima' }).click();
  await p.waitForFunction(() => document.querySelector('#diag-dades').textContent.includes('mínima') && document.querySelector('#diag-dades').textContent.includes('forçada'));
  await p.locator('#diag-tria button', { hasText: 'automàtica' }).click();
  await p.waitForFunction(() => document.querySelector('#diag-dades').textContent.includes('(automàtica)'));
  await p.keyboard.press('Control+Alt+d');
  await p.waitForFunction(() => document.querySelector('#diag').hidden);
  console.log("Rendiment: Ctrl + Alt + D mostra l'indicador, i es pot forçar la qualitat.");
  await ctx.close();
  console.log("Portada: logo, lema, Missions i el manual (un botó gran, en una altra pestanya), sense missió lliure. El «Com es juga» surt la primera vegada i amb «?», i es pot tornar a la portada.");

  /* ---------- Mòbil apaïsat ---------- */
  const MOBIL = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: 'block' };
  const m = vigila(await (async () => { const c = await nav.newContext(MOBIL); await c.addInitScript(rellotge(300) + modeDemo + saltaIntro); return c.newPage(); })());
  await m.goto(url, { waitUntil: 'domcontentloaded' });
  await panell(m, 'missions');
  // Les missions caben a la nota, que es pot desplaçar si cal.
  assert(await m.evaluate(() => { const n = document.querySelector('#nota').getBoundingClientRect(); return n.top >= 0 && n.bottom <= innerHeight; }), 'la nota cap a la pantalla');
  await captura(m, 'app-mobil-missions');
  await m.locator('.nivell[data-codi="6.3"]').tap();
  await m.waitForFunction(() => document.body.dataset.fase === 'joc');
  await quieta(m);
  assert.strictEqual(await visible(m, '#gira-mobil'), false);
  assert.strictEqual(await visible(m, '#gira'), true);
  // Mida de les dianes de la cara que es veu, en píxels de pantalla (al mòbil de veritat cal comprovar si s'hi arriba amb el dit).
  const mides = await m.evaluate(() => [...document.querySelectorAll('.diana:not([data-amagada="true"])')].map((d) => { const r = d.getBoundingClientRect(); return Math.min(r.width, r.height); }).filter((x) => x > 0));
  assert(mides.length > 0);
  const petita = Math.round(Math.min(...mides));
  assert(petita >= 12, `diana massa petita: ${petita} px`);
  // Amb el dit, la diana més petita també respon 5 px fora de la seva vora.
  assert.strictEqual(await m.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
  assert.strictEqual(await m.evaluate(() => {
    const ds = [...document.querySelectorAll('.diana:not([data-amagada="true"])')].filter((d) => d.getBoundingClientRect().width > 0);
    const d = ds.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0]; const r = d.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top - 5) === d;
  }), true, 'la diana més petita respon una mica més enllà de la vora');
  await pausaCaptura(m, 800);
  await captura(m, 'app-mobil-bomba');
  // Un toc llarg no obre el menú del sistema.
  assert.strictEqual(await m.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('.diana').dispatchEvent(e); return e.defaultPrevented; }), true);
  // Lliscar el dit en horitzontal fora dels mòduls gira la bomba. Un lliscament curt o vertical, no.
  const llisca = (dx, dy) => m.evaluate(([x, y]) => {
    const d = document.querySelector('#dianes'); const o = { bubbles: true, pointerType: 'touch', pointerId: 7, isPrimary: true };
    d.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: 420, clientY: 200 }));
    d.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 420 + x, clientY: 200 + y }));
  }, [dx, dy]);
  const cara0 = await m.evaluate(() => Number(document.body.dataset.cara));
  await llisca(20, 0); await llisca(10, 120);
  assert.strictEqual(await m.evaluate(() => document.body.dataset.girant), 'false', 'un lliscament curt o vertical no gira');
  await m.evaluate(() => { window.__ms = 120; });
  await llisca(-160, 10);
  await m.waitForFunction((c) => document.body.dataset.girant === 'false' && Number(document.body.dataset.cara) === 1 - c, cara0, { timeout: 30000 });
  await quieta(m);
  // Ampliar per zones: un toc en un mòdul (fora dels seus botons) hi apropa la càmera, i les dianes s'hi fan grans.
  const zona = await m.evaluate(() => {
    // Un punt del mòdul que no sigui cap diana.
    for (const z of [...document.querySelectorAll('.zona[data-amagada="false"]')].filter((x) => !x.dataset.zona.startsWith('cap-'))) {
      const r = z.getBoundingClientRect();
      for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) {
        const x = r.left + r.width * i / 10; const y = r.top + r.height * j / 10;
        if (document.elementFromPoint(x, y) === z) return { nom: z.dataset.zona, x, y };
      }
    }
    return null;
  });
  assert(zona, 'hi ha un mòdul amb lloc per tocar fora dels botons');
  const midaDianes = () => m.evaluate((nom) => Math.max(...[...document.querySelectorAll(`[data-instancia="${nom}"] .diana`)].map((d) => d.getBoundingClientRect().width)), zona.nom);
  const abans = await midaDianes();
  await m.touchscreen.tap(zona.x, zona.y);
  await m.waitForFunction((nom) => document.body.dataset.ampliada === nom, zona.nom);
  await quieta(m);
  const ampliada = await midaDianes();
  assert(ampliada > abans * 1.8, `ampliat, el mòdul es veu més gran: ${abans.toFixed(0)} → ${ampliada.toFixed(0)} px`);
  assert.strictEqual(await visible(m, '#allunya'), true, 'surt la lupa per tornar');
  await captura(m, 'app-mobil-ampliat');
  await m.locator('#allunya').tap();
  await m.waitForFunction(() => !document.body.dataset.ampliada);
  await quieta(m);
  assert(Math.abs((await midaDianes()) - abans) < 2, 'la lupa torna a veure tota la bomba');
  // També s'amplia la capçalera; girar la bomba torna enrere.
  const cap = await m.evaluate(() => {
    const z = [...document.querySelectorAll('.zona[data-amagada="false"]')].find((x) => x.dataset.zona.endsWith('-r')); const r = z.getBoundingClientRect();
    for (let i = 1; i < 10; i++) for (let j = 1; j < 6; j++) { const x = r.left + r.width * i / 10; const y = r.top + r.height * j / 6; if (document.elementFromPoint(x, y) === z) return { nom: z.dataset.zona, x, y }; }
    return null;
  });
  await m.touchscreen.tap(cap.x, cap.y);
  await m.waitForFunction((nom) => document.body.dataset.ampliada === nom, cap.nom);
  await quieta(m);
  const cara1 = await m.evaluate(() => Number(document.body.dataset.cara));
  await m.locator('#gira').tap();
  await m.waitForFunction((c) => !document.body.dataset.ampliada && document.body.dataset.girant === 'false' && Number(document.body.dataset.cara) === 1 - c, cara1, { timeout: 30000 });
  await quieta(m);
  console.log(`Mòbil: un toc en un mòdul l'amplia (dianes de ${abans.toFixed(0)} a ${ampliada.toFixed(0)} px), la lupa i girar la bomba ho desfan.`);
  // Amb el mòbil vertical enmig de la partida, un avís tapa la bomba i el rellotge continua.
  await m.setViewportSize({ width: 390, height: 844 });
  await m.waitForFunction(() => getComputedStyle(document.querySelector('#gira-mobil')).display !== 'none');
  assert.strictEqual(await visible(m, '#gira-mobil-durant'), true);
  assert.strictEqual(await visible(m, '#gira-mobil-abans'), false);
  assert.strictEqual(await m.evaluate(() => document.body.dataset.fase), 'joc');
  const t0 = await m.evaluate(() => Number(document.querySelector('#temps').dataset.total));
  await m.waitForFunction((t) => Number(document.querySelector('#temps').dataset.total) < t, t0, { timeout: 30000 });
  await captura(m, 'app-mobil-vertical-durant');
  await m.setViewportSize({ width: 844, height: 390 });
  await m.waitForFunction(() => getComputedStyle(document.querySelector('#gira-mobil')).display === 'none');
  await m.context().close();
  console.log(`Mòbil apaïsat: la diana més petita fa ${petita} px, lliscar gira la bomba, el toc llarg no obre menús i en vertical surt l'avís sense aturar el rellotge.`);

  /* ---------- Mòbil vertical: la missió espera que es giri ---------- */
  const v = vigila(await (async () => { const c = await nav.newContext({ ...MOBIL, viewport: { width: 390, height: 844 } }); await c.addInitScript(rellotge(300) + modeDemo); return c.newPage(); })());
  await v.goto(url, { waitUntil: 'domcontentloaded' });
  await panell(v, 'portada');
  await pausaCaptura(v, 1200);
  await captura(v, 'app-vertical-portada');
  assert(await v.evaluate(() => { const r = document.querySelector('.logo').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), 'el logo cap en un mòbil vertical');
  await v.locator('#portada-missions').tap();
  await v.waitForFunction(() => !document.querySelector('#com-es-juga').hidden);
  await v.locator('#cej-salta').tap();
  await panell(v, 'missions');
  await v.locator('.nivell[data-codi="1.1"]').tap();
  await v.waitForFunction(() => document.body.dataset.esperaGir === 'true');
  assert.strictEqual(await v.evaluate(() => document.body.dataset.fase), 'inici', 'en vertical no comença');
  assert.strictEqual(await visible(v, '#gira-mobil-abans'), true);
  await captura(v, 'app-vertical-gira');
  // «Torna» desfà l'espera; si es torna a triar i es gira el mòbil, la missió comença.
  await v.locator('#gira-mobil-torna').tap();
  await v.waitForFunction(() => document.body.dataset.esperaGir === 'false');
  assert.strictEqual(await visible(v, '#gira-mobil'), false);
  await v.locator('.nivell[data-codi="1.1"]').tap();
  await v.waitForFunction(() => document.body.dataset.esperaGir === 'true');
  await v.setViewportSize({ width: 844, height: 390 });
  await v.waitForFunction(() => document.body.dataset.fase === 'joc');
  assert.strictEqual(await v.evaluate(() => document.querySelector('#missio').dataset.codi), '1.1');
  await v.context().close();
  console.log('Mòbil vertical: la missió no comença fins que es gira el mòbil, i «Torna» ho desfà.');

  /* ---------- Service worker: sense connexió i versions noves ---------- */
  // Un servidor propi, perquè la prova pugui publicar una versió nova del service worker.
  let swExtra = '';
  const srv = http.createServer((q, r) => {
    const ruta = decodeURIComponent(q.url.split('?')[0]);
    if (ruta === '/sw.js') { r.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' }); r.end(fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8') + swExtra); return; }
    servidor.emit('request', q, r);
  });
  await new Promise((ok) => srv.listen(0, ok));
  const base2 = `http://localhost:${srv.address().port}`;
  const ctxS = await nav.newContext({ viewport: { width: 960, height: 540 } });
  await ctxS.addInitScript(rellotge(300) + saltaIntro);
  const s = vigila(await ctxS.newPage());
  await s.goto(`${base2}/index.html`, { waitUntil: 'domcontentloaded' });
  await s.waitForFunction(() => document.body.dataset.app === 'llesta', null, { timeout: 60000 });
  await s.evaluate(() => navigator.serviceWorker.ready);
  // La primera vegada la pàgina encara no és del service worker: ho és a partir de la següent.
  await s.reload({ waitUntil: 'domcontentloaded' });
  await s.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });
  const guardats = await s.evaluate(async () => { const c = await caches.open((await caches.keys()).find((k) => k.startsWith('boombera-'))); return (await c.keys()).map((q) => new URL(q.url).pathname); });
  assert(guardats.includes('/joc.js') && guardats.includes('/vendor/three.module.min.js') && guardats.includes('/manifest.webmanifest'));
  assert(!guardats.some((x) => x.startsWith('/manual/') || x.startsWith('/tauler/')));
  // Sense connexió, el joc s'obre igual i es pot jugar (també des d'un enllaç de missió lliure).
  await ctxS.setOffline(true);
  await s.reload({ waitUntil: 'domcontentloaded' });
  await panell(s, 'entra');
  await s.goto(`${base2}/index.html?m=cables,boto&t=120&e=2`, { waitUntil: 'domcontentloaded' });
  await panell(s, 'lliure');
  await s.locator('#comenca-lliure').click();
  await s.waitForFunction(() => document.body.dataset.fase === 'joc');
  assert.strictEqual(await s.evaluate(() => document.querySelector('#missio').dataset.moduls), 'cables boto');
  await ctxS.setOffline(false);
  // Una versió nova no s'aplica a mitja bomba: espera, i quan la partida s'acaba i es torna a les missions, recarrega.
  swExtra = '\n// versió nova de prova\n';
  await s.evaluate(() => { window.__marca = 'abans'; return navigator.serviceWorker.getRegistration().then((r) => r.update()); });
  await s.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r && r.waiting)), null, { timeout: 30000 });
  assert.strictEqual(await s.evaluate(() => window.__marca), 'abans', 'no es recarrega durant la partida');
  assert.strictEqual(await s.evaluate(() => document.body.dataset.fase), 'joc');
  const recarregada = s.waitForEvent('load', { timeout: 60000 });
  await s.evaluate(() => window.__salta(1200000));
  await recarregada;
  await s.waitForFunction(() => document.body.dataset.app === 'llesta' && !window.__marca, null, { timeout: 60000 });
  await ctxS.close();
  srv.close();
  console.log("Service worker: guarda el joc (sense manual ni tauler), s'obre sense connexió i una versió nova espera que s'acabi la partida.");

  assert.deepStrictEqual(errs, [], `errors a la pàgina: ${errs.join(' | ')}`);
  await nav.close();
  servidor.close();
  console.log('Proves de l\'app: totes bé.');
})().catch((e) => { console.error(e); process.exit(1); });
