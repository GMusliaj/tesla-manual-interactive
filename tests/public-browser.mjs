import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('dist');
const [manifest,index,sources]=await Promise.all([
  readFile(resolve(root,'assets.json'),'utf8'),
  readFile(resolve(root,'index.html'),'utf8'),
  readFile(resolve(root,'sources.html'),'utf8'),
]);
await readFile(resolve(root,'.nojekyll'));
assert.deepEqual(JSON.parse(manifest),{
  model:true,
  modelUrl:'https://raw.githubusercontent.com/aditano/tesla-studio/0d6d450e97899c3b59216cba3edd089c5e277f64/public/models/juniper/model.glb',
  images:[],
});
assert.match(index,/sources\.html/);
assert.match(sources,/CC BY-NC 4\.0/);
for(const path of ['dist/references','dist/models/juniper.glb']){
  try{await readFile(resolve(path));assert.fail('restricted asset unexpectedly included: '+path);}catch(error){if(error.code!=='ENOENT'&&error.code!=='EISDIR')throw error;}
}
console.log('PASS: Pages artifact references the pinned upstream model without bundling restricted model or reference files.');
