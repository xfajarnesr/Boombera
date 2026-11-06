// Cables: controls i lògica de partida.
const R = window.Curtcircuit;

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const tallats = new Set();
  grup.userData.cables.forEach((c, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana cable';
    el.dataset.i = i; el.dataset.color = b.cables[i];
    el.setAttribute('aria-label', `Cable ${i + 1}, ${b.cables[i]}`);
    el.addEventListener('pointerenter', () => grup.userData.realca(i, true));
    el.addEventListener('pointerleave', () => grup.userData.realca(i, false));
    el.addEventListener('focus', () => grup.userData.realca(i, true));
    el.addEventListener('blur', () => grup.userData.realca(i, false));
    el.addEventListener('click', () => {
      if (!ctx.actiu() || tallats.has(i)) return;
      tallats.add(i);
      so.tall();
      grup.userData.talla(i);
      el.setAttribute('aria-label', `Cable ${i + 1}, ${b.cables[i]}, tallat`);
      el.disabled = true;
      grup.userData.realca(i, false);
      if (i === R.solucioCables(b)) ctx.resolt(); else ctx.error();
    });
    ctx.diana(el, c.x, c.y, c.w, c.h);
  });
  return {};
}
