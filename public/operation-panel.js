import { actionsFor, operate } from './operation-state.js';
import { operationCopy } from './operation-copy.js';

export function operationPanel(container,state,language,viewer,onChange){
 const t=operationCopy[language],panel=document.createElement('section');
 const sequence=state.kind==='charge'?viewer?.sequenceState():null;
 panel.className='operation-panel';panel.setAttribute('aria-label',t.heading);
 const title=document.createElement('div');title.className='eyebrow';title.textContent=t.heading;panel.append(title);
 const status=document.createElement('p');status.className='operation-status';status.setAttribute('role','status');
 status.textContent=state.kind==='charge'&&state.complete&&state.phase==='closed'?t.charge.done:t[state.kind][state.phase];
 if(sequence?.playing)status.textContent=t.film[sequence.stage];
 panel.append(status);
 if(!viewer?.operationAvailable(state.kind)){
  status.textContent=['error','unavailable'].includes(document.querySelector('#scene').dataset.state)?t.unavailable:t.wait;
  container.append(panel);return;
 }
 const actions=document.createElement('div');actions.className='operation-actions';
 for(const action of actionsFor(state)){
  const b=document.createElement('button');b.type='button';b.dataset.action=action;
  b.disabled=Boolean(sequence?.playing);
  b.textContent=t.actions[state.kind==='regen'&&action==='lift'?'liftRegen':action];
  if(state.kind==='regen')b.setAttribute('aria-pressed',String(state.phase===action));
  b.addEventListener('click',()=>onChange(operate(state,action)));actions.append(b);
 }
 panel.append(actions);
 if(state.kind==='charge'&&state.phase==='charging'){
  const filmButton=document.createElement('button');filmButton.type='button';filmButton.className='connection-film';
  filmButton.dataset.connection=sequence?.playing?'skip':'replay';
  filmButton.textContent=sequence?.playing?t.film.skip:sequence?.reduced?t.film.inspect:t.film.replay;
  filmButton.addEventListener('click',()=>sequence?.playing?viewer.finishConnection():viewer.replayConnection());panel.append(filmButton);
 }
 if(state.kind==='regen'){
  const label=document.createElement('label');label.className='condition';
  const select=document.createElement('select');select.id='batteryCondition';select.setAttribute('aria-label',language==='de'?'Batteriezustand':'Battery condition');
  for(const condition of ['normal','cold','full']){const option=document.createElement('option');option.value=condition;option.textContent=t[condition];select.append(option);}
  select.value=state.condition;select.addEventListener('change',()=>onChange(operate(state,select.value)));
  label.append(select);panel.append(label);
  const note=document.createElement('p');note.className='operation-note';note.textContent=(state.condition==='normal'?'':t.regen.limited+' ')+t.regen.note;panel.append(note);
 }
 const footer=document.createElement('div');footer.className='operation-footer';
 const reset=document.createElement('button');reset.type='button';reset.className='operation-reset';reset.dataset.action='reset';reset.textContent=t.reset;reset.addEventListener('click',()=>onChange(operate(state,'reset')));footer.append(reset);
 if(state.complete){const done=document.createElement('span');done.textContent=language==='de'?'Ablauf geübt ✓':'Sequence practised ✓';footer.append(done);}
 panel.append(footer);
 const note=document.createElement('small');note.textContent=t.schematic;panel.append(note);
 container.append(panel);
}
