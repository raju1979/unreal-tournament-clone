import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.launchTimes=[];const Base=window.WebSocket;window.WebSocket=class extends Base{constructor(...a){super(...a);this.addEventListener('close',e=>window.testClosed={code:e.code,reason:e.reason});this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='launch')window.launchTimes.push(performance.now());if(m.type==='explosion')window.explosionSeen=true;if(m.type==='welcome')window.testId=m.id;if(m.type==='state')window.testState=m;});}send(raw){try{const m=JSON.parse(raw);if(m.type==='input'&&window.testCommand)raw=JSON.stringify({...m,...window.testCommand});}catch{}super.send(raw);}};});
await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.locator('#room').fill('launcher-pickup-'+Date.now());await page.locator('#bots').uncheck();await page.locator('#join').click();await page.waitForFunction(()=>window.testState&&window.testId);
const read=()=>page.evaluate(()=>({p:window.testState.players.find(p=>p.id===window.testId),pickup:window.testState.launcher,closed:window.testClosed}));
const initial=await read(),pickup=initial.pickup;
const command=c=>page.evaluate(c=>window.testCommand=c,c);
async function walk(x,z,tolerance=.4){const end=Date.now()+18000;while(Date.now()<end){const {p}=await read(),dx=x-p.x,dz=z-p.z;if(p.hasLauncher||Math.hypot(dx,dz)<tolerance){await command({f:0,s:0,fire:false,weapon:p.hasLauncher?2:1});return;}await command({f:Math.min(.8,Math.hypot(dx,dz)/5),s:0,yaw:Math.atan2(dx,dz),pitch:0,jump:false,fire:false,weapon:1});await new Promise(r=>setTimeout(r,60));}throw Error('Path blocked toward '+x+','+z+': '+JSON.stringify(await read()));}
if(pickup.y>1){const x=pickup.x;await walk(initial.p.x,Math.sign(initial.p.z)*22);await walk(x,Math.sign(initial.p.z)*22);await walk(x,Math.sign(initial.p.z)*12);await walk(Math.sign(x)*19.5,Math.sign(initial.p.z)*12);await walk(Math.sign(x)*19.5,pickup.z);await walk(x,pickup.z);}
else{const transit=pickup.x===0?8:pickup.x;await walk(transit,initial.p.z);await walk(transit,pickup.z,.4);await walk(pickup.x,pickup.z,1.1);}
await page.waitForFunction(()=>window.testState.players.find(p=>p.id===window.testId).hasLauncher,{},{timeout:8000});
await command({f:0,s:0,fire:false,weapon:2});await page.keyboard.press('Digit2');await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('ROCKETS'));
await page.waitForTimeout(500);await page.screenshot({path:'work/launcher-pickup.png'});
let {p}=await read();const ammo=p.ammo;
await command({f:0,s:0,yaw:p.yaw,pitch:-.7,fire:true,weapon:2});
await page.waitForFunction(()=>window.launchTimes.length>=1);
await command({f:0,s:0,fire:false,weapon:2});
await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('RELOADING'));
await page.screenshot({path:'work/launcher-reloading.png'});
const during=await read();assert.equal(during.p.ammo,ammo-1);
await page.waitForFunction(()=>window.testState.players.find(p=>p.id===window.testId).launcherLoaded===1,{},{timeout:5000});
await command({f:0,s:0,yaw:p.yaw,pitch:-.7,fire:true,weapon:2});
await page.waitForFunction(()=>window.launchTimes.length>=2);await command({f:0,s:0,fire:false,weapon:2});
const gap=await page.evaluate(()=>window.launchTimes[1]-window.launchTimes[0]);assert.ok(gap>=2100,`Reload bypassed: ${gap}ms`);
await page.waitForFunction(()=>window.explosionSeen===true,{},{timeout:8000});
assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: random launcher pickup, loaded/reserve HUD, reload countdown, enforced 2.2s interval, explosion, no JS errors');
}finally{await browser.close();}
