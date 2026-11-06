(function () {
  // Punts i ratlles dibuixats, perquè es llegeixin bé en una fotocòpia.
  const codi = (c) => {
    let x = 0; let d = '';
    for (const s of c) {
      if (s === '.') { d += `<circle cx="${x + 3}" cy="5" r="2.6"/>`; x += 9; } else { d += `<rect x="${x}" y="2.6" width="13" height="4.8" rx="1"/>`; x += 18; }
    }
    return `<svg viewBox="0 0 ${Math.max(x - 3, 1)} 10" style="width:${(Math.max(x - 3, 1) * 0.3).toFixed(1)}mm" aria-hidden="true">${d}</svg>`;
  };
  (window.ManualModuls = window.ManualModuls || {}).morse = (R, esc) => {
    const M = R.MORSE;
    const lletres = Object.entries(M.codi);
    const parell = { numero: 48, piles: 3, morse: { paraula: M.paraules[4].paraula } };
    const senar = { numero: 47, piles: 3, morse: { paraula: M.paraules[4].paraula } };
    return `
  <h2>Mòdul de senyal</h2>
  <p class="to">Curt, llarg, curt. Algú us vol dir alguna cosa.</p>
  <p>La bombeta repeteix una paraula en morse, amb una pausa llarga abans de tornar a començar. Fes-te cantar els senyals (curt o llarg) i les pauses entre lletres, i desxifra la paraula. Busca'n el canal. <strong>Si el número de sèrie és parell, suma-hi les piles. Si és senar, resta-les.</strong> Qui desactiva posa el resultat al visor i prem TX. Amb ${esc(parell.morse.paraula)} i 3 piles, la sèrie 48 dona el canal ${R.canalMorse(parell)} i la 47, el ${R.canalMorse(senar)}. Transmetre un altre canal és un error.</p>
  <div class="morse-alfabet">${lletres.map(([l, c]) => `<div><strong>${l}</strong>${codi(c)}</div>`).join('')}</div>
  <table class="canals"><tbody>${[0, 1].map((f) => `<tr>${M.paraules.slice(f * 6, f * 6 + 6).map((p) => `<td><span class="paraula-morse">${esc(p.paraula)}</span><span class="num-canal">${p.canal}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };
})();
