// Símbols: les plaques es premen per ordre de valor, i el sentit surt de la suma.
const R = window.Curtcircuit;

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const ordre = R.solucioSimbols(b);
  let pos = 0;

  function prem(i) {
    if (!ctx.actiu()) return;
    so.tall();
    grup.userData.prem(i);
    if (i !== ordre[pos]) {
      pos = 0;
      grup.userData.encerts([]);
      ctx.error();
      return;
    }
    pos += 1;
    grup.userData.encerts(ordre.slice(0, pos));
    if (pos === ordre.length) ctx.resolt();
  }

  grup.userData.plaques.forEach((k, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana placa'; el.dataset.i = i; el.dataset.simbol = k.id;
    el.setAttribute('aria-label', `Placa ${i + 1}: ${R.simbol(k.id).nom}`);
    el.addEventListener('click', () => prem(i));
    ctx.diana(el, k.x, k.y, k.w, k.h);
  });
  return {};
}
