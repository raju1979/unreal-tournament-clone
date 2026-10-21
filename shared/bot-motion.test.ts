import {test} from 'node:test';import assert from 'node:assert/strict';
import {gaitDirection,advanceStride,angleDelta,botStrideMeters} from './bot-motion';
test('armed gait chooses forward, backward and strafes relative to the aim direction',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const forward=[Math.sin(yaw),Math.cos(yaw)],right=[Math.cos(yaw),-Math.sin(yaw)];
  assert.equal(gaitDirection(...forward as [number,number],yaw).a,'RunForward');
  assert.equal(gaitDirection(-forward[0],-forward[1],yaw).a,'RunBack');
  assert.equal(gaitDirection(...right as [number,number],yaw).a,'RunRight');
  assert.equal(gaitDirection(-right[0],-right[1],yaw).a,'RunLeft');
 }
});
test('gait phase depends on distance rather than frame rate and freezes when blocked',()=>{
 const total=botStrideMeters*.73;
 const run=(frames:number)=>{let phase=0;for(let i=0;i<frames;i++)phase=advanceStride(phase,total/frames);return phase;};
 assert.ok(Math.abs(run(30)-run(144))<1e-9);assert.ok(Math.abs(run(60)-.73)<1e-9);
 assert.equal(advanceStride(.42,0),.42);assert.equal(advanceStride(.42,-1),.42);
});
test('facing interpolation takes the short path across the yaw wrap boundary',()=>{assert.ok(Math.abs(angleDelta(Math.PI-.05,-Math.PI+.05)-.1)<1e-9);});
