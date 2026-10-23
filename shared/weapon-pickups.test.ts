import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arenas} from './maps';
import {blocked,player,emptyInput} from './game';
import {createWeaponPickups,collectArenaWeapon} from './weapon-pickups';
import {tickWeaponPickup} from './carbine';

test('every arena populates all clear weapon points and includes all four types without overlap',()=>{
 for(const arena of Object.values(arenas))for(let round=0;round<20;round++){
  const pickups=createWeaponPickups(arena);
  assert.deepEqual([...new Set(pickups.map(p=>p.weapon))].sort(),[1,2,3,4],arena.id);
  assert.equal(pickups.length,arena.weaponSpawns.filter(p=>!blocked(p[0],p[1]+.01,p[2],arena)).length);
  assert.equal(new Set(pickups.map(p=>`${p.x},${p.y},${p.z}`)).size,pickups.length);
  assert.ok(pickups.every(p=>p.cooldown===0&&!blocked(p.x,p.y+.01,p.z,arena)));
 }
});

test('all weapon pickups equip, are shared, and respawn at the same position',()=>{
 for(const pickup of createWeaponPickups(arenas.reactor)){
  const p=Object.assign(player('test','Test'),{x:pickup.x,y:pickup.y,z:pickup.z,weapon:pickup.weapon===1?4:1}),i=emptyInput();
  const original=[pickup.x,pickup.y,pickup.z];
  assert.ok(collectArenaWeapon(p,i,pickup));assert.equal(p.weapon,pickup.weapon);assert.equal(i.weapon,pickup.weapon);
  assert.ok(pickup.cooldown>0);assert.equal(collectArenaWeapon(p,i,pickup),false);
  tickWeaponPickup(pickup,30);assert.equal(pickup.cooldown,0);assert.deepEqual([pickup.x,pickup.y,pickup.z],original);
  if(pickup.weapon===2)assert.ok(p.hasLauncher&&p.ammo===6);
  if(pickup.weapon===3)assert.ok(p.hasCarbine&&p.carbineAmmo===30);
 }
});
