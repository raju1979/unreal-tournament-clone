import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 await page.evaluate(async url=>{globalThis.B=await import(url);globalThis.s=B.EngineStore.LastCreatedScene},core);
 const result=await page.evaluate(async()=>{
  const {arenas}=await import('/shared/maps.ts'),results=[];
  for(const arena of Object.values(arenas)){
   const state=await new Promise((resolve,reject)=>{
    const ws=new WebSocket('ws://localhost:3000/ws'),timer=setTimeout(()=>{ws.close();reject(new Error('Snapshot timeout'));},15000);
    ws.onopen=()=>ws.send(JSON.stringify({type:'join',map:arena.id,bots:false,room:'all-weapons-'+arena.id+'-'+Date.now()}));
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){clearTimeout(timer);ws.close();resolve(m);}};
   });
   results.push({arena:arena.id,count:state.weaponPickups.length,types:[...new Set(state.weaponPickups.map(p=>p.weapon))].sort(),positions:new Set(state.weaponPickups.map(p=>`${p.x},${p.y},${p.z}`)).size});
  }
  return results;
 });
 for(const row of result){assert.deepEqual(row.types,[1,2,3,4],row.arena);assert.ok(row.count>=4);assert.equal(row.positions,row.count);}
 await page.selectOption('#map','foundry');await page.locator('#bots').uncheck();await page.locator('#room').fill('pickup-models-'+Date.now());await page.locator('#join').click();
 await page.waitForFunction(()=>s.transformNodes.some(n=>n.name.startsWith('Arena weapon pickup 4-')&&n.getChildMeshes().some(m=>m.getTotalVertices()>0)),null,{timeout:45000});
 const models=await page.evaluate(()=>s.transformNodes.filter(n=>n.name.startsWith('Arena weapon pickup ')).map(n=>({weapon:n.metadata.weapon,enabled:n.isEnabled(),vertices:n.getChildMeshes().reduce((sum,m)=>sum+m.getTotalVertices(),0)})));
 assert.ok(models.some(m=>m.weapon===1&&m.enabled&&m.vertices>0));assert.ok(models.some(m=>m.weapon===4&&m.enabled&&m.vertices>0));
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({arenas:result,models}));
}finally{await browser.close()}
