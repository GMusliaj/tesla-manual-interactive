import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,Raycaster,Vector3} from 'three';
import {createCabinSeats} from '../public/cabin-seats.js';
import {createCabinTrim} from '../public/cabin-trim.js';

test('five sculpted seats stay inside the cabin with distinct upholstery and dark front seatbacks',()=>{
 const car=new Group(),{root,inset,dark,white}=createCabinSeats(car);car.updateMatrixWorld(true);
 const seats=root.children.filter(o=>o.name.endsWith('-seat'));assert.equal(seats.length,5);
 const bounds=new Box3().setFromObject(root);assert.ok(bounds.min.x>-.72&&bounds.max.x<.72);assert.ok(bounds.max.y<1.5&&bounds.min.y>.44);
 for(const seat of seats){
  const center=seat.name==='rear-center-seat';
  assert.equal(seat.getObjectByName(center?'rear-stowed-armrest':'seat-back-perforated-panel').material,center?white:inset);
  assert.equal(seat.getObjectByName('seat-cushion-perforated-panel').material,center?white:inset);
  const head=seat.getObjectByName('white-headrest'),normal=head.geometry.attributes.normal;
  for(let i=0;i<normal.count;i++)assert.ok(Math.abs(new Vector3().fromBufferAttribute(normal,i).length()-1)<.001,'headrest normals stay smooth and normalized');
  // Headrest seam is projected onto the real rounded surface, never floating beside it.
  const seam=seat.getObjectByName('headrest-seam'),position=seam.geometry.attributes.position;
  const seamBounds=new Box3().setFromObject(seam),headBounds=new Box3().setFromObject(head).expandByScalar(.002);
  assert.ok(headBounds.containsBox(seamBounds),'headrest stitching stays within the actual padded headrest outline');
  if(seat.name.startsWith('front')){const shell=seat.getObjectByName('front-seat-dark-back');assert.equal(shell.material,dark);const shellBounds=new Box3().setFromObject(shell);assert.ok(shellBounds.max.z-shellBounds.min.z>.12,'shell follows the leaned lumbar contour');}
  assert.ok(position.count>0);
 }
});

test('rear touchscreen faces rear passengers and all four door panels have pale pulls and lighting',()=>{
 const car=new Group(),{root,rear}=createCabinTrim(car);car.updateMatrixWorld(true);
 for(const side of ['left','right'])for(const row of ['front','rear']){
  const prefix=side+'-'+row+'-';assert.ok(root.getObjectByName(prefix+'door-pull').material.color.r>.5);
  assert.ok(root.getObjectByName(prefix+'ambient-strip'));
 }
 const screen=rear.getObjectByName('rear-screen-surface');const point=screen.getWorldPosition(new Vector3());
 const hits=new Raycaster(point.clone().add(new Vector3(0,0,.3)),new Vector3(0,0,-1)).intersectObject(rear,true);
 assert.equal(hits[0].object,screen,'screen, not the back of its housing, faces the second row');
 assert.ok(root.getObjectByName('rear-air-vent'));assert.ok(root.getObjectByName('rear-usb-c'));
});

// Rays probe the actual meeting of cushions, including where the earlier
// three separate chairs left gaps and hard vertical seams.
test('rear bench is continuous across five passenger and split-line positions',()=>{
 const car=new Group(),{root}=createCabinSeats(car);car.updateMatrixWorld(true);
 const bench=root.getObjectByName('rear-bench-connected-cushion');
 const back=root.getObjectByName('rear-bench-connected-back');
 for(const x of [-.438,-.226,0,.226,.438]){
  const cushion=new Raycaster(new Vector3(x,1,.68),new Vector3(0,-1,0)).intersectObject(bench);
  assert.ok(cushion.length&&cushion[0].point.y>.70&&cushion[0].point.y<.79);
  const lumbar=new Raycaster(new Vector3(x,.97,.7),new Vector3(0,0,1)).intersectObject(back);
  assert.ok(lumbar.length&&lumbar[0].point.z>.94&&lumbar[0].point.z<1.04);
 }
 const texture=root.getObjectByName('rear-left-seat').getObjectByName('seat-back-perforated-panel').material.map;
 const channels=texture.image.data;
 for(let i=0;i<channels.length;i+=4)assert.ok(channels[i]>=215,'tiny perforation stays low contrast in white leather');
});

// Check real curved surfaces from both normal seat viewpoints. Independently
// tessellated overlays used to cross the cushions despite positive vertex offsets.
test('perforated inserts sit consistently above their cushions without triangle intersections',()=>{
 const car=new Group(),{root}=createCabinSeats(car);car.updateMatrixWorld(true);
 const front=root.getObjectByName('front-left-seat'),rear=root.getObjectByName('rear-left-seat');
 const probes=[
  [front.getObjectByName('seat-back-perforated-panel'),front.getObjectByName('seat-back-cushion'),[0,0,1],(a,b)=>[-.52+a*.26,.78+b*.29,-.2]],
  [front.getObjectByName('seat-cushion-perforated-panel'),front.getObjectByName('seat-cushion'),[0,-1,0],(a,b)=>[-.52+a*.26,1,-.43+b*.34]],
  [rear.getObjectByName('seat-back-perforated-panel'),root.getObjectByName('rear-bench-connected-back'),[0,0,1],(a,b)=>[-.56+a*.24,.80+b*.27,.7]],
 ];
 for(const[panel,cushion,direction,point]of probes){
  let samples=0;
  for(let row=0;row<7;row++)for(let col=0;col<7;col++){
   const ray=new Raycaster(new Vector3(...point(col/6,row/6)),new Vector3(...direction));
   const top=ray.intersectObject(panel)[0],base=ray.intersectObject(cushion)[0];if(!top)continue;
   assert.ok(base,'an insert remains supported by its cushion');
   const gap=base.distance-top.distance;
   assert.ok(gap>.0003&&gap<.0006,`insert-to-cushion gap is ${gap} m`);samples++;
  }
  assert.ok(samples>=25,'probe enough of each insert, including curved bolsters');
 }
});
