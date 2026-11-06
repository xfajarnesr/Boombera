(function () {
  // Geometria del diagrama: quatre el·lipses, cada una amb un traç diferent perquè es distingeixin en blanc i negre.
  const E = [
    { cx: 87.7, cy: 70.3, a: 42.3 },
    { cx: 112.3, cy: 70.3, a: -42.3 },
    { cx: 76, cy: 79.7, a: 42.3 },
    { cx: 124, cy: 79.7, a: -42.3 },
  ];
  const RX = 74.1; const RY = 30.7;
  // On va la lletra de cada zona (la clau és la suma de bits dels conjunts: R=1, L=2, P=4, V=8).
  const LLOC = [[19, 91], [87, 40], [114, 39], [100, 50], [29, 57], [56, 51], [63, 98], [89, 61], [171, 57], [137, 98], [143, 51], [111, 61], [100, 124], [125, 109], [75, 109], [100, 88]];
  // On va el nom de cada conjunt: al costat de la punta de la seva el·lipse, amb una mostra del traç.
  const NOM = [[30, 9], [150, 9], [118, 142], [36, 142]];
  const TRACOS = ['trac-continu', 'trac-discontinu', 'trac-puntejat', 'trac-doble'];
  const ellipse = (e, k, cls) => `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${RX}" ry="${RY}" transform="rotate(${e.a} ${e.cx} ${e.cy})" class="${cls || TRACOS[k]}"/>`;

  (window.ManualModuls = window.ManualModuls || {}).ratlles = (R, esc) => {
    const C = R.CONJUNTS_RATLLES;
    const zona = (bits) => C.filter((_, k) => bits & (1 << k)).map((c) => c.id).join('');
    const lletres = LLOC.map(([x, y], bits) => `<text x="${x}" y="${y}" class="lletra-zona" data-zona="${zona(bits)}">${R.ZONES_RATLLES[zona(bits)]}</text>`).join('');
    const noms = NOM.map(([x, y], k) => `<line x1="${x - 14}" y1="${y}" x2="${x - 2}" y2="${y}" class="${TRACOS[k]}"/>${k === 3 ? `<line x1="${x - 14}" y1="${y}" x2="${x - 2}" y2="${y}" class="trac-doble-dins"/>` : ''}<text x="${x}" y="${y}" class="nom-conjunt">${esc(C[k].text)}</text>`).join('');
    return `
  <h2>Mòdul de cables amb ratlles</h2>
  <p class="to">Cada cable és un cas a part. Mireu-los d'un en un.</p>
  <p>Hi ha de ${R.RATLLES.minim} a ${R.RATLLES.maxim} cables, numerats d'esquerra a dreta. Per a cada un, pregunta si té ratlles, si el seu LED està encès, quina xifra té a sota i si porta vermell, de fons o a les ratlles. Busca la zona del diagrama on cau i fes el que diu la lletra. Tallar-ne un que no toca és un error. El mòdul queda resolt quan s'han tallat tots els que tocaven.</p>
  <div class="amb-venn">
    <svg class="venn" viewBox="0 0 200 150" role="img" aria-label="Diagrama de quatre conjunts">
      <rect x="0.6" y="0.6" width="198.8" height="148.8" class="marc-venn"/>
      ${E.map((e, k) => ellipse(e, k)).join('')}${ellipse(E[3], 3, 'trac-doble-dins')}
      ${lletres}${noms}
    </svg>
    <div>
      <dl class="accions-venn">${Object.entries(R.ACCIONS_RATLLES).map(([l, a]) => `<dt>${l}</dt><dd>${esc(a.text)}</dd>`).join('')}</dl>
    </div>
  </div>`;
  };
})();
