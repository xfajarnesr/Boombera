(window.ManualModuls = window.ManualModuls || {}).memoria = (R, esc) => {
  const cats = Object.keys(R.CATEGORIES_MEMORIA);
  const etapes = Array.from({ length: R.MEMORIA.etapes }, (_, i) => i + 1);
  return `
  <h2>Mòdul de memòria</h2>
  <p class="to">Oblidar-se d'una tecla surt car.</p>
  <p>Hi ha una pantalla amb una xifra de l'1 al 9 i ${R.MEMORIA.tecles} tecles numerades de l'1 al ${R.MEMORIA.tecles} d'esquerra a dreta. Els valors de les tecles són sempre els mateixos, però canvien de lloc a cada etapa. Demana la xifra i els valors en ordre, tria la cel·la i apunta què s'ha premut. Una tecla equivocada és un error i torna a l'etapa 1, amb les mateixes pantalles.</p>
  <table class="memoria">
    <thead><tr><th scope="col">Etapa</th>${cats.map((c) => `<th scope="col">${esc(R.CATEGORIES_MEMORIA[c])}</th>`).join('')}</tr></thead>
    <tbody>${R.REGLES_MEMORIA.map((f, i) => `<tr><th scope="row">${i + 1}</th>${cats.map((c) => `<td>${esc(R.textMemoria(f[c]))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <table class="registre">
    <thead><tr><th scope="col">Etapa</th>${etapes.map((e) => `<th scope="col">${e}</th>`).join('')}</tr></thead>
    <tbody><tr><th scope="row">Valor</th>${etapes.map(() => '<td></td>').join('')}</tr><tr><th scope="row">Posició</th>${etapes.map(() => '<td></td>').join('')}</tr></tbody>
  </table>`;
};
