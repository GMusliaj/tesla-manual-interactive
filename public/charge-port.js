import * as T from 'three';

const vec=(x,y,z)=>new T.Vector3(x,y,z);
const mat=(color,roughness=.45,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const ORIGIN=vec(-.842,1.06,1.86);
const BODY_PARTS=['Plane_Mesh002','Plane034_Mesh021','Plane036_Mesh022','Plane040_Mesh026'];

function bodySurface(car){
 const positions=[];
 car.traverse(o=>{
  if(!o.isMesh||!BODY_PARTS.includes(o.name))return;
  const g=o.geometry,p=g.attributes.position,ix=g.index?.array||Array.from({length:p.count},(_,i)=>i);
  for(let i=0;i<ix.length;i+=3){
   const vertices=[ix[i],ix[i+1],ix[i+2]].map(j=>vec().fromBufferAttribute(p,j));
   if(vertices.every(v=>v.z<1.65)||vertices.every(v=>v.z>2.04)||vertices.every(v=>v.y<.92)||vertices.every(v=>v.y>1.16)||vertices.some(v=>v.x>-.6))continue;
   for(const v of vertices)positions.push(...v.toArray());
  }
 });
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 const surface=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster(),cache=new Map();
 return {depth(u,v){
  const key=u.toFixed(5)+','+v.toFixed(5);if(cache.has(key))return cache.get(key);
  ray.set(vec(-2,ORIGIN.y+v,ORIGIN.z+u),vec(1,0,0));
  const hit=ray.intersectObject(surface)[0],depth=hit?ORIGIN.x-hit.point.x:-.22*u-.34*v;cache.set(key,depth);return depth;
 },dispose(){geometry.dispose();surface.material.dispose();}};
}

// Outline follows the tapered left rear lamp corner in the supplied Juniper manual image.
function outline(){
 const s=new T.Shape();
 s.moveTo(-.176,.068);s.quadraticCurveTo(-.19,.071,-.179,.056);
 s.lineTo(.079,-.104);s.quadraticCurveTo(.109,-.122,.122,-.101);
 s.lineTo(.151,-.059);s.quadraticCurveTo(.157,-.047,.147,-.034);
 s.lineTo(.047,.070);s.quadraticCurveTo(.041,.078,.027,.078);
 s.lineTo(-.176,.068);return s;
}
function capsule(w,h){
 const p=new T.Shape(),r=h/2,a=w/2-r;
 p.absarc(a,0,r,-Math.PI/2,Math.PI/2,false);
 p.absarc(-a,0,r,Math.PI/2,3*Math.PI/2,false);p.closePath();return p;
}
function type2(){
 const p=new T.Shape();p.moveTo(-.023,.030);p.lineTo(.023,.030);
 p.quadraticCurveTo(.037,.029,.038,.009);p.bezierCurveTo(.043,-.040,-.043,-.040,-.038,.009);
 p.quadraticCurveTo(-.037,.029,-.023,.030);return p;
}
function mesh(parent,geometry,material,name){
 const m=new T.Mesh(geometry,material);m.name=name||'';m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function extrude(shape,depth,bevel=.001){
 return new T.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:24,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3});
}
function tube(parent,points,radius,material){
 return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>vec(...p))),40,radius,12,false),material);
}
// Keep the topology and GPU buffers for moving tubes. Only their surface data
// changes; replacing a TubeGeometry every frame disposes and uploads new buffers.
function movingTube(path,segments,radius,sides){
 const geometry=new T.TubeGeometry(path,segments,radius,sides,false);
 const position=geometry.attributes.position,normal=geometry.attributes.normal;
 position.setUsage(T.DynamicDrawUsage);normal.setUsage(T.DynamicDrawUsage);
 const point=vec(),surfaceNormal=vec();
 const circle=Array.from({length:sides+1},(_,i)=>[-Math.cos(i/sides*Math.PI*2),Math.sin(i/sides*Math.PI*2)]);
 return {geometry,update(){
  path.updateArcLengths();
  const frames=path.computeFrenetFrames(segments,false);
  for(let i=0;i<=segments;i++){
   path.getPointAt(i/segments,point);
   const n=frames.normals[i],b=frames.binormals[i];
   for(let j=0;j<=sides;j++){
    const [cos,sin]=circle[j],index=i*(sides+1)+j;
    surfaceNormal.set(cos*n.x+sin*b.x,cos*n.y+sin*b.y,cos*n.z+sin*b.z).normalize();
    normal.setXYZ(index,surfaceNormal.x,surfaceNormal.y,surfaceNormal.z);
    position.setXYZ(index,point.x+radius*surfaceNormal.x,point.y+radius*surfaceNormal.y,point.z+radius*surfaceNormal.z);
   }
  }
  geometry.tangents=frames.tangents;geometry.normals=frames.normals;geometry.binormals=frames.binormals;
  position.needsUpdate=true;normal.needsUpdate=true;geometry.computeBoundingSphere();
  if(geometry.boundingBox)geometry.computeBoundingBox();
 }};
}
function ring(parent,radius,thickness,position,material){
 const m=mesh(parent,new T.TorusGeometry(radius,thickness,12,40),material);m.position.set(...position);return m;
}

// Subtract a convex opening from the actual body/lamp triangles. This preserves
// all attributes outside the opening; nothing is hidden with a floating cover.
export function cutChargeOpening(car,points){
 const surfaces=[];
 // A sampled closed curve repeats its first point. Remove duplicate/collinear
 // edges via its convex hull so a zero-length clipping edge cannot restore the hole.
 const sorted=points.map(p=>({x:p.x+ORIGIN.z,y:p.y+ORIGIN.y})).sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=points=>{const h=[];for(const p of points){while(h.length>=2&&cross(h.at(-2),h.at(-1),p)<=1e-10)h.pop();h.push(p);}return h;};
 const poly=[...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];
 car.traverse(o=>{
  if(!o.isMesh||!BODY_PARTS.includes(o.name))return;
  const g=o.geometry,p=g.attributes.position,index=g.index?.array||Array.from({length:p.count},(_,i)=>i);
  const attributes=Object.entries(g.attributes),out=Object.fromEntries(attributes.map(([name])=>[name,[]]));
  const vertex=i=>Object.fromEntries(attributes.map(([name,a])=>[name,Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j])]));
  const side=(a,b,v)=>(b.x-a.x)*(v.position[1]-a.y)-(b.y-a.y)*(v.position[2]-a.x);
  const split=(vertices,a,b,inside)=>{
   const result=[];
   for(let i=0;i<vertices.length;i++){
    const start=vertices[i],end=vertices[(i+1)%vertices.length],ds=side(a,b,start),de=side(a,b,end);
    const keep=inside?ds>=0:ds<=0,next=inside?de>=0:de<=0;
    if(keep)result.push(start);
    if(keep!==next){const t=ds/(ds-de);result.push(Object.fromEntries(attributes.map(([name])=>[name,start[name].map((n,j)=>n+(end[name][j]-n)*t)])));}
   }
   return result;
  };
  const emit=vertices=>{for(let i=1;i<vertices.length-1;i++)for(const v of [vertices[0],vertices[i],vertices[i+1]])for(const[name]of attributes)out[name].push(...v[name]);};
  let changed=false;
  for(let i=0;i<index.length;i+=3){
   const tri=[vertex(index[i]),vertex(index[i+1]),vertex(index[i+2])];
   if(tri.some(v=>v.position[0]>-.6)||tri.every(v=>v.position[2]<1.66)||tri.every(v=>v.position[2]>2.03)||tri.every(v=>v.position[1]<.93)||tri.every(v=>v.position[1]>1.15)){emit(tri);continue;}
   let remaining=tri;const fragments=[];
   for(let j=0;j<poly.length&&remaining.length>=3;j++){
    const a=poly[j],b=poly[(j+1)%poly.length];
    fragments.push(split(remaining,a,b,false));remaining=split(remaining,a,b,true);
   }
   if(remaining.length<3){emit(tri);continue;}
   changed=true;fragments.forEach(emit);
  }
  if(changed){
   const replacement=new T.BufferGeometry();
   for(const[name,a]of attributes)replacement.setAttribute(name,new T.Float32BufferAttribute(out[name],a.itemSize));
   replacement.setIndex(Array.from({length:out.position.length/3},(_,i)=>i));replacement.normalizeNormals();replacement.computeBoundingBox();replacement.computeBoundingSphere();o.geometry=replacement;
   surfaces.push({mesh:o,closed:g,open:replacement});
  }
 });
 return {setOpen(open){for(const surface of surfaces)surface.mesh.geometry=open?surface.open:surface.closed;}};
}

export function createChargePort(car){
 const root=new T.Group();root.name='charging-practice';
 const assembly=new T.Group();assembly.position.copy(ORIGIN);assembly.rotation.y=-Math.PI/2;root.add(assembly);
 const housing=mat('#25292d',.58),rubber=mat('#0d0f12',.85),liner=mat('#111418',.6),metal=mat('#63666a',.32,.6);
 const shell=mat('#11151a',.26,.16),bodyOutline=outline();
 const surface=bodySurface(car),surfaceDepth=(u,v)=>surface.depth(u,v);
 const boundary=bodyOutline.getPoints(16),bodyOpening=cutChargeOpening(car,boundary);
 const deform=(g,offset=0)=>{
  // Tessellate caps as well as their perimeter: the lamp corner curves in two
  // directions, so a single flat cap would intersect the contacts at its centre.
  const p=g.attributes.position,indices=g.index?.array||Array.from({length:p.count},(_,i)=>i),positions=[];
  const subdivide=(a,b,c,depth=0)=>{
   if(depth<4&&Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))>.025){
    const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);
    subdivide(a,ab,ca,depth+1);subdivide(ab,b,bc,depth+1);subdivide(ca,bc,c,depth+1);subdivide(ab,bc,ca,depth+1);
   }else for(const v of[a,b,c])positions.push(v.x,v.y,v.z+surfaceDepth(v.x,v.y)+offset);
  };
  for(let i=0;i<indices.length;i+=3)subdivide(...[indices[i],indices[i+1],indices[i+2]].map(j=>vec().fromBufferAttribute(p,j)));
  const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.computeVertexNormals();g.dispose();return result;
 };
 // The panel is behind the body surface; perimeter lip is only a few millimetres proud.
 mesh(assembly,deform(extrude(bodyOutline,.004),-.012),housing,'charge-recess');
 tube(assembly,boundary.map(p=>[p.x,p.y,surfaceDepth(p.x,p.y)+.002]),.0025,rubber);
 const socket=new T.Group();socket.position.set(.035,.017,surfaceDepth(.035,.017)-.004);assembly.add(socket);
 socket.rotation.y=.216;socket.rotation.x=-.325;
 const upper=type2();
 // A recessed mouth, seven dark contact wells, and restrained metal sleeves.
 const mouth=mesh(socket,extrude(upper,.003,.001),liner,'type2-mouth');
 const perimeter=upper.getPoints(32).map(p=>[p.x,p.y,.005]);tube(socket,perimeter,.002,housing);
 const contacts=[[-.013,.015,.004],[.013,.015,.004],[-.021,-.002,.006],[0,-.002,.006],[.021,-.002,.006],[-.012,-.021,.006],[.012,-.021,.006]];
 for(const[x,y,r]of contacts){
  const well=mesh(socket,new T.CircleGeometry(r,32),rubber,'type2-contact');well.position.set(x,y,.0035);
  ring(socket,r,.0008,[x,y,.004],metal);
 }
 const lower=capsule(.075,.039);const dc=mesh(socket,extrude(lower,.004,.001),liner,'ccs-dc-mouth');dc.position.set(0,-.065,0);
 for(const x of [-.019,.019]){
  ring(socket,.014,.0015,[x,-.065,.005],housing);
  const well=mesh(socket,new T.CircleGeometry(.0125,32),rubber,'ccs-dc-contact');well.position.set(x,-.065,.0045);
  const pin=mesh(socket,new T.CircleGeometry(.003,24),metal);pin.position.set(x,-.065,.005);
 }
 // Small light on the front side, as in the references; no invented vertical LED strip.
 const statusMaterial=new T.MeshStandardMaterial({color:'#dae3ef',emissive:'#dae3ef',emissiveIntensity:.4});
 const status=mesh(assembly,new T.CircleGeometry(.004,24),statusMaterial,'charge-status');status.position.set(-.069,.010,surfaceDepth(-.069,.010)+.001);
 const hinge=new T.Group();hinge.position.set(-.045,.078,surfaceDepth(-.045,.078)+.003);assembly.add(hinge);
 const lid=new T.Group();lid.name='charge-flap';hinge.add(lid);
 const lidGeometry=deform(extrude(bodyOutline,.003,.001),.003);
 lidGeometry.translate(-hinge.position.x,-hinge.position.y,-hinge.position.z);
 mesh(lid,lidGeometry,shell,'charge-flap-exterior');
 const inner=deform(extrude(bodyOutline,.001,.0005),.001);inner.translate(-hinge.position.x,-hinge.position.y,-hinge.position.z);
 mesh(lid,inner,liner,'charge-flap-interior');
 // Curved lift arm stays attached to both body and cover while it rotates upward.
 const armBase=vec(-.11,.039,surfaceDepth(-.11,.039)+.002);
 const armTip=vec(-.11,.026,surfaceDepth(-.11,.026)+.001).sub(hinge.position);
 const attachedTip=armTip.clone().add(hinge.position),armMiddle=armBase.clone().lerp(attachedTip,.5);armMiddle.z+=.012;
 const armCurve=new T.CatmullRomCurve3([armBase,armMiddle,attachedTip]);
 const armTube=movingTube(armCurve,20,.004,10);
 const liftArm=mesh(assembly,armTube.geometry,shell,'flap-lift-arm');
 const pivotPin=mesh(assembly,new T.CylinderGeometry(.006,.006,.027,24),liner,'flap-pivot');
 pivotPin.rotation.z=Math.PI/2;pivotPin.position.copy(armBase);
 surface.dispose();

 const plug=new T.Group();socket.add(plug);plug.name='type2-plug';
 const plugShell=mat('#24282e',.42),plugGrip=mat('#14171c',.75);
 const nose=mesh(plug,extrude(type2(),.046,.0003),rubber,'connector-nose');
 nose.scale.set(.9,.9,1);nose.position.z=-.009;
 // Smooth continuous pistol body formed from an elliptical loft, not stacked boxes.
 const sections=[[0,.037,.035,.035],[.004,.064,.039,.036],[-.012,.105,.034,.031],[-.043,.126,.029,.028],[-.084,.142,.022,.024],[-.126,.158,.018,.019]];
 const positions=[],indices=[],segments=40;
 for(const[y,z,rx,ry]of sections)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;positions.push(Math.cos(a)*rx,y+Math.sin(a)*ry,z);}
 for(let j=0;j<sections.length-1;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments,c=b+segments,d=a+segments;indices.push(a,b,d,b,c,d);}
 for(const [section,reverse]of [[0,true],[sections.length-1,false]]){
  const center=positions.length/3,[y,z]=sections[section];positions.push(0,y,z);
  for(let i=0;i<segments;i++){const a=section*segments+i,b=section*segments+(i+1)%segments;indices.push(center,reverse?b:a,reverse?a:b);}
 }
 const loft=new T.BufferGeometry();loft.setAttribute('position',new T.Float32BufferAttribute(positions,3));loft.setIndex(indices);loft.computeVertexNormals();
 mesh(plug,loft,plugShell,'connector-body');
 const button=mesh(plug,new T.SphereGeometry(1,24,12),plugGrip);button.scale.set(.013,.003,.014);button.position.set(0,.036,.063);
 tube(plug,[[0,-.123,.157],[0,-.17,.175],[.005,-.25,.205],[.015,-.38,.26]],.010,plugGrip);
 const cablePoints=[vec(0,0,0),vec(0,-.22,0),vec(0,-.5,0),vec(0,-.75,0),vec(0,-1,0)];
 const cableTube=movingTube(new T.CatmullRomCurve3(cablePoints),64,.010,12);
 const cable=mesh(root,cableTube.geometry,plugGrip,'charging-cable');
 // Mate actual surfaces: leave only 2 mm at the mouth before insertion, then
 // move until the handle shoulder meets the raised socket rim. Both poses use
 // the inlet's own coordinates and orientation, independent of camera angle.
 mouth.geometry.computeBoundingBox();nose.geometry.computeBoundingBox();
 const mouthFace=mouth.geometry.boundingBox.max.z;
 const noseTip=nose.geometry.boundingBox.min.z+nose.position.z;
 const readyDepth=mouthFace+.002-noseTip;
 const seatedDepth=-.001-sections[0][1];
 let angle=0,depth=readyDepth,targetAngle=0,targetDepth=readyDepth,phase='closed';
 let appliedAngle,appliedDepth,appliedOpen,appliedPlug,shadowUpdate=true;
 const apply=()=>{
  // The closed corner is the untouched artist mesh, including its materials and
  // normals. The procedural flap and cutout exist only while the port is open.
  const open=phase!=='closed'||angle!==0;
  if(open!==appliedOpen){bodyOpening.setOpen(open);assembly.visible=open;appliedOpen=open;shadowUpdate=true;}
  if(angle!==appliedAngle){
   hinge.rotation.x=angle;hinge.updateMatrix();
   attachedTip.copy(armTip).applyMatrix4(hinge.matrix);armMiddle.copy(armBase).lerp(attachedTip,.5);armMiddle.z+=.012;
   armTube.update();liftArm.visible=Math.abs(angle)>.01;appliedAngle=angle;shadowUpdate=true;
  }
  const showPlug=phase!=='closed';
  if(showPlug!==appliedPlug){plug.visible=showPlug;cable.visible=showPlug;appliedPlug=showPlug;shadowUpdate=true;}
  if(depth!==appliedDepth){
   plug.position.z=depth;root.updateMatrixWorld(true);
   const start=cablePoints[0].set(.015,-.38,.26);plug.localToWorld(start);
   cablePoints[1].set(start.x-.025,start.y-.22,start.z+.04);
   cablePoints[2].set(start.x-.09,.02,start.z+.25);
   cablePoints[3].set(start.x-.42,.014,start.z+.54);
   cablePoints[4].set(start.x-.70,.014,start.z+.44);
   cableTube.update();appliedDepth=depth;shadowUpdate=true;
  }
 };
 apply();
 return {root,hinge,plug,socket,
  presentConnection(frame){
   phase=frame.seated?'charging':'open';angle=targetAngle=-1.85;
   const approaching=.34+(readyDepth-.34)*frame.approach;
   depth=targetDepth=approaching+(seatedDepth-readyDepth)*frame.insertion;
   statusMaterial.color.set(frame.seated?'#38d485':'#d5dfed');statusMaterial.emissive.copy(statusMaterial.color);apply();
  },
  show(next,reduced){phase=next?.phase||'closed';targetAngle=phase==='closed'?0:-1.85;targetDepth=['charging','stopped','unlocked'].includes(phase)?seatedDepth:readyDepth;
   statusMaterial.color.set(phase==='charging'?'#38d485':phase==='stopped'?'#347bc9':'#d5dfed');statusMaterial.emissive.copy(statusMaterial.color);
   if(reduced||!next){angle=targetAngle;depth=targetDepth;}apply();
  },
  tick(dt,time,reduced){
   const oldAngle=angle,oldDepth=depth;
   const ease=(a,b)=>Math.abs(a-b)<.00001?b:a+(b-a)*(1-Math.exp(-dt*7));
   angle=reduced?targetAngle:ease(angle,targetAngle);depth=reduced?targetDepth:ease(depth,targetDepth);
   const changed=angle!==oldAngle||depth!==oldDepth;if(changed)apply();
   const intensity=phase==='charging'&&!reduced?.55+.3*Math.sin(time/300):.4;
   const lightChanged=statusMaterial.emissiveIntensity!==intensity;statusMaterial.emissiveIntensity=intensity;
   return changed||lightChanged;
  },
  consumeShadowUpdate(){const changed=shadowUpdate;shadowUpdate=false;return changed;},
  getState(){return{portAngle:angle,connectorZ:depth};}
 };
}
