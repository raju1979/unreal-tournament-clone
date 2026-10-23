import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],warnings=[],states=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('presentation'))warnings.push(m.text())});
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{const m=JSON.parse(f.payload.toString());if(m.type==='state')states.push(m);}catch{}}));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 assert.equal(await page.locator('.avatar-choice').count(),2);
 await page.locator('[data-avatar="azure-vanguard"]').click();
 await page.reload();await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 assert.equal(await page.locator('[data-avatar="azure-vanguard"]').getAttribute('aria-pressed'),'true');
 await page.evaluate(async url=>{globalThis.B=await import(url);globalThis.s=B.EngineStore.LastCreatedScene},core);
 await page.screenshot({path:'3d/characters/azure-vanguard/game-avatar-menu.png'});
 const room='avatar-'+Date.now();await page.locator('#room').fill(room);await page.locator('#bots').uncheck();await page.locator('#join').click();
 await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('HEALTH'));
 await page.evaluate(room=>{
  globalThis.avatarPeers=[];
  for(const [name,avatar] of [['Blue teammate','azure-vanguard'],['Red teammate','red-warden'],['Invalid teammate','not-real']]){
   const ws=new WebSocket('ws://localhost:3000/ws');avatarPeers.push(ws);ws.onopen=()=>ws.send(JSON.stringify({type:'join',room,name,avatar,bots:false}));
  }
 },room);
 await page.waitForFunction(()=>s.meshes.some(m=>m.name.includes('AzureVanguard_Armor')&&m.getTotalVertices()>0)&&s.meshes.some(m=>m.name.includes('BOT_RedWarden')&&m.getTotalVertices()>0),null,{timeout:60000});
 await page.waitForTimeout(1200);
 const state=states.at(-1);assert.equal(state.players.length,4);
 assert.equal(state.players.find(p=>p.name==='Blue teammate').avatar,'azure-vanguard');
 assert.equal(state.players.find(p=>p.name==='Red teammate').avatar,'red-warden');assert.equal(state.players.find(p=>p.name==='Invalid teammate').avatar,'red-warden');
 const model=await page.evaluate(()=>{
  const mesh=s.meshes.find(m=>m.name.includes('AzureVanguard_Armor')&&m.getTotalVertices()>0),bones=s.getTransformNodeByName('warden-forearm.R');
  return {vertices:mesh.getTotalVertices(),skinned:!!mesh.skeleton,socket:s.transformNodes.some(n=>n.name.startsWith('warden-Warden_WeaponSocket')),animations:s.animationGroups.map(g=>g.name),forearm:bones?.rotationQuaternion?.asArray()};
 });
 assert.ok(model.skinned&&model.socket);assert.ok(model.animations.some(n=>n.includes('RunForward')));assert.ok(model.animations.some(n=>n.includes('Jump')));
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 await page.screenshot({path:'3d/characters/azure-vanguard/game-avatar-session.png'});
 await page.evaluate(()=>{
  const mesh=s.meshes.find(m=>m.name.includes('AzureVanguard_Armor')&&m.getTotalVertices()>0);
  mesh.computeWorldMatrix(true);const target=mesh.getBoundingInfo().boundingBox.centerWorld.clone();
  document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';
  s.onBeforeRenderObservable.add(()=>{s.getTransformNodeByName('View weapon').setEnabled(false);s.activeCamera.position.copyFrom(target.add(new B.Vector3(2,.7,-3)));s.activeCamera.fov=.7;s.activeCamera.setTarget(target);});
 });
 await page.waitForTimeout(1000);await page.screenshot({path:'3d/characters/azure-vanguard/game-character.png'});
 console.log('PASS: two avatar choices, saved selection, 4-player replication, invalid ID fallback, both animated models, rig/socket, no browser errors',JSON.stringify(model));
}finally{await browser.close()}
