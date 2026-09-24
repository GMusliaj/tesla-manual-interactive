import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Complete disconnected seat islands in the imported cabin, including bolsters.
export function isReplacedSeat({min,max}) {
  return min.y>.54 && max.y<1.42 && min.z>-.56 && max.z<1.38 &&
    (min.x>.09 || max.x<-.09 || min.z>.44);
}
function perforation() {
  const size=64, data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x+8)%16-8,dy=(y+8)%16-8,d=Math.hypot(dx,dy);
    const value=d<1.25?150:d<2.1?217:246,at=(y*size+x)*4;
    data.set([value,value,value,255],at);
  }
  const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;
  map.repeat.set(9,15);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;
  map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=4;map.needsUpdate=true;return map;
}
function smooth(geometry){geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');const result=mergeVertices(geometry,1e-5);result.computeVertexNormals();return result;}
const rounded=(w,h,d,r=.035)=>smooth(new RoundedBoxGeometry(w,h,d,6,r));
export function createCabinSeats(car) {
  const root=new T.Group();root.name='juniper-seats';car.add(root);
  const white=new T.MeshStandardMaterial({name:'seat_white_leather',color:'#dcd9d2',roughness:.84});
  const inset=new T.MeshStandardMaterial({name:'seat_perforated_panel',color:'#dfdcd5',map:perforation(),roughness:.92});
  const dark=new T.MeshStandardMaterial({name:'seat_back_shell',color:'#202327',roughness:.8});
  const seam=new T.MeshStandardMaterial({name:'seat_stitch',color:'#aaa79f',roughness:1});
  const red=new T.MeshStandardMaterial({name:'belt_release',color:'#b9222c',roughness:.7});
  function mesh(name,g,m,p,parent=root){const o=new T.Mesh(g,m);o.name=name;if(p)o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function piping(name,points,parent,closed=false){const clean=points.map(p=>new T.Vector3(...p)).filter((p,i,a)=>!i||p.distanceToSquared(a[i-1])>1e-10);if(closed&&clean[0].distanceToSquared(clean.at(-1))<1e-10)clean.pop();return mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(clean,closed,'centripetal'),96,.0006,4,closed),seam,null,parent);}
  function patch(name, fn, material, parent, nx=28, ny=32){
    const positions=[],uv=[],idx=[];
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){positions.push(...fn(i/nx,j/ny));uv.push(i/nx,j/ny);}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+1,a+nx+2,a,a+nx+2,a+nx+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(name,g,material,null,parent);
  }
  function back(parent,width,height,bottomZ,lean,rear=false){
    // Closed cushion with varying shoulder width, lumbar curvature and side support.
    const front=(t,u)=>bottomZ+lean*t-.015*Math.sin(t*Math.PI)-.032*Math.pow(Math.abs(u),4)*Math.sin(t*Math.PI);
    const half=t=>width*.5*((rear?.98:.83)+(rear?.02:.17)*Math.sin(Math.PI*t*.9));
    const positions=[],uv=[],idx=[],rows=32,around=64;
    for(let j=0;j<=rows;j++)for(let i=0;i<=around;i++){
      const t=j/rows,a=i/around*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const u=Math.sign(c)*Math.pow(Math.abs(c),.6),v=Math.sign(s)*Math.pow(Math.abs(s),.6);
      const end=rear?Math.min(1,Math.sqrt(Math.max(0,t*80)),Math.sqrt(Math.max(0,(1-t)*80))):Math.pow(Math.sin(Math.PI*t),.11),x=half(t)*u*end;
      const f=front(t,u),z=f+.048+.057*v*end;
      positions.push(x,.72+height*t,z);uv.push(i/around,t);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i;idx.push(a,a+around+1,a+1,a+1,a+around+1,a+around+2);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh('seat-back-cushion',g,white,null,parent);
    const panel=(u,v)=>{const t=.10+.77*v,x=(u*2-1)*width*.32*(.89+.11*Math.sin(v*Math.PI));return[x,.72+height*t,front(t,x/half(t))-.0105];};
    // Panel faces forward (-Z); reversing U also gives outward winding.
    patch('seat-back-perforated-panel',(u,v)=>panel(1-u,v),inset,parent);
    const outline=[];for(let i=0;i<=20;i++)outline.push(panel(0,i/20));for(let i=0;i<=20;i++)outline.push(panel(i/20,1));for(let i=0;i<=20;i++)outline.push(panel(1,1-i/20));for(let i=0;i<=20;i++)outline.push(panel(1-i/20,0));piping('seat-back-panel-seam',outline,parent,true);
    if(!rear){
      const shell=mesh('front-seat-dark-back',rounded(width*.89,height*.88,.055,.035),dark,[0,.72+height*.52,bottomZ+lean*.54+.116],parent);shell.rotation.x=lean/height;
      const pocket=mesh('seatback-pocket',rounded(width*.68,.17,.018,.008),dark,[0,.86,bottomZ+lean*.28+.16],parent);pocket.rotation.x=.18;
    }
  }
  function headrest(parent,width,y,z){
    const g=rounded(width,.232,.125,.055),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*(1-.13*(y/.232+.5)));}g.computeVertexNormals();
    const head=mesh('white-headrest',g,white,[0,y,z],parent);
    const points=[];
    for(let i=0;i<64;i++){
      const a=i/64*Math.PI*2,xx=width*.37*Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.6),yy=.091*Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.6);
      const ray=new T.Raycaster(new T.Vector3(xx,yy,-.3),new T.Vector3(0,0,1));const temp=new T.Mesh(g,white);temp.updateMatrixWorld();const hit=ray.intersectObject(temp)[0];
      if(hit)points.push([xx,y+yy,z+hit.point.z-.0008]);
    }
    piping('headrest-seam',points,parent,true);return head;
  }
  function cushion(parent,width,z,length,rear=false){
    const height=rear?.72:.65;
    const g=rounded(width,.12,length,.044),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),zz=p.getZ(i);if(p.getY(i)>0)p.setY(i,p.getY(i)+.028*Math.pow(Math.abs(x)/(width/2),3)-.014*Math.exp(-Math.pow(x/(width*.33),2))*Math.cos(zz/length*Math.PI));}g.computeVertexNormals();
    mesh('seat-cushion',g,white,[0,height,z],parent);
    const surface=new T.Mesh(g,white);surface.updateMatrixWorld();
    const panel=(u,v)=>{const zz=(v-.5)*length*.76,x=(u*2-1)*width*.32;const hit=new T.Raycaster(new T.Vector3(x,.3,zz),new T.Vector3(0,-1,0)).intersectObject(surface)[0];return[x,height+(hit?.point.y||.05)+.0009,z+zz];};
    patch('seat-cushion-perforated-panel',(u,v)=>panel(u,1-v),inset,parent);
    const pts=[];for(let i=0;i<=20;i++)pts.push(panel(0,i/20));for(let i=0;i<=20;i++)pts.push(panel(i/20,1));for(let i=0;i<=20;i++)pts.push(panel(1,1-i/20));for(let i=0;i<=20;i++)pts.push(panel(1-i/20,0));piping('seat-cushion-seam',pts,parent,true);
  }
  for(const x of [-.39,.39]){
    const seat=new T.Group();seat.name=x<0?'front-left-seat':'front-right-seat';seat.position.x=x;root.add(seat);
    cushion(seat,.49,-.23,.55);back(seat,.45,.50,.012,.165);headrest(seat,.238,1.332,.211);
    mesh('seat-pedestal',rounded(.42,.13,.43,.025),dark,[0,.527,-.12],seat);
    const buckle=mesh('seatbelt-buckle',rounded(.027,.054,.042,.007),dark,[x<0?.277:-.277,.72,.035],seat);buckle.rotation.z=x<0?-.20:.20;
    mesh('seatbelt-red-release',rounded(.021,.008,.028,.002),red,[x<0?.277:-.277,.749,.035],seat);
  }
  mesh('rear-bench-connected-back',rounded(1.32,.40,.08,.035),white,[0,.947,1.11]);
  for(const [x,width]of [[-.445,.45],[0,.415],[.445,.45]]){
    const seat=new T.Group();seat.name=x===0?'rear-center-seat':x<0?'rear-left-seat':'rear-right-seat';seat.position.x=x;root.add(seat);
    cushion(seat,width,.705,.50,true);back(seat,width,.52,.943,.13,true);headrest(seat,x===0?.20:.235,x===0?1.235:1.333,1.13);
    if(x!==0){mesh('rear-belt-buckle',rounded(.034,.026,.052,.006),dark,[x<0?.20:-.20,.785,.866],seat);mesh('rear-belt-release',rounded(.021,.008,.033,.002),red,[x<0?.20:-.20,.801,.866],seat);}
  }
  // Rear outer belts are anchored at the shoulder and run down to the cushion.
  for(const x of [-.645,.645]){
    const web=patch('rear-seatbelt',(u,v)=>[x+(u-.5)*.036,.80+.52*v,.92+.13*v],dark,root,2,10);web.material=dark.clone();web.material.side=T.DoubleSide;
  }
  return {root,white,inset,dark};
}
