import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createStaticServer} from '../server.mjs';
import {requiresModel} from './asset-fixture.mjs';

assert.equal(requiresModel.skip,false,'Rear-light browser verification requires the optional local model.');
await mkdir('.tmp/rear-qa',{recursive:true});
const server=createStaticServer();
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
let browser;
try {
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/assets.json',route=>route.fulfill({json:{model:true,images:[]}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/#lights');
 await page.waitForFunction(()=>document.querySelector('#scene').dataset.state==='ready',null,{timeout:60000});
 const click=async selector=>{
  await page.click(selector);
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(done)))));
 };
 async function redPixels() {
  const png=await page.locator('#scene canvas').screenshot();
  return page.evaluate(async base64=>{
   const blob=await (await fetch('data:image/png;base64,'+base64)).blob();
   const image=await createImageBitmap(blob),canvas=document.createElement('canvas');
   canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let count=0;for(let i=0;i<data.length;i+=4)if(data[i]>150&&data[i]>data[i+1]*1.8&&data[i]>data[i+2]*1.8)count++;
   return count;
  },png.toString('base64'));
 }
 for(const language of ['de','en']) {
  await click('[data-language="'+language+'"]');
  await click('.light-switch button:nth-child(2)');
  assert.equal(await page.locator('#scene').getAttribute('data-shot'),'rearLights');
  const day=await redPixels();
  await click('#lighting');const night=await redPixels();
  assert.ok(night>day*4+500,'the reflected band must actually render red, not just change UI state: '+JSON.stringify({language,day,night}));
  await page.screenshot({path:'.tmp/rear-qa/ui-'+language+'.png'});
  await click('[data-chapter="charge"]');
  for(const action of ['open','plug','stop','unlock','unplug','close'])await click('[data-action="'+action+'"]');
  await click('[data-chapter="regen"]');
  await click('[data-chapter="lights"]');await click('.light-switch button:nth-child(2)');
  const restored=await redPixels();
  assert.ok(Math.abs(restored-night)/night<.01,'chapter changes must preserve the rendered rear lights');
  await click('#lighting');
 }
 await page.setViewportSize({width:390,height:844});
 await click('.light-switch button:nth-child(2)');await click('#lighting');
 await page.locator('.studio').scrollIntoViewIfNeeded();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile overflow');
 assert.ok(await redPixels()>150,'rear band remains visible on mobile');
 await page.screenshot({path:'.tmp/rear-qa/ui-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: DE/EN rear close-up, visible red pixels, day/night, charge and energy restoration, mobile; no WebGL or browser errors.');
} finally {
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
