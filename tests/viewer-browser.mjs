import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createStaticServer} from '../server.mjs';
import {requiresModel} from './asset-fixture.mjs';

assert.equal(requiresModel.skip,false,'Viewer browser verification requires the optional local model.');
await mkdir('.tmp/viewer-qa',{recursive:true});
const server=createStaticServer();
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const angle=(a,b)=>Math.atan2(a[0]*b[2]-a[2]*b[0],a[0]*b[0]+a[2]*b[2]);
let browser;
try {
 browser=await chromium.launch({channel:'chrome',headless:true,args:process.env.SOFTWARE_RENDERING?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu']});
 const context=await browser.newContext({viewport:{width:1280,height:850},reducedMotion:'no-preference'}),errors=[];
 context.on('page',page=>{
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 });
 await context.route('**/viewer-test.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html>
 <meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
 <style>body{margin:0;background:#f3f5f7}#scene{width:100vw;height:100vh}</style>
 <script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>
 <div id="scene"></div><script type="module">
 import {createViewer,SHOTS} from '/model.js';
 window.shots=SHOTS;window.interactions=0;
 window.viewer=await createViewer(document.querySelector('#scene'),{onInteract(){window.interactions++;}});
 const renderer=viewer.renderer,render=renderer.render.bind(renderer),shadowRender=renderer.shadowMap.render.bind(renderer.shadowMap);
 window.resetStats=()=>window.stats={renders:0,shadows:0,costs:[],times:[],poses:[]};resetStats();
 renderer.shadowMap.render=(lights,...args)=>{if(renderer.shadowMap.enabled&&(renderer.shadowMap.autoUpdate||renderer.shadowMap.needsUpdate)&&lights.length)stats.shadows++;return shadowRender(lights,...args);};
 renderer.render=(...args)=>{const start=performance.now();render(...args);stats.renders++;stats.costs.push(performance.now()-start);stats.times.push(start);stats.poses.push(viewer.camera.position.toArray());};
 window.frames=count=>new Promise(done=>{const next=()=>--count<=0?done():requestAnimationFrame(next);requestAnimationFrame(next);});
 window.ready=true;
 </script>`}));
 const url='http://127.0.0.1:'+server.address().port+'/viewer-test.html';
 let page=await context.newPage();
 await page.goto(url);
 await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 await page.evaluate(()=>frames(12));
 // Measure actual browser rendering before using a controlled clock for motion
 // assertions. A slow renderer is reported, never hidden by a hardware FPS gate.
 const measurements=await page.evaluate(async()=>{
  viewer.shot('overview',false);resetStats();
  const gl=viewer.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
  const device=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const started=performance.now();let callbacks=0;
  await new Promise(done=>{const turn=()=>{viewer.rotate(.012);if(++callbacks<60)requestAnimationFrame(turn);else requestAnimationFrame(done);};requestAnimationFrame(turn);});
  const elapsed=performance.now()-started;
  const percentile=(values,fraction)=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*fraction))]??0;};
  const gaps=stats.times.slice(1).map((stamp,index)=>stamp-stats.times[index]);
  return {device,elapsedMs:elapsed,callbacks,rendered:stats.renders,shadowPasses:stats.shadows,observedFPS:stats.renders/elapsed*1000,renderCPUmedianMs:percentile(stats.costs,.5),renderCPUp95Ms:percentile(stats.costs,.95),frameGapMedianMs:percentile(gaps,.5),frameGapP95Ms:percentile(gaps,.95)};
 });
 // Start a separate controlled-clock page: installing a clock after the viewer
 // starts leaves native animation callbacks pending outside the mocked clock.
 await page.close();page=await context.newPage();
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 await page.goto(url);await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const run=ms=>page.clock.runFor(ms);
 const motion=async value=>{
  await page.evaluate(value=>{const query=matchMedia('(prefers-reduced-motion: reduce)');window.preferenceChanged=query.matches===(value==='reduce')?Promise.resolve():new Promise(done=>query.addEventListener('change',()=>done(),{once:true}));},value);
  await page.emulateMedia({reducedMotion:value});await page.evaluate(()=>window.preferenceChanged);
 };
 const pose=()=>page.evaluate(()=>viewer.camera.position.toArray());
 const stats=()=>page.evaluate(()=>({renders:window.stats.renders,shadows:window.stats.shadows,poses:window.stats.poses}));
 const reset=()=>page.evaluate(()=>resetStats());
 const overview=async()=>{await page.evaluate(()=>{viewer.operation(null);viewer.shot('overview',false);});await run(64);await reset();};
 await overview();
 await run(320);
 assert.deepEqual(await stats(),{renders:0,shadows:0,poses:[]},'a settled scene renders neither the car nor its shadow');

 // Orbit crosses the azimuth wrap and still takes the requested short arc.
 const initial=await pose(),requested=-.9;
 await page.evaluate(requested=>viewer.rotate(requested),requested);
 assert.ok(distance(await pose(),initial)<1e-7,'orbit buttons must not jump on input');
 await run(80);const orbitMiddle=await pose();
 assert.ok(Math.abs(angle(orbitMiddle,initial))>.03&&Math.abs(angle(orbitMiddle,initial))<.85,'orbit visibly interpolates before reaching its target: '+JSON.stringify({initial,orbitMiddle,progress:angle(orbitMiddle,initial),stats:await stats()}));
 await run(240);const orbitEnd=await pose(),orbitStats=await stats();
 assert.ok(Math.abs(angle(orbitEnd,initial)-requested)<1e-5,'orbit reaches the requested angle');
 assert.ok(Math.abs(Math.hypot(...orbitEnd)-Math.hypot(...initial))<1e-5,'orbit keeps camera distance');
 let previous=0;
 for(const current of orbitStats.poses){const progress=angle(current,initial)/requested;assert.ok(progress>=previous-1e-7&&progress<=1+1e-7,'orbit must not reverse or overshoot');previous=progress;}
 assert.equal(orbitStats.shadows,0,'camera movement reuses the existing shadow map');

 // Rapid button inputs accumulate toward their end pose without teleporting.
 await reset();const beforeZoom=await pose();
 await page.evaluate(()=>{viewer.zoom(.8);viewer.zoom(.8);});
 assert.ok(distance(await pose(),beforeZoom)<1e-7,'zoom buttons must not jump on input');
 await run(80);const zoomMiddle=await pose();
 await run(240);const zoomEnd=await pose(),target=await page.evaluate(()=>shots.overview.target);
 const radius=point=>distance(point,target);
 assert.ok(radius(zoomMiddle)<radius(beforeZoom)&&radius(zoomMiddle)>radius(zoomEnd),'zoom has a real intermediate pose');
 assert.ok(Math.abs(radius(zoomEnd)/radius(beforeZoom)-.64)<1e-5,'repeated zoom presses accumulate');
 assert.equal((await stats()).shadows,0);
 await reset();const beforeRepeat=await pose();
 await page.evaluate(()=>viewer.rotate(.35));await run(80);const interrupted=await pose();
 await page.evaluate(()=>viewer.rotate(.35));assert.ok(distance(await pose(),interrupted)<1e-7,'a repeated orbit input starts at the current visible pose');
 await run(320);assert.ok(Math.abs(angle(await pose(),beforeRepeat)-.7)<1e-5,'repeated orbit presses accumulate');

 await overview();await page.evaluate(()=>viewer.shot('rear',true));await run(1100);
 const shotStats=await stats();
 assert.ok(shotStats.poses.length>3,'named camera shots animate');
 assert.ok(shotStats.poses.every(point=>Math.hypot(point[0],point[2])>5),'the camera orbits outside the car instead of cutting through its body');
 const expectedRear=await page.evaluate(()=>shots.rear.position);
 assert.ok(distance(await pose(),expectedRear)<1e-5,'the final shot pose is rendered exactly');
 assert.equal(shotStats.shadows,0);

 // Native pointer input must take over a running shot and stay in control.
 await overview();await page.evaluate(()=>viewer.shot('rear',true));await run(240);
 await page.mouse.move(620,380);await page.mouse.down();await page.mouse.move(710,402,{steps:5});await page.mouse.up();
 await run(1800);const dragged=await pose();await run(320);
 assert.ok(await page.evaluate(()=>interactions>0),'dragging reaches OrbitControls');
 assert.ok(distance(dragged,expectedRear)>1,'dragging cancels the automatic shot');
 assert.ok(distance(await pose(),dragged)<.001,'drag inertia settles without resuming the cancelled shot');

 await motion('reduce');await run(32);await overview();
 const reducedStart=await pose();
 await page.evaluate(()=>viewer.rotate(.4));const reducedOrbit=await pose();
 assert.ok(Math.abs(angle(reducedOrbit,reducedStart)-.4)<1e-5,'reduced-motion orbit is immediate');
 await page.evaluate(()=>viewer.zoom(.8));const reducedZoom=await pose();
 assert.ok(Math.abs(radius(reducedZoom)/radius(reducedOrbit)-.8)<1e-5,'reduced-motion zoom is immediate');
 await run(320);assert.ok(distance(await pose(),reducedZoom)<1e-7);
 await page.evaluate(()=>viewer.shot('rear',true));
 assert.ok(distance(await pose(),expectedRear)<1e-5,'reduced-motion named shots are immediate');
 await motion('no-preference');await run(32);await overview();
 await page.evaluate(()=>viewer.rotate(.8));await run(80);
 await motion('reduce');await run(16);const stoppedMotion=await pose();
 await run(320);assert.ok(distance(await pose(),stoppedMotion)<1e-7,'enabling reduced motion stops an already-running camera tween');

 // Only changed shadow-casting geometry should refresh the shadow map.
 await motion('no-preference');await run(32);await overview();
 await page.evaluate(()=>viewer.operation({kind:'frunk',phase:'open'}));await run(240);
 assert.ok((await stats()).shadows>3,'moving hood and supports refresh their shadows');
 await run(2200);await reset();await run(320);
 assert.equal((await stats()).shadows,0,'open stationary hood reuses its shadow map');
 assert.equal((await stats()).renders,0,'open stationary hood stops rendering');
 // Restore a charging exercise directly, allowing the regular connector/cover
 // animation to be checked independently from the separate cinematic sequence.
 await page.evaluate(()=>viewer.operation({kind:'charge',phase:'charging'}));await reset();await run(240);
 assert.ok((await stats()).shadows>3,'moving charge cover and connector refresh their shadows');
 await run(2200);await reset();await run(320);const heldCharge=await stats();
 assert.ok(heldCharge.renders>3,'charging status light continues to pulse');
 assert.equal(heldCharge.shadows,0,'the status pulse does not rerender stationary shadows');
 await reset();await page.evaluate(()=>viewer.operation(null));await run(64);
 assert.ok((await stats()).shadows>0,'closing and hiding charging geometry invalidates its shadow');
 await reset();await run(320);assert.equal((await stats()).renders,0);
 assert.deepEqual(errors,[],'no browser or WebGL errors');
 await page.screenshot({path:'.tmp/viewer-qa/navigation.png'});
 await writeFile('.tmp/viewer-qa/report.json',JSON.stringify(measurements,null,2)+'\n');
 console.log('PASS: eased orbit/zoom, repeated inputs, outside-body camera path, drag takeover, reduced motion, settled render and shadow caching, moving-operation shadow updates.');
 console.log(JSON.stringify(measurements,null,2));
} finally {
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
