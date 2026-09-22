import {execFileSync} from 'node:child_process';
import {readFile,lstat,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {publicModelUrl} from './assets.mjs';

const dist=process.argv.includes('--dist'),root=resolve(dist?'dist':'.');
const failures=[];
const forbidden=/(^|\/)(?:node_modules|\.tmp|test-results|playwright-report|coverage)(\/|$)|(^|\/)\.env(?:\.|$)|\.(?:glb|gltf|obj|mtl|blend|png|jpe?g|gif|webp|p12|pfx|pem|key)$/i;
const readmePreview='docs/readme-demo.gif';
const secrets=[/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/\bAIza[0-9A-Za-z_-]{35}\b/,/\bxox[baprs]-[0-9A-Za-z-]{20,}\b/];
const privatePath=/\/(?:Users|home)\/[A-Za-z0-9_.-]+\//;
function inspect(file,bytes,version) {
  const content=bytes.toString('utf8');
  if(bytes.includes(0))failures.push(version+': unexpected binary file '+file);
  if(secrets.some(pattern=>pattern.test(content)))failures.push(version+': possible credential in '+file+' (value redacted)');
  if(privatePath.test(content))failures.push(version+': machine-specific home path in '+file);
}
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,e.name);if(e.isDirectory())files.push(...await walk(path));else files.push(relative(root,path));}return files;}
let staged=[];
let files;
if(dist)files=await walk(root);
else{
  files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  staged=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
}
for(const file of new Set(files)){
  const allowedPreview=!dist&&file===readmePreview;
  if((forbidden.test(file)&&!allowedPreview)||/(^|\/)references\//.test(file)||(/(^|\/)models\//.test(file)&&!file.endsWith('/CREDITS.md')))failures.push('restricted or private file: '+file);
  try{
    const stat=await lstat(resolve(root,file));
    if(stat.isSymbolicLink())failures.push('symlink not allowed in release: '+file);
    else if(stat.isFile()){
      const bytes=await readFile(resolve(root,file));
      if(allowedPreview){
        if(!bytes.subarray(0,6).equals(Buffer.from('GIF89a'))&&!bytes.subarray(0,6).equals(Buffer.from('GIF87a')))failures.push('README preview is not a GIF: '+file);
      }else inspect(file,bytes,'working tree');
    }
  }catch(error){if(error.code!=='ENOENT')throw error;}
  if(staged.includes(file)&&!allowedPreview)inspect(file,execFileSync('git',['show',':'+file],{maxBuffer:16*1024*1024}),'Git index');
}
if(dist){
  const assets=JSON.parse(await readFile(resolve(root,'assets.json'),'utf8'));
  if(assets.model!==true||assets.modelUrl!==publicModelUrl||!Array.isArray(assets.images)||assets.images.length)failures.push('public asset manifest must reference only the pinned upstream model and no images');
}
if(failures.length){console.error([...new Set(failures)].join('\n'));process.exitCode=1;}
else console.log('PASS: '+new Set(files).size+' '+(dist?'release':'repository')+' files; no restricted assets, detected credentials, home paths, or symlinks.');
