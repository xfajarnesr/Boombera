// Seqüència: la lent fa flaixos i les tecles es premen segons l'anell del manual.
const R = window.Curtcircuit;
const C = R.SEQUENCIA;

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const avis = ctx.dada('senyal', 'Senyal apagat');
  let ronda = 0; let pos = 0; let t = null; let n = 0;

  const para = () => { clearTimeout(t); t = null; grup.userData.senyal(null); avis.removeAttribute('data-color'); avis.textContent = 'Senyal apagat'; };
  const llarg = () => C.rondes[ronda];
  function reprodueix() {
    para();
    let i = 0;
    const pas = () => {
      if (!ctx.actiu()) return;
      const color = b.sequencia.flaixos[i];
      grup.userData.senyal(color);
      avis.textContent = `Senyal ${color}`;
      avis.dataset.color = color; avis.dataset.i = i; avis.dataset.llarg = llarg(); avis.dataset.n = ++n;
      t = setTimeout(() => {
        grup.userData.senyal(null);
        i += 1;
        if (i < llarg()) t = setTimeout(pas, C.pausaMs);
        else { i = 0; t = setTimeout(pas, C.descansMs); }
      }, C.flaixMs);
    };
    t = setTimeout(pas, C.pausaMs);
  }
  const mesTard = (ms) => { clearTimeout(t); if (ctx.actiu()) t = setTimeout(reprodueix, ms); };

  function prem(color, i) {
    if (!ctx.actiu()) return;
    so.tall();
    para();
    grup.userData.prem(i);
    if (color !== R.respostaSequencia(b, b.sequencia.flaixos[pos], ctx.errors())) {
      pos = 0;
      ctx.error();
      mesTard(C.entreRondesMs);
      return;
    }
    pos += 1;
    if (pos < llarg()) { mesTard(C.reprenMs); return; }
    pos = 0; ronda += 1;
    grup.userData.ronda(ronda);
    if (ronda === C.rondes.length) ctx.resolt(); else mesTard(C.entreRondesMs);
  }

  grup.userData.tecles.forEach((k, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana tecla-seq';
    el.dataset.color = k.color;
    el.setAttribute('aria-label', `Tecla ${k.color}`);
    el.addEventListener('click', () => prem(k.color, i));
    ctx.diana(el, k.x, k.y, k.w, k.h);
  });

  return { arrenca: reprodueix, atura: para };
}
