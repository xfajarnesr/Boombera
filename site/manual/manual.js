(function () {
  const R = window.Curtcircuit;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function pintaManual() {
    $('#t-cables').innerHTML = R.REGLES_CABLES.map((r) => `<tr><th scope="row">${r.primer}</th><td>${esc(r.pregunta)}</td><td>${esc(R.TALLS[r.si].text)}</td><td>${esc(R.TALLS[r.no].text)}</td></tr>`).join('');
    $('#t-boto').innerHTML = R.REGLES_BOTO.map((r) => `<tr><th scope="row" class="paraula">${r.paraula}</th><td>${esc(r.condicio)}</td><td>${r.si}</td><td>${r.no}</td></tr>`).join('');
    $('#t-llums').innerHTML = Object.values(R.LLUMS).map((l) => `<tr><th scope="row">llum ${l.nom}</th><td>${esc(l.text)}</td></tr>`).join('');
    const fmt = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    $('#t-nivells').innerHTML = R.NIVELLS.map((n) => `<tr><th scope="row">${n.nom}</th><td>${fmt(n.segons)}</td><td>${n.errors} errors</td></tr>`).join('');
    document.querySelectorAll('[data-versio]').forEach((n) => { n.textContent = `v${R.VERSIO}`; });
    document.querySelectorAll('[data-dada]').forEach((n) => { n.textContent = R.PARTIDA.penalitzacio; });
  }

  pintaManual();
})();
