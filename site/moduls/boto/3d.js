// Botó en 3D.
import * as THREE from 'three';
import { base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;

export function crea3D(bomba) {
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
