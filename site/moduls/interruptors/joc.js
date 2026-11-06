// Interruptors: cada palanca puja o baixa, i FIXA comprova la combinació.
const R = window.Curtcircuit;

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const palanques = [...b.interruptors.inici];
  const avis = ctx.dada('interruptors', '');
  avis.dataset.d = b.interruptors.d;
  const pinta = () => {
    avis.dataset.palanques = palanques.map((a) => (a ? '1' : '0')).join('');
    avis.textContent = `Visor: ${b.interruptors.d}. Palanques d'esquerra a dreta: ${palanques.map((a) => (a ? 'amunt' : 'avall')).join(', ')}`;
  };
  const dianes = grup.userData.palanques.map((d, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana palanca'; el.dataset.i = i;
    el.addEventListener('click', () => {
      if (!ctx.actiu()) return;
      palanques[i] = !palanques[i];
      so.tic(false);
      grup.userData.posa(i, palanques[i]);
      etiqueta(el, i);
      pinta();
    });
    ctx.diana(el, d.x, d.y, d.w, d.h);
    return el;
  });
  const etiqueta = (el, i) => el.setAttribute('aria-label', `Palanca ${i + 1}, ${palanques[i] ? 'amunt' : 'avall'}`);
  dianes.forEach(etiqueta);

  const fixa = document.createElement('button');
  fixa.type = 'button'; fixa.className = 'diana fixa';
  fixa.setAttribute('aria-label', 'Fixa la combinació');
  fixa.addEventListener('click', () => {
    if (!ctx.actiu()) return;
    so.tall();
    grup.userData.fixa();
    if (palanques.join() === R.solucioInterruptors(b).join()) ctx.resolt(); else ctx.error();
  });
  const d = grup.userData.boto;
  ctx.diana(fixa, d.x, d.y, d.w, d.h);
  pinta();
  return {};
}
