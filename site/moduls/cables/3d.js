// Cables en 3D.
import * as THREE from 'three';
import { W, base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;

export function crea3D(bomba) {
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
