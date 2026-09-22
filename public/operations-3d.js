import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { energyFlow } from './operation-state.js';
import { createChargePort } from './charge-port.js';
import { createFrunk, FRUNK_OPEN_ANGLE } from './frunk.js';

const v=(x,y,z)=>new T.Vector3(x,y,z);
const material=(color,roughness=.5,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function box(parent,size,position,mat){
 const radius=Math.min(...size)*.16;
 const mesh=new T.Mesh(new RoundedBoxGeometry(...size,3,radius),mat);mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent,radius,length,position,mat){
 const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,48),mat);mesh.position.set(...position);parent.add(mesh);return mesh;
}
// Preserve the supplied hood surface; separate its connected island, not a box drawn over the car.
export function extractHood(mesh){
 const g=mesh.geometry,p=g.attributes.position,indices=g.index.array;
 const parents=Array.from({length:p.count},(_,i)=>i);
 const find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
 const union=(a,b)=>{parents[find(a)]=find(b);};
 const welded=new Map();
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e5)).join(',');
  if(welded.has(key))union(i,welded.get(key));else welded.set(key,i);
 }
 for(let i=0;i<indices.length;i+=3){union(indices[i],indices[i+1]);union(indices[i],indices[i+2]);}
 const islands=new Map();
 for(let i=0;i<indices.length;i+=3){
  const root=find(indices[i]);if(!islands.has(root))islands.set(root,{indices:[],bounds:new T.Box3()});
  const island=islands.get(root);
  for(let j=0;j<3;j++){island.indices.push(indices[i+j]);island.bounds.expandByPoint(v().fromBufferAttribute(p,indices[i+j]));}
 }
 const hood=[...islands.values()].find(({bounds:b})=>b.min.z<-2.2&&b.max.z<-1&&b.max.y>1.13&&b.min.x>-.72&&b.max.x<.72&&b.min.y>.75);
 if(!hood)return null;
 const hoodIndices=new Set(hood.indices),rest=[];
 for(let i=0;i<indices.length;i+=3)if(!hoodIndices.has(indices[i]))rest.push(indices[i],indices[i+1],indices[i+2]);
 const hoodGeometry=g.clone();hoodGeometry.setIndex(hood.indices);hoodGeometry.computeBoundingBox();hoodGeometry.computeBoundingSphere();
 const bodyGeometry=g.clone();bodyGeometry.setIndex(rest);bodyGeometry.computeBoundingBox();bodyGeometry.computeBoundingSphere();mesh.geometry=bodyGeometry;
 return new T.Mesh(hoodGeometry,mesh.material);
}
export function createOperations(scene,car){
 const black=material('#171c22',.52),alloy=material('#a2b0b8',.32,.7);
 const cyan=new T.MeshStandardMaterial({color:'#35adcd',emissive:'#16748e',emissiveIntensity:.35,roughness:.35,metalness:.3});
 const green=new T.MeshStandardMaterial({color:'#51cf94',emissive:'#20a968',emissiveIntensity:.7});
 const amber=new T.MeshStandardMaterial({color:'#e9a642',emissive:'#b16519',emissiveIntensity:.6});
 // Separate the hood first so restoring the closed charging corner cannot
 // restore a second, stationary hood over the animated frunk.
 const hood=extractHood(car.getObjectByName('Plane_Mesh002'));
 const chargeRig=createChargePort(car),charge=chargeRig.root;scene.add(charge);
 const frunkRig=createFrunk(car,hood),frunk=frunkRig.root,hinge=frunkRig.hinge;
 const energy=new T.Group();scene.add(energy);
 box(energy,[1.38,.14,2.3],[0,.36,.05],black);
 for(let i=0;i<10;i++)box(energy,[1.26,.055,.18],[0,.46,-.95+i*.21],cyan);
 const brakes=[];
 for(const z of [-1.33,1.56]){
  const drive=cylinder(energy,.15,.58,[0,.48,z],alloy);drive.rotation.z=Math.PI/2;
  const axle=cylinder(energy,.035,1.7,[0,.36,z],black);axle.rotation.z=Math.PI/2;
  for(const x of [-.82,.82]){
   const disc=cylinder(energy,.15,.025,[x,.36,z],alloy);disc.rotation.z=Math.PI/2;
   const brake=box(energy,[.055,.18,.1],[x,.44,z+.11],amber);brake.name='friction-brake';brakes.push(brake);
  }
 }
 const paths=[[-1.33,-.95],[1.56,.95]].map(([from,to])=>new T.LineCurve3(v(0,.54,from),v(0,.54,to)));
 const arrows=paths.map(path=>{
  const arrow=new T.ArrowHelper(v(0,0,1),path.getPoint(.2).add(v(0,.12,0)),.3,0x28b875,.11,.075);
  energy.add(arrow);return arrow;
 });
 const particles=[];
 for(let path=0;path<paths.length;path++)for(let i=0;i<7;i++){
  const dot=new T.Mesh(new T.SphereGeometry(.035,12,8),green.clone());energy.add(dot);particles.push({mesh:dot,path,offset:i/7});
 }
 const ghosted=new Map();let state=null,kind=null,angle=0,targetAngle=0,last=0,shadowUpdate=true;
 let flow=null,direction=0;
 const arrowFrom=v(),arrowTo=v(),arrowLift=v(0,.12,0);
 function configureEnergy(){
  flow=energyFlow(state);direction=Math.sign(flow.direction);
  arrows.forEach((arrow,i)=>{
   arrow.visible=direction!==0;
   const path=paths[i];path.getPoint(direction<0?.15:.85,arrowFrom);path.getPoint(direction<0?.85:.15,arrowTo);
   arrow.position.copy(arrowFrom).add(arrowLift);arrow.setDirection(arrowTo.sub(arrowFrom).normalize());arrow.setColor(direction<0?0x28b875:0x287fbf);
  });
  for(const brake of brakes)brake.visible=flow.friction;
  for(const dot of particles){
   dot.mesh.visible=direction!==0;
   dot.mesh.material.color.set(direction<0?'#51cf94':'#50a7e9');
   dot.mesh.material.emissive.set(direction<0?'#20a968':'#176fba');
  }
  moveEnergy(0,true);
 }
 function moveEnergy(time,reduced){
  for(const dot of particles){
   const phase=(dot.offset+(reduced?0:time/2500)*Math.abs(flow.direction))%1;
   paths[dot.path].getPoint(direction<0?phase:1-phase,dot.mesh.position);
  }
 }
 function ghost(enabled){
  if(enabled){car.traverse(mesh=>{if(!mesh.isMesh||ghosted.has(mesh))return;const original=mesh.material;const clone=m=>{const c=m.clone();c.transparent=true;c.opacity=.09;c.depthWrite=false;c.color?.set('#9eb5cb');return c;};ghosted.set(mesh,{material:original,castShadow:mesh.castShadow});mesh.material=Array.isArray(original)?original.map(clone):clone(original);mesh.castShadow=false;});}
  else{for(const [mesh,original]of ghosted){for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])mat.dispose();mesh.material=original.material;mesh.castShadow=original.castShadow;}ghosted.clear();}
 }
 function show(next,reduced=false){
  state=next;const nextKind=next?.kind||null;
  if(nextKind!==kind){ghost(false);kind=nextKind;if(kind==='regen')ghost(true);}
  charge.visible=kind!=='regen';frunk.visible=kind!=='regen';energy.visible=kind==='regen';
  hinge.visible=kind!=='regen';
  targetAngle=kind==='frunk'?({released:.025,open:FRUNK_OPEN_ANGLE,lowered:.016,latched:0,checked:0}[next.phase]||0):0;
  chargeRig.show(kind==='charge'?next:null,reduced);
  frunkRig.setCargo(Boolean(next?.cargo));frunkRig.setPress(kind==='frunk'&&['lowered','latched','checked'].includes(next.phase));
  if(reduced){angle=targetAngle;frunkRig.setAngle(angle);}
  if(kind==='regen')configureEnergy();
  shadowUpdate=true;
 }
 show(null,true);
 return {
  available:{charge:true,frunk:Boolean(hood),regen:true},
  show,
  presentCharge(frame){chargeRig.presentConnection(frame);},
  tick(time,reduced=false){
   const dt=Math.min((time-last)/1000,.08);last=time;
   const ease=(current,target)=>Math.abs(current-target)<.0005?target:current+(target-current)*(1-Math.exp(-dt*5));
   angle=reduced?targetAngle:ease(angle,targetAngle);
   const hoodChanged=frunkRig.setAngle(angle);if(hoodChanged)shadowUpdate=true;
   let moving=chargeRig.tick(dt,time,reduced)||hoodChanged;
   if(kind==='regen'&&direction!==0&&!reduced){moveEnergy(time,false);moving=true;}
   return moving;
  },
  consumeShadowUpdate(){const changed=chargeRig.consumeShadowUpdate()||shadowUpdate;shadowUpdate=false;return changed;},
  getState(){return {kind,phase:state?.phase,hoodAngle:angle,...chargeRig.getState(),energy:state?.kind==='regen'?energyFlow(state):null};}
 };
}
