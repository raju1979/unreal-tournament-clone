import {test} from 'node:test';import assert from 'node:assert/strict';
import {weaponExtension} from './weapon';import type {Arena} from './maps';
const arena=(x:number,y:number,z:number,w:number,h:number,d:number):Arena=>({id:'test',name:'test',spawns:[],weaponSpawns:[],pickups:[],boxes:[{name:'obstacle',x,y,z,w,h,d}]});
test('weapon stays extended in open space',()=>assert.equal(weaponExtension([0,1.45,0],0,0,arena(0,1,5,3,3,1)),1));
test('whole barrel retracts before a front wall',()=>{const f=weaponExtension([0,1.45,0],0,0,arena(0,1,.8,4,4,.2));assert.ok(f>0&&f<.55);assert.ok(1.25*f<.7);});
test('weapon width detects side obstacles missed by center ray',()=>{assert.ok(weaponExtension([0,1.45,0],0,0,arena(.48,1,0,.2,4,5))<1);});
test('aiming down retracts against a raised ledge',()=>{assert.ok(weaponExtension([0,1.45,0],0,1.4,arena(0,-.7,0,50,2,50))<1);});
test('rotated aim detects cover behind player',()=>{assert.ok(weaponExtension([0,1.45,0],Math.PI,0,arena(0,1,-.8,4,4,.2))<.55);});
test('launcher checks its wider body against side cover',()=>{const map=arena(.55,1,0,.2,4,5);assert.equal(weaponExtension([0,1.45,0],0,0,map,1),1);assert.ok(weaponExtension([0,1.45,0],0,0,map,2)<1);});
