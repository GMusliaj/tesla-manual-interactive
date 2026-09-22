export const OPERATIONS = ['charge','frunk','regen'];
export const initialOperation = kind => kind==='regen'
  ? {kind,phase:'drive',condition:'normal',seen:[],complete:false}
  : {kind,phase:'closed',cargo:false,complete:false};
const transitions={
 charge:{closed:{open:'open'},open:{plug:'charging'},charging:{stop:'stopped'},stopped:{unlock:'unlocked'},unlocked:{unplug:'removed'},removed:{close:'closed'}},
 frunk:{closed:{release:'released'},released:{lift:'open'},open:{lower:'lowered'},lowered:{press:'latched'},latched:{check:'checked'},checked:{release:'released'}}
};
export function operate(state, action) {
 if(action==='reset')return initialOperation(state.kind);
 if(state.kind==='regen'){
  if(['normal','cold','full'].includes(action))return {...state,condition:action};
  if(!['drive','lift','brake','standstill'].includes(action))return state;
  const seen=[...new Set([...state.seen,action])];
  return {...state,phase:action,seen,complete:['drive','lift','brake'].every(x=>seen.includes(x))};
 }
 if(state.kind==='frunk'&&state.phase==='open'&&action==='cargo')return {...state,cargo:!state.cargo};
 const phase=transitions[state.kind]?.[state.phase]?.[action];
 if(!phase)return state;
 return {...state,phase,complete:state.complete||(state.kind==='charge'&&state.phase==='removed'&&action==='close')||(state.kind==='frunk'&&phase==='checked')};
}
export function actionsFor(state){
 if(state.kind==='regen')return ['drive','lift','brake','standstill'];
 return [...Object.keys(transitions[state.kind]?.[state.phase]||{}),...(state.kind==='frunk'&&state.phase==='open'?['cargo']:[])];
}
export function energyFlow(state){
 if(state.phase==='standstill')return {direction:0,friction:false,limited:false};
 if(state.phase==='drive')return {direction:1,friction:false,limited:false};
 return {direction:state.condition==='normal'?-1:state.condition==='cold'?-.3:0,friction:state.phase==='brake'||state.condition!=='normal',limited:state.condition!=='normal'};
}
