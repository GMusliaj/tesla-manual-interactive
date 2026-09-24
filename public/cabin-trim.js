import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function isReplacedDoorTrim({min,max}) {
  return (max.x<-.63||min.x>.63)&&min.y<.3&&max.y>1.1;
}
export function createCabinTrim(car) {
  const root=new T.Group();root.name='juniper-cabin-trim';car.add(root);
  const white=new T.MeshStandardMaterial({name:'door_white_trim',color:'#d9d6cf',roughness:.87});
  const dark=new T.MeshStandardMaterial({name:'door_black_trim',color:'#171b20',roughness:.88});
  const grey=new T.MeshStandardMaterial({name:'door_fabric',color:'#6f7477',roughness:1});
  const blue=new T.MeshStandardMaterial({name:'door_ambient',color:'#3b82ad',emissive:'#1b628f',emissiveIntensity:.75});
  const silver=new T.MeshStandardMaterial({name:'door_switch_edge',color:'#81898e',roughness:.35,metalness:.5});
  const grille=new T.MeshStandardMaterial({name:'speaker_grille',color:'#292e33',roughness:1});
  const seam=new T.MeshStandardMaterial({name:'door_stitch',color:'#aaa79f',roughness:1});
  function mesh(name,g,m,p,parent=root){const o=new T.Mesh(g,m);o.name=name;if(p)o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(name,size,p,m=dark,r=.015,parent=root){return mesh(name,new RoundedBoxGeometry(...size,3,Math.min(r,...size.map(x=>x/3))),m,p,parent);}
  function line(name,points,r,m,parent=root){return mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),48,r,6,false),m,null,parent);}
  function panel(name,points,side,x,material,depth=.025){
    const vertices=points.map(([z,y])=>new T.Vector2(-side*z,y)),s=new T.Shape();
    for(let i=0;i<vertices.length;i++){
      const p=vertices[i],previous=vertices[(i+vertices.length-1)%vertices.length],next=vertices[(i+1)%vertices.length];
      const before=p.clone().lerp(previous,Math.min(.24,.035/p.distanceTo(previous))),after=p.clone().lerp(next,Math.min(.24,.035/p.distanceTo(next)));
      if(i===0)s.moveTo(before.x,before.y);else s.lineTo(before.x,before.y);s.quadraticCurveTo(p.x,p.y,after.x,after.y);
    }s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:3,steps:1});
    const o=mesh(name,g,material,[side*x,0,0]);o.rotation.y=side*Math.PI/2;return o;
  }
  for(const side of [-1,1])for(const rear of [false,true]){
    const z0=rear?.25:-1.015,z1=rear?1.285:.205,span=z1-z0,at=t=>z0+span*t;
    const prefix=(side<0?'left-':'right-')+(rear?'rear-':'front-');
    panel(prefix+'door-base',[[z0,.47],[at(.07),.335],[at(.86),.335],[z1,.50],[z1,1.13],[at(.16),1.12],[z0,1.02]],side,.758,dark);
    panel(prefix+'white-panel',[[at(.04),.94],[at(.19),1.027],[at(.98),1.022],[at(.97),.67],[at(.77),.64],[at(.2),.675],[at(.06),.75]],side,.727,white);
    panel(prefix+'fabric-insert',[[at(.17),1.095],[at(.97),1.105],[at(.94),.978],[at(.31),.976]],side,.716,grey,.010);
    line(prefix+'ambient-strip',[[side*.711,1.107,at(.19)],[side*.723,1.114,at(.59)],[side*.722,1.12,at(.96)]],.0018,blue);
    line(prefix+'upper-rail',[[side*.757,1.136,z0],[side*.754,1.153,at(.50)],[side*.754,1.155,z1]],.024,dark);
    // The white pull descends diagonally to the padded horizontal armrest.
    line(prefix+'door-pull',[[side*.697,.972,at(.25)],[side*.683,.920,at(.40)],[side*.675,.828,at(.63)],[side*.684,.805,at(.78)]],.024,white);
    box(prefix+'armrest',[.095,.046,span*.46],[side*.697,.787,at(.58)],white,.014);
    line(prefix+'armrest-seam',[[side*.645,.802,at(.37)],[side*.646,.811,at(.59)],[side*.656,.811,at(.78)]],.0007,seam);
    box(prefix+'switch-recess',[.056,.009,.105],[side*.687,.814,at(.72)],dark,.003);
    for(let i=0;i<(rear?1:2);i++)box(prefix+'window-switch',[.020,.007,.028],[side*(.674+i*.022),.821,at(.72)],silver,.002);
    // Oval lower speaker grille and a recessed pocket above its black lower shell.
    const speaker=mesh(prefix+'speaker',new T.CylinderGeometry(.092,.092,.009,48),dark,[side*.711,.547,at(.18)]);speaker.rotation.z=Math.PI/2;
    for(let i=0;i<5;i++){const ring=mesh(prefix+'speaker-ring',new T.TorusGeometry(.028+i*.012,.00055,4,48),grille,[side*.705,.547,at(.18)]);ring.rotation.y=Math.PI/2;}
    panel(prefix+'door-pocket',[[at(.36),.56],[at(.90),.57],[at(.85),.40],[at(.43),.405]],side,.712,dark,.024);
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
