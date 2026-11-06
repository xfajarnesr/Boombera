// Lògica de la partida: enllaça les regles, l'escena 3D i el so.
import { creaEscena } from './motor/escena.js';
import { creaSo } from './motor/so.js';
import { MODULS } from './moduls/registre.js';

const R = window.Curtcircuit;
const $ = (s) => document.querySelector(s);
const senseMoviment = matchMedia('(prefers-reduced-motion: reduce)').matches;
const so = creaSo();

const S = { fase: 'inici', nivell: R.NIVELLS[0], b: null, finalMs: 0, errors: 0, fets: new Set(), controls: [], ultim: null, quiet: 0 };
const restantMs = () => (S.fase === 'joc' ? S.finalMs - performance.now() : S.quiet);
const totalSegons = () => Math.max(0, Math.ceil(restantMs() / 1000));
const format = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

let esc;
async function arrenca() {
  await Promise.all(['700 96px "Barlow Condensed"'].map((f) => document.fonts.load(f).catch(() => {})));
  try {
    esc = creaEscena($('#escena'), senseMoviment);
    esc.enCanviCara(posaCara);
  } catch (e) {
    $('#sense3d').hidden = false;
    $('#nota').hidden = true;
    return;
  }
  novaBomba(R.NIVELLS[R.NIVELLS.length - 1]);
  pintaNivells();
}

function novaBomba(nivell) {
  aturaModuls();
  S.nivell = nivell;
  S.b = R.generaBomba();
  Object.assign(S, { errors: 0, fets: new Set(), controls: [], ultim: null, quiet: nivell.segons * 1000 });
  esc.construeix(S.b, R.repartimentEspais(nivell.moduls), R.VERSIO);
  premut = false;
  posaCara(0, false);
  $('#dianes').innerHTML = '';
  $('#dades-moduls').innerHTML = '';
  S.controls = nivell.moduls.map((nom) => MODULS[nom].creaJoc(contextDe(nom)));
  pintaDades();
  esc.posaTemps(format(totalSegons()), false);
  esc.posaErrors(0);
  esc.intensitat(0);
}
const aturaModuls = () => S.controls.forEach((c) => c.atura && c.atura());

/* ---------- El que cada mòdul pot demanar a la partida ---------- */
function contextDe(nom) {
  const grup = esc.moduls[nom];
  return {
    b: S.b, grup, so,
    actiu: () => S.fase === 'joc' && !S.fets.has(nom),
    errors: () => S.errors,
    segons: totalSegons,
    error,
    resolt: () => modulFet(nom),
    diana(el, x, y, w, h) { $('#dianes').appendChild(el); esc.diana(el, grup, x, y, w, h); },
    dada(id, text) {
      const p = document.createElement('p');
      p.id = id; p.textContent = text; p.setAttribute('aria-live', 'polite');
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
  $('#espais').innerHTML = S.nivell.moduls.map((m) => { const c = esc.caraDeModul(m); return `<li data-modul="${m}" data-cara="${c}">${m}: cara ${c === 0 ? 'del davant' : 'de darrere'}</li>`; }).join('');
  pintaErrors(); pintaTemps(); pintaFets();
  $('#estat').textContent = 'Partida a punt';
}
function pintaErrors() {
  $('#errors').textContent = `${S.errors} de ${S.nivell.errors}`;
  $('#errors').dataset.n = S.errors;
}
function pintaTemps() {
  const t = totalSegons();
  $('#temps').textContent = format(t);
  $('#temps').dataset.total = t;
}
function pintaFets() {
  const f = $('#fets');
  S.nivell.moduls.forEach((nom) => { f.dataset[nom] = S.fets.has(nom); });
}

/* ---------- Partida ---------- */
function comenca(nivell) {
  novaBomba(nivell);
  S.finalMs = performance.now() + nivell.segons * 1000;
  S.fase = 'joc';
  document.body.dataset.fase = 'joc';
  $('#nota').hidden = true;
  $('#esquerdes').innerHTML = '';
  esc.posaEstat('joc');
  so.arrenca();
  S.controls.forEach((c) => c.arrenca && c.arrenca());
}
function error() {
  S.errors += 1; S.finalMs -= R.PARTIDA.penalitzacio * 1000;
  S.ultim = totalSegons(); pintaTemps(); esc.posaTemps(format(S.ultim), S.ultim <= 30);
  esc.posaErrors(S.errors); pintaErrors();
  so.error();
  document.body.classList.remove('copet'); void document.body.offsetWidth; document.body.classList.add('copet');
  if (S.errors >= S.nivell.errors) acaba(false, `Heu fet ${S.nivell.errors} errors.`);
  else if (restantMs() <= 0) acaba(false, 'Els errors us han deixat sense temps.');
}
function modulFet(nom) {
  S.fets.add(nom);
  so.modul();
  esc.moduls[nom].userData.marcaFet();
  pintaFets();
  if (S.nivell.moduls.every((m) => S.fets.has(m))) acaba(true);
}

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
  S.fase = 'fi';
  aturaModuls();
  document.body.dataset.fase = guanya ? 'salvada' : 'petada';
  $('#bomba').className = guanya ? 'salvada' : 'petada';
  $('#estat').textContent = guanya ? 'Bomba desactivada' : 'Bomba explotada';
  const errs = S.errors === 1 ? '1 error' : `${S.errors} errors`;
  $('#nota-titol').textContent = guanya ? 'Bomba desactivada' : 'Ha petat';
  $('#nota-text').innerHTML = guanya
    ? `<p>Marge de ${format(t)} i ${errs}. Canvieu els papers i trieu nivell.</p>`
    : `<p>${motiu} Canvieu els papers i trieu nivell.</p>`;
  if (guanya) {
    esc.salvada(); so.guanya();
    $('#nota').hidden = false;
  } else {
    const o = esc.origenDe(S.nivell.moduls.find((m) => !S.fets.has(m)) || S.nivell.moduls[0]).clone(); o.z = 1;
    esc.explota(o); so.explosio();
    esquerdes();
    setTimeout(() => { $('#nota').hidden = false; const b = document.querySelector('.nivell'); if (b) b.focus(); }, senseMoviment ? 300 : 3200);
  }
  document.querySelectorAll('.diana').forEach((d) => { d.disabled = true; });
}

/* ---------- Nivells ---------- */
function pintaNivells() {
  $('#nivells').innerHTML = R.NIVELLS.map((n, i) => `<button type="button" class="nivell" data-nivell="${i}"><strong>${n.nom}</strong><span>${format(n.segons)} i ${n.errors} errors</span></button>`).join('');
  $('#nivells').addEventListener('click', (e) => {
    const b = e.target.closest('.nivell');
    if (b) comenca(R.NIVELLS[Number(b.dataset.nivell)]);
  });
}

/* ---------- So ---------- */
// Altaveu: amb ones si sona, ratllat si no.
const ICONES = {
  so: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6"/></svg>',
  amplia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  redueix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
};
const btSo = $('#so');
const pintaSo = () => {
  btSo.innerHTML = so.actiu ? ICONES.so : ICONES.mut;
  btSo.setAttribute('aria-label', so.actiu ? 'Apaga el so' : 'Encén el so');
  btSo.title = btSo.getAttribute('aria-label');
  btSo.setAttribute('aria-pressed', String(so.actiu));
};
btSo.addEventListener('click', () => { so.commuta(); pintaSo(); });
pintaSo();

/* ---------- Pantalla completa ---------- */
const btPantalla = $('#pantalla');
const enPantallaCompleta = () => Boolean(document.fullscreenElement);
const pintaPantalla = () => {
  btPantalla.innerHTML = enPantallaCompleta() ? ICONES.redueix : ICONES.amplia;
  btPantalla.setAttribute('aria-label', enPantallaCompleta() ? 'Surt de la pantalla completa' : 'Pantalla completa');
  btPantalla.title = btPantalla.getAttribute('aria-label');
};
if (!document.fullscreenEnabled) btPantalla.hidden = true;
btPantalla.addEventListener('click', () => {
  const p = enPantallaCompleta() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  if (p && p.catch) p.catch(() => {});
});
document.addEventListener('fullscreenchange', pintaPantalla);
pintaPantalla();

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

function gira(sentit) {
  if (S.fase !== 'joc' || premut || !esc) return;
  if (!esc.gira(sentit)) return;
  so.gir();
  if (senseMoviment) { document.body.classList.remove('fos'); void document.body.offsetWidth; document.body.classList.add('fos'); }
}
const btGira = $('#gira');
btGira.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect class="full-bomba" x="17" y="9" width="14" height="30" rx="2"/><path d="M12.5 30.5A13 6 0 0 1 9 24c0-3.3 6.7-6 15-6s15 2.7 15 6-6.7 6-15 6"/><path d="M28.5 26.2 24 30l4.6 3.6"/></svg><span class="punts" aria-hidden="true"><i></i><i></i></span>';
btGira.addEventListener('click', () => gira(1));
document.addEventListener('keydown', (e) => {
  if (e.repeat || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault();
  gira(e.key === 'ArrowLeft' ? -1 : 1);
});

/* ---------- Rellotge ---------- */
let tics = 0;
setInterval(() => {
  if (S.fase !== 'joc') return;
  // Comptador de passades del rellotge: les proves l'esperen per saber que el temps pintat ja és l'actual.
  $('#temps').dataset.tic = ++tics;
  const ms = restantMs();
  const i = 1 - Math.max(0, ms) / (S.nivell.segons * 1000);
  // La tensió també puja amb els errors.
  const tensio = Math.min(1, i + S.errors * 0.08);
  esc.intensitat(tensio); so.intensitat(tensio);
  const t = totalSegons();
  if (t !== S.ultim) {
    S.ultim = t;
    pintaTemps();
    esc.posaTemps(format(t), t <= 30);
    if (t > 0) so.tic(t <= 30);
  }
  if (ms <= 0) { S.ultim = 0; acaba(false, "S'ha acabat el temps."); }
}, 50);

arrenca();
