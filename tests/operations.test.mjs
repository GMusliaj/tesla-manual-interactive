import test from 'node:test';
import assert from 'node:assert/strict';
import { initialOperation, operate, actionsFor, energyFlow } from '../public/operation-state.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createOperations, extractHood } from '../public/operations-3d.js';
import { Scene } from 'three';
import { readFile } from 'node:fs/promises';
import { requiresModel } from './asset-fixture.mjs';
test('charging cannot plug into a closed port or pull out a locked connector',()=>{
 let state=initialOperation('charge');
 assert.strictEqual(operate(state,'plug'),state);
 state=operate(operate(state,'open'),'plug');
 assert.equal(state.phase,'charging');
 assert.strictEqual(operate(state,'unplug'),state);
 state=operate(state,'stop');assert.strictEqual(operate(state,'unplug'),state);
 for(const action of ['unlock','unplug','close'])state=operate(state,action);
 assert.equal(state.complete,true);assert.equal(state.phase,'closed');
 assert.equal(operate(state,'reset').complete,false);
});
test('frunk completion requires lowering, pressing and checking, with cargo only while open',()=>{
 let state=initialOperation('frunk');
 assert.strictEqual(operate(state,'cargo'),state);assert.strictEqual(operate(state,'check'),state);
 for(const action of ['release','lift','cargo','lower'])state=operate(state,action);
 assert.equal(state.cargo,true);assert.equal(state.complete,false);
 assert.strictEqual(operate(state,'check'),state);
 state=operate(state,'press');assert.equal(state.complete,false);
 state=operate(state,'check');assert.equal(state.complete,true);
});
test('energy recovery reverses the flow, is limited by battery condition and stops at rest',()=>{
 let s=initialOperation('regen');assert.equal(energyFlow(s).direction,1);
 s=operate(s,'lift');assert.equal(energyFlow(s).direction,-1);
 s=operate(s,'cold');assert.ok(energyFlow(s).direction<0);assert.ok(energyFlow(s).direction>-1);assert.equal(energyFlow(s).friction,true);
 s=operate(s,'full');assert.equal(energyFlow(s).direction,0);assert.equal(energyFlow(s).friction,true);
 s=operate(s,'standstill');assert.equal(energyFlow(s).direction,0);assert.equal(energyFlow(s).friction,false);
 assert.deepEqual(actionsFor(s),['drive','lift','brake','standstill']);
});
test('hood extraction preserves every original body triangle and isolates the real hood surface',requiresModel,async()=>{
 const b=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
 const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const body=scene.getObjectByName('Plane_Mesh002'),before=body.geometry.index.count;
 const hood=extractHood(body);
 assert.ok(hood);assert.equal(hood.geometry.index.count,256*3);
 assert.equal(body.geometry.index.count+hood.geometry.index.count,before);
 const p=hood.geometry.attributes.position;
 for(const i of hood.geometry.index.array){assert.ok(p.getZ(i)<-1);assert.ok(p.getY(i)>.75);assert.ok(Math.abs(p.getX(i))<.72);}
});
test('restoring the closed charge port cannot put the detached hood back into the body',requiresModel,async()=>{
 const b=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
 const {scene:car}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const body=car.getObjectByName('Plane_Mesh002'),original=body.geometry;
 const hood=extractHood(body),expected=original.index.count-hood.geometry.index.count;
 body.geometry=original;
 const scene=new Scene();scene.add(car);const operations=createOperations(scene,car);
 assert.equal(body.geometry.index.count,expected);
 operations.show({kind:'charge',phase:'open'},true);
 operations.show({kind:'charge',phase:'closed'},true);
 assert.equal(body.geometry.index.count,expected,'closed charging corner must leave hood detached');
 operations.show({kind:'charge',phase:'charging'},true);
 operations.show({kind:'frunk',phase:'open'},true);
 assert.equal(body.geometry.index.count,expected,'changing chapters must not restore a second hood');
 assert.ok(operations.getState().hoodAngle>1);
});

test('operation shadows update for moving hood and chapter changes, then settle while the camera or energy moves',requiresModel,async()=>{
 const b=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
 const {scene:car}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const scene=new Scene();scene.add(car);const operations=createOperations(scene,car);
 assert.equal(operations.consumeShadowUpdate(),true);
 for(let i=0;i<30;i++){assert.equal(operations.tick(i*1000/60),false);assert.equal(operations.consumeShadowUpdate(),false);}
 operations.show({kind:'frunk',phase:'open'});assert.equal(operations.consumeShadowUpdate(),true);
 assert.equal(operations.tick(500),true);assert.equal(operations.consumeShadowUpdate(),true);
 for(let i=31;i<300;i++)operations.tick(i*1000/60);
 operations.consumeShadowUpdate();
 assert.equal(operations.tick(5000),false);assert.equal(operations.consumeShadowUpdate(),false);
 operations.show({kind:'regen',phase:'drive',condition:'normal'},true);
 assert.equal(operations.consumeShadowUpdate(),true);
 assert.equal(operations.tick(5017),true,'energy particles remain animated');
 assert.equal(operations.consumeShadowUpdate(),false,'non-shadow-casting particles need no shadow render');
 operations.show(null,true);assert.equal(operations.consumeShadowUpdate(),true,'restoring solid body and closed hood refreshes shadows');
});
