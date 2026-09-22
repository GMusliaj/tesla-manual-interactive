import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createChargePort} from '../public/charge-port.js';
import {requiresModel} from './asset-fixture.mjs';

async function fixture(){
 const bytes=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
 const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const originals=new Map();scene.traverse(o=>{if(o.isMesh)originals.set(o,o.geometry);});
 const rig=createChargePort(scene);scene.add(rig.root);scene.updateMatrixWorld(true);return {scene,rig,originals};
}
function visible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
function rayAt(rig,x,y){
 rig.root.updateMatrixWorld(true);
 const origin=rig.socket.localToWorld(new T.Vector3(x,y,.50));
 const direction=new T.Vector3(0,0,-1).transformDirection(rig.socket.matrixWorld);
 return new T.Raycaster(origin,direction);
}
test('closed body covers both AC and DC contacts; opening exposes the recessed socket',requiresModel,async()=>{
 const {scene,rig}=await fixture();
 rig.show({phase:'closed'},true);
 const contacts=[...rig.socket.getObjectsByProperty('name','type2-contact'),...rig.socket.getObjectsByProperty('name','ccs-dc-contact')];
 for(const contact of contacts){
  const{x,y}=contact.position;
  const hits=rayAt(rig,x,y).intersectObject(scene).filter(h=>visible(h.object));
  assert.ok(hits[0]&&!rig.root.getObjectById(hits[0].object.id),'original body must occlude '+contact.name+' at '+x+','+y);
  assert.equal(visible(contact),false,'socket details must be hidden when closed');
 }
 rig.show({phase:'open'},true);
 for(const y of [0,-.065]){
  const hits=rayAt(rig,0,y).intersectObject(rig.root).filter(h=>!h.object.name.includes('connector')&&!h.object.parent.name.includes('plug'));
  assert.ok(hits.length);
  assert.notEqual(hits[0].object.name,'charge-flap-exterior','open cover must clear '+y);
 }
});
test('closing and leaving charging restore every original body surface without a protruding flap',requiresModel,async()=>{
 const {rig,originals}=await fixture();
 const assertClosed=()=>{
  for(const [mesh,geometry]of originals)assert.equal(mesh.geometry,geometry,'closed surface changed: '+mesh.name);
  assert.equal(visible(rig.root.getObjectByName('charge-flap-exterior')),false);
 };
 assertClosed();
 rig.show({phase:'open'},true);
 assert.ok([...originals].some(([mesh,geometry])=>mesh.geometry!==geometry),'opening must expose the cutout');
 rig.show({phase:'closed'},false);
 for(let i=0;i<240;i++)rig.tick(1/60,i*1000/60,false);
 assertClosed();
 rig.show({phase:'charging'},true);rig.show(null,false);assertClosed();
});
test('body opening clears the socket and plug inserts along the same axis',requiresModel,async()=>{
 const {scene,rig}=await fixture();
 rig.show({phase:'open'},true);
 const body=scene.getObjectByName('Plane_Mesh002');
 for(const y of [0,-.065]){
  const hits=rayAt(rig,0,y).intersectObject(body);
  assert.ok(!hits.length||hits[0].distance>.60,'body must not cross the socket opening');
 }
 const unplugged=rig.plug.position.clone();rig.show({phase:'charging'},true);
 assert.equal(rig.plug.position.x,unplugged.x);assert.equal(rig.plug.position.y,unplugged.y);
 assert.ok(rig.plug.position.z<unplugged.z);
 rig.root.updateMatrixWorld(true);
 const nose=rig.plug.getObjectByName('connector-nose');nose.geometry.computeBoundingBox();
 const tip=rig.socket.worldToLocal(nose.localToWorld(new T.Vector3(0,0,nose.geometry.boundingBox.min.z)));
 assert.ok(tip.z<0,'inserted connector nose must enter the socket, not hover in front');
 assert.ok(Math.abs(tip.x)<1e-7&&Math.abs(tip.y)<1e-7,'connector tip must share the inlet axis in world space');
 assert.equal(rig.socket.getObjectsByProperty('name','type2-contact').length,7);
 assert.equal(rig.socket.getObjectsByProperty('name','ccs-dc-contact').length,2);
});

test('ready plug is 2 mm from the real mouth and stays aimed at it until its shoulder seats',requiresModel,async()=>{
 const {rig}=await fixture();
 const nose=rig.plug.getObjectByName('connector-nose'),mouth=rig.socket.getObjectByName('type2-mouth'),handle=rig.plug.getObjectByName('connector-body');
 for(const m of [nose,mouth,handle])m.geometry.computeBoundingBox();
 const tipInSocket=()=>{
  rig.root.updateMatrixWorld(true);
  return rig.socket.worldToLocal(nose.localToWorld(new T.Vector3(0,0,nose.geometry.boundingBox.min.z)));
 };
 rig.show({phase:'open'},true);
 const readyTip=tipInSocket();
 assert.ok(Math.abs(readyTip.z-mouth.geometry.boundingBox.max.z-.002)<1e-6,'ready tip must be 2 mm off the visible mouth');
 const origin=nose.localToWorld(new T.Vector3(0,0,nose.geometry.boundingBox.min.z));
 const direction=new T.Vector3(0,0,-1).transformDirection(nose.matrixWorld);
 const hit=new T.Raycaster(origin,direction).intersectObject(mouth)[0];
 assert.ok(hit&&hit.distance<.004,'the physical nose points directly at the mouth, not past it');
 rig.show({phase:'charging'},false);
 let last=readyTip.z;
 for(let i=0;i<240;i++){
  rig.tick(1/60,i*1000/60,false);
  const tip=tipInSocket();assert.ok(Math.abs(tip.x)<1e-7&&Math.abs(tip.y)<1e-7);
  assert.ok(tip.z<=last+1e-7,'insertion must move monotonically toward the mouth');last=tip.z;
 }
 const shoulder=rig.socket.worldToLocal(handle.localToWorld(new T.Vector3(0,0,handle.geometry.boundingBox.min.z)));
 assert.ok(Math.abs(shoulder.z+.001)<1e-6,'handle shoulder must seat just inside the bezel');
 assert.ok(tipInSocket().z<-.035,'nose must be fully inside when charging');
});

test('moving charging tubes retain GPU buffers and match the original tube surface',requiresModel,async()=>{
 const {rig}=await fixture();
 const tubes=['flap-lift-arm','charging-cable'].map(name=>rig.root.getObjectByName(name));
 const buffers=tubes.map(item=>({geometry:item.geometry,position:item.geometry.attributes.position,normal:item.geometry.attributes.normal,index:item.geometry.index}));
 rig.show({phase:'open'},false);
 for(let i=0;i<30;i++){
  rig.tick(1/60,i*1000/60,false);
  for(let j=0;j<tubes.length;j++){
   const g=tubes[j].geometry,expected=buffers[j];
   assert.equal(g,expected.geometry);assert.equal(g.attributes.position,expected.position);
   assert.equal(g.attributes.normal,expected.normal);assert.equal(g.index,expected.index);
  }
 }
 rig.presentConnection({seated:false,approach:.65,insertion:.4});
 for(const item of tubes){
  const {path,tubularSegments,radius,radialSegments}=item.geometry.parameters;
  const reference=new T.TubeGeometry(path,tubularSegments,radius,radialSegments,false);
  assert.deepEqual(item.geometry.attributes.position.array,reference.attributes.position.array,'buffer reuse preserves the fitted curve');
  assert.deepEqual(item.geometry.attributes.normal.array,reference.attributes.normal.array,'buffer reuse preserves smooth tube normals');
  reference.dispose();
 }
});

test('held connector cues and charge-light pulsing leave settled geometry and shadows unchanged',requiresModel,async()=>{
 const {rig}=await fixture(),cue={seated:true,approach:1,insertion:1};
 rig.presentConnection(cue);assert.equal(rig.consumeShadowUpdate(),true);
 const tubes=['flap-lift-arm','charging-cable'].map(name=>rig.root.getObjectByName(name));
 const versions=tubes.map(item=>item.geometry.attributes.position.version);
 for(let i=1;i<=60;i++){
  rig.presentConnection(cue);assert.equal(rig.consumeShadowUpdate(),false);
  rig.tick(1/60,i*1000/60,false);assert.equal(rig.consumeShadowUpdate(),false);
  tubes.forEach((item,j)=>assert.equal(item.geometry.attributes.position.version,versions[j]));
 }
 rig.show(null,false);assert.equal(rig.consumeShadowUpdate(),true,'closing invalidates the cached shadows');
});
