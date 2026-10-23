import {test} from 'node:test';
import assert from 'node:assert/strict';
import {avatars,avatarId} from './avatars';
import {player,spawn} from './game';
import {arenas} from './maps';
test('avatar choices validate incoming IDs and reject untrusted paths',()=>{
 for(const id of Object.keys(avatars))assert.equal(avatarId(id),id);
 for(const id of [undefined,null,{},'__proto__','constructor','../custom.glb'])assert.equal(avatarId(id),'red-warden');
});
test('selected character survives deaths and round respawns on all arenas',()=>{
 for(const id of Object.keys(avatars))for(const arena of Object.values(arenas)){
  const p=player('test','Player',id);p.hp=0;spawn(p,arena);assert.equal(p.avatar,id);assert.equal(p.hp,100);
 }
});
