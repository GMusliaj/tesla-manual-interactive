import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,Raycaster,Vector3} from 'three';
import {createCabinSeats} from '../public/cabin-seats.js';
import {createCabinTrim} from '../public/cabin-trim.js';

test('five sculpted seats stay inside the cabin with distinct upholstery and dark front seatbacks',()=>{
 const car=new Group(),{root,inset,dark}=createCabinSeats(car);car.updateMatrixWorld(true);
 const seats=root.children.filter(o=>o.name.endsWith('-seat'));assert.equal(seats.length,5);
 const bounds=new Box3().setFromObject(root);assert.ok(bounds.min.x>-.72&&bounds.max.x<.72);assert.ok(bounds.max.y<1.5&&bounds.min.y>.44);
 for(const seat of seats){
  assert.equal(seat.getObjectByName('seat-back-perforated-panel').material,inset);
  assert.equal(seat.getObjectByName('seat-cushion-perforated-panel').material,inset);
  const head=seat.getObjectByName('white-headrest'),normal=head.geometry.attributes.normal;
  for(let i=0;i<normal.count;i++)assert.ok(Math.abs(new Vector3().fromBufferAttribute(normal,i).length()-1)<.001,'headrest normals stay smooth and normalized');
  // Headrest seam is projected onto the real rounded surface, never floating beside it.
  const seam=seat.getObjectByName('headrest-seam'),position=seam.geometry.attributes.position;
  const seamBounds=new Box3().setFromObject(seam),headBounds=new Box3().setFromObject(head).expandByScalar(.002);
  assert.ok(headBounds.containsBox(seamBounds),'headrest stitching stays within the actual padded headrest outline');
  if(seat.name.startsWith('front'))assert.equal(seat.getObjectByName('front-seat-dark-back').material,dark);
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
