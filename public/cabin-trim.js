import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function isReplacedDoorTrim({min,max}) {
  return (max.x<-.63||min.x>.63)&&min.y<.3&&max.y>1.1;
}
export function createCabinTrim(car) {
  const root=new T.Group();root.name='juniper-cabin-trim';car.add(root);
  const white=new T.MeshStandardMaterial({name:'door_white_trim',color:'#dad7d2',roughness:.75});
  const dark=new T.MeshStandardMaterial({name:'door_black_trim',color:'#242527',roughness:.84});
  const grainData=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=118+((x*19+y*43+x*y*7)%31)+(((x%6<3)===(y%6<3))?9:-9);grainData.set([v,v,v,255],i);}
  const grain=new T.DataTexture(grainData,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(24,4);grain.needsUpdate=true;
  const grey=new T.MeshStandardMaterial({name:'door_fabric',color:'#74716d',roughness:1,bumpMap:grain,bumpScale:.0003});
  const blue=new T.MeshStandardMaterial({name:'door_ambient',color:'#356482',emissive:'#244d6b',emissiveIntensity:.42});
  const silver=new T.MeshStandardMaterial({name:'door_switch_edge',color:'#81898e',roughness:.35,metalness:.5});
  const grille=new T.MeshStandardMaterial({name:'speaker_grille',color:'#292e33',roughness:1});
  const seam=new T.MeshStandardMaterial({name:'door_stitch',color:'#aaa79f',roughness:1});
  function mesh(name,g,m,p,parent=root){const o=new T.Mesh(g,m);o.name=name;if(p)o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(name,size,p,m=dark,r=.015,parent=root){return mesh(name,new RoundedBoxGeometry(...size,3,Math.min(r,...size.map(x=>x/3))),m,p,parent);}
  function line(name,points,r,m,parent=root){return mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),48,r,6,false),m,null,parent);}
  function panel(name,points,side,x,material,depth=.016){
    const vertices=points.map(([z,y])=>new T.Vector2(-side*z,y)),s=new T.Shape();
    for(let i=0;i<vertices.length;i++){
      const p=vertices[i],previous=vertices[(i+vertices.length-1)%vertices.length],next=vertices[(i+1)%vertices.length];
      const before=p.clone().lerp(previous,Math.min(.24,.035/p.distanceTo(previous))),after=p.clone().lerp(next,Math.min(.24,.035/p.distanceTo(next)));
      if(i===0)s.moveTo(before.x,before.y);else s.lineTo(before.x,before.y);s.quadraticCurveTo(p.x,p.y,after.x,after.y);
    }s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:5,steps:1,curveSegments:16});
    // Give the card a shallow crown towards the armrest; its trim isn't a
    // flat sheet, and the thin recess above it needs to catch a soft shadow.
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i);p.setZ(i,p.getZ(i)-.010*Math.exp(-Math.pow((y-.84)/.17,2)));}g.computeVertexNormals();
    const o=mesh(name,g,material,[side*x,0,0]);o.rotation.y=side*Math.PI/2;return o;
  }
  function sculptedPull(name,side,at){
    const path=new T.CatmullRomCurve3([[side*.698,.965,at(.23)],[side*.677,.929,at(.33)],[side*.675,.853,at(.51)],[side*.688,.797,at(.68)],[side*.706,.792,at(.85)],[side*.722,.801,at(.94)]].map(p=>new T.Vector3(...p)),false,'centripetal');
    const positions=[],uv=[],indices=[],rows=72,ring=24;
    for(let j=0;j<=rows;j++){
      const t=j/rows,p=path.getPoint(t),tangent=path.getTangent(t).normalize(),vertical=new T.Vector3(0,tangent.z,-tangent.y).normalize();
      const shoulder=T.MathUtils.smoothstep(t,.25,.72),end=Math.min(1,Math.sqrt(t*30+.06),Math.sqrt((1-t)*30+.06));
      const width=(.027+.020*shoulder)*end,height=(.014+.004*shoulder)*end;
      for(let i=0;i<=ring;i++){const a=i/ring*Math.PI*2,c=Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.72),s=Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.72);positions.push(p.x+width*c,p.y+vertical.y*height*s,p.z+vertical.z*height*s);uv.push(t,i/ring);}
    }
    for(let j=0;j<rows;j++)for(let i=0;i<ring;i++){const a=j*(ring+1)+i,b=a+ring+1;indices.push(a,a+1,b,a+1,b+1,b);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(name,g,white);
  }
  for(const side of [-1,1])for(const rear of [false,true]){
    const z0=rear?.25:-1.015,z1=rear?1.285:.205,span=z1-z0,at=t=>z0+span*t;
    const prefix=(side<0?'left-':'right-')+(rear?'rear-':'front-');
    panel(prefix+'door-base',[[z0,.47],[at(.07),.335],[at(.86),.335],[z1,.50],[z1,1.13],[at(.16),1.12],[z0,1.02]],side,.758,dark);
    panel(prefix+'white-panel',[[at(.05),.973],[at(.21),1.043],[at(.97),.988],[at(.97),.693],[at(.77),.653],[at(.2),.683],[at(.05),.777]],side,.734,white);
    panel(prefix+'fabric-recess',[[at(.15),1.105],[at(.99),1.113],[at(.97),.981],[at(.31),1.020]],side,.733,dark,.008);
    panel(prefix+'fabric-insert',[[at(.17),1.095],[at(.97),1.104],[at(.96),.994],[at(.32),1.031]],side,.729,grey,.008);
    line(prefix+'ambient-strip',[[side*.721,1.103,at(.19)],[side*.731,1.111,at(.59)],[side*.730,1.117,at(.96)]],.0011,blue);
    line(prefix+'upper-rail',[[side*.757,1.128,z0],[side*.754,1.146,at(.50)],[side*.754,1.149,z1]],.028,dark);
    sculptedPull(prefix+'door-pull',side,at);
    line(prefix+'armrest-seam',[[side*.641,.823,at(.57)],[side*.648,.796,at(.69)],[side*.662,.795,at(.82)],[side*.692,.804,at(.92)]],.00048,seam);
    box(prefix+'switch-recess',[.045,.009,.094],[side*.694,.811,at(.73)],dark,.005);
    for(let i=0;i<(rear?1:2);i++)box(prefix+'window-switch',[.015,.004,.030],[side*(.684+i*.019),.817,at(.73)],silver,.0015);
    const release=box(prefix+'door-release',[.008,.018,.043],[side*.690,.957,at(.26)],dark,.003);release.rotation.x=-.38;
    // Oval lower speaker grille and a recessed pocket above its black lower shell.
    const speaker=mesh(prefix+'speaker',new T.CylinderGeometry(.092,.092,.009,48),dark,[side*.711,.547,at(.18)]);speaker.rotation.z=Math.PI/2;
    for(let i=0;i<5;i++){const ring=mesh(prefix+'speaker-ring',new T.TorusGeometry(.028+i*.012,.00055,4,48),grille,[side*.705,.547,at(.18)]);ring.rotation.y=Math.PI/2;}
    panel(prefix+'door-pocket',[[at(.36),.585],[at(.90),.595],[at(.87),.429],[at(.47),.408]],side,.731,dark,.024);
    line(prefix+'door-pocket-lip',[[side*.707,.565,at(.38)],[side*.699,.524,at(.57)],[side*.706,.524,at(.79)],[side*.723,.578,at(.90)]],.010,dark);
  }
  // Rear passenger screen is attached to the console, facing the second row.
  const rear=new T.Group();rear.name='rear-console-display';rear.position.set(0,.655,.314);rear.rotation.x=-.20;root.add(rear);
  box('rear-console-white-surround',[.224,.240,.062],[0,-.01,0],white,.023,rear);
  box('rear-screen-bezel',[.190,.124,.012],[0,.03,.036],dark,.008,rear);
  let texture=null;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const c=canvas.getContext('2d');
    c.fillStyle='#e8eced';c.fillRect(0,0,640,360);c.fillStyle='#222b31';c.font='36px sans-serif';c.fillText('21.0°',52,61);c.fillText('21.0°',462,61);
    for(const x of [150,390]){c.fillStyle='#b4bec3';c.beginPath();c.roundRect(x,112,94,123,26);c.fill();c.fillStyle='#617580';c.beginPath();c.roundRect(x+9,222,105,34,15);c.fill();c.strokeStyle='#3f8eae';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.moveTo(x+29+i*19,200);c.quadraticCurveTo(x+14+i*19,180,x+34+i*19,157);c.stroke();}}
    c.fillStyle='#171d24';c.fillRect(0,307,640,53);c.fillStyle='#dfe5e8';for(const x of [70,190,320,450,570]){c.beginPath();c.arc(x,334,9,0,Math.PI*2);c.fill();}
    texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  }
  const screen=mesh('rear-screen-surface',new T.PlaneGeometry(.179,.103),new T.MeshBasicMaterial({name:'rear_screen_illustration',map:texture,color:'#ffffff',toneMapped:false}),[0,.033,.043],rear);screen.castShadow=false;
  box('rear-air-vent',[.174,.036,.014],[0,-.074,.035],dark,.004,rear);
  for(let i=0;i<3;i++)box('rear-vent-vane',[.161,.002,.007],[0,-.084+i*.010,.044],grey,.0005,rear);
  for(const x of [-.027,.027])box('rear-usb-c',[.013,.006,.002],[x,-.112,.036],dark,.001,rear);
  return {root,rear,white};
}
