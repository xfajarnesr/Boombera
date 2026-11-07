// Peces 3D comunes: materials, etiquetes i el marc que comparteixen tots els mòduls.
import * as THREE from 'three';

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
// Acer raspallat: ratlles fines horitzontals, amb alguna rascada que agafa la llum dura.
function raspallat(mida) {
  const c = document.createElement('canvas'); c.width = c.height = mida;
  const x = c.getContext('2d');
  for (let y = 0; y < mida; y++) {
    const v = 128 + (Math.random() - 0.5) * 70;
    x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, y, mida, 1);
  }
  for (let i = 0; i < mida * 3; i++) {
    const v = Math.random() < 0.5 ? 255 : 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.12})`;
    x.fillRect(Math.random() * mida, Math.random() * mida, 20 + Math.random() * 140, 1);
  }
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.15})`; x.lineWidth = 0.6 + Math.random();
    x.beginPath(); const a = Math.random() * mida; const b = Math.random() * mida;
    x.moveTo(a, b); x.lineTo(a + (Math.random() - 0.5) * 120, b + (Math.random() - 0.5) * 60); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function materials() {
  if (M) return M;
  const r = soroll(512, 150, 60, 420); r.repeat.set(3, 2);
  const rr = raspallat(512); rr.repeat.set(2, 3);
  const rp = soroll(256, 95, 80, 60); rp.repeat.set(9, 6);
  M = {
    // Blindatge: acer fosc raspallat. Les arestes bisellades del buc agafen la llum i retallen la silueta.
    acer: new THREE.MeshStandardMaterial({ color: 0x33373a, metalness: 0.86, roughness: 0.58, roughnessMap: rr, bumpMap: rr, bumpScale: 0.22 }),
    // Marcs dels mòduls: fosc i mat, perquè els colors de dins destaquin per contrast.
    acerFosc: new THREE.MeshStandardMaterial({ color: 0x121416, metalness: 0.55, roughness: 0.72 }),
    alumini: new THREE.MeshStandardMaterial({ color: 0xa9aba6, metalness: 0.2, roughness: 0.78, bumpMap: r, bumpScale: 0.1 }),
    tapa: new THREE.MeshStandardMaterial({ color: 0x2a2d2f, metalness: 0.85, roughness: 0.55, roughnessMap: r, bumpMap: r, bumpScale: 0.3 }),
    banda: new THREE.MeshStandardMaterial({ color: 0x1d1f21, metalness: 0.3, roughness: 0.82, bumpMap: r, bumpScale: 0.15 }),
    reblo: new THREE.MeshStandardMaterial({ color: 0x8c8f90, metalness: 1, roughness: 0.35 }),
    llauto: new THREE.MeshStandardMaterial({ color: 0x9c7a34, metalness: 0.75, roughness: 0.55, bumpMap: r, bumpScale: 0.06 }),
    pila: new THREE.MeshStandardMaterial({ color: 0x121213, metalness: 0.5, roughness: 0.38 }),
    coure: new THREE.MeshStandardMaterial({ color: 0xc77c3a, metalness: 1, roughness: 0.32 }),
    paret: new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.96, bumpMap: rp, bumpScale: 0.8 }),
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

export function base(mat) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, H - 0.1, 0.04), mat);
  p.position.z = 0.0; g.add(p);
  g.add(marc());
  return g;
}

export function capModul(g, titol) {
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
