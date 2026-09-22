import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Raycaster, Vector3, Scene, FrontSide } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createCabin } from '../public/cabin.js';
import { createOperations } from '../public/operations-3d.js';
import { requiresModel } from './asset-fixture.mjs';

async function fixture() {
  const bytes = await readFile(new URL('../public/models/juniper.glb', import.meta.url));
  return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}
function hitMaterial(mesh, origin, direction) {
  mesh.updateMatrixWorld(true);
  const hits = new Raycaster(new Vector3(...origin), new Vector3(...direction)).intersectObject(mesh, false);
  assert.ok(hits.length, 'reference ray must hit ' + mesh.name);
  return Array.isArray(mesh.material) ? mesh.material[hits[0].face.materialIndex] : mesh.material;
}
function triangles(geometry) {
  const result = [], index = geometry.index;
  for (let i = 0; i < index.count; i += 3) result.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)].join(','));
  return result.sort();
}

test('front windows reveal the cabin while rear privacy glass and mirrors remain distinct', requiresModel, async () => {
  const car = await fixture(), rig = createCabin(car), panes = car.getObjectByName('Plane011_Mesh009');
  const front = hitMaterial(panes, [-1.1, 1.3, -.2], [1, 0, 0]);
  const rear = hitMaterial(panes, [-1.1, 1.3, .9], [1, 0, 0]);
  const windshield = hitMaterial(panes, [0, 1.3, -2], [0, 0, 1]);
  assert.equal(front, rig.frontGlass); assert.equal(windshield, front);
  assert.ok(front.transparent && front.opacity < .4, 'front glass must transmit more of the cabin than it masks');
  assert.ok(rear.opacity > front.opacity + .25, 'rear privacy glass must retain its darker tint');
  assert.ok(rig.roofGlass.opacity > rear.opacity);
  assert.equal(front.transmission, 0, 'glass should not require a second scene-rendering pass');
  assert.equal(front.side, FrontSide, 'the shell already has inner and outer surfaces; do not draw each twice');
  assert.equal(rig.roofGlass.side, FrontSide, 'the roof must not expose unsorted inner shell faces');
  assert.equal(panes.castShadow, false, 'glass must not cast an opaque cabin-covering shadow');
  const mirror = car.getObjectByName('Plane050_Mesh036').material;
  assert.equal(mirror.transparent, false); assert.equal(mirror.metalness, 1);
});

test('replacement white cabin removes incompatible source islands without changing exterior geometry', requiresModel, async () => {
  const car = await fixture(), interior = car.getObjectByName('Interior_Mesh042');
  const geometry = interior.geometry, originalTriangles = triangles(geometry), positions = Array.from(geometry.attributes.position.array);
  const rig = createCabin(car);
  const retained = triangles(interior.geometry), source = new Set(originalTriangles);
  assert.ok(retained.every(triangle => source.has(triangle)), 'retained cabin geometry must come from the original seats and trim');
  assert.ok(retained.length < originalTriangles.length, 'the conventional dashboard, old wheel and gear lever must be removed');
  assert.deepEqual(Array.from(interior.geometry.attributes.position.array), positions, 'retained source vertex buffer is unchanged; replacements live in separate meshes');
  for (const x of [-.4, .4]) {
    const seat=car.getObjectByName(x<0?'front-left-seat':'front-right-seat');
    assert.equal(seat.getObjectByName('white-headrest').material,rig.seats.white);
    assert.equal(seat.getObjectByName('seat-cushion-perforated-panel').material,rig.seats.inset);
  }
  assert.ok(car.getObjectByName('steering-horn-pad').material.color.r < .1, 'replacement steering wheel must remain dark');
  assert.ok(car.getObjectByName('dashboard-upper').material.color.r < .1, 'replacement dashboard must remain dark');
});

test('leaving the energy exercise restores cabin materials and transparent-glass shadow settings', requiresModel, async () => {
  const car = await fixture(), scene = new Scene(); scene.add(car);
  createCabin(car);
  const panes = car.getObjectByName('Plane011_Mesh009'), interior = car.getObjectByName('Interior_Mesh042');
  const paneMaterials = panes.material, seatMaterials = interior.material;
  const ops = createOperations(scene, car);
  ops.show({ kind: 'regen', phase: 'lift' }, true); ops.show(null, true);
  assert.equal(panes.material, paneMaterials); assert.equal(interior.material, seatMaterials);
  assert.equal(panes.castShadow, false);
  assert.ok(panes.material[0].transparent && panes.material[0].opacity < .4);
});
