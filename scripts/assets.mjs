import {lstat, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// The public build references the separately licensed model at the exact
// upstream revision recorded in public/models/CREDITS.md. The binary stays
// outside this repository and is never copied into the Pages artifact.
export const publicModelUrl = 'https://raw.githubusercontent.com/aditano/tesla-studio/0d6d450e97899c3b59216cba3edd089c5e277f64/public/models/juniper/model.glb';
export const publicAssets = {model:true, modelUrl:publicModelUrl, images:[]};
export async function discoverAssets(root=resolve('public')) {
  const regular=async path=>{try{return(await lstat(path)).isFile();}catch(error){if(error.code==='ENOENT')return false;throw error;}};
  let entries=[];
  try{entries=await readdir(resolve(root,'references'),{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  return {
    model:await regular(resolve(root,'models/juniper.glb')),
    images:entries.filter(e=>e.isFile()&&/\.(png|jpe?g|gif|webp)$/i.test(e.name)).map(e=>'./references/'+e.name).sort(),
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const assets=await discoverAssets();
  await writeFile('public/assets.json',JSON.stringify(assets,null,2)+'\n');
  console.log(assets.model?'Local optional model available.':'Code-only mode: optional model absent.');
}
