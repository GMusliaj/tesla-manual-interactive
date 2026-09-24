import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
  const white = new T.MeshStandardMaterial({ name: 'white_console_upholstery', color: '#d9d6cf', roughness: .78, bumpMap: grain, bumpScale: .00018 });
  const thread = new T.MeshStandardMaterial({ name: 'upholstery_thread', color: '#b5b1a9', roughness: 1 });
  const satin = new T.MeshStandardMaterial({ name: 'console_satin', color: '#22262b', roughness: .52, metalness: .12 });
  const rubber = new T.MeshStandardMaterial({ name: 'phone_mat', color: '#14171b', roughness: .98 });
  const silver = new T.MeshStandardMaterial({ name: 'control_edge', color: '#a3adb3', roughness: .29, metalness: .72 });
  const fabric = new T.MeshStandardMaterial({ name: 'pale_dash_trim', color: '#b4b2ac', roughness: .98, bumpMap: surfaceTexture('fabric'), bumpScale: .0007 });
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
  function plate(name, points, depth, material, parent, z = 0) {
    const shape = new T.Shape(); shape.moveTo(...points[0]); for (const point of points.slice(1)) shape.lineTo(...point); shape.closePath();
    return mesh(name, new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .003, bevelThickness: .003, curveSegments: 8 }), material, [0, 0, z], parent);
  }

  // A low uninterrupted dashboard replaces the source's central stack.
  box('dashboard-upper', [1.43, .12, .31], [0, 1.053, -.921], leather, .035);
  box('dashboard-trim', [1.41, .072, .06], [0, 1.018, -.732], fabric, .014);
  line('dashboard-trim-lower-edge', [[-.697,.980,-.709],[0,.980,-.700],[.697,.980,-.709]], .0015, silver);
  box('dashboard-air-slot', [1.39, .018, .033], [0, .968, -.711], rubber, .004);
  box('dashboard-lower', [1.40, .15, .13], [0, .883, -.797], leather, .025);
  line('glovebox-lid-seam', [[.148,.900,-.728],[.148,.839,-.728],[.631,.839,-.728],[.657,.860,-.728]], .0008, rubber);
  line('dashboard-ambient-strip', [[-.704,1.057,-.732],[-.54,1.059,-.714],[0,1.060,-.702],[.54,1.059,-.714],[.704,1.057,-.732]], .0018, blue);

  const wheel = new T.Group(); wheel.name = 'steering-wheel'; wheel.position.set(-.4, 1.105, -.462); wheel.rotation.x = -.20; root.add(wheel);
  const rim = [[0,.172,0],[.115,.137,0],[.168,.055,0],[.161,-.074,0],[.10,-.141,0],[0,-.148,0],[-.10,-.141,0],[-.161,-.074,0],[-.168,.055,0],[-.115,.137,0]].map(p=>new T.Vector3(...p));
  mesh('steering-rim', new T.TubeGeometry(new T.CatmullRomCurve3(rim, true, 'centripetal'), 112, .018, 10, true), leather, null, wheel);
  const innerStitch = rim.map(point => new T.Vector3(point.x * .91, point.y * .91, .010));
  mesh('steering-rim-inner-stitch', new T.TubeGeometry(new T.CatmullRomCurve3(innerStitch, true, 'centripetal'), 112, .0006, 4, true), thread, null, wheel);
  const column = mesh('steering-column', new T.CylinderGeometry(.037, .047, .14, 20), leather, [0, 0, -.091], wheel); column.rotation.x = Math.PI / 2;
  line('turn-signal-stalk', [[-.035,-.025,-.075],[-.12,-.030,-.067],[-.183,-.035,-.058]], .0065, leather, wheel, 16);
  box('turn-signal-stalk-tip', [.035,.016,.022], [-.188,-.035,-.058], leather, .005, wheel);
  plate('steering-left-spoke', [[-.151,.044],[-.063,.033],[-.046,-.035],[-.154,-.024]], .013, satin, wheel, .003);
  plate('steering-right-spoke', [[.151,.044],[.154,-.024],[.046,-.035],[.063,.033]], .013, satin, wheel, .003);
  plate('steering-lower-left-leg', [[-.060,-.042],[-.016,-.141],[-.006,-.141],[-.045,-.042]], .010, satin, wheel, -.002);
  plate('steering-lower-right-leg', [[.060,-.042],[.045,-.042],[.006,-.141],[.016,-.141]], .010, satin, wheel, -.002);
  line('steering-lower-metal-edge', [[-.061,-.038,.016],[-.050,-.078,.016],[0,-.143,.016],[.050,-.078,.016],[.061,-.038,.016]], .0034, silver, wheel, 32);
  const horn = new T.Shape();
  horn.moveTo(-.050,.048); horn.quadraticCurveTo(0,.055,.050,.048);
  horn.quadraticCurveTo(.066,.045,.066,.020); horn.quadraticCurveTo(.064,-.005,.038,-.073);
  horn.quadraticCurveTo(.030,-.086,.020,-.086); horn.lineTo(-.020,-.086);
  horn.quadraticCurveTo(-.030,-.086,-.038,-.073); horn.quadraticCurveTo(-.064,-.005,-.066,.020);
  horn.quadraticCurveTo(-.066,.045,-.050,.048);
  mesh('steering-horn-pad', new T.ExtrudeGeometry(horn, { depth: .027, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .004, bevelThickness: .004, curveSegments: 12 }), leather, [0,0,.016], wheel);
  for (const x of [-.109, .109]) {
    const scroll = mesh(x < 0 ? 'left-scroll-wheel' : 'right-scroll-wheel', new T.CylinderGeometry(.011, .011, .017, 20), leather, [x, .009, .028], wheel); scroll.rotation.z = Math.PI / 2;
    for (let i = -2; i <= 2; i++) { const ridge = mesh('scroll-grip-ridge', new T.TorusGeometry(.0109, .00055, 4, 16), silver, [x + i * .003, .009, .028], wheel); ridge.rotation.y = Math.PI / 2; }
    for (const dx of [-.019,.019]) mesh('steering-button-mark', new T.CircleGeometry(.0016, 8), silver, [x+dx,.009,.024], wheel);
  }

  const display = new T.Group(); display.name = 'center-touchscreen'; display.position.set(.038, 1.102, -.548); display.rotation.x = -.16; root.add(display);
  box('screen-housing', [.365, .233, .017], [0,0,0], satin, .012, display);
  box('screen-front-bezel', [.360, .228, .004], [0,0,.0075], rubber, .010, display);
  const screen = new T.MeshBasicMaterial({ name: 'illustrative-screen', map: screenTexture(), color: '#ffffff', toneMapped: false });
  mesh('screen-display', new T.PlaneGeometry(.349, .218), screen, [0,0,.0103], display).castShadow = false;
  box('screen-mount', [.07,.105,.06], [.038,.973,-.638], leather, .013);

  const console = new T.Group(); console.name = 'center-console'; root.add(console);
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
  const tray = new T.Group(); tray.name = 'dual-phone-charger'; tray.position.set(0,.819,-.408); tray.rotation.x = -.59; console.add(tray);
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
