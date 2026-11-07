// Ajudants comuns de les proves de navegador: el servidor del lloc, girar la bomba, llegir-la i triar missions.
const path = require('path');
const assert = require('assert');
const R = require('../site/comu/regles.js');
const http = require('http');
const fs = require('fs');
const SITE = path.join(__dirname, '..', 'site');
const TIPUS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf' };
const servidor = http.createServer((q, r) => {
  const ruta = decodeURIComponent(q.url.split('?')[0]);
  if (ruta === '/comu/codis.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); r.end(codisProva); return; }
  // Les proves no fan servir mai el full de càlcul de debò: el config.js de les proves no té adreça.
  // equips.test.js el substitueix pel «full» de mentida quan cal.
  if (ruta === '/comu/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); r.end("window.BOOMBERA_CONFIG = { servidor: '' };"); return; }
  let f = path.join(SITE, ruta);
  if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': TIPUS[path.extname(f)] || 'application/octet-stream' }); r.end(d);
  });
});
const CAPTURES = process.env.CAPTURES;
const proves = Object.fromEntries(R.MODULS.map((m) => [m, require(`./moduls/${m}.js`)]));
// La bomba té dues cares. Les proves la giren de debò amb el botó, i esperen que hagi acabat de girar.
const cara = (p) => p.evaluate(() => Number(document.body.dataset.cara));
// Mentre s'espera que la bomba s'aturi, es dibuixa més sovint (cada 120 ms en lloc de cada 2 s), i després es torna al ritme d'abans.
async function depressa(p, f) {
  const abans = await p.evaluate(() => { const m = window.__ms; if (m > 120) window.__ms = 120; return m; });
  try { return await f(); } finally { await p.evaluate((m) => { window.__ms = m; }, abans); }
}
const quieta = (p) => depressa(p, () => p.waitForFunction(() => document.querySelector('#escena').dataset.quieta === 'true', null, { timeout: 30000 }));
async function gira(p, com = 'boto') {
  const abans = await cara(p);
  await depressa(p, async () => {
    if (com === 'boto') await p.locator('#gira').click();
    else await p.keyboard.press(com);
    await p.waitForFunction((c) => document.body.dataset.girant === 'false' && Number(document.body.dataset.cara) === 1 - c, abans, { timeout: 30000 })
      .catch((e) => { throw new Error(`la bomba no ha acabat de girar: ${e.message}`); });
  });
  await quieta(p);
}
const caraDe = (p, m) => p.evaluate((x) => Number(document.querySelector(`#espais [data-modul="${x}"]`).dataset.cara), m);
// Abans de tocar un mòdul, es gira la bomba fins que es veu.
async function veu(p, m) { if ((await caraDe(p, m)) !== (await cara(p))) await gira(p); }
// Llegeix la carcassa com qui desactiva: el que es veu a la cara d'ara, gira, i la resta.
async function llegeixCarcassa(p) {
  const vistes = new Map();
  for (let k = 0; k < 2; k++) {
    const c = await cara(p);
    const peces = await p.evaluate(() => [...document.querySelectorAll('#carcassa .peca')].map((e) => ({ ...e.dataset, text: e.textContent })));
    for (const pc of peces) {
      const aqui = Number(pc.cara) === c;
      assert.strictEqual(pc.veu, String(aqui), 'només es llegeix la carcassa de la cara que es veu');
      if (!aqui) { assert.strictEqual(pc.text, '', "la peça de l'altra cara no es pot llegir"); continue; }
      vistes.set(`${pc.tipus}:${pc.cara}:${pc.ranura}`, pc);
    }
    assert(peces.some((pc) => Number(pc.cara) === c), 'cada cara porta alguna peça de la carcassa');
    if (k === 0) await gira(p);
  }
  const v = [...vistes.values()];
  const serie = v.filter((x) => x.tipus === 'serie');
  assert.strictEqual(serie.length, 1);
  return {
    numero: Number(serie[0].valor.split('-')[1]),
    piles: v.filter((x) => x.tipus === 'piles').reduce((t, x) => t + Number(x.n), 0),
    indicadors: v.filter((x) => x.tipus === 'indicador').map((x) => ({ ences: x.ences === 'true' })),
  };
}
// Llegeix la carcassa i cada mòdul. Si un mòdul surt dues vegades, cada instància té les seves dades a «inst».
const llegeix = async (p, moduls = R.MODULS) => {
  const base = await llegeixCarcassa(p);
  assert.strictEqual(base.indicadors.length, 2);
  const inst = {};
  for (const { id, nom } of R.instancies(moduls)) {
    const d = await proves[nom].llegeix(p, id);
    if (id === nom) Object.assign(base, d);
    inst[id] = d;
  }
  base.inst = Object.fromEntries(Object.entries(inst).map(([id, d]) => [id, { ...base, ...d }]));
  return base;
};
// Les missions es busquen pel codi (per exemple, 3.4).
const idx = (codi) => { const i = R.NIVELLS.findIndex((n) => n.codi === codi); assert(i >= 0, `no hi ha la missió ${codi}`); return i; };
const total = (p) => p.evaluate(() => Number(document.querySelector('#temps').dataset.total));
const fusibles = (p) => p.evaluate(() => Number(document.querySelector('#errors').dataset.n));
const fet = (p, m) => p.evaluate((x) => document.querySelector('#fets').dataset[x] === 'true', m);
const captura = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };
// Espera dos fotogrames de veritat: després d'una explosió, el navegador lent encara pot anar endarrerit i no atendre el clic.
const fotogrames = (p) => p.evaluate(() => new Promise((ok) => window.__raf(() => window.__raf(ok))));
// Tria un nivell i espera que la partida hagi començat i que la càmera hagi acabat d'entrar.
const nivell = async (p, n) => {
  await p.waitForSelector('.nivell'); await fotogrames(p); await p.click(`.nivell[data-nivell="${n}"]`);
  await p.waitForFunction(() => document.body.dataset.fase === 'joc');
  await quieta(p);
};
// Les pauses només serveixen per fer les captures, i només es fan quan se'n demanen.
const pausaCaptura = (p, ms) => (CAPTURES ? p.waitForTimeout(ms) : null);


// Les proves fan servir codis ocults propis: els de debò no són al repositori.
const CODIS_PROVA = { obre: 'prova obre', demo: 'prova demo', tauler: 'prova tauler' };
const { fitxer } = require('../scripts/codis.js');
const codisProva = fitxer(CODIS_PROVA, 'sal-de-prova');
// A les proves no hi ha targeta gràfica: es dibuixa poc perquè el rellotge no vagi carregat,
// i es pot saltar o aturar el temps per comprovar el final de la partida.
const rellotge = (ms) => `(() => {
  window.__ms = ${ms};
  const raf = window.requestAnimationFrame.bind(window);
  window.__raf = raf;
  window.requestAnimationFrame = (f) => setTimeout(() => raf(f), window.__ms);
  const ara = performance.now.bind(performance); let salt = 0; let fix = null;
  performance.now = () => (fix !== null ? fix + salt : ara() + salt);
  window.__salta = (ms) => { salt += ms; };
  window.__atura = () => { fix = ara(); };
  window.__segueix = () => { salt += fix - ara(); fix = null; };
})();`;
// La portada i el «Com es juga» ja s'han vist: les proves que només juguen van directes a les missions.
// tests/app.test.js és el que prova la portada, el «Com es juga» i l'app.
const saltaIntro = `try { sessionStorage.setItem('boombera.portada', '1'); localStorage.setItem('boombera.comEsJuga', '1'); } catch (e) {}`;
// El mode demostració (tot obert, sense equip ni desar) per a les proves que només juguen.
const modeDemo = `sessionStorage.setItem('boombera.mode', ${JSON.stringify(JSON.stringify(CODIS_PROVA.demo))});`;
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// Espera que es compleixi una condició de les proves (per exemple, que el full tingui una fila més), sense pauses fixes.
async function espera(f, que, ms = 20000) {
  const fi = Date.now() + ms;
  for (;;) {
    if (await f()) return;
    if (Date.now() > fi) throw new Error(`ha passat massa temps esperant: ${que}`);
    await new Promise((ok) => setTimeout(ok, 50));
  }
}
module.exports = { servidor, CAPTURES, proves, cara, depressa, quieta, gira, caraDe, veu, llegeixCarcassa, llegeix, idx, total, fusibles, fet, captura, fotogrames, nivell, pausaCaptura, SITE, R, CODIS_PROVA, rellotge, modeDemo, saltaIntro, ARGS, espera };
