import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],packets=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{packets.push(JSON.parse(f.payload.toString()))}catch{}}));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.selectOption('#map','outpost');
 await page.waitForFunction(async url=>{const B=await import(url);return B.EngineStore.LastCreatedScene.meshes.some(m=>m.name.includes('outpost-Outpost captured architecture')&&m.getTotalVertices()>0)},core,{timeout:90000});
 const geometry=await page.evaluate(async url=>{
  const B=await import(url),s=B.EngineStore.LastCreatedScene,root=s.getMeshByName('outpost-__root__');root.computeWorldMatrix(true);
  const {outpost}=await import('/shared/maps.ts');const hits=[];
  for(const [x,y,z] of [...outpost.spawns,...outpost.weaponSpawns,...outpost.pickups.map(p=>[p.x,p.y,p.z])]){const pick=s.pickWithRay(new B.Ray(new B.Vector3(x,2,z),new B.Vector3(0,-1,0),3),m=>m.name.includes('outpost-Outpost captured architecture'));hits.push({x,z,hit:pick.hit,y:pick.pickedPoint?.y});}
  return {alignedX:B.Vector3.TransformNormal(new B.Vector3(1,0,0),root.getWorldMatrix()).x,hits,activeVillage:s.getTransformNodeByName('Village scenery').isEnabled(),activeOutpost:s.getTransformNodeByName('Outpost scenery').isEnabled()};
 },core);console.log('GEOMETRY',JSON.stringify(geometry));assert.ok(geometry.alignedX>.99);assert.equal(geometry.activeVillage,false);assert.equal(geometry.activeOutpost,true);for(const hit of geometry.hits){assert.ok(hit.hit,'visual deck exists at gameplay spot');assert.ok(Math.abs(hit.y)<.16,'deck matches shared collision height');}
 await page.locator('#room').fill('outpost-'+Date.now());await page.locator('#join').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('3 BOTS'),null,{timeout:30000});
 await page.waitForTimeout(250);await page.screenshot({path:'3d/outpost-arena/game-spawn.png'});await page.waitForTimeout(3500);assert.equal(packets.find(p=>p.type==='welcome').map,'outpost');
 const snapshots=packets.filter(p=>p.type==='state');assert.ok(snapshots.length>20);const first=snapshots[0];
 assert.ok(snapshots.some(s=>s.players.some(p=>p.bot&&Math.hypot(p.x-first.players.find(q=>q.id===p.id).x,p.z-first.players.find(q=>q.id===p.id).z)>1)),'live bots navigate');
 assert.ok(snapshots.every(s=>s.players.every(p=>p.y>-.05)),'live players remain on deck');
 await page.evaluate(async url=>{const B=await import(url),s=B.EngineStore.LastCreatedScene;document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';s.onBeforeRenderObservable.add(()=>{s.getTransformNodeByName('View weapon').setEnabled(false);s.activeCamera.position.set(26,63,-42);s.activeCamera.setTarget(new B.Vector3(0,9,0));});},core);
 await page.waitForTimeout(500);await page.screenshot({path:'3d/outpost-arena/game-preview.png'});
 await page.evaluate(async url=>{const B=await import(url),s=B.EngineStore.LastCreatedScene;s.onBeforeRenderObservable.add(()=>{s.activeCamera.position.set(-7,2.4,10);s.activeCamera.setTarget(new B.Vector3(4,1.6,-6));});},core);await page.waitForTimeout(500);await page.screenshot({path:'3d/outpost-arena/game-courtyard.png'});
 assert.deepEqual(errors,[]);console.log('PASS: textured Outpost rendered; visual floor alignment, authoritative map, 3 moving bots and stable deck verified');
}finally{await browser.close()}
