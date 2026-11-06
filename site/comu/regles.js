// Font única de les regles. El joc, el manual i les proves llegeixen d'aquí.
(function (arrel) {
  const VERSIO = 6;

  const PARTIDA = { penalitzacio: 30, mantenirMs: 500 };

  // Cada nivell diu quins mòduls porta la bomba, de quant temps disposa i quants errors la fan petar.
  const NIVELLS = [
    // Provisionals: més mòduls i més temps. La llista definitiva es decidirà més endavant.
    { nom: 'Nivell 1', segons: 180, errors: 3, moduls: ['cables', 'boto'] },
    { nom: 'Nivell 2', segons: 240, errors: 3, moduls: ['cables', 'boto', 'sequencia'] },
    { nom: 'Nivell 3', segons: 300, errors: 2, moduls: ['cables', 'boto', 'sequencia', 'memoria'] },
    { nom: 'Nivell 4', segons: 420, errors: 2, moduls: ['cables', 'boto', 'sequencia', 'memoria', 'contrasenya', 'simbols'] },
    { nom: 'Nivell 5', segons: 480, errors: 2, moduls: ['cables', 'boto', 'memoria', 'simbols', 'laberint', 'morse'] },
  ];

  const COLORS_CABLE = {
    vermell: '#d3261e', blau: '#1f5fd6', groc: '#f0bb12', verd: '#1c9a45', negre: '#17181a',
  };
  const COLORS_BOTO = { vermell: '#d3261e', blau: '#1f5fd6', groc: '#f0bb12', verd: '#1c9a45' };
  const PARAULES = ['PREM', 'ATURA', 'ARA', 'NO'];
  const ETIQUETES = ['ZUM', 'NAP', 'ROC', 'TAP'];
  const LLETRES = 'BCDFGHJKLMNPQRSTVWXZ'; // sense vocals, per no formar paraules

  const esPrimer = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  const sumaXifres = (n) => String(n).split('').reduce((s, x) => s + Number(x), 0);
  const quants = (b, color) => b.cables.filter((c) => c === color).length;
  const ultimDe = (b, color) => b.cables.lastIndexOf(color);

  const TALLS = {
    primer: { text: 'el primer', idx: () => 0 },
    segon: { text: 'el segon', idx: () => 1 },
    tercer: { text: 'el tercer', idx: () => 2 },
    penultim: { text: 'el penúltim', idx: (b) => b.cables.length - 2 },
    ultim: { text: "l'últim", idx: (b) => b.cables.length - 1 },
    mig: { text: 'el del mig', idx: (b) => (b.cables.length - 1) / 2 },
    ultimVermell: { text: "l'últim vermell", idx: (b) => ultimDe(b, 'vermell') },
    primerNoNegre: { text: 'el primer que no sigui negre', idx: (b) => b.cables.findIndex((c) => c !== 'negre') },
  };

  const REGLES_CABLES = [
    { primer: 'vermell', pregunta: 'Hi ha un altre cable vermell?', test: (b) => quants(b, 'vermell') >= 2, si: 'ultimVermell', no: 'segon' },
    { primer: 'blau', pregunta: 'El número de sèrie és primer?', test: (b) => esPrimer(b.numero), si: 'tercer', no: 'penultim' },
    { primer: 'groc', pregunta: 'Hi ha més de 2 piles?', test: (b) => b.piles > 2, si: 'primer', no: 'segon' },
    { primer: 'verd', pregunta: 'El total de cables és senar?', test: (b) => b.cables.length % 2 === 1, si: 'mig', no: 'ultim' },
    { primer: 'negre', pregunta: 'La suma de xifres és múltiple de 3?', test: (b) => sumaXifres(b.numero) % 3 === 0, si: 'primerNoNegre', no: 'ultim' },
  ];

  const REGLES_BOTO = [
    { paraula: 'PREM', condicio: 'El nombre de piles és parell', test: (b) => b.piles % 2 === 0, si: 'mantén', no: 'clic' },
    { paraula: 'ATURA', condicio: 'El botó és vermell', test: (b) => b.boto.color === 'vermell', si: 'clic', no: 'mantén' },
    { paraula: 'ARA', condicio: 'Hi ha algun indicador encès', test: (b) => b.indicadors.some((i) => i.ences), si: 'mantén', no: 'clic' },
    { paraula: 'NO', condicio: 'El número de sèrie és múltiple de 4', test: (b) => b.numero % 4 === 0, si: 'clic', no: 'mantén' },
  ];

  const QUADRATS = [1, 4, 9, 16, 25, 36, 49];
  const LLUMS = {
    blau: { nom: 'blava', hex: '#3d8bff', text: 'siguin múltiple de 5: 00, 05, 10, 15...', test: (s) => s % 5 === 0 },
    groc: { nom: 'groga', hex: '#ffd21f', text: 'siguin múltiple de 7: 00, 07, 14, 21...', test: (s) => s % 7 === 0 },
    verd: { nom: 'verda', hex: '#2fd566', text: 'siguin un quadrat perfecte: 01, 04, 09, 16, 25, 36 o 49', test: (s) => QUADRATS.includes(s) },
    vermell: { nom: 'vermella', hex: '#ff3b30', text: 'tinguin les dues xifres iguals: 00, 11, 22, 33, 44 o 55', test: (s) => s % 11 === 0 },
  };

  const reglaCables = (b) => {
    const r = REGLES_CABLES.find((x) => x.primer === b.cables[0]);
    return { regla: r, resposta: r.test(b), tall: r.test(b) ? r.si : r.no };
  };
  const solucioCables = (b) => TALLS[reglaCables(b).tall].idx(b);
  const solucioBoto = (b) => {
    const r = REGLES_BOTO.find((x) => x.paraula === b.boto.paraula);
    return r.test(b) ? r.si : r.no;
  };

  /* ---------- Seqüència ---------- */
  const SEQUENCIA = {
    // L'anell es llegeix en sentit horari. Cada ronda repeteix els flaixos de l'anterior i n'hi afegeix.
    anell: ['vermell', 'groc', 'blau', 'verd'],
    rondes: [2, 3, 4],
    flaixMs: 650, pausaMs: 250, descansMs: 1500, entreRondesMs: 800, reprenMs: 5000,
  };
  const saltsSequencia = (b, errors) => b.piles + errors;
  const sentitSequencia = (b) => (b.numero % 2 === 0 ? 'horari' : 'antihorari');
  const respostaSequencia = (b, flaix, errors) => {
    const { anell } = SEQUENCIA; const n = anell.length;
    const pas = sentitSequencia(b) === 'horari' ? 1 : -1;
    const i = anell.indexOf(flaix) + pas * saltsSequencia(b, errors);
    return anell[((i % n) + n) % n];
  };

  /* ---------- Memòria ---------- */
  const MEMORIA = { etapes: 4, tecles: 4 };
  const CATEGORIES_MEMORIA = {
    quadrat: 'Quadrat perfecte (1, 4, 9)',
    primer: 'Nombre primer',
    cap: 'Cap dels dos',
  };
  const categoriaMemoria = (d) => (QUADRATS.includes(d) ? 'quadrat' : esPrimer(d) ? 'primer' : 'cap');
  const REGLES_MEMORIA = [
    { quadrat: { fes: 'gran' }, primer: { fes: 'petita' }, cap: { fes: 'posicio', n: 2 } },
    { quadrat: { fes: 'valorDe', etapa: 1 }, primer: { fes: 'posicioDe', etapa: 1 }, cap: { fes: 'petita' } },
    { quadrat: { fes: 'posicioDe', etapa: 2 }, primer: { fes: 'valorDe', etapa: 1 }, cap: { fes: 'gran' } },
    { quadrat: { fes: 'valorDe', etapa: 2 }, primer: { fes: 'posicioDe', etapa: 3 }, cap: { fes: 'suma' } },
  ];
  const textMemoria = (a) => ({
    gran: () => 'la tecla més gran',
    petita: () => 'la més petita',
    posicio: () => `la de la posició ${a.n}`,
    valorDe: () => `el mateix valor que a l'etapa ${a.etapa}`,
    posicioDe: () => `la mateixa posició que a l'etapa ${a.etapa}`,
    suma: () => 'suma els tres valors premuts: si és parell, la més gran; si és senar, la més petita',
  }[a.fes]());
  // Retorna la posició (de 0 a 3) de l'única tecla correcta. `premudes` és [{ valor, posicio }, ...].
  const solucioMemoria = (b, etapa, premudes) => {
    const { pantalla, ordre } = b.memoria.etapes[etapa];
    const a = REGLES_MEMORIA[etapa][categoriaMemoria(pantalla)];
    const gran = () => ordre.indexOf(Math.max(...ordre));
    const petita = () => ordre.indexOf(Math.min(...ordre));
    switch (a.fes) {
      case 'gran': return gran();
      case 'petita': return petita();
      case 'posicio': return a.n - 1;
      case 'valorDe': return ordre.indexOf(premudes[a.etapa - 1].valor);
      case 'posicioDe': return premudes[a.etapa - 1].posicio;
      default: return premudes.reduce((s, p) => s + p.valor, 0) % 2 === 0 ? gran() : petita();
    }
  };

  /* ---------- Contrasenya ---------- */
  const CONTRASENYA = {
    rodets: 5, lletres: 4,
    // En ordre alfabètic: l'ordre de la llista decideix quina de les dues paraules s'envia.
    paraules: [
      'ANGLE', 'ARREL', 'BOIRA', 'CARTA', 'CLAUS', 'CORBA',
      'CREMA', 'DADES', 'DOTZE', 'EIXOS', 'ERROR', 'FERRO',
      'FORMA', 'FOSCA', 'FUSTA', 'GRAUS', 'LLUMS', 'MARXA',
      'MITJA', 'NEGRE', 'PLOMA', 'PORTA', 'QUART', 'RADIS',
      'RECTA', 'SENAR', 'SETZE', 'SIGNE', 'SUMAR', 'TECLA',
    ],
  };
  const paraulesDeRodets = (rodets) => CONTRASENYA.paraules.filter((p) => [...p].every((l, i) => rodets[i].includes(l)));
  const triaContrasenya = ([primera, segona], numero) => (sumaXifres(numero) % 2 === 0 ? primera : segona);
  const solucioContrasenya = (b) => triaContrasenya(paraulesDeRodets(b.contrasenya.rodets), b.numero);

  /* ---------- Símbols ---------- */
  // Dibuix en un quadrat de 100 x 100, només amb traços: el joc i el manual fan servir aquest mateix camí.
  const espiral = () => {
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * 4.5 * Math.PI; const r = 4 + (i / 60) * 38;
      d += `${i ? 'L' : 'M'}${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
    }
    return d;
  };
  const SIMBOLS = [
    { id: 'alfa', nom: 'alfa', valor: 17, d: 'M74 24C68 50 60 78 40 78C24 78 16 66 16 52C16 36 26 24 42 24C62 24 66 58 86 78' },
    { id: 'beta', nom: 'beta', valor: 5, d: 'M32 94V30C32 16 44 8 54 8C68 8 74 18 74 28C74 38 64 45 50 46C68 46 80 54 80 68C80 82 66 88 56 88C46 88 38 84 32 76' },
    { id: 'theta', nom: 'theta', valor: 22, d: 'M50 10C28 10 22 34 22 50C22 66 28 90 50 90C72 90 78 66 78 50C78 34 72 10 50 10ZM23 50H77' },
    { id: 'mi', nom: 'mi', valor: 9, d: 'M28 94V24M28 58C28 72 38 78 48 78C60 78 70 70 70 58V24M70 60C70 72 74 78 86 78' },
    { id: 'pi', nom: 'pi', valor: 14, d: 'M12 32C18 24 28 22 40 22H90M40 22C40 50 36 70 26 84M68 22C66 46 66 66 72 78C76 85 84 83 90 74' },
    { id: 'alef', nom: 'àlef', valor: 2, d: 'M22 14L80 86M78 12C82 34 72 46 56 50M44 52C28 56 22 70 24 88M12 88H36M66 86H90' },
    { id: 'sigma', nom: 'sigma', valor: 19, d: 'M80 26V14H20L54 50L20 86H80V74' },
    { id: 'infinit', nom: 'infinit', valor: 24, d: 'M50 50C40 34 30 28 22 28C10 28 6 42 6 50C6 58 10 72 22 72C30 72 40 66 50 50C60 34 70 28 78 28C90 28 94 42 94 50C94 58 90 72 78 72C70 72 60 66 50 50Z' },
    { id: 'arrel', nom: 'arrel', valor: 7, d: 'M8 58L22 50L40 86L58 14H94' },
    { id: 'integral', nom: 'integral', valor: 12, d: 'M72 16C62 4 52 10 50 24V76C48 90 38 96 28 84' },
    { id: 'mesmenys', nom: 'més o menys', valor: 20, d: 'M50 12V56M26 34H74M24 82H76' },
    { id: 'diferent', nom: 'diferent', valor: 3, d: 'M18 36H82M18 64H82M68 12L32 88' },
    { id: 'buit', nom: 'conjunt buit', valor: 15, d: 'M50 22A28 28 0 1 1 49.9 22ZM80 8L20 92' },
    { id: 'pertot', nom: 'per a tot', valor: 10, d: 'M12 12L50 88L88 12M26 42H74' },
    { id: 'angle', nom: 'angle', valor: 23, d: 'M78 14L14 84H90M50 84C50 70 44 58 36 60' },
    { id: 'perpendicular', nom: 'perpendicular', valor: 6, d: 'M50 12V84M12 84H88' },
    { id: 'dividit', nom: 'dividit', valor: 18, d: 'M14 50H86M43 22a7 7 0 1 0 14 0a7 7 0 1 0-14 0M43 78a7 7 0 1 0 14 0a7 7 0 1 0-14 0' },
    { id: 'ona', nom: 'ona sinusoïdal', valor: 1, d: 'M6 50C18 4 32 4 50 50C68 96 82 96 94 50' },
    { id: 'espiral', nom: 'espiral', valor: 13, d: espiral() },
    { id: 'hexagon', nom: 'hexàgon', valor: 21, d: 'M50 10L85 30V70L50 90L15 70V30Z' },
    { id: 'cercle', nom: 'cercle amb radi', valor: 8, d: 'M50 12A38 38 0 1 1 49.9 12ZM50 50V88M46 50a4 4 0 1 0 8 0a4 4 0 1 0-8 0' },
    { id: 'cub', nom: 'cub', valor: 16, d: 'M14 36H60V84H14ZM14 36L36 14H84L60 36M84 14V62L60 84' },
    { id: 'parabola', nom: 'paràbola amb eixos', valor: 4, d: 'M12 8V88H92M34 16C42 58 50 66 60 66C70 66 78 58 86 16' },
    { id: 'quadrat', nom: 'quadrat amb diagonal', valor: 11, d: 'M14 14H86V86H14ZM14 86L86 14' },
  ];
  const GRUIX_SIMBOL = 9;
  const PLAQUES = 4;
  const simbol = (id) => SIMBOLS.find((s) => s.id === id);
  const sumaSimbols = (plaques) => plaques.reduce((s, id) => s + simbol(id).valor, 0);
  const sentitSimbols = (plaques) => (sumaSimbols(plaques) % 2 === 0 ? 'creixent' : 'decreixent');
  // Retorna les posicions de les plaques en l'ordre en què s'han de prémer.
  const solucioSimbols = (b) => {
    const { plaques } = b.simbols;
    const signe = sentitSimbols(plaques) === 'creixent' ? 1 : -1;
    return plaques.map((_, i) => i).sort((x, y) => signe * (simbol(plaques[x]).valor - simbol(plaques[y]).valor));
  };


  /* ---------- Laberint ---------- */
  // Columnes de la A a la F i files de l'1 (a baix) al 6 (a dalt), com en un pla.
  // Cada fila es llegeix de la A a la F. Cada xifra diu cap a on està obert: 1 a la dreta, 2 cap avall, 3 tots dos.
  const LABERINT = { costat: 6, columnes: 'ABCDEF' };
  const LABERINTS = [
    { files: ['311232', '231022', '213022', '210222', '232102', '101110'], marques: ['A2', 'E5'], sortides: ['D5', 'A4', 'A1', 'F2'] },
    { files: ['303112', '110322', '311012', '312122', '222230', '101010'], marques: ['A2', 'C6'], sortides: ['E3', 'A3', 'F5', 'A5'] },
    { files: ['312322', '221010', '212312', '123032', '300302', '111010'], marques: ['D1', 'E5'], sortides: ['E2', 'F5', 'A3', 'C5'] },
    { files: ['321230', '232232', '222202', '220112', '211110', '111110'], marques: ['D1', 'B4'], sortides: ['B3', 'C5', 'F6', 'F1'] },
    { files: ['311322', '122210', '212110', '301122', '231102', '111110'], marques: ['F3', 'C6'], sortides: ['F5', 'C1', 'A4', 'E3'] },
    { files: ['331122', '211212', '212210', '112112', '310320', '111010'], marques: ['F3', 'B4'], sortides: ['E6', 'D3', 'B1', 'A4'] },
  ];
  const DIRECCIONS = { amunt: [0, 1], avall: [0, -1], dreta: [1, 0], esquerra: [-1, 0] };
  const casella = (nom) => [LABERINT.columnes.indexOf(nom[0]), Number(nom.slice(1)) - 1];
  const nomCasella = ([x, y]) => `${LABERINT.columnes[x]}${y + 1}`;
  const xifra = (L, x, y) => Number(L.files[LABERINT.costat - 1 - y][x]);
  // Es pot passar de [x, y] a la casella del costat en aquesta direcció?
  const obert = (L, [x, y], dir) => {
    const [dx, dy] = DIRECCIONS[dir]; const n = LABERINT.costat;
    const nx = x + dx; const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= n || ny >= n) return false;
    if (dx === 1) return (xifra(L, x, y) & 1) > 0;
    if (dx === -1) return (xifra(L, nx, ny) & 1) > 0;
    if (dy === -1) return (xifra(L, x, y) & 2) > 0;
    return (xifra(L, nx, ny) & 2) > 0;
  };
  const mouLaberint = (L, c, dir) => (obert(L, c, dir) ? [c[0] + DIRECCIONS[dir][0], c[1] + DIRECCIONS[dir][1]] : null);
  // El laberint es reconeix per les dues marques juntes: cada marca sola surt a dos laberints.
  const identificaLaberint = (marques) => LABERINTS.findIndex((L) => [...L.marques].sort().join() === [...marques].sort().join());
  const sortidaLaberint = (b) => casella(LABERINTS[b.laberint.idx].sortides[b.piles - 1]);
  const distancies = (L, origen) => {
    const d = new Map([[String(origen), 0]]); const cua = [origen];
    while (cua.length) {
      const c = cua.shift();
      for (const dir of Object.keys(DIRECCIONS)) {
        const v = mouLaberint(L, c, dir);
        if (v && !d.has(String(v))) { d.set(String(v), d.get(String(c)) + 1); cua.push(v); }
      }
    }
    return d;
  };

  /* ---------- Morse ---------- */
  const MORSE = {
    unitatMs: 300, punt: 1, ratlla: 3, entreSenyals: 1, entreLletres: 3, entreRepeticions: 8,
    codi: {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
      N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    },
    paraules: [
      { paraula: 'TEMPS', canal: 12 }, { paraula: 'VOLTS', canal: 17 }, { paraula: 'RADAR', canal: 23 }, { paraula: 'PILOT', canal: 28 },
      { paraula: 'METRE', canal: 31 }, { paraula: 'SEGON', canal: 36 }, { paraula: 'MINUT', canal: 42 }, { paraula: 'FLAIX', canal: 47 },
      { paraula: 'ESPIA', canal: 53 }, { paraula: 'CODIS', canal: 58 }, { paraula: 'SERRA', canal: 64 }, { paraula: 'TIGRE', canal: 69 },
    ],
  };
  const canalDe = (paraula) => MORSE.paraules.find((p) => p.paraula === paraula).canal;
  // Sèrie parella: se sumen les piles. Sèrie senar: es resten.
  const canalMorse = (b) => canalDe(b.morse.paraula) + (b.numero % 2 === 0 ? b.piles : -b.piles);

  const tria = (llista, rng) => llista[Math.floor(rng() * llista.length)];
  const senseMesDeDos = (c) => c.every((x) => c.filter((y) => y === x).length <= 2);

  const barreja = (llista, rng) => {
    const a = [...llista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  function generaSequencia(rng) {
    const llarg = SEQUENCIA.rondes[SEQUENCIA.rondes.length - 1];
    return {
      flaixos: Array.from({ length: llarg }, () => tria(SEQUENCIA.anell, rng)),
      tecles: barreja(SEQUENCIA.anell, rng),
    };
  }
  function generaMemoria(rng) {
    const valors = barreja([1, 2, 3, 4, 5, 6, 7, 8, 9], rng).slice(0, MEMORIA.tecles);
    const etapes = [];
    for (let e = 0; e < MEMORIA.etapes; e++) {
      let ordre;
      // Les tecles sempre canvien de lloc, perquè valor i posició no siguin el mateix.
      do { ordre = barreja(valors, rng); } while (e && ordre.join() === etapes[e - 1].ordre.join());
      etapes.push({ pantalla: 1 + Math.floor(rng() * 9), ordre });
    }
    return { etapes };
  }

  function generaContrasenya(rng) {
    const { paraules, rodets: n, lletres } = CONTRASENYA;
    for (;;) {
      const [a, b] = barreja(paraules, rng);
      // Les lletres de més surten de les que aquella posició té a la llista, perquè no es descartin d'entrada.
      const rodets = Array.from({ length: n }, (_, i) => {
        const r = new Set([a[i], b[i]]);
        const candidates = [...barreja(paraules.map((p) => p[i]), rng), ...barreja(LLETRES.split(''), rng)];
        for (const l of candidates) { if (r.size === lletres) break; r.add(l); }
        return barreja([...r], rng);
      });
      if (paraulesDeRodets(rodets).length !== 2) continue;
      let inici;
      do { inici = rodets.map(() => Math.floor(rng() * lletres)); }
      while (paraules.includes(inici.map((p, i) => rodets[i][p]).join('')));
      return { rodets, inici };
    }
  }
  const generaSimbols = (rng) => ({ plaques: barreja(SIMBOLS.map((s) => s.id), rng).slice(0, PLAQUES) });


  function generaLaberint(rng, piles) {
    const idx = Math.floor(rng() * LABERINTS.length);
    const L = LABERINTS[idx];
    const sortida = casella(L.sortides[piles - 1]);
    const d = distancies(L, sortida);
    const ocupades = new Set([...L.marques, ...L.sortides]);
    const bones = [];
    for (let x = 0; x < LABERINT.costat; x++) for (let y = 0; y < LABERINT.costat; y++) {
      if (!ocupades.has(nomCasella([x, y])) && d.get(String([x, y])) >= 5) bones.push([x, y]);
    }
    return { idx, inici: tria(bones, rng) };
  }
  const generaMorse = (rng) => ({ paraula: tria(MORSE.paraules, rng).paraula });

  function generaBomba(rng = Math.random) {
    const noms = Object.keys(COLORS_CABLE);
    const n = 3 + Math.floor(rng() * 3);
    let cables;
    do { cables = Array.from({ length: n }, () => tria(noms, rng)); } while (!senseMesDeDos(cables));
    const lletres = Array.from({ length: 3 }, () => tria(LLETRES.split(''), rng)).join('');
    const numero = 10 + Math.floor(rng() * 90);
    const etiquetes = [...ETIQUETES].sort(() => rng() - 0.5).slice(0, 2);
    const piles = 1 + Math.floor(rng() * 4);
    return {
      lletres, numero, cables,
      piles,
      indicadors: etiquetes.map((etiqueta) => ({ etiqueta, ences: rng() < 0.5 })),
      boto: { color: tria(Object.keys(COLORS_BOTO), rng), paraula: tria(PARAULES, rng) },
      sequencia: generaSequencia(rng),
      memoria: generaMemoria(rng),
      contrasenya: generaContrasenya(rng),
      simbols: generaSimbols(rng),
      laberint: generaLaberint(rng, piles),
      morse: generaMorse(rng),
    };
  }

  const api = {
    VERSIO, PARTIDA, NIVELLS, COLORS_CABLE, COLORS_BOTO, PARAULES, ETIQUETES, LLETRES, TALLS,
    REGLES_CABLES, REGLES_BOTO, LLUMS, senseMesDeDos,
    reglaCables, solucioCables, solucioBoto, generaBomba,
    MODULS: ['cables', 'boto', 'sequencia', 'memoria', 'contrasenya', 'simbols', 'laberint', 'morse'],
    SEQUENCIA, saltsSequencia, sentitSequencia, respostaSequencia,
    MEMORIA, CATEGORIES_MEMORIA, REGLES_MEMORIA, categoriaMemoria, textMemoria, solucioMemoria,
    CONTRASENYA, paraulesDeRodets, triaContrasenya, solucioContrasenya,
    SIMBOLS, GRUIX_SIMBOL, PLAQUES, simbol, sumaSimbols, sentitSimbols, solucioSimbols,
    LABERINT, LABERINTS, DIRECCIONS, casella, nomCasella, obert, mouLaberint, identificaLaberint, sortidaLaberint, distancies,
    MORSE, canalDe, canalMorse,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else arrel.Curtcircuit = api;
})(this);
