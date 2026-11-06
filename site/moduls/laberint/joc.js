// Laberint: les parets no es veuen. L'expert guia fins a la sortida que marquen les piles.
const R = window.Curtcircuit;
const NOMS = { amunt: 'Amunt', avall: 'Avall', esquerra: 'Esquerra', dreta: 'Dreta' };

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const L = R.LABERINTS[b.laberint.idx];
  const sortida = R.nomCasella(R.sortidaLaberint(b));
  let pos = [...b.laberint.inici];
  const avis = ctx.dada('laberint', '');
  avis.dataset.marques = L.marques.join(' ');
  const pinta = () => {
    const c = R.nomCasella(pos);
    avis.dataset.pos = c;
    avis.textContent = `Laberint: llum a ${c}, marques a ${L.marques.join(' i ')}`;
  };

  function mou(dir) {
    if (!ctx.actiu()) return;
    so.tic(false);
    grup.userData.prem(dir);
    const nova = R.mouLaberint(L, pos, dir);
    if (!nova) { ctx.error(); return; } // paret: la llum es queda on era
    pos = nova;
    grup.userData.posa(pos);
    pinta();
    if (R.nomCasella(pos) === sortida) ctx.resolt();
  }

  Object.entries(grup.userData.fletxes).forEach(([dir, k]) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana fletxa-lab'; el.dataset.dir = dir;
    el.setAttribute('aria-label', `Laberint: ${NOMS[dir]}`);
    el.addEventListener('click', () => mou(dir));
    ctx.diana(el, k.x, k.y, k.w, k.h);
  });
  pinta();
  return {};
}
