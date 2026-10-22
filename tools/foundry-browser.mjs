import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],packets=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{packets.push(JSON.parse(f.payload.toString()))}catch{}}));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 assert.equal(await page.locator('#map option[value="foundry"]').count(),1);
 await page.selectOption('#map','foundry');
 await page.evaluate(async url=>{globalThis.B=await import(url);globalThis.s=B.EngineStore.LastCreatedScene},core);
 await page.waitForFunction(()=>s.meshes.some(m=>m.name.startsWith('foundry-')&&m.getTotalVertices()>0),null,{timeout:60000});
 const geometry=await page.evaluate(async()=>{
  const {foundry}=await import('/shared/maps.ts');
  const root=s.getMeshByName('foundry-__root__');root.computeWorldMatrix(true);
  return {alignedX:B.Vector3.TransformNormal(new B.Vector3(1,0,0),root.getWorldMatrix()).x,
   hits:[...foundry.spawns,...foundry.weaponSpawns,...foundry.pickups.map(p=>[p.x,p.y,p.z])].map(([x,y,z])=>{
    const hit=s.pickWithRay(new B.Ray(new B.Vector3(x,y+.8,z),new B.Vector3(0,-1,0),1.1),m=>m.name.startsWith('foundry-'));
    return {x,y,z,hit:hit.hit,surface:hit.pickedPoint?.y};
   }),active:s.getTransformNodeByName('Ember Foundry scenery').isEnabled()};
 });
 assert.ok(geometry.active&&geometry.alignedX>.99);
 await page.selectOption('#map','fortress');
 await page.waitForFunction(()=>!s.getTransformNodeByName('Ember Foundry scenery').isEnabled());
 await page.selectOption('#map','foundry');
 assert.equal(await page.locator('#map option').count(),6);
 for(const p of geometry.hits){assert.ok(p.hit,JSON.stringify(p));assert.ok(Math.abs(p.surface-p.y)<.07,JSON.stringify(p));}
 await page.locator('#room').fill('foundry-'+Date.now());await page.locator('#join').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('3 BOTS'),null,{timeout:30000});
 await page.waitForTimeout(5000);
 assert.equal(packets.find(p=>p.type==='welcome').map,'foundry');
 const states=packets.filter(p=>p.type==='state'),first=states[0];assert.ok(states.length>20);
 assert.ok(states.some(st=>st.players.some(p=>p.bot&&Math.hypot(p.x-first.players.find(q=>q.id===p.id).x,p.z-first.players.find(q=>q.id===p.id).z)>1)));
 assert.ok(states.every(st=>st.players.every(p=>p.y>=-.05)));
 await page.screenshot({path:'3d/foundry-arena/game-spawn.png'});
 await page.evaluate(()=>{document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';s.onBeforeRenderObservable.add(()=>{s.getTransformNodeByName('View weapon').setEnabled(false);s.activeCamera.position.set(27,7.5,-23);s.activeCamera.fov=1.35;s.activeCamera.setTarget(new B.Vector3(0,5,2));});});
 await page.waitForTimeout(800);await page.screenshot({path:'3d/foundry-arena/game-hall.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: foundry asset, floor alignment, multiplayer room, 3 moving bots, supported players, no browser errors');
}finally{await browser.close()}
