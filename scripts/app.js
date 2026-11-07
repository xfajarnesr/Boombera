// Fa site/sw.js, el service worker que guarda el joc per jugar sense connexió: npm run app.
// La llista de fitxers i la versió surten del contingut de site/, i una prova comprova que sw.js està al dia.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITE = path.join(__dirname, '..', 'site');
// Fora de la memòria de l'app: el manual i el tauler (necessiten la xarxa o són per a una altra pantalla),
// els textos del manual de cada mòdul, les llicències i el mateix service worker.
const FORA = [/^manual\//, /^tauler\//, /^moduls\/[^/]+\/manual\.js$/, /LICENSE/, /^sw\.js$/, /\.pdf$/, /^\./];

function fitxers(dir = SITE, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) => {
    const rel = base + e.name;
    if (e.isDirectory()) return fitxers(path.join(dir, e.name), rel + '/');
    return FORA.some((r) => r.test(rel)) ? [] : [rel];
  });
}

function genera() {
  const llista = fitxers();
  const h = crypto.createHash('sha256');
  for (const f of llista) { h.update(f); h.update(fs.readFileSync(path.join(SITE, f))); }
  const versio = h.digest('hex').slice(0, 12);
  return `// Generat per scripts/app.js (npm run app): no l'editis a mà.
// Guarda el joc per jugar sense connexió. No toca les crides al full de càlcul, ni el manual ni el tauler.
const VERSIO = '${versio}';
const MEMORIA = 'boombera-' + VERSIO;
const FITXERS = ${JSON.stringify(['./', ...llista], null, 2)};
const ARREL = new URL('./', self.location).pathname;
const FORA = /^(manual|tauler)\\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(MEMORIA).then((c) => c.addAll(FITXERS.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((noms) => Promise.all(noms.filter((n) => n.startsWith('boombera-') && n !== MEMORIA).map((n) => caches.delete(n)))));
});
// La pàgina demana aplicar la versió nova quan és a la portada o a les missions.
self.addEventListener('message', (e) => { if (e.data === 'aplica') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const q = e.request;
  if (q.method !== 'GET') return;
  const u = new URL(q.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(ARREL) || FORA.test(u.pathname.slice(ARREL.length))) return;
  // Primer la memòria (l'enllaç de la missió lliure porta paràmetres: no compten), i si no hi és, la xarxa.
  e.respondWith(caches.open(MEMORIA).then(async (c) => {
    const desat = (await c.match(q, { ignoreSearch: true })) || (q.mode === 'navigate' ? await c.match('./') : null);
    return desat || fetch(q);
  }));
});
`;
}

if (require.main === module) {
  fs.writeFileSync(path.join(SITE, 'sw.js'), genera());
  console.log(`site/sw.js fet amb ${fitxers().length} fitxers.`);
}
module.exports = { genera, fitxers };
