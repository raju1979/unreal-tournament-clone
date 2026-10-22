import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],packets=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{packets.push(JSON.parse(f.payload.toString()))}catch{}}));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});assert.equal(await page.locator('#map option[value="canyon"]').count(),1);await page.selectOption('#map','canyon');
 await page.evaluate(async url=>{globalThis.canyonB=await import(url);globalThis.canyonScene=canyonB.EngineStore.LastCreatedScene},core);
 await page.waitForFunction(()=>canyonScene.meshes.some(m=>m.name.includes('canyon-Sunspire architecture')&&m.getTotalVertices()>0),null,{timeout:60000});
 const geometry=await page.evaluate(async()=>{
  const B=canyonB,s=canyonScene,{canyon}=await import('/shared/maps.ts');const root=s.getMeshByName('canyon-__root__');root.computeWorldMatrix(true);
  const hits=[];for(const [x,y,z] of [...canyon.spawns,...canyon.weaponSpawns,...canyon.pickups.map(p=>[p.x,p.y,p.z])]){
   const pick=s.pickWithRay(new B.Ray(new B.Vector3(x,y+.8,z),new B.Vector3(0,-1,0),1.2),m=>m.name.startsWith('canyon-'));
   hits.push({x,y,z,hit:pick.hit,surface:pick.pickedPoint?.y});
  }
  return {alignedX:B.Vector3.TransformNormal(new B.Vector3(1,0,0),root.getWorldMatrix()).x,hits,active:s.getTransformNodeByName('Sunspire scenery').isEnabled(),others:['Village scenery','Outpost scenery','Reactor arena visuals'].map(n=>s.getTransformNodeByName(n).isEnabled()),sun:s.getLightByName('Sunspire midday sunlight').isEnabled(),vertices:s.getTransformNodeByName('Sunspire coordinate alignment').getChildMeshes().reduce((n,m)=>n+m.getTotalVertices(),0)};
 });
 console.log('GEOMETRY',JSON.stringify(geometry));assert.ok(geometry.alignedX>.99);assert.ok(geometry.active&&geometry.sun);assert.ok(geometry.others.every(v=>!v));for(const p of geometry.hits){assert.ok(p.hit,`Missing floor ${p.x},${p.y},${p.z}`);assert.ok(Math.abs(p.surface-p.y)<.09,`Floor mismatch ${JSON.stringify(p)}`);}
 await page.locator('#room').fill('sunspire-'+Date.now());await page.locator('#join').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('3 BOTS'),null,{timeout:30000});
 await page.waitForTimeout(400);await page.screenshot({path:'3d/canyon-arena/game-spawn.png'});await page.waitForTimeout(4500);
 assert.equal(packets.find(p=>p.type==='welcome').map,'canyon');const states=packets.filter(p=>p.type==='state'),first=states[0];assert.ok(states.length>20);
 assert.ok(states.some(s=>s.players.some(p=>p.bot&&Math.hypot(p.x-first.players.find(q=>q.id===p.id).x,p.z-first.players.find(q=>q.id===p.id).z)>1)),'bots must move');
 assert.ok(states.every(s=>s.players.every(p=>p.y>-.05)),'players remain supported');assert.deepEqual(errors,[]);
 await page.evaluate(()=>{const s=canyonScene,B=canyonB;document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';globalThis.canyonCamera={pos:[90,90,105],target:[0,3,0],fov:.85};s.onBeforeRenderObservable.add(()=>{s.getTransformNodeByName('View weapon').setEnabled(false);s.activeCamera.position.set(...canyonCamera.pos);s.activeCamera.fov=canyonCamera.fov;s.activeCamera.setTarget(new B.Vector3(...canyonCamera.target));});});
 await page.waitForTimeout(600);await page.screenshot({path:'3d/canyon-arena/game-overview.png'});
 await page.evaluate(()=>{canyonCamera={pos:[-28,2.1,29],target:[0,11,0],fov:1.10}});await page.waitForTimeout(500);await page.screenshot({path:'3d/canyon-arena/game-courtyard.png'});
 await page.evaluate(()=>{canyonCamera={pos:[44,1.9,30],target:[44,2,-28],fov:1.1}});await page.waitForTimeout(500);await page.screenshot({path:'3d/canyon-arena/game-hangar.png'});
 console.log('PASS: fourth arena, daylight scenery, visual/collision floor alignment, 3 moving bots and no browser errors');
}finally{await browser.close()}
