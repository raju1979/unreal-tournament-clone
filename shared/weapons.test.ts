import {test} from 'node:test';import assert from 'node:assert/strict';
import {player,spawn} from './game';import {weaponStats,rocketStats,splashDamage,tryFire,tickWeapons,beginReload} from './weapons';
function launcher(){const p=player('a','A');Object.assign(p,{hasLauncher:true,weapon:2,ammo:6,launcherLoaded:1});return p;}
test('launcher fires once then enforces slow reload even if fire is held',()=>{const p=launcher();assert.ok(tryFire(p));assert.equal(p.ammo,5);assert.equal(p.launcherLoaded,0);assert.equal(p.reloadLeft,2.2);for(let i=0;i<120;i++){tickWeapons(p,1/60);assert.equal(tryFire(p),false);}tickWeapons(p,.21);assert.equal(p.launcherLoaded,1);assert.ok(tryFire(p));assert.equal(p.ammo,4);});
test('switching away and back cannot reset a rocket reload',()=>{const p=launcher();tryFire(p);p.weapon=1;tickWeapons(p,.7);assert.ok(tryFire(p));p.weapon=2;tickWeapons(p,.5);assert.equal(tryFire(p),false);assert.ok(p.reloadLeft>.9);});
test('carbine magazine auto reloads from reserve without creating ammunition',()=>{const p=player('a','A');Object.assign(p,{hasCarbine:true,weapon:3,carbineAmmo:30,carbineClip:18});for(let i=0;i<18;i++){assert.ok(tryFire(p));if(i<17)tickWeapons(p,.131);}assert.equal(p.carbineClip,0);assert.equal(p.carbineAmmo,12);assert.equal(p.reloadLeft,1.5);assert.equal(tryFire(p),false);tickWeapons(p,1.51);assert.equal(p.carbineClip,12);assert.equal(p.carbineAmmo,12);});
test('manual partial reload preserves total rounds and blocks firing until complete',()=>{const p=player('a','A');Object.assign(p,{hasCarbine:true,weapon:3,carbineAmmo:25,carbineClip:13});assert.ok(beginReload(p));assert.equal(tryFire(p),false);tickWeapons(p,1.51);assert.equal(p.carbineClip,18);assert.equal(p.carbineAmmo,25);assert.equal(beginReload(p),false);});
test('empty/unowned/dead weapons cannot fire or reload',()=>{const p=player('a','A');p.weapon=2;assert.equal(tryFire(p),false);assert.equal(beginReload(p),false);Object.assign(p,{hasLauncher:true,ammo:0,launcherLoaded:0});assert.equal(tryFire(p),false);assert.equal(beginReload(p),false);p.hp=0;p.weapon=1;assert.equal(tryFire(p),false);spawn(p);assert.equal(p.reloadLeft,0);assert.equal(p.carbineClip,0);});
test('rockets kill with close splash, fall off across five metres, and retain stronger direct hits',()=>{
 assert.ok(weaponStats[2].damage>rocketStats.splashDamage);
 assert.equal(splashDamage(0),140);assert.equal(splashDamage(1),140);
 assert.ok(splashDamage(Math.hypot(1.8,.85))>=100,'floor impact within 1.8m must kill an unshielded full-health enemy');
 assert.equal(splashDamage(3),70);assert.equal(splashDamage(4),35);
 assert.ok(splashDamage(Math.hypot(3,.85))<100);assert.equal(splashDamage(5),0);
 assert.equal(splashDamage(7),0);assert.equal(splashDamage(10),0);
 assert.equal(splashDamage(0,true),91);assert.ok(splashDamage(3,true)<splashDamage(3));
 for(let d=0;d<5;d+=.1)assert.ok(splashDamage(d)>=splashDamage(d+.1));
});
