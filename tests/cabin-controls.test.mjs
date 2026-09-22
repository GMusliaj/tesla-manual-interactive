import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Group, Quaternion, Raycaster, Vector3 } from 'three';
import { createCabinControls } from '../public/cabin-controls.js';

test('the wheel has an open lower spoke, two scroll wheels and a left turn stalk', () => {
  const car = new Group(), { wheel } = createCabinControls(car); car.updateMatrixWorld(true);
  const origin = wheel.localToWorld(new Vector3(0, -.112, .1));
  const direction = new Vector3(0, 0, -1).applyQuaternion(wheel.getWorldQuaternion(new Quaternion()));
  const opening = new Raycaster(origin, direction, 0, .25).intersectObject(wheel, true);
  assert.equal(opening.length, 0, 'the V-shaped opening below the horn pad must not contain a solid plate');
  assert.ok(wheel.getObjectByName('left-scroll-wheel').position.x < 0);
  assert.ok(wheel.getObjectByName('right-scroll-wheel').position.x > 0);
  const stalk = new Box3().setFromObject(wheel.getObjectByName('turn-signal-stalk'));
  assert.ok(stalk.max.x < -.42, 'turn stalk must project from the left of the steering column');
  assert.equal(wheel.getObjectByName('gear-stalk'), undefined);
});

test('landscape display and paired sloping phone pads fit above the covered console', () => {
  const car = new Group(), { display, console, tray, armrest } = createCabinControls(car); car.updateMatrixWorld(true);
  const screen = display.getObjectByName('screen-display'), size = screen.geometry.parameters;
  assert.ok(size.width / size.height > 1.5, 'display must be landscape');
  assert.ok(display.position.y > tray.position.y);
  assert.ok(tray.rotation.x < -.3 && tray.rotation.x > -.9, 'phone pads must slope down towards the console');
  const left = tray.getObjectByName('left-phone-pad'), right = tray.getObjectByName('right-phone-pad');
  assert.ok(left.position.x < 0 && right.position.x > 0);
  assert.ok(new Box3().setFromObject(left).max.x < new Box3().setFromObject(right).min.x, 'charging pads must remain separate');
  assert.ok(console.getObjectByName('console-closed-cover'));
  assert.ok(armrest.material.color.r > .6 && armrest.material.color.b > .5, 'the selected white interior includes the upholstered armrest');
  assert.ok(console.getObjectByName('console-rear-cover'), 'the console has two separate dark sliding lids');
  const sidewall = console.getObjectByName('console-left-white-sidewall');
  assert.equal(sidewall.material, armrest.material, 'the curved console sidewall uses the same white upholstery');
  assert.equal(tray.getObjectByName('phone-tray-frame').material, armrest.material, 'the phone tray has a white surround');
  assert.ok(console.getObjectByName('console-closed-cover').material.color.r < .05, 'storage lids remain dark');
  const bounds=new Box3().setFromObject(console);
  assert.ok(bounds.max.x < .14 && bounds.min.x > -.14, 'console must leave clearance to the rebuilt front seats at ±.147 m');
  assert.ok(bounds.max.x-bounds.min.x > .24, 'console surround must accommodate two phone pads at realistic width');
});
