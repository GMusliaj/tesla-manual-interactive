import { lessons as germanLessons, readProgress, saveProgress } from './lessons.js';
import { englishLessons } from './lessons.en.js';
import { ui, aboutCopy } from './locales.js';
import { manualBase, readLanguage, saveLanguage } from './language.js';
import { OPERATIONS, initialOperation } from './operation-state.js';
import { operationPanel } from './operation-panel.js';
import { operationCopy } from './operation-copy.js';
const $ = s => document.querySelector(s);
let assets={model:false,modelUrl:'',images:[]};
try{
  const response=await fetch('./assets.json');
  if(response.ok){const data=await response.json();assets={model:data.model===true,modelUrl:typeof data.modelUrl==='string'?data.modelUrl:'',images:Array.isArray(data.images)?data.images:[]};}
}catch{ /* The guide remains usable if the optional asset manifest is unavailable. */ }
const availableImages=new Set(assets.images);
let storage; try { storage=localStorage; } catch { storage={getItem:()=>null,setItem:()=>{}}; }
const completed=readProgress(storage);
let language=readLanguage(storage), lessons=language==='en'?englishLessons:germanLessons, t=ui[language];
let finished=false, currentDetail=null, detailComparison=false;
const manual=()=>manualBase(language);
let selected=-1, step=0, answered=false, viewer=null, night=false, labels=true;
const operationStates=new Map(OPERATIONS.map(kind=>[kind,initialOperation(kind)]));
const currentOperation=()=>selected>=0?operationStates.get(lessons[selected].id):null;
const operationReady=()=>!currentOperation()||currentOperation().complete;
const readingOnly=()=>!assets.model;
const canContinue=()=>operationReady()||readingOnly();
function recordCompletion(){
  if(selected>=0&&answered&&operationReady()){completed.add(lessons[selected].id);saveProgress(storage,completed);}
}
const refs={
  front:{src:'./references/de-config-front.png',source:'https://www.tesla.com/de_de/modely/design'},
  side:{src:'./references/de-config-side.png',source:'https://www.tesla.com/de_de/modely/design'},
  rear:{src:'./references/de-config-rear.png',source:'https://www.tesla.com/de_de/modely/design'},
  wheel:{src:'./references/de-config-wheel.png',source:'https://www.tesla.com/de_de/modely/design'},
  interior:{src:'./references/de-config-interior-white.png',source:'https://www.tesla.com/de_de/modely/design'},
  seats:{src:'./references/de-config-seats-white.png',source:'https://www.tesla.com/de_de/modely/design'},
  handle:{src:'./references/door-handle.gif',lesson:0},
  frunk:{src:'./references/frunk-close.png',lesson:3},
  chargePort:{src:'./references/juniper-charge-port.jpg',lesson:2},
  frontRelease:{src:'./references/emergency-front.png',lesson:5},
};
function detail(name, comparison=false) {
  const r=refs[name]; if(!r)return;
  currentDetail=name;detailComparison=comparison;
  const [title,caption]=t.captions[name];
  $('#detailTitle').textContent=title;$('#detailText').textContent=caption;
  $('#detailImage').hidden=!availableImages.has(r.src);
  if(availableImages.has(r.src))$('#detailImage').src=r.src;
  else{$('#detailImage').removeAttribute('src');$('#detailText').textContent+=' '+t.imageExternal;}
  $('#detailImage').alt=title+t.imageSuffix;
  $('#detailSource').href=r.source||manual()+lessons[r.lesson].source;
  $('#referenceTabs').hidden=!comparison;
  document.querySelectorAll('[data-ref]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ref===name)));
  if(!$('#detailDialog').open)$('#detailDialog').showModal();
}
$('#detailImage').addEventListener('error',()=>{$('#detailImage').hidden=true;$('#detailText').textContent+=' '+t.imageFailed;});
$('#detailImage').addEventListener('load',()=>{$('#detailImage').hidden=false;});
document.querySelectorAll('[data-ref]').forEach(b=>b.addEventListener('click',()=>detail(b.dataset.ref,true)));
$('#referenceOpen').addEventListener('click',()=>detail('front',true));
$('#aboutOpen').addEventListener('click',()=>$('#aboutDialog').showModal());
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const chapterButtons=[], pins=[];
lessons.forEach((lesson,i)=>{
  const b=document.createElement('button');b.innerHTML='<span class="number">'+String(i+1).padStart(2,'0')+'</span><span><strong>'+lesson.name+'</strong><small>'+lesson.sub+'</small></span>';b.dataset.chapter=lesson.id;
  b.addEventListener('click',()=>select(i));$('#chapters').append(b);chapterButtons.push(b);
  const pin=document.createElement('button');pin.className='hotspot';pin.innerHTML='<span class="pin">'+(i+1)+'</span><span class="pin-label">'+lesson.name+'</span>';pin.setAttribute('aria-label',t.pin(lesson.name));pin.dataset.hotspot=lesson.id;pin.hidden=true;
  pin.addEventListener('click',()=>select(i));$('#hotspots').append(pin);pins.push(pin);
});
function updateProgress() {
  chapterButtons.forEach((b,i)=>{b.classList.toggle('completed',completed.has(lessons[i].id));b.querySelector('.number').textContent=completed.has(lessons[i].id)?'✓':String(i+1).padStart(2,'0');b.setAttribute('aria-current',selected===i?'step':'false');});
  $('#progressText').textContent=t.progress(completed.size,lessons.length);
}
function select(i, s=0) {
  if(i<0||i>=lessons.length)return;
  finished=false;selected=i;step=Math.max(0,Math.min(s,lessons[i].steps.length-1));answered=false;
  history.replaceState(null,'','#'+lessons[i].id);
  viewer?.shot(lessons[i].id);
  viewer?.operation(currentOperation());
  setViewButtons(lessons[i].id==='cabin'?'cabin':null);
  render();
}
function setViewButtons(name){document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(name?.startsWith('cabin')?'cabin':name))));document.querySelectorAll('[data-cabin-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cabinView===name)));}
function render(){
  updateProgress();pins.forEach((pin,i)=>pin.classList.toggle('active',i===selected));
  if(selected<0){
    viewer?.operation(null);
    $('#lessonContent').innerHTML='<div class="chapter-num">01—'+String(lessons.length).padStart(2,'0')+'</div><h2 id="guideTitle">'+(finished?(completed.size===lessons.length?t.done:t.backHome):t.welcome)+'</h2><p class="welcome-subtitle">'+t.intro+'</p><ul class="welcome-list">'+t.welcomeList.map((item,i)=>'<li><b>'+(i+1)+'</b>'+item+'</li>').join('')+'</ul><p class="welcome-footnote">'+t.saved+'</p>';
    $('#stepProgress').replaceChildren();$('#previous').hidden=true;
    $('#chapterLabel').textContent=t.first;$('#stepLabel').textContent=t.stations;
    $('#next').disabled=false;$('#next').innerHTML=(finished?t.again:t.start)+' <span aria-hidden="true">→</span>';
    $('#manualLink').href=manual();return;
  }

  const lesson=lessons[selected], data=lesson.steps[step];
  $('#chapterLabel').textContent=String(selected+1).padStart(2,'0')+' / '+lesson.name.toUpperCase();
  $('#stepLabel').textContent=t.step(step+1,lesson.steps.length);
  $('#stepProgress').innerHTML=lesson.steps.map((_,i)=>'<i class="'+(i<=step?'done':'')+'"></i>').join('');
  const content=$('#lessonContent');content.replaceChildren();
  const heading=document.createElement('h2');heading.id='guideTitle';heading.textContent=data.title;heading.style.whiteSpace='pre-line';content.append(heading);
  const text=document.createElement('p');text.textContent=data.text;content.append(text);
  if(currentOperation())operationPanel(content,currentOperation(),language,viewer,next=>{
    operationStates.set(next.kind,next);viewer?.operation(next);recordCompletion();render();
  });
  if(data.note){const n=document.createElement('div');n.className='note';n.textContent=data.note;content.append(n);}
  if(data.detail){const b=document.createElement('button');b.className='detail-button';b.innerHTML='<span aria-hidden="true">↗</span><span>'+t.original+'<small>TESLA · MODEL Y 2025+</small></span>';b.addEventListener('click',()=>detail(data.detail));content.append(b);}
  if(data.extraSource){const a=document.createElement('a');a.className='welcome-footnote';a.href=data.extraSource;a.target='_blank';a.rel='noopener';a.textContent=t.design;content.append(a);}
  if(data.lab==='charge'){
    const lab=document.createElement('div');lab.className='exercise';
    lab.innerHTML='<div class="eyebrow">'+t.lightLab+'</div><div class="charge-indicator"><i class="pulse"></i><span>'+t.signals.charging+'</span></div><div class="choices"><button data-signal="charging">'+t.charging+'</button><button data-signal="complete">'+t.charged+'</button><button data-signal="error">'+t.fault+'</button></div>';
    const states={charging:'pulse',complete:'',error:'red'};
    lab.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      lab.querySelector('i').className=states[b.dataset.signal];lab.querySelector('.charge-indicator span').textContent=t.signals[b.dataset.signal];$('#announce').textContent=t.signals[b.dataset.signal];
    }));content.append(lab);
  }
  if(data.lab==='lights'){const lab=document.createElement('div');lab.className='light-switch';lab.innerHTML='<button>'+t.tryNight+'</button><button>'+t.showRear+'</button>';lab.children[0].addEventListener('click',()=>setNight(!night));lab.children[1].addEventListener('click',()=>{viewer?.shot('rearLights');setViewButtons('rear');});content.append(lab);}

  if(data.quiz){
    const q=data.quiz, box=document.createElement('div');box.className='exercise';box.innerHTML='<div class="eyebrow">'+t.tryQuestion+'</div><h3></h3><div class="choices"></div><p class="feedback" role="status"></p>';box.querySelector('h3').textContent=q.question;
    q.options.forEach((option,i)=>{const b=document.createElement('button');b.textContent=option;if(answered&&i===q.answer)b.classList.add('correct');b.addEventListener('click',()=>{
      if(answered)return;
      box.querySelectorAll('button').forEach(x=>x.classList.remove('incorrect'));
      const correct=i===q.answer;b.classList.add(correct?'correct':'incorrect');box.querySelector('.feedback').textContent=correct?q.success:q.retry;
      if(correct){answered=true;recordCompletion();updateProgress();$('#next').disabled=!canContinue();if(!operationReady())box.querySelector('.feedback').textContent+=' '+(readingOnly()?t.readingOnly:operationCopy[language].required);}
    });box.querySelector('.choices').append(b);});if(answered)box.querySelector('.feedback').textContent=q.success;content.append(box);
  }
  $('#manualLink').href=manual()+lesson.source;$('#previous').hidden=false;
  $('#next').disabled=Boolean(data.quiz&&(!answered||!canContinue()));
  if(data.quiz&&answered&&!operationReady())content.querySelector('.feedback').textContent+=' '+(readingOnly()?t.readingOnly:operationCopy[language].required);
  $('#next').innerHTML=(step<lesson.steps.length-1?t.next:selected<lessons.length-1?t.nextStation:t.finish)+' <span aria-hidden="true">→</span>';
  $('#announce').textContent=lesson.name+', '+t.step(step+1,lesson.steps.length)+': '+data.title.replaceAll('\n',' ');

}
$('#next').addEventListener('click',()=>{
  if(selected<0){select(0);return;}
  if(step<lessons[selected].steps.length-1){select(selected,step+1);return;}
  if(!answered||!canContinue())return;
  if(selected<lessons.length-1){select(selected+1);return;}
  selected=-1;finished=true;viewer?.shot('overview');history.replaceState(null,'',location.pathname);render();setViewButtons('overview');
  $('#announce').textContent=t.completeCount(completed.size);
});
$('#previous').addEventListener('click',()=>{
  if(step>0)select(selected,step-1);
  else if(selected>0)select(selected-1);
  else{selected=-1;finished=false;history.replaceState(null,'',location.pathname);render();viewer?.shot('overview');setViewButtons('overview');}
});

function setNight(value){night=value;document.body.classList.toggle('night',night);$('#lighting').setAttribute('aria-pressed',String(night));viewer?.lighting(night);}
$('#lighting').addEventListener('click',()=>setNight(!night));
$('#labelsToggle').addEventListener('click',()=>{labels=!labels;$('#labelsToggle').setAttribute('aria-pressed',String(labels));$('#labelsToggle').textContent=labels?t.labelsOn:t.labelsOff;$('#hotspots').hidden=!labels;});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{viewer?.shot(b.dataset.view);setViewButtons(b.dataset.view);}));
$('#zoomIn').addEventListener('click',()=>viewer?.zoom(.86));$('#zoomOut').addEventListener('click',()=>viewer?.zoom(1.16));
$('#orbitLeft').addEventListener('click',()=>viewer?.rotate(-Math.PI/8));$('#orbitRight').addEventListener('click',()=>viewer?.rotate(Math.PI/8));
document.querySelectorAll('[data-cabin-view]').forEach(b=>b.addEventListener('click',()=>{viewer?.shot(b.dataset.cabinView);setViewButtons(b.dataset.cabinView);}));
$('#scene').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')viewer?.rotate(-.2);if(e.key==='ArrowRight')viewer?.rotate(.2);if(e.key==='+')viewer?.zoom(.86);if(e.key==='-')viewer?.zoom(1.16);if(e.key==='Home'){viewer?.shot('overview');setViewButtons('overview');}}});
$('#resetProgress').addEventListener('click',()=>{completed.clear();saveProgress(storage,completed);for(const kind of OPERATIONS)operationStates.set(kind,initialOperation(kind));answered=false;finished=false;viewer?.operation(currentOperation());render();$('#resetProgress').textContent=t.resetDone;});
function showRenderError(error,optional=false){
  if(error)console.error('Juniper scene unavailable:',error);
  $('#loading').hidden=true;$('#renderError').hidden=false;$('#scene').dataset.state=optional?'unavailable':'error';$('#hotspots').hidden=true;
  $('#renderError p').textContent=optional?t.assetsAbsent:t.error;
  $('#retry').hidden=optional;
  if(!optional&&availableImages.has('./references/juniper-front.jpg')){$('#renderError img').src='./references/juniper-front.jpg';$('#renderError img').hidden=false;}
  document.querySelectorAll('[data-view],#lighting,#labelsToggle,#zoomIn,#zoomOut,#orbitLeft,#orbitRight').forEach(b=>b.disabled=true);
}
$('#retry').addEventListener('click',()=>location.reload());

function setLanguage(value) {
  language=value==='en'?'en':'de';saveLanguage(storage,language);
  lessons=language==='en'?englishLessons:germanLessons;t=ui[language];
  document.documentElement.lang=language;document.title=t.title;
  document.querySelector('meta[name="description"]').content=t.intro;
  const textMap={'.skip':t.skip,'#aboutOpen':t.info,'#referenceOpen':t.references,'.identity .eyebrow':t.eyebrow,
    '#labelsToggle':labels?t.labelsOn:t.labelsOff,'#sceneHint':t.hint,'.model-label':t.model,
    '.page-footer > span:first-child':t.foot,'#loading strong':t.load,'#renderError p':assets.model?t.error:t.assetsAbsent,'#retry':t.retry,'#assetSources':t.assetSources,
    '#manualLink':t.manual,'#detailSource':t.source,'#aboutTitle':t.aboutTitle,
    '#aboutDialog .eyebrow':t.transparency,'#resetProgress':t.reset};
  for(const [selector,value] of Object.entries(textMap))$(selector).textContent=value;
  $('.trim').innerHTML='Premium Long Range AWD <span>·</span> '+t.generation;
  $('#lighting').innerHTML='<span class="sun" aria-hidden="true">◐</span> '+t.night;
  if(!viewer)$('#loadPercent').textContent=t.loading;
  $('.wordmark').setAttribute('aria-label','Model Y Juniper — '+t.overview);
  $('#aboutOpen').setAttribute('aria-label',t.info);
  $('#renderError img').alt=t.captions.front[0]+t.imageSuffix;
  for(const [selector,value] of Object.entries(t.aria))$(selector)?.setAttribute('aria-label',value);
  document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===language)));
  document.querySelectorAll('[data-view]').forEach(b=>b.textContent=t[b.dataset.view]);
  document.querySelectorAll('[data-cabin-view]').forEach(b=>b.textContent=t.cabinViews[b.dataset.cabinView]);
  $('.cabin-views').setAttribute('aria-label',t.cabin);
  document.querySelectorAll('[data-ref]').forEach(b=>b.textContent=t[b.dataset.ref]);
  lessons.forEach((lesson,i)=>{
    chapterButtons[i].querySelector('strong').textContent=lesson.name;chapterButtons[i].querySelector('small').textContent=lesson.sub;
    pins[i].querySelector('.pin-label').textContent=lesson.name;pins[i].setAttribute('aria-label',t.pin(lesson.name));
  });
  $('#aboutContent').innerHTML=aboutCopy[language];
  $('#assetSources').href='./sources.html?lang='+language;
  $('#aboutContent').querySelector('[data-sources]').href='./sources.html?lang='+language;
  if(!assets.model){$('#sceneHint').textContent=t.readingOnly;$('.model-label').textContent='';}
  render();
  if($('#detailDialog').open&&currentDetail)detail(currentDetail,detailComparison);
}
document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.language)));

setLanguage(language);
const deepLink=lessons.findIndex(l=>l.id===location.hash.slice(1));if(deepLink>=0)select(deepLink);
try {
  if(!assets.model){showRenderError(null,true);render();}
  else{
  const {createViewer}=await import('./model.js');
  viewer=await createViewer($('#scene'),{modelUrl:assets.modelUrl||'./models/juniper.glb',onProgress:p=>$('#loadPercent').textContent=Math.round(p*100)+' %',onInteract:()=>setViewButtons(null),onContextLost:()=>showRenderError('WebGL context lost')});
  viewer.onSequence(()=>{
    const focusOnFilm=Boolean(document.activeElement?.dataset.connection);render();
    if(focusOnFilm)document.querySelector('.connection-film')?.focus({preventScroll:true});
  });
  $('#loading').hidden=true;$('#scene').dataset.state='ready';
  $('.scene canvas').setAttribute('aria-label',t.aria['.scene canvas']);
  if(selected>=0)viewer.shot(lessons[selected].id,false);
  viewer.operation(currentOperation());render();
  viewer.onFrame(()=>{
    if(!labels)return;
    lessons.forEach((lesson,i)=>{
      const p=viewer.project(lesson.anchor), pin=pins[i];
      // Keep front annotations out of rear views, and hide left-side controls from the opposite side.
      const front=viewer.camera.position.z<.5, left=viewer.camera.position.x<.2;
      const facing=lesson.id==='regen'?true:[left,front,left&&!front,front,front,left&&!front][i];
      const show=p.visible&&facing&&(selected>=0?i===selected:true)&&!currentOperation();
      if(pin.hidden===show)pin.hidden=!show;
      if(show){pin.style.left=(p.x*100)+'%';pin.style.top=(p.y*100)+'%';}
    });
  });
  }
} catch(error){showRenderError(error);}
