import * as THREE from "../../vendor/three/three.module.js";
import { CFG } from "../config.js";

/* ============================================================
   Konsept maket.

   Gerçek GLB yoksa (dosya eklenmemiş, internet/CORS engeli,
   zaman aşımı) sahne asla boş kalmaz: marka rengiyle boyanmış
   sade bir silüet gösterilir. Dönen arayüz aynıdır — jant
   dönüşü, far/stop/sinyal ve kamera odakları çalışır.
   ============================================================ */

function emissive(color, power) {
  const m = new THREE.MeshStandardMaterial({
    color: 0x101319, emissive: color, emissiveIntensity: power,
    metalness: 0.2, roughness: 0.35,
  });
  m.userData.baseEmissive = new THREE.Color(color);
  m.userData.basePower = power;
  m.toneMapped = false;
  return m;
}

export function buildConceptCar(brand) {
  const accent = brand.accentHex;
  const L = 4.5, W = 1.86;

  const paint = new THREE.MeshStandardMaterial({ color: 0x2b3446, metalness: 0.8, roughness: 0.16 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0d1119, metalness: 0.2, roughness: 0.06, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.0, roughness: 0.95 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xc9cfdb, metalness: 0.95, roughness: 0.22 });
  const caliper = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.4, roughness: 0.4 });

  const outer = new THREE.Group();
  const root = new THREE.Group();
  outer.add(root);

  /* gövde profili (ZY düzlemi), ön +Z */
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0.30);
  s.lineTo(-L / 2 - 0.04, 0.62);
  s.quadraticCurveTo(-L / 2 + 0.06, 0.86, -L / 2 + 0.62, 0.90);
  s.lineTo(-1.28, 0.94);
  s.quadraticCurveTo(-0.62, 1.40, 0.02, 1.42);
  s.lineTo(0.66, 1.40);
  s.quadraticCurveTo(1.02, 0.98, 1.30, 0.92);
  s.lineTo(L / 2 - 0.30, 0.86);
  s.quadraticCurveTo(L / 2 + 0.02, 0.80, L / 2 + 0.02, 0.58);
  s.lineTo(L / 2 - 0.02, 0.30);
  s.quadraticCurveTo(0, 0.22, -L / 2, 0.30);

  const bodyGeo = new THREE.ExtrudeGeometry(s, {
    depth: W - 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1, steps: 1,
  });
  bodyGeo.rotateY(-Math.PI / 2);
  bodyGeo.translate((W - 0.22) / 2, 0, 0);
  const body = new THREE.Mesh(bodyGeo, paint);
  root.add(body);

  /* cam kabin */
  const g = new THREE.Shape();
  g.moveTo(-1.24, 0.96);
  g.quadraticCurveTo(-0.60, 1.38, 0.02, 1.40);
  g.lineTo(0.62, 1.38);
  g.quadraticCurveTo(0.90, 1.02, 1.10, 0.96);
  g.lineTo(-1.24, 0.96);
  const glassGeo = new THREE.ExtrudeGeometry(g, { depth: W - 0.36, bevelEnabled: false });
  glassGeo.rotateY(-Math.PI / 2);
  glassGeo.translate((W - 0.36) / 2, 0, 0);
  root.add(new THREE.Mesh(glassGeo, glass));

  /* şasi eteği */
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.06, L * 0.86), new THREE.MeshStandardMaterial({ color: 0x11151d, metalness: 0.6, roughness: 0.4 }));
  skirt.position.set(0, 0.30, 0);
  root.add(skirt);

  /* jantlar */
  const wheelNodes = [];
  const tyreGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.27, 20);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.29, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.31, 8);
  capGeo.rotateZ(Math.PI / 2);

  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (pos) {
    const wg = new THREE.Group();
    wg.add(new THREE.Mesh(tyreGeo, tyre));
    wg.add(new THREE.Mesh(rimGeo, rim));
    wg.add(new THREE.Mesh(capGeo, caliper));
    wg.position.set(pos[1] * (W / 2 - 0.14), 0.34, pos[0] * (L / 2 - 0.82));
    wg.name = (pos[0] > 0 ? "wheel_ft_" : "wheel_bk_") + (pos[1] > 0 ? "l" : "r");
    root.add(wg);
    wheelNodes.push(wg);
  });

  /* ışıklar */
  const low = emissive(0xfff3d6, 0);
  const drl = emissive(0xeaf2ff, 1.7);
  const brake = emissive(0xff2617, 0);
  const sigL = emissive(0xff8a1e, 0);
  const sigR = emissive(0xff8a1e, 0);

  const headGeo = new THREE.BoxGeometry(0.42, 0.13, 0.10);
  const tailGeo = new THREE.BoxGeometry(0.44, 0.11, 0.09);
  const blinkerGeo = new THREE.BoxGeometry(0.10, 0.07, 0.06);

  const lights = { low: [], high: [], drl: [], glow: [], brake: [], reverse: [], signalL: [], signalR: [] };

  [1, -1].forEach(function (side) {
    const h = new THREE.Mesh(headGeo, low);
    h.position.set(side * (W / 2 - 0.42), 0.80, L / 2 - 0.06);
    root.add(h);
    lights.low.push(h);

    const t = new THREE.Mesh(tailGeo, brake);
    t.position.set(side * (W / 2 - 0.42), 0.84, -L / 2 + 0.03);
    root.add(t);
    lights.brake.push(t);

    const d = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.06), drl);
    d.position.set(side * (W / 2 - 0.46), 0.68, L / 2 - 0.05);
    root.add(d);
    lights.drl.push(d);

    const bl = new THREE.Mesh(blinkerGeo, side > 0 ? sigL : sigR);
    bl.position.set(side * (W / 2 - 0.02), 0.80, L / 2 - 0.30);
    root.add(bl);
    if (side > 0) lights.signalL.push(bl); else lights.signalR.push(bl);
  });

  const box = new THREE.Box3().setFromObject(outer);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  return {
    object: outer,
    inner: root,
    concept: true,
    parts: {
      paint: [body], glass: [], rim: [], tyre: [], interior: [], body: [body],
      lights: lights,
    },
    materials: [paint, glass, tyre, rim, caliper, low, drl, brake, sigL, sigR],
    wheels: wheelNodes.map(function (n) {
      const b = new THREE.Box3().setFromObject(n);
      const c = b.getCenter(new THREE.Vector3());
      return { node: n, axis: new THREE.Vector3(1, 0, 0), radius: 0.34, center: c, front: /ft/.test(n.name) };
    }),
    size: size,
    center: center,
    front: new THREE.Vector3(0, 0, 1),
    spin: CFG.motion.wheelSpinIdle,
  };
}
