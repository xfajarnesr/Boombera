// Font única de les regles. El joc, el manual i les proves llegeixen d'aquí.
(function (arrel) {
  const VERSIO = 3;

  const PARTIDA = { penalitzacio: 30, mantenirMs: 500 };

  // Cada nivell diu quins mòduls porta la bomba, de quant temps disposa i quants errors la fan petar.
  const NIVELLS = [
    // Provisionals: més mòduls i més temps. La llista definitiva es decidirà més endavant.
    { nom: 'Nivell 1', segons: 180, errors: 3, moduls: ['cables', 'boto'] },
    { nom: 'Nivell 2', segons: 240, errors: 3, moduls: ['cables', 'boto', 'sequencia'] },
    { nom: 'Nivell 3', segons: 300, errors: 2, moduls: ['cables', 'boto', 'sequencia', 'memoria'] },
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

  function generaBomba(rng = Math.random) {
    const noms = Object.keys(COLORS_CABLE);
    const n = 3 + Math.floor(rng() * 3);
    let cables;
    do { cables = Array.from({ length: n }, () => tria(noms, rng)); } while (!senseMesDeDos(cables));
    const lletres = Array.from({ length: 3 }, () => tria(LLETRES.split(''), rng)).join('');
    const numero = 10 + Math.floor(rng() * 90);
    const etiquetes = [...ETIQUETES].sort(() => rng() - 0.5).slice(0, 2);
    return {
      lletres, numero, cables,
      piles: 1 + Math.floor(rng() * 4),
      indicadors: etiquetes.map((etiqueta) => ({ etiqueta, ences: rng() < 0.5 })),
      boto: { color: tria(Object.keys(COLORS_BOTO), rng), paraula: tria(PARAULES, rng) },
      sequencia: generaSequencia(rng),
      memoria: generaMemoria(rng),
    };
  }

  const api = {
    VERSIO, PARTIDA, NIVELLS, COLORS_CABLE, COLORS_BOTO, PARAULES, ETIQUETES, LLETRES, TALLS,
    REGLES_CABLES, REGLES_BOTO, LLUMS, senseMesDeDos,
    reglaCables, solucioCables, solucioBoto, generaBomba,
    MODULS: ['cables', 'boto', 'sequencia', 'memoria'],
    SEQUENCIA, saltsSequencia, sentitSequencia, respostaSequencia,
    MEMORIA, CATEGORIES_MEMORIA, REGLES_MEMORIA, categoriaMemoria, textMemoria, solucioMemoria,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else arrel.Curtcircuit = api;
})(this);
