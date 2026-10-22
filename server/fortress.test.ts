import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fortress,arenas} from '../shared/maps';
import {blocked,move,player,emptyInput} from '../shared/game';
import {Navigation} from './navigation';

test('Fortress spawns and pickups are clear, supported, and reachable on the correct floor',()=>{
 const nav=new Navigation(fortress),start={x:-14,y:0,z:-23};
 assert.equal(arenas.fortress,fortress);
 for(const [x,y,z] of [...fortress.spawns,...fortress.weaponSpawns,...fortress.pickups.map(p=>[p.x,p.y,p.z])]){
  assert.equal(blocked(x,y+.015,z,fortress),false,`Blocked ${x},${y},${z}`);
  assert.ok(blocked(x,y-.06,z,fortress),`Unsupported ${x},${y},${z}`);
  const path=nav.path(start,{x,y,z});assert.ok(path.length,`Unreachable ${x},${y},${z}`);
  assert.ok(Math.abs(path.at(-1)!.y-y)<.05,`Incorrect floor at ${x},${z}`);
 }
});

test('all four gallery stairs are traversable using actual player physics',()=>{
 for(const x of [-19.5,19.5])for(const sign of [-1,1]){
  const p=Object.assign(player('stairs','Test'),{x,y:0,z:sign*26.5,vy:0});
  for(let n=0;n<105;n++)move(p,{...emptyInput(),f:1,yaw:sign>0?Math.PI:0},1/60,fortress);
  assert.ok(Math.abs(p.y-3.2)<.05,`Stair failed at ${p.x},${p.y},${p.z}`);
 }
});

test('fortress walls and cover constrain players',()=>{
 for(const [x,z] of [[24,0],[-24,0],[0,28],[0,-28],[10,11],[-10,-11]])assert.ok(blocked(x,0,z,fortress));
 assert.equal(blocked(14,0,0,fortress),false);
});
