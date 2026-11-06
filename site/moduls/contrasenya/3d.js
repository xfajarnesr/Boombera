// Contrasenya en 3D: cinc tambors amb lletra ambre, fletxes d'acer i un botó d'enviar.
import * as THREE from 'three';
import { base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;
const C = R.CONTRASENYA;

function fletxa(mat, amunt) {
  const s = new THREE.Shape();
  const d = amunt ? 1 : -1;
  s.moveTo(-0.24, -0.11 * d); s.lineTo(0.24, -0.11 * d); s.lineTo(0, 0.13 * d); s.closePath();
  return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false }), mat);
}

export function crea3D() {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Contrasenya');
  const pas = 0.68; const yR = 0.16; const dy = 0.59; const radi = 0.34;

  const rodets = Array.from({ length: C.rodets }, (_, i) => {
    const x = (i - (C.rodets - 1) / 2) * pas;
    const finestra = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.05), Mt.acerFosc); finestra.position.set(x, yR, 0.04); g.add(finestra);
    const tambor = new THREE.Group(); tambor.position.set(x, yR, 0.05); g.add(tambor);
    const cil = new THREE.Mesh(new THREE.CylinderGeometry(radi, radi, 0.52, 28), new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.5, metalness: 0.3 }));
    cil.material.userData.propi = true; cil.rotation.z = Math.PI / 2; tambor.add(cil);
    const lletra = etiqueta('M', { alt: 0.56, color: '#ffb52e' }); lletra.position.z = radi + 0.012; tambor.add(lletra);
    const amunt = fletxa(Mt.acerFosc, true); amunt.position.set(x, yR + dy, 0.03); g.add(amunt);
    const avall = fletxa(Mt.acerFosc, false); avall.position.set(x, yR - dy, 0.03); g.add(avall);
    return { x, tambor, lletra, gir: 0 };
  });

  const yE = -1.03;
  const fonsE = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.05), Mt.acerFosc); fonsE.position.set(0, yE, 0.04); g.add(fonsE);
  const envia = new THREE.Group(); envia.position.set(0, yE, 0.06); g.add(envia);
  const matE = new THREE.MeshStandardMaterial({ color: 0x8e1712, roughness: 0.45, metalness: 0.1 }); matE.userData.propi = true;
  const cosE = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.12), matE); cosE.position.z = 0.04; envia.add(cosE);
  const txtE = etiqueta('ENVIA', { alt: 0.34, color: '#ffffff' }); txtE.position.z = 0.105; envia.add(txtE);
  let zE = 0;

  g.userData.fletxes = { dy, yR, w: 0.6, h: 0.32 };
  g.userData.rodets = rodets;
  g.userData.boto = { x: 0, y: yE, w: 2.4, h: 0.42 };
  g.userData.lletra = (i, l, sentit = 0) => { rodets[i].lletra.userData.pinta(l); rodets[i].gir = sentit * 0.8; };
  g.userData.envia = () => { zE = -0.07; };
  g.userData.anima = (dt) => {
    rodets.forEach((r) => { r.gir += (0 - r.gir) * Math.min(1, dt * 12); r.tambor.rotation.x = r.gir; });
    zE += (0 - zE) * Math.min(1, dt * 9); envia.position.z = 0.06 + zE;
  };
  return g;
}
