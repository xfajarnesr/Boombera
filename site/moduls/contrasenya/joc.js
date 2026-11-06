// Contrasenya: es llegeixen els rodets, i la suma de xifres de la sèrie tria entre les dues paraules.
const R = window.Curtcircuit;

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const { rodets, inici } = b.contrasenya;
  const n = R.CONTRASENYA.lletres;
  const pos = [...inici];
  const avis = ctx.dada('rodets', '');
  const paraula = () => pos.map((p, i) => rodets[i][p]).join('');
  const pintaAvis = () => { avis.textContent = `Rodets: ${paraula()}`; avis.dataset.paraula = paraula(); };

  function mou(i, pas) {
    if (!ctx.actiu()) return;
    so.tic(false);
    pos[i] = (pos[i] + pas + n) % n;
    grup.userData.lletra(i, rodets[i][pos[i]], pas);
    pintaAvis();
  }
  function envia() {
    if (!ctx.actiu()) return;
    so.tall();
    grup.userData.envia();
    if (paraula() === R.solucioContrasenya(b)) ctx.resolt(); else ctx.error();
  }
  const boto = (classe, etiqueta, accio, d) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = `diana ${classe}`;
    el.setAttribute('aria-label', etiqueta);
    el.addEventListener('click', accio);
    ctx.diana(el, d.x, d.y, d.w, d.h);
    return el;
  };

  const F = grup.userData.fletxes;
  grup.userData.rodets.forEach((r, i) => {
    grup.userData.lletra(i, rodets[i][pos[i]]);
    boto('rodet-amunt', `Rodet ${i + 1}, lletra següent`, () => mou(i, 1), { x: r.x, y: F.yR + F.dy, w: F.w, h: F.h }).dataset.i = i;
    boto('rodet-avall', `Rodet ${i + 1}, lletra anterior`, () => mou(i, -1), { x: r.x, y: F.yR - F.dy, w: F.w, h: F.h }).dataset.i = i;
  });
  boto('envia-contrasenya', 'Envia la contrasenya', envia, grup.userData.boto);
  pintaAvis();
  return {};
}
