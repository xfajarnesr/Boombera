// Tot el so es genera al navegador: no hi ha cap fitxer d'àudio.
// La intensitat va de 0 (acaba de començar) a 1 (queda zero temps).
export function creaSo() {
  let ctx = null;
  let mestre = null;
  let musica = null;
  let actiu = true;
  let sona = false;
  let intensitat = 0;
  let cicle = null;
  let properCop = 0;
  let pas = 0;
  let dron = null;
  let tremolo = null;
  let soroll = null;

  try { actiu = localStorage.getItem('curtcircuit-so') !== 'no'; } catch (e) { /* sense emmagatzematge */ }

  function prepara() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -10; limit.ratio.value = 10;
    mestre = ctx.createGain();
    mestre.gain.value = actiu ? 0.8 : 0;
    mestre.connect(limit).connect(ctx.destination);
  }

  function ressonancia(dur) {
    const n = Math.floor(ctx.sampleRate * dur);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    const r = ctx.createConvolver();
    r.buffer = b;
    return r;
  }

  function sorollBuffer(dur) {
    const n = Math.floor(ctx.sampleRate * dur);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function batec(t, vol) {
    [0, 0.17].forEach((dt, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(95, t + dt);
      o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14);
      const v = vol * (i ? 0.65 : 1);
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(v, t + dt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.2);
      o.connect(g).connect(musica); o.start(t + dt); o.stop(t + dt + 0.22);
    });
  }

  function corda(t, freq, vol, dur) {
    const o = ctx.createOscillator(); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = 350 + intensitat * 2600; f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(musica); o.start(t); o.stop(t + dur + 0.02);
  }

  // Dues notes a un semitò de distància: senzill i molt incòmode.
  const LA = 110; const SIB = 116.54; const MI = 164.81; const FA = 174.61;
  function programa() {
    if (!sona) return;
    while (properCop < ctx.currentTime + 0.25) {
      const bpm = 58 + intensitat * 96;
      const corxera = 60 / bpm / 2;
      const t = properCop;
      if (pas % 4 === 0) batec(t, 0.42 + intensitat * 0.45);
      if (intensitat > 0.12) {
        const f = pas % 8 < 6 ? LA : SIB;
        corda(t, f, 0.05 + intensitat * 0.1, corxera * 1.4);
      }
      if (intensitat > 0.45 && pas % 2 === 1) corda(t, pas % 8 < 6 ? MI : FA, 0.03 + intensitat * 0.07, corxera);
      if (intensitat > 0.72) corda(t, (pas % 16 < 12 ? LA : SIB) * 4, 0.018 + intensitat * 0.035, corxera * 0.7);
      properCop += corxera;
      pas += 1;
    }
    const t = ctx.currentTime;
    dron.g.gain.setTargetAtTime(0.05 + intensitat * 0.14, t, 0.6);
    dron.f.frequency.setTargetAtTime(90 + intensitat * 620, t, 0.6);
    tremolo.gain.setTargetAtTime(intensitat > 0.6 ? (intensitat - 0.6) * 0.2 : 0, t, 0.5);
    soroll.g.gain.setTargetAtTime(intensitat > 0.8 ? (intensitat - 0.8) * 0.5 : 0, t, 0.4);
    soroll.f.frequency.setTargetAtTime(600 + (intensitat - 0.8) * 22000, t, 0.5);
  }

  function arrenca() {
    prepara();
    if (!ctx) return;
    atura(0.05);
    musica = ctx.createGain();
    musica.gain.value = 1;
    const sala = ressonancia(1.6); const sec = ctx.createGain(); const hum = ctx.createGain();
    sec.gain.value = 0.85; hum.gain.value = 0.25;
    musica.connect(sec).connect(mestre);
    musica.connect(sala).connect(hum).connect(mestre);

    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 90; f.Q.value = 4;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const oscs = [55, 55.4, 58.27].map((fr) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
    f.connect(g).connect(musica);
    dron = { f, g, oscs };

    const trm = ctx.createOscillator(); const trg = ctx.createGain(); const lfo = ctx.createOscillator(); const lfog = ctx.createGain();
    trm.type = 'sawtooth'; trm.frequency.value = 932.3; lfo.frequency.value = 11; lfog.gain.value = 0.5;
    const amp = ctx.createGain(); amp.gain.value = 0.5;
    lfo.connect(lfog).connect(amp.gain);
    const flp = ctx.createBiquadFilter(); flp.type = 'bandpass'; flp.frequency.value = 1300;
    trm.connect(amp).connect(flp).connect(trg).connect(musica);
    trg.gain.value = 0; trm.start(); lfo.start();
    tremolo = trg; tremolo.oscs = [trm, lfo];

    const src = ctx.createBufferSource(); src.buffer = sorollBuffer(2); src.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 1.2; nf.frequency.value = 600;
    const ng = ctx.createGain(); ng.gain.value = 0;
    src.connect(nf).connect(ng).connect(musica); src.start();
    soroll = { f: nf, g: ng, src };

    intensitat = 0; pas = 0; properCop = ctx.currentTime + 0.05; sona = true;
    clearInterval(cicle); cicle = setInterval(programa, 80);
  }

  function atura(fosa = 0.3) {
    sona = false; clearInterval(cicle);
    if (!ctx || !musica) return;
    const m = musica; const d = dron; const t = tremolo; const s = soroll;
    m.gain.setTargetAtTime(0, ctx.currentTime, fosa / 3);
    setTimeout(() => {
      try { d.oscs.forEach((o) => o.stop()); t.oscs.forEach((o) => o.stop()); s.src.stop(); m.disconnect(); } catch (e) { /* ja aturat */ }
    }, fosa * 1000 + 200);
    musica = null;
  }

  function to(freq, dur, tipus, vol) {
    if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = tipus; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(mestre); o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  function explosio() {
    atura(0.03);
    if (!ctx) return;
    const t = ctx.currentTime;
    const sala = ressonancia(4); const hum = ctx.createGain(); hum.gain.value = 0.7;
    sala.connect(hum).connect(mestre);

    const src = ctx.createBufferSource(); src.buffer = sorollBuffer(3);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(9000, t); f.frequency.exponentialRampToValueAtTime(90, t + 2.4);
    const g = ctx.createGain(); g.gain.setValueAtTime(1.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
    src.connect(f).connect(g); g.connect(mestre); g.connect(sala); src.start(t);

    const sub = ctx.createOscillator(); const sg = ctx.createGain();
    sub.frequency.setValueAtTime(95, t); sub.frequency.exponentialRampToValueAtTime(22, t + 2);
    sg.gain.setValueAtTime(1.2, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    sub.connect(sg).connect(mestre); sub.start(t); sub.stop(t + 2.7);

    // El xiulet a les orelles després del cop.
    const x = ctx.createOscillator(); const xg = ctx.createGain();
    x.frequency.value = 3700;
    xg.gain.setValueAtTime(0.0001, t + 0.9);
    xg.gain.exponentialRampToValueAtTime(0.035, t + 1.6);
    xg.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
    x.connect(xg).connect(mestre); x.start(t + 0.9); x.stop(t + 6.6);
  }

  return {
    arrenca, atura, explosio,
    intensitat(i) { intensitat = Math.max(0, Math.min(1, i)); },
    tic(ultims) { if (sona) to(ultims ? 1250 : 800, 0.035, 'square', ultims ? 0.05 : 0.025); },
    tall() { to(2100, 0.05, 'square', 0.07); },
    error() { to(92, 0.45, 'sawtooth', 0.32); to(97, 0.45, 'sawtooth', 0.28); },
    modul() { to(660, 0.14, 'triangle', 0.2); setTimeout(() => to(990, 0.22, 'triangle', 0.2), 110); },
    // Gir: fregament de metall que s'arrossega i un cop sord quan la bomba torna a quedar quieta.
    gir() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = sorollBuffer(0.6);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6;
      f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.3); f.frequency.exponentialRampToValueAtTime(300, t + 0.58);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      src.connect(f).connect(g).connect(mestre); src.start(t);
      const o = ctx.createOscillator(); const og = ctx.createGain();
      o.frequency.setValueAtTime(120, t + 0.58); o.frequency.exponentialRampToValueAtTime(48, t + 0.75);
      og.gain.setValueAtTime(0.0001, t + 0.58); og.gain.exponentialRampToValueAtTime(0.3, t + 0.59); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(og).connect(mestre); o.start(t + 0.58); o.stop(t + 0.82);
    },
    guanya() {
      atura(0.5);
      if (!ctx) return;
      [220, 329.63, 440, 554.37].forEach((f, i) => setTimeout(() => to(f, 2.4, 'triangle', 0.14), i * 110));
    },
    get actiu() { return actiu; },
    commuta() {
      actiu = !actiu;
      if (ctx && mestre) mestre.gain.setTargetAtTime(actiu ? 0.8 : 0, ctx.currentTime, 0.02);
      try { localStorage.setItem('curtcircuit-so', actiu ? 'si' : 'no'); } catch (e) { /* sense emmagatzematge */ }
      return actiu;
    },
  };
}
