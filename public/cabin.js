import * as T from 'three';
import { createCabinControls, isReplacedCabinPart } from './cabin-controls.js';
import { createCabinSeats, isReplacedSeat } from './cabin-seats.js';
import { createCabinTrim, isReplacedDoorTrim } from './cabin-trim.js';

// The source conversion merges the glazing into one mesh and the entire cabin
// into another. Remove incompatible connected islands before adding the
// reconstructed controls, seats and door trim. Coordinates are in metres.
function islands(geometry) {
  const p = geometry.attributes.position, index = geometry.index;
  const parent = Array.from({ length: p.count }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const join = (a, b) => { parent[find(a)] = find(b); };
  const welded = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e5)).join(',');
    if (welded.has(key)) join(i, welded.get(key)); else welded.set(key, i);
  }
  for (let i = 0; i < index.count; i += 3) {
    join(index.getX(i), index.getX(i + 1)); join(index.getX(i), index.getX(i + 2));
  }
  const result = new Map(), v = new T.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const key = find(index.getX(i));
    if (!result.has(key)) result.set(key, { bounds: new T.Box3(), triangles: [] });
    const island = result.get(key); island.triangles.push(i);
    for (let j = 0; j < 3; j++) island.bounds.expandByPoint(v.fromBufferAttribute(p, index.getX(i + j)));
  }
  return [...result.values()];
}

function assignSurfaces(mesh, materials, classify) {
  const source = mesh.geometry, buckets = materials.map(() => []);
  for (const island of islands(source)) {
    for (const triangle of island.triangles) {
      const material = classify(island.bounds, triangle, source);
      if (material < 0) continue;
      const bucket = buckets[material];
      for (let i = 0; i < 3; i++) bucket.push(source.index.getX(triangle + i));
    }
  }
  const geometry = source.clone();
  geometry.setIndex(buckets.flat()); geometry.clearGroups();
  let start = 0;
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].length) geometry.addGroup(start, buckets[i].length, i);
    start += buckets[i].length;
  }
  mesh.geometry = geometry; mesh.material = materials;
}

function softenUpholstery(geometry) {
  const p = geometry.attributes.position, normal = geometry.attributes.normal, grouped = new Map(), white = new Set();
  for (const group of geometry.groups) if (group.materialIndex === 1) {
    for (let i = group.start; i < group.start + group.count; i++) white.add(geometry.index.getX(i));
  }
  for (const i of white) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e5)).join(',');
    if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(i);
  }
  const original = normal.clone(), own = new T.Vector3(), other = new T.Vector3(), sum = new T.Vector3();
  for (const vertices of grouped.values()) for (const i of vertices) {
    own.fromBufferAttribute(original, i); sum.set(0, 0, 0);
    for (const j of vertices) { other.fromBufferAttribute(original, j); if (own.dot(other) > .5) sum.add(other); }
    sum.normalize(); normal.setXYZ(i, sum.x, sum.y, sum.z);
  }
  normal.needsUpdate = true;
}

function glazing(name, opacity, edgeOpacity, color) {
  const material = new T.MeshPhysicalMaterial({
    name, color, roughness: .075, metalness: 0, ior: 1.5,
    transparent: true, opacity, depthWrite: false,
    // These panes already have outward- and inward-facing shell surfaces.
    // Drawing both sides of each shell doubles the tint and exposes unsorted
    // inner polygons as dark patches on the roof during an orbit.
    side: T.FrontSide, envMapIntensity: .85,
  });
  // Reflections become stronger at grazing angles. Standard alpha blending
  // keeps the real cabin visible without a second scene/refraction pass.
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float windowFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
      float windowFresnel = pow(1.0 - windowFacing, 5.0);
      diffuseColor.a = mix(opacity, ${edgeOpacity.toFixed(3)}, windowFresnel);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => `cabin-glass-${edgeOpacity}`;
  return material;
}

export function createCabin(car) {
  const frontGlass = glazing('front_clear_glass', .24, .68, '#829397');
  const rearGlass = glazing('rear_privacy_glass', .66, .88, '#273038');
  const roofGlass = glazing('roof_tinted_glass', .93, .98, '#182126');
  const white = new T.MeshStandardMaterial({ name: 'white_upholstery', color: '#d9d6cf', roughness: .88, metalness: 0, envMapIntensity: .65 });
  const dark = new T.MeshStandardMaterial({ name: 'cabin_dark_trim', color: '#15191e', roughness: .9, metalness: 0 });
  const panes = car.getObjectByName('Plane011_Mesh009');
  const roof = car.getObjectByName('Plane023_Mesh067');
  const interior = car.getObjectByName('Interior_Mesh042');
  if (panes) {
    assignSurfaces(panes, [frontGlass, rearGlass], bounds => bounds.min.z > .3 ? 1 : 0);
    panes.castShadow = false; panes.receiveShadow = false;
  }
  if (roof) { roof.material = roofGlass; roof.castShadow = false; roof.receiveShadow = false; }
  if (interior) {
    assignSurfaces(interior, [dark, white], (bounds, triangle, geometry) => {
      if (isReplacedCabinPart(bounds)||isReplacedSeat(bounds)||isReplacedDoorTrim(bounds)) return -1;
      const { min, max } = bounds;
      const seat = min.y > .54 && max.y < 1.42 && min.z > -.56 && max.z > .02 && max.z < 1.38 &&
        (max.z > .45 || min.x > .09 || max.x < -.09);
      if (seat) return 1;
      // Door panels have a pale middle insert, with dark sills and upper rails.
      if ((max.x < -.63 || min.x > .63) && min.y < .3 && max.y > 1.1) {
        const p = geometry.attributes.position, i = geometry.index;
        const y = (p.getY(i.getX(triangle)) + p.getY(i.getX(triangle + 1)) + p.getY(i.getX(triangle + 2))) / 3;
        return y > .65 && y < 1.04 ? 1 : 0;
      }
      return 0;
    });
    softenUpholstery(interior.geometry);
  }
  // The same source material also labels the door mirrors as "glass". Mirrors
  // remain opaque reflectors when the windows become clear.
  const mirrors = car.getObjectByName('Plane050_Mesh036');
  if (mirrors) mirrors.material = new T.MeshStandardMaterial({ name: 'mirror_reflector', color: '#a8b1b9', roughness: .08, metalness: 1 });
  const controls = interior ? createCabinControls(car) : null;
  const seats=interior?createCabinSeats(car):null,trim=interior?createCabinTrim(car):null;
  return { frontGlass, rearGlass, roofGlass, white, dark, controls, seats, trim };
}
