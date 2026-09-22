import * as T from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Photo-derived proportions in metres; +Z faces the driver. Reference images
// remain external. All surfaces, grain and markings below are generated here.
export function createSteeringWheel(parent) {
  const wheel = new T.Group();
  wheel.name = 'steering-wheel'; wheel.position.set(-.4, 1.105, -.462); wheel.rotation.x = -.20;
  parent.add(wheel);
  const grainData = new Uint8Array(128 * 128 * 4);
  for (let y=0;y<128;y++) for (let x=0;x<128;x++) {
    const value=119+((x*53+y*97+x*y*13)%19);
    grainData.set([value,value,value,255],(y*128+x)*4);
  }
  const grain = new T.DataTexture(grainData,128,128);
  grain.wrapS=grain.wrapT=T.RepeatWrapping; grain.repeat.set(5,5);
  grain.generateMipmaps=true; grain.minFilter=T.LinearMipmapLinearFilter; grain.needsUpdate=true;
  const leather = new T.MeshStandardMaterial({name:'steering_leather',color:'#393b3e',roughness:.57,bumpMap:grain,bumpScale:.000065});
  const pad = new T.MeshStandardMaterial({name:'steering_airbag_cover',color:'#505255',roughness:.72,bumpMap:grain,bumpScale:.00007});
  const controls = new T.MeshStandardMaterial({name:'steering_controls',color:'#45484d',roughness:.43,metalness:.08});
  const black = new T.MeshStandardMaterial({name:'steering_recess',color:'#121518',roughness:.84});
  const silver = new T.MeshStandardMaterial({name:'steering_metal_accent',color:'#b6bec5',roughness:.3,metalness:.48});
  const thread = new T.MeshStandardMaterial({name:'steering_thread',color:'#48494c',roughness:1});
  function mesh(name,geometry,material,position) {
    const object=new T.Mesh(geometry,material); object.name=name;
    if(position)object.position.set(...position);
    object.castShadow=object.receiveShadow=true; wheel.add(object); return object;
  }
  function tube(name,points,radius,material,closed=false) {
    return mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal'),128,radius,6,closed),material);
  }
  function extrusion(name,shape,material,z,depth=.008,bevel=.0015) {
    let geometry=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:6,curveSegments:24});
    geometry.deleteAttribute('normal'); geometry=mergeVertices(geometry,1e-6); geometry.computeVertexNormals();
    return mesh(name,geometry,material,[0,0,z]);
  }

  const rimPoints=[[0,.170,0],[.107,.133,0],[.163,.050,0],[.162,-.055,0],[.113,-.130,0],[.053,-.153,0],[0,-.156,0],[-.053,-.153,0],[-.113,-.130,0],[-.162,-.055,0],[-.163,.050,0],[-.107,.133,0]];
  const rimCurve=new T.CatmullRomCurve3(rimPoints.map(p=>new T.Vector3(...p)),true,'centripetal');
  // Oval grip section with depth behind the face, rounded thumb transitions.
  const positions=[],uv=[],indices=[],rings=192,sides=24;
  for(let i=0;i<=rings;i++) {
    const p=rimCurve.getPoint(i/rings),t=rimCurve.getTangent(i/rings),out=new T.Vector3(t.y,-t.x,0).normalize();
    const thumb=.0018*Math.exp(-Math.pow((Math.abs(p.x)-.16)/.025,2))*Math.exp(-Math.pow((p.y-.035)/.05,2));
    for(let j=0;j<=sides;j++) {
      const a=j/sides*Math.PI*2,r=.0148+thumb;
      positions.push(p.x+out.x*Math.cos(a)*r,p.y+out.y*Math.cos(a)*r,Math.sin(a)*.020);
      uv.push(i/rings*5,j/sides);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const rimGeometry=new T.BufferGeometry();rimGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));rimGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));rimGeometry.setIndex(indices);rimGeometry.computeVertexNormals();
  // UV seams need coincident normals too; otherwise a dark join appears at
  // twelve o'clock even though the leather geometry is continuous.
  const normals=rimGeometry.attributes.normal,normal=new T.Vector3();
  const join=(a,b)=>{normal.fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,normal.x,normal.y,normal.z);normals.setXYZ(b,normal.x,normal.y,normal.z);};
  for(let i=0;i<=rings;i++)join(i*(sides+1),i*(sides+1)+sides);
  for(let j=0;j<=sides;j++)join(j,rings*(sides+1)+j);
  mesh('steering-rim',rimGeometry,leather);
  tube('steering-rim-inner-stitch',rimPoints.map(([x,y])=>[x*.93,y*.93,-.009]),.0003,thread,true);
  const column=mesh('steering-column',new T.CylinderGeometry(.036,.044,.125,32),black,[0,-.004,-.080]);column.rotation.x=Math.PI/2;
  tube('turn-signal-stalk',[[-.035,-.025,-.076],[-.117,-.030,-.071],[-.185,-.036,-.058]],.006,black);
  const stalkTip=new T.Shape();stalkTip.moveTo(-.204,-.045);stalkTip.quadraticCurveTo(-.211,-.045,-.211,-.038);stalkTip.lineTo(-.206,-.029);stalkTip.lineTo(-.174,-.030);stalkTip.lineTo(-.174,-.045);stalkTip.closePath();
  extrusion('turn-signal-stalk-tip',stalkTip,black,-.065,.015,.003);

  // A continuous silver outline follows each curved control wing.
  for(const side of [-1,1]) {
    const s=new T.Shape(),x=v=>side*v;
    s.moveTo(x(.049),.053);s.quadraticCurveTo(x(.091),.053,x(.130),.034);
    s.quadraticCurveTo(x(.148),.025,x(.153),.012);s.lineTo(x(.155),-.013);
    s.quadraticCurveTo(x(.131),-.021,x(.095),-.029);s.lineTo(x(.054),-.033);s.closePath();
    const trim=extrusion(side<0?'steering-left-spoke':'steering-right-spoke',s,silver,-.002,.012,.0012);
    // Shrink towards the wing's centre to leave a 1 mm brushed border.
    const face=extrusion('steering-control-face',s,controls,.010,.002,.0007);
    face.geometry.translate(-side*.103,-.010,0);face.geometry.scale(.965,.95,1);face.geometry.translate(side*.103,.010,0);
    trim.receiveShadow=false;face.receiveShadow=false;
  }
  const lower=new T.Shape();
  lower.moveTo(-.055,-.024);lower.quadraticCurveTo(-.061,-.045,-.049,-.082);
  lower.lineTo(-.024,-.144);lower.quadraticCurveTo(-.020,-.153,-.010,-.153);
  lower.lineTo(.010,-.153);lower.quadraticCurveTo(.020,-.153,.024,-.144);
  lower.lineTo(.049,-.082);lower.quadraticCurveTo(.061,-.045,.055,-.024);lower.closePath();
  const opening=new T.Path();opening.moveTo(-.035,-.047);opening.lineTo(.035,-.047);
  opening.quadraticCurveTo(.033,-.074,.021,-.105);opening.lineTo(.010,-.133);
  opening.quadraticCurveTo(.007,-.138,0,-.138);opening.quadraticCurveTo(-.007,-.138,-.010,-.133);
  opening.lineTo(-.021,-.105);opening.quadraticCurveTo(-.033,-.074,-.035,-.047);lower.holes.push(opening);
  extrusion('steering-lower-spoke',lower,silver,-.007,.009,.0018).position.y=.011;
  const lowerFace=extrusion('steering-lower-spoke-inset',lower,controls,.003,.001,.0006);
  lowerFace.geometry.scale(.925,.973,1);lowerFace.geometry.translate(0,-.001,0);
  lowerFace.position.y=.011;
  tube('steering-lower-metal-edge',[[-.052,-.032,.007],[-.046,-.080,.007],[-.023,-.140,.007],[-.012,-.149,.007],[.012,-.149,.007],[.023,-.140,.007],[.046,-.080,.007],[.052,-.032,.007]],.00125,silver).position.y=.011;

  // The outer padded hub and inset airbag are distinct curved surfaces.
  const hub=new T.Shape();hub.moveTo(-.051,.063);hub.quadraticCurveTo(0,.069,.051,.063);
  hub.quadraticCurveTo(.067,.061,.066,.046);hub.quadraticCurveTo(.061,-.014,.045,-.057);
  hub.quadraticCurveTo(.039,-.071,.024,-.074);hub.quadraticCurveTo(0,-.078,-.024,-.074);
  hub.quadraticCurveTo(-.039,-.071,-.045,-.057);hub.quadraticCurveTo(-.061,-.014,-.066,.046);hub.quadraticCurveTo(-.067,.061,-.051,.063);
  const hubMesh=extrusion('steering-horn-pad',hub,leather,.006,.026,.005);
  // Convex centre adds a continuous highlight across the shoulder.
  const hp=hubMesh.geometry.attributes.position;
  for(let i=0;i<hp.count;i++)if(hp.getZ(i)>.025){const x=hp.getX(i),y=hp.getY(i);hp.setZ(i,hp.getZ(i)+.005*Math.max(0,1-(x/.075)**2-((y+.004)/.084)**2));}
  hubMesh.geometry.computeVertexNormals();
  const inset=new T.Shape();inset.moveTo(-.039,.045);inset.quadraticCurveTo(0,.051,.039,.045);
  inset.quadraticCurveTo(.046,.043,.044,.033);inset.lineTo(.033,-.039);
  inset.quadraticCurveTo(.030,-.050,.021,-.051);inset.quadraticCurveTo(0,-.055,-.021,-.051);
  inset.quadraticCurveTo(-.030,-.050,-.033,-.039);inset.lineTo(-.044,.033);inset.quadraticCurveTo(-.046,.043,-.039,.045);
  extrusion('airbag-panel-seam',inset,black,.040,.001,.001);
  const insert=extrusion('airbag-inset-panel',inset,pad,.041,.001,.0007);insert.geometry.scale(.976,.976,1);
  if(typeof document!=='undefined') {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d');
    c.fillStyle='#202225';c.textAlign='center';c.font='400 64px sans-serif';c.fillText('T E S L A',384,114);
    c.font='26px sans-serif';c.fillText('AIRBAG',384,228);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const label=mesh('steering-pad-wordmark',new T.PlaneGeometry(.071,.024),new T.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.95}),[0,.024,.0438]);label.castShadow=false;
  }
  for(const x of [-.110,.110]) {
    const y=.007,z=.018;
    const well=mesh('scroll-wheel-recess',new T.CircleGeometry(.0093,40),black,[x,y,z]);well.scale.x=1.12;well.castShadow=false;
    const roller=mesh(x<0?'left-scroll-wheel':'right-scroll-wheel',new T.CylinderGeometry(.007,.007,.013,40),controls,[x,y,.0165]);roller.rotation.z=Math.PI/2;
    for(let i=-4;i<=4;i++) {
      const ridge=mesh('scroll-grip-ridge',new T.TorusGeometry(.00705,.00016,4,24),thread,[x+i*.00135,y,.0165]);ridge.rotation.y=Math.PI/2;ridge.castShadow=false;
    }
    for(const side of [-1,1]) {
      const cap=mesh('scroll-wheel-end',new T.CylinderGeometry(.0068,.0068,.0008,32),silver,[x+side*.0066,y,.0165]);cap.rotation.z=Math.PI/2;cap.castShadow=false;
    }
    if(typeof document!=='undefined') {
      const canvas=document.createElement('canvas');canvas.width=384;canvas.height=256;const c=canvas.getContext('2d');
      c.strokeStyle='#c6cbd0';c.fillStyle='#c6cbd0';c.lineWidth=4;c.lineCap='round';
      if(x<0) {
        for(const yy of [92,174]){c.beginPath();c.moveTo(65,yy-9);c.lineTo(43,yy);c.lineTo(65,yy+9);c.stroke();}
        c.strokeRect(54,38,23,9);c.beginPath();c.arc(318,151,12,Math.PI*.3,Math.PI*1.7);c.stroke();
        c.beginPath();c.moveTo(306,145);c.lineTo(303,157);c.lineTo(315,157);c.stroke();
      } else {
        c.beginPath();c.arc(192,33,11,0,Math.PI*2);c.stroke();
        c.beginPath();c.roundRect(310,131,11,22,5);c.stroke();c.beginPath();c.arc(315,145,12,0,Math.PI);c.moveTo(315,157);c.lineTo(315,169);c.stroke();
        c.beginPath();c.moveTo(59,144);c.lineTo(78,144);c.moveTo(68,135);c.lineTo(68,153);c.stroke();
      }
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      const symbols=mesh('steering-control-symbols',new T.PlaneGeometry(.055,.035),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),[x,y+.001,.019]);symbols.castShadow=false;
    }
  }
  return wheel;
}
