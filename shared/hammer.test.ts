import test from 'node:test';
import assert from 'node:assert/strict';
import {player,emptyInput,spawn,move} from './game';
import {tickHammer,hammerStats} from './hammer';
import {beginReload,tryFire} from './weapons';
import type {Arena} from './maps';
const map:Arena={id:'hammer-test',name:'Test',spawns:[[0,0,0]],weaponSpawns:[],pickups:[],boxes:[{name:'Floor',x:0,y:-.5,z:0,w:40,h:1,d:40,kind:'floor'}]};
function setup(){const p=player('p','P');Object.assign(p,{x:0,y:0,z:0,yaw:0,pitch:0,weapon:4,spawnShield:0});return p;}
test('hammer charges without ammo, releases once, and never uses the hitscan path',()=>{const p=setup(),i={...emptyInput(),weapon:4,fire:true};assert.equal(tickHammer(p,i,hammerStats.chargeSeconds,[],map),undefined);assert.equal(p.hammerCharge,1);assert.equal(tryFire(p),false);assert.equal(beginReload(p),false);const hit=tickHammer(p,{...i,fire:false},1/60,[],map)!;assert.equal(hit.damage,135);assert.equal(hit.target,undefined);assert.equal(p.ammo,0);assert.equal(p.hammerCharge,0);assert.equal(tickHammer(p,{...i,fire:false},1/60,[],map),undefined);});
test('contact discharges automatically and walls block targets',()=>{const p=setup(),q=setup();q.id='q';q.z=1.8;p.hammerCharge=1;const i={...emptyInput(),weapon:4,fire:true};assert.equal(tickHammer(p,i,1/60,[q],map)?.target,q);p.cool=0;p.hammerCharge=1;const wall={...map,boxes:[...map.boxes,{name:'Wall',x:0,y:1,z:.8,w:5,h:3,d:.2,kind:'wall'}]};assert.equal(tickHammer(p,i,1/60,[q],wall),undefined);assert.equal(tickHammer(p,{...i,fire:false},1/60,[q],wall)?.target,undefined);});
test('quick strike has no charge and enforces its cooldown',()=>{const p=setup(),i={...emptyInput(),weapon:4,altFire:true};p.hammerCharge=1;const strike=tickHammer(p,i,1/60,[],map)!;assert.equal(strike.damage,25);assert.equal(strike.quick,true);assert.equal(p.cool,.3);assert.equal(tickHammer(p,i,1/60,[],map),undefined);});
test('charged downward strike supports hammer jumping; switching and respawning clear charge',()=>{const p=setup();p.pitch=1.4;p.hammerCharge=1;assert.equal(tickHammer(p,{...emptyInput(),weapon:4},1/60,[],map)?.jump,true);p.cool=0;p.hammerCharge=1;p.weapon=1;tickHammer(p,emptyInput(),1/60,[],map);assert.equal(p.hammerCharge,0);p.hammerCharge=1;spawn(p,map);assert.equal(p.hammerCharge,0);move(p,{...emptyInput(),weapon:4},1/60,map);assert.equal(p.weapon,4);});
