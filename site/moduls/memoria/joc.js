// Memòria: quatre etapes, i cada una pot dependre del que s'ha premut abans.
const R = window.Curtcircuit;

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const avis = ctx.dada('pantalla-mem', '');
  let etapa = 0; let premudes = [];

  const botons = [0, 1, 2, 3].map((i) => {
    const k = grup.userData.tecles[i];
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'diana tecla-mem'; el.dataset.i = i;
    el.addEventListener('click', () => prem(i));
    ctx.diana(el, k.x, k.y, k.w, k.h);
    return el;
  });

  function pinta() {
    const { pantalla, ordre } = b.memoria.etapes[etapa];
    grup.userData.mostra(pantalla, ordre, etapa);
    avis.textContent = `Pantalla ${pantalla}, etapa ${etapa + 1}`;
    avis.dataset.valor = pantalla; avis.dataset.etapa = etapa;
    botons.forEach((el, i) => {
      el.dataset.valor = ordre[i];
      el.setAttribute('aria-label', `Tecla ${i + 1}, valor ${ordre[i]}`);
    });
  }

  function prem(i) {
    if (!ctx.actiu()) return;
    so.tall();
    grup.userData.prem(i);
    if (i !== R.solucioMemoria(b, etapa, premudes)) {
      etapa = 0; premudes = [];
      pinta();
      ctx.error();
      return;
    }
    premudes.push({ valor: b.memoria.etapes[etapa].ordre[i], posicio: i });
    etapa += 1;
    if (etapa === R.MEMORIA.etapes) { grup.userData.etapa(etapa); ctx.resolt(); return; }
    pinta();
  }

  pinta();
  return {};
}
