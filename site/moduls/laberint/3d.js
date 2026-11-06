// Laberint en 3D: un vidre fosc amb 36 punts, coordenades gravades, la llum blanca i dues marques en rombe.
import * as THREE from 'three';
import { base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;
const N = R.LABERINT.costat;

function fletxa(mat) {
  const s = new THREE.Shape();
  s.moveTo(-0.15, -0.1); s.lineTo(0.15, -0.1); s.lineTo(0, 0.13); s.closePath();
  return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }), mat);
}

export function crea3D(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Laberint');
  const L = R.LABERINTS[bomba.laberint.idx];
  const pas = 0.3; const cx = -0.55; const cy = -0.3;
  const pos = (x, y) => [cx + (x - (N - 1) / 2) * pas, cy + (y - (N - 1) / 2) * pas];

  const vidre = new THREE.Mesh(new THREE.BoxGeometry(N * pas + 0.12, N * pas + 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0x07090a, roughness: 0.15, metalness: 0.4 }));
  vidre.material.userData.propi = true; vidre.position.set(cx, cy, 0.04); g.add(vidre);
  const matPunt = new THREE.MeshStandardMaterial({ color: 0x3b4146, roughness: 0.5 }); matPunt.userData.propi = true;
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
    const [px, py] = pos(x, y);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matPunt); p.position.set(px, py, 0.075); g.add(p);
  }
  // Coordenades: lletres a dalt, números a l'esquerra.
  for (let i = 0; i < N; i++) {
    const [px] = pos(i, 0); const [, py] = pos(0, i);
    const l = etiqueta(R.LABERINT.columnes[i], { alt: 0.2 }); l.position.set(px, cy + (N / 2) * pas + 0.16, 0.05); g.add(l);
    const n = etiqueta(String(i + 1), { alt: 0.2 }); n.position.set(cx - (N / 2) * pas - 0.16, py, 0.05); g.add(n);
  }
  const matMarca = new THREE.MeshBasicMaterial({ color: 0xffb52e, toneMapped: false }); matMarca.userData.propi = true;
  L.marques.forEach((m) => {
    const [px, py] = pos(...R.casella(m));
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.025, 6, 4), matMarca);
    r.userData.senseOmbra = true; r.position.set(px, py, 0.08); g.add(r);
  });
  const matLlum = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }); matLlum.userData.propi = true;
  const llum = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10), matLlum); llum.userData.senseOmbra = true; g.add(llum);
  const halo = new THREE.PointLight(0xdfeaff, 1.2, 0.8, 2); g.add(halo);

  // Creu de fletxes
  const fx = 1.12; const fy = -0.3; const d = 0.5; const costat = 0.42;
  const fletxes = {};
  [['amunt', 0, 1, 0], ['avall', 0, -1, Math.PI], ['esquerra', -1, 0, Math.PI / 2], ['dreta', 1, 0, -Math.PI / 2]].forEach(([dir, dx, dy, rot]) => {
    const x = fx + dx * d; const y = fy + dy * d;
    const fons = new THREE.Mesh(new THREE.BoxGeometry(costat + 0.06, costat + 0.06, 0.05), Mt.acerFosc); fons.position.set(x, y, 0.04); g.add(fons);
    const tapa = new THREE.Group(); tapa.position.set(x, y, 0.06); g.add(tapa);
    const cos = new THREE.Mesh(new THREE.BoxGeometry(costat, costat, 0.1), Mt.tapa); cos.position.z = 0.03; tapa.add(cos);
    const f = fletxa(Mt.reblo); f.rotation.z = rot; f.position.z = 0.08; tapa.add(f);
    fletxes[dir] = { x, y, w: costat, h: costat, tapa, z: 0 };
  });
  const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 16), Mt.reblo); centre.rotation.x = Math.PI / 2; centre.position.set(fx, fy, 0.06); g.add(centre);

  g.userData.fletxes = fletxes;
  g.userData.posa = ([x, y]) => { const [px, py] = pos(x, y); llum.position.set(px, py, 0.1); halo.position.set(px, py, 0.35); };
  g.userData.prem = (dir) => { fletxes[dir].z = -0.06; };
  g.userData.anima = (dt) => {
    Object.values(fletxes).forEach((k) => { k.z += (0 - k.z) * Math.min(1, dt * 9); k.tapa.position.z = 0.06 + k.z; });
  };
  g.userData.posa(bomba.laberint.inici);
  return g;
}
