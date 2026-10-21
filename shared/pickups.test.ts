import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arenas} from './maps';
import {player} from './game';
import {createPickupTimers,tickPickupTimers,collectPickup,ammoPackRules} from './pickups';

test('ammo packs repeatedly appear on every arena with randomized bounded delays',()=>{
 for(const map of Object.values(arenas)){
  const ammo=map.pickups.map((a,n)=>({a,n})).filter(({a})=>a.type==='ammo');assert.ok(ammo.length);
  for(const {a,n} of ammo){
   const timers=createPickupTimers(map,()=>0),location={...a};
   const p=Object.assign(player('ammo','Ranger'),{x:a.x,y:a.y,z:a.z,hasCarbine:true,hasLauncher:true});
   assert.equal(timers[n],3);assert.equal(collectPickup(p,map,timers,n),false);
   tickPickupTimers(timers,8);assert.equal(timers[n],0);
   for(const random of [()=>0,()=>1,()=>.4]){
    p.ammo=0;p.carbineAmmo=0;assert.ok(collectPickup(p,map,timers,n,random));
    assert.equal(p.ammo,6);assert.equal(p.carbineAmmo,24);
    assert.ok(timers[n]>=8&&timers[n]<=18);assert.equal(timers[n],8+10*random());
    tickPickupTimers(timers,timers[n]-.1);assert.equal(collectPickup(p,map,timers,n),false);
    tickPickupTimers(timers,1);assert.equal(timers[n],0);assert.deepEqual(map.pickups[n],location);
   }
  }
  assert.equal(createPickupTimers(map,()=>1)[ammo[0].n],8);
 }
});

test('shared pack is collected once, respects ownership/caps and does not refill magazines',()=>{
 const map=arenas.outpost,n=map.pickups.findIndex(a=>a.type==='ammo'),a=map.pickups[n],timers=map.pickups.map(()=>0);
 const p=Object.assign(player('first','One'),{x:a.x,y:a.y,z:a.z});
 assert.equal(collectPickup(p,map,timers,n),false,'infinite pulse rifle needs no ammo');
 p.hasCarbine=true;p.hasLauncher=true;p.hp=0;assert.equal(collectPickup(p,map,timers,n),false);p.hp=100;
 p.x+=2;assert.equal(collectPickup(p,map,timers,n),false);p.x=a.x;
 Object.assign(p,{ammo:29,carbineAmmo:59,launcherLoaded:0,carbineClip:0,reloadLeft:1,reloadWeapon:3});
 assert.ok(collectPickup(p,map,timers,n));assert.equal(p.ammo,ammoPackRules.maxRockets);assert.equal(p.carbineAmmo,ammoPackRules.maxCarbineRounds);
 assert.equal(p.launcherLoaded,0);assert.equal(p.carbineClip,0);assert.equal(p.reloadLeft,1);
 const other={...p,id:'second',ammo:0,carbineAmmo:0};assert.equal(collectPickup(other,map,timers,n),false);
 tickPickupTimers(timers,20);assert.equal(collectPickup(p,map,timers,n),false,'full inventory leaves pack for others');assert.ok(collectPickup(other,map,timers,n));
});

test('health pickups retain their normal effect and timer',()=>{
 const map=arenas.reactor,n=map.pickups.findIndex(a=>a.type==='health'),a=map.pickups[n],timers=createPickupTimers(map);
 const p=Object.assign(player('health','Ranger'),{x:a.x,y:a.y,z:a.z,hp:80});
 assert.ok(collectPickup(p,map,timers,n));assert.equal(p.hp,100);assert.equal(timers[n],12);
});
