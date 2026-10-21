import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrain,type BotWorld} from './bots';
import {applyManeuvers,previewDodge} from './bot-maneuvers';
import {player,move,emptyInput} from '../shared/game';
import type {Arena} from '../shared/maps';

const map:Arena={id:'test',name:'Test',boxes:[{name:'Ground',x:0,y:-.5,z:0,w:40,h:1,d:40,kind:'floor'}],spawns:[[0,0,0]],weaponSpawns:[[5,0,5]],pickups:[]};
function setup(arena=map){
 const p=Object.assign(player('bot','Rook'),{x:0,y:0,z:0,vy:0,yaw:0,bot:true,spawnShield:0});
 const enemy=Object.assign(player('enemy','Ranger'),{x:0,y:0,z:10,yaw:Math.PI,pitch:0,spawnShield:0});
 const pickup={x:5,y:0,z:5,cooldown:0,spot:0};
 const w:BotWorld={map:arena,players:[p,enemy],pickups:[],carbine:pickup,launcher:pickup,firing:[]};
 const b=createBrain(p,()=>0);b.reaction=1;b.jumpCooldown=0;b.state='ATTACK';return {p,enemy,w,b};
}

test('a bot jumps and sidesteps actual enemy fire while keeping its aim',()=>{
 const {p,enemy,w,b}=setup();w.firing=[enemy.id];const i={...emptyInput(),yaw:0};
 applyManeuvers(p,i,b,w,enemy,.2,()=>0);assert.equal(p.yaw,i.yaw);assert.ok(Math.abs(i.s)>.9);assert.ok(i.jump);assert.ok(b.dodgeLeft>0);
 const start=p.x;for(let n=0;n<24;n++)move(p,i,1/60,w.map);
 assert.ok(Math.abs(p.x-start)>3);assert.ok(p.y>.8,'jump has real vertical motion');
 const cooldown=b.jumpCooldown;applyManeuvers(p,{...emptyInput()},b,w,enemy,.2,()=>0);assert.ok(b.jumpCooldown<cooldown&&b.jumpCooldown>0);
});

test('incoming visible rockets trigger evasion but departing or hidden rockets do not',()=>{
 const {p,w,b}=setup();w.rockets=[{owner:'enemy',x:0,y:1,z:10,dx:0,dy:0,dz:-1}];
 const i=emptyInput();applyManeuvers(p,i,b,w,undefined,.2,()=>0);assert.ok(b.dodgeLeft>0);assert.ok(Math.abs(i.s)>.9);
 const away=setup();away.w.rockets=[{owner:'enemy',x:0,y:1,z:10,dx:0,dy:0,dz:1}];applyManeuvers(away.p,emptyInput(),away.b,away.w,undefined,.2,()=>0);assert.equal(away.b.dodgeLeft,0);
 const wall=setup({...map,boxes:[...map.boxes,{name:'Wall',x:0,y:2,z:5,w:6,h:4,d:1}]});wall.w.rockets=w.rockets;
 applyManeuvers(wall.p,emptyInput(),wall.b,wall.w,undefined,.2,()=>0);assert.equal(wall.b.dodgeLeft,0);
});

test('safe dodges reject high ledges and switch sides when one route is blocked',()=>{
 const ledge:Arena={...map,boxes:[{name:'Ledge',x:0,y:2.5,z:0,w:3,h:1,d:12,kind:'floor'}]};
 const high=setup(ledge);high.p.y=3;assert.equal(previewDodge(high.p,ledge,1,0,true),undefined);assert.equal(previewDodge(high.p,ledge,-1,0,false),undefined);
 const wall=setup({...map,boxes:[...map.boxes,{name:'Wall',x:1,y:2,z:0,w:.4,h:4,d:10}]});wall.b.jumpCooldown=3;wall.w.firing=[wall.enemy.id];
 const i=emptyInput();applyManeuvers(wall.p,i,wall.b,wall.w,wall.enemy,.2,()=>0);assert.ok(i.s<-.9,'choose the open left route');
});

test('low ceilings suppress jumps, and cooldown prevents repeated dodge requests',()=>{
 const {p,enemy,w,b}=setup({...map,boxes:[...map.boxes,{name:'Ceiling',x:0,y:2.1,z:0,w:20,h:.2,d:20}]});w.firing=[enemy.id];
 const i=emptyInput();applyManeuvers(p,i,b,w,enemy,.2,()=>0);assert.ok(Math.abs(i.s)>.9);assert.equal(i.jump,false);
 b.dodgeLeft=0;const again=emptyInput();applyManeuvers(p,again,b,w,enemy,.2,()=>0);assert.equal(b.dodgeLeft,0);assert.equal(again.jump,false);
});

test('occasional combat hops work without a fired shot and then cool down',()=>{
 const {p,enemy,w,b}=setup();const i={...emptyInput(),f:.7};applyManeuvers(p,i,b,w,enemy,.2,()=>0);assert.equal(i.jump,true);assert.equal(b.dodgeLeft,0);
 const next={...emptyInput(),f:.7};applyManeuvers(p,next,b,w,enemy,.2,()=>0);assert.equal(next.jump,false);
});
