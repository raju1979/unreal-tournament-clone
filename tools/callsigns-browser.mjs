import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],states=[];let core;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{const m=JSON.parse(f.payload.toString());if(m.type==='state')states.push(m)}catch{}}));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 await page.evaluate(async url=>{globalThis.B=await import(url);globalThis.s=B.EngineStore.LastCreatedScene},core);
 const room='callsigns-'+Date.now();await page.selectOption('#map','reactor');await page.locator('#room').fill(room);await page.locator('#bots').check();await page.locator('#join').click();
 await page.waitForFunction(()=>s.meshes.filter(m=>m.name.startsWith('Callsign ')).length===3);
 const bots=states.at(-1).players.filter(p=>p.bot);
 const labels=await page.evaluate(()=>s.meshes.filter(m=>m.name.startsWith('Callsign ')).map(m=>({text:m.metadata.callsign,billboard:m.billboardMode,pickable:m.isPickable,y:m.position.y,parent:m.parent.name})));
 assert.deepEqual(labels.map(l=>l.text).sort(),bots.map(p=>p.name).sort());assert.ok(labels.every(l=>l.billboard===7&&!l.pickable&&l.y>1.8));
 await page.evaluate(room=>{globalThis.peer=new WebSocket('ws://localhost:3000/ws');peer.onopen=()=>peer.send(JSON.stringify({type:'join',room,name:'<Ranger & Friend>',avatar:'halo-warrior'}));},room);
 await page.waitForFunction(()=>s.meshes.some(m=>m.name==='Callsign <Ranger & Friend>'));
 assert.equal(await page.evaluate(()=>s.meshes.find(m=>m.name==='Callsign <Ranger & Friend>').metadata.callsign),'<Ranger & Friend>');
 await page.evaluate(()=>{const label=s.meshes.find(m=>m.name==='Callsign <Ranger & Friend>');globalThis.actor=label.parent;document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';s.onBeforeRenderObservable.add(()=>{const p=actor.position;s.activeCamera.position.set(p.x+2,p.y+2,p.z-5);s.activeCamera.setTarget(new B.Vector3(p.x,p.y+1.7,p.z));s.getTransformNodeByName('View weapon').setEnabled(false);});});
 await page.waitForTimeout(1500);await page.screenshot({path:'work/callsigns.png'});
 await page.evaluate(()=>peer.close());await page.waitForFunction(()=>!s.meshes.some(m=>m.name==='Callsign <Ranger & Friend>'));
 assert.deepEqual(errors,[]);console.log('PASS: bot and human callsigns, facing camera, safe text, above heads, leave cleanup, no browser errors');
}finally{await browser.close()}
