(window.ManualModuls = window.ManualModuls || {}).contrasenya = (R, esc) => {
  const C = R.CONTRASENYA;
  const files = [];
  for (let i = 0; i < C.paraules.length; i += 6) files.push(C.paraules.slice(i, i + 6));
  const exemple = ['CORBA', 'FORMA']; const numero = 47;
  return `
  <h2>Mòdul de contrasenya</h2>
  <p class="to">Una paraula és poca cosa. Dues ja són un problema.</p>
  <p>Hi ha ${C.rodets} rodets de ${C.lletres} lletres cada un, que es mouen amb les fletxes. Demana les lletres rodet a rodet i ves descartant paraules. Amb els rodets sempre es poden formar <strong>exactament dues</strong> paraules d'aquesta llista: no paris quan en trobis una.</p>
  <p>Mira la suma de xifres del número de sèrie. <strong>Si és parella</strong>, envia la paraula que surt primer a la llista. <strong>Si és senar</strong>, la que surt després. Amb ${exemple.join(' i ')} i la sèrie ${numero}, la suma és senar i s'envia ${R.triaContrasenya(exemple, numero)}. Enviar-ne una altra és un error, i les lletres es queden com estaven.</p>
  <table class="paraules"><tbody>${files.map((f) => `<tr>${f.map((p) => `<td>${esc(p)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
};
