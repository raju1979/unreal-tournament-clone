import {test} from 'node:test';
import assert from 'node:assert/strict';
import {avatars,avatarId,randomAvatar,type AvatarId} from './avatars';
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
test('random bot avatars vary, avoid duplicates until exhausted, and support future roster entries',()=>{
 const ids=Object.keys(avatars) as AvatarId[],selected:AvatarId[]=[];
 for(let n=0;n<ids.length;n++){const choice=randomAvatar(selected,()=>.7);assert.ok(!selected.includes(choice));selected.push(choice);}
 assert.deepEqual([...selected].sort(),[...ids].sort());
 assert.ok(ids.includes(randomAvatar(selected)));
 assert.equal(randomAvatar([],()=>0),ids[0]);assert.equal(randomAvatar([],()=>.999999),ids.at(-1));
});
