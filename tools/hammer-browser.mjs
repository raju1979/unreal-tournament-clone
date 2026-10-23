import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3034');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.selectOption('#map','reactor');await page.uncheck('#bots');await page.locator('#room').fill('hammer-test-'+Date.now());await page.mouse.move(640,400);await page.locator('#join').click();
 await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('HEALTH'));await page.keyboard.press('4');await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('HAMMER'));
 await page.waitForFunction(async url=>{const {EngineStore}=await import(url);return EngineStore.LastCreatedScene.getTransformNodeByName('Impact Hammer view').getDescendants().some(n=>n.name.includes('IH01_PISTON'))},core);
 await page.mouse.down();await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('CHARGE 100%'),null,{timeout:10000});assert.match(await page.locator('#stats').textContent(),/CHARGE 100%/);await page.mouse.up();await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('CHARGE 0%'));assert.match(await page.locator('#stats').textContent(),/CHARGE 0%/);
 await page.mouse.down({button:'right'});await page.waitForTimeout(80);await page.mouse.up({button:'right'});await page.waitForTimeout(100);
 const model=await page.evaluate(async url=>{const B=await import(url),s=B.EngineStore.LastCreatedScene,h=s.getTransformNodeByName('Impact Hammer view');return {enabled:h.isEnabled(),meshes:h.getChildMeshes().filter(m=>m.getTotalVertices()>0).length,engine:s.getEngine().getClassName(),positions:h.getChildMeshes().map(m=>({name:m.name,position:m.getAbsolutePosition().asArray()}))}},core);
 await page.screenshot({path:'work/impact-hammer-game.png'});assert.ok(model.enabled);assert.equal(model.meshes,6);assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks:'weapon 4 selection, GLB body/piston load, full charge and release, secondary input, browser errors',model}));
}finally{await browser.close()}

