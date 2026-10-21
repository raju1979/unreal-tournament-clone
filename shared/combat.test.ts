import {test} from 'node:test';import assert from 'node:assert/strict';
import {incomingDamage} from './combat';import {player,spawn} from './game';import {tryFire} from './weapons';
test('practice bots deal reduced damage to humans while PvP remains unchanged',()=>{assert.equal(incomingDamage(18,true,false,0),11);assert.equal(incomingDamage(24,true,false,0),14);assert.equal(incomingDamage(110,true,false,0),66);assert.equal(incomingDamage(18,false,false,0),18);assert.equal(incomingDamage(18,true,true,0),18);});
test('spawn protection blocks incoming damage and ends when firing',()=>{const p=player('a','A');assert.equal(p.spawnShield,3);assert.equal(incomingDamage(110,true,false,p.spawnShield),0);assert.ok(tryFire(p));assert.equal(p.spawnShield,0);spawn(p);assert.equal(p.spawnShield,3);});
