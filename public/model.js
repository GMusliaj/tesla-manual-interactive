import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { studioEnvironment } from './studio-lighting.js';
import { createOperations } from './operations-3d.js';
import { chargeFilmAt } from './charge-film.js';
import { createRearLights } from './rear-lights.js';
import { createCabin } from './cabin.js';

// +Y up, -Z front, -X driver side (left-hand drive).
export const SHOTS = {
  overview: { position: [-4.7, 2.45, -5.7], target: [0, .78, 0] },
  front: { position: [-.2, 2.2, -8], target: [0, .85, -.5] },
  rear: { position: [-5.3, 2.4, 6.3], target: [0, .85, .4] },
  side: { position: [-8.8, 2, 0], target: [0, .8, 0] },
  doors: { position: [-4.5, 1.9, -2.1], target: [-.55, 1.03, -.32] },
  cabin: { position: [.20, 1.36, -.02], target: [-.05, 1.05, -.80], fov: 76, interior: true },
  cabinRear: { position: [.40,1.40,.46], target: [-.15,1,1.09], fov:78, interior:true, limits:{radius:[.86,.96],phi:[1.06,1.26],theta:[2.27,2.51]} },
  cabinScreen: {position:[0,1.12,.69],target:[0,.71,.31],fov:68,interior:true,limits:{radius:[.54,.58],phi:[.69,.84],theta:[-.12,.12]}},
  charge: { position: [-4.6, 2.4, 5.5], target: [-.2, .85, .7] },
  chargeWide: { position: [-4.6, 2.4, 5.5], target: [-.2, .85, .7], fov:36 },
  chargeClose: { position: [-2.9, 1.75, 3.3], target: [-.87, 1.13, 1.9], fov:16 },
  chargeEnd: { position: [-3.7, 2.1, 4.3], target: [-.55, 1.1, 1.4], fov:34 },
  frunk: { position: [-3.25, 3.6, -5.2], target: [0, 1, -1.35] },
  lights: { position: [-3.4, 1.65, -6.1], target: [0, .8, -1] },
  rearLights: { position: [-2.4, 1.6, 4.9], target: [0, 1.02, 2.05], fov: 30 },
  emergency: { position: [-5, 2.2, 1.5], target: [-.6, 1.0, .3] },
  regen: { position: [-4.6, 4.5, -5.6], target: [0, .5, 0] },
};

export async function createViewer(host, { modelUrl = './models/juniper.glb', onProgress, onInteract, onContextLost } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label', 'Drehbare 3D-Ansicht des Model Y Juniper');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); onContextLost?.(); });
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, .08, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  let cameraInside=false,insideView='';
  controls.enableDamping = true; controls.dampingFactor = .18;
  controls.enablePan = false; controls.minDistance = 2.4; controls.maxDistance = 14;
  controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI / 2 - .015;
  controls.rotateSpeed = .6; controls.zoomSpeed = .8;
  const environment = studioEnvironment(renderer); scene.environment = environment.texture;
  const hemi = new T.HemisphereLight(0xe8edf2, 0x93969a, 1.65); scene.add(hemi);
  const key = new T.DirectionalLight(0xfffaf0, 2.2);
  key.position.set(-3, 7, -4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -5, near: .1, far: 20 });
  key.shadow.normalBias = .012; key.shadow.bias = -.0001; scene.add(key);
  const fill = new T.DirectionalLight(0xdce5ee, 1.1); fill.position.set(5, 3, 3); scene.add(fill);
  const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ opacity: .19 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.015; floor.receiveShadow = true; scene.add(floor);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64,64,12,64,64,64);
  gradient.addColorStop(0,'rgba(15,22,36,.35)'); gradient.addColorStop(1,'rgba(15,22,36,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,128,128);
  const contact = new T.Mesh(new T.PlaneGeometry(3.2,6),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  contact.rotation.x=-Math.PI/2; contact.position.y=-.01; scene.add(contact);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl, event => onProgress?.(event.total ? event.loaded/event.total : 0));
  const car = gltf.scene;
  const materials = new Set(); let triangles = 0;
  // These source objects were assigned paint/LED materials by the OBJ conversion.
  // Their geometry is window trim, wheel-arch trim, or lower headlamp housing.
  const darkTrim = new Set(['Plane004_Mesh004','Plane007_Mesh005','Plane008_Mesh006','Plane009_Mesh007','Plane025_Mesh013','Plane067_Mesh043','Plane070_Mesh044']);
  const darkLampHousing = new Set(['Plane032_Mesh020','Plane051_Mesh037','Plane026_Mesh015','Plane040_Mesh026']);
  car.traverse(mesh => {
    if (!mesh.isMesh) return;
    triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (darkTrim.has(mesh.name) || darkLampHousing.has(mesh.name)) {
      mesh.material = new T.MeshStandardMaterial({name:'satin_trim',color:'#15181c',roughness:.48,metalness:.12});
    }
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (materials.has(material)) continue; materials.add(material);
      if (material.name === 'exterior_paint') {
        material.color.set('#e6e8e7'); material.metalness = .03; material.roughness = .38;
        material.clearcoat = .8; material.clearcoatRoughness = .24;
      }
      if (material.name === 'glass') { material.color.set('#11171c'); material.opacity = .94; material.depthWrite = false; material.roughness = .18; }
      if (material.name === 'wheel_finish') { material.color.set('#202225'); material.roughness = .43; material.metalness = .25; }
      if (material.name === 'satin_trim') { material.color.set('#1c2127'); material.roughness = .5; }
      if (material.name === 'interior_leather') { material.color.set('#eeeae3'); material.metalness = 0; material.roughness = .85; }
      if (material.name.includes('led')) { material.transparent = false; material.opacity = 1; material.emissiveIntensity = .5; }
    }
  });
  scene.add(car);
  createCabin(car);
  const rearLights=createRearLights(car);
  const operations=createOperations(scene,car);
  const size = new T.Box3().setFromObject(car).getSize(new T.Vector3());
  host.dataset.triangles = Math.round(triangles); host.dataset.model = 'juniper';
  host.dataset.bounds = size.toArray().map(x=>x.toFixed(3)).join(',');
  let tween = null, frame, visible = true, lastTime = 0, dirty = true;
  let film=null,currentOperation=null,sequenceListener=()=>{};
  const sequenceState=()=>({playing:Boolean(film),stage:film?.stage||'done',reduced:reduced.matches});
  function notifySequence(){host.dataset.connection=film?.stage||'';sequenceListener(sequenceState());}
  function cancelFilm(settle=false){
    if(!film)return;
    film=null;if(settle&&currentOperation)operations.show(currentOperation,true);dirty=true;notifySequence();
  }
  const motionChanged=()=>{if(reduced.matches){if(film)cancelFilm(true);finishCameraMotion();}notifySequence();};
  reduced.addEventListener('change',motionChanged);
  function shotPose(name){
    const shot=SHOTS[name],target=new T.Vector3(...shot.target),position=new T.Vector3(...shot.position);
    if(!shot.interior&&camera.aspect<1.3)position.sub(target).multiplyScalar(1.3/Math.max(camera.aspect,.7)).add(target);
    return{target,position,limits:shot.limits,name,fov:shot.interior?Math.min(94,2*Math.atan(Math.tan(shot.fov*Math.PI/360)*Math.max(1,1.3/camera.aspect))*180/Math.PI):shot.fov||36};
  }
  function playConnection(){
    if(currentOperation?.kind!=='charge'||currentOperation.phase!=='charging')return;
    // A click can scroll the guide before IntersectionObserver has updated.
    // Measure now so mobile playback never starts with the car off screen.
    const bounds=host.getBoundingClientRect();
    if(bounds.top<0||bounds.bottom>innerHeight)host.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
    if(reduced.matches){fitShot('chargeClose',false);return;}
    cancelFilm();tween=null;
    renderer.domElement.style.opacity='1';
    film={elapsed:0,last:performance.now(),stage:'wide',manual:false};
    applyPose(shotPose('chargeWide'),false);
    operations.presentCharge(chargeFilmAt(0));controls.update();host.dataset.shot='chargeWide';dirty=true;notifySequence();
  }
  controls.addEventListener('change',()=>{dirty=true;});
  function clearInertia() {
    const position=camera.position.clone(),target=controls.target.clone();
    controls.enableDamping=false;controls.update();
    camera.position.copy(position);controls.target.copy(target);controls.update();
    controls.enableDamping=true;
  }
  function cameraLimits(interior,limits) {
    cameraInside=interior;
    controls.minDistance=interior?(limits?.radius[0]??.70):2.4;controls.maxDistance=interior?(limits?.radius[1]??.88):14;
    controls.minPolarAngle=interior?(limits?.phi[0]??1.10):.25;controls.maxPolarAngle=interior?(limits?.phi[1]??1.38):Math.PI/2-.015;
    controls.minAzimuthAngle=interior?(limits?.theta[0]??-.30):-Infinity;controls.maxAzimuthAngle=interior?(limits?.theta[1]??.58):Infinity;
    controls.rotateSpeed=interior?.25:.6;
  }
  function applyPose(pose,interior) {
    cameraLimits(interior,pose.limits);insideView=interior?pose.name:'';
    scene.background=interior?new T.Color('#233447'):null;
    clearInertia();camera.position.copy(pose.position);controls.target.copy(pose.target);
    camera.fov=pose.fov;camera.updateProjectionMatrix();controls.update();dirty=true;
  }
  function finishCameraMotion() {
    if(!tween)return;
    if(tween.kind==='cabin-cut')applyPose(tween.pose,tween.interior);
    else {
      clearInertia();controls.target.copy(tween.toTarget);
      camera.position.copy(tween.toTarget).add(new T.Vector3().setFromSpherical(tween.to));
      camera.fov=tween.fov;camera.updateProjectionMatrix();controls.update();dirty=true;
    }
    tween=null;renderer.domElement.style.opacity='1';
  }
  function moveCamera(position,target,fov,duration=950,kind='shot') {
    clearInertia();
    const from=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const to=new T.Spherical().setFromVector3(position.clone().sub(target));
    to.theta=from.theta+Math.atan2(Math.sin(to.theta-from.theta),Math.cos(to.theta-from.theta));
    tween={start:performance.now(),duration,kind,from,to,targetFrom:controls.target.clone(),toTarget:target.clone(),fromFov:camera.fov,fov};
    dirty=true;
  }
  function fitShot(name = 'overview', animate = true) {
    cancelFilm(true);
    const shot = SHOTS[name] || SHOTS.overview;
    const pose=shotPose(SHOTS[name]?name:'overview'), interior=Boolean(shot.interior);
    const crossingCabin=interior!==cameraInside||(interior&&insideView!==name);
    controls.autoRotate = false;
    renderer.domElement.style.opacity='1';
    if (!animate || reduced.matches) { applyPose(pose,interior);tween=null; }
    // An exterior-to-interior fly-through would cross solid doors and seats.
    // Briefly fade the view, relocate inside, then reveal the cockpit.
    else if(crossingCabin){clearInertia();tween={kind:'cabin-cut',start:performance.now(),duration:400,pose,interior,placed:false};dirty=true;}
    else {cameraLimits(interior,pose.limits);moveCamera(pose.position,pose.target,pose.fov);}
    host.dataset.shot = name;
  }
  controls.addEventListener('start',()=>{if(tween?.kind==='cabin-cut')applyPose(tween.pose,tween.interior);tween=null;renderer.domElement.style.opacity='1';if(film)film.manual=true;controls.autoRotate=false;onInteract?.();});
  let afterFrame = () => {};
  const cameraOffset=new T.Vector3(),cameraOrbit=new T.Spherical();
  function draw(time) {
    frame=requestAnimationFrame(draw);
    if (document.hidden || (!visible&&!dirty)) {if(film)film.last=time;return;}
    const delta = Math.min((time-lastTime)/1000,.1); lastTime=time;
    if(film){
      film.elapsed+=Math.min((time-film.last)/1000,.1);film.last=time;
      const cue=chargeFilmAt(film.elapsed);operations.presentCharge(cue);
      if(!film.manual){
        const wide=shotPose('chargeWide'),close=shotPose('chargeClose'),end=shotPose('chargeEnd');
        camera.position.lerpVectors(wide.position,close.position,cue.close).lerp(end.position,cue.retreat);
        controls.target.lerpVectors(wide.target,close.target,cue.close).lerp(end.target,cue.retreat);
        camera.fov=T.MathUtils.lerp(T.MathUtils.lerp(wide.fov,close.fov,cue.close),end.fov,cue.retreat);camera.updateProjectionMatrix();
      }
      dirty=true;
      if(cue.done){if(!film.manual)host.dataset.shot='chargeEnd';film=null;operations.show(currentOperation,true);notifySequence();}
      else if(cue.stage!==film.stage){film.stage=cue.stage;notifySequence();}
    }
    if(tween?.kind==='cabin-cut'){
      const t=Math.min((time-tween.start)/tween.duration,1);
      renderer.domElement.style.opacity=String(Math.abs(2*t-1));
      if(t>=.5&&!tween.placed){applyPose(tween.pose,tween.interior);tween.placed=true;}
      dirty=true;if(t===1)tween=null;
    } else if (tween) {
      const t=Math.min((time-tween.start)/tween.duration,1), eased=t*t*(3-2*t);
      cameraOrbit.set(T.MathUtils.lerp(tween.from.radius,tween.to.radius,eased),T.MathUtils.lerp(tween.from.phi,tween.to.phi,eased),T.MathUtils.lerp(tween.from.theta,tween.to.theta,eased));
      controls.target.lerpVectors(tween.targetFrom,tween.toTarget,eased);
      camera.position.copy(controls.target).add(cameraOffset.setFromSpherical(cameraOrbit));
      camera.fov=T.MathUtils.lerp(tween.fromFov,tween.fov,eased);camera.updateProjectionMatrix();dirty=true;
      if(t===1)tween=null;
    }
    controls.dampingFactor = 1 - Math.exp(-12 * delta);
    controls.update(delta);
    const operating=operations.tick(time,reduced.matches);
    if(operations.consumeShadowUpdate())renderer.shadowMap.needsUpdate=true;
    if(dirty||tween||operating){renderer.render(scene,camera);afterFrame(camera,car);dirty=false;}
  }
  function resize() { const {width,height}=host.getBoundingClientRect(); if(!width||!height)return; camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);dirty=true; }
  const observer=new ResizeObserver(()=>{
    resize();
    if(tween?.kind==='cabin-cut')tween.pose=shotPose(host.dataset.shot||'overview');
    else if(!film&&!tween)fitShot(host.dataset.shot||'overview',false);
  });observer.observe(host);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});intersection.observe(host);
  resize();fitShot('overview',false);draw(0);
  return {
    shot:fitShot, onFrame(callback){afterFrame=callback;dirty=true;},
    operation(state){
      const connecting=currentOperation?.kind==='charge'&&currentOperation.phase==='open'&&state?.kind==='charge'&&state.phase==='charging';
      cancelFilm();currentOperation=state;operations.show(state,reduced.matches);dirty=true;host.dataset.operation=state?.kind||'';host.dataset.operationPhase=state?.phase||'';
      if(connecting&&!reduced.matches)playConnection();
    },
    replayConnection:playConnection,finishConnection(){cancelFilm(true);},sequenceState,
    onSequence(callback){sequenceListener=callback;},
    operationAvailable(kind){return Boolean(operations.available[kind]);},
    operationState(){return operations.getState();},
    project(position){const p=new T.Vector3(...position).project(camera);return {x:(p.x+1)/2,y:(1-p.y)/2,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.91};},
    zoom(factor){
      if(film)film.manual=true;
      if(tween?.kind==='cabin-cut')finishCameraMotion();
      const offset=(tween?.kind==='navigation'?new T.Vector3().setFromSpherical(tween.to):camera.position.clone().sub(controls.target));
      const position=offset.multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance).add(controls.target);
      if(reduced.matches){clearInertia();tween=null;camera.position.copy(position);controls.update();}
      else moveCamera(position,controls.target,camera.fov,240,'navigation');
    },
    rotate(angle){
      if(film)film.manual=true;
      if(tween?.kind==='cabin-cut')finishCameraMotion();
      const offset=(tween?.kind==='navigation'?new T.Vector3().setFromSpherical(tween.to):camera.position.clone().sub(controls.target));
      const position=offset.applyAxisAngle(new T.Vector3(0,1,0),angle).add(controls.target);
      if(reduced.matches){clearInertia();tween=null;camera.position.copy(position);controls.update();}
      else moveCamera(position,controls.target,camera.fov,240,'navigation');
    },
    lighting(night){dirty=true;hemi.intensity=night?.55:1.65;key.intensity=night?.8:2.2;fill.intensity=night?.45:1.1;scene.environmentIntensity=night?.4:1;for(const m of materials)if(m.name.includes('led'))m.emissiveIntensity=night?2:.5;rearLights.setNight(night);},
    paint(hex){dirty=true;for(const m of materials)if(m.name==='exterior_paint')m.color.set(hex);},
    get camera(){return camera;}, get car(){return car;}, get renderer(){return renderer;},
    dispose(){cancelAnimationFrame(frame);reduced.removeEventListener('change',motionChanged);observer.disconnect();intersection.disconnect();controls.dispose();renderer.dispose();environment.dispose();},
  };
}
