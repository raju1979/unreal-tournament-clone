import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('work',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.screenshot({path:'work/menu.png'});await page.locator('#room').fill('browser-'+Date.now());await page.locator('#bots').uncheck();await page.locator('#join').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('1/4'));await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('HEALTH'));await page.screenshot({path:'work/arena.png'});assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: renderer initialized, room joined, HUD live, no JS errors');}finally{await browser.close();}
