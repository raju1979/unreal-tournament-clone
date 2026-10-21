import {test} from 'node:test';
import assert from 'node:assert/strict';
import {outpost,arenas} from '../shared/maps';
import {blocked,player,spawn,emptyInput,move,rayBox} from '../shared/game';
import {Navigation} from './navigation';
const nav=new Navigation(outpost);

test('outpost spawns use the authored clear viewing directions',()=>{
 const p=player('spawn','Ranger');spawn(p,outpost);
 const point=outpost.spawns.find(s=>s[0]===p.x&&s[2]===p.z)!;
 assert.ok(Number.isFinite(point[3]));assert.equal(p.yaw,point[3]);
});

test('outpost spawns and pickups are clear and connected through the captured courtyard',()=>{
 assert.equal(arenas.outpost,outpost);assert.ok(nav.nodes.length>400);
 const start={x:outpost.spawns[0][0],y:0,z:outpost.spawns[0][2]};
 for(const [x,y,z] of [...outpost.spawns,...outpost.weaponSpawns,...outpost.pickups.map(p=>[p.x,p.y,p.z])]){
  assert.equal(blocked(x,y,z,outpost),false,`Blocked ${x},${z}`);
  const path=nav.path(start,{x,y,z});assert.ok(path.length,`No route ${x},${z}`);
  assert.ok(Math.hypot(path.at(-1)!.x-x,path.at(-1)!.z-z)<1.2);
 }
});

test('actual movement follows outpost bot routes without falling or sticking',()=>{
 for(const destination of outpost.spawns.slice(1)){
  const p=Object.assign(player('route','Test'),{x:outpost.spawns[0][0],y:0,z:outpost.spawns[0][2],vy:0});
  const path=nav.path(p,{x:destination[0],y:0,z:destination[2]});
  for(const next of path){let steps=0;while(Math.hypot(p.x-next.x,p.z-next.z)>.16&&steps++<120)move(p,{...emptyInput(),f:1,yaw:Math.atan2(next.x-p.x,next.z-p.z)},1/60,outpost);assert.ok(steps<120,`Stuck ${p.x},${p.z} -> ${next.x},${next.z}`);assert.ok(Math.abs(p.y)<.05,'stable main deck');}
 }
});

test('outpost supply cover blocks players and weapon rays',()=>{
 const covers=outpost.boxes.filter(b=>b.kind==='crate');assert.equal(covers.length,4);
 for(const b of covers){assert.ok(blocked(b.x,0,b.z,outpost));const t=rayBox([b.x,1,b.z-3],[0,0,1],[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2]);assert.ok(t>1&&t<3);}
});
