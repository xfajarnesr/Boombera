(window.ManualModuls = window.ManualModuls || {}).simbols = (R, esc) => `
  <h2>Mòdul de símbols</h2>
  <p class="to">No cal saber com es diuen. Cal saber descriure'ls.</p>
  <p>Hi ha ${R.PLAQUES} plaques, cada una amb un símbol. Fes-te'ls descriure, busca'ls i suma'n els valors. <strong>Si la suma és parella</strong>, s'han de prémer de valor petit a gran. <strong>Si és senar</strong>, de gran a petit. Una placa equivocada és un error i la seqüència torna a començar.</p>
  <div class="simbols">${R.SIMBOLS.map((s) => `<div class="simbol"><svg viewBox="0 0 100 100" role="img" aria-label="${esc(s.nom)}"><path d="${s.d}" fill="none" stroke="#000" stroke-width="${R.GRUIX_SIMBOL}" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="nom-simbol">${esc(s.nom)}</span><strong>${s.valor}</strong></div>`).join('')}</div>`;
