// Seqüència en 3D: una lent gruixuda i quatre tecles de color.
import * as THREE from 'three';
import { W, H, base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;

export function crea3D(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Seqüència');

  // Ledets de ronda
  const leds = R.SEQUENCIA.rondes.map((_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2c302c, emissive: 0x25ff66, emissiveIntensity: 0, roughness: 0.3 }));
    m.material.userData.propi = true;
    m.position.set(-0.28 + i * 0.25, H / 2 - 0.27, 0.05); g.add(m);
    return m;
  });

  // Lent
  const lx = -0.92; const ly = 0.0;
  const anell = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.1, 14, 44), Mt.acerFosc); anell.position.set(lx, ly, 0.1); g.add(anell);
  const lent = new THREE.Mesh(new THREE.SphereGeometry(0.64, 36, 18), new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.18, metalness: 0.2 }));
  lent.material.userData.propi = true; lent.scale.z = 0.38; lent.position.set(lx, ly, 0.08); g.add(lent);
  const llum = new THREE.PointLight(0xffffff, 0, 3.4, 1.6); llum.position.set(lx, ly, 0.7); g.add(llum);
  const nom = etiqueta('senyal apagat', { alt: 0.25, color: '#14161a' }); nom.position.set(lx, ly - 0.98, 0.05); g.add(nom);

  // Tecles, en una posició diferent a cada bomba
  const tecles = bomba.sequencia.tecles.map((color, i) => {
    const costat = 0.84;
    const x = 0.42 + (i % 2) * 0.95; const y = 0.32 - Math.floor(i / 2) * 0.98;
    const tapa = new THREE.Group(); tapa.position.set(x, y, 0.06); g.add(tapa);
    const fons = new THREE.Mesh(new THREE.BoxGeometry(costat + 0.1, costat + 0.1, 0.05), Mt.acerFosc); fons.position.set(x, y, 0.04); g.add(fons);
    const mat = new THREE.MeshStandardMaterial({ color: R.COLORS_BOTO[color], roughness: 0.42, metalness: 0.05 });
    mat.userData.propi = true;
    const cos = new THREE.Mesh(new THREE.BoxGeometry(costat, costat, 0.16), mat); cos.position.z = 0.06; tapa.add(cos);
    const txt = etiqueta(color, { alt: 0.3, color: color === 'groc' ? '#14161a' : '#ffffff' }); txt.position.z = 0.15;
    const ample = txt.geometry.parameters.width;
    if (ample > costat - 0.06) txt.scale.setScalar((costat - 0.06) / ample);
    tapa.add(txt);
    return { color, x, y, w: costat, h: costat, tapa, z: 0 };
  });

  g.userData.tecles = tecles;
  g.userData.senyal = (color) => {
    if (color) {
      const hex = R.LLUMS[color].hex;
      lent.material.color.set(0x000000); lent.material.emissive.set(hex); lent.material.emissiveIntensity = 1; lent.material.toneMapped = false; lent.material.needsUpdate = true;
      llum.color.set(hex); llum.intensity = 3;
      nom.userData.pinta(`senyal ${color}`);
    } else {
      lent.material.color.set(0x24282a); lent.material.emissiveIntensity = 0; lent.material.toneMapped = true; lent.material.needsUpdate = true;
      llum.intensity = 0;
      nom.userData.pinta('senyal apagat');
    }
  };
  g.userData.ronda = (n) => { leds.forEach((m, i) => { m.material.emissiveIntensity = i < n ? 3 : 0; }); };
  g.userData.prem = (i) => { tecles[i].z = -0.09; };
  g.userData.anima = (dt) => {
    tecles.forEach((k) => { k.z += (0 - k.z) * Math.min(1, dt * 9); k.tapa.position.z = 0.06 + k.z; });
  };
  return g;
}
