import {test} from 'node:test';import assert from 'node:assert/strict';
import {chooseCarbine,collectCarbine,collectLauncher,tickWeaponPickup} from './carbine';import {player,emptyInput,move,blocked,spawn} from './game';import {reactor,arenas} from './maps';

test('both weapons repeatedly respawn at their collected spot on every arena',()=>{
 for(const map of Object.values(arenas))for(const collect of [collectCarbine,collectLauncher]){
  const pickup=chooseCarbine(map),location={x:pickup.x,y:pickup.y,z:pickup.z,spot:pickup.spot};
  for(let cycle=0;cycle<3;cycle++){
   const p=Object.assign(player('collect','Test'),{x:pickup.x,y:pickup.y,z:pickup.z});
   assert.ok(collect(p,emptyInput(),pickup));const delay=pickup.cooldown;assert.equal(delay,collect===collectCarbine?20:25);
   tickWeaponPickup(pickup,delay-.1);assert.ok(pickup.cooldown>0);assert.equal(collect(p,emptyInput(),pickup),false);
   tickWeaponPickup(pickup,1);assert.equal(pickup.cooldown,0);assert.deepEqual({x:pickup.x,y:pickup.y,z:pickup.z,spot:pickup.spot},location);
  }
 }
});
test('random pickup positions are clear and relocation avoids previous spot',()=>{for(let n=0;n<6;n++){const a=chooseCarbine(reactor,-1,()=>n/6);assert.ok(!blocked(a.x,a.y+.01,a.z,reactor));const b=chooseCarbine(reactor,a.spot,()=>n/6);assert.notEqual(a.spot,b.spot);}});
test('carbine cannot be selected without ownership',()=>{const p=player('a','A');move(p,{...emptyInput(),weapon:3},1/60);assert.equal(p.weapon,1);});
test('nearby pickup equips weapon, adds ammo and locks it for other players',()=>{const p=player('a','A'),q=player('b','B'),i=emptyInput(),pickup=chooseCarbine(reactor,-1,()=>0);Object.assign(p,{x:pickup.x,y:pickup.y,z:pickup.z});Object.assign(q,{x:pickup.x,y:pickup.y,z:pickup.z});assert.ok(collectCarbine(p,i,pickup));assert.equal(p.hasCarbine,true);assert.equal(p.carbineAmmo,30);assert.equal(i.weapon,3);assert.equal(p.weapon,3);assert.equal(pickup.cooldown,20);assert.equal(collectCarbine(q,emptyInput(),pickup),false);});
test('distant and dead players cannot collect the weapon',()=>{const pickup=chooseCarbine(reactor,-1,()=>0),p=player('a','A');Object.assign(p,{x:pickup.x+5,y:pickup.y,z:pickup.z});assert.equal(collectCarbine(p,emptyInput(),pickup),false);Object.assign(p,{x:pickup.x,hp:0});assert.equal(collectCarbine(p,emptyInput(),pickup),false);});
test('launcher requires pickup, equips with six rockets and resets on respawn',()=>{const p=player('a','A'),i={...emptyInput(),weapon:2};move(p,i,1/60);assert.equal(p.weapon,1);assert.equal(p.ammo,0);const pickup=chooseCarbine(reactor);Object.assign(p,{x:pickup.x,y:pickup.y,z:pickup.z});assert.ok(collectLauncher(p,i,pickup));assert.equal(p.weapon,2);assert.equal(p.ammo,6);assert.ok(p.hasLauncher);assert.equal(pickup.cooldown,25);assert.equal(collectLauncher(p,i,pickup),false);spawn(p);assert.equal(p.hasLauncher,false);assert.equal(p.ammo,0);});
