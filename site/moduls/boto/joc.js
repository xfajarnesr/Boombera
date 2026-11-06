// Botó: controls i lògica de partida.
const R = window.Curtcircuit;

export function creaJoc(ctx) {
  const { b, grup } = ctx;
  const avis = ctx.dada('llum', 'Llum apagada');
  let prem = null;

  const apagaLlum = () => {
    grup.userData.llum(null, 'llum apagada');
    avis.removeAttribute('data-color'); avis.textContent = 'Llum apagada';
  };
  const premBoto = () => {
    if (!ctx.actiu() || prem) return;
    const p = { viva: false, color: null };
    prem = p;
    grup.userData.prem(true);
    p.t = setTimeout(() => {
      const c = Object.keys(R.LLUMS); p.color = c[Math.floor(Math.random() * c.length)]; p.viva = true;
      const l = R.LLUMS[p.color];
      grup.userData.llum(l.hex, `llum ${l.nom}`);
      avis.dataset.color = p.color; avis.textContent = `Llum ${l.nom}`;
    }, R.PARTIDA.mantenirMs);
  };
  const deixaBoto = (cancel) => {
    const p = prem; if (!p) return;
    prem = null; clearTimeout(p.t);
    grup.userData.prem(false);
    if (cancel || !ctx.actiu()) { apagaLlum(); return; }
    const cal = R.solucioBoto(b);
    const bo = cal === 'clic' ? !p.viva : p.viva && R.LLUMS[p.color].test(ctx.segons() % 60);
    apagaLlum();
    if (bo) ctx.resolt(); else ctx.error();
  };

  const { boto } = grup.userData;
  const bt = document.createElement('button');
  bt.type = 'button'; bt.id = 'boto'; bt.className = 'diana rodona';
  bt.dataset.color = b.boto.color; bt.textContent = b.boto.paraula;
  bt.setAttribute('aria-label', `Botó ${b.boto.color} que diu ${b.boto.paraula}`);
  bt.addEventListener('pointerdown', (e) => { e.preventDefault(); try { bt.setPointerCapture(e.pointerId); } catch (x) { /* sense captura */ } premBoto(); });
  bt.addEventListener('pointerup', () => deixaBoto(false));
  bt.addEventListener('pointercancel', () => deixaBoto(true));
  bt.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); premBoto(); } });
  bt.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); deixaBoto(false); } });
  bt.addEventListener('blur', () => deixaBoto(true));
  bt.addEventListener('contextmenu', (e) => e.preventDefault());
  ctx.diana(bt, boto.x, boto.y, boto.w, boto.h);

  return { atura() { if (prem) clearTimeout(prem.t); prem = null; } };
}
