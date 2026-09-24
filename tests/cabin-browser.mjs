import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createStaticServer} from '../server.mjs';
import {requiresModel} from './asset-fixture.mjs';
assert.equal(requiresModel.skip,false,'Cabin browser verification requires the optional local model.');
await mkdir('.tmp/cabin-qa',{recursive:true});
const server=createStaticServer();await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:process.env.SOFTWARE_RENDERING?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/assets.json',r=>r.fulfill({json:{model:true,images:[]}}));
 // Expose the real viewer through a test-only module response, not production globals.
 await page.route('**/model.js',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('  return {\n    shot:fitShot','  return window.cabinViewer = {\n    shot:fitShot')});});
 await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.waitForFunction(()=>document.querySelector('#scene').dataset.state==='ready',null,{timeout:60000});
 const click=async selector=>{await page.locator(selector).dispatchEvent('click');await page.clock.runFor(80);};
 for(const language of ['de','en']){
  await click('[data-language="'+language+'"]');await click('[data-view="cabin"]');
  assert.equal(await page.locator('[data-view="cabin"]').textContent(),language==='de'?'Innenraum':'Interior');
  for(const shot of ['cabin','cabinRear','cabinScreen']){
   await click('[data-cabin-view="'+shot+'"]');
   assert.equal(await page.locator('#scene').getAttribute('data-shot'),shot);
   const visibility=await page.evaluate(()=>{
    const v=cabinViewer,car=v.car,screen=car.getObjectByName(document.querySelector('#scene').dataset.shot==='cabinScreen'?'rear-screen-surface':'screen-display');
    car.updateMatrixWorld(true);const point=screen.position.clone();screen.getWorldPosition(point);point.project(v.camera);
    return {screen:[point.x,point.y,point.z],opacity:v.renderer.domElement.style.opacity,inside:v.camera.position.y<1.55,seatCount:car.getObjectByName('juniper-seats').children.filter(x=>x.name.endsWith('-seat')).length};
   });
   assert.equal(visibility.opacity,'1');assert.ok(visibility.inside);assert.equal(visibility.seatCount,5);
   if(shot!=='cabinRear')assert.ok(visibility.screen.every(p=>Math.abs(p)<1),'display must be in the camera frustum: '+JSON.stringify(visibility));
   await page.screenshot({path:'.tmp/cabin-qa/ui-'+language+'-'+shot+'.png'});
  }
  await page.locator('#scene canvas').focus();await page.keyboard.press('Home');await page.clock.runFor(80);
  assert.equal(await page.locator('[data-view="overview"]').getAttribute('aria-pressed'),'true');
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 await click('[data-view="cabin"]');await click('[data-view="cabin"]');await page.clock.runFor(500);
 assert.ok(await page.evaluate(()=>cabinViewer.camera.position.y<1.55));
 await click('[data-chapter="charge"]');await page.clock.runFor(1100);await click('[data-action="open"]');await page.clock.runFor(700);
 await click('[data-view="cabin"]');await page.clock.runFor(450);await click('[data-action="plug"]');await page.clock.runFor(900);
 assert.equal(await page.locator('#scene canvas').evaluate(el=>el.style.opacity),'1');
 assert.ok(await page.evaluate(()=>cabinViewer.camera.position.length()>3),'charging must restore exterior camera limits');
 await page.clock.runFor(9000);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(150);
 for(const shot of ['cabin','cabinRear','cabinScreen']){
  await click('[data-view="cabin"]');await click('[data-cabin-view="'+shot+'"]');await page.locator('.studio').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'.tmp/cabin-qa/mobile-'+shot+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS: five seats, visible front/rear displays, DE/EN interior views, Home state, repeated view changes, charging after interior, mobile layout; no browser errors.');
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
