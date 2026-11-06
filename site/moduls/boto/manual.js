(window.ManualModuls = window.ManualModuls || {}).boto = (R, esc) => `
  <h2>Mòdul del botó</h2>
  <p class="to">El botó diu moltes coses. No és obligatori fer-li cas.</p>
  <p>Pregunta quina paraula hi ha escrita i de quin color és. Fer <strong>clic</strong> és prémer i deixar anar de seguida. <strong>Mantenir</strong> és prémer sense deixar anar fins que s'encengui un llum al costat del botó.</p>
  <table>
    <thead><tr><th scope="col">Paraula</th><th scope="col">Condició</th><th scope="col">Si es compleix</th><th scope="col">Si no</th></tr></thead>
    <tbody>${R.REGLES_BOTO.map((r) => `<tr><th scope="row" class="paraula">${r.paraula}</th><td>${esc(r.condicio)}</td><td>${r.si}</td><td>${r.no}</td></tr>`).join('')}</tbody>
  </table>
  <h3>Si l'has de mantenir</h3>
  <p>Mira de quin color és el llum i deixa anar el botó quan els segons del temporitzador...</p>
  <table class="llums">
    <tbody>${Object.values(R.LLUMS).map((l) => `<tr><th scope="row">llum ${l.nom}</th><td>${esc(l.text)}</td></tr>`).join('')}</tbody>
  </table>`;
