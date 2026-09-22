import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const finish=(color,roughness=.68,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness,side:T.DoubleSide});
const N=128,CENTER=-1.82,FLOOR=.49;
export const FRUNK_HINGE=[0,1.132,-1.115];
export const FRUNK_OPEN_ANGLE=1.32;

function mesh(parent,name,geometry,material){
 const item=new T.Mesh(geometry,material);item.name=name;item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;
}
function box(parent,name,size,position,material,radius=.015){
 const item=mesh(parent,name,new RoundedBoxGeometry(...size,3,Math.min(radius,...size.map(n=>n/2))),material);item.position.set(...position);return item;
}
function tube(parent,name,points,radius,material,closed=false){
 return mesh(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points,closed,'centripetal'),Math.max(32,points.length*2),radius,8,closed),material);
}
function loft(parent,name,rings,material,cap=false){
 const positions=rings.flatMap(r=>r.flatMap(p=>p.toArray())),indices=[];
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<N;i++){
  const a=r*N+i,b=r*N+(i+1)%N,c=b+N,d=a+N;indices.push(a,b,c,a,c,d);
 }
 if(cap){const start=(rings.length-1)*N;for(let i=1;i<N-1;i++)indices.push(start,start+i,start+i+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 return mesh(parent,name,g,material);
}

// Read the actual bonnet boundary and top surface; dimensions are fitted to the
// artist mesh. They are visual approximations from the linked references, not OEM CAD.
function hoodSurface(hood){
 const g=hood.geometry,p=g.attributes.position,idx=g.index.array,edges=new Map(),triangles=[];
 const vertex=i=>vec().fromBufferAttribute(p,i);
 const key=i=>vertex(i).toArray().map(n=>Math.round(n*1e5)).join(',');
 for(let i=0;i<idx.length;i+=3){
  const a=vertex(idx[i]),b=vertex(idx[i+1]),c=vertex(idx[i+2]);triangles.push([a,b,c]);
  for(let j=0;j<3;j++){
   const a=idx[i+j],b=idx[i+(j+1)%3],id=[key(a),key(b)].sort().join('|');
   const edge=edges.get(id)||{a:vertex(a),b:vertex(b),count:0};edge.count++;edges.set(id,edge);
  }
 }
 const border=[...edges.values()].filter(e=>e.count===1);
 function height(x,z){
  for(const [a,b,c] of triangles){
   const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
   if(Math.abs(den)<1e-9)continue;
   const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den;
   const w=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,t=1-u-w;
   if(Math.min(u,w,t)>=-1e-5)return u*a.y+w*b.y+t*c.y;
  }
  return .78+(z+2.3)*.30;
 }
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const outline=Array.from({length:N},(_,i)=>{
  const theta=i/N*Math.PI*2,d=new T.Vector2(Math.cos(theta),Math.sin(theta));
  let closest=Infinity;
  for(const {a,b}of border){
   const p=new T.Vector2(a.x,a.z-CENTER),s=new T.Vector2(b.x-a.x,b.z-a.z),den=cross(d,s);
   if(Math.abs(den)<1e-10)continue;
   const distance=cross(p,s)/den,along=cross(p,d)/den;
   if(distance>0&&along>=-1e-5&&along<=1.00001)closest=Math.min(closest,distance);
  }
  if(!Number.isFinite(closest))throw new Error('Could not fit the frunk surround to the bonnet boundary.');
  const x=d.x*closest,z=CENTER+d.y*closest;return vec(x,height(x,z)-.017,z);
 });
 return {height,outline};
}
// Rounded rectangular opening, narrower at the front, with the rear service
// panel occupying the space up to the windscreen.
function opening(width=.51,depth=.32,center=CENTER){
 return Array.from({length:N},(_,i)=>{
  const t=i/N*Math.PI*2,c=Math.cos(t),s=Math.sin(t);
  const radius=1/Math.pow(Math.pow(Math.abs(c)/width,5)+Math.pow(Math.abs(s)/depth,5),1/5);
  const z=center+s*radius,x=c*radius*(1+.055*(z-center)/depth);return vec(x,0,z);
 });
}
function compactSkin(hood){
 const original=hood.geometry,indices=original.index.array,remap=new Map(),points=[],faces=[];
 for(const index of indices){
  if(!remap.has(index)){remap.set(index,points.length/3);points.push(...vec().fromBufferAttribute(original.attributes.position,index).toArray());}
  faces.push(remap.get(index));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(faces);g.computeVertexNormals();return g;
}

export function createFrunk(car,hood){
 const root=new T.Group();root.name='frunk-assembly';car.add(root);
 const hinge=new T.Group();hinge.name='frunk-hood-pivot';hinge.position.set(...FRUNK_HINGE);car.add(hinge);
 if(!hood)return {root,hinge,available:false,setAngle(){},setCargo(){},setPress(){}};
 const {height,outline}=hoodSurface(hood);
 const plastic=finish('#22262a',.72),wall=finish('#15191d',.8),rubber=finish('#0c1013',.92),metal=finish('#9ba1a4',.32,.8);
 const painted=finish('#c5c9c9',.46,.12),pad=finish('#303438',.98);
 const lip=opening().map(p=>vec(p.x,height(p.x,p.z)-.055,p.z));
 const deckRings=[0,.08,.4,.86,1].map(f=>outline.map((p,i)=>{
  const q=p.clone().lerp(lip[i],f);q.y=height(q.x,q.z)-.017-.038*f;return q;
 }));
 loft(root,'frunk-moulded-surround',deckRings,plastic);
 tube(root,'frunk-weather-seal',lip.map(p=>p.clone().add(vec(0,.005,0))),.011,rubber,true);
 const throat=lip.map(p=>vec(p.x*.982,p.y-.033,CENTER+(p.z-CENTER)*.975));
 const shoulder=opening(.46,.272).map(p=>vec(p.x,.65+(p.z-CENTER)*.12,p.z));
 const lower=opening(.43,.24).map(p=>vec(p.x,FLOOR+.044,p.z));
 const base=opening(.395,.212).map(p=>vec(p.x,FLOOR,p.z));
 loft(root,'frunk-recessed-tub',[lip,throat,shoulder,lower,base],wall,true);
 tube(root,'frunk-moulded-step',shoulder,.006,plastic,true);
 // The supplied mat photograph is an accessory. Use its rounded liner shape as
 // a visual reference without adding its aftermarket ribbed mat to the stock car.
 const floorRing=opening(.379,.198).map(p=>vec(p.x,FLOOR+.002,p.z));
 loft(root,'frunk-floor-inset',[floorRing.map(p=>p.clone().add(vec(0,.007,0))),floorRing],rubber,true);
 tube(root,'frunk-floor-bead',floorRing,.004,plastic,true);
 const service=opening(.49,.092,-1.345).map(p=>vec(p.x,height(p.x,p.z)-.033,p.z));
 loft(root,'frunk-rear-service-panel',[service,service.map(p=>p.clone().add(vec(0,-.008,0)))],wall,true);
 tube(root,'frunk-service-panel-seam',service,.0035,rubber,true);
 for(let i=0;i<7;i++){
  const z=-1.408+i*.019,points=[-.41,-.2,0,.2,.41].map(x=>vec(x,height(x,z)-.031,z));
  tube(root,'frunk-cowl-rib-'+i,points,.0028,plastic);
 }
 const frontZ=-2.218,frontY=height(0,frontZ)-.014;
 box(root,'frunk-latch-recess',[.096,.009,.036],[0,frontY,frontZ],rubber,.012);
 box(root,'frunk-latch-catch',[.042,.012,.012],[0,frontY+.004,frontZ],metal,.003);
 for(const x of [-.4,.4]){
  const z=-2.204,y=height(x,z)-.023;
  const stop=mesh(root,'frunk-hood-stop',new T.CylinderGeometry(.022,.025,.015,24),rubber);stop.position.set(x,y,z);
  const screw=mesh(root,'frunk-stop-centre',new T.CylinderGeometry(.006,.006,.018,16),metal);screw.position.copy(stop.position);
 }
 const capX=-.28,capZ=-2.212,capY=height(capX,capZ)-.036;
 const capWell=mesh(root,'frunk-washer-recess',new T.CylinderGeometry(.043,.04,.012,32),rubber);capWell.position.set(capX,capY,capZ);
 const cap=mesh(root,'frunk-washer-cap',new T.CylinderGeometry(.031,.033,.013,32),finish('#626b70',.65));cap.position.set(capX,capY+.006,capZ);
 box(root,'frunk-washer-grip',[.032,.007,.008],[capX,capY+.015,capZ],plastic,.003);
 // Release button on the front inner wall; it stays below the weather seal.
 const release=mesh(root,'frunk-interior-release',new T.CylinderGeometry(.018,.018,.006,24),finish('#b9c4bc',.5));
 release.rotation.x=Math.PI/2;release.position.set(.19,.67,-2.078);

 hood.geometry=compactSkin(hood);hood.geometry.translate(...FRUNK_HINGE.map(n=>-n));
 hood.name='frunk-original-hood';hood.castShadow=true;hood.receiveShadow=true;hinge.add(hood);
 const underside=hood.geometry.clone(),p=underside.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)-.018);
 underside.computeVertexNormals();mesh(hinge,'frunk-hood-inner-skin',underside,painted);
 const local=p=>p.clone().sub(vec(...FRUNK_HINGE));
 const hem=outline.map(p=>local(p.clone().add(vec(0,.004,0))));
 tube(hinge,'frunk-hood-folded-hem',hem,.008,painted,true);
 const innerRing=opening(.475,.335,-1.70).map(p=>vec(p.x,height(p.x,p.z)-.035,p.z));
 loft(hinge,'frunk-hood-inset',[innerRing.map(p=>local(p)),innerRing.map(p=>local(p.clone().add(vec(0,-.008,0))))],pad,true);
 tube(hinge,'frunk-hood-inner-pressing',innerRing.map(p=>local(p.clone().add(vec(0,.004,0)))),.012,painted,true);
 for(const x of [-.51,.51]){
  tube(hinge,'frunk-hood-strengthening-rib',[[-2.10,x*.72],[-1.86,x],[-1.51,x],[-1.26,x*.95]].map(([z,x])=>local(vec(x,height(x,z)-.033,z))),.014,painted);
 }
 for(const i of [6,24,42,64,84,104,120]){
  const at=innerRing[i].clone();at.y-=.014;
  const clip=mesh(hinge,'frunk-hood-retaining-clip',new T.CylinderGeometry(.008,.008,.006,16),rubber);clip.position.copy(local(at));
 }
 tube(hinge,'frunk-hood-latch-loop',[vec(-.028,height(0,-2.2)-.021,-2.2),vec(-.023,height(0,-2.2)-.058,-2.2),vec(.023,height(0,-2.2)-.058,-2.2),vec(.028,height(0,-2.2)-.021,-2.2)].map(local),.005,metal);
 const struts=[];
 for(const sign of [-1,1]){
  const fixed=vec(sign*.598,.907,-1.65),onHood=local(vec(sign*.59,height(sign*.59,-1.47)-.04,-1.47));
  const barrel=mesh(root,'frunk-support-barrel',new T.CylinderGeometry(.013,.013,1,16),wall);
  const rod=mesh(root,'frunk-support-rod',new T.CylinderGeometry(.006,.006,1,12),metal);
  const fixedJoint=mesh(root,'frunk-support-base',new T.SphereGeometry(.017,12,8),plastic);fixedJoint.position.copy(fixed);
  const upperJoint=mesh(hinge,'frunk-support-upper',new T.SphereGeometry(.015,12,8),plastic);upperJoint.position.copy(onHood);
  struts.push({fixed,onHood,barrel,rod});
 }
 const cargo=new T.Group();cargo.name='frunk-bag';cargo.position.set(0,FLOOR+.138,CENTER);root.add(cargo);
 box(cargo,'frunk-bag-body',[.53,.26,.28],[0,0,0],finish('#947b58',.96),.05);
 tube(cargo,'frunk-bag-handle',[vec(-.12,.13,0),vec(-.10,.21,0),vec(.10,.21,0),vec(.12,.13,0)],.012,wall);
 cargo.visible=false;
 const press=new T.Group();press.name='frunk-hand-position-guides';hinge.add(press);
 const green=new T.MeshStandardMaterial({color:'#51cf94',emissive:'#20a968',emissiveIntensity:.6});
 for(const x of [-.28,.28]){
  const z=-2.16,y=height(x,z)+.018;
  box(press,'frunk-hand-marker',[.14,.007,.095],local(vec(x,y,z)).toArray(),green,.003);
  press.add(new T.ArrowHelper(vec(0,-1,0),local(vec(x,y+.22,z)),.20,0x32ba7b,.055,.035));
 }
 press.visible=false;
 const direction=vec(),up=vec(0,1,0),top=vec(),middle=vec();let currentAngle;
 function cylinderBetween(item,a,b){
  direction.subVectors(b,a);item.position.copy(a).lerp(b,.5);item.scale.y=direction.length();item.quaternion.setFromUnitVectors(up,direction.normalize());
 }
 function setAngle(angle){
  if(angle===currentAngle)return false;
  currentAngle=angle;
  hinge.rotation.x=angle;hinge.updateMatrix();
  for(const {fixed,onHood,barrel,rod}of struts){
   top.copy(onHood).applyMatrix4(hinge.matrix);middle.copy(fixed).lerp(top,.56);
   cylinderBetween(barrel,fixed,middle);cylinderBetween(rod,middle,top);
  }
  return true;
 }
 setAngle(0);
 return {root,hinge,available:true,setAngle,setCargo(visible){cargo.visible=visible;},setPress(visible){press.visible=visible;}};
}
