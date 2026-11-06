(function () {
  const R = window.Curtcircuit;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  // Quins mòduls van a cada full, a partir del full 2.
  const FULLS = [['cables', 'boto'], ['sequencia', 'memoria'], ['contrasenya', 'simbols'], ['laberint', 'morse']];
  const total = FULLS.length + 1;

  function pintaManual() {
    const fmt = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    $('#t-nivells').innerHTML = R.NIVELLS.map((n) => `<tr><th scope="row">${n.nom}</th><td>${fmt(n.segons)}</td><td>${n.errors} errors</td></tr>`).join('');
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
