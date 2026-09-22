import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const files = ['build/three.module.js', 'examples/jsm/controls/OrbitControls.js', 'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/libs/meshopt_decoder.module.js', 'examples/jsm/environments/RoomEnvironment.js', 'examples/jsm/geometries/RoundedBoxGeometry.js', 'LICENSE'];
for (const file of files) {
  const dest = resolve('public/vendor/three', file);
  if(process.argv.includes('--check')){
    const [actual,expected]=await Promise.all([readFile(dest),readFile(resolve('node_modules/three',file))]);
    if(!actual.equals(expected))throw new Error('Vendored dependency differs from installed lockfile version: '+file);
    continue;
  }
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(resolve('node_modules/three', file), dest);
}
console.log(process.argv.includes('--check')?'PASS: vendored Three.js files match the installed dependency.':'Static 3D runtime prepared (Three.js + loaders + license).');
