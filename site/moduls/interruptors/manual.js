(window.ManualModuls = window.ManualModuls || {}).interruptors = (R, esc) => {
  const I = R.INTERRUPTORS;
  // Exemple calculat amb les mateixes regles.
  const D = 78; const t = R.objectiuInterruptors(D); const f = R.filaInterruptors(D);
  const pos = (numero) => R.solucioInterruptors({ numero, interruptors: { d: D } }).map((a) => (a ? 'amunt' : 'avall')).join(', ');
  const tira = (pesos, titol) => `<div class="tira-pesos"><span class="titol-tira">${titol}</span>${pesos.map((p) => `<span>${p}</span>`).join('')}</div>`;
  return `
  <h2>Mòdul d'interruptors</h2>
  <p class="to">Cinc palanques, trenta-una maneres d'encertar-la i una de sola que val.</p>
  <p>El visor mostra un nombre de dues xifres, D. Fes-te'l dir i busca'n l'objectiu amb la primera fila que es compleixi. Després escriu l'objectiu en binari: cada palanca <strong>amunt val el seu pes</strong> i cada palanca <strong>avall val 0</strong>. Dicta-les una a una i qui desactiva prem FIXA. Fixar una combinació equivocada és un error i les palanques es queden on són.</p>
  <table class="interruptors">
    <thead><tr><th scope="col">Si…</th><th scope="col">L'objectiu és</th></tr></thead>
    <tbody>${R.FILES_INTERRUPTORS.map((x) => `<tr><td>${esc(x.condicio)}</td><td><strong>${esc(x.objectiu)}</strong></td></tr>`).join('')}</tbody>
  </table>
  <div class="pesos">
    ${tira(I.pesos, 'Sèrie parella')}
    ${tira([...I.pesos].reverse(), 'Sèrie senar')}
  </div>
  <p class="exemple">Els pesos van d'esquerra a dreta tal com els veu qui desactiva. Exemple: amb D = ${D}, la fila «${esc(f.condicio.replace(/^Si no, /, ''))}» dona ${t}. Amb una sèrie parella queda ${esc(pos(48))}. Amb una sèrie senar, ${esc(pos(47))}.</p>`;
};
