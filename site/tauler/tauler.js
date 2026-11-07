// Tauler del professorat: equips, progrés i partides. Llegeix del full de càlcul (amb la clau) o d'aquest navegador.
import { creaServidor, clauProfessorat } from '../dades/dades.js';

const R = window.Curtcircuit;
const $ = (s) => document.querySelector(s);
const servidor = creaServidor();
const format = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const data = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? esc(iso) : d.toLocaleString('ca-ES', { dateStyle: 'short', timeStyle: 'short' }); };
let clau = clauProfessorat() || '';
let estat = { equips: [], partides: [] };
let obert = null;

const crida = async (q) => { try { return await servidor.crida({ ...q, clau }); } catch { return { ok: false, error: 'xarxa' }; } };
const AVISOS = { clau: 'La clau no és bona.', xarxa: 'No hi ha connexió amb el full de dades.' };

async function carrega() {
  document.body.dataset.estat = 'carregant';
  const r = await crida({ accio: 'tauler' });
  if (!r.ok) {
    const teniaClau = Boolean(clau);
    if (r.error === 'clau') { clauProfessorat(null); clau = ''; }
    $('#entra').hidden = false; $('#dades').hidden = true;
    $('#entra-avis').textContent = r.error === 'clau' && !teniaClau ? '' : AVISOS[r.error] || 'No s\'ha pogut llegir.';
    document.body.dataset.estat = r.error;
    if (servidor.remot) $('#clau').focus();
    return;
  }
  estat = r;
  $('#entra').hidden = true; $('#dades').hidden = false;
  $('#oblida').hidden = !servidor.remot || !clauProfessorat();
  pinta();
  document.body.dataset.estat = 'llest';
}

function pinta() {
  const filtre = window.BoomberaNucli.normalitza($('#cerca').value);
  const equips = estat.equips
    .filter((e) => !filtre || window.BoomberaNucli.normalitza(e.nom).includes(filtre))
    .sort((a, b) => Object.keys(b.millors).length - Object.keys(a.millors).length || a.nom.localeCompare(b.nom, 'ca'));
  $('#resum').textContent = `${estat.equips.length} ${estat.equips.length === 1 ? 'equip' : 'equips'} · ${estat.partides.length} partides · ${estat.partides.filter((p) => p.guanyada).length} guanyades`;
  $('#equips thead').innerHTML = `<tr><th rowspan="2">Equip</th><th rowspan="2">Superades</th>${R.SECCIONS.map((s, i) => `<th colspan="${s.missions.length}" class="sec">${i + 1}. ${esc(s.nom)}</th>`).join('')}<th rowspan="2">Darrera partida</th></tr>`
    + `<tr>${R.NIVELLS.map((n) => `<th class="codi">${n.codi}</th>`).join('')}</tr>`;
  $('#equips tbody').innerHTML = equips.map((e) => {
    const sup = Object.keys(e.millors).length;
    return `<tr data-equip="${esc(e.id)}"${obert === e.id ? ' class="obert"' : ''}><th scope="row"><button type="button" class="nom">${esc(e.nom)}</button><small>${esc(e.membres.join(', '))}</small></th><td class="n">${sup}/${R.NIVELLS.length}</td>${
      R.NIVELLS.map((n) => {
        const m = e.millors[n.codi]; const i = e.intents[n.codi] || 0;
        if (m) return `<td class="sup" data-codi="${n.codi}" title="${n.codi}: millor marge ${format(m.marge)} amb ${m.errors} errors (${i} intents)">${format(m.marge)}<small>${m.errors} err · ${i} int</small></td>`;
        return `<td class="no" data-codi="${n.codi}"${i ? ` title="${n.codi}: ${i} intents sense superar-la"` : ''}>${i ? `<small>${i} int</small>` : ''}</td>`;
      }).join('')
    }<td class="data">${e.darrera ? data(e.darrera) : '—'}</td></tr>`;
  }).join('') || `<tr><td colspan="${R.NIVELLS.length + 3}" class="buit">Encara no hi ha cap equip.</td></tr>`;
  pintaDetall();
}

// Detall d'un equip: les seves partides i les accions (esborrar una partida, esborrar l'equip, fusionar-lo amb un altre).
// Cada acció demana un segon clic per confirmar.
function pintaDetall() {
  const e = estat.equips.find((x) => x.id === obert);
  $('#detall').hidden = !e;
  if (!e) return;
  const ps = estat.partides.filter((p) => p.equip === e.id).reverse();
  const altres = estat.equips.filter((x) => x.id !== e.id).sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
  $('#detall').innerHTML = `<h2>${esc(e.nom)}</h2><p>${esc(e.membres.join(', '))} · creat ${data(e.creat)}</p>
    <div class="eines">
      <button type="button" class="perill" data-accio="esborraEquip">Esborra l'equip i les seves partides</button>
      ${altres.length ? `<label>Fusiona'l dins de <select id="fusiona-a">${altres.map((x) => `<option value="${esc(x.id)}">${esc(x.nom)}</option>`).join('')}</select></label><button type="button" class="perill" data-accio="fusiona">Fusiona</button>` : ''}
      <button type="button" id="tanca-detall">Tanca</button>
    </div>
    <table class="partides"><thead><tr><th>Data</th><th>Missió</th><th>Resultat</th><th>Errors</th><th>Marge</th><th>Agent</th><th>Guia</th><th></th></tr></thead><tbody>${
      ps.map((p) => `<tr data-partida="${esc(p.id)}"><td>${data(p.data)}</td><td>${esc(p.missio)}</td><td>${p.guanyada ? 'Desactivada' : 'Ha petat'}</td><td>${p.errors}</td><td>${p.guanyada ? format(p.marge) : '—'}</td><td>${esc(p.agent)}</td><td>${esc(p.guia)}</td><td><button type="button" class="perill petit" data-accio="esborraPartida" data-id="${esc(p.id)}">Esborra</button></td></tr>`).join('') || '<tr><td colspan="8" class="buit">Encara no ha jugat cap partida.</td></tr>'
    }</tbody></table>`;
}

$('#equips').addEventListener('click', (ev) => {
  const tr = ev.target.closest('tr[data-equip]');
  if (!tr) return;
  obert = obert === tr.dataset.equip ? null : tr.dataset.equip;
  pinta();
  if (obert) $('#detall').scrollIntoView({ block: 'nearest' });
});
$('#detall').addEventListener('click', async (ev) => {
  if (ev.target.id === 'tanca-detall') { obert = null; pinta(); return; }
  const b = ev.target.closest('button[data-accio]');
  if (!b) return;
  if (b.dataset.segur !== 'true') { b.dataset.segur = 'true'; b.dataset.text = b.textContent; b.textContent = 'Segur? Torna a clicar'; return; }
  const q = { accio: b.dataset.accio };
  if (q.accio === 'esborraPartida') q.id = b.dataset.id;
  if (q.accio === 'esborraEquip') q.equip = obert;
  if (q.accio === 'fusiona') { q.de = obert; q.a = $('#fusiona-a').value; }
  b.disabled = true;
  const r = await crida(q);
  if (!r.ok) { b.disabled = false; b.textContent = AVISOS[r.error] || 'No s\'ha pogut fer'; return; }
  if (q.accio === 'esborraEquip') obert = null;
  if (q.accio === 'fusiona') obert = q.a;
  await carrega();
});
$('#cerca').addEventListener('input', pinta);
$('#actualitza').addEventListener('click', carrega);
$('#oblida').addEventListener('click', () => { clauProfessorat(null); clau = ''; $('#oblida').hidden = true; });
$('#entra').addEventListener('submit', (ev) => {
  ev.preventDefault();
  clau = $('#clau').value;
  if ($('#recorda').checked) clauProfessorat(clau);
  carrega();
});

// CSV amb punt i coma i BOM, perquè l'Excel en català l'obri bé.
function descarrega(nom, files) {
  const csv = '﻿' + files.map((f) => f.map((x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nom; document.body.appendChild(a); a.click(); a.remove();
}
$('#csv-millors').addEventListener('click', () => descarrega('boombera-millors.csv', [
  ['Equip', 'Membres', 'Superades', ...R.NIVELLS.map((n) => n.codi)],
  ...estat.equips.map((e) => [e.nom, e.membres.join(', '), Object.keys(e.millors).length, ...R.NIVELLS.map((n) => (e.millors[n.codi] ? `${format(e.millors[n.codi].marge)} (${e.millors[n.codi].errors} err)` : ''))]),
]));
$('#csv-partides').addEventListener('click', () => descarrega('boombera-partides.csv', [
  ['Data', 'Equip', 'Missió', 'Guanyada', 'Errors', 'Marge (s)', 'Agent', 'Guia', 'Versió'],
  ...estat.partides.map((p) => [p.data, p.nom_equip, p.missio, p.guanyada ? 'sí' : 'no', p.errors, p.marge, p.agent, p.guia, p.versio]),
]));

$('#origen').textContent = servidor.remot ? 'Dades del full de càlcul.' : "No hi ha full de càlcul configurat: només es veuen les dades d'aquest navegador.";
if (servidor.remot && !clau) { $('#entra').hidden = false; document.body.dataset.estat = 'clau'; $('#clau').focus(); } else carrega();
