import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {mkdir,mkdtemp,writeFile,symlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createStaticServer} from '../server.mjs';

await mkdir('.tmp',{recursive:true});
const directory=await mkdtemp(resolve('.tmp/server-test-'));
await mkdir(directory+'/public');
await writeFile(directory+'/public/index.html','PUBLIC_FIXTURE');
await writeFile(directory+'/outside.txt','EXAMPLE_NOT_A_SECRET');
await symlink('../outside.txt',directory+'/public/link.txt');
const server=createStaticServer(directory+'/public');
const request=(url,method='GET')=>new Promise((resolve,reject)=>{
 const res=new PassThrough(),headers={};let status=0,body='';
 res.setHeader=(name,value)=>{headers[name.toLowerCase()]=value;};
 res.writeHead=(code,values={})=>{status=code;for(const[name,value]of Object.entries(values))res.setHeader(name,value);return res;};
 res.on('data',chunk=>body+=chunk);res.on('error',reject);
 res.on('end',()=>resolve({status,body,headers}));
 server.emit('request',{url,method},res);
});
test('malformed URLs return 400 without crashing later requests',async()=>{
 for(const url of ['http://[','/%'])assert.equal((await request(url)).status,400);
 assert.equal((await request('/')).body,'PUBLIC_FIXTURE');
});
test('path traversal and symlinks cannot serve files outside the public root',async()=>{
 for(const url of ['/%2e%2e%2foutside.txt','/link.txt']){
  const response=await request(url);assert.equal(response.status,404);assert.ok(!response.body.includes('EXAMPLE_NOT_A_SECRET'));
 }
});
test('only GET and HEAD are served with explicit content-type protection',async()=>{
 const head=await request('/','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
 assert.equal(head.headers['content-length'],14);assert.equal(head.headers['x-content-type-options'],'nosniff');
 const post=await request('/','POST');assert.equal(post.status,405);assert.equal(post.headers.allow,'GET, HEAD');
});
