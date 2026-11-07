// L'app instal·lable: el service worker (funcionar sense connexió), la pantalla encesa durant la missió
// i demanar que el navegador no esborri la cua de partides. No toca res de la partida.
const cos = document.body;
const enJoc = () => cos.dataset.fase === 'joc';
const quiet = () => !enJoc() && ['portada', 'missions', 'lliure'].includes(cos.dataset.panell);

/* ---------- Service worker ---------- */
// Una versió nova s'aplica només a la portada, les missions o la missió lliure, mai a mitja bomba ni mentre s'escriu un equip.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const teniaControl = Boolean(navigator.serviceWorker.controller);
  let recarrega = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!teniaControl || recarrega) return;
    recarrega = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const aplica = () => { if (reg.waiting && quiet()) reg.waiting.postMessage('aplica'); };
    reg.addEventListener('updatefound', () => {
      const nou = reg.installing;
      if (nou) nou.addEventListener('statechange', () => { if (nou.state === 'installed') aplica(); });
    });
    new MutationObserver(aplica).observe(cos, { attributes: true, attributeFilter: ['data-panell', 'data-fase'] });
    aplica();
    cos.dataset.app = 'llesta';
  }).catch(() => { cos.dataset.app = 'sense'; });
} else cos.dataset.app = 'sense';

/* ---------- Pantalla encesa ---------- */
// Durant una missió, el mòbil no s'ha d'enfosquir. Si l'app passa a segon pla, es torna a demanar en tornar.
let pany = null;
async function mantenEncesa() {
  if (!enJoc() || pany || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { pany = await navigator.wakeLock.request('screen'); pany.addEventListener('release', () => { pany = null; }); } catch { pany = null; }
}
function deixaApagar() { if (pany) { pany.release().catch(() => {}); pany = null; } }
new MutationObserver(() => (enJoc() ? mantenEncesa() : deixaApagar())).observe(cos, { attributes: true, attributeFilter: ['data-fase'] });
document.addEventListener('visibilitychange', mantenEncesa);

/* ---------- La cua de partides es queda ---------- */
// Safari esborra les dades d'una web que fa dies que no s'obre. Demanar-ho persistent ajuda; instal·lada a la pantalla d'inici, no les esborra.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
