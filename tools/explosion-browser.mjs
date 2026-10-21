import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];let core,effects;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url();if(r.url().includes('/client/combat-effects.ts'))effects=r.url()});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.selectOption('#map','canyon');
 await page.evaluate(async({core,effects})=>{globalThis.B=await import(core);globalThis.S=B.EngineStore.LastCreatedScene;const {CombatEffects}=await import(effects);globalThis.testFX=new CombatEffects(S);globalThis.testManager=S.spriteManagers.at(-1);}, {core,effects});
 await page.waitForFunction(()=>testManager.texture.isReady(),null,{timeout:30000});
 const result=await page.evaluate(()=>{
  const at=new B.Vector3(0,.04,35);const texture=testManager.texture,ready=texture.isReady;texture.isReady=()=>false;testFX.explosion(at);const loadingFallbacks=S.meshes.filter(m=>['FX fire puff','FX smoke puff'].includes(m.name)).length;texture.isReady=ready;testFX.update(3);testFX.explosion(at);testFX.update(.32);const first=testManager.sprites[0];const firstFrame=first.cellIndex;
  testFX.explosion(at.add(new B.Vector3(3,0,0)));testFX.update(.08);const stages=testManager.sprites.map(s=>s.cellIndex);
  const fallbacks=S.meshes.filter(m=>['FX fire puff','FX smoke puff'].includes(m.name)).length;
  testFX.update(2);const cleaned=testManager.sprites.length;
  for(let n=0;n<30;n++)testFX.explosion(at);const capped=testManager.sprites.length;testFX.update(2);const finalCount=testManager.sprites.length;
  return {loadingFallbacks,firstFrame,stages,fallbacks,cleaned,capped,finalCount,depthWrites:testManager.disableDepthWrite};
 });console.log('PLAYBACK',result);assert.equal(result.loadingFallbacks,26);assert.equal(result.firstFrame,8);assert.deepEqual(result.stages,[10,2]);assert.equal(result.fallbacks,0);assert.equal(result.cleaned,0);assert.equal(result.capped,24);assert.equal(result.finalCount,0);assert.equal(result.depthWrites,true);
 await page.waitForFunction(()=>S.meshes.some(m=>m.name.includes('canyon-Sunspire architecture')&&m.getTotalVertices()>0),null,{timeout:60000});
 await page.evaluate(()=>{document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';globalThis.at=new B.Vector3(0,.04,35);globalThis.view={pos:[0,2.4,26],target:[0,1.8,35]};S.onBeforeRenderObservable.add(()=>{S.getTransformNodeByName('View weapon').setEnabled(false);S.activeCamera.position.set(...view.pos);S.activeCamera.fov=1.1;S.activeCamera.setTarget(new B.Vector3(...view.target));});});
 for(const [label,time] of [['fire',.32],['smoke',.96]]){
  await page.evaluate(t=>{testFX.update(2);testFX.explosion(at);testFX.update(t)},time);await page.waitForTimeout(400);await page.screenshot({path:'3d/effects/rocket-explosion/game-'+label+'.png'});
 }
 await page.evaluate(()=>{testFX.update(2);testFX.explosion(new B.Vector3(0,1.7,45.2));testFX.update(.32);view={pos:[0,2.4,36],target:[0,2,45.2]};});await page.waitForTimeout(400);await page.screenshot({path:'3d/effects/rocket-explosion/game-wall.png'});
 assert.deepEqual(errors,[]);console.log('PASS: independent impact animation frames, no legacy puffs, bounded concurrent effects, cleanup, and fire/smoke rendered on daylight arena');
}finally{await browser.close()}
