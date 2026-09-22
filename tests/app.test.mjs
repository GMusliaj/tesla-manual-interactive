import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { lessons, readProgress, saveProgress } from '../public/lessons.js';
import { englishLessons } from '../public/lessons.en.js';
import { ui } from '../public/locales.js';
import { manualBase, readLanguage, saveLanguage } from '../public/language.js';
import { requiresModel } from './asset-fixture.mjs';

test('both languages cover the same sourced stations and valid quizzes',()=>{
  assert.equal(lessons.length,7);
  assert.deepEqual(lessons.map(l=>l.id),englishLessons.map(l=>l.id));
  lessons.forEach((de,i)=>{
    const en=englishLessons[i];
    assert.equal(en.source,de.source);
    assert.match(de.source,/^GUID-[A-F0-9-]+\.html$/);
    assert.equal(en.steps.length,3);
    de.steps.forEach((step,j)=>{
      const translated=en.steps[j];
      assert.notEqual(step.title,translated.title);
      assert.notEqual(step.text,translated.text);
      for(const field of ['note','detail','lab'])if(step[field])assert.ok(translated[field]);
      if(step.quiz){
        assert.equal(translated.quiz.answer,step.quiz.answer);
        for(const q of [step.quiz,translated.quiz]){
          assert.ok(q.options[q.answer]);assert.ok(q.success);assert.ok(q.retry);
        }
      }
    });
  });
  assert.deepEqual(Object.keys(ui.de).sort(),Object.keys(ui.en).sort());
  assert.deepEqual(Object.keys(ui.de.aria).sort(),Object.keys(ui.en.aria).sort());
  assert.deepEqual(Object.keys(ui.de.captions).sort(),Object.keys(ui.en.captions).sort());
});
test('language routes use the requested European manual and tolerate unavailable storage',()=>{
  const values=new Map(), storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(manualBase('en'),'https://www.tesla.com/ownersmanual/modely/en_eu/');
  assert.equal(manualBase('de'),'https://www.tesla.com/ownersmanual/modely/de_de/');
  saveLanguage(storage,'en');assert.equal(readLanguage(storage),'en');
  saveProgress(storage,new Set(['doors','frunk']));
  assert.deepEqual([...readProgress(storage)],['doors','frunk']);
  saveLanguage(storage,'de');assert.equal(readProgress(storage).size,2);
  const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.equal(readLanguage(blocked),'de');
  assert.doesNotThrow(()=>saveLanguage(blocked,'en'));
  assert.doesNotThrow(()=>saveProgress(blocked,new Set(['doors'])));
  for(const value of ['invalid','null','{}','["doors","invalid","doors"]']){
    assert.deepEqual([...readProgress({getItem:()=>value})],value.startsWith('[')?['doors']:[]);
  }
});
test('the optional GLB decodes into a detailed car with vehicle-scale proportions',requiresModel,async()=>{
  const bytes=await readFile(new URL('../public/models/juniper.glb',import.meta.url));
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  let triangles=0,meshes=0;
  gltf.scene.traverse(mesh=>{if(mesh.isMesh){meshes++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;}});
  const size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());
  assert.ok(meshes>50);assert.ok(triangles>300000);
  assert.ok(size.x>2&&size.x<2.2);assert.ok(size.y>1.6&&size.y<1.7);assert.ok(size.z>4.7&&size.z<4.9);
});
