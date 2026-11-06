// Peces 3D dels mòduls. Afegir un mòdul nou és afegir una entrada a MODULS_3D.
import * as THREE from 'three';

const R = window.Curtcircuit;
export const W = 3.86; export const H = 2.86;

let M = null;
function soroll(mida, base, varia, ratlles) {
  const c = document.createElement('canvas'); c.width = c.height = mida;
  const x = c.getContext('2d');
  const d = x.createImageData(mida, mida);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = base + (Math.random() - 0.5) * varia;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  for (let i = 0; i < ratlles; i++) {
    x.strokeStyle = `rgba(${Math.random() < 0.6 ? '255,255,255' : '0,0,0'},${0.03 + Math.random() * 0.13})`;
    x.lineWidth = 0.5 + Math.random() * 1.6;
    x.beginPath(); const a = Math.random() * mida; const b = Math.random() * mida;
    x.moveTo(a, b); x.lineTo(a + (Math.random() - 0.5) * 170, b + (Math.random() - 0.5) * 170); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function materials() {
  if (M) return M;
  const r = soroll(512, 150, 60, 420); r.repeat.set(3, 2);
  const rp = soroll(256, 95, 80, 60); rp.repeat.set(9, 6);
  M = {
    acer: new THREE.MeshStandardMaterial({ color: 0x3a3e41, metalness: 0.82, roughness: 0.62, roughnessMap: r, bumpMap: r, bumpScale: 0.35 }),
    acerFosc: new THREE.MeshStandardMaterial({ color: 0x16181a, metalness: 0.7, roughness: 0.55 }),
    alumini: new THREE.MeshStandardMaterial({ color: 0xa9aba6, metalness: 0.2, roughness: 0.78, bumpMap: r, bumpScale: 0.1 }),
    tapa: new THREE.MeshStandardMaterial({ color: 0x2a2d2f, metalness: 0.85, roughness: 0.55, roughnessMap: r, bumpMap: r, bumpScale: 0.3 }),
    banda: new THREE.MeshStandardMaterial({ color: 0x1d1f21, metalness: 0.3, roughness: 0.82, bumpMap: r, bumpScale: 0.15 }),
    reblo: new THREE.MeshStandardMaterial({ color: 0x8c8f90, metalness: 1, roughness: 0.35 }),
    llauto: new THREE.MeshStandardMaterial({ color: 0x9c7a34, metalness: 0.75, roughness: 0.55, bumpMap: r, bumpScale: 0.06 }),
    pila: new THREE.MeshStandardMaterial({ color: 0x121213, metalness: 0.5, roughness: 0.38 }),
    coure: new THREE.MeshStandardMaterial({ color: 0xc77c3a, metalness: 1, roughness: 0.32 }),
    paret: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.96, bumpMap: rp, bumpScale: 0.8 }),
  };
  return M;
}

export function ple(geo, mat) { return new THREE.Mesh(geo, mat); }

// Text pintat sobre el metall.
export function etiqueta(text, { alt = 0.2, color = '#16181a', font = 'Barlow Condensed', pes = 700, senseLlum = true } = {}) {
  const c = document.createElement('canvas'); const x = c.getContext('2d');
  const px = 96; const f = `${pes} ${px}px "${font}", "Arial Narrow", sans-serif`;
  x.font = f;
  const am = Math.ceil(x.measureText(text).width) + 16;
  c.width = am; c.height = Math.ceil(px * 1.18);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: !senseLlum, depthWrite: false });
  mat.userData.propi = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alt * c.width / c.height, alt), mat);
  m.userData.senseOmbra = true;
  const pinta = (tx) => {
    x.clearRect(0, 0, c.width, c.height);
    x.font = f; x.fillStyle = color; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillText(tx, c.width / 2, c.height / 2 + 4);
    t.needsUpdate = true;
  };
  pinta(text);
  m.userData.pinta = pinta;
  return m;
}

function marc() {
  const g = new THREE.Group(); const Mt = materials();
  const s = new THREE.Shape();
  s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, H / 2); s.lineTo(-W / 2, H / 2); s.closePath();
  const b = 0.085; const f = new THREE.Path();
  f.moveTo(-W / 2 + b, -H / 2 + b); f.lineTo(-W / 2 + b, H / 2 - b); f.lineTo(W / 2 - b, H / 2 - b); f.lineTo(W / 2 - b, -H / 2 + b); f.closePath();
  s.holes.push(f);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), Mt.acerFosc);
  g.add(m);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, c]) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), Mt.reblo);
    r.rotation.x = Math.PI / 2; r.position.set(a * (W / 2 - 0.05), c * (H / 2 - 0.05), 0.13); g.add(r);
  });
  return g;
}

function base(mat) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, H - 0.1, 0.04), mat);
  p.position.z = 0.0; g.add(p);
  g.add(marc());
  return g;
}

function capModul(g, titol) {
  const t = etiqueta(titol, { alt: 0.25, color: '#14161a', senseLlum: true });
  const w = t.geometry.parameters.width;
  t.position.set(-W / 2 + 0.2 + w / 2, H / 2 - 0.27, 0.05); g.add(t);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ color: 0x3a3f3a, emissive: 0x25ff66, emissiveIntensity: 0, roughness: 0.25 }));
  led.material.userData.propi = true;
  led.position.set(W / 2 - 0.27, H / 2 - 0.27, 0.06); g.add(led);
  const fet = etiqueta('fet', { alt: 0.24, color: '#0b7a30' }); fet.visible = false;
  fet.position.set(W / 2 - 0.58, H / 2 - 0.27, 0.05); g.add(fet);
  g.userData.marcaFet = () => { led.material.emissiveIntensity = 3.5; led.material.color.set(0x35ff77); fet.visible = true; };
}

export function espaiBuit() {
  const g = base(materials().tapa);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, c]) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 6), materials().reblo);
    r.rotation.x = Math.PI / 2; r.position.set(a * (W / 2 - 0.38), c * (H / 2 - 0.38), 0.04); g.add(r);
  });
  return g;
}

/* ---------- Cables ---------- */
function creaCables(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Cables');
  const n = bomba.cables.length; const pas = Math.min(0.72, (W - 0.6) / n);
  const x0 = -pas * (n - 1) / 2;
  const dalt = 0.56; const baix = -0.8;
  const peces = [];
  const corba = (x, on, z0, z1, a, b) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, a, z0),
    new THREE.Vector3(x + on * 0.8, a + (b - a) * 0.33, z1),
    new THREE.Vector3(x - on * 0.8, a + (b - a) * 0.66, z1),
    new THREE.Vector3(x, b, z0),
  ]);
  bomba.cables.forEach((color, i) => {
    const x = x0 + i * pas; const on = i % 2 ? -0.1 : 0.1;
    const mat = new THREE.MeshStandardMaterial({ color: R.COLORS_CABLE[color], roughness: 0.42, metalness: 0.02, emissive: 0xffffff, emissiveIntensity: 0 });
    mat.userData.propi = true;
    const grup = new THREE.Group(); g.add(grup);
    const num = etiqueta(String(i + 1), { alt: 0.24, color: '#14161a' }); num.position.set(x, dalt + 0.27, 0.05); g.add(num);
    [dalt, baix].forEach((y) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), Mt.reblo); b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.08); g.add(b);
    });
    const nom = etiqueta(color, { alt: 0.24, color: '#14161a' }); nom.position.set(x, baix - 0.27, 0.05); g.add(nom);
    const sencer = () => {
      const c = corba(x, on, 0.12, 0.34, dalt, baix);
      grup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 44, 0.092, 12), mat));
    };
    const tallat = () => {
      while (grup.children.length) { const m = grup.children.pop(); m.geometry.dispose(); }
      const mig = (dalt + baix) / 2;
      const c1 = corba(x, on, 0.12, 0.3, dalt, mig + 0.13); const c2 = corba(x, on, 0.12, 0.3, mig - 0.13, baix);
      grup.add(new THREE.Mesh(new THREE.TubeGeometry(c1, 22, 0.092, 12), mat), new THREE.Mesh(new THREE.TubeGeometry(c2, 22, 0.092, 12), mat));
      [c1.getPoint(1), c2.getPoint(0)].forEach((p, k) => {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.13, 8), Mt.coure);
        f.position.copy(p); f.position.y += k ? 0.06 : -0.06; grup.add(f);
      });
      grup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    };
    sencer();
    peces.push({ x, y: (dalt + baix) / 2, w: pas * 0.92, h: dalt - baix + 0.2, mat, tallat });
  });
  g.userData.cables = peces;
  g.userData.realca = (i, si) => { peces[i].mat.emissiveIntensity = si ? 0.2 : 0; };
  g.userData.talla = (i) => peces[i].tallat();
  return g;
}

/* ---------- Botó ---------- */
function creaBoto(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Botó');
  const { color, paraula } = bomba.boto;
  const bx = -0.52; const by = -0.02;
  const anell = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.09, 14, 44), Mt.acerFosc); anell.position.set(bx, by, 0.1); g.add(anell);
  const fons = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.05, 44), Mt.acerFosc); fons.rotation.x = Math.PI / 2; fons.position.set(bx, by, 0.05); g.add(fons);

  const cap = new THREE.Group(); cap.position.set(bx, by, 0.08); g.add(cap);
  const perfil = [[0.72, 0], [0.7, 0.2], [0.62, 0.3], [0.46, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y));
  const mat = new THREE.MeshPhysicalMaterial({ color: R.COLORS_BOTO[color], roughness: 0.3, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  mat.userData.propi = true;
  const cos = new THREE.Mesh(new THREE.LatheGeometry(perfil, 44), mat); cos.rotation.x = Math.PI / 2; cap.add(cos);
  const txt = etiqueta(paraula, { alt: 0.5, color: color === 'groc' ? '#14161a' : '#ffffff' }); txt.position.z = 0.35;
  if (txt.geometry.parameters.width > 1.15) txt.scale.setScalar(1.15 / txt.geometry.parameters.width);
  cap.add(txt);
  const nomB = etiqueta(`botó ${color}`, { alt: 0.24, color: '#14161a' }); nomB.position.set(bx, by - 1.08, 0.05); g.add(nomB);

  // Llum
  const lx = 1.15; const ly = 0;
  const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.0, 8, 18), new THREE.MeshStandardMaterial({ color: 0x3b3f3c, emissive: 0, emissiveIntensity: 0, roughness: 0.25 }));
  tub.material.userData.propi = true; tub.position.set(lx, ly, 0.12); g.add(tub);
  const suport = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.02, 6, 18), Mt.acerFosc); suport.position.set(lx, ly, 0.05); suport.scale.z = 0.35; g.add(suport);
  const nomL = etiqueta('llum apagada', { alt: 0.24, color: '#14161a' }); nomL.scale.setScalar(0.9);
  nomL.position.set(lx, ly - 0.96, 0.05); g.add(nomL);
  const llumP = new THREE.PointLight(0xffffff, 0, 3.2, 1.6); llumP.position.set(lx, ly, 0.6); g.add(llumP);
    g.userData.boto = { x: bx, y: by, w: 1.8, h: 1.8 };
  let objectiu = 0; let z = 0;
  g.userData.prem = (si) => { objectiu = si ? -0.15 : 0; };
  g.userData.llum = (hex, nom) => {
    if (hex) {
      tub.material.color.set(0x000000); tub.material.emissive.set(hex); tub.material.emissiveIntensity = 1; tub.material.toneMapped = false; tub.material.needsUpdate = true;
      llumP.color.set(hex); llumP.intensity = 2.5;
    } else {
      tub.material.color.set(0x3b3f3c); tub.material.emissiveIntensity = 0; tub.material.toneMapped = true; tub.material.needsUpdate = true; llumP.intensity = 0;
    }
    nomL.userData.pinta(nom);
  };
  g.userData.anima = (dt) => { z += (objectiu - z) * Math.min(1, dt * 28); cap.position.z = 0.08 + z; };
  return g;
}

export const MODULS_3D = { cables: creaCables, boto: creaBoto };
