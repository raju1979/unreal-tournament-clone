import {chromium} from '@playwright/test';import WebSocket from 'ws';import assert from 'node:assert/strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sockets=[];const rooms=[];
for(const map of ['reactor','village','outpost']){
 const ws=new WebSocket('ws://localhost:3000/ws'),entry={map,first:null,last:null};sockets.push(ws);rooms.push(entry);
 ws.on('open',()=>ws.send(JSON.stringify({type:'join',room:'ammo-'+map+'-'+Date.now(),name:'Ammo test',map,bots:false})));
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state'){entry.first??=m;entry.last=m;}});
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const network=(async()=>{await sleep(1000);for(const room of rooms){assert.ok(room.first,room.map+' first snapshot');assert.ok(room.first.pickups.some(n=>n>=2&&n<=8),room.map+' delayed ammo');}await sleep(8000);for(const room of rooms){assert.ok(room.last.pickups.every(n=>n===0),room.map+' ammo appears and stays until collected');}console.log('PASS: all three server arenas delay and activate ammo packs');})();
 const page=await browser.newPage(),errors=[];let core;page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.selectOption('#map','reactor');await page.locator('#bots').uncheck();await page.locator('#room').fill('ammo-visual-'+Date.now());await page.locator('#join').click();
 await page.waitForFunction(()=>document.getElementById('menu').style.display==='none');
 await page.evaluate(async url=>{globalThis.ammoScene=(await import(url)).EngineStore.LastCreatedScene},core);
 await page.waitForFunction(()=>{const packs=globalThis.ammoScene.meshes.filter(m=>/^Ammo pack [0-9]+$/.test(m.name));return packs.length===2&&packs.every(m=>!m.isEnabled())});
 await page.waitForFunction(()=>{const packs=globalThis.ammoScene.meshes.filter(m=>/^Ammo pack [0-9]+$/.test(m.name));return packs.length===2&&packs.every(m=>m.isEnabled())},null,{timeout:12000});
 const result=await page.evaluate(async url=>{const B=await import(url),s=B.EngineStore.LastCreatedScene;return s.meshes.filter(m=>/^Ammo pack [0-9]+$/.test(m.name)).map(m=>({name:m.name,children:m.getChildMeshes().length,visible:m.isEnabled()}))},core);
 console.log('PACKS',JSON.stringify(result));assert.equal(result.length,2);assert.ok(result.every(m=>m.children===4&&m.visible));assert.deepEqual(errors,[]);await network;console.log('PASS: ammo boxes and cartridges hidden during delay, visible when server activates them; no browser errors');
}finally{for(const ws of sockets)ws.close();await browser.close()}
