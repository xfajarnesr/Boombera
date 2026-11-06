// Cables amb ratlles: cal tallar tots els que diu el diagrama, i cap més.
const R = window.Curtcircuit;
const PLURAL = { vermell: 'vermelles', blau: 'blaves', groc: 'grogues', blanc: 'blanques', negre: 'negres' };

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const { cables } = b.ratlles;
  const cal = new Set(R.solucioRatlles(b));
  const tallats = new Set();
  const descriu = (c, i) => `Cable ${i + 1}, ${c.color}${c.ratlla ? ` amb ratlles ${PLURAL[c.ratlla]}` : ''}, LED ${c.led ? 'encès' : 'apagat'}, xifra ${c.xifra}`;
  grup.userData.cables.forEach((d, i) => {
    const c = cables[i];
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana ratllat';
    Object.assign(el.dataset, { i, color: c.color, ratlla: c.ratlla || '', led: c.led, xifra: c.xifra });
    el.setAttribute('aria-label', descriu(c, i));
    el.addEventListener('pointerenter', () => grup.userData.realca(i, true));
    el.addEventListener('pointerleave', () => grup.userData.realca(i, false));
    el.addEventListener('focus', () => grup.userData.realca(i, true));
    el.addEventListener('blur', () => grup.userData.realca(i, false));
    el.addEventListener('click', () => {
      if (!ctx.actiu() || tallats.has(i)) return;
      tallats.add(i);
      so.tall();
      grup.userData.talla(i);
      el.setAttribute('aria-label', `${descriu(c, i)}, tallat`);
      el.disabled = true; el.dataset.tallat = 'true';
      grup.userData.realca(i, false);
      if (!cal.has(i)) ctx.error();
      else if ([...cal].every((k) => tallats.has(k))) ctx.resolt();
    });
    ctx.diana(el, d.x, d.y, d.w, d.h);
  });
  return {};
}
