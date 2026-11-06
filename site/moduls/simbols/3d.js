// Símbols en 3D: quatre plaques retroil·luminades, negre sobre os com el paper del manual.
import * as THREE from 'three';
import { base, capModul, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;

function textura(s) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#e9e2cc'; x.fillRect(0, 0, 256, 256);
  x.translate(28, 28); x.scale(2, 2);
  x.strokeStyle = '#000'; x.lineWidth = R.GRUIX_SIMBOL; x.lineCap = 'round'; x.lineJoin = 'round';
  x.stroke(new Path2D(s.d));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function crea3D(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Símbols');
  const pas = 0.9; const y = -0.2; const costat = 0.85;

  const plaques = bomba.simbols.plaques.map((id, i) => {
    const x = (i - (R.PLAQUES - 1) / 2) * pas;
    const marc = new THREE.Mesh(new THREE.BoxGeometry(costat + 0.07, costat + 0.07, 0.06), Mt.acerFosc); marc.position.set(x, y, 0.04); g.add(marc);
    const tapa = new THREE.Group(); tapa.position.set(x, y, 0.06); g.add(tapa);
    const cos = new THREE.Mesh(new THREE.BoxGeometry(costat, costat, 0.12), Mt.tapa); cos.position.z = 0.04; tapa.add(cos);
    const mat = new THREE.MeshBasicMaterial({ map: textura(R.simbol(id)), toneMapped: false });
    mat.userData.propi = true;
    const cara = new THREE.Mesh(new THREE.PlaneGeometry(costat - 0.02, costat - 0.02), mat);
    cara.userData.senseOmbra = true; cara.position.z = 0.105; tapa.add(cara);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2c302c, emissive: 0x25ff66, emissiveIntensity: 0, roughness: 0.3 }));
    led.material.userData.propi = true; led.position.set(x, y + 0.66, 0.05); g.add(led);
    return { id, x, y, w: costat, h: costat, tapa, led, z: 0 };
  });

  g.userData.plaques = plaques;
  g.userData.encerts = (posicions) => { plaques.forEach((k, i) => { k.led.material.emissiveIntensity = posicions.includes(i) ? 3 : 0; }); };
  g.userData.prem = (i) => { plaques[i].z = -0.06; };
  g.userData.anima = (dt) => {
    plaques.forEach((k) => { k.z += (0 - k.z) * Math.min(1, dt * 9); k.tapa.position.z = 0.06 + k.z; });
  };
  return g;
}
