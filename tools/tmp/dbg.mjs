import * as THREE from "../../vendor/three/three.module.js";
import { prepareCar } from "../../src/scene/car.js";

function unnamedModel(flip) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(190, 100, 440), new THREE.MeshStandardMaterial({ name: "TEX.001" }));
  body.position.y = 100; root.add(body);
  const s = flip ? -1 : 1;
  const frontLens = new THREE.Mesh(new THREE.BoxGeometry(60, 22, 12), new THREE.MeshStandardMaterial({ name: "TEX.013", emissive: new THREE.Color(0xff2a05) }));
  frontLens.position.set(0, 92, s * 220); root.add(frontLens);
  const rearLens = new THREE.Mesh(new THREE.BoxGeometry(70, 18, 12), new THREE.MeshStandardMaterial({ name: "TEX.010", emissive: new THREE.Color(0xff0000) }));
  rearLens.position.set(0, 96, -s * 220); root.add(rearLens);
  const tyreGeo = new THREE.CylinderGeometry(40, 40, 30, 12); tyreGeo.rotateZ(Math.PI / 2);
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function (c) {
    const g = new THREE.Group(); g.name = "Tire_" + (c[0] > 0 ? "F" : "B") + (c[1] > 0 ? "L" : "R");
    g.add(new THREE.Mesh(tyreGeo, new THREE.MeshStandardMaterial({ name: "TEX.020" })));
    g.position.set(c[1] * 95, 40, c[0] * 150); root.add(g);
  });
  const outer = new THREE.Group(); outer.add(root); return outer;
}
[false, true].forEach(function (flip) {
  const c = prepareCar(unnamedModel(flip));
  console.log("flip", flip, "rot", c.object.rotation.y.toFixed(3),
    "low", c.parts.lights.low.map(m=>m.name).join(","),
    "brake", c.parts.lights.brake.map(m=>m.name).join(","),
    "anchor", c.lightAnchor.z.toFixed(2), "sizeZ", c.size.z.toFixed(2));
});
