import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.testShots=0;window.testLaunches=0;const Base=window.WebSocket;window.WebSocket=class extends Base{constructor(...a){super(...a);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='shot')window.testShots++;if(m.type==='launch')window.testLaunches++;});}send(raw){try{const m=JSON.parse(raw);if(m.type==='input')raw=JSON.stringify({...m,fire:window.testFire===true,weapon:window.testWeapon??1});}catch{}super.send(raw);}};});
await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.locator('#room').fill('firing-'+Date.now());await page.locator('#bots').uncheck();await page.locator('#join').click();await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('HEALTH'));
await page.evaluate(()=>window.testFire=true);await page.waitForFunction(()=>window.testShots>=2);
for(let i=0;i<4;i++)await page.screenshot({path:`work/firing-${i}.png`});
await page.evaluate(()=>window.testFire=false);await page.waitForTimeout(400);assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: live pulse firing effects, no browser exceptions');
}finally{await browser.close();}
