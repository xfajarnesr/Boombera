// Interruptors en 3D: un visor de dues xifres, cinc palanques metàl·liques i el botó FIXA.
import * as THREE from 'three';
import { base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;
const INCLINA = 0.7; // radiants: amunt o avall, que es vegi d'un cop d'ull

export function crea3D(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Interruptors');
  const n = R.INTERRUPTORS.palanques;

  // Visor de D
  const vx = -0.35; const vy = 0.58;
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.06), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 }));
  caixa.material.userData.propi = true; caixa.position.set(vx, vy, 0.04); g.add(caixa);
  const marcV = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.04), Mt.acerFosc); marcV.position.set(vx, vy, 0.02); g.add(marcV);
  const visor = etiqueta(String(bomba.interruptors.d), { alt: 0.52, color: '#ff3b30' }); visor.position.set(vx, vy, 0.08); g.add(visor);
  const nomD = etiqueta('D', { alt: 0.34, color: '#14161a' }); nomD.position.set(vx - 0.78, vy, 0.05); g.add(nomD);

  // Palanques
  const pas = 0.5; const x0 = -0.35 - pas * (n - 1) / 2; const py = -0.5;
  const placa = new THREE.Mesh(new THREE.BoxGeometry(pas * n + 0.1, 1.15, 0.04), Mt.acerFosc); placa.position.set(-0.35, py, 0.04); g.add(placa);
  const palanques = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * pas;
    const femella = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 6), Mt.reblo);
    femella.rotation.x = Math.PI / 2; femella.position.set(x, py, 0.1); g.add(femella);
    const coll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 16), Mt.acer);
    coll.rotation.x = Math.PI / 2; coll.position.set(x, py, 0.18); g.add(coll);
    const eix = new THREE.Group(); eix.position.set(x, py, 0.2); g.add(eix);
    const vareta = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.06, 0.52, 12), Mt.reblo);
    vareta.rotation.x = Math.PI / 2; vareta.position.z = 0.26; eix.add(vareta);
    const punta = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), Mt.reblo); punta.position.z = 0.53; eix.add(punta);
    // Ranures de guia, a dalt i a baix, perquè es vegi on pot anar la palanca.
    [1, -1].forEach((s) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 }));
      r.material.userData.propi = true; r.position.set(x, py + s * 0.4, 0.065); g.add(r);
    });
    palanques.push({ x, y: py, w: pas * 0.9, h: 1.05, eix, angle: 0, objectiu: 0 });
  }

  // Botó FIXA
  const fx = 1.42; const fy = -0.5;
  const coll = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 0.05), Mt.acerFosc); coll.position.set(fx, fy, 0.04); g.add(coll);
  const boto = new THREE.Group(); boto.position.set(fx, fy, 0.06); g.add(boto);
  const cos = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.13), Mt.reblo); cos.position.z = 0.05; boto.add(cos);
  const txt = etiqueta('FIXA', { alt: 0.24, color: '#14161a' }); txt.position.z = 0.12; boto.add(txt);
  let zB = 0;

  const posa = (i, amunt, immediat) => {
    const p = palanques[i]; p.objectiu = amunt ? -INCLINA : INCLINA;
    if (immediat) { p.angle = p.objectiu; p.eix.rotation.x = p.angle; }
  };
  bomba.interruptors.inici.forEach((a, i) => posa(i, a, true));

  g.userData.palanques = palanques;
  g.userData.boto = { x: fx, y: fy, w: 0.66, h: 0.5 };
  g.userData.posa = (i, amunt) => posa(i, amunt, false);
  g.userData.fixa = () => { zB = -0.08; };
  g.userData.anima = (dt) => {
    const k = Math.min(1, dt * 16);
    palanques.forEach((p) => { p.angle += (p.objectiu - p.angle) * k; p.eix.rotation.x = p.angle; });
    zB += (0 - zB) * Math.min(1, dt * 9); boto.position.z = 0.06 + zB;
  };
  return g;
}
