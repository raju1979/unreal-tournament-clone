import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foundry,arenas} from '../shared/maps';
import {blocked,move,player,emptyInput} from '../shared/game';
import {Navigation} from './navigation';

test('Foundry spawns and pickups are clear, supported, and reachable on the correct floor',()=>{
 const nav=new Navigation(foundry),start={x:-27,y:0,z:-21};
 assert.equal(arenas.foundry,foundry);
 for(const [x,y,z] of [...foundry.spawns,...foundry.weaponSpawns,...foundry.pickups.map(p=>[p.x,p.y,p.z])]){
  assert.equal(blocked(x,y+.015,z,foundry),false,`Blocked ${x},${y},${z}`);
  assert.ok(blocked(x,y-.06,z,foundry),`Unsupported ${x},${y},${z}`);
  const path=nav.path(start,{x,y,z});assert.ok(path.length,`Unreachable ${x},${y},${z}`);
  assert.ok(Math.abs(path.at(-1)!.y-y)<.05,`Incorrect floor at ${x},${z}`);
 }
});

test('all four gallery stairs are traversable using actual player physics',()=>{
 for(const x of [-20,20])for(const sign of [-1,1]){
  const p=Object.assign(player('stairs','Test'),{x,y:0,z:sign*25.1,vy:0});
  for(let n=0;n<105;n++)move(p,{...emptyInput(),f:1,yaw:sign>0?Math.PI:0},1/60,foundry);
  assert.ok(Math.abs(p.y-3)<.05,`Stair failed at ${p.x},${p.y},${p.z}`);
 }
});

test('foundry walls and cover constrain players',()=>{
 for(const [x,z] of [[32,0],[-32,0],[0,26],[0,-26],[0,12],[0,-12]])assert.ok(blocked(x,0,z,foundry));
 assert.equal(blocked(14,0,0,foundry),false);
});
