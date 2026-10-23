import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[],states=[];let core;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{const m=JSON.parse(f.payload.toString());if(m.type==='state')states.push(m)}catch{}}));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 await page.evaluate(async url=>{globalThis.B=await import(url);globalThis.s=B.EngineStore.LastCreatedScene},core);
 await page.selectOption('#map','reactor');await page.locator('#room').fill('random-avatars-'+Date.now());await page.locator('#bots').check();await page.locator('#join').click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('3 BOTS'));
 await page.waitForFunction(()=>['BOT_RedWarden','AzureVanguard_Armor','HaloWarrior_Armor'].every(name=>s.meshes.some(m=>m.name.includes(name)&&m.getTotalVertices()>0)),null,{timeout:60000});
 const bots=states.at(-1).players.filter(p=>p.bot);assert.equal(bots.length,3);assert.equal(new Set(bots.map(p=>p.avatar)).size,3);
 const first=new Map(bots.map(p=>[p.id,p.avatar]));await page.waitForTimeout(1500);
 for(const p of states.at(-1).players.filter(p=>p.bot))assert.equal(p.avatar,first.get(p.id));
 const rendered=await page.evaluate(bots=>bots.map(p=>{
  const root=s.getTransformNodeByName(p.id),expected={'red-warden':'BOT_RedWarden','azure-vanguard':'AzureVanguard_Armor','halo-warrior':'HaloWarrior_Armor'}[p.avatar];
  return {id:p.id,avatar:p.avatar,matched:root.getChildMeshes().some(m=>m.name.includes(expected)&&!!m.skeleton)};
 }),bots);
 assert.ok(rendered.every(p=>p.matched));assert.deepEqual(errors,[]);
 console.log('PASS: 3 unique randomized bot avatars, stable snapshots, correct skinned models, no browser errors',JSON.stringify(rendered));
}finally{await browser.close()}
