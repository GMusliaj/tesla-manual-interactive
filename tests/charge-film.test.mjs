import test from 'node:test';
import assert from 'node:assert/strict';
import {chargeFilmAt,CHARGE_FILM_DURATION} from '../public/charge-film.js';

test('camera reaches the close-up before seating; charging begins only after full insertion',()=>{
 assert.equal(chargeFilmAt(0).stage,'wide');
 assert.equal(chargeFilmAt(2).stage,'approach');
 assert.equal(chargeFilmAt(2).insertion,0);
 const close=chargeFilmAt(3.2);assert.equal(close.close,1);assert.equal(close.approach,1);assert.equal(close.insertion,0);
 assert.equal(chargeFilmAt(4).seated,false);
 const seated=chargeFilmAt(4.6);assert.equal(seated.insertion,1);assert.equal(seated.seated,true);assert.equal(seated.retreat,0);
 const pullingBack=chargeFilmAt(7);assert.ok(pullingBack.retreat>0);assert.equal(pullingBack.insertion,1);
 const end=chargeFilmAt(CHARGE_FILM_DURATION);assert.equal(end.done,true);assert.equal(end.retreat,1);
});
test('connector only travels toward the inlet, with smooth phase boundaries',()=>{
 let previous={approach:0,insertion:0,close:0,retreat:0};
 for(let i=0;i<=840;i++){
  const frame=chargeFilmAt(i/100);
  for(const key of ['approach','insertion','close','retreat']){assert.ok(frame[key]>=previous[key]-1e-10);assert.ok(frame[key]>=0&&frame[key]<=1);}
  previous=frame;
 }
 for(const boundary of [.8,3.2,4.6,6.2,8.4]){
  const before=chargeFilmAt(boundary-.001),after=chargeFilmAt(boundary+.001);
  for(const key of ['approach','insertion','close','retreat'])assert.ok(Math.abs(after[key]-before[key])<.0001);
 }
});
