import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function isReplacedSeat({min,max}) {
  return min.y>.54 && max.y<1.42 && min.z>-.56 && max.z<1.38 &&
    (min.x>.09 || max.x<-.09 || min.z>.44);
}
function perforation() {
  // Submillimetre holes are a restrained texture, never a grid of dark studs.
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x+8)%16-8,dy=(y+8)%16-8,d=Math.hypot(dx,dy);
    const grain=((x*17+y*31)%7)/7;
    const value=Math.round((d<.85?217:d<1.45?237:251)-grain*2),at=(y*size+x)*4;
    data.set([value,value,value,255],at);
  }
  const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;
  map.repeat.set(13,18);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;
  map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;return map;
}
function smooth(geometry){geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');const result=mergeVertices(geometry,1e-5);result.computeVertexNormals();return result;}
const rounded=(w,h,d,r=.015)=>smooth(new RoundedBoxGeometry(w,h,d,5,r));

// A polar sampling of a closed spline supports continuous padded surfaces. The
// edge rolls into the back, rather than joining flat boxes with a hard bevel.
function outline(points){
  const center=new T.Vector2(points.reduce((a,p)=>a+p[0],0)/points.length,points.reduce((a,p)=>a+p[1],0)/points.length);
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],0)),true,'centripetal');
  const samples=curve.getSpacedPoints(512).slice(0,-1).map(p=>({a:Math.atan2(p.y-center.y,p.x-center.x),r:Math.hypot(p.x-center.x,p.y-center.y)})).sort((a,b)=>a.a-b.a);
  const sample=i=>{const turns=Math.floor(i/samples.length),s=samples[(i%samples.length+samples.length)%samples.length];return{a:s.a+turns*Math.PI*2,r:s.r};};
  const radius=a=>{
    while(a<samples[0].a)a+=Math.PI*2;while(a>samples[0].a+Math.PI*2)a-=Math.PI*2;
    let lo=0,hi=samples.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].a<a)lo=mid;else hi=mid;}
    const zero=sample(lo-1),one=sample(lo),two=sample(lo+1),three=sample(lo+2),span=two.a-one.a,t=(a-one.a)/span;
    const before=(two.r-zero.r)/(two.a-zero.a),after=(three.r-one.r)/(three.a-one.a);
    return (2*t*t*t-3*t*t+1)*one.r+(t*t*t-2*t*t+t)*span*before+(-2*t*t*t+3*t*t)*two.r+(t*t*t-t*t)*span*after;
  };
  return {center,point:(a,r=1)=>{const d=radius(a)*r;return[center.x+Math.cos(a)*d,center.y+Math.sin(a)*d];},fraction:(x,y)=>Math.min(1,Math.hypot(x-center.x,y-center.y)/radius(Math.atan2(y-center.y,x-center.x)))};
}
export function createCabinSeats(car) {
  const root=new T.Group();root.name='juniper-seats';car.add(root);
  const white=new T.MeshStandardMaterial({name:'seat_white_leather',color:'#dad7d2',roughness:.69});
  const inset=new T.MeshStandardMaterial({name:'seat_perforated_panel',color:'#dad7d2',map:perforation(),roughness:.76});
  const dark=new T.MeshStandardMaterial({name:'seat_back_shell',color:'#24262a',roughness:.78});
  const seam=new T.MeshStandardMaterial({name:'seat_stitch',color:'#b5b0a8',roughness:.91});
  const webbing=new T.MeshStandardMaterial({name:'seatbelt_webbing',color:'#292a2d',roughness:.94,side:T.DoubleSide});
  const red=new T.MeshStandardMaterial({name:'belt_release',color:'#8f1821',roughness:.78});
  function mesh(name,g,m,p,parent=root){const o=new T.Mesh(g,m);o.name=name;if(p)o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function piping(name,points,parent,closed=true,radius=.00042){return mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal'),128,radius,4,closed),seam,null,parent);}
  function disk(name,shape,fn,material,parent,normal,rows=32){
    const positions=[],uv=[],idx=[],around=name.startsWith('rear-bench-')?256:128;
    if(name.startsWith('rear-bench-'))rows=48;
    const center=shape.point(0,0);positions.push(...fn(...center));uv.push(center[0]/.34,center[1]/.46);
    for(let j=1;j<=rows;j++)for(let i=0;i<around;i++){
      const a=i/around*Math.PI*2,r=Math.sin(j/rows*Math.PI*.5),[x,y]=shape.point(a,r);positions.push(...fn(x,y));uv.push(x/.34,y/.46);
    }
    for(let i=0;i<around;i++)idx.push(0,1+i,1+(i+1)%around);
    for(let j=1;j<rows;j++)for(let i=0;i<around;i++){const a=1+(j-1)*around+i,b=1+(j-1)*around+(i+1)%around,c=1+j*around+i,d=1+j*around+(i+1)%around;idx.push(a,c,d,a,d,b);}
    const a=new T.Vector3().fromArray(positions,idx[0]*3),b=new T.Vector3().fromArray(positions,idx[1]*3),c=new T.Vector3().fromArray(positions,idx[2]*3);
    if(b.sub(a).cross(c.sub(a)).dot(new T.Vector3(...normal))<0)for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    // Shade the padded equation itself. Radial triangles have uneven aspect
    // ratios and their averaged face normals otherwise leave visible spokes.
    const normals=g.attributes.normal,expected=new T.Vector3(...normal),step=.00001;
    for(let i=0;i<1+(rows-1)*around;i++){
      const x=uv[i*2]*.34,y=uv[i*2+1]*.46;
      const dx=new T.Vector3(...fn(x+step,y)).sub(new T.Vector3(...fn(x-step,y)));
      const dy=new T.Vector3(...fn(x,y+step)).sub(new T.Vector3(...fn(x,y-step)));
      const n=dx.cross(dy).normalize();if(n.dot(expected)<0)n.negate();normals.setXYZ(i,n.x,n.y,n.z);
    }
    return mesh(name,g,material,null,parent);
  }
  function padded(name,points,depth,base,map,parent,material=white){
    const shape=outline(points);
    const face=(x,y)=>base(x,y)+depth*.5*(1-Math.sqrt(Math.max(0,1-Math.pow(shape.fraction(x,y),14))));
    const back=(x,y)=>base(x,y)+depth-depth*.5*(1-Math.sqrt(Math.max(0,1-Math.pow(shape.fraction(x,y),14))));
    const surface=disk(name,shape,(x,y)=>map(x,y,face(x,y)),material,parent,map.normal);
    disk(name+'-reverse',shape,(x,y)=>map(x,y,back(x,y)),material,parent,map.normal.map(n=>-n));
    return {shape,face,back,surface,map};
  }
  const backMap=(x,y,z)=>[x,y,z];backMap.normal=[0,0,-1];
  const baseMap=(x,y,z)=>[x,-z,y];baseMap.normal=[0,1,0];
  function insert(name,points,body,material,parent){
    const shape=outline(points),border=Array.from({length:96},(_,i)=>shape.point(i/96*Math.PI*2));
    const source=body.surface.geometry,sourcePosition=source.attributes.position,sourceNormal=source.attributes.normal,sourceUV=source.attributes.uv;
    const positions=[],normals=[],uv=[],normalOffset=new T.Vector3(...body.map.normal).multiplyScalar(.00045);
    // Clip the already triangulated cushion into an inset. Independently sampling
    // the same curved equation produces crossing triangles and visible flicker.
    for(let ti=0;ti<source.index.count;ti+=3){
      let polygon=Array.from({length:3},(_,j)=>{const at=source.index.getX(ti+j);return[sourceUV.getX(at)*.34,sourceUV.getY(at)*.46,sourcePosition.getX(at),sourcePosition.getY(at),sourcePosition.getZ(at),sourceNormal.getX(at),sourceNormal.getY(at),sourceNormal.getZ(at)];});
      for(let edge=0;edge<border.length&&polygon.length;edge++){
        const a=border[edge],b=border[(edge+1)%border.length],cross=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
        const clipped=[];
        for(let j=0;j<polygon.length;j++){
          const from=polygon[j],to=polygon[(j+1)%polygon.length],one=cross(from),two=cross(to);
          if(one>=-1e-9)clipped.push(from);
          if((one>=0)!==(two>=0)){const t=one/(one-two);clipped.push(from.map((value,k)=>T.MathUtils.lerp(value,to[k],t)));}
        }
        polygon=clipped;
      }
      for(let j=1;j<polygon.length-1;j++)for(const vertex of [polygon[0],polygon[j],polygon[j+1]]){
        positions.push(vertex[2]+normalOffset.x,vertex[3]+normalOffset.y,vertex[4]+normalOffset.z);
        const n=new T.Vector3(vertex[5],vertex[6],vertex[7]).normalize();normals.push(n.x,n.y,n.z);uv.push(vertex[0]/.34,vertex[1]/.46);
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    mesh(name,geometry,material,null,parent);
    const ray=new T.Raycaster(),normal=new T.Vector3(...body.map.normal),localSurface=new T.Mesh(source,body.surface.material);
    // Stitching uses the same physical surface, including the flattened triangle
    // faces near the rolled outer edge.
    const fn=(x,y)=>{const point=new T.Vector3(...body.map(x,y,body.face(x,y))).addScaledVector(normal,.05);ray.set(point,normal.clone().negate());const hit=ray.intersectObject(localSurface)[0];return hit?hit.point.addScaledVector(normal,.0006).toArray():body.map(x,y,body.face(x,y)-.0006);};
    piping(name.includes('cushion')?'seat-cushion-seam':'seat-back-panel-seam',border.map(([x,y])=>fn(x,y)),parent);
  }
  // Mapping functions carry the expected normal; wrapped mappings retain it.
  function seatHead(parent,width,y,z){
    const map=(x,yy,zz)=>[x,y+yy,zz];map.normal=[0,0,-1];
    const pts=[[-width*.35,-.104],[-width*.49,-.060],[-width*.48,.037],[-width*.35,.104],[0,.117],[width*.35,.104],[width*.48,.037],[width*.49,-.060],[width*.35,-.104],[0,-.112]];
    const body=padded('white-headrest',pts,.113,(x,yy)=>z-.055-.011*Math.cos(yy/.24*Math.PI),map,parent);
    const seamPoints=Array.from({length:96},(_,i)=>{const[x,yy]=body.shape.point(i/96*Math.PI*2,.90);return map(x,yy,body.face(x,yy)-.0005);});
    piping('headrest-seam',seamPoints,parent);return body.surface;
  }
  for(const x of [-.39,.39]){
    const seat=new T.Group();seat.name=x<0?'front-left-seat':'front-right-seat';seat.position.x=x;root.add(seat);
    const backOutline=[[-.17,.70],[-.22,.77],[-.229,.89],[-.215,1.03],[-.191,1.16],[-.151,1.237],[0,1.253],[.151,1.237],[.191,1.16],[.215,1.03],[.229,.89],[.22,.77],[.17,.70],[0,.686]];
    const backBase=(xx,y)=>.015+.31*(y-.72)-.039*Math.exp(-Math.pow((y-.86)/.11,2))-.045*Math.pow(Math.abs(xx)/.23,2)*Math.sin(T.MathUtils.clamp((y-.70)/.54,0,1)*Math.PI);
    const back=padded('seat-back-cushion',backOutline,.090,backBase,backMap,seat);
    insert('seat-back-perforated-panel',[[-.114,.761],[-.145,.80],[-.158,.98],[-.139,1.082],[-.103,1.112],[0,1.12],[.103,1.112],[.139,1.082],[.158,.98],[.145,.80],[.114,.761],[0,.75]],back,inset,seat);
    // A dark, tapered wrap hugs the actual rear cushion profile.
    const shellShape=outline(backOutline.map(([xx,y])=>[xx*.98,.966+(y-.966)*.968]));
    disk('front-seat-dark-back',shellShape,(xx,y)=>[xx,y,back.back(xx,y)+.002],dark,seat,[0,0,1],24);
    const pocketShape=outline([[-.146,.765],[-.162,.79],[-.161,.91],[-.11,.921],[.11,.921],[.161,.91],[.162,.79],[.146,.765]]);
    disk('seatback-pocket',pocketShape,(xx,y)=>[xx,y,back.back(xx,y)+.006+.013*Math.sin((y-.76)/.17*Math.PI)],dark,seat,[0,0,1],12);
    const cushionOutline=[[-.176,-.501],[-.227,-.472],[-.242,-.37],[-.239,-.09],[-.207,.021],[0,.048],[.207,.021],[.239,-.09],[.242,-.37],[.227,-.472],[.176,-.501],[0,-.512]];
    const cushion=padded('seat-cushion',cushionOutline,.103,(xx,zz)=>-.702-.035*Math.pow(Math.abs(xx)/.244,2)+.024*Math.exp(-Math.pow(xx/.13,2))*Math.exp(-Math.pow((zz+.15)/.3,2)),baseMap,seat);
    insert('seat-cushion-perforated-panel',[[-.123,-.451],[-.15,-.413],[-.158,-.152],[-.13,-.063],[0,-.046],[.13,-.063],[.158,-.152],[.15,-.413],[.123,-.451],[0,-.46]],cushion,inset,seat);
    seatHead(seat,.24,1.333,.215);
    mesh('seat-pedestal',rounded(.42,.13,.43,.022),dark,[0,.527,-.12],seat);
    const bx=x<0?.248:-.248;
    const buckle=mesh('seatbelt-buckle',rounded(.029,.042,.05,.007),dark,[bx,.708,.015],seat);buckle.rotation.z=x<0?-.15:.15;
    mesh('seatbelt-red-release',rounded(.020,.005,.031,.002),red,[bx,.729,.015],seat);
  }
  // The second row is one continuous bench, with a stowed centre armrest.
  const rearBackOutline=[[-.63,.724],[-.678,.776],[-.684,1.106],[-.66,1.225],[-.56,1.257],[-.22,1.257],[0,1.239],[.22,1.257],[.56,1.257],[.66,1.225],[.684,1.106],[.678,.776],[.63,.724],[0,.716]];
  const rearBase=(x,y)=>{
    const height=T.MathUtils.clamp((y-.73)/.53,0,1),across=Math.abs(Math.abs(x)-.438);
    const lumbar=-.017*Math.exp(-Math.pow((y-.849)/.10,2));
    const bolster=-.043*Math.exp(-Math.pow((across-.170)/.060,2))*Math.sin(height*Math.PI);
    const inset=.011*Math.exp(-Math.pow(across/.118,2))*Math.sin(height*Math.PI);
    return .944+.27*(y-.73)+lumbar+bolster+inset;
  };
  const rear=padded('rear-bench-connected-back',rearBackOutline,.091,rearBase,backMap,root);
  for(const xx of [-.226,.226]){
    const pts=Array.from({length:24},(_,i)=>{const y=.746+i/23*.491;return[xx,y,rear.face(xx,y)-.0005];});
    piping('rear-seat-fold-seam',pts,root,false,.00055);
  }
  const benchOutline=[[-.61,.423],[-.67,.46],[-.692,.59],[-.675,.833],[-.635,.912],[0,.927],[.635,.912],[.675,.833],[.692,.59],[.67,.46],[.61,.423],[0,.415]];
  const benchBase=(x,z)=>-.771+.02*Math.exp(-Math.pow((Math.abs(x)-.431)/.145,2))*Math.exp(-Math.pow((z-.70)/.24,2))-.011*Math.exp(-Math.pow(x/.16,2));
  const bench=padded('rear-bench-connected-cushion',benchOutline,.104,benchBase,baseMap,root);
  for(const x of [-.438,0,.438]){
    const seat=new T.Group();seat.name=x===0?'rear-center-seat':x<0?'rear-left-seat':'rear-right-seat';root.add(seat);
    // Geometry remains in car coordinates, allowing the adjoining surfaces to meet.
    const panel=x===0?[[-.161,.765],[-.179,.80],[-.181,1.161],[-.143,1.185],[.143,1.185],[.181,1.161],[.179,.80],[.161,.765]]:[[-.135,.772],[-.16,.808],[-.16,1.052],[-.126,1.095],[-.083,1.119],[.083,1.119],[.126,1.095],[.16,1.052],[.16,.808],[.135,.772]];
    insert('seat-back-perforated-panel',panel.map(([xx,y])=>[xx+x,y]),rear,x===0?white:inset,seat);
    if(x===0)seat.getObjectByName('seat-back-perforated-panel').name='rear-stowed-armrest';
    const seatPanel=[[-.139,.462],[-.159,.50],[-.161,.757],[-.136,.841],[0,.855],[.136,.841],[.161,.757],[.159,.50],[.139,.462],[0,.453]];
    insert('seat-cushion-perforated-panel',seatPanel.map(([xx,z])=>[xx+x,z]),bench,x===0?white:inset,seat);
    const headGroup=new T.Group();headGroup.position.x=x;seat.add(headGroup);seatHead(headGroup,x===0?.206:.244,x===0?1.243:1.335,1.137);
    if(x!==0){const bx=x+(x<0?.204:-.204),yy=-bench.face(bx,.863);mesh('rear-belt-buckle',rounded(.036,.023,.06,.006),dark,[bx,yy+.003,.866],seat);mesh('rear-belt-release',rounded(.022,.004,.033,.002),red,[bx,yy+.016,.866],seat);}
  }
  for(const side of [-1,1]){
    const path=new T.CatmullRomCurve3([new T.Vector3(side*.627,1.271,1.081),new T.Vector3(side*.609,1.12,1.032),new T.Vector3(side*.581,.949,.959),new T.Vector3(side*.566,.788,.916)]);
    const positions=[],uv=[],idx=[];for(let i=0;i<=32;i++){const p=path.getPoint(i/32);for(const u of [-.5,.5]){positions.push(p.x+u*.032,p.y,p.z);uv.push(u+.5,i/32);}}
    for(let i=0;i<32;i++){const a=i*2;idx.push(a,a+1,a+3,a,a+3,a+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh('rear-seatbelt',g,webbing,null,root);
  }
  return {root,white,inset,dark};
}
