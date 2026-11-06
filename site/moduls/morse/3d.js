// Senyal en 3D: una bombeta d'ambre darrere d'una reixeta, un visor de dues xifres vermelles i el botó TX.
import * as THREE from 'three';
import { base, capModul, etiqueta, materials } from '../../motor/peces.js';

function fletxa(mat, amunt) {
  const s = new THREE.Shape();
  const d = amunt ? 1 : -1;
  s.moveTo(-0.2, -0.09 * d); s.lineTo(0.2, -0.09 * d); s.lineTo(0, 0.11 * d); s.closePath();
  return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false }), mat);
}

export function crea3D() {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Senyal');

  // Bombeta
  const bx = -1.1; const by = -0.22;
  const anell = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 12, 40), Mt.acerFosc); anell.position.set(bx, by, 0.08); g.add(anell);
  const fons = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.04, 36), Mt.acerFosc); fons.rotation.x = Math.PI / 2; fons.position.set(bx, by, 0.03); g.add(fons);
  const matB = new THREE.MeshStandardMaterial({ color: 0x2a2116, roughness: 0.25, metalness: 0.1 }); matB.userData.propi = true;
  const bombeta = new THREE.Mesh(new THREE.SphereGeometry(0.46, 30, 16), matB); bombeta.scale.z = 0.5; bombeta.position.set(bx, by, 0.06); g.add(bombeta);
  [-0.3, -0.1, 0.1, 0.3].forEach((dy) => {
    const amp = 2 * Math.sqrt(0.54 * 0.54 - dy * dy);
    const barra = new THREE.Mesh(new THREE.BoxGeometry(amp, 0.045, 0.05), Mt.acerFosc); barra.position.set(bx, by + dy, 0.3); g.add(barra);
  });
  const llum = new THREE.PointLight(0xffa640, 0, 3.4, 1.6); llum.position.set(bx, by, 0.8); g.add(llum);

  // Visor de canal
  const vx = 0.47; const vy = -0.1; const sep = 0.56;
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.06), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 }));
  caixa.material.userData.propi = true; caixa.position.set(vx, vy, 0.04); g.add(caixa);
  const xifres = [0, 1].map((i) => {
    const x = vx + (i - 0.5) * sep;
    const t = etiqueta('0', { alt: 0.62, color: '#ff3b30' }); t.position.set(x, vy, 0.08); g.add(t);
    const amunt = fletxa(Mt.acerFosc, true); amunt.position.set(x, vy + 0.6, 0.03); g.add(amunt);
    const avall = fletxa(Mt.acerFosc, false); avall.position.set(x, vy - 0.6, 0.03); g.add(avall);
    return { x, t };
  });
  const rot = etiqueta('canal', { alt: 0.18 }); rot.position.set(vx, vy + 0.92, 0.05); g.add(rot);

  // Botó TX
  const tx = 1.5; const ty = -0.1;
  const coll = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 28), Mt.acerFosc); coll.rotation.x = Math.PI / 2; coll.position.set(tx, ty, 0.04); g.add(coll);
  const boto = new THREE.Group(); boto.position.set(tx, ty, 0.06); g.add(boto);
  const cos = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.14, 28), Mt.reblo); cos.rotation.x = Math.PI / 2; cos.position.z = 0.05; boto.add(cos);
  const txt = etiqueta('TX', { alt: 0.26, color: '#14161a' }); txt.position.z = 0.125; boto.add(txt);
  let zB = 0;

  g.userData.xifres = xifres.map(({ x }) => ({ x, yAmunt: vy + 0.6, yAvall: vy - 0.6, w: 0.48, h: 0.32 }));
  g.userData.boto = { x: tx, y: ty, w: 0.58, h: 0.58 };
  g.userData.canal = (n) => { const s = String(n).padStart(2, '0'); xifres.forEach((x, i) => x.t.userData.pinta(s[i])); };
  g.userData.llum = (ences) => {
    if (ences) { matB.color.set(0x000000); matB.emissive.set(0xffa640); matB.emissiveIntensity = 1.4; matB.toneMapped = false; llum.intensity = 3; }
    else { matB.color.set(0x2a2116); matB.emissiveIntensity = 0; matB.toneMapped = true; llum.intensity = 0; }
    matB.needsUpdate = true;
  };
  g.userData.envia = () => { zB = -0.08; };
  g.userData.anima = (dt) => { zB += (0 - zB) * Math.min(1, dt * 9); boto.position.z = 0.06 + zB; };
  return g;
}
