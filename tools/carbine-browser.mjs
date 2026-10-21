import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const Base=window.WebSocket;window.WebSocket=class extends Base{constructor(...a){super(...a);this.addEventListener('close',e=>window.testClosed={code:e.code,reason:e.reason});this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='welcome')window.testId=m.id;if(m.type==='state')window.testState=m;});}send(raw){try{const m=JSON.parse(raw);if(m.type==='input'&&window.testCommand)raw=JSON.stringify({...m,...window.testCommand});}catch{}super.send(raw);}};});
await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.locator('#room').fill('carbine-'+Date.now());await page.locator('#bots').uncheck();await page.locator('#join').click();await page.waitForFunction(()=>window.testState&&window.testId);
const read=()=>page.evaluate(()=>({p:window.testState.players.find(p=>p.id===window.testId),pickup:window.testState.carbine,closed:window.testClosed}));
const initial=await read(),pickup=initial.pickup;
const command=c=>page.evaluate(c=>window.testCommand=c,c);
async function walk(x,z,tolerance=.4){const end=Date.now()+18000;while(Date.now()<end){const {p}=await read(),dx=x-p.x,dz=z-p.z;if(p.hasCarbine||Math.hypot(dx,dz)<tolerance){await command({f:0,s:0,fire:false,weapon:p.hasCarbine?3:1});return;}await command({f:Math.min(.8,Math.hypot(dx,dz)/5),s:0,yaw:Math.atan2(dx,dz),pitch:0,jump:false,fire:false,weapon:1});await new Promise(r=>setTimeout(r,60));}throw Error('Path blocked toward '+x+','+z+': '+JSON.stringify(await read()));}
if(pickup.y>1){const x=pickup.x;await walk(initial.p.x,Math.sign(initial.p.z)*22);await walk(x,Math.sign(initial.p.z)*22);await walk(x,Math.sign(initial.p.z)*12);await walk(Math.sign(x)*19.5,Math.sign(initial.p.z)*12);await walk(Math.sign(x)*19.5,pickup.z);await walk(x,pickup.z);}
else{const transit=pickup.x===0?8:pickup.x;await walk(transit,initial.p.z);await walk(transit,pickup.z,.4);await walk(pickup.x,pickup.z,1.1);}
await page.waitForFunction(()=>window.testState.players.find(p=>p.id===window.testId).hasCarbine,{},{timeout:8000});
await command({f:0,s:0,fire:false,weapon:3});await page.keyboard.press('Digit3');await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('PC-01'));
await page.waitForTimeout(500);await page.screenshot({path:'work/carbine-equipped.png'});
let {p}=await read();const ammo=p.carbineAmmo;await command({f:0,s:0,yaw:p.yaw,pitch:0,fire:true,weapon:3});await page.waitForTimeout(400);await command({f:0,s:0,fire:false,weapon:3});await page.waitForTimeout(150);const collected=await read();assert.ok(collected.p.carbineAmmo<ammo);assert.ok(collected.pickup.cooldown>0);assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: walked to random pickup, equipped GLB, live HUD, server ammo consumption, cooldown, no JS errors');
}finally{await browser.close();}
