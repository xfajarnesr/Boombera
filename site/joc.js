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
  } catch (e) {
    $('#sense3d').hidden = false;
    $('#nota').hidden = true;
    return;
  }
  novaBomba(R.NIVELLS[R.NIVELLS.length - 1]);
  pintaNivells();
}

function barreja(llista) {
  const a = [...llista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function novaBomba(nivell) {
  aturaModuls();
  S.nivell = nivell;
  S.b = R.generaBomba();
  Object.assign(S, { errors: 0, fets: new Set(), controls: [], ultim: null, quiet: nivell.segons * 1000 });
  const espais = barreja([...nivell.moduls, ...Array(6 - nivell.moduls.length).fill(null)]);
  esc.construeix(S.b, espais, R.VERSIO);
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
function pintaDades() {
  const b = S.b;
  $('#serie').textContent = `${b.lletres}-${b.numero}`;
  const p = $('#piles'); p.textContent = String(b.piles); p.dataset.n = b.piles;
  $('#indicadors').innerHTML = b.indicadors.map((i) => `<li class="indicador" data-ences="${i.ences}">${i.etiqueta}: ${i.ences ? 'encès' : 'apagat'}</li>`).join('');
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
const btSo = $('#so');
const pintaSo = () => { btSo.textContent = so.actiu ? 'Apaga el so' : 'Encén el so'; };
btSo.addEventListener('click', () => { so.commuta(); pintaSo(); });
pintaSo();

/* ---------- Rellotge ---------- */
setInterval(() => {
  if (S.fase !== 'joc') return;
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
