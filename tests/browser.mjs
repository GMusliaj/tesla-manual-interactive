import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { lessons } from '../public/lessons.js';
import { englishLessons } from '../public/lessons.en.js';
await mkdir('.tmp',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.TEST_URL||'http://127.0.0.1:3000/';
const ready=page=>page.waitForFunction(()=>document.querySelector('#scene').dataset.state==='ready',{},{timeout:45000});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base);await ready(page);
 await page.screenshot({path:'.tmp/juniper-de.png',fullPage:true});
 assert.equal(await page.locator('#scene').getAttribute('data-model'),'juniper');
 for(const language of ['de','en']){
  await page.click('[data-language="'+language+'"]');
  const content=language==='de'?lessons:englishLessons;
  for(const [i,lesson] of content.entries()){
   console.log(language,lesson.id);
   await page.click('[data-chapter="'+lesson.id+'"]');
   const sequences={charge:['open','plug','stop','unlock','unplug','close'],frunk:['release','lift','cargo','lower','press','check'],regen:['drive','lift','brake']};
   if(sequences[lesson.id]){
    await page.click('[data-action="reset"]');
    for(const action of sequences[lesson.id])await page.click('[data-action="'+action+'"]');
   }
   assert.ok((await page.locator('#manualLink').getAttribute('href')).includes('/'+(language==='en'?'en_eu':'de_de')+'/'));
   for(const [j,data] of lesson.steps.entries()){
    assert.equal(await page.locator('#guideTitle').textContent(),data.title);
    if(data.detail){
     await page.click('.detail-button');
     await page.waitForFunction(()=>{const i=document.querySelector('#detailImage');return i.complete&&i.naturalWidth>0;});
     await page.click('[data-close="detailDialog"]');
    }
    if(data.lab==='charge'){
     await page.click('[data-signal="error"]');
     assert.equal(await page.locator('.charge-indicator i').getAttribute('class'),'red');
    }
    if(data.quiz){
     const options=page.locator('.exercise .choices button');
     assert.equal(await page.locator('#next').isDisabled(),true);
     await options.nth((data.quiz.answer+1)%data.quiz.options.length).click();
     assert.equal(await page.locator('#next').isDisabled(),true);
     await options.nth(data.quiz.answer).click();
     assert.equal(await page.locator('#next').isDisabled(),false);
     const other=language==='de'?'en':'de';
     await page.click('[data-language="'+other+'"]');
     assert.equal(await page.locator('#next').isDisabled(),false);
     assert.equal(await page.locator('.correct').count(),1);
     await page.click('[data-language="'+language+'"]');
    }
    await page.click('#next');
   }
  }
 }
 assert.match(await page.locator('#guideTitle').textContent(),/Completed/);
 await page.reload();await ready(page);
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert.equal(await page.locator('.chapters .completed').count(),7);
 await page.click('#referenceOpen');
 for(const name of ['front','side','rear','wheel','interior','seats']){
  await page.click('[data-ref="'+name+'"]');
  await page.waitForFunction(()=>{const i=document.querySelector('#detailImage');return i.complete&&i.naturalWidth>0;});
  assert.ok((await page.locator('#detailImage').getAttribute('src')).includes('de-config-'));
 }
 await page.screenshot({path:'.tmp/juniper-reference-en.png',fullPage:true});
 await page.click('[data-close="detailDialog"]');
 await page.click('#lighting');assert.ok(await page.locator('body').evaluate(b=>b.classList.contains('night')));
 await page.click('#lighting');
 await page.click('[data-view="rear"]');
 await page.screenshot({path:'.tmp/juniper-rear.png',fullPage:true});
 await page.click('[data-view="overview"]');
 await page.screenshot({path:'.tmp/juniper-en.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:'.tmp/juniper-mobile-en.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow');
 await page.click('[data-language="de"]');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'German mobile overflow');
 await page.click('[data-chapter="charge"]');await page.click('#next');
 await page.screenshot({path:'.tmp/juniper-mobile-de.png',fullPage:true});
 assert.deepEqual(errors,[]);
 const fallback=await browser.newPage();
 await fallback.route('**/models/juniper.glb',route=>route.abort());
 await fallback.goto(base);
 await fallback.waitForFunction(()=>document.querySelector('#scene').dataset.state==='error');
 await fallback.click('[data-language="en"]');await fallback.click('#next');
 assert.match(await fallback.locator('#guideTitle').textContent(),/Press first/);
 assert.equal(await fallback.locator('#renderError').isVisible(),true);
 assert.equal(await fallback.locator('#zoomIn').isDisabled(),true);
 console.log('PASS: 42 translated steps, 14 quizzes, charging/frunk/regen 3D actions, language switching after answers, persistence, six reference images, mobile layouts, 3D and failed-load fallback. No runtime errors.');
} finally {await browser.close();}
