(function () {
  const R = window.Curtcircuit;
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, pare) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (pare) pare.appendChild(e);
    return e;
  };
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* ---------- Temporitzador de set segments ---------- */
  const SEG = { a: '6,2 34,2 28,8 12,8', b: '36,4 36,28 30,25 30,10', c: '36,32 36,56 30,50 30,35',
    d: '6,58 34,58 28,52 12,52', e: '4,32 4,56 10,50 10,35', f: '4,4 4,28 10,25 10,10', g: '7,30 13,27 27,27 33,30 27,33 13,33' };
  const XIFRES = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  const svgT = $('#timer-svg');
  const segs = [0, 1, 2].map((p) => {
    const x = [0, 58, 100][p];
    const g = el('g', { transform: `translate(${x} 0)` }, svgT);
    const m = {};
    Object.entries(SEG).forEach(([k, pts]) => { m[k] = el('polygon', { points: pts, class: 'seg' }, g); });
    return m;
  });
  el('circle', { cx: 49, cy: 20, r: 3.4, class: 'seg on' }, svgT);
  el('circle', { cx: 49, cy: 40, r: 3.4, class: 'seg on' }, svgT);
  function pintaTimer(total) {
    const t = Math.max(0, total);
    const d = [Math.floor(t / 60) % 10, Math.floor((t % 60) / 10), t % 10];
    d.forEach((x, i) => Object.entries(segs[i]).forEach(([k, n]) => n.classList.toggle('on', XIFRES[x].includes(k))));
    const text = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    svgT.setAttribute('aria-label', `Temps restant ${text}`);
    svgT.dataset.temps = text;
    $('#timer').classList.toggle('poc', t <= 30 && S.fase === 'joc');
  }

  /* ---------- So ---------- */
  let audio = null;
  let soActiu = true;
  try { soActiu = localStorage.getItem('curtcircuit-so') !== 'no'; } catch (e) { /* sense emmagatzematge */ }
  function to(freq, dur, tipus = 'square', vol = 0.04) {
    if (!audio || !soActiu) return;
    const o = audio.createOscillator(); const g = audio.createGain();
    o.type = tipus; o.frequency.value = freq; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
  }
  function explosio() {
    if (!audio || !soActiu) return;
    const n = audio.sampleRate * 1.1; const b = audio.createBuffer(1, n, audio.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4);
    const s = audio.createBufferSource(); const g = audio.createGain(); g.gain.value = 0.35;
    s.buffer = b; s.connect(g).connect(audio.destination); s.start();
  }

  /* ---------- Estat de la partida ---------- */
  const S = { fase: 'inici', b: null, finalMs: 0, errors: 0, cables: false, boto: false, tallats: new Set(), prem: null, ultim: null, motiu: '' };
  const restantMs = () => (S.fase === 'joc' ? S.finalMs - performance.now() : S.quiet);
  const totalSegons = () => Math.max(0, Math.ceil(restantMs() / 1000));

  /* ---------- Dibuix de la bomba ---------- */
  function pintaCarcassa() {
    const b = S.b;
    $('#serie').textContent = `${b.lletres}-${b.numero}`;
    $('#piles').innerHTML = Array.from({ length: b.piles }, () => '<span class="pila"></span>').join('');
    $('#piles').setAttribute('aria-label', `${b.piles} ${b.piles === 1 ? 'pila' : 'piles'}`);
    $('#piles').dataset.n = b.piles;
    $('#indicadors').innerHTML = b.indicadors.map((i) => `
      <div class="indicador ${i.ences ? 'ences' : ''}" data-ences="${i.ences}">
        <span class="led"></span><span class="cinta">${i.etiqueta}</span><small>${i.ences ? 'encès' : 'apagat'}</small>
      </div>`).join('');
  }
  function pintaErrors() {
    $('#errors').innerHTML = Array.from({ length: R.PARTIDA.errorsMax }, (_, i) => `<span class="fusible ${i < S.errors ? 'cremat' : ''}"></span>`).join('');
    $('#errors-text').textContent = `${S.errors} de ${R.PARTIDA.errorsMax}`;
  }
  function pintaCables() {
    const svg = $('#cables-svg'); svg.innerHTML = '';
    const n = S.b.cables.length; const pas = 340 / n;
    S.b.cables.forEach((color, i) => {
      const x = pas * i + pas / 2; const on = i % 2 ? -11 : 11;
      const tallat = S.tallats.has(i);
      const g = el('g', { class: `cable ${tallat ? 'tallat' : ''}`, 'data-i': i, 'data-color': color, tabindex: tallat ? -1 : 0, role: 'button', 'aria-label': `Cable ${i + 1}, ${color}${tallat ? ', tallat' : ''}` }, svg);
      const t = el('text', { x, y: 20, class: 'num-cable', 'text-anchor': 'middle' }, g); t.textContent = i + 1;
      el('rect', { x: x - 9, y: 28, width: 18, height: 12, class: 'born' }, g);
      el('rect', { x: x - 9, y: 202, width: 18, height: 12, class: 'born' }, g);
      if (tallat) {
        el('path', { d: `M${x} 40 C ${x + on} 70, ${x - on} 90, ${x + on / 2} 108`, stroke: R.COLORS_CABLE[color], class: 'fil' }, g);
        el('path', { d: `M${x - on / 2} 136 C ${x + on} 155, ${x - on} 175, ${x} 202`, stroke: R.COLORS_CABLE[color], class: 'fil' }, g);
        el('path', { d: `M${x + on / 2} 108 l2 8 M${x - on / 2} 136 l-2 -8`, class: 'coure' }, g);
      } else {
        const d = `M${x} 40 C ${x + on} 85, ${x - on} 155, ${x} 202`;
        el('path', { d, stroke: R.COLORS_CABLE[color], class: 'fil' }, g);
        el('path', { d, class: 'zona' }, g);
      }
      const nom = el('text', { x, y: 234, class: 'nom-cable', 'text-anchor': 'middle' }, g); nom.textContent = color;
    });
    $('#mod-cables').classList.toggle('fet', S.cables);
  }
  function pintaBoto() {
    const { color, paraula } = S.b.boto;
    const b = $('#boto');
    b.style.setProperty('--c', R.COLORS_BOTO[color]);
    b.classList.toggle('fosc', color === 'groc');
    b.textContent = paraula;
    b.dataset.color = color;
    b.setAttribute('aria-label', `Botó ${color} que diu ${paraula}`);
    $('#boto-color').textContent = `botó ${color}`;
    apagaLlum();
    $('#mod-boto').classList.toggle('fet', S.boto);
  }
  function apagaLlum() {
    const l = $('#llum'); l.style.removeProperty('--l'); l.classList.remove('viva'); delete l.dataset.color;
    $('#llum-nom').textContent = 'llum apagada';
  }
  function pintaTot() { pintaCarcassa(); pintaErrors(); pintaCables(); pintaBoto(); pintaTimer(totalSegons()); }

  /* ---------- Accions ---------- */
  function comenca() {
    if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } }
    if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
    Object.assign(S, { b: R.generaBomba(), errors: 0, cables: false, boto: false, tallats: new Set(), prem: null, motiu: '', ultim: null });
    S.finalMs = performance.now() + R.PARTIDA.segons * 1000;
    S.fase = 'joc';
    document.body.dataset.fase = 'joc';
    $('#nota').hidden = true;
    $('#bomba').classList.remove('petada', 'salvada');
    pintaTot();
  }
  function error() {
    S.errors += 1; S.finalMs -= R.PARTIDA.penalitzacio * 1000; S.ultim = totalSegons(); pintaTimer(S.ultim);
    to(110, 0.35, 'sawtooth', 0.09);
    pintaErrors();
    const b = $('#bomba'); b.classList.remove('sacseig'); void b.offsetWidth; b.classList.add('sacseig');
    if (S.errors >= R.PARTIDA.errorsMax) acaba(false, `Heu fet ${R.PARTIDA.errorsMax} errors.`);
    else if (restantMs() <= 0) acaba(false, 'Els errors us han deixat sense temps.');
  }
  function modulFet() {
    to(880, 0.12, 'triangle', 0.08); setTimeout(() => to(1320, 0.18, 'triangle', 0.08), 110);
    if (S.cables && S.boto) acaba(true);
  }
  function acaba(guanya, motiu = '') {
    S.quiet = restantMs(); S.fase = 'fi'; S.prem = null;
    document.body.dataset.fase = 'fi';
    pintaTimer(guanya ? totalSegons() : Math.max(0, totalSegons()));
    $('#bomba').classList.add(guanya ? 'salvada' : 'petada');
    if (guanya) { to(660, 0.5, 'triangle', 0.09); } else explosio();
    const t = totalSegons(); const marge = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const errs = S.errors === 1 ? '1 error' : `${S.errors} errors`;
    $('#nota-titol').textContent = guanya ? 'Bomba desactivada' : 'Ha petat';
    $('#nota-text').innerHTML = guanya
      ? `<p>Marge de ${marge} i ${errs}. Canvieu els papers i proveu-ho amb una bomba nova.</p>`
      : `<p>${esc(motiu)} Canvieu els papers i torneu-ho a provar.</p>`;
    $('#comenca').textContent = 'Bomba nova';
    $('#nota').hidden = false;
    $('#comenca').focus();
  }
  function tallaCable(i) {
    if (S.fase !== 'joc' || S.cables || S.tallats.has(i)) return;
    S.tallats.add(i);
    to(1800, 0.05, 'square', 0.05);
    const correcte = i === R.solucioCables(S.b);
    if (correcte) S.cables = true;
    pintaCables();
    if (correcte) modulFet(); else error();
  }
  function premBoto() {
    if (S.fase !== 'joc' || S.boto || S.prem) return;
    const prem = { viva: false, color: null };
    S.prem = prem;
    $('#boto').classList.add('avall');
    prem.t = setTimeout(() => {
      const c = Object.keys(R.LLUMS); prem.color = c[Math.floor(Math.random() * c.length)]; prem.viva = true;
      const l = $('#llum'); l.style.setProperty('--l', R.LLUMS[prem.color].hex); l.classList.add('viva'); l.dataset.color = prem.color;
      $('#llum-nom').textContent = `llum ${R.LLUMS[prem.color].nom}`;
    }, R.PARTIDA.mantenirMs);
  }
  function deixaBoto(cancel) {
    const prem = S.prem; if (!prem) return;
    S.prem = null; clearTimeout(prem.t);
    $('#boto').classList.remove('avall');
    if (cancel || S.fase !== 'joc') { apagaLlum(); return; }
    const cal = R.solucioBoto(S.b);
    let bo;
    if (cal === 'clic') bo = !prem.viva;
    else bo = prem.viva && R.LLUMS[prem.color].test(totalSegons() % 60);
    apagaLlum();
    if (bo) { S.boto = true; pintaBoto(); modulFet(); } else error();
  }

  $('#cables-svg').addEventListener('click', (e) => {
    const g = e.target.closest('.cable'); if (g) tallaCable(Number(g.dataset.i));
  });
  $('#cables-svg').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest('.cable');
    if (g) { e.preventDefault(); const i = Number(g.dataset.i); tallaCable(i); const n = document.querySelector(`.cable[data-i="${i}"]`); if (n) n.focus(); }
  });
  const bt = $('#boto');
  bt.addEventListener('pointerdown', (e) => { e.preventDefault(); try { bt.setPointerCapture(e.pointerId); } catch (x) { /* sense captura */ } premBoto(); });
  bt.addEventListener('pointerup', () => deixaBoto(false));
  bt.addEventListener('pointercancel', () => deixaBoto(true));
  bt.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); premBoto(); } });
  bt.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); deixaBoto(false); } });
  bt.addEventListener('blur', () => deixaBoto(true));
  bt.addEventListener('contextmenu', (e) => e.preventDefault());
  $('#comenca').addEventListener('click', comenca);

  const btSo = $('#so');
  const pintaSo = () => { btSo.textContent = soActiu ? 'Apaga el so' : 'Encén el so'; };
  btSo.addEventListener('click', () => {
    soActiu = !soActiu; pintaSo();
    try { localStorage.setItem('curtcircuit-so', soActiu ? 'si' : 'no'); } catch (e) { /* sense emmagatzematge */ }
  });
  pintaSo();

  /* ---------- Bucle ---------- */
  setInterval(() => {
    if (S.fase !== 'joc') return;
    const t = totalSegons();
    if (t !== S.ultim) {
      S.ultim = t; pintaTimer(t);
      if (t > 0) to(t <= 30 ? 1100 : 760, 0.03, 'square', 0.025);
    }
    if (restantMs() <= 0) { S.ultim = 0; acaba(false, "S'ha acabat el temps."); }
  }, 50);

  /* ---------- Estat inicial: una bomba d'exemple sota la nota ---------- */
  S.b = R.generaBomba();
  S.quiet = R.PARTIDA.segons * 1000;
  document.body.dataset.fase = 'inici';
  pintaTot();
})();
