(function () {
  // Cada laberint es dibuixa a partir de les mateixes dades que fa servir la bomba.
  const dibuix = (R, L, n) => {
    const N = R.LABERINT.costat; const c = 10; const m = 9; const tot = N * c;
    const px = (x) => m + x * c; const py = (y) => m + (N - 1 - y) * c; // y = 0 és la fila 1, a baix
    let parets = '';
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      if (x < N - 1 && !R.obert(L, [x, y], 'dreta')) parets += `M${px(x + 1)} ${py(y)}v${c}`;
      if (y > 0 && !R.obert(L, [x, y], 'avall')) parets += `M${px(x)} ${py(y) + c}h${c}`;
    }
    let punts = '';
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) punts += `<circle cx="${px(x) + c / 2}" cy="${py(y) + c / 2}" r=".9"/>`;
    const centre = (nom) => { const [x, y] = R.casella(nom); return [px(x) + c / 2, py(y) + c / 2]; };
    const marques = L.marques.map((k) => { const [x, y] = centre(k); return `<path class="marca" d="M${x} ${y - 3.6}L${x + 3.6} ${y}L${x} ${y + 3.6}L${x - 3.6} ${y}Z"/>`; }).join('');
    const sortides = L.sortides.map((k, i) => { const [x, y] = centre(k); return `<circle class="sortida" cx="${x}" cy="${y}" r="3.9"/><text x="${x}" y="${y + 2.3}" text-anchor="middle" class="num-sortida">${i + 1}</text>`; }).join('');
    const coords = Array.from({ length: N }, (_, i) => `<text x="${px(i) + c / 2}" y="${m - 2.5}" text-anchor="middle">${R.LABERINT.columnes[i]}</text><text x="${m - 2.5}" y="${py(i) + c / 2 + 1.6}" text-anchor="end">${i + 1}</text>`).join('');
    return `<svg class="laberint" viewBox="0 0 ${tot + m + 2} ${tot + m + 2}" role="img" aria-label="Laberint ${n} amb marques a ${L.marques.join(' i ')}">
      <g class="coords">${coords}</g><g class="punts">${punts}</g>
      <rect x="${m}" y="${m}" width="${tot}" height="${tot}" class="vora"/><path d="${parets}" class="paret"/>${marques}${sortides}</svg>`;
  };

  (window.ManualModuls = window.ManualModuls || {}).laberint = (R) => `
  <h2>Mòdul de laberint</h2>
  <p class="to">Les parets hi són. Només que no les veu ningú, excepte tu.</p>
  <p>A la bomba hi ha una graella amb una llum blanca i dues marques en forma de rombe. Fes-te dir les coordenades de les <strong>dues</strong> marques: cada marca sola surt a dos laberints, però totes dues juntes només a un. La sortida no es veu a la bomba: <strong>és la del número que coincideix amb les piles</strong>.</p>
  <p>Guia la llum casella a casella fins a la sortida. Topar amb una paret o amb la vora és un error, i la llum es queda on era. Passar per una altra sortida no fa res.</p>
  <div class="laberints">${R.LABERINTS.map((L, i) => dibuix(R, L, i + 1)).join('')}</div>`;
})();
