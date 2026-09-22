import {copyFile,mkdir,readdir,rm,writeFile} from 'node:fs/promises';
import {resolve,extname,basename} from 'node:path';
import {publicAssets} from './assets.mjs';

const source=resolve('public'),destination=resolve('dist');
// Always rebuild this fixed, ignored output directory, so an older local build
// cannot carry restricted assets into a later public release.
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
async function copy(relative='') {
  for(const entry of await readdir(resolve(source,relative),{withFileTypes:true})) {
    const name=relative?relative+'/'+entry.name:entry.name;
    if(name==='references'||name==='assets.json'||name==='three.module.js')continue;
    if(name.startsWith('models/')&&name!=='models/CREDITS.md')continue;
    if(entry.isSymbolicLink())throw new Error('Release must not follow symlinks: '+name);
    if(entry.isDirectory()){await mkdir(resolve(destination,name),{recursive:true});await copy(name);continue;}
    if(name!=='.nojekyll'&&!['.js','.css','.html','.json','.md','.txt'].includes(extname(name))&&!basename(name).startsWith('LICENSE'))throw new Error('Unreviewed public file: '+name);
    await copyFile(resolve(source,name),resolve(destination,name));
  }
}
await copy();
await writeFile(resolve(destination,'assets.json'),JSON.stringify(publicAssets,null,2)+'\n');
await writeFile(resolve(destination,'.nojekyll'),'');
await copyFile('LICENSE',resolve(destination,'LICENSE.txt'));
await copyFile('THIRD_PARTY_NOTICES.md',resolve(destination,'THIRD_PARTY_NOTICES.md'));
console.log('Built static site in dist/; the pinned upstream model is referenced, but no model or reference images are bundled.');
