import {rayBox,type Player,type Input} from './game';
import type {Arena} from './maps';

export const hammerStats={range:2.15,chargeSeconds:1.25,minDamage:35,maxDamage:135,quickDamage:25,interval:.65,quickInterval:.3};
export function hammerTrace(p:Player,players:Player[],map:Arena){
 const origin=[p.x,p.y+1.45,p.z],direction=[Math.sin(p.yaw)*Math.cos(p.pitch),-Math.sin(p.pitch),Math.cos(p.yaw)*Math.cos(p.pitch)];
 const wall=Math.min(120,...map.boxes.map(b=>rayBox(origin,direction,[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2])));
 let distance=Math.min(wall,hammerStats.range),target:Player|undefined;
 for(const q of players)if(q.id!==p.id&&q.hp>0){const t=rayBox(origin,direction,[q.x-.48,q.y,q.z-.48],[q.x+.48,q.y+1.7,q.z+.48]);if(t<distance){distance=t;target=q;}}
 return {origin,direction,distance,target,wall};
}
// Called only by the authoritative simulation. Clients animate replicated charge.
export function tickHammer(p:Player,i:Input,dt:number,players:Player[],map:Arena){
 if(p.weapon!==4||p.hp<=0){p.hammerCharge=0;return;}
 if(p.cool>0){p.hammerCharge=0;return;}
 const trace=hammerTrace(p,players,map),previous=p.hammerCharge;
 const quick=i.altFire===true;
 if(i.fire&&!quick){p.spawnShield=0;p.hammerCharge=Math.min(1,previous+dt/hammerStats.chargeSeconds);}
 const contact=i.fire&&!!trace.target;
 if(!quick&&!contact&&!(previous>0&&!i.fire))return;
 const charge=quick?0:p.hammerCharge;
 p.hammerCharge=0;p.cool=quick?hammerStats.quickInterval:hammerStats.interval;p.spawnShield=0;
 return {...trace,quick,charge,damage:quick?hammerStats.quickDamage:Math.round(hammerStats.minDamage+(hammerStats.maxDamage-hammerStats.minDamage)*charge),jump:!quick&&!trace.target&&trace.wall<=hammerStats.range&&p.pitch>.8&&charge>=.25};
}
