import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from './navigation';
import {village} from '../shared/maps';
import {blocked,emptyInput,move,player} from '../shared/game';
const nav=new Navigation(village);

test('village spawn and pickup locations stay accessible after Blender layout rebuilds',()=>{
 const locations=[...village.spawns,...village.weaponSpawns,...village.pickups.map(p=>[p.x,p.y,p.z])];
 const start={x:village.spawns[0][0],y:0,z:village.spawns[0][2]};
 for(const [x,y,z] of locations){assert.equal(blocked(x,y+.01,z,village),false,`Blocked location ${x},${z}`);assert.ok(nav.path(start,{x,y,z}).length,`Unreachable location ${x},${z}`);}
});
test('all three canal bridges can be crossed using actual player movement',()=>{
 for(const x of [-28,0,28]){
  const p=player('crossing','Test');Object.assign(p,{x,y:0,z:3,vy:0});
  for(let n=0;n<110;n++)move(p,{...emptyInput(),f:1},1/60,village);
  assert.ok(p.z>18,`Bridge ${x}: stopped at ${p.z}`);assert.ok(Math.abs(p.y)<.05,`Bridge ${x}: fell to ${p.y}`);
 }
});
test('bots route between banks through bridge openings instead of walking into the canal',()=>{
 const path=nav.path({x:12,y:0,z:1},{x:12,y:0,z:19});assert.ok(path.length>10);
 const crossing=path.filter(p=>p.z>7&&p.z<13);assert.ok(crossing.length>0);
 assert.ok(crossing.every(p=>[-28,0,28].some(x=>Math.abs(p.x-x)<2.2)),JSON.stringify(crossing));
});
