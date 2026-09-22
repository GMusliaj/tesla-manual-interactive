import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, mkdtemp, rename, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createStaticServer} from '../server.mjs';
import {discoverAssets} from './assets.mjs';

// Capture the optional local 3D experience, never the model-free public build.
// Only rendered frames enter the GIF. Model files and reference images stay local.
assert.ok((await discoverAssets()).model, 'README capture requires public/models/juniper.glb; refusing to record reading mode.');
execFileSync('ffmpeg', ['-version'], {stdio:'ignore'});
await mkdir('.tmp', {recursive:true});
await mkdir('docs', {recursive:true});
const frames=await mkdtemp(resolve('.tmp/readme-3d-'));
const server=createStaticServer();
await new Promise((done, reject)=>{server.once('error', reject);server.listen(0, '127.0.0.1', done);});
let browser;
try {
 browser=await chromium.launch({
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'}),
  headless:true, args:process.env.SOFTWARE_RENDERING?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu'],
 });
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,reducedMotion:'no-preference'});
 await page.addInitScript(()=>localStorage.setItem('juniper-language','en'));
 const errors=[],stages=new Set(),milestones=[];
 let modelLoaded=false;
 page.on('pageerror', e=>errors.push(e.message));
 page.on('response', r=>{if(r.url().endsWith('/models/juniper.glb')&&r.ok())modelLoaded=true;});
 await page.route('**/assets.json', route=>route.fulfill({json:{model:true,images:[]}}));
 await page.route('**/references/**', route=>{errors.push('Unexpected reference-image request');return route.abort();});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 const base='http://127.0.0.1:'+server.address().port+'/';
 await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('#scene').dataset.state==='ready', null, {timeout:60000});
 await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
 await page.clock.runFor(500);
 assert.ok(modelLoaded, 'A successful model request is required.');
 assert.equal(await page.locator('#renderError').isVisible(), false);
 assert.ok(Number(await page.locator('#scene').getAttribute('data-triangles'))>300000);
 const click=selector=>page.locator(selector).dispatchEvent('click');
 await click('#labelsToggle');
 // Display the model's credit on every frame as well as beneath the README GIF.
 await page.locator('.model-label').evaluate(el=>{el.textContent='3D: BloxBloger · adapted · CC BY-NC 4.0';});
 const fps=15;
 let count=0,elapsed=0;
 async function record(label, seconds) {
  console.log('Recording '+label);
  milestones.push({label,frame:count});
  for(let i=0;i<Math.round(seconds*fps);i++){
   const next=Math.round((count+1)*1000/fps);
   await page.clock.runFor(next-elapsed);elapsed=next;
   const state=await page.locator('#scene').evaluate(el=>({...el.dataset,
    language:document.documentElement.lang,
    englishSelected:document.querySelector('[data-language="en"]').getAttribute('aria-pressed'),
   }));
   assert.equal(state.state,'ready');
   assert.equal(state.language,'en','README frames must stay in English.');
   assert.equal(state.englishSelected,'true');
   if(state.connection)stages.add(state.connection);
   await page.screenshot({path:resolve(frames,'frame-'+String(count++).padStart(4,'0')+'.png')});
  }
 }
 await record('Juniper overview',1.2);
 await click('[data-view="cabin"]');await record('White cabin, steering wheel and center display',3);
 assert.equal(await page.locator('#scene').getAttribute('data-shot'),'cabin');
 await click('[data-cabin-view="cabinWheel"]');await record('Steering wheel, inset airbag and scroll controls',2.4);
 assert.equal(await page.locator('#scene').getAttribute('data-shot'),'cabinWheel');
 await click('[data-cabin-view="cabinRear"]');await record('Contoured white rear seats',1.6);
 await click('[data-cabin-view="cabinScreen"]');await record('Rear passenger display and seatback shells',1.6);
 await click('[data-view="side"]');await record('Side camera tour',1.8);
 await click('[data-view="rear"]');await record('Rear camera tour',1.8);
 await click('[data-chapter="lights"]');
 await click('.light-switch button:nth-child(2)');await record('Rear-light close-up',1.2);
 await click('#lighting');await record('Reflected Juniper rear lights',2);
 assert.equal(await page.locator('#scene').getAttribute('data-shot'),'rearLights');
 assert.equal(await page.locator('#lighting').getAttribute('aria-pressed'),'true');
 await click('#lighting');
 await click('[data-chapter="charge"]');await record('English charging lesson',1.2);
 await click('[data-action="open"]');await record('Opening the charge port',1);
 await click('[data-action="plug"]');await record('Approach, close-up insertion and pullback',8.8);
 assert.deepEqual([...stages],['wide','approach','insert','hold','return']);
 assert.equal(await page.locator('#scene').getAttribute('data-connection'),'');
 await click('[data-chapter="frunk"]');await record('Frunk camera',1.2);
 await click('[data-action="release"]');await record('Release hood',.6);
 await click('[data-action="lift"]');await record('Lift hood',1.8);
 await click('[data-action="lower"]');await record('Lower hood',1);
 await click('[data-action="press"]');await record('Latch hood',.8);
 await click('[data-view="overview"]');await record('Return to overview',1.2);
 assert.deepEqual(errors,[]);
 await writeFile(resolve(frames,'capture.json'),JSON.stringify({language:'en',fps,frames:count,duration:count/fps,stages:[...stages],milestones},null,2)+'\n');
 await browser.close();browser=null;
 const output=resolve(frames,'readme-demo.gif');
 execFileSync('ffmpeg',['-v','error','-y','-framerate',String(fps),'-i',resolve(frames,'frame-%04d.png'),
  '-filter_complex','[0:v]scale=1200:800:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
  '-loop','0',output],{stdio:'inherit'});
 await rename(output,resolve('docs/readme-demo.gif'));
 console.log(`PASS: ${count} English-only rendered 3D frames; all five charging stages; no reference images. Capture evidence: ${frames}`);
} finally {
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
