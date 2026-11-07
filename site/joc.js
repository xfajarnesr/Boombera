// Lògica de la partida: enllaça les regles, l'escena 3D i el so.
import { creaEscena } from './motor/escena.js';
import { creaSo } from './motor/so.js';
import { MODULS } from './moduls/registre.js';
import { creaDades, quinCodi, modeDesat, desaMode } from './dades/dades.js';
import { W, H } from './motor/peces.js';

const R = window.Curtcircuit;
const T = window.BoomberaTextos.T;
const $ = (s) => document.querySelector(s);
const senseMoviment = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Amb el dit (mòbil o tauleta), cada mòdul i cada part de la capçalera es pot ampliar amb un toc.
const tactil = matchMedia('(pointer: coarse)').matches;
// Armat abans del compte enrere: el rellotge no compta fins que s'acaba.
const ARMAT_MS = senseMoviment ? 500 : 1200;
const nomDe = (inst) => inst.replace(/-2$/, '');
const so = creaSo();
const dades = creaDades();

const S = { mode: null, convidat: null, rols: null, fase: 'inici', nivell: R.NIVELLS[0], b: null, inst: [], ids: [], finalMs: 0, errors: 0, fets: new Set(), controls: [], ultim: null, quiet: 0 };
const restantMs = () => (S.fase === 'joc' ? S.finalMs - performance.now() : S.quiet);
const totalSegons = () => Math.max(0, Math.ceil(restantMs() / 1000));
const format = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

let esc;
async function arrenca() {
  await Promise.all(['700 96px "Barlow Condensed"'].map((f) => document.fonts.load(f).catch(() => {})));
  try {
    esc = creaEscena($('#escena'), senseMoviment);
    esc.enCanviCara(posaCara);
    // Les proves (que porten un rellotge de mentida) poden llegir l'escena.
    if (window.__ms !== undefined) window.__esc = esc;
  } catch (e) {
    $('#sense3d').hidden = false;
    $('#nota').hidden = true;
    return;
  }
  novaBomba(R.NIVELLS[R.NIVELLS.length - 1]);
  S.mode = await modeDesat();
  preparaInici();
}

function novaBomba(nivell) {
  aturaModuls();
  S.nivell = nivell;
  S.b = R.generaBomba();
  // Cada mòdul de la bomba és una instància. Si un mòdul surt dues vegades, la segona porta dades pròpies
  // (la carcassa és la mateixa), i el mòdul ho rep com si fos l'única bomba.
  S.inst = R.instancies(nivell.moduls).map(({ id, nom }) => ({ id, nom, b: id === nom ? S.b : { ...S.b, [nom]: R.generaModul(nom, Math.random, S.b) } }));
  S.ids = S.inst.map((x) => x.id);
  Object.assign(S, { errors: 0, fets: new Set(), controls: [], ultim: null, quiet: nivell.segons * 1000, tError: 0, det: { errors: {}, temps: {}, seq: [] } });
  esc.construeix(S.b, R.repartimentEspais(S.ids), R.VERSIO, { instancies: Object.fromEntries(S.inst.map((x) => [x.id, x])), errors: nivell.errors });
  premut = false;
  posaCara(0, false);
  $('#dianes').innerHTML = '';
  $('#dades-moduls').innerHTML = '';
  S.controls = S.inst.map((x) => MODULS[x.nom].creaJoc(contextDe(x)));
  if (tactil) posaZones();
  pintaDades();
  esc.posaTemps(format(totalSegons()), false);
  esc.posaErrors(0);
  esc.intensitat(0);
}
const aturaModuls = () => S.controls.forEach((c) => c.atura && c.atura());

/* ---------- El que cada mòdul pot demanar a la partida ---------- */
function contextDe({ id: inst, nom, b }) {
  const grup = esc.moduls[inst];
  // Les dianes de cada instància van en un grup propi. Els identificadors de la segona porten «-2».
  const sufix = inst.slice(nom.length);
  const capsa = document.createElement('div');
  capsa.className = 'instancia'; capsa.dataset.instancia = inst; capsa.dataset.modul = nom;
  $('#dianes').appendChild(capsa);
  return {
    b, grup, so,
    actiu: () => S.fase === 'joc' && !S.fets.has(inst),
    errors: () => S.errors,
    segons: totalSegons,
    error: () => error(inst),
    resolt: () => modulFet(inst),
    diana(el, x, y, w, h) { if (el.id) el.id += sufix; capsa.appendChild(el); esc.diana(el, grup, x, y, w, h); },
    dada(id, text) {
      const p = document.createElement('p');
      p.id = id + sufix; p.textContent = text; p.setAttribute('aria-live', 'polite');
      $('#dades-moduls').appendChild(p);
      return p;
    },
  };
}

/* ---------- Dades per a lectors de pantalla ---------- */
// La carcassa només es pot llegir des de la cara on és cada peça, igual que a la pantalla.
function pintaCarcassa() {
  const b = S.b; const veu = (c) => !esc.girant && esc.cara === c;
  $('#carcassa').innerHTML = b.ranures.map((r) => {
    const v = veu(r.cara);
    const at = `class="peca" data-tipus="${r.tipus}" data-cara="${r.cara}" data-ranura="${r.ranura}" data-veu="${v}"`;
    if (!v) return `<li ${at}></li>`;
    if (r.tipus === 'serie') return `<li ${at} data-valor="${b.lletres}-${b.numero}">Número de sèrie: ${b.lletres}-${b.numero}</li>`;
    if (r.tipus === 'piles') return `<li ${at} data-n="${r.n}">Portapiles amb ${r.n === 1 ? '1 pila' : `${r.n} piles`}</li>`;
    const ind = b.indicadors[r.i];
    return `<li ${at} data-etiqueta="${ind.etiqueta}" data-ences="${ind.ences}">Indicador ${ind.etiqueta}: ${ind.ences ? 'encès' : 'apagat'}</li>`;
  }).join('');
}
function posaCara(cara, girant) {
  document.body.dataset.cara = cara;
  document.body.dataset.girant = girant;
  $('#cara').textContent = girant ? 'Girant la bomba' : `Cara ${cara === 0 ? 'del davant' : 'de darrere'}`;
  if (S.b) pintaCarcassa();
}
function pintaDades() {
  pintaCarcassa();
  $('#espais').innerHTML = S.ids.map((m) => { const c = esc.caraDeModul(m); return `<li data-modul="${m}" data-cara="${c}">${m}: cara ${c === 0 ? 'del davant' : 'de darrere'}</li>`; }).join('');
  $('#missio').textContent = `${S.nivell.nom}: ${S.ids.length} mòduls, ${format(S.nivell.segons)}, ${S.nivell.errors} errors`;
  Object.assign($('#missio').dataset, { codi: S.nivell.codi, moduls: S.nivell.moduls.join(' '), segons: S.nivell.segons, errors: S.nivell.errors });
  pintaErrors(); pintaTemps(); pintaFets();
  $('#estat').textContent = 'Partida a punt';
}
function pintaErrors() {
  $('#errors').textContent = `${S.errors} de ${S.nivell.errors}`;
  $('#errors').dataset.n = S.errors; $('#errors').dataset.max = S.nivell.errors;
}
function pintaTemps() {
  const t = totalSegons();
  $('#temps').textContent = format(t);
  $('#temps').dataset.total = t;
}
function pintaFets() {
  const f = $('#fets');
  S.ids.forEach((id) => { f.dataset[id] = S.fets.has(id); });
}

/* ---------- Partida ---------- */
// Primer s'arma la bomba (els mòduls entren al seu lloc i es comproven els llums), i després comença el compte enrere.
function comenca(nivell) {
  novaBomba(nivell);
  S.fase = 'armant'; S.armaFi = performance.now() + ARMAT_MS;
  document.body.dataset.fase = 'armant';
  $('#nota').hidden = true;
  $('#esquerdes').innerHTML = '';
  esc.posaEstat('armant');
  esc.posaTemps('-:--', false);
  esc.arma(ARMAT_MS);
  so.armat(nivell.errors);
}
function enJoc() {
  S.t0 = performance.now();
  S.finalMs = S.t0 + S.nivell.segons * 1000;
  S.fase = 'joc';
  document.body.dataset.fase = 'joc';
  esc.posaEstat('joc');
  esc.posaTemps(format(totalSegons()), false);
  so.arrenca();
  S.controls.forEach((c) => c.arrenca && c.arrenca());
}
const segonsDeJoc = () => Math.max(0, Math.round((performance.now() - S.t0) / 1000));
function error(inst) {
  S.errors += 1; S.finalMs -= R.PARTIDA.penalitzacio * 1000;
  S.tError = performance.now();
  const nom = nomDe(inst);
  S.det.errors[nom] = (S.det.errors[nom] || 0) + 1;
  S.det.seq.push(`error ${inst} ${format(segonsDeJoc())}`);
  S.ultim = totalSegons(); pintaTemps(); esc.posaTemps(format(S.ultim), S.ultim <= 30);
  esc.posaErrors(S.errors); pintaErrors();
  // Greu: el que deixa l'últim marge (o el que fa petar). Amb marge, l'avís és més suau.
  const queden = S.nivell.errors - S.errors;
  const greu = queden <= 1;
  so.error(greu);
  esc.avisaError(inst, S.errors, greu);
  document.body.style.setProperty('--cop', greu ? '1' : '.5');
  document.body.classList.remove('copet'); void document.body.offsetWidth; document.body.classList.add('copet');
  if (S.errors >= S.nivell.errors) acaba(false, S.nivell.errors === 1 ? 'Heu fet un error.' : `Heu fet ${S.nivell.errors} errors.`);
  else if (restantMs() <= 0) acaba(false, 'Els errors us han deixat sense temps.');
}
function modulFet(inst) {
  S.fets.add(inst);
  const nom = nomDe(inst);
  S.det.temps[nom] = Math.max(S.det.temps[nom] || 0, segonsDeJoc());
  S.det.seq.push(`fet ${inst} ${format(segonsDeJoc())}`);
  so.modul();
  esc.moduls[inst].userData.marcaFet();
  esc.celebra(inst);
  pintaFets();
  if (S.ids.every((m) => S.fets.has(m))) acaba(true);
}
// Els mòduls de la bomba sense cap error porten un 0 (i els que no hi són, res): així el full pot fer mitjanes.
const detall = () => {
  const errors = {}; S.inst.forEach((x) => { errors[x.nom] = S.det.errors[x.nom] || 0; });
  return { errors, temps: S.det.temps, seq: S.det.seq.join(' · ') };
};

function esquerdes() {
  // Vidre trencat que es queda a la pantalla fins a la bomba següent.
  const w = innerWidth; const h = innerHeight;
  const cx = w * (0.32 + Math.random() * 0.36); const cy = h * (0.3 + Math.random() * 0.4);
  const radis = 19 + Math.floor(Math.random() * 6);
  let d = '';
  const anells = [[], [], []];
  for (let i = 0; i < radis; i++) {
    const a = (i / radis) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    let x = cx; let y = cy; const llarg = Math.max(w, h) * (0.45 + Math.random() * 0.6);
    d += `M${cx.toFixed(0)} ${cy.toFixed(0)}`;
    for (let k = 1; k <= 7; k++) {
      const r = llarg * k / 7; const na = a + (Math.random() - 0.5) * 0.08;
      x = cx + Math.cos(na) * r; y = cy + Math.sin(na) * r;
      d += `L${x.toFixed(0)} ${y.toFixed(0)}`;
      if (k <= 3) anells[k - 1].push([x, y]);
    }
  }
  anells.forEach((an, n) => {
    an.forEach(([x, y], i) => {
      if (Math.random() < 0.28 + n * 0.08) return;
      const [u, v] = an[(i + 1) % an.length];
      d += `M${x.toFixed(0)} ${y.toFixed(0)}L${u.toFixed(0)} ${v.toFixed(0)}`;
    });
  });
  $('#esquerdes').innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="#000" stroke-opacity=".75" stroke-width="3"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".62" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.018}" fill="#fff" fill-opacity=".5"/></svg>`;
}

function acaba(guanya, motiu = '') {
  S.quiet = restantMs();
  const t = totalSegons();
  const res = desaPartida(guanya, t);
  S.fase = 'fi';
  aturaModuls();
  if (esc.ampliada) allunya();
  so.ultim(false);
  document.body.dataset.fase = guanya ? 'salvada' : 'petada';
  $('#bomba').className = guanya ? 'salvada' : 'petada';
  $('#estat').textContent = guanya ? 'Bomba desactivada' : 'Bomba explotada';
  const errs = S.errors === 1 ? '1 error' : `${S.errors} errors`;
  $('#nota-titol').textContent = guanya ? 'Bomba desactivada' : 'Ha petat';
  const despres = res ? res.text : ' Canvieu els papers i trieu missió.';
  $('#nota-text').innerHTML = guanya
    ? `<p>Marge de ${format(t)} i ${errs}.${despres}</p>`
    : `<p>${motiu}${despres}</p>`;
  pintaInici();
  mostra(S.nivell.lliure && panellInicial() === 'entra' ? 'lliure' : 'missions');
  if (guanya) {
    // Desactivada: el visor es queda en verd, se sent el relé i surt el segell. La nota arriba just després.
    esc.salvada(); so.guanya();
    esc.posaTemps(format(t), false);
    $('#segell').textContent = T.joc.desactivada;
    setTimeout(() => { if (S.fase === 'fi') $('#nota').hidden = false; }, senseMoviment ? 200 : 1100);
  } else {
    // Abans del cop, un silenci sec i el visor que parpelleja «0:00».
    so.silenci();
    const o = esc.origenDe(S.ids.find((m) => !S.fets.has(m)) || S.ids[0]).clone(); o.z = 1;
    if (!senseMoviment) { esc.posaTemps('0:00', true); setTimeout(() => esc.posaTemps(' :  ', true), 100); setTimeout(() => esc.posaTemps('0:00', true), 200); }
    setTimeout(() => { esc.explota(o); so.explosio(); esquerdes(); }, 300);
    setTimeout(() => { $('#nota').hidden = false; const b = document.querySelector('.nivell:not(:disabled)'); if (b) b.focus(); }, senseMoviment ? 600 : 3500);
  }
  document.querySelectorAll('.diana').forEach((d) => { d.disabled = true; });
}

/* ---------- Equip, progrés i modes ---------- */
// Sense equip es pot jugar igual: el progrés només dura mentre la pestanya és oberta.
// Mode obert (codi del professorat): totes les missions obertes, i es desa. Mode demostració: tot obert, sense equip i sense desar.
const ambEquip = () => S.mode !== 'demo' && Boolean(dades.equip);
const superades = () => (S.mode === 'demo' ? [] : dades.equip ? dades.superades() : [...(S.convidat || [])]);
const millors = () => (ambEquip() ? dades.millors() : {});
const totObert = () => S.mode === 'obre' || S.mode === 'demo';
const missionsObertes = () => new Set(totObert() ? R.NIVELLS.map((n) => n.codi) : R.missionsObertes(superades()));
const modulsOberts = () => (totObert() ? R.MODULS : R.modulsOberts(superades()));
const seccionsObertes = () => (totObert() ? R.SECCIONS.map((_, i) => i + 1) : R.seccionsObertes(superades()));

const PANELLS = { entra: '#entra', missions: '#tria', rols: '#rols', lliure: '#lliure', codi: '#codi' };
function mostra(panell) {
  // La portada és fora de la nota: en sortir-ne, la nota torna a aparèixer.
  const portada = panell === 'portada'; const deLaPortada = document.body.dataset.panell === 'portada';
  if (portada) $('#nota').hidden = true;
  else if (deLaPortada) $('#nota').hidden = false;
  $('#portada').hidden = !portada;
  Object.entries(PANELLS).forEach(([k, sel]) => { $(sel).hidden = k !== panell; });
  document.body.dataset.panell = panell;
  if (portada) { pintaPortada(); visorPortada(true); } else if (deLaPortada && esc) { visorPortada(false); esc.posaTemps(format(totalSegons()), false); }
  $('#equip-barra').hidden = !ambEquip() || panell === 'entra';
  const focus = { entra: '#entra form:not([hidden]) input', rols: '#rols-comenca', lliure: '#lliure input:not(:disabled)', codi: '#codi-text' }[panell];
  if (focus && !$('#nota').hidden && $(focus)) $(focus).focus();
}
const panellInicial = () => (S.mode === 'demo' || dades.equip || S.convidat ? 'missions' : 'entra');
// Sense equip, «Torna» porta a la portada; amb equip, a les missions.
const panellTorna = () => (panellInicial() === 'entra' ? 'portada' : 'missions');

function preparaInici() {
  pintaInici();
  lliguesMissions();
  lliguesEntra();
  lliguesRols();
  lliguesCodi();
  pintaLliure();
  dades.escolta(() => { if (S.fase !== 'joc') pintaInici(); });
  lliguesPortada();
  // Un enllaç de missió lliure va directe a la missió: no cal equip. La portada surt una vegada per pestanya.
  if (lliureDeUrl()) obreLliure(true);
  else mostra(portadaVista() ? panellInicial() : 'portada');
}
const lliureDeUrl = () => { const q = new URLSearchParams(location.search); return q.has('m') ? R.missioLliure(q.get('m').split(','), Number(q.get('t')), Number(q.get('e'))) : null; };
const escapa = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function pintaInici() {
  const e = ambEquip() ? dades.equip : null;
  if (e) { $('#equip-nom').textContent = e.nom; $('#equip-membres').textContent = e.membres.join(', '); }
  const n = dades.remot ? dades.pendents() : 0;
  $('#pendents').textContent = n ? `${n === 1 ? '1 partida' : `${n} partides`} per enviar al full: s'enviaran quan hi hagi connexió.` : '';
  $('#pendents').dataset.n = n;
  $('#mode-barra').hidden = !S.mode;
  $('#mode-text').textContent = S.mode === 'demo' ? 'Mode demostració: tot obert, no es desa res.' : S.mode === 'obre' ? 'Mode obert: totes les missions.' : '';
  document.body.dataset.mode = S.mode || '';
  $('#equip-barra').hidden = !e || document.body.dataset.panell === 'entra';
  pintaNivells();
  pintaXipsLliure();
}

/* ---------- Missions ---------- */
const errorsText = (n) => (n === 1 ? '1 error' : `${n} errors`);
const CADENAT = '<svg class="cadenat" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function pintaNivells() {
  const obertes = missionsObertes(); const m = millors(); const fet = new Set(superades());
  const mostraFet = ambEquip() || Boolean(S.convidat);
  $('#nivells').innerHTML = R.SECCIONS.map((sec, i) => {
    const s = i + 1;
    const compte = sec.missions.filter((_, j) => fet.has(`${s}.${j + 1}`)).length;
    const oberta = seccionsObertes().includes(s);
    const sota = !oberta ? `<small class="compte">Supera'n ${R.PROGRES.perObrir} de la ${s - 1}</small>` : mostraFet ? `<small class="compte">${compte}/${sec.missions.length}</small>` : '';
    return `<div class="seccio" data-seccio="${s}" data-oberta="${oberta}"><h3><b>${s}</b>${sec.nom}${sota}</h3>${
      R.NIVELLS.map((n, k) => [n, k]).filter(([n]) => n.seccio === s).map(([n, k]) => {
        const bloc = !obertes.has(n.codi);
        const millor = m[n.codi]; const sup = fet.has(n.codi);
        const etiqueta = `${n.nom}: ${n.moduls.length} mòduls, ${format(n.segons)}, peta amb ${errorsText(n.errors)}`
          + (bloc ? `. Bloquejada: cal superar ${R.PROGRES.perObrir} missions de la secció ${s - 1}` : '')
          + (sup ? `. Superada${millor ? `, millor marge ${format(millor.marge)} amb ${errorsText(millor.errors)}` : ''}` : '');
        const peu = bloc ? `<span class="bloc">${CADENAT}</span>`
          : `<span>${n.moduls.length} mòduls</span><span>${format(n.segons)} · ${errorsText(n.errors)}</span>`
            + (millor ? `<span class="millor" data-marge="${millor.marge}" data-errors="${millor.errors}">${format(millor.marge)} · ${errorsText(millor.errors)}</span>` : '');
        return `<button type="button" class="nivell" data-nivell="${k}" data-codi="${n.codi}" data-bloquejada="${bloc}" data-superada="${sup}"${bloc ? ' disabled' : ''} aria-label="${etiqueta}"><strong>${n.codi}${sup ? '<i class="fet" aria-hidden="true"></i>' : ''}</strong>${peu}</button>`;
      }).join('')
    }</div>`;
  }).join('');
}
function lliguesMissions() {
  $('#nivells').addEventListener('click', (e) => {
    const b = e.target.closest('.nivell');
    if (!b || b.disabled) return;
    const n = R.NIVELLS[Number(b.dataset.nivell)];
    if (ambEquip()) obreRols(n); else { S.rols = null; vols(n); }
  });
}

/* ---------- Nou equip o equip que ja existeix ---------- */
const AVISOS = {
  existeix: "Ja hi ha un equip amb aquest nom (o gairebé igual). Si és el vostre, entreu per «Ja tenim equip». Si no, trieu-ne un altre.",
  'no-existeix': "No hi ha cap equip amb aquest nom. Repasseu com l'havíeu escrit.",
  'nom-curt': "El nom de l'equip ha de tenir com a mínim dues lletres.",
  'pocs-membres': "Cal que l'equip tingui com a mínim dues persones.",
  'massa-membres': `Un equip pot tenir com a molt ${window.BoomberaNucli.MEMBRES.max} persones.`,
  repetit: "Aquesta persona ja és a l'equip.",
  xarxa: "Ara no hi ha connexió amb el full de dades. Torneu-ho a provar d'aquí a una estona, o jugueu sense desar.",
};
const avis = (sel, err) => { $(sel).textContent = err ? AVISOS[err] || "No s'ha pogut fer. Torneu-ho a provar." : ''; $(sel).dataset.error = err || ''; };
function campMembre(i) {
  const l = document.createElement('label'); l.className = 'camp membre';
  l.innerHTML = `<span>Persona ${i + 1}</span><input name="membre" maxlength="${window.BoomberaNucli.LLARGADA.membre}" autocomplete="off">`;
  $('#nou-membres').appendChild(l);
  $('#mes-membres').hidden = $('#nou-membres').children.length >= window.BoomberaNucli.MEMBRES.max;
  return l.querySelector('input');
}
function lliguesEntra() {
  for (let i = 0; i < window.BoomberaNucli.MEMBRES.min; i++) campMembre(i);
  const pestanya = (nou) => {
    $('#nou-equip').hidden = !nou; $('#recupera-equip').hidden = nou;
    $('#pest-nou').setAttribute('aria-selected', String(nou)); $('#pest-recupera').setAttribute('aria-selected', String(!nou));
    avis('#entra-avis', null);
    (nou ? $('#nou-nom') : $('#recupera-nom')).focus();
  };
  $('#pest-nou').addEventListener('click', () => pestanya(true));
  $('#pest-recupera').addEventListener('click', () => pestanya(false));
  $('#mes-membres').addEventListener('click', () => campMembre($('#nou-membres').children.length).focus());
  const espera = async (form, f) => {
    const bt = form.querySelector('[type="submit"]'); bt.disabled = true; form.setAttribute('aria-busy', 'true');
    try { return await f(); } finally { bt.disabled = false; form.removeAttribute('aria-busy'); }
  };
  const entra = (r) => {
    avis('#entra-avis', r.ok ? null : r.error);
    if (!r.ok) return;
    S.convidat = null;
    pintaInici();
    obreLliure(Boolean(lliureDeUrl()));
  };
  $('#nou-equip').addEventListener('submit', async (e) => {
    e.preventDefault();
    const membres = [...$('#nou-membres').querySelectorAll('input')].map((i) => i.value);
    entra(await espera(e.target, () => dades.creaEquip($('#nou-nom').value, membres)));
  });
  $('#recupera-equip').addEventListener('submit', async (e) => {
    e.preventDefault();
    entra(await espera(e.target, () => dades.recuperaEquip($('#recupera-nom').value)));
  });
  $('#sense-equip').addEventListener('click', () => { S.convidat = new Set(); pintaInici(); mostra('missions'); });
  $('#entra-torna').addEventListener('click', () => mostra('portada'));
  $('#canvia-equip').addEventListener('click', () => {
    dades.surt(); S.convidat = null;
    $('#nou-equip').reset(); $('#recupera-equip').reset();
    $('#nota-titol').textContent = 'Boombera';
    pintaInici(); mostra('entra');
  });
}

/* ---------- Rols: qui fa d'agent i qui fa de guia ---------- */
// Per defecte, la persona que feia de guia passa a fer d'agent, i fa de guia la següent de la llista.
// Amb dos membres, els rols s'intercanvien; amb tres o quatre, tothom va passant pels dos rols.
function rolsPerDefecte(e) {
  const m = e.membres; const g = m.indexOf(e.guia);
  if (g < 0) return { agent: m[0], guia: m[1] };
  const agent = m[g];
  const guia = m[(g + 1) % m.length];
  return { agent, guia };
}
const rolsDespres = (agent, guia) => rolsPerDefecte({ membres: dades.equip.membres, guia, agent });
let rolsNivell = null;
function pintaRols(r) {
  const opcions = (tria) => dades.equip.membres.map((x) => `<option value="${escapa(x)}"${x === tria ? ' selected' : ''}>${escapa(x)}</option>`).join('');
  $('#rol-agent').innerHTML = opcions(r.agent); $('#rol-guia').innerHTML = opcions(r.guia);
  $('#rols-afegeix').hidden = dades.equip.membres.length >= window.BoomberaNucli.MEMBRES.max;
  comprovaRols();
}
function comprovaRols() {
  const igual = $('#rol-agent').value === $('#rol-guia').value;
  $('#rols-avis').textContent = igual ? 'Cal una persona diferent a cada rol.' : '';
  $('#rols-comenca').disabled = igual;
}
function obreRols(n) {
  rolsNivell = n;
  $('#rols-titol').textContent = `Missió ${n.codi}`;
  $('#rols-missio').textContent = `${n.moduls.length} mòduls · ${format(n.segons)} · peta amb ${errorsText(n.errors)}. Qui fa cada rol?`;
  pintaRols(rolsPerDefecte(dades.equip));
  mostra('rols');
}
function lliguesRols() {
  $('#rol-agent').addEventListener('change', comprovaRols);
  $('#rol-guia').addEventListener('change', comprovaRols);
  $('#inverteix').addEventListener('click', () => pintaRols({ agent: $('#rol-guia').value, guia: $('#rol-agent').value }));
  $('#rols-torna').addEventListener('click', () => mostra('missions'));
  $('#rols-afegeix-boto').addEventListener('click', async () => {
    const nom = $('#rols-nou').value;
    if (!nom.trim()) return;
    const abans = { agent: $('#rol-agent').value, guia: $('#rol-guia').value };
    const r = await dades.afegeixMembre(nom);
    if (!r.ok) { $('#rols-avis').textContent = AVISOS[r.error] || "No s'ha pogut afegir."; return; }
    $('#rols-nou').value = '';
    pintaRols(abans);
  });
  $('#rols').addEventListener('submit', (e) => {
    e.preventDefault();
    comprovaRols();
    if ($('#rols-comenca').disabled) return;
    S.rols = { agent: $('#rol-agent').value, guia: $('#rol-guia').value };
    vols(rolsNivell);
  });
}

// En acabar una missió, es desa (si hi ha equip) i es diu què canvia: missió superada, rècord, secció nova i qui fa què ara.
// Les partides sense equip i les missions lliures també s'envien mentre config.js ho digui (registraTot), sense comptar per al progrés.
// estat: «abandonada» quan es tanca la pestanya a mitja bomba.
function desaPartida(guanya, t, estat) {
  const n = S.nivell;
  if (S.mode === 'demo') return null;
  if (n.lliure || !ambEquip()) {
    if (dades.registraTot) dades.registraAltra({ missio: n.lliure ? 'lliure' : n.codi, moduls: S.ids, segons: n.segons, maxErrors: n.errors, guanyada: guanya, errors: S.errors, marge: guanya ? t : 0, versio: R.VERSIO, estat, detall: detall() });
    if (n.lliure) return null;
  }
  const obertesAbans = seccionsObertes();
  let text = '';
  if (ambEquip()) {
    const rols = S.rols || rolsPerDefecte(dades.equip);
    const r = dades.registra({ missio: n.codi, guanyada: guanya, errors: S.errors, marge: guanya ? t : 0, agent: rols.agent, guia: rols.guia, versio: R.VERSIO, estat, detall: detall() });
    if (r.primera) text += ' Missió superada!';
    else if (r.record) text += ' Nou rècord!';
    const novaSec = seccionsObertes().filter((s) => !obertesAbans.includes(s));
    novaSec.forEach((s) => { text += ` S'ha obert la secció ${s}: ${R.SECCIONS[s - 1].nom}.`; });
    const ara = rolsDespres(rols.agent, rols.guia);
    text += ` Ara canvieu: ${escapa(ara.agent)} a la bomba i ${escapa(ara.guia)} amb el manual.`;
    $('#nota-text').dataset.record = String(r.record); $('#nota-text').dataset.seccions = novaSec.join(' ');
  } else if (S.convidat && estat !== 'abandonada') {
    if (guanya) S.convidat.add(n.codi);
    const novaSec = seccionsObertes().filter((s) => !obertesAbans.includes(s));
    novaSec.forEach((s) => { text += ` S'ha obert la secció ${s}: ${R.SECCIONS[s - 1].nom}.`; });
    text += ' Canvieu els papers i trieu missió.';
  } else return null;
  return { text };
}

/* ---------- Codis ocults ---------- */
// Cinc tocs seguits al lema, o Ctrl + Alt + B a la pantalla d'inici, obren un camp per escriure un codi.
function lliguesCodi() {
  let tocs = []; let abans = 'missions';
  const obre = () => { if (S.fase === 'joc' || document.body.dataset.panell === 'codi') return; abans = document.body.dataset.panell; $('#codi').reset(); avis('#codi-avis', null); mostra('codi'); };
  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('.lema') || S.fase === 'joc') return;
    const ara = performance.now(); tocs = tocs.filter((x) => ara - x < 2500); tocs.push(ara);
    if (tocs.length >= 5) { tocs = []; obre(); }
  });
  document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); obre(); } });
  $('#codi-tanca').addEventListener('click', () => mostra(abans === 'codi' ? panellInicial() : abans));
  $('#codi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('#codi-text').value;
    const k = await quinCodi(text);
    if (!k) { $('#codi-avis').textContent = 'Aquest codi no fa res.'; $('#codi-avis').dataset.error = 'codi'; return; }
    if (k === 'tauler') { location.href = 'tauler/index.html'; return; }
    desaMode(text); S.mode = k;
    pintaInici(); mostra(panellInicial());
  });
  $('#surt-mode').addEventListener('click', () => { desaMode(null); S.mode = null; pintaInici(); mostra(panellInicial()); });
}

/* ---------- Missió lliure ---------- */
// La configuració va a l'enllaç (?m=cables,boto&t=300&e=3): es pot compartir sense desar res.
// Només s'hi poden triar els mòduls de les seccions obertes.
let iniLliure = null;
function pintaXipsLliure() {
  const oberts = new Set(modulsOberts());
  const marcats = new Set([...document.querySelectorAll('#lliure-moduls input:checked')].map((i) => i.value));
  const ini = iniLliure ? new Set(iniLliure.moduls) : marcats;
  $('#lliure-moduls').innerHTML = R.MODULS.map((m) => {
    const ok = oberts.has(m);
    return `<label class="xip${ok ? '' : ' tancat'}" data-modul="${m}"${ok ? '' : ' title="Encara no hi heu arribat"'}><input type="checkbox" name="modul" value="${m}"${ok && ini.has(m) ? ' checked' : ''}${ok ? '' : ' disabled'}> ${ok ? '' : CADENAT}${R.NOMS_MODULS[m]}</label>`;
  }).join('');
  iniLliure = null;
}
function pintaLliure() {
  const deUrl = lliureDeUrl();
  const ini = deUrl || { moduls: [], ...R.LLIURE.perDefecte };
  iniLliure = ini;
  pintaXipsLliure();
  $('#lliure-temps').innerHTML = R.LLIURE.segons.map((t) => `<option value="${t}"${t === ini.segons ? ' selected' : ''}>${format(t)}</option>`).join('');
  $('#lliure-errors').innerHTML = R.LLIURE.errors.map((n) => `<label class="xip"><input type="radio" name="errors" value="${n}"${n === ini.errors ? ' checked' : ''}> ${n}</label>`).join('');
  const f = $('#lliure');
  f.addEventListener('change', () => { const m = llegeixLliure(); if (m) desaUrl(m); avisLliure(m); });
  $('#obre-lliure').addEventListener('click', () => obreLliure(true));
  $('#torna-missions').addEventListener('click', () => obreLliure(false));
  $('#copia-lliure').addEventListener('click', async () => {
    const m = llegeixLliure(); if (!m) return avisLliure(m);
    desaUrl(m);
    try { await navigator.clipboard.writeText(location.href); $('#lliure-avis').textContent = 'Enllaç copiat.'; } catch { $('#lliure-avis').textContent = `Copieu l'enllaç de la barra d'adreces.`; }
  });
  f.addEventListener('submit', (e) => { e.preventDefault(); const m = llegeixLliure(); if (m) { S.rols = null; vols(m); } else avisLliure(m); });
  if (deUrl && deUrl.moduls.some((m) => !modulsOberts().includes(m))) $('#lliure-avis').textContent = "Alguns mòduls de l'enllaç encara no són oberts per a vosaltres.";
}
function llegeixLliure() {
  const f = $('#lliure');
  const moduls = [...f.querySelectorAll('input[name="modul"]:checked:not(:disabled)')].map((i) => i.value);
  const e = f.querySelector('input[name="errors"]:checked');
  return R.missioLliure(moduls, Number($('#lliure-temps').value), e ? Number(e.value) : 0);
}
const avisLliure = (m) => { $('#lliure-avis').textContent = m ? '' : 'Trieu com a mínim un mòdul.'; };
function desaUrl(m) {
  const u = new URL(location.href);
  u.search = new URLSearchParams({ m: m.moduls.join(','), t: m.segons, e: m.errors }).toString();
  try { history.replaceState(null, '', u); } catch { /* en una pàgina incrustada pot no deixar-ho */ }
}
function obreLliure(obre) {
  mostra(obre ? 'lliure' : panellTorna());
  if (!obre && !$('#nota').hidden && !$('#tria').hidden) $('#obre-lliure').focus();
}

/* ---------- So ---------- */
// Dues icones: la nota musical (música de tensió) i l'altaveu (sons dels botons). Ratllades i en vermell si no sonen.
const ICONES = {
  so: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6"/></svg>',
  musica: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></svg>',
  senseMusica: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/><path d="M3 3l18 18"/></svg>',
  amplia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  redueix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
};
const btSo = $('#so'); const btMusica = $('#musica');
const pintaSo = () => {
  const ef = so.efectes; const mu = so.musica;
  btSo.innerHTML = ef ? ICONES.so : ICONES.mut;
  btSo.setAttribute('aria-label', ef ? T.joc.efectes.apaga : T.joc.efectes.encen);
  btSo.title = btSo.getAttribute('aria-label');
  btSo.setAttribute('aria-pressed', String(ef));
  btMusica.innerHTML = mu ? ICONES.musica : ICONES.senseMusica;
  btMusica.setAttribute('aria-label', mu ? T.joc.musica.apaga : T.joc.musica.encen);
  btMusica.title = btMusica.getAttribute('aria-label');
  btMusica.setAttribute('aria-pressed', String(mu));
};
btSo.addEventListener('click', () => { so.commutaEfectes(); pintaSo(); });
btMusica.addEventListener('click', () => { so.commutaMusica(); pintaSo(); });
pintaSo();

/* ---------- Pantalla completa ---------- */
const btPantalla = $('#pantalla');
const enPantallaCompleta = () => Boolean(document.fullscreenElement);
const pintaPantalla = () => {
  btPantalla.innerHTML = enPantallaCompleta() ? ICONES.redueix : ICONES.amplia;
  btPantalla.setAttribute('aria-label', enPantallaCompleta() ? 'Surt de la pantalla completa' : 'Pantalla completa');
  btPantalla.title = btPantalla.getAttribute('aria-label');
};
// A l'iPhone el navegador no té pantalla completa, i l'app instal·lada ja s'obre a pantalla completa.
if (!document.fullscreenEnabled || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) btPantalla.hidden = true;
btPantalla.addEventListener('click', () => {
  const p = enPantallaCompleta() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  if (p && p.catch) p.catch(() => {});
});
document.addEventListener('fullscreenchange', pintaPantalla);
pintaPantalla();

/* ---------- Portada ---------- */
// Penombra amb la bomba al fons, el logo, el lema, «Missions» i el manual per a la Guia. Surt la primera vegada a cada pestanya.
const guarda = (magatzem, k, v) => { try { magatzem.setItem(k, v); } catch { /* navegador sense emmagatzematge */ } };
const llegeix = (magatzem, k) => { try { return magatzem.getItem(k); } catch { return null; } };
const portadaVista = () => llegeix(sessionStorage, 'boombera.portada') === '1';
// A la portada, el «-:--» de la bomba del fons parpelleja a poc a poc.
let parpelleig = null;
function visorPortada(v) {
  clearInterval(parpelleig); parpelleig = null;
  if (!esc) return;
  esc.portada(v);
  if (!v) return;
  let on = true;
  parpelleig = setInterval(() => { on = !on; if (document.body.dataset.panell === 'portada') esc.posaTemps(on ? '--:--' : ' :  ', true); }, 1200);
}
function pintaPortada() {
  const e = ambEquip() ? dades.equip : null;
  const p = $('#portada-equip');
  const mode = S.mode === 'demo' ? T.portada.demo : S.mode === 'obre' ? T.portada.obre : '';
  p.hidden = !e && !mode;
  p.innerHTML = [e ? `<span>${T.portada.equip}</span> <b>${escapa(e.nom)}</b>` : '', mode ? `<i>${mode}</i>` : ''].filter(Boolean).join(' · ');
  if (esc) esc.posaTemps('--:--', true);
}
// Arrencada de la portada (2,5 s, la primera vegada a cada pestanya): negre, el focus que parpelleja,
// el visor del logo que s'encén segment a segment, la metxa, el lema i els botons. Qualsevol tecla o toc la salta.
function arrencada() {
  const cos = document.body;
  if (senseMoviment) { cos.dataset.arrencada = 'feta'; return; }
  cos.dataset.arrencada = 'en-marxa';
  const salta = () => { cos.dataset.arrencada = 'feta'; ['pointerdown', 'keydown'].forEach((t) => removeEventListener(t, salta, true)); };
  ['pointerdown', 'keydown'].forEach((t) => addEventListener(t, salta, true));
  setTimeout(salta, 2600);
}
function lliguesPortada() {
  $('#portada-logo').innerHTML = `<span>B</span>${window.BoomberaLogo.visor()}<span>MBERA</span>`;
  // Cada segment encès del visor del logo s'encén un rere l'altre.
  document.querySelectorAll('#portada-logo .logo-visor polygon[fill="#ff2a14"]').forEach((pl, i) => { pl.classList.add('segment'); pl.style.setProperty('--i', i); });
  const esp = document.querySelector('#portada-logo .logo-visor polygon[fill="#ffb02e"]');
  if (esp) { esp.classList.add('espurna'); esp.nextElementSibling.classList.add('espurna'); }
  if (document.body.dataset.panell === 'portada' || !portadaVista()) arrencada(); else document.body.dataset.arrencada = 'feta';
  $('#portada-lema').textContent = T.lema;
  $('#portada-missions').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg><span>${T.portada.missions}</span>`;
  $('#portada-manual').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h6"/></svg><span><b>${T.portada.manual}</b><small>${T.portada.manualDesc}</small></span>`;
  $('#portada-manual').title = T.portada.manualTitol;
  // La missió lliure no surt a la portada: és a baix de tot de les missions.
  $('#portada-missions').addEventListener('click', () => {
    guarda(sessionStorage, 'boombera.portada', '1');
    const ves = () => mostra(panellInicial());
    if (llegeix(localStorage, 'boombera.comEsJuga') === '1') ves(); else obreComEsJuga(ves);
  });
}

/* ---------- Com es juga ---------- */
// Tres passos la primera vegada en aquest navegador. Després es torna a obrir amb el botó «?».
const DIBUIXOS = [
  '<svg viewBox="0 0 200 90"><rect x="18" y="18" width="62" height="42" rx="3" class="d-pantalla"/><circle cx="49" cy="39" r="11" class="d-vermell"/><path d="M41 66h16" class="d-linia"/><path d="M128 20h44v56h-44z" class="d-llibre"/><path d="M136 32h28M136 42h28M136 52h20" class="d-linia"/><text x="49" y="86" class="d-nom">Agent</text><text x="150" y="88" class="d-nom">Guia</text></svg>',
  '<svg viewBox="0 0 200 90"><circle cx="62" cy="34" r="12" class="d-cap"/><path d="M44 80c0-16 8-26 18-26s18 10 18 26" class="d-cos"/><circle cx="138" cy="34" r="12" class="d-cap"/><path d="M120 80c0-16 8-26 18-26s18 10 18 26" class="d-cos"/><path d="M100 18v66" class="d-mur"/><path d="M84 22c6-6 6-14 0-20M90 26c10-9 10-21 0-30" class="d-veu"/><path d="M116 22c-6-6-6-14 0-20M110 26c-10-9-10-21 0-30" class="d-veu"/></svg>',
  '<svg viewBox="0 0 200 90"><rect x="40" y="26" width="120" height="40" rx="5" class="d-pantalla"/><circle cx="74" cy="46" r="10" class="d-vermell"/><circle cx="100" cy="46" r="10" class="d-apagat"/><circle cx="126" cy="46" r="10" class="d-apagat"/><path d="M60 80l12-6M128 74l12 6" class="d-linia"/></svg>',
];
let cejPas = 0; let cejDespres = null; let cejAbans = null;
function pintaComEsJuga() {
  const c = T.comEsJuga; const p = c.passos[cejPas]; const ultim = cejPas === c.passos.length - 1;
  $('#cej-etiqueta').textContent = `${c.titol} · ${cejPas + 1}/${c.passos.length}`;
  $('#cej-dibuix').innerHTML = DIBUIXOS[cejPas];
  $('#cej-titol').textContent = p.titol;
  $('#cej-text').innerHTML = p.text;
  $('#cej-seguent').textContent = ultim ? c.final : c.seguent;
  $('#cej-salta').textContent = cejDespres ? c.salta : c.tanca;
  $('#cej-salta').hidden = ultim && !cejDespres;
  $('#com-es-juga').dataset.pas = cejPas + 1;
  document.querySelectorAll('.cej-punts i').forEach((i, k) => { i.dataset.actiu = String(k === cejPas); });
}
function obreComEsJuga(despres = null) {
  cejPas = 0; cejDespres = despres; cejAbans = document.activeElement;
  pintaComEsJuga();
  $('#com-es-juga').hidden = false; document.body.dataset.ajuda = 'true';
  $('#cej-seguent').focus();
}
function tancaComEsJuga() {
  guarda(localStorage, 'boombera.comEsJuga', '1');
  $('#com-es-juga').hidden = true; document.body.dataset.ajuda = 'false';
  const f = cejDespres; cejDespres = null;
  if (f) f(); else if (cejAbans && cejAbans.focus) cejAbans.focus();
}
$('#cej-seguent').addEventListener('click', () => {
  if (cejPas < T.comEsJuga.passos.length - 1) { cejPas += 1; pintaComEsJuga(); $('#cej-seguent').focus(); } else tancaComEsJuga();
});
$('#cej-salta').addEventListener('click', tancaComEsJuga);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#com-es-juga').hidden) tancaComEsJuga(); });
const btAjuda = $('#ajuda');
btAjuda.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 9a3 3 0 1 1 4.2 2.7c-.9.4-1.4 1.1-1.4 2v.8"/><circle cx="12" cy="18" r=".6" fill="currentColor"/></svg>';
btAjuda.setAttribute('aria-label', T.comEsJuga.titol); btAjuda.title = T.comEsJuga.titol;
btAjuda.addEventListener('click', () => { if (S.fase !== 'joc') obreComEsJuga(); });

/* ---------- Mòbil apaïsat ---------- */
// En un mòbil vertical, les dianes serien massa petites: la missió espera que es giri el mòbil.
// Si es gira enmig d'una partida, un avís tapa la bomba i el rellotge continua.
const vertical = matchMedia('(orientation: portrait) and (max-width: 600px)');
let esperaGir = null;
$('#gira-mobil-titol').textContent = T.mobil.gira;
$('#gira-mobil-durant').textContent = T.mobil.durant;
$('#gira-mobil-abans').textContent = T.mobil.abans;
$('#gira-mobil-torna').textContent = T.mobil.torna;
function vols(nivell) {
  apaisa();
  if (!vertical.matches) { comenca(nivell); return; }
  esperaGir = nivell; document.body.dataset.esperaGir = 'true';
}
const deixaEsperar = () => { esperaGir = null; document.body.dataset.esperaGir = 'false'; };
vertical.addEventListener('change', () => {
  if (vertical.matches || !esperaGir) return;
  const n = esperaGir; deixaEsperar(); comenca(n);
});
$('#gira-mobil-torna').addEventListener('click', deixaEsperar);
// Amb l'app instal·lada o a pantalla completa, s'intenta deixar el mòbil apaïsat (només ho fan alguns navegadors).
function apaisa() {
  const o = screen.orientation;
  if (o && o.lock && (document.fullscreenElement || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches)) o.lock('landscape').catch(() => {});
}

/* ---------- Girar la bomba ---------- */
// Les dianes de la cara amagada, i totes mentre gira, no reben res: s'aturen abans d'arribar al mòdul.
let premut = false;
const amagada = (d) => esc && (esc.girant || Number(d.dataset.cara) !== esc.cara);
['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'keydown'].forEach((tipus) => {
  $('#dianes').addEventListener(tipus, (e) => {
    const d = e.target.closest && e.target.closest('.diana');
    if (d && amagada(d)) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    // No es pot girar mentre es manté premut un botó.
    if (d && (tipus === 'pointerdown' || (tipus === 'keydown' && (e.key === ' ' || e.key === 'Enter')))) premut = true;
  }, true);
});
['pointerup', 'pointercancel', 'blur'].forEach((tipus) => window.addEventListener(tipus, () => { premut = false; }, true));
window.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') premut = false; }, true);

const fos = () => { if (senseMoviment) { document.body.classList.remove('fos'); void document.body.offsetWidth; document.body.classList.add('fos'); } };
function gira(sentit) {
  if (S.fase !== 'joc' || premut || !esc) return;
  // Si hi ha una zona ampliada, la càmera torna enrere mentre la bomba gira.
  if (esc.ampliada) allunya();
  if (!esc.gira(sentit)) return;
  so.gir();
  fos();
}
// Barra a sota de la bomba: «Davant · Darrere», amb la cara que es veu marcada. Un toc fa mitja volta.
const btGira = $('#gira');
const CARA = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="2.5" width="14" height="15" rx="1.5"/><path d="M6 6.5h8"/></svg>';
btGira.innerHTML = `<span class="cara" data-c="0">${CARA}${T.joc.davant}</span><span class="cara" data-c="1">${CARA}${T.joc.darrere}</span>`;
btGira.setAttribute('aria-label', T.joc.gira); btGira.title = T.joc.gira;
btGira.addEventListener('click', () => gira(1));

/* ---------- Ampliar per zones (mòbil) ---------- */
// Un toc en un mòdul (fora dels seus botons) o en una part de la capçalera hi apropa la càmera.
// Un altre toc a la mateixa zona, el botó de la lupa o girar la bomba la tornen enrere.
const btAllunya = $('#allunya');
btAllunya.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M7.5 10.5h6"/></svg>';
btAllunya.setAttribute('aria-label', T.joc.allunya); btAllunya.title = T.joc.allunya;
function allunya() { if (!esc || !esc.ampliada) return; esc.allunya(); document.body.dataset.ampliada = ''; fos(); }
btAllunya.addEventListener('click', allunya);
function amplia(el) {
  if (S.fase !== 'joc' || esc.girant) return;
  if (esc.ampliada === el) { allunya(); return; }
  esc.amplia(el); document.body.dataset.ampliada = el.dataset.zona; fos();
}
function posaZones() {
  const capsa = document.createElement('div'); capsa.className = 'zones';
  $('#dianes').prepend(capsa);
  const nova = (nom, obj, x, y, w, h) => {
    const z = document.createElement('div'); z.className = 'zona'; z.dataset.zona = nom; z.setAttribute('aria-hidden', 'true');
    capsa.appendChild(z); esc.zona(z, obj, x, y, w, h);
  };
  S.ids.forEach((id) => nova(id, esc.moduls[id], 0, 0, W, H));
  // La capçalera de cada cara, en tres trossos: les dues bandes de la carcassa i el rellotge.
  esc.cares.forEach((c, i) => { nova(`cap-${i}-e`, c, -4.05, 3.15, 4.3, 1.8); nova(`cap-${i}-r`, c, 0, 3.12, 4.1, 1.4); nova(`cap-${i}-d`, c, 4.05, 3.15, 4.3, 1.8); });
}
let tocZona = null;
$('#dianes').addEventListener('pointerdown', (e) => {
  const z = e.target.closest && e.target.closest('.zona');
  tocZona = z && e.pointerType !== 'mouse' ? { z, x: e.clientX, y: e.clientY, t: performance.now() } : null;
});
$('#dianes').addEventListener('pointerup', (e) => {
  const t = tocZona; tocZona = null;
  if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12 || performance.now() - t.t > 600) return;
  amplia(t.z);
});
document.addEventListener('keydown', (e) => {
  if (e.repeat || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault();
  gira(e.key === 'ArrowLeft' ? -1 : 1);
});
// Al mòbil, lliscar el dit en horitzontal fora dels mòduls també gira la bomba.
let lliscada = null;
$('#dianes').addEventListener('pointerdown', (e) => {
  lliscada = e.pointerType !== 'mouse' && !e.target.closest('.diana') ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null;
});
$('#dianes').addEventListener('pointerup', (e) => {
  const l = lliscada; lliscada = null;
  if (!l || l.id !== e.pointerId) return;
  const dx = e.clientX - l.x; const dy = e.clientY - l.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy) && performance.now() - l.t < 800) gira(dx < 0 ? 1 : -1);
});
$('#dianes').addEventListener('pointercancel', () => { lliscada = null; });
// Un toc llarg no ha d'obrir el menú del sistema (el botó «mantén» es prem una estona).
$('#dianes').addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------- Rellotge ---------- */
let tics = 0;
setInterval(() => {
  if (S.fase === 'armant' && performance.now() >= S.armaFi) enJoc();
  if (S.fase !== 'joc') return;
  // Comptador de passades del rellotge: les proves l'esperen per saber que el temps pintat ja és l'actual.
  $('#temps').dataset.tic = ++tics;
  const ms = restantMs();
  const i = 1 - Math.max(0, ms) / (S.nivell.segons * 1000);
  // Un error fa pujar la tensió uns 4 s i després torna gairebé on era. Quan queda l'últim error, entra una capa nova.
  const pic = S.tError ? 0.2 * Math.exp(-(performance.now() - S.tError) / 1300) : 0;
  const ultim = S.nivell.errors > 1 && S.errors === S.nivell.errors - 1;
  const tensio = Math.min(1, i + S.errors * 0.03 + pic + (ultim ? 0.12 : 0));
  esc.intensitat(tensio); so.intensitat(tensio); so.ultim(ultim);
  // Per a les proves: la tensió que sona i si queda l'últim error.
  $('#temps').dataset.tensio = tensio.toFixed(3); $('#temps').dataset.ultim = ultim;
  const t = totalSegons();
  if (t !== S.ultim) {
    S.ultim = t;
    pintaTemps();
    esc.posaTemps(format(t), t <= 30);
    if (t > 0) so.tic(t <= 30);
  }
  if (ms <= 0) { S.ultim = 0; acaba(false, "S'ha acabat el temps."); }
}, 50);

/* ---------- Partida abandonada ---------- */
// Si es tanca la pestanya (o es recarrega) a mitja bomba, la partida es desa com a abandonada i s'intenta enviar al moment.
addEventListener('pagehide', () => {
  if (S.fase !== 'joc' && S.fase !== 'armant') return;
  S.fase = 'fi';
  desaPartida(false, 0, 'abandonada');
  dades.enviaAra();
});

/* ---------- Rendiment (Ctrl + Alt + D) ---------- */
// Un indicador ocult per provar-ho als PC d'aula: fotogrames, temps de fotograma, qualitat, crides de dibuix i targeta.
let diag = null;
function pintaDiag() {
  const r = esc.rendiment(); const D = T.diag;
  $('#diag-dades').innerHTML = `<b>${r.fps.toFixed(0)}</b> ${D.fps} · ${D.mediana} <b>${r.mediana.toFixed(0)} ms</b> · ${D.lent} <b>${r.p95.toFixed(0)} ms</b><br>`
    + `${D.grao}: <b>${r.nomGrao}</b> (${r.forcat ? D.forcada : D.auto}) · ${D.crides}: ${r.crides} · ${D.mida}: ${r.mida}<br>${D.gpu}: ${escapa(r.gpu)}`;
}
function obreDiag() {
  const d = $('#diag');
  if (!d.hidden) { d.hidden = true; clearInterval(diag); return; }
  const D = T.diag;
  $('#diag-titol').textContent = D.titol;
  $('#diag-tria').innerHTML = `<span>${D.tria}:</span>` + [D.auto, ...esc.GRAONS].map((n, i) => `<button type="button" data-g="${i - 1}">${n}</button>`).join('');
  d.hidden = false; pintaDiag(); diag = setInterval(pintaDiag, 500);
}
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd' && esc) { e.preventDefault(); obreDiag(); } });
$('#diag-tria').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const g = Number(b.dataset.g); esc.forcaGrao(g < 0 ? null : g); pintaDiag(); });
$('#diag-tanca').addEventListener('click', obreDiag);

arrenca();
