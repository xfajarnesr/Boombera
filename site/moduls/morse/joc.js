// Senyal: la bombeta repeteix una paraula en morse. El canal surt de la paraula, la sèrie i les piles.
const R = window.Curtcircuit;
const M = R.MORSE;

// Llista de passos de la paraula: [encesa?, unitats]. El final és la pausa llarga abans de repetir.
function passos(paraula) {
  const p = [];
  [...paraula].forEach((l, i) => {
    [...M.codi[l]].forEach((s, k) => {
      if (k) p.push([false, M.entreSenyals, '']);
      p.push([true, s === '.' ? M.punt : M.ratlla, s === '.' ? 'curt' : 'llarg']);
    });
    if (i < paraula.length - 1) p.push([false, M.entreLletres, 'lletra']);
  });
  p.push([false, M.entreRepeticions, 'paraula']);
  return p;
}

export function creaJoc(ctx) {
  const { b, grup, so } = ctx;
  const avis = ctx.dada('morse', 'Bombeta apagada');
  const seq = passos(b.morse.paraula);
  let canal = 0; let t = null; let n = 0;

  const para = () => { clearTimeout(t); t = null; grup.userData.llum(false); };
  function reprodueix() {
    para();
    let i = 0;
    const pas = () => {
      if (!ctx.actiu()) { grup.userData.llum(false); return; }
      const [ences, unitats, tipus] = seq[i];
      grup.userData.llum(ences);
      // Qui desactiva veu si la llum dura poc o molt, i les pauses llargues entre lletres i paraules.
      avis.dataset.estat = ences ? tipus : (tipus || 'apagada');
      avis.dataset.n = ++n;
      avis.textContent = ences ? `Bombeta: ${tipus}` : tipus === 'paraula' ? 'Bombeta: pausa llarga' : 'Bombeta apagada';
      i = (i + 1) % seq.length;
      t = setTimeout(pas, unitats * M.unitatMs);
    };
    t = setTimeout(pas, M.entreLletres * M.unitatMs);
  }

  const pintaCanal = () => { grup.userData.canal(canal); avis.dataset.canal = canal; };
  function xifra(i, pas) {
    if (!ctx.actiu()) return;
    so.tic(false);
    const d = [Math.floor(canal / 10), canal % 10];
    d[i] = (d[i] + pas + 10) % 10;
    canal = d[0] * 10 + d[1];
    pintaCanal();
  }
  function envia() {
    if (!ctx.actiu()) return;
    so.tall();
    grup.userData.envia();
    if (canal === R.canalMorse(b)) { para(); ctx.resolt(); } else ctx.error();
  }
  const boto = (classe, etiqueta, accio, d) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = `diana ${classe}`;
    el.setAttribute('aria-label', etiqueta);
    el.addEventListener('click', accio);
    ctx.diana(el, d.x, d.y, d.w, d.h);
    return el;
  };
  grup.userData.xifres.forEach((x, i) => {
    const nom = i ? 'Unitats' : 'Desenes';
    boto('canal-amunt', `${nom} del canal, una més`, () => xifra(i, 1), { x: x.x, y: x.yAmunt, w: x.w, h: x.h }).dataset.i = i;
    boto('canal-avall', `${nom} del canal, una menys`, () => xifra(i, -1), { x: x.x, y: x.yAvall, w: x.w, h: x.h }).dataset.i = i;
  });
  boto('envia-canal', 'Transmet el canal', envia, grup.userData.boto);
  pintaCanal();
  return { arrenca: reprodueix, atura: para };
}
