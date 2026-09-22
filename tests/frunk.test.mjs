import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {extractHood} from '../public/operations-3d.js';
import {createFrunk,FRUNK_OPEN_ANGLE} from '../public/frunk.js';
import {requiresModel} from './asset-fixture.mjs';

async function fixture(){
 const b=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
 const {scene:car}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const hood=extractHood(car.getObjectByName('Plane_Mesh002')),rig=createFrunk(car,hood);
 car.updateMatrixWorld(true);return {car,hood,rig};
}
test('frunk trim and fittings remain underneath the closed original hood',requiresModel,async()=>{
 const {car,hood,rig}=await fixture(),ray=new Raycaster(),down=new Vector3(0,-1,0);
 const failures=[];
 rig.root.traverseVisible(item=>{
  if(!item.isMesh)return;
  const p=item.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const point=new Vector3().fromBufferAttribute(p,i).applyMatrix4(item.matrixWorld);
   ray.set(new Vector3(point.x,3,point.z),down);
   const hit=ray.intersectObject(hood)[0];
   if(hit&&point.y>hit.point.y+.001)failures.push({name:item.name,excess:point.y-hit.point.y});
  }
 });
 assert.deepEqual(failures,[],'no cap, latch, support or trim should protrude through closed paint');
 rig.setCargo(true);car.updateMatrixWorld(true);
 assert.ok(car.getObjectByName('frunk-bag').visible);
});
test('open frunk has an unobstructed recessed floor inside the surrounding deck',requiresModel,async()=>{
 const {rig,car}=await fixture();rig.setAngle(FRUNK_OPEN_ANGLE);car.updateMatrixWorld(true);
 const down=new Vector3(0,-1,0);
 const floorRay=new Raycaster(new Vector3(0,2,-1.82),down);
 const visible=[];rig.root.traverseVisible(item=>{if(item.isMesh)visible.push(item);});
 const floor=floorRay.intersectObjects(visible,false)[0];
 const deck=new Raycaster(new Vector3(.595,2,-1.82),down).intersectObjects(visible,false)[0];
 assert.ok(floor,'the storage tub has a solid floor');
 assert.match(floor.object.name,/floor/);
 assert.ok(deck.point.y-floor.point.y>.30,'surround sits above a deep storage cavity');
 assert.ok(floor.point.y>.45&&floor.point.y<.55,'floor stays inside the nose, above the underbody');
 const throughHood=floorRay.intersectObject(car.getObjectByName('frunk-original-hood'));
 assert.equal(throughHood.length,0,'raised hood clears access to the storage opening');
});
test('both hood supports stay attached through the complete opening arc',requiresModel,async()=>{
 const {rig,car}=await fixture();
 const collect=name=>{const found=[];car.traverse(item=>{if(item.name===name)found.push(item);});return found;};
 const barrels=collect('frunk-support-barrel'),rods=collect('frunk-support-rod'),bases=collect('frunk-support-base'),tops=collect('frunk-support-upper');
 for(let step=0;step<=12;step++){
  rig.setAngle(FRUNK_OPEN_ANGLE*step/12);car.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const endpoint=(item,y)=>new Vector3(0,y,0).applyMatrix4(item.matrixWorld);
   assert.ok(endpoint(barrels[i],-.5).distanceTo(bases[i].getWorldPosition(new Vector3()))<1e-6);
   assert.ok(endpoint(barrels[i],.5).distanceTo(endpoint(rods[i],-.5))<1e-6);
   assert.ok(endpoint(rods[i],.5).distanceTo(tops[i].getWorldPosition(new Vector3()))<1e-6);
  }
 }
 rig.setAngle(0);car.updateMatrixWorld(true);
 assert.equal(rig.hinge.rotation.x,0,'closing restores the original bonnet pose');
});
