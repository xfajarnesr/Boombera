// Memòria en 3D: una pantalla de xifres vermelles i quatre tecles metàl·liques en fila.
import * as THREE from 'three';
import { H, base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;

export function crea3D() {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Memòria');

  const leds = Array.from({ length: R.MEMORIA.etapes }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2c302c, emissive: 0x25ff66, emissiveIntensity: 0, roughness: 0.3 }));
    m.material.userData.propi = true;
    m.position.set(-0.42 + i * 0.25, H / 2 - 0.27, 0.05); g.add(m);
    return m;
  });

  // Pantalla
  const py = 0.36;
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.9, 0.1), Mt.acerFosc); caixa.position.set(0, py, 0.06); g.add(caixa);
  const fons = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.72), new THREE.MeshBasicMaterial({ color: 0x080302 }));
  fons.material.userData.propi = true; fons.userData.senseOmbra = true; fons.position.set(0, py, 0.115); g.add(fons);
  const xifra = etiqueta('8', { alt: 0.78, color: '#ff3a20' }); xifra.position.set(0, py, 0.125); g.add(xifra);

  // Tecles
  const pas = 0.9; const ky = -0.66; const costat = 0.76;
  const tecles = [0, 1, 2, 3].map((i) => {
    const x = (i - 1.5) * pas;
    const fonsK = new THREE.Mesh(new THREE.BoxGeometry(costat + 0.1, costat + 0.1, 0.05), Mt.acerFosc); fonsK.position.set(x, ky, 0.04); g.add(fonsK);
    const tapa = new THREE.Group(); tapa.position.set(x, ky, 0.06); g.add(tapa);
    const cos = new THREE.Mesh(new THREE.BoxGeometry(costat, costat, 0.16), Mt.tapa); cos.position.z = 0.06; tapa.add(cos);
    const txt = etiqueta('8', { alt: 0.62, color: '#ffffff' }); txt.position.z = 0.15; tapa.add(txt);
    const num = etiqueta(String(i + 1), { alt: 0.2, color: '#14161a' }); num.position.set(x, ky - 0.54, 0.05); g.add(num);
    return { x, y: ky, w: costat, h: costat, tapa, txt, z: 0 };
  });

  g.userData.tecles = tecles;
  g.userData.etapa = (e) => { leds.forEach((m, i) => { m.material.emissiveIntensity = i < e ? 3 : 0; }); };
  g.userData.mostra = (pantalla, ordre, e) => {
    xifra.userData.pinta(String(pantalla));
    tecles.forEach((k, i) => k.txt.userData.pinta(String(ordre[i])));
    g.userData.etapa(e);
  };
  g.userData.prem = (i) => { tecles[i].z = -0.09; };
  g.userData.anima = (dt) => {
    tecles.forEach((k) => { k.z += (0 - k.z) * Math.min(1, dt * 9); k.tapa.position.z = 0.06 + k.z; });
  };
  return g;
}
