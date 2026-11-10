(function () {
  // L'anell es dibuixa a partir de les regles, en sentit horari i començant per dalt.
  const anell = (colors) => {
    const c = 80; const r = 56;
    const punt = (i) => { const a = (i / colors.length) * 2 * Math.PI - Math.PI / 2; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
    const fletxes = colors.map((_, i) => {
      const a0 = (i / colors.length) * 2 * Math.PI - Math.PI / 2 + 0.5; const a1 = a0 + (2 * Math.PI) / colors.length - 1;
      const [x0, y0, x1, y1] = [c + r * Math.cos(a0), c + r * Math.sin(a0), c + r * Math.cos(a1), c + r * Math.sin(a1)];
      return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#000" stroke-width="2" marker-end="url(#punta)"/>`;
    }).join('');
    const noms = colors.map((nom, i) => { const [x, y] = punt(i); return `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${nom}</text>`; }).join('');
    return `<svg class="anell" viewBox="0 0 160 160" role="img" aria-label="Anell en sentit horari: ${colors.join(', ')}"><defs><marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>${fletxes}${noms}<text x="${c}" y="${c + 4}" text-anchor="middle" class="centre">horari</text></svg>`;
  };

  (window.ManualModuls = window.ManualModuls || {}).sequencia = (R, esc) => {
    const C = R.SEQUENCIA;
    const exemple = { piles: 2, numero: 47 };
    const flaixos = [C.anell[0], C.anell[3]];
    const tecles = flaixos.map((f) => R.respostaSequencia(exemple, f, 0));
    const tecles1 = flaixos.map((f) => R.respostaSequencia(exemple, f, 1));
    return `
  <h2 class="primer-titol">Mòdul de seqüència</h2>
  <p class="to">La llum parla en clau. Tu tens la clau, però no la llum.</p>
  <div class="amb-anell">
    <div>
      <p>La lent fa uns flaixos de colors, i qui desactiva te'ls ha de cantar. Tu li dius quines tecles ha de prémer, en el mateix ordre. Hi ha ${C.rondes.length} rondes, de ${esc(C.rondes.join(', ').replace(/, (\d+)$/, ' i $1'))} flaixos. Cada ronda repeteix els flaixos de l'anterior i n'hi afegeix.</p>
      <p><strong>Salts:</strong> piles + errors comesos fins ara, a qualsevol mòdul.<br><strong>Sentit:</strong> horari si el número de sèrie és parell, antihorari si és senar.</p>
      <p><strong>Cada flaix, una tecla.</strong> Cal contestar tots els flaixos de la ronda, un per un i en el mateix ordre: si la lent en fa ${C.rondes[0]}, es premen ${C.rondes[0]} tecles. Cada flaix es tradueix des del seu propi color, no des del flaix anterior ni des de la tecla premuda.</p>
      <p>Exemple: amb ${exemple.piles} piles, cap error i la sèrie ${exemple.numero} hi ha ${R.saltsSequencia(exemple, 0)} salts en sentit ${R.sentitSequencia(exemple)}. Si la lent fa <strong>${esc(flaixos.join(', '))}</strong>, cal prémer <strong>${esc(tecles[0])}</strong> (pel ${esc(flaixos[0])}) i després <strong>${esc(tecles[1])}</strong> (pel ${esc(flaixos[1])}).</p>
      <p>Una tecla bona no encén res de nou: passeu al flaix següent. Si l'Agent s'atura uns segons, la lent torna a fer la ronda, però les tecles bones ja compten: seguiu on éreu.</p>
      <p>Una tecla equivocada és un error i la ronda torna a començar des del primer flaix. Cada error, sigui on sigui, afegeix un salt: refeu el càlcul. A l'exemple, amb 1 error, caldria prémer ${esc(tecles1[0])} i ${esc(tecles1[1])}.</p>
    </div>
    ${anell(C.anell)}
  </div>`;
  };
})();
