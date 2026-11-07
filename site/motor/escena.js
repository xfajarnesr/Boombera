// Escena 3D: carcassa blindada, llums, alarmes i explosió. No sap res de les regles.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { espaiBuit, etiqueta, ple, materials } from './peces.js';
import { MODULS } from '../moduls/registre.js';

const AMPLE = 12.8; const ALT = 8.7;
const FONS = 2.2; // gruix de la bomba: distància entre la cara del davant i la de darrere
// Espais de mòdul d'una cara. La bomba en té dues: els 6 primers són davant i els 6 següents, darrere.
export const ESPAIS = [
  [-4.05, 0.72], [0, 0.72], [4.05, 0.72],
  [-4.05, -2.34], [0, -2.34], [4.05, -2.34],
];
// Ranures de la carcassa a la capçalera de cada cara, dues a cada banda del temporitzador.
const RANURES = [-5.05, -3.05, 3.05, 5.05];
const GIR_MS = 620; // durada del gir
const BAIX = 0.8; // espai a sota per a la barra de girar
const ZOOM_MS = 380; // durada d'apropar o allunyar la càmera a una zona (mòbil)
// Graons de qualitat: el motor baixa sol si el PC no arriba i torna a pujar (com a molt una vegada) si va folgat.
const GRAONS = [
  { nom: 'alta', pr: 1.5, ombra: 1536, suau: true, ombres: true, entorn: 0.32, parts: 1, parallax: true },
  { nom: 'mitjana', pr: 1, ombra: 1024, suau: false, ombres: true, entorn: 0.32, parts: 1, parallax: true },
  { nom: 'baixa', pr: 0.75, ombra: 512, suau: false, ombres: true, entorn: 0.25, parts: 0.5, parallax: true },
  { nom: 'mínima', pr: 0.6, ombra: 512, suau: false, ombres: false, entorn: 0, parts: 0.35, parallax: false },
];

export function creaEscena(canvas, senseMoviment) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(Math.min(dpr, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const clau = new THREE.SpotLight(0xfff1dd, 400, 60, 0.62, 0.55, 1.6);
  clau.position.set(-4, 8, 19); clau.target.position.set(0, -0.3, 0);
  clau.castShadow = true; clau.shadow.mapSize.set(1536, 1536); clau.shadow.bias = -0.0006;
  clau.shadow.camera.near = 8; clau.shadow.camera.far = 40;
  scene.add(clau, clau.target);
  const omplir = new THREE.DirectionalLight(0x9fb4cc, 0.4); omplir.position.set(8, -3, 10); scene.add(omplir);
  // Contrallum: retalla les arestes de la bomba sobre la paret fosca.
  const contra = new THREE.DirectionalLight(0xc8d4e0, 0.9); contra.position.set(-3, 9, -9); scene.add(contra);

  // Les alarmes són darrere la bomba, entre la bomba i la paret: fan un halo vermell a la paret que retalla la silueta,
  // però no arriben als mòduls, i els seus colors es continuen llegint encara que tot es torni vermell.
  const alarmes = [-1, 1].map((s) => {
    const l = new THREE.PointLight(0xff1208, 0, 34, 1.5);
    l.position.set(s * AMPLE * 0.32, ALT / 2 - 1.6, -5.9);
    scene.add(l);
    return l;
  });

  // La paret queda prou enrere perquè la bomba hi càpiga quan gira.
  const paret = new THREE.Mesh(new THREE.PlaneGeometry(110, 70), materials().paret);
  paret.position.z = -7; paret.receiveShadow = true; scene.add(paret);
  paret.material.emissive = new THREE.Color(0x5a0700); paret.material.emissiveIntensity = 0;

  // El gir es fa sobre el centre de la bomba: «eix» és el pivot, «arrel» porta la bomba amb la cara del davant a z = 0.
  const eix = new THREE.Group(); eix.position.z = -FONS / 2; scene.add(eix);
  const arrel = new THREE.Group(); arrel.position.z = FONS / 2; eix.add(arrel);
  let cares = [];
  const G = { cara: 0, angle: 0, de: 0, a: 0, t0: 0, girant: false, fiMs: -1e9 };
  let avisaCara = () => {};
  let ombresPetites = [];
  const particules = new THREE.Group(); scene.add(particules);
  const textures = creaTexturesFoc();

  let vista = { moduls: {}, peces: [], timers: [], errors: [], llums: [], casc: null };
  let intensitat = 0; let estat = 'repos'; let temps0 = performance.now();
  let tExplosio = 0; let sacseig = 0; let nivellFlaix = 0;
  const parts = []; const volen = [];
  const flaixLlum = new THREE.PointLight(0xffc27a, 0, 90, 1.2); flaixLlum.position.set(0, 0, 5); scene.add(flaixLlum);
  const dianes = new Map();
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  let dist = 40; let entrada = 0; let entradaMs = 1100; let entradaArc = 0;
  let portada = false;
  // Armat: els mòduls entren al seu lloc d'un en un i els llums d'error es comproven.
  const A = { t0: 0, ms: 0, actiu: false, n: 0 };
  // Efectes curts: mòdul resolt, error, desactivada.
  const efectes = [];
  // Ampliar una zona (al mòbil): la càmera s'hi apropa.
  const Z = { zona: null, t0: -1e9, de: null, deMira: null, ara: new THREE.Vector3(), mira: new THREE.Vector3(), actiu: false };
  const zones = new Map();
  let salvadaT = -1;
  // La càmera segueix una mica el ratolí. Amb el dit no: cada toc la faria saltar.
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    ptr.x = (e.clientX / window.innerWidth - 0.5) * 2; ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function mida() {
    const w = canvas.clientWidth || window.innerWidth; const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const perAlt = (ALT + 0.8 + BAIX) / (2 * Math.tan(vfov / 2));
    const perAmple = (AMPLE + 1) / (2 * Math.tan(vfov / 2) * camera.aspect);
    dist = Math.max(perAlt, perAmple) + 0.4;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', mida);

  function neteja(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map && o.material.userData.propi) o.material.map.dispose();
      if (o.material && o.material.userData.propi) o.material.dispose();
    });
  }

  // espais: identificador del mòdul de cada espai (o null). instancies: per a cada identificador, el nom del mòdul i les seves dades.
  function construeix(bomba, espais, versio, { instancies = {}, errors: maxErrors = 3 } = {}) {
    [...arrel.children].forEach((c) => { neteja(c); arrel.remove(c); });
    [...particules.children].forEach((c) => { particules.remove(c); if (c.material) c.material.dispose(); });
    parts.length = 0; volen.length = 0;
    dianes.clear();
    estat = 'repos'; tExplosio = 0; sacseig = 0; nivellFlaix = 0; flaixLlum.intensity = 0;
    zones.clear(); Z.zona = null; Z.actiu = false; Z.t0 = -1e9; A.actiu = false; salvadaT = -1;
    efectes.splice(0).forEach((f) => f.fi && f.fi());
    clau.color.set(0xfff1dd);
    arrel.position.set(0, 0, FONS / 2); arrel.rotation.set(0, 0, 0);
    eix.position.set(0, 0, -FONS / 2); eix.rotation.set(0, 0, 0);
    Object.assign(G, { cara: 0, angle: 0, de: 0, a: 0, girant: false, fiMs: -1e9 });

    const M = materials();
    const casc = creaCasc(M); arrel.add(casc);
    // Cada cara és un grup: la de darrere està girada mitja volta, i així els seus mòduls es veuen drets quan es gira la bomba.
    cares = [0, 1].map((c) => {
      const g = new THREE.Group();
      if (c === 1) { g.position.z = -FONS; g.rotation.y = Math.PI; }
      g.add(creaFaceCasc(M));
      arrel.add(g);
      return g;
    });
    const peces = [];
    const moduls = {};
    const timer = creaTimer();
    const timers = []; const errors = [];
    espais.forEach((id, n) => {
      const [x, y] = ESPAIS[n % ESPAIS.length];
      const inst = id && (instancies[id] || { nom: id, b: bomba });
      const g = id ? MODULS[inst.nom].crea3D(inst.b) : espaiBuit();
      g.position.set(x, y, 0.03);
      cares[Math.floor(n / ESPAIS.length)].add(g); peces.push(g);
      if (id) moduls[id] = g;
    });
    cares.forEach((grup, c) => {
      const cap = creaCapcalera(bomba, versio, M, c, timer, maxErrors);
      cap.grup.userData.capcalera = true;
      grup.add(cap.grup); peces.push(cap.grup);
      timers.push(cap.timer); errors.push(cap.errors);
    });
    const balises = creaBalises(); balises.forEach((b) => arrel.add(b));
    arrel.traverse((o) => { if (o.isMesh && !o.userData.senseOmbra) { o.castShadow = true; o.receiveShadow = true; } });
    cares[1].visible = false; // la cara amagada no es dibuixa: estalvia feina al PC
    // Peces petites que fan ombra: mentre la bomba gira no es noten i es deixen de calcular.
    ombresPetites = []; cares.forEach((c) => c.traverse((o) => { if (o.isMesh && o.castShadow) ombresPetites.push(o); }));
    vista = { moduls, peces, timer, errors, casc, balises };
    entrada = senseMoviment ? 1 : 0; entradaMs = 1100; entradaArc = 0;
    temps0 = performance.now();
    return vista;
  }

  /* ---------- Bucle ---------- */
  const proj = new THREE.Vector3();
  function projecta(p) {
    proj.copy(p).project(camera);
    return { x: (proj.x + 1) / 2 * canvas.clientWidth, y: (1 - proj.y) / 2 * canvas.clientHeight };
  }
  const a = new THREE.Vector3(); const b = new THREE.Vector3();
  const caraDe = (obj) => { let o = obj; while (o && !cares.includes(o)) o = o.parent; return cares.indexOf(o); };
  function posaDianes() {
    dianes.forEach((d, el) => {
      // Només es poden prémer les dianes de la cara que es veu, i cap mentre la bomba gira.
      const amaga = G.girant || d.cara !== G.cara;
      if (el.dataset.amagada !== String(amaga)) el.dataset.amagada = String(amaga);
      if (amaga) return;
      d.obj.updateWorldMatrix(true, false);
      a.set(d.x - d.w / 2, d.y + d.h / 2, d.z).applyMatrix4(d.obj.matrixWorld);
      b.set(d.x + d.w / 2, d.y - d.h / 2, d.z).applyMatrix4(d.obj.matrixWorld);
      const p = projecta(a); const q = projecta(b);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      el.style.width = `${(q.x - p.x).toFixed(1)}px`;
      el.style.height = `${(q.y - p.y).toFixed(1)}px`;
    });
  }

  /* ---------- Rendiment ---------- */
  // Es mesura el temps de cada fotograma (mediana i el 5 % més lent) en finestres de 2 s.
  // Baixa un graó si la mediana passa de 36 ms o el 5 % més lent de 70 ms; puja com a molt una vegada si va folgat 10 s.
  // A les proves (rellotge de mentida, window.__ms) no es mesura: allà els fotogrames van espaiats a posta.
  let graoAuto = 0; let graoForcat = null; let pujades = 0; let tCanvi = 0; let folgat = 0;
  let mostres = []; let tFinestra = performance.now();
  const ultimaMesura = { mediana: 0, p95: 0, fps: 0 };
  const grao = () => (graoForcat === null ? graoAuto : graoForcat);
  function aplicaGrao() {
    const g = GRAONS[grao()];
    renderer.setPixelRatio(Math.min(dpr, g.pr));
    if (clau.shadow.mapSize.x !== g.ombra) {
      clau.shadow.mapSize.set(g.ombra, g.ombra);
      if (clau.shadow.map) { clau.shadow.map.dispose(); clau.shadow.map = null; }
    }
    renderer.shadowMap.type = g.suau ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    clau.castShadow = g.ombres;
    scene.environmentIntensity = g.entorn;
    mida();
  }
  function mesura(ara, durada) {
    // Tampoc els 3 primers segons: el navegador encara prepara els gràfics i els fotogrames llargs no diuen res del PC.
    if (window.__ms !== undefined || document.hidden || estat === 'petada' || durada > 1000 || ara < 3000) { mostres = []; tFinestra = ara; return; }
    mostres.push(durada);
    if (ara - tFinestra < 2000) return;
    const o = mostres.slice().sort((x, y) => x - y);
    ultimaMesura.mediana = o[Math.floor(o.length / 2)] || 0;
    ultimaMesura.p95 = o[Math.min(o.length - 1, Math.floor(o.length * 0.95))] || 0;
    ultimaMesura.fps = mostres.length * 1000 / (ara - tFinestra);
    mostres = []; tFinestra = ara;
    if (graoForcat !== null || ara - tCanvi < 2000) return;
    const lent = ultimaMesura.mediana > 36 || ultimaMesura.p95 > 70;
    const rapid = ultimaMesura.mediana < 18 && ultimaMesura.p95 < 28;
    if (lent && graoAuto < GRAONS.length - 1) { graoAuto += 1; tCanvi = ara; folgat = 0; aplicaGrao(); return; }
    folgat = rapid ? folgat + 1 : 0;
    if (folgat >= 5 && graoAuto > 0 && pujades < 1) { graoAuto -= 1; pujades += 1; tCanvi = ara; folgat = 0; aplicaGrao(); }
  }

  /* ---------- Càmera ---------- */
  const suauZoom = (u) => 1 - Math.pow(1 - u, 3);
  const zonaVista = new THREE.Vector3(); const zonaMira = new THREE.Vector3();
  function calculaZona(z) {
    z.obj.updateWorldMatrix(true, false);
    zonaMira.set(z.x, z.y, z.z).applyMatrix4(z.obj.matrixWorld);
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    // Amb marge per a la barra de sota: la zona queda una mica amunt.
    const d = Math.max(z.h * 1.38 / (2 * t), z.w * 1.12 / (2 * t * camera.aspect));
    zonaMira.y -= z.h * 0.08;
    zonaVista.copy(zonaMira).add(new THREE.Vector3(0, 0, d));
  }

  let anterior = performance.now(); let darrerDibuix = 0;
  function pas(ara) {
    requestAnimationFrame(pas);
    const durada = ara - anterior;
    const dtReal = Math.min(0.3, durada / 1000); const dt = Math.min(0.05, dtReal); anterior = ara;
    const t = (ara - temps0) / 1000;
    mesura(ara, durada);
    const G0 = GRAONS[grao()];
    const rellotge = performance.now();

    // Càmera
    // L'entrada de la càmera va pel rellotge, no pels fotogrames: en un PC lent dura el mateix.
    entrada = senseMoviment ? 1 : Math.min(1, Math.max(entrada, (rellotge - temps0) / entradaMs));
    const e = 1 - Math.pow(1 - entrada, 3);
    ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 3); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 3);
    const mou = !senseMoviment && G0.parallax;
    const px = mou ? ptr.sx * 0.1 : 0; const py = mou ? ptr.sy * 0.07 : 0;
    // A la portada, la càmera respira a poc a poc.
    const resp = portada && mou ? Math.sin(t * 0.42) : 0;
    const arc = Math.sin(Math.PI * e) * entradaArc;
    camera.position.set(px + arc + (portada && mou ? Math.sin(t * 0.27) * 0.12 : 0), -py - 0.1 - BAIX / 2, dist + (1 - e) * 5 * (entradaMs / 1100) + resp * 0.3 + (estat === 'petada' ? 2 : 0));
    const mira = new THREE.Vector3(0, -0.12 - BAIX / 2, 0);
    // Zona ampliada: la càmera hi va (i en torna) en ZOOM_MS; amb «moviment reduït», de cop.
    const uz = senseMoviment ? 1 : Math.min(1, (rellotge - Z.t0) / ZOOM_MS);
    const desti = Z.zona && zones.get(Z.zona);
    if (desti) calculaZona(desti);
    if (uz < 1 || desti) {
      const k = suauZoom(uz);
      const cap = desti ? zonaVista : camera.position; const capMira = desti ? zonaMira : mira;
      if (Z.de && uz < 1) { camera.position.lerpVectors(Z.de, cap, k); mira.lerpVectors(Z.deMira, capMira, k); } else { camera.position.copy(cap); mira.copy(capMira); }
    }
    Z.ara.copy(camera.position); Z.mira.copy(mira);
    Z.actiu = uz < 1;
    camera.lookAt(mira);
    if (sacseig > 0.001 && !senseMoviment) {
      camera.position.x += (Math.random() - 0.5) * sacseig; camera.position.y += (Math.random() - 0.5) * sacseig;
      camera.rotation.z = (Math.random() - 0.5) * sacseig * 0.04;
    }
    sacseig *= Math.exp(-dtReal * 2.8);

    // Alarmes: el vermell guanya terreny i batega amb la música
    const bpm = 58 + intensitat * 96;
    const fase = (Math.sin(t * bpm / 60 * Math.PI * 2) + 1) / 2;
    const quant = estat === 'joc' ? intensitat * intensitat : 0;
    const puls = senseMoviment ? 0.7 : fase;
    posaAlarmes(quant, puls);
    // La llum dura baixa poc amb l'alarma, perquè els colors dels mòduls es continuïn llegint.
    clau.intensity = estat === 'petada' ? 170 : estat === 'salvada' ? 460 : 400 * (1 - quant * 0.3);
    (vista.balises || []).forEach((m) => {
      m.material.emissiveIntensity = estat === 'joc' ? 0.25 + quant * 3.4 * puls : 0.05;
    });
    document.documentElement.style.setProperty('--alarma', estat === 'joc' ? (quant * (0.35 + 0.65 * puls)).toFixed(3) : '0');

    animaGir(rellotge);
    animaArmat(rellotge);
    animaSalvada(rellotge);
    animaEfectes(rellotge);
    if (estat === 'petada') animaExplosio(dtReal);
    else animaParticules(dtReal);
    Object.values(vista.moduls).forEach((m) => m.userData.anima && m.userData.anima(dt));

    posaDianes();
    // A la portada n'hi ha prou amb 30 fotogrames per segon.
    if (!(portada && ara - darrerDibuix < 32)) { renderer.render(scene, camera); darrerDibuix = ara; }
    // Les proves esperen aquest estat abans de prémer res: la càmera ha acabat d'entrar, la bomba no gira,
    // no s'està armant i la càmera no s'està apropant a cap zona.
    const quieta = String(entrada >= 1 && !G.girant && estat !== 'petada' && !A.actiu && !Z.actiu);
    if (canvas.dataset.quieta !== quieta) canvas.dataset.quieta = quieta;
  }

  // L'alarma batega: «puls» va de 0 a 1. Les balises de la bomba fan el mateix.
  // La llum vermella que arriba a la bomba és poca (només marca els cantells); el vermell que guanya terreny
  // és sobretot la paret, que s'encén ella mateixa i no tenyeix els colors dels mòduls.
  function posaAlarmes(quant, puls) {
    alarmes.forEach((l) => { l.intensity = quant * (40 + 180 * puls) + (estat === 'joc' ? 4 : 0); });
    paret.material.emissiveIntensity = quant * (0.35 + 0.65 * puls);
  }

  /* ---------- Armat ---------- */
  // Els mòduls s'enfonsen i tornen al seu lloc d'un en un, amb un cop, i els llums d'error s'encenen en cadena.
  function arma(ms) {
    A.t0 = performance.now(); A.ms = ms; A.actiu = true; canvas.dataset.quieta = 'false';
    A.peces = vista.peces.filter((g) => !g.userData.capcalera);
    A.peces.forEach((g) => { g.userData.z0 = g.userData.z0 !== undefined ? g.userData.z0 : g.position.z; });
    A.n = vista.errors[0] ? vista.errors[0].length : 0;
  }
  function animaArmat(ara) {
    if (!A.actiu) return;
    const u = (ara - A.t0) / A.ms;
    const pasMod = 0.55 / Math.max(1, A.peces.length);
    A.peces.forEach((g, i) => {
      if (senseMoviment) return;
      const v = Math.min(1, Math.max(0, (u - i * pasMod) / 0.25));
      g.position.z = g.userData.z0 - 0.45 * (1 - suauZoom(v));
    });
    // Comprovació dels llums: s'encenen un rere l'altre i s'apaguen.
    const llum = Math.floor((u - 0.3) / 0.13);
    vista.errors.flat().forEach((m) => { const on = u > 0.3 && u < 0.3 + A.n * 0.13 + 0.12 && m.userData.i === llum; m.material.emissiveIntensity = on ? 3.2 : 0; m.material.color.set(on ? 0xff2a1a : 0x3a2320); });
    if (u >= 1) {
      A.actiu = false;
      A.peces.forEach((g) => { g.position.z = g.userData.z0; });
      vista.errors.flat().forEach((m) => { m.material.emissiveIntensity = 0; m.material.color.set(0x3a2320); });
    }
  }

  /* ---------- Efectes ---------- */
  function animaEfectes(ara) {
    for (let i = efectes.length - 1; i >= 0; i--) {
      const f = efectes[i]; const u = (ara - f.t0) / f.ms;
      if (u >= 1) { f.pas(1); if (f.fi) f.fi(); efectes.splice(i, 1); } else f.pas(u);
    }
  }
  // Mòdul resolt: un pols de llum verda des del mòdul i el mòdul s'enfonsa una mica.
  function celebra(nom) {
    const g = vista.moduls[nom]; if (!g) return;
    const llum = new THREE.PointLight(0x35ff77, 0, 9, 1.6);
    const p = new THREE.Vector3(); g.getWorldPosition(p); llum.position.copy(p).setZ(p.z + 1.4); scene.add(llum);
    const z0 = g.position.z;
    efectes.push({
      t0: performance.now(), ms: senseMoviment ? 400 : 650,
      pas(u) { llum.intensity = 60 * Math.sin(Math.PI * Math.min(1, u * 1.3)); if (!senseMoviment) g.position.z = z0 - 0.05 * suauZoom(Math.min(1, u * 2)); },
      fi() { scene.remove(llum); llum.dispose(); },
    });
  }
  // Error: espurnes des del mòdul i el darrer llum d'error s'encén amb un esclat. «greu»: era el penúltim.
  function avisaError(nom, nErrors, greu) {
    const g = vista.moduls[nom];
    if (g && !senseMoviment) {
      const p = new THREE.Vector3(); g.getWorldPosition(p); p.z += 0.4;
      const quantes = Math.round((greu ? 34 : 18) * GRAONS[grao()].parts);
      for (let i = 0; i < quantes; i++) {
        const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6 - 0.2, Math.random()).normalize().multiplyScalar(4 + Math.random() * 7);
        parts.push({ s: sprite(textures.espurna, { suma: true, color: new THREE.Color(0xffb050), op: 1, mida: 0.16, p: p.clone(), depth: false }), v, vida: 0.35 + Math.random() * 0.5, edat: 0, de: 0.18, a: 0.04, op: 1, frega: 1.5, g: 14 });
      }
    }
    const llums = vista.errors.flat().filter((m) => m.userData.i === nErrors - 1);
    efectes.push({
      t0: performance.now(), ms: 420,
      pas(u) { llums.forEach((m) => { const k = senseMoviment ? 1 : 1 + 0.6 * Math.sin(Math.PI * u); m.scale.set(k, k, 0.6 * k); m.material.emissiveIntensity = 3.2 + 6 * (1 - u); }); },
      fi() { llums.forEach((m) => { m.scale.set(1, 1, 0.6); m.material.emissiveIntensity = 3.2; }); },
    });
  }
  // Partícules fora de l'explosió (les espurnes dels errors).
  function animaParticules(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.edat += dt;
      const u = p.edat / p.vida;
      if (u >= 1) { particules.remove(p.s); p.s.material.dispose(); parts.splice(i, 1); continue; }
      p.v.multiplyScalar(Math.exp(-dt * p.frega));
      if (p.g) p.v.y -= p.g * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.s.scale.setScalar(p.de + (p.a - p.de) * u);
      p.s.material.opacity = p.op * (1 - u);
    }
  }

  /* ---------- Desactivada ---------- */
  // Les alarmes s'apaguen una a una, la llum passa a blanca i la bomba s'allunya una mica, com si respirés.
  function animaSalvada(ara) {
    if (salvadaT < 0) return;
    const w = (ara - salvadaT) / 1000;
    alarmes.forEach((l, i) => { l.intensity = w < 0.15 + i * 0.3 ? 220 : 0; });
    (vista.balises || []).forEach((m, i) => { m.material.emissiveIntensity = w < 0.15 + i * 0.3 ? 2 : 0; });
    const k = Math.min(1, w / 1.2);
    clau.color.setRGB(1, 0.945 + 0.055 * k, 0.867 + 0.133 * k);
    if (!senseMoviment) eix.position.z = -FONS / 2 - 0.7 * suauZoom(k);
  }

  /* ---------- Gir ---------- */
  // Mitja volta sobre l'eix vertical. La bomba se separa una mica de la paret, s'inclina amb el pes
  // i en arribar fa un petit balanceig. La càmera no es mou, perquè no maregi.
  const suau = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  function gira(sentit = 1) {
    if (G.girant || estat === 'petada' || A.actiu) return false;
    G.girant = true; G.de = G.angle; G.a = G.angle + sentit * Math.PI; G.t0 = performance.now();
    cares.forEach((c) => { c.visible = true; });
    dianes.forEach((d, el) => { el.dataset.amagada = 'true'; });
    ombresPetites.forEach((o) => { o.castShadow = false; });
    avisaCara(G.cara, true);
    return true;
  }
  function animaGir(ara) {
    if (G.girant) {
      const u = Math.min(1, (ara - G.t0) / (senseMoviment ? 300 : GIR_MS));
      const e = senseMoviment ? (u < 0.5 ? 0 : 1) : suau(u);
      G.angle = G.de + (G.a - G.de) * e;
      const arc = senseMoviment ? 0 : Math.sin(Math.PI * e);
      eix.rotation.y = G.angle;
      eix.rotation.x = -0.05 * arc;
      eix.position.set(0, 0.18 * arc, -FONS / 2 + 1.6 * arc);
      if (u >= 1) {
        G.girant = false; G.fiMs = ara;
        G.cara = Math.round(G.angle / Math.PI) % 2 === 0 ? 0 : 1;
        cares.forEach((c, i) => { c.visible = i === G.cara || estat === 'petada'; });
        ombresPetites.forEach((o) => { o.castShadow = true; });
        avisaCara(G.cara, false);
      }
    } else if (!senseMoviment) {
      // Balanceig curt en arribar: s'apaga en un terç de segon.
      const w = (ara - G.fiMs) / 1000;
      eix.rotation.y = G.angle + (w < 0.45 ? 0.035 * Math.sin(w * 15) * Math.exp(-w * 9) : 0);
    }
  }

  /* ---------- Explosió ---------- */
  function sprite(mapa, opts) {
    const m = new THREE.SpriteMaterial({ map: mapa, transparent: true, depthWrite: false, depthTest: opts.depth !== false, blending: opts.suma ? THREE.AdditiveBlending : THREE.NormalBlending, color: opts.color, opacity: opts.op });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(opts.mida); s.position.copy(opts.p); s.material.rotation = Math.random() * 6.28;
    particules.add(s);
    return s;
  }
  function explota(origen) {
    estat = 'petada'; tExplosio = 0; sacseig = 1.8; nivellFlaix = 1;
    flaixLlum.intensity = 16000;
    const o = origen || new THREE.Vector3(0, 0, 1);
    cares.forEach((c) => { c.visible = true; });
    // Els panells surten disparats. La velocitat es calcula al món i es passa a l'orientació de la cara on és cada panell.
    const q = new THREE.Quaternion();
    vista.peces.forEach((g) => {
      const c = new THREE.Vector3(); g.getWorldPosition(c);
      const dir = c.clone().sub(o); dir.z = 0; const dl = dir.length() || 1; dir.divideScalar(dl);
      const v = new THREE.Vector3(dir.x * (9 + Math.random() * 12), dir.y * (7 + Math.random() * 9) + 4, 1 + Math.random() * 5);
      g.parent.getWorldQuaternion(q); v.applyQuaternion(q.invert());
      volen.push({ g, v, r: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 7) });
    });
    // El buc queda socarrimat
    vista.casc.traverse((m) => {
      if (m.isMesh) {
        m.material = m.material.clone(); m.material.color.set(0x15120f); m.material.roughness = 1;
        m.material.emissive = new THREE.Color(0x3a0e02); m.material.emissiveIntensity = 0.8; m.material.userData.propi = true;
      }
    });
    const pq = GRAONS[grao()].parts;
    for (let i = 0; i < 70 * pq; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), Math.random()).normalize().multiplyScalar(7 + Math.random() * 13);
      parts.push({ s: sprite(textures.foc, { suma: true, color: new THREE.Color().setHSL(0.03 + Math.random() * 0.07, 1, 0.55), op: 1, mida: 1.5, p: o.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 1)), depth: false }), v, vida: 0.5 + Math.random() * 0.9, edat: 0, de: 1.5 + Math.random() * 2, a: 7 + Math.random() * 7, op: 1, frega: 2.6 });
    }
    for (let i = 0; i < 46 * pq; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4 + 0.6, (Math.random() - 0.2) * 3);
      parts.push({ s: sprite(textures.fum, { color: new THREE.Color(0x0e0c0b), op: 0, mida: 3, p: o.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, 1.2)), depth: false }), v, vida: 4.5 + Math.random() * 4, edat: -Math.random() * 0.5, de: 2.5, a: 9 + Math.random() * 7, op: 0.85, frega: 0.35, fum: true });
    }
    // Un fum baix que es queda una bona estona.
    for (let i = 0; i < 10 * pq; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.25 + Math.random() * 0.3, 0);
      parts.push({ s: sprite(textures.fum, { color: new THREE.Color(0x15110e), op: 0, mida: 6, p: o.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, -2 + Math.random() * 3, 0.6)), depth: false }), v, vida: 18 + Math.random() * 8, edat: -1 - Math.random() * 1.5, de: 6, a: 13, op: 0.5, frega: 0.05, fum: true });
    }
    for (let i = 0; i < 90 * pq; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, Math.random()).normalize().multiplyScalar(9 + Math.random() * 20);
      parts.push({ s: sprite(textures.espurna, { suma: true, color: new THREE.Color(0xffc060), op: 1, mida: 0.22, p: o.clone().setZ(1), depth: false }), v, vida: 0.8 + Math.random() * 2.2, edat: 0, de: 0.26, a: 0.06, op: 1, frega: 0.9, g: 9 });
    }
  }
  function animaExplosio(dt) {
    tExplosio += dt;
    flaixLlum.intensity *= Math.exp(-dt * 5.5);
    flaixLlum.color.setHSL(0.07 - Math.min(0.07, tExplosio * 0.05), 1, 0.6);
    volen.forEach((f) => {
      f.v.y -= 20 * dt; f.g.position.addScaledVector(f.v, dt);
      if (f.g.position.y < -30) f.g.visible = false;
      f.g.rotation.x += f.r.x * dt; f.g.rotation.y += f.r.y * dt; f.g.rotation.z += f.r.z * dt;
    });
    if (vista.casc) {
      const brasa = 0.3 + 0.8 * Math.exp(-tExplosio * 0.55) + 0.05 * Math.sin(tExplosio * 7);
      vista.casc.traverse((m) => { if (m.isMesh) m.material.emissiveIntensity = brasa * 1; });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.edat += dt;
      if (p.edat < 0) continue;
      const u = p.edat / p.vida;
      if (u >= 1) { particules.remove(p.s); p.s.material.dispose(); parts.splice(i, 1); continue; }
      p.v.multiplyScalar(Math.exp(-dt * p.frega));
      if (p.g) p.v.y -= p.g * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.s.scale.setScalar(p.de + (p.a - p.de) * Math.sqrt(u));
      p.s.material.opacity = p.fum ? p.op * Math.min(1, u * 5) * (1 - u) : p.op * Math.pow(1 - u, 1.4);
    }
    // Brases que continuen caient quan ja ha passat tot
    if (tExplosio > 1 && Math.random() < dt * 9 && parts.length < 90) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 14, 5 + Math.random() * 2, 2 + Math.random() * 3);
      parts.push({ s: sprite(textures.espurna, { suma: true, color: new THREE.Color(0xff7a2a), op: 0.9, mida: 0.13, p, depth: false }), v: new THREE.Vector3((Math.random() - 0.5) * 0.5, -1 - Math.random() * 1.5, 0), vida: 5, edat: 0, de: 0.13, a: 0.05, op: 0.9, frega: 0 });
    }
  }

  mida();
  requestAnimationFrame(pas);

  return {
    construeix, explota, camera, THREE, arma, celebra, avisaError,
    posaEstat(e) { estat = e; },
    intensitat(i) { intensitat = i; },
    salvada() {
      estat = 'salvada'; salvadaT = performance.now();
      if (vista.timer) vista.timer.userData.verd = true;
    },
    // Portada: la càmera respira i es dibuixa a 30 fps. En sortir-ne, la càmera ve des de més lluny i amb un arc.
    portada(v) {
      const abans = portada; portada = Boolean(v);
      if (abans && !portada && !senseMoviment) { entrada = 0; entradaMs = 1600; entradaArc = 0.9; temps0 = performance.now(); }
    },
    // Ampliar zones al mòbil: cada zona és un rectangle sobre un objecte (un mòdul, una part de la capçalera).
    zona(el, obj, x, y, w, h) {
      const cara = caraDe(obj);
      el.dataset.cara = cara; el.dataset.amagada = String(G.girant || cara !== G.cara);
      const d = { obj, x, y, w, h, z: 0.05, cara };
      dianes.set(el, d); zones.set(el, d);
    },
    amplia(el) {
      if (Z.zona === el) return;
      Z.de = Z.ara.clone(); Z.deMira = Z.mira.clone(); Z.t0 = performance.now(); Z.zona = el; canvas.dataset.quieta = 'false';
    },
    allunya() {
      if (!Z.zona) return;
      Z.de = Z.ara.clone(); Z.deMira = Z.mira.clone(); Z.t0 = performance.now(); Z.zona = null; canvas.dataset.quieta = 'false';
    },
    get ampliada() { return Z.zona; },
    get cares() { return cares; },
    // Rendiment: el que mostra l'indicador ocult (Ctrl + Alt + D).
    rendiment() {
      const gl = renderer.getContext(); let gpu = '';
      try { const x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { gpu = '?'; }
      return { ...ultimaMesura, grao: grao(), nomGrao: GRAONS[grao()].nom, forcat: graoForcat !== null, crides: renderer.info.render.calls, triangles: renderer.info.render.triangles, gpu, mida: `${renderer.domElement.width}×${renderer.domElement.height}` };
    },
    // Per a les proves: dibuixa i llegeix el color de la pantalla en uns quants punts (coordenades CSS).
    // «pitjor»: amb l'alarma al pic del batec, que és quan més tenyeix.
    llegeixColors(punts, { pitjor = false } = {}) {
      if (pitjor && estat === 'joc') posaAlarmes(intensitat * intensitat, 1);
      renderer.render(scene, camera);
      const gl = renderer.getContext(); const k = renderer.getPixelRatio(); const h = renderer.domElement.height;
      const px = new Uint8Array(4);
      return punts.map(([x, y]) => { gl.readPixels(Math.round(x * k), Math.round(h - y * k), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; });
    },
    forcaGrao(n) { graoForcat = n === null || n === undefined ? null : Math.max(0, Math.min(GRAONS.length - 1, n)); aplicaGrao(); },
    GRAONS: GRAONS.map((g) => g.nom),
    diana(el, obj, x, y, w, h, z = 0.2) {
      const cara = caraDe(obj);
      el.dataset.cara = cara; el.dataset.amagada = String(G.girant || cara !== G.cara);
      dianes.set(el, { obj, x, y, w, h, z, cara });
    },
    gira,
    get cara() { return G.cara; },
    get girant() { return G.girant; },
    caraDeModul(nom) { return vista.moduls[nom] ? caraDe(vista.moduls[nom]) : -1; },
    enCanviCara(f) { avisaCara = f; },
    posaTemps(text, vermell) { if (vista.timer) vista.timer.userData.dibuixa(text, vermell); },
    posaErrors(n) { vista.errors.flat().forEach((m) => { const i = m.userData.i; m.material.emissiveIntensity = i < n ? 3.2 : 0; m.material.color.set(i < n ? 0xff2a1a : 0x3a2320); }); },
    origenDe(nom) { const g = vista.moduls[nom]; const p = new THREE.Vector3(); if (g) g.getWorldPosition(p); return p; },
    get moduls() { return vista.moduls; },
  };

  /* ---------- Carcassa ---------- */
  // El buc és una caixa gruixuda amb el cantell arrodonit, que es veu quan la bomba gira.
  function creaCasc(M) {
    const g = new THREE.Group();
    const s = rectArrod(AMPLE, ALT, 0.32);
    const cos = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: FONS - 0.2, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 3, curveSegments: 8 }), M.acer);
    cos.position.z = -FONS + 0.1; g.add(cos);
    // Junta del mig del cantell: diu que són dues meitats cargolades.
    const junta = new THREE.Mesh(new THREE.ExtrudeGeometry(rectArrod(AMPLE + 0.24, ALT + 0.24, 0.42), { depth: 0.16, bevelEnabled: false, curveSegments: 8 }), M.acerFosc);
    junta.position.z = -FONS / 2 - 0.08; g.add(junta);
    return g;
  }
  // El que porta cada cara a sobre del buc: la ratlla de sota la capçalera i els reblons del perímetre.
  function creaFaceCasc(M) {
    const g = new THREE.Group();
    const barra = new THREE.Mesh(new THREE.BoxGeometry(AMPLE - 0.7, 0.05, 0.05), M.acerFosc); barra.position.set(0, 2.47, 0.02); g.add(barra);
    const reb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), M.reblo, 44);
    const d = new THREE.Object3D(); let i = 0;
    for (let k = 0; k < 13; k++) {
      const x = -AMPLE / 2 + 0.28 + k * (AMPLE - 0.56) / 12;
      [ALT / 2 - 0.2, -ALT / 2 + 0.2].forEach((y) => { d.position.set(x, y, 0.02); d.scale.set(1, 1, 0.55); d.updateMatrix(); reb.setMatrixAt(i++, d.matrix); });
    }
    for (let k = 1; k < 8; k++) {
      const y = -ALT / 2 + 0.2 + k * (ALT - 0.4) / 8;
      [-AMPLE / 2 + 0.2, AMPLE / 2 - 0.2].forEach((x) => { d.position.set(x, y, 0.02); d.updateMatrix(); reb.setMatrixAt(i++, d.matrix); });
    }
    reb.count = i; g.add(reb);
    return g;
  }
  // Balises d'alarma als dos costats, a mig gruix: es veuen des de totes dues cares.
  function creaBalises() {
    return [-1, 1].map((s2) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 5.4, 6, 12), new THREE.MeshStandardMaterial({ color: 0x4a0d08, emissive: 0xff1a0a, emissiveIntensity: 0.25, roughness: 0.25 }));
      m.material.userData.propi = true;
      m.position.set(s2 * (AMPLE / 2 + 0.2), -0.3, -FONS / 2);
      return m;
    });
  }

  // Capçalera d'una cara: temporitzador i errors al mig (iguals a totes dues cares) i les peces de la carcassa
  // que hagin tocat a aquesta cara, cada una a la seva ranura.
  function creaCapcalera(bomba, versio, M, cara, timerBase, maxErrors) {
    const g = new THREE.Group();
    const Y = 3.12;
    const banda = new THREE.Mesh(new THREE.BoxGeometry(AMPLE - 0.55, 1.72, 0.03), M.banda); banda.position.set(0, Y + 0.09, 0.015); g.add(banda);
    const rotol = (text, x) => { const r = etiqueta(text, { alt: 0.2, color: '#cfd2cc' }); r.position.set(x, Y + 0.56, 0.06); g.add(r); };

    const peces = {
      serie(x) {
        rotol('Núm. de sèrie', x);
        const pl = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.66, 0.06), M.llauto); pl.position.set(x, Y - 0.04, 0.04); g.add(pl);
        const num = etiqueta(`${bomba.lletres}-${bomba.numero}`, { alt: 0.46, color: '#14120c', font: 'Barlow Condensed', pes: 700, senseLlum: false });
        num.position.set(x, Y - 0.04, 0.08); g.add(num);
        [[-0.8, 0.24], [0.8, 0.24], [-0.8, -0.24], [0.8, -0.24]].forEach(([dx, dy]) => { const r = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.reblo); r.position.set(x + dx, Y + dy - 0.04, 0.08); g.add(r); });
      },
      piles(x, { n }) {
        rotol('Piles', x);
        const am = 0.3 + n * 0.32;
        const bress = new THREE.Mesh(new THREE.BoxGeometry(am, 0.82, 0.08), M.acerFosc); bress.position.set(x, Y - 0.03, 0.02); g.add(bress);
        for (let i = 0; i < n; i++) {
          const px = x - (n - 1) * 0.16 + i * 0.32;
          const p = ple(new THREE.CylinderGeometry(0.115, 0.115, 0.56, 16), M.pila); p.position.set(px, Y - 0.08, 0.13); g.add(p);
          const c = ple(new THREE.CylinderGeometry(0.115, 0.115, 0.1, 16), M.llauto); c.position.set(px, Y + 0.24, 0.13); g.add(c);
          const t = ple(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), M.reblo); t.position.set(px, Y + 0.31, 0.13); g.add(t);
        }
      },
      indicador(x, { i }) {
        const ind = bomba.indicadors[i];
        rotol('Indicador', x);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshStandardMaterial({ color: ind.ences ? 0xfff0a0 : 0x2a2d2a, emissive: ind.ences ? 0xffdf70 : 0, emissiveIntensity: ind.ences ? 3 : 0, roughness: 0.3 }));
        led.material.userData.propi = true;
        led.position.set(x - 0.46, Y + 0.12, 0.06); g.add(led);
        const et = etiqueta(ind.etiqueta, { alt: 0.32, color: '#f1efe6', font: 'Barlow Condensed', pes: 700 }); et.position.set(x + 0.16, Y + 0.12, 0.05); g.add(et);
        const es = etiqueta(ind.ences ? 'encès' : 'apagat', { alt: 0.2, color: ind.ences ? '#ffe9a0' : '#9a9d97' }); es.position.set(x, Y - 0.27, 0.05); g.add(es);
        if (ind.ences) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.foc, color: 0xffdf70, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); gl.scale.setScalar(0.66); gl.position.copy(led.position).setZ(0.1); g.add(gl); }
      },
    };
    bomba.ranures.filter((r) => r.cara === cara).forEach((r) => peces[r.tipus](RANURES[r.ranura], r));

    // Temporitzador i errors, al mig. Les dues cares comparteixen la mateixa pantalla.
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.28, 0.2), M.acerFosc); caixa.position.set(0, Y - 0.02, 0.08); g.add(caixa);
    const timer = cara === 0 ? timerBase : new THREE.Mesh(timerBase.geometry, timerBase.material);
    timer.userData.senseOmbra = true;
    timer.position.set(-0.5, Y - 0.02, 0.185); g.add(timer);
    const vidre = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.08), new THREE.MeshStandardMaterial({ color: 0x223, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.7 }));
    vidre.material.userData.propi = true;
    vidre.position.set(-0.5, Y - 0.02, 0.2); vidre.userData.senseOmbra = true; g.add(vidre);
    const re = etiqueta('Errors', { alt: 0.18, color: '#cfd2cc' }); re.position.set(1.5, Y + 0.36, 0.19); g.add(re);
    // Tants llums com errors aguanta la bomba: quan s'encenen tots, peta.
    const errors = Array.from({ length: maxErrors }, (_, i) => i).map((i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3a2320, emissive: 0xff2010, emissiveIntensity: 0, roughness: 0.25 }));
      m.material.userData.propi = true; m.scale.z = 0.6; m.userData.i = i;
      m.position.set(1.5 + (i - (maxErrors - 1) / 2) * 0.34, Y + 0.02, 0.2); g.add(m);
      return m;
    });
    const rv = etiqueta(`Regles v${versio}`, { alt: 0.15, color: '#8e918b' }); rv.position.set(1.5, Y - 0.38, 0.19); g.add(rv);
    return { grup: g, timer, errors };
  }

  function creaTimer() {
    const c = document.createElement('canvas'); c.width = 560; c.height = 208;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.08), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }));
    m.material.userData.propi = true; m.userData.senseOmbra = true;
    const SEG = { a: [[8, 2], [48, 2], [40, 12], [16, 12]], b: [[50, 5], [50, 40], [41, 35], [41, 14]], c: [[50, 44], [50, 79], [41, 70], [41, 49]], d: [[8, 82], [48, 82], [40, 72], [16, 72]], e: [[6, 44], [6, 79], [15, 70], [15, 49]], f: [[6, 5], [6, 40], [15, 35], [15, 14]], g: [[9, 42], [17, 37], [39, 37], [47, 42], [39, 47], [17, 47]] };
    const XF = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
    const llum = c.getContext('2d');
    m.userData.dibuixa = (text, vermell) => {
      // Desactivada: el visor es queda fix i en verd.
      const verd = m.userData.verd;
      const color = verd ? '#35ff77' : vermell ? '#ff2a14' : '#ffae12';
      const fantasma = verd ? '#062a10' : vermell ? '#2c0a05' : '#2a1d08';
      llum.fillStyle = '#080604'; llum.fillRect(0, 0, c.width, c.height);
      const [mm, ss] = text.split(':');
      const xifres = [mm.slice(-1), ss[0], ss[1]];
      const pos = [50, 225, 375]; const esc = 2.14;
      xifres.forEach((x, i) => {
        Object.entries(SEG).forEach(([k, pts]) => {
          const on = (x === '-' ? 'g' : x === ' ' ? '' : XF[Number(x)]).includes(k); // «-»: el visor en espera de la portada; « »: apagat
          llum.fillStyle = on ? color : fantasma;
          llum.shadowColor = on ? color : 'transparent'; llum.shadowBlur = on ? 18 : 0;
          llum.beginPath();
          pts.forEach(([px, py], n) => { const X = pos[i] + px * esc; const Y = 15 + py * esc; if (n) llum.lineTo(X, Y); else llum.moveTo(X, Y); });
          llum.closePath(); llum.fill();
        });
      });
      llum.fillStyle = color; llum.shadowColor = color; llum.shadowBlur = 18;
      [72, 136].forEach((y) => { llum.beginPath(); llum.arc(190, y, 9, 0, 6.3); llum.fill(); });
      llum.shadowBlur = 0;
      tx.needsUpdate = true;
    };
    m.userData.dibuixa('0:00', false);
    return m;
  }
}

function rectArrod(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2; const y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function creaTexturesFoc() {
  const fes = (mida, parades) => {
    const c = document.createElement('canvas'); c.width = c.height = mida;
    const x = c.getContext('2d'); const g = x.createRadialGradient(mida / 2, mida / 2, 0, mida / 2, mida / 2, mida / 2);
    parades.forEach(([p, col]) => g.addColorStop(p, col));
    x.fillStyle = g; x.fillRect(0, 0, mida, mida);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return { t, x, c };
  };
  const foc = fes(128, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]).t;
  const fum = fes(128, [[0, 'rgba(255,255,255,.9)'], [0.55, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
  for (let i = 0; i < 220; i++) { fum.x.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; fum.x.globalCompositeOperation = 'destination-out'; fum.x.beginPath(); fum.x.arc(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 9, 0, 6.3); fum.x.fill(); }
  const espurna = fes(32, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]).t;
  return { foc, fum: fum.t, espurna };
}
