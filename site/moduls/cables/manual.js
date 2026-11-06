(window.ManualModuls = window.ManualModuls || {}).cables = (R, esc) => `
  <h2>Mòdul de cables</h2>
  <p class="to">Talla'n només un. Els altres també tenen família.</p>
  <p>Hi ha de 3 a 5 cables, numerats d'esquerra a dreta. Pregunta de quin color és el primer, busca'n la fila i respon la pregunta. Els cables tallats per error continuen comptant com si estiguessin sencers.</p>
  <table>
    <thead><tr><th scope="col">Primer cable</th><th scope="col">Pregunta</th><th scope="col">Si és que sí, talla</th><th scope="col">Si és que no, talla</th></tr></thead>
    <tbody>${R.REGLES_CABLES.map((r) => `<tr><th scope="row">${r.primer}</th><td>${esc(r.pregunta)}</td><td>${esc(R.TALLS[r.si].text)}</td><td>${esc(R.TALLS[r.no].text)}</td></tr>`).join('')}</tbody>
  </table>`;
