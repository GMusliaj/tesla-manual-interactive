import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createSteeringWheel } from './steering-wheel.js';

// The imported interior contains a conventional dashboard, gear lever and
// wheel. These bounds identify complete disconnected source islands only.
export function isReplacedCabinPart({ min, max }) {
  const oldWheel = min.x > -.62 && max.x < -.21 && min.y > .96 && max.y < 1.29 && min.z > -.7 && max.z < -.38;
  const oldConsole = min.x > -.12 && max.x < .12 && min.y > .49 && max.y < .9 && min.z > -.94 && max.z < .33;
  const oldDashboard = min.x < -.78 && max.x > .75 && min.y > .43 && max.y < 1.21 && min.z < -1.16 && max.z < -.08;
  return oldWheel || oldConsole || oldDashboard;
}

function screenTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 640;
  const c = canvas.getContext('2d');
  c.fillStyle = '#eceeec'; c.fillRect(0, 0, 1024, 640);
  c.fillStyle = '#f5f6f5'; c.fillRect(0, 0, 380, 576);
  c.strokeStyle = '#d4d9d6'; c.lineWidth = 4;
  for (let x = 420; x < 1100; x += 105) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x - 110, 576); c.stroke(); }
  for (let y = 100; y < 580; y += 105) { c.beginPath(); c.moveTo(380, y); c.lineTo(1024, y + 65); c.stroke(); }
  c.strokeStyle = '#fff'; c.lineWidth = 13; c.beginPath(); c.moveTo(420, 550); c.bezierCurveTo(870, 600, 690, 210, 1030, 130); c.stroke();
  c.fillStyle = '#262b2d'; c.font = '500 48px sans-serif'; c.fillText('P', 30, 69);
  c.font = '18px sans-serif'; c.fillText('MODEL Y', 30, 104); c.font = '16px sans-serif'; c.fillText('86%', 282, 47);
  c.strokeStyle = '#738078'; c.lineWidth = 2; c.strokeRect(332, 31, 28, 14); c.fillStyle = '#738078'; c.fillRect(335, 34, 21, 8);
  // Original vector illustration: no screenshots or vehicle artwork are used.
  c.save(); c.translate(188, 311); c.fillStyle = '#a4aaac'; c.beginPath(); c.ellipse(0, 21, 98, 150, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.strokeStyle = '#7a8387'; c.lineWidth = 3; c.beginPath(); c.roundRect(-76, -142, 152, 286, 50); c.fill(); c.stroke();
  c.fillStyle = '#41494d'; c.beginPath(); c.roundRect(-61, -86, 122, 142, 23); c.fill();
  c.strokeStyle = '#ced4d6'; c.lineWidth = 3; c.beginPath(); c.moveTo(-59, -37); c.lineTo(59, -37); c.stroke();
  c.fillStyle = '#646e73'; c.fillRect(-86, -42, 10, 27); c.fillRect(76, -42, 10, 27); c.restore();
  c.fillStyle = '#334c70'; c.beginPath(); c.moveTo(746, 260); c.lineTo(731, 299); c.lineTo(747, 289); c.lineTo(764, 299); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.roundRect(427, 35, 420, 52, 26); c.fill();
  c.strokeStyle = '#60696d'; c.lineWidth = 3; c.beginPath(); c.arc(459, 57, 10, 0, Math.PI * 2); c.moveTo(467, 65); c.lineTo(476, 74); c.stroke();
  c.fillStyle = '#15191d'; c.fillRect(0, 576, 1024, 64); c.fillStyle = '#e3e7e8'; c.font = '24px sans-serif'; c.fillText('21.0°', 178, 618); c.fillText('21.0°', 799, 618);
  for (const x of [63, 387, 466, 545, 624, 706, 956]) { c.beginPath(); c.arc(x, 606, 9, 0, Math.PI * 2); c.strokeStyle = '#e3e7e8'; c.lineWidth = 2; c.stroke(); }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4; return texture;
}

// Draw the project's actual vehicle into the illustrative parking UI once.
// The tiny preview is generated at runtime, never fetched or stored as an asset.
export function updateCabinVehiclePreview(renderer, scene, car) {
  const surface=car.getObjectByName('screen-display'),texture=surface?.material?.map,canvas=texture?.image;
  if(typeof document==='undefined'||!canvas?.getContext)return false;
  const width=512,height=420,preview=new T.Scene();preview.environment=scene.environment;preview.environmentIntensity=.7;
  const copy=car.clone(true);copy.traverse(object=>{object.castShadow=false;object.receiveShadow=false;if(object.name==='center-touchscreen'||object.name==='rear-console-display')object.visible=false;});preview.add(copy);
  preview.add(new T.HemisphereLight(0xf1f3f7,0x84888e,2.1));
  const key=new T.DirectionalLight(0xfff9f1,2.5);key.position.set(-3,6,-5);preview.add(key);
  const fill=new T.DirectionalLight(0xdbe7f5,1.2);fill.position.set(4,2,1);preview.add(fill);
  const camera=new T.OrthographicCamera(-2.6,2.6,2.6*height/width,-2.6*height/width,.1,40);camera.position.set(-4.8,3.15,-6.3);camera.lookAt(0,.73,0);
  const target=new T.WebGLRenderTarget(width,height,{samples:4});target.texture.colorSpace=T.SRGBColorSpace;
  const previous={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),level:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,xr:renderer.xr.enabled};
  try{
    renderer.xr.enabled=false;renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);renderer.setClearColor(0xf5f6f5,0);renderer.clear();renderer.render(preview,camera);
    const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    const image=document.createElement('canvas');image.width=width;image.height=height;const context=image.getContext('2d'),frame=context.createImageData(width,height);
    for(let row=0;row<height;row++)frame.data.set(pixels.subarray((height-row-1)*width*4,(height-row)*width*4),row*width*4);
    context.putImageData(frame,0,0);
    const c=canvas.getContext('2d');c.fillStyle='#f5f6f5';c.fillRect(0,126,380,450);
    // A soft contact shadow grounds the vehicle without another shadow map.
    c.save();c.translate(190,383);c.scale(1,.30);const gradient=c.createRadialGradient(0,0,15,0,0,153);gradient.addColorStop(0,'#a9afb34a');gradient.addColorStop(1,'#a9afb300');c.fillStyle=gradient;c.fillRect(-154,-154,308,308);c.restore();
    c.drawImage(image,3,167,374,307);
    c.strokeStyle='#687178';c.lineWidth=2;c.beginPath();c.roundRect(182,142,18,15,3);c.stroke();c.beginPath();c.arc(191,141,6,Math.PI,0);c.stroke();
    c.strokeStyle='#cdd2d6';c.lineWidth=1;c.beginPath();c.moveTo(54,504);c.lineTo(324,504);c.stroke();
    for(const x of [93,191,289]){c.strokeStyle='#636d74';c.lineWidth=2;c.beginPath();c.roundRect(x-10,526,20,12,3);c.stroke();c.beginPath();c.moveTo(x-8,527);c.lineTo(x-6,521);c.lineTo(x+6,521);c.lineTo(x+8,527);c.stroke();}
    texture.needsUpdate=true;return true;
  }finally{
    renderer.setRenderTarget(previous.target,previous.face,previous.level);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);renderer.setScissorTest(previous.scissorTest);renderer.setClearColor(previous.clear,previous.alpha);renderer.autoClear=previous.autoClear;renderer.xr.enabled=previous.xr;target.dispose();
  }
}

// Small repeating material samples are generated here rather than taken from
// the reference photographs. Their scale stays subtle in the cabin close-up.
function surfaceTexture(kind) {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = ((x * 73 + y * 151 + x * y * 17) ^ (x * 19 + y * 29)) & 31;
    const woven = ((x % 8 < 4) === (y % 8 < 4)) ? 20 : -20;
    const value = kind === 'fabric' ? 120 + woven + n : 116 + n;
    const i = (y * size + x) * 4; data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new T.DataTexture(data, size, size); texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.repeat.set(kind === 'fabric' ? 16 : 8, kind === 'fabric' ? 2 : 8);
  return texture;
}

export function createCabinControls(car) {
  const root = new T.Group(); root.name = 'juniper-cabin-controls'; car.add(root);
  const grain = surfaceTexture('leather');
  const leather = new T.MeshStandardMaterial({ name: 'control_leather', color: '#202124', roughness: .82, bumpMap: grain, bumpScale: .0003 });
  const white = new T.MeshStandardMaterial({ name: 'white_console_upholstery', color: '#dad7d2', roughness: .72, bumpMap: grain, bumpScale: .00012 });
  const thread = new T.MeshStandardMaterial({ name: 'upholstery_thread', color: '#b5b1a9', roughness: 1 });
  const satin = new T.MeshStandardMaterial({ name: 'console_satin', color: '#22262b', roughness: .52, metalness: .12 });
  const rubber = new T.MeshStandardMaterial({ name: 'phone_mat', color: '#14171b', roughness: .98 });
  const silver = new T.MeshStandardMaterial({ name: 'control_edge', color: '#a3adb3', roughness: .29, metalness: .72 });
  const fabric = new T.MeshStandardMaterial({ name: 'pale_dash_trim', color: '#888580', roughness: .97, bumpMap: surfaceTexture('fabric'), bumpScale: .00035 });
  const blue = new T.MeshStandardMaterial({ name: 'cabin_ambient_strip', color: '#396983', emissive: '#1d5676', emissiveIntensity: .5, roughness: .5 });
  function mesh(name, geometry, material, position, parent = root) {
    const m = new T.Mesh(geometry, material); m.name = name; if (position) m.position.set(...position);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(name, size, position, material = satin, radius = .008, parent = root) {
    return mesh(name, new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v / 3))), material, position, parent);
  }
  function line(name, points, radius, material, parent = root, segments = 40) {
    return mesh(name, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), segments, radius, 6, false), material, null, parent);
  }

  // Sweep one gently curved cross-section across the cabin. This keeps the
  // dashboard's highlights continuous instead of stacking rectangular boxes.
  function dash(name, profile, material, width = 1.475) {
    const section = new T.CatmullRomCurve3(profile.map(([y,z]) => new T.Vector3(0,y,z)), true, 'centripetal');
    const positions=[],uv=[],indices=[],nx=64,ns=48;
    for(let i=0;i<=nx;i++)for(let j=0;j<=ns;j++){
      const u=i/nx,x=(u-.5)*width,p=section.getPoint(j/ns);
      const bend=.047*Math.pow(Math.abs(x)/(width/2),2);
      positions.push(x,p.y-.009*Math.pow(Math.abs(x)/(width/2),4),p.z-bend);
      uv.push(u,j/ns);
    }
    for(let i=0;i<nx;i++)for(let j=0;j<ns;j++){
      const a=i*(ns+1)+j,b=a+ns+1;indices.push(a,b,a+1,a+1,b,b+1);
    }
    // End caps are hidden by the A-pillar/door join but close the shell for shadows.
    for(const i of [0,nx])for(let j=1;j<ns-1;j++){
      const a=i*(ns+1);if(i===0)indices.push(a,a+j+1,a+j);else indices.push(a,a+j,a+j+1);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    return mesh(name,geometry,material);
  }

  // A low uninterrupted dashboard replaces the source's central stack.
  dash('dashboard-upper',[[1.063,-.712],[1.104,-.810],[1.112,-1.057],[1.087,-1.093],[1.025,-1.092],[1.022,-.774]],leather);
  dash('dashboard-trim',[[1.058,-.710],[1.052,-.739],[.997,-.738],[.987,-.703],[1.005,-.695]],fabric);
  line('dashboard-trim-lower-edge', [[-.727,.982,-.747],[-.50,.988,-.721],[0,.991,-.698],[.50,.988,-.721],[.727,.982,-.747]], .0011, satin);
  dash('dashboard-air-slot',[[.983,-.705],[.984,-.731],[.964,-.731],[.965,-.704]],rubber,1.465);
  dash('dashboard-lower',[[.955,-.719],[.952,-.858],[.828,-.849],[.832,-.748],[.887,-.712]],leather,1.445);
  line('glovebox-lid-seam', [[.149,.918,-.718],[.146,.860,-.737],[.628,.850,-.773],[.655,.881,-.756]], .00055, rubber);
  line('dashboard-ambient-strip', [[-.732,1.050,-.755],[-.54,1.057,-.734],[0,1.060,-.708],[.54,1.057,-.734],[.732,1.050,-.755]], .0011, blue);
  line('dashboard-upper-seam', [[-.715,1.081,-.811],[-.38,1.091,-.782],[0,1.094,-.771],[.38,1.091,-.782],[.715,1.081,-.811]],.00048,thread);

  const wheel = createSteeringWheel(root);

  const display = new T.Group(); display.name = 'center-touchscreen'; display.position.set(.038, 1.102, -.548); display.rotation.x = -.16; root.add(display);
  box('screen-housing', [.365, .233, .017], [0,0,0], satin, .012, display);
  box('screen-front-bezel', [.360, .228, .004], [0,0,.0075], rubber, .010, display);
  const screen = new T.MeshBasicMaterial({ name: 'illustrative-screen', map: screenTexture(), color: '#ffffff', toneMapped: false });
  mesh('screen-display', new T.PlaneGeometry(.349, .218), screen, [0,0,.0103], display).castShadow = false;
  box('screen-mount', [.07,.105,.06], [.038,.973,-.638], leather, .013);

  const console = new T.Group(); console.name = 'center-console'; console.scale.x=1.17; root.add(console);
  box('console-body', [.190,.19,.82], [0,.590,-.135], leather, .028, console);
  // The side upholstery is one continuous rising shell, not disconnected
  // rails. A smoothly curved profile joins the armrest to the phone-pad ramp.
  function consoleSide(side) {
    const profile = new T.Shape();
    profile.moveTo(-.53,.825); profile.quadraticCurveTo(-.535,.90,-.498,.914);
    profile.lineTo(-.348,.780); profile.quadraticCurveTo(-.300,.744,-.235,.732);
    profile.lineTo(.271,.727); profile.quadraticCurveTo(.291,.722,.292,.689);
    profile.lineTo(.272,.584); profile.quadraticCurveTo(.22,.557,.135,.566);
    profile.lineTo(-.348,.660); profile.quadraticCurveTo(-.451,.691,-.53,.825);
    const geometry = new T.ExtrudeGeometry(profile, { depth: .019, steps: 1, bevelEnabled: true, bevelSegments: 4, bevelSize: .004, bevelThickness: .004, curveSegments: 16 });
    // Profile x is the vehicle's longitudinal z; extrusion is lateral x.
    geometry.rotateY(-Math.PI / 2); geometry.translate(side > 0 ? .106 : -.087,0,0);
    return mesh(side < 0 ? 'console-left-white-sidewall' : 'console-right-white-sidewall', geometry, white, null, console);
  }
  consoleSide(-1); consoleSide(1);
  box('console-closed-cover', [.176,.014,.172], [0,.734,-.190], satin, .005, console);
  box('console-rear-cover', [.176,.014,.127], [0,.734,-.037], satin, .005, console);
  box('console-cover-pull', [.165,.004,.006], [0,.744,-.100], silver, .0015, console);
  box('console-cover-seam', [.176,.002,.003], [0,.742,-.098], rubber, .0006, console);
  for (const side of [-1,1]) {
    line('console-cover-edge', [[side*.091,.738,.027],[side*.091,.738,-.263],[side*.084,.744,-.282]], .0014, silver, console, 24);
    line('console-side-stitching', [[side*.108,.700,.267],[side*.108,.708,.09],[side*.108,.714,-.16],[side*.108,.747,-.32],[side*.108,.887,-.489]], .00055, thread, console, 64);
  }
  const armrest = box('console-armrest', [.204,.070,.253], [0,.775,.157], white, .025, console);
  line('armrest-stitching', [[-.093,.794,.044],[-.099,.795,.075],[-.099,.795,.249],[-.079,.795,.272],[.079,.795,.272],[.099,.795,.249],[.099,.795,.075],[.093,.794,.044]], .00055, thread, console, 72);
  line('armrest-double-stitching', [[-.090,.794,.045],[-.096,.795,.077],[-.096,.795,.247],[-.076,.795,.269],[.076,.795,.269],[.096,.795,.247],[.096,.795,.077],[.090,.794,.045]], .00045, thread, console, 72);
  const tray = new T.Group(); tray.name = 'dual-phone-charger'; tray.position.set(0,.819,-.408); tray.rotation.x = -.72; console.add(tray);
  box('phone-tray-frame', [.210,.261,.026], [0,0,0], white, .014, tray);
  box('phone-tray-trim', [.196,.247,.009], [0,0,.014], silver, .011, tray);
  box('phone-tray-insert', [.191,.241,.009], [0,0,.020], rubber, .010, tray);
  for (const x of [-.047,.047]) {
    box(x < 0 ? 'left-phone-pad' : 'right-phone-pad', [.086,.218,.006], [x,0,.027], rubber, .009, tray);
    box('phone-support-lip', [.085,.012,.013], [x,-.111,.036], satin, .004, tray);
  }
  box('phone-pad-divider', [.004,.214,.004], [0,0,.033], satin, .001, tray);

  return { root, wheel, display, console, armrest, tray };
}
