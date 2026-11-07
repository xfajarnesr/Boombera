// Generat per scripts/app.js (npm run app): no l'editis a mà.
// Guarda el joc per jugar sense connexió. No toca les crides al full de càlcul, ni el manual ni el tauler.
const VERSIO = '556c50f178ad';
const MEMORIA = 'boombera-' + VERSIO;
const FITXERS = [
  "./",
  "app.js",
  "comu/codis.js",
  "comu/comu.css",
  "comu/config.js",
  "comu/fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "comu/fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "comu/fonts/barlow-condensed-latin-700-normal.woff2",
  "comu/fonts/saira-stencil-one-latin-400-normal.woff2",
  "comu/logo.js",
  "comu/regles.js",
  "comu/textos.js",
  "dades/dades.js",
  "dades/nucli.js",
  "icones/icona-192.png",
  "icones/icona-512.png",
  "icones/icona-adaptable-512.png",
  "icones/icona-iphone-180.png",
  "icones/icona.svg",
  "index.html",
  "joc.css",
  "joc.js",
  "manifest.webmanifest",
  "moduls/boto/3d.js",
  "moduls/boto/joc.js",
  "moduls/cables/3d.js",
  "moduls/cables/joc.js",
  "moduls/contrasenya/3d.js",
  "moduls/contrasenya/joc.js",
  "moduls/interruptors/3d.js",
  "moduls/interruptors/joc.js",
  "moduls/laberint/3d.js",
  "moduls/laberint/joc.js",
  "moduls/memoria/3d.js",
  "moduls/memoria/joc.js",
  "moduls/morse/3d.js",
  "moduls/morse/joc.js",
  "moduls/ratlles/3d.js",
  "moduls/ratlles/joc.js",
  "moduls/registre.js",
  "moduls/sequencia/3d.js",
  "moduls/sequencia/joc.js",
  "moduls/simbols/3d.js",
  "moduls/simbols/joc.js",
  "motor/escena.js",
  "motor/peces.js",
  "motor/so.js",
  "vendor/RoomEnvironment.js",
  "vendor/three.module.min.js"
];
const ARREL = new URL('./', self.location).pathname;
const FORA = /^(manual|tauler)\//;

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
