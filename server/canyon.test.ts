import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canyon,arenas} from '../shared/maps';
import {blocked,emptyInput,move,player} from '../shared/game';
import {Navigation} from './navigation';
const nav=new Navigation(canyon);

test('Sunspire spawns, weapons and packs are clear and connected across both deck heights',()=>{
 assert.equal(arenas.canyon,canyon);assert.ok(nav.nodes.length>5000);
 const start={x:canyon.spawns[0][0],y:0,z:canyon.spawns[0][2]};
 for(const [x,y,z] of [...canyon.spawns,...canyon.weaponSpawns,...canyon.pickups.map(p=>[p.x,p.y,p.z])]){
  assert.equal(blocked(x,y+.01,z,canyon),false,`Blocked ${x},${y},${z}`);
  const path=nav.path(start,{x,y,z});assert.ok(path.length,`Unreachable ${x},${y},${z}`);
  assert.ok(Math.abs(path.at(-1)!.y-y)<.05,`Wrong floor at ${x},${z}`);
 }
});

test('all four Sunspire stair approaches can be climbed with actual player movement',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const p=Object.assign(player('stairs','Test'),{x:Math.sin(yaw)*34,y:0,z:Math.cos(yaw)*34,vy:0});
  for(let n=0;n<172;n++)move(p,{...emptyInput(),f:1,yaw:yaw+Math.PI},1/60,canyon);
  assert.ok(Math.abs(p.y-3.4)<.05,`Stair ${yaw} stopped at ${p.x},${p.y},${p.z}`);
  assert.ok(Math.hypot(p.x,p.z)<12);
 }
});

test('bots follow an actual movement route through a hangar and onto the command ring',()=>{
 const p=Object.assign(player('route','Test'),{x:-44,y:.16,z:-22,vy:0});
 const path=nav.path(p,{x:0,y:3.4,z:8});assert.ok(path.length>30);
 for(const next of path){let steps=0;while((Math.hypot(p.x-next.x,p.z-next.z)>.18||Math.abs(p.y-next.y)>.35)&&steps++<120)move(p,{...emptyInput(),f:1,yaw:Math.atan2(next.x-p.x,next.z-p.z)},1/60,canyon);
  assert.ok(steps<120,`Stuck at ${p.x},${p.y},${p.z} to ${next.x},${next.y},${next.z}`);
 }
 assert.ok(Math.abs(p.y-3.4)<.05);
});

test('hangar entrances remain open while walls and perimeter constrain movement',()=>{
 for(const x of [-44,44])for(const z of [-25,25]){
  assert.equal(blocked(x,.16,z+7.5,canyon),false,'front opening');
  assert.equal(blocked(x,.16,z-7.5,canyon),false,'rear passage');
  assert.equal(blocked(x+8,.16,z,canyon),true,'side wall');
 }
 assert.ok(blocked(62,0,20,canyon));assert.ok(blocked(20,0,-62,canyon));
});
