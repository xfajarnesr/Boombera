(function () {
  const R = window.Curtcircuit;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  // Quins mòduls van a cada full, a partir del full 2.
  const FULLS = [['cables', 'boto'], ['sequencia', 'memoria'], ['contrasenya', 'simbols'], ['laberint', 'morse'], ['interruptors', 'ratlles']];
  const total = FULLS.length + 1;

  function pintaManual() {
    const fmt = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    // Graella de missions: una fila per secció i una casella per missió, amb el temps i els errors.
    const errs = (n) => (n === 1 ? '1 error' : `${n} errors`);
    $('#t-nivells').innerHTML = R.SECCIONS.map((s, i) => `<tr><th scope="row"><b>${i + 1}</b> ${esc(s.nom)}</th>${
      R.NIVELLS.filter((n) => n.seccio === i + 1).map((n) => `<td data-codi="${n.codi}"><span class="codi">${n.codi}</span> ${fmt(n.segons)}, ${errs(n.errors)}</td>`).join('')
    }</tr>`).join('');
    const primer = $('#vista-manual .full');
    primer.querySelector('[data-full]').textContent = `Full 1 de ${total}`;
    FULLS.forEach((moduls, i) => {
      const art = document.createElement('article');
      art.className = 'full';
      art.innerHTML = `${moduls.map((m) => window.ManualModuls[m](R, esc)).join('')}
        <footer class="peu-full"><span>Boombera, regles <span data-versio></span></span><span>Full ${i + 2} de ${total}</span></footer>`;
      const h = art.querySelector('h2'); if (h) h.classList.add('primer-titol');
      $('#vista-manual').appendChild(art);
    });
    document.querySelectorAll('[data-versio]').forEach((n) => { n.textContent = `v${R.VERSIO}`; });
    document.querySelectorAll('[data-dada]').forEach((n) => { n.textContent = R.PARTIDA.penalitzacio; });
  }

  pintaManual();
})();
