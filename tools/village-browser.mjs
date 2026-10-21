import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];let coreURL;page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))coreURL=r.url()});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});
 assert.ok(coreURL,'Vite Babylon module URL');await page.waitForFunction(async url=>{const {EngineStore}=await import(url);return EngineStore.LastCreatedScene?.meshes.some(m=>m.name.includes('Village buildings')&&m.getTotalVertices()>0)},coreURL,{timeout:90000});
 await page.waitForTimeout(2500);
 const info=await page.evaluate(async url=>{const {EngineStore,Vector3}=await import(url);const s=EngineStore.LastCreatedScene;const root=s.getMeshByName('village-__root__');root.computeWorldMatrix(true);const alignedX=Vector3.TransformNormal(new Vector3(1,0,0),root.getWorldMatrix()).x;return {meshes:s.meshes.length,vertices:s.getTotalVertices(),fps:s.getEngine().getFps(),alignedX}},coreURL);console.log('SCENE',info);assert.ok(info.alignedX>.99,'Exported scenery matches server collision axes');
 await page.screenshot({path:'3d/village-arena/game-menu.png'});
 await page.locator('#room').fill('canal-'+Date.now());await page.locator('#join').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('3 BOTS'));
 await page.keyboard.down('Tab');await page.waitForFunction(()=>document.getElementById('board').textContent.includes('CANAL VILLAGE'));await page.keyboard.up('Tab');
 await page.waitForTimeout(1500);await page.screenshot({path:'3d/village-arena/game-spawn.png'});
 await page.evaluate(async url=>{const {EngineStore,Vector3}=await import(url);const s=EngineStore.LastCreatedScene;document.getElementById('hud').style.display='none';document.getElementById('menu').style.display='none';s.onBeforeRenderObservable.add(()=>{s.activeCamera.position.set(8,5,-22);s.activeCamera.setTarget(new Vector3(0,3,16));s.activeCamera.getViewMatrix(true);});s.onBeforeRenderObservable.add(()=>s.getTransformNodeByName('View weapon').setEnabled(false));},coreURL);
 await page.waitForTimeout(1500);await page.screenshot({path:'3d/village-arena/game-preview.png'});
 assert.deepEqual(errors,[]);console.log('PASS: Canal Village rendered, joined with 3 bots, authoritative map and browser errors checked');
}finally{await browser.close()}
