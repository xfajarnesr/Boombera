// Cables amb ratlles en 3D: a sobre de cada cable un LED, a sota una placa amb una xifra.
import * as THREE from 'three';
import { W, base, capModul, etiqueta, materials } from '../../motor/peces.js';

const R = window.Curtcircuit;

// Textura del cable: el color de fons i, si en té, ratlles en espiral del segon color.
function textura(color, ratlla) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = R.COLORS_RATLLES[color]; x.fillRect(0, 0, 128, 64);
  if (ratlla) {
    x.fillStyle = R.COLORS_RATLLES[ratlla];
    // Franges amples i separades, perquè cada color es vegi sol i no es barregin en un altre.
    for (let k = -2; k < 3; k++) {
      x.beginPath();
      x.moveTo(k * 64, 0); x.lineTo(k * 64 + 30, 0); x.lineTo(k * 64 + 30 + 64, 64); x.lineTo(k * 64 + 64, 64); x.closePath(); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(ratlla ? 4 : 1, 1); t.anisotropy = 8;
  return t;
}

export function crea3D(bomba) {
  const Mt = materials(); const g = base(Mt.alumini); capModul(g, 'Cables amb ratlles');
  const { cables } = bomba.ratlles;
  const n = cables.length; const pas = Math.min(0.6, (W - 0.6) / n);
  const x0 = -pas * (n - 1) / 2;
  const dalt = 0.5; const baix = -0.72;
  const corba = (x, on, z0, z1, a, b) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, a, z0),
    new THREE.Vector3(x + on * 0.7, a + (b - a) * 0.33, z1),
    new THREE.Vector3(x - on * 0.7, a + (b - a) * 0.66, z1),
    new THREE.Vector3(x, b, z0),
  ]);
  const peces = [];
  cables.forEach((cable, i) => {
    const x = x0 + i * pas; const on = i % 2 ? -0.1 : 0.1;
    const mat = new THREE.MeshStandardMaterial({ map: textura(cable.color, cable.ratlla), roughness: 0.42, metalness: 0.02, emissive: 0xffffff, emissiveIntensity: 0 });
    mat.userData.propi = true;
    const grup = new THREE.Group(); g.add(grup);

    // LED
    const ledMat = new THREE.MeshStandardMaterial({ color: cable.led ? 0x000000 : 0x2c2f2e, emissive: 0xfff1c4, emissiveIntensity: cable.led ? 2.4 : 0, roughness: 0.25, toneMapped: !cable.led });
    ledMat.userData.propi = true;
    const coll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16), Mt.acerFosc); coll.rotation.x = Math.PI / 2; coll.position.set(x, dalt + 0.36, 0.05); g.add(coll);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), ledMat); led.position.set(x, dalt + 0.36, 0.09); g.add(led);
    if (cable.led) { const l = new THREE.PointLight(0xfff1c4, 0.6, 0.6, 2); l.position.set(x, dalt + 0.36, 0.3); g.add(l); }

    [dalt, baix].forEach((y) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 12), Mt.reblo); b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.08); g.add(b);
    });
    // Placa amb la xifra
    const placa = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.05), Mt.acerFosc); placa.position.set(x, baix - 0.32, 0.04); g.add(placa);
    const xifra = etiqueta(String(cable.xifra), { alt: 0.32, color: '#f2f2ec' }); xifra.position.set(x, baix - 0.32, 0.075); g.add(xifra);

    const sencer = () => {
      const c = corba(x, on, 0.12, 0.32, dalt, baix);
      grup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 44, 0.085, 12), mat));
    };
    const tallat = () => {
      while (grup.children.length) { const m = grup.children.pop(); m.geometry.dispose(); }
      const mig = (dalt + baix) / 2;
      const c1 = corba(x, on, 0.12, 0.28, dalt, mig + 0.12); const c2 = corba(x, on, 0.12, 0.28, mig - 0.12, baix);
      grup.add(new THREE.Mesh(new THREE.TubeGeometry(c1, 22, 0.085, 12), mat), new THREE.Mesh(new THREE.TubeGeometry(c2, 22, 0.085, 12), mat));
      [c1.getPoint(1), c2.getPoint(0)].forEach((p, k) => {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.038, 0.12, 8), Mt.coure);
        f.position.copy(p); f.position.y += k ? 0.06 : -0.06; grup.add(f);
      });
      grup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    };
    sencer();
    peces.push({ x, y: (dalt + baix) / 2, w: pas * 0.9, h: dalt - baix + 0.2, mat, tallat });
  });
  g.userData.cables = peces;
  g.userData.realca = (i, si) => { peces[i].mat.emissiveIntensity = si ? 0.2 : 0; };
  g.userData.talla = (i) => peces[i].tallat();
  return g;
}
