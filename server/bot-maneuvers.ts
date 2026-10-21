import {blocked,emptyInput,move,rayBox,type Input,type Player} from '../shared/game';
import type {Arena} from '../shared/maps';
import {rocketStats} from '../shared/weapons';
import type {BotBrain,BotWorld} from './bots';

export type Maneuvers={dodgeLeft:number,dodgeCooldown:number,jumpCooldown:number,dodgeX:number,dodgeZ:number,dodgeJump:boolean};
export const maneuverTuning={duration:.4,dodgeCooldownMin:1.4,dodgeCooldownMax:2.6,jumpCooldownMin:2.8,jumpCooldownMax:4.8};
export function createManeuvers(random=Math.random):Maneuvers{return {dodgeLeft:0,dodgeCooldown:0,jumpCooldown:1+random()*1.5,dodgeX:0,dodgeZ:0,dodgeJump:false};}

/** Preview the same physics the server uses, including landing after a hop. */
export function previewDodge(p:Player,map:Arena,dx:number,dz:number,jump:boolean){
 const probe={...p},yaw=Math.atan2(dx,dz);let peak=p.y;
 for(let n=0;n<60;n++){
  move(probe,{...emptyInput(),weapon:p.weapon,yaw,f:n<24?1:0,jump:jump&&n===0},1/60,map);peak=Math.max(peak,probe.y);
  if(probe.hp<=0||probe.y<p.y-.65)return undefined;
 }
 const distance=Math.hypot(probe.x-p.x,probe.z-p.z);
 if(distance<1.2||probe.vy< -1||!blocked(probe.x,probe.y-.08,probe.z,map))return undefined;
 if(jump&&peak-p.y<.55)return undefined;
 return {distance,peak,end:probe};
}

function clearSight(p:Player,x:number,y:number,z:number,map:Arena){
 const o=[p.x,p.y+1,p.z],delta=[x-o[0],y-o[1],z-o[2]],distance=Math.hypot(...delta),d=delta.map(v=>v/Math.max(.001,distance));
 return !map.boxes.some(b=>rayBox(o,d,[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2])<distance-.1);
}
function incomingRocket(p:Player,w:BotWorld){
 for(const r of w.rockets??[]){
  if(r.owner===p.id)continue;
  const dx=p.x-r.x,dy=p.y+.9-r.y,dz=p.z-r.z,dist=Math.hypot(dx,dy,dz),v=[r.dx*rocketStats.speed,r.dy*rocketStats.speed,r.dz*rocketStats.speed];
  const t=(dx*v[0]+dy*v[1]+dz*v[2])/(rocketStats.speed**2);
  if(t<=0||t>.75||Math.hypot(dx-v[0]*t,dy-v[1]*t,dz-v[2]*t)>2.7)continue;
  if(dist>6&&Math.sin(p.yaw)*(-dx)+Math.cos(p.yaw)*(-dz)<0)continue;
  if(clearSight(p,r.x,r.y,r.z,w.map))return {x:r.dx,z:r.dz};
 }
}

/** A short evasive overlay preserves the bot's target, aim and navigation state. */
export function applyManeuvers(p:Player,i:Input,b:BotBrain,w:BotWorld,enemy:Player|undefined,dt:number,random:()=>number){
 b.dodgeCooldown=Math.max(0,b.dodgeCooldown-dt);b.jumpCooldown=Math.max(0,b.jumpCooldown-dt);b.dodgeLeft=Math.max(0,b.dodgeLeft-dt);
 const grounded=Math.abs(p.vy)<.8&&blocked(p.x,p.y-.08,p.z,w.map);
 const rocket=incomingRocket(p,w);
 const aim=enemy?Math.atan2(p.x-enemy.x,p.z-enemy.z):0;
 const firing=enemy&&(w.firing??[]).includes(enemy.id)&&b.reaction>=.35&&Math.abs(Math.atan2(Math.sin(enemy.yaw-aim),Math.cos(enemy.yaw-aim)))<.3;
 const hurt=b.hurt>0&&b.threat;
 if(b.dodgeLeft===0&&b.dodgeCooldown===0&&grounded&&(rocket||firing||hurt)){
  const threat=enemy??b.threat;
  const direction=rocket??(threat?{x:p.x-threat.x,z:p.z-threat.z}:{x:Math.sin(p.yaw),z:Math.cos(p.yaw)});
  const length=Math.hypot(direction.x,direction.z),side=random()<.5?-1:1;
  const dx=-direction.z/Math.max(.001,length)*side,dz=direction.x/Math.max(.001,length)*side;
  const hopping=b.jumpCooldown===0&&random()<.55;
  const candidates=[];
  for(const sign of [1,-1])for(const jump of hopping?[true,false]:[false]){
   const result=previewDodge(p,w.map,dx*sign,dz*sign,jump);
   if(result)candidates.push({x:dx*sign,z:dz*sign,jump,score:result.distance+(jump?.15:0)+(sign===1?.01:0)});
  }
  candidates.sort((a,c)=>c.score-a.score);const best=candidates[0];
  b.dodgeCooldown=maneuverTuning.dodgeCooldownMin+random()*(maneuverTuning.dodgeCooldownMax-maneuverTuning.dodgeCooldownMin);
  if(best){b.dodgeX=best.x;b.dodgeZ=best.z;b.dodgeLeft=maneuverTuning.duration;b.dodgeJump=best.jump;b.repath=0;b.stuck=0;
   if(best.jump)b.jumpCooldown=maneuverTuning.jumpCooldownMin+random()*2;
  }
 }
 if(b.dodgeLeft>0){
  i.f=b.dodgeX*Math.sin(i.yaw)+b.dodgeZ*Math.cos(i.yaw);i.s=b.dodgeX*Math.cos(i.yaw)-b.dodgeZ*Math.sin(i.yaw);i.jump=b.dodgeJump;return;
 }
 // Combat hops are occasional; blocked routes can also trigger a safe obstacle hop.
 if(grounded&&b.jumpCooldown===0&&((enemy&&b.reaction>=.9&&Math.hypot(enemy.x-p.x,enemy.z-p.z)<25)||b.stuck>.7)){
  const dx=Math.sin(i.yaw)*i.f+Math.cos(i.yaw)*i.s,dz=Math.cos(i.yaw)*i.f-Math.sin(i.yaw)*i.s,len=Math.hypot(dx,dz);
  if(len>.15&&(b.stuck>.7||random()<.4)&&previewDodge(p,w.map,dx/len,dz/len,true)){
   i.jump=true;b.jumpCooldown=maneuverTuning.jumpCooldownMin+random()*2;
  }else b.jumpCooldown=.8;
 }
}
