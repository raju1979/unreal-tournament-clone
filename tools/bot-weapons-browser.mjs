import {writeFileSync} from 'node:fs';import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{const page=await b.newPage({viewport:{width:1200,height:900}}),errors=[];let core;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url()});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.selectOption('#map','reactor');await page.locator('#room').fill('armed-bots-'+Date.now());await page.locator('#join').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('3 BOTS'));
 await page.waitForFunction(async url=>{const {EngineStore}=await import(url);return EngineStore.LastCreatedScene.transformNodes.filter(n=>n.name==='Bot animated right-hand grip'&&n.parent?.name==='warden-Warden_WeaponSocket').length===3},core,{timeout:20000});
 const samples=await page.evaluate(async url=>{const B=await import(url),s=B.EngineStore.LastCreatedScene,rows=[];
  for(let i=0;i<16;i++){
   for(const root of s.transformNodes.filter(n=>n.name.startsWith('bot-')&&n.metadata?.bot)){
    const dock=root.getDescendants().find(n=>n.name==='Bot held weapon'),leg=root.getDescendants().find(n=>n.name==='warden-shin.L');if(!dock||!leg||!Number.isFinite(root.metadata.gaitPhase))continue;dock.computeWorldMatrix(true);
    const grips=root.getDescendants().filter(n=>n.name.includes('PC01_GRIP_SOCKET')||n.name.includes('RL01_GRIP_SOCKET'));
    rows.push({id:root.name,phase:root.metadata.gaitPhase,leg:leg.rotationQuaternion.asArray(),gripErrors:grips.map(g=>{g.computeWorldMatrix(true);return B.Vector3.Distance(g.getAbsolutePosition(),dock.getAbsolutePosition())}),position:root.position.asArray()});
   }await new Promise(r=>setTimeout(r,120));
  }return rows;
 },core);
 writeFileSync('work/bot-live-samples.json',JSON.stringify(samples,null,2));console.log('live samples',samples.length);
 const maxGripError=Math.max(...samples.flatMap(s=>s.gripErrors));assert.ok(maxGripError<.015,'All held models align to the trigger hand: '+maxGripError);
 const ids=[...new Set(samples.map(s=>s.id))];assert.equal(ids.length,3);assert.ok(ids.some(id=>{const a=samples.filter(s=>s.id===id);return a.some(s=>Math.abs(s.phase-a[0].phase)>.05)&&a.some(s=>s.leg.some((v,i)=>Math.abs(v-a[0].leg[i])>.08))}),'Visible leg pose and gait phase advance during live movement');
 await page.evaluate(async url=>{const B=await import(url),s=B.EngineStore.LastCreatedScene;document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';const target=s.transformNodes.find(n=>n.name.startsWith('bot-')&&n.metadata?.hp>0);s.onBeforeRenderObservable.add(()=>{const p=target.position;s.activeCamera.position.copyFrom(p.add(new B.Vector3(2.3,1.5,2.8)));s.activeCamera.setTarget(p.add(new B.Vector3(0,1,0)));s.activeCamera.getViewMatrix(true);s.getTransformNodeByName('View weapon').setEnabled(false);});},core);
 await page.waitForTimeout(300);await page.screenshot({path:'work/live-armed-bot.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',bots:ids.length,maxGripError,checks:'Animated hand parenting; pulse/carbine/launcher placement; live gait and leg movement; browser errors'}));
}finally{await b.close()}
