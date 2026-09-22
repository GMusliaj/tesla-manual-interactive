import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createRearLights} from '../public/rear-lights.js';
import {createOperations} from '../public/operations-3d.js';
import {requiresModel} from './asset-fixture.mjs';

async function fixture() {
 const bytes=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
 return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
}
test('rear-light adaptation preserves the recessed geometry and isolates lamp materials',requiresModel,async()=>{
 const car=await fixture(),geometry=new Map();
 car.traverse(mesh=>{if(mesh.isMesh)geometry.set(mesh,mesh.geometry);});
 const front=car.getObjectByName('Plane_Mesh002').material,frontColor=front.color.clone();
 const rig=createRearLights(car);rig.setNight(true);
 for(const [mesh,original]of geometry)assert.equal(mesh.geometry,original,'light adaptation must not cover or move '+mesh.name);
 assert.ok(front.color.equals(frontColor),'light switching must not change paint through a shared material');
 const lens=car.getObjectByName('Plane040_Mesh026').material;
 assert.ok(lens.transparent&&lens.opacity<1,'corner optics must remain visible through their cover');
 assert.equal(lens.emissive.getHex(),0,'housing must not become a luminous outline');
});
test('charging and energy exercises restore the corrected rear lenses and reflector',requiresModel,async()=>{
 const car=await fixture(),scene=new Scene();scene.add(car);
 const lights=createRearLights(car),ops=createOperations(scene,car);
 const names=['Plane034_Mesh021','Plane036_Mesh022','Plane040_Mesh026','Plane041_Mesh025'];
 const original=names.map(name=>{const mesh=car.getObjectByName(name);return{mesh,geometry:mesh.geometry,material:mesh.material,castShadow:mesh.castShadow};});
 for(const phase of ['open','charging','closed'])ops.show({kind:'charge',phase},true);
 for(const item of original)assert.equal(item.mesh.geometry,item.geometry,'closing must restore the original corner');
 ops.show({kind:'regen',phase:'lift'},true);lights.setNight(true);ops.show(null,true);
 for(const item of original){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.castShadow,item.castShadow,'clear cover must not turn opaque to shadows after the energy exercise');}
 assert.equal(car.getObjectByName('Plane036_Mesh022').material.emissiveIntensity,1,'night lighting survives a chapter change');
 lights.setNight(false);
 assert.equal(car.getObjectByName('Plane036_Mesh022').material.emissiveIntensity,0);
});
