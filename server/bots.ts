import {emptyInput,rayBox,type Player,type Input} from '../shared/game';
import type {Arena} from '../shared/maps';
import type {CarbinePickup} from '../shared/carbine';
import {Navigation,type NavPoint} from './navigation';
import {createManeuvers,applyManeuvers,type Maneuvers} from './bot-maneuvers';
export const botTuning={reaction:.9,turnSpeed:1.9,aimError:.07,burstSeconds:.4,pauseSeconds:1};
export type BotState='PATROL'|'SEEK_WEAPON'|'SEEK_AMMO'|'SEEK_HEALTH'|'CHASE'|'ATTACK'|'RETREAT'|'RELOAD'|'DEAD'|'DODGE'|'JUMP';
export type BotWorld={map:Arena,players:Player[],pickups:number[],carbine:CarbinePickup,launcher:CarbinePickup,rockets?:{owner:string,x:number,y:number,z:number,dx:number,dy:number,dz:number}[],firing?:string[]};
export type BotBrain={state:BotState,target?:string,lastSeen?:NavPoint,threat?:NavPoint,hurt:number,memory:number,reaction:number,time:number,phase:number,path:NavPoint[],goal?:NavPoint,repath:number,stuck:number,last:NavPoint,patrol:number} & Maneuvers;
const distance=(a:NavPoint,b:NavPoint)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function createBrain(p:Player,random=Math.random):BotBrain{return {...createManeuvers(random),state:'PATROL',hurt:0,memory:0,reaction:0,time:0,phase:random()*Math.PI*2,path:[],repath:0,stuck:0,last:{x:p.x,y:p.y,z:p.z},patrol:0};}
function covered(point:NavPoint,threat:NavPoint,map:Arena){const o=[point.x,point.y+1.1,point.z],t=[threat.x,threat.y+1.1,threat.z],dist=Math.hypot(t[0]-o[0],t[1]-o[1],t[2]-o[2]);if(dist<.1)return false;const d=t.map((v,n)=>(v-o[n])/dist);return map.boxes.some(box=>rayBox(o,d,[box.x-box.w/2,box.y-box.h/2,box.z-box.d/2],[box.x+box.w/2,box.y+box.h/2,box.z+box.d/2])<dist-.15);}
export function canSee(a:Player,b:Player,map:Arena){
 if(b.hp<=0||b.spawnShield>0||a.id===b.id)return false;
 const origin=[a.x,a.y+1.45,a.z],target=[b.x,b.y+1,b.z],dist=Math.hypot(...target.map((v,i)=>v-origin[i]));if(dist>42)return false;
 if(dist>8&&Math.abs(angle(Math.atan2(b.x-a.x,b.z-a.z)-a.yaw))>1.45)return false;
 const dir=target.map((v,i)=>(v-origin[i])/Math.max(.001,dist));
 return !map.boxes.some(box=>rayBox(origin,dir,[box.x-box.w/2,box.y-box.h/2,box.z-box.d/2],[box.x+box.w/2,box.y+box.h/2,box.z+box.d/2])<dist-.1);
}
export function thinkBot(p:Player,b:BotBrain,w:BotWorld,nav:Navigation,dt=.2,random=Math.random):Input {
 b.time+=dt;b.repath-=dt;b.memory=Math.max(0,b.memory-dt);b.hurt=Math.max(0,b.hurt-dt);b.patrol-=dt;
 const i={...emptyInput(),seq:p.seq+1,yaw:p.yaw,pitch:p.pitch};
 if(p.hp<=0){b.dodgeLeft=0;b.dodgeJump=false;b.dodgeCooldown=0;b.jumpCooldown=1.5;b.state='DEAD';b.path=[];b.target=undefined;b.memory=0;b.reaction=0;p.botState=b.state;return i;}
 if(b.state==='DEAD'){b.repath=0;b.stuck=0;}
 const visible=w.players.filter(q=>canSee(p,q,w.map)).sort((a,c)=>distance(p,a)-distance(p,c));
 const enemy=visible.find(q=>q.id===b.target)??visible[0];
 if(enemy){if(b.target!==enemy.id)b.reaction=0;b.target=enemy.id;b.lastSeen={x:enemy.x,y:enemy.y,z:enemy.z};b.memory=3.5;b.reaction+=dt;}
 else b.reaction=0;
 if(b.target&&!w.players.some(q=>q.id===b.target&&q.hp>0)){b.memory=0;b.target=undefined;}
 const health=w.map.pickups.map((pickup,n)=>({...pickup,n})).filter(a=>a.type==='health'&&w.pickups[a.n]===0).sort((a,c)=>distance(p,a)-distance(p,c))[0];
 const ammo=w.map.pickups.map((pickup,n)=>({...pickup,n})).filter(a=>a.type==='ammo'&&w.pickups[a.n]===0&&((p.hasLauncher&&p.ammo<8)||(p.hasCarbine&&p.carbineAmmo<18))).sort((a,c)=>distance(p,a)-distance(p,c))[0];
 const range=enemy?distance(p,enemy):Infinity;
 i.weapon=p.reloadLeft>0?p.weapon:p.hasLauncher&&p.ammo>0&&range>8&&range<25?2:p.hasCarbine&&p.carbineAmmo>0?3:1;
 let goal:NavPoint|undefined;
 const nearbyWeapon=[...(!p.hasCarbine||p.carbineAmmo<6?[w.carbine]:[]),...(!p.hasLauncher||p.ammo===0?[w.launcher]:[])].filter(a=>a.cooldown===0&&distance(p,a)<10).sort((a,c)=>distance(p,a)-distance(p,c))[0];
 const threat=enemy??(b.hurt>0?b.threat:undefined);
 if((p.hp<35||b.hurt>0)&&(threat||health)){b.state=threat?'RETREAT':'SEEK_HEALTH';if(threat){const candidates=nav.nodes.filter(n=>distance(p,n)>3&&distance(p,n)<13&&distance(threat,n)>5&&Math.abs(n.y-p.y)<1.4);candidates.sort((a,c)=>(Number(covered(c,threat,w.map))*100+distance(threat,c)*1.8-distance(p,c))-(Number(covered(a,threat,w.map))*100+distance(threat,a)*1.8-distance(p,a)));goal=candidates[0]??{x:p.x+(p.x-threat.x),y:p.y,z:p.z+(p.z-threat.z)};}else goal=health;}
 else if(p.reloadLeft>0&&p.reloadWeapon===p.weapon){b.state='RELOAD';if(enemy)goal={x:p.x+(p.x-enemy.x)*.4,y:p.y,z:p.z+(p.z-enemy.z)*.4};i.weapon=p.weapon;}
 else if(ammo&&((!enemy&&b.memory<=0)||(enemy&&range>14))&&distance(p,ammo)<24){b.state='SEEK_AMMO';goal=ammo;}
 else if(nearbyWeapon&&(enemy||b.memory<=0)&&range>(b.state==='SEEK_WEAPON'?7:12)){b.state='SEEK_WEAPON';goal=nearbyWeapon;}
 else if(enemy){b.state=range>25?'CHASE':'ATTACK';const ideal=i.weapon===2?13:9,dx=(p.x-enemy.x)/Math.max(1,range),dz=(p.z-enemy.z)/Math.max(1,range),side=Math.sin(b.time*1.7+b.phase)>0?1:-1;goal={x:enemy.x+dx*ideal+dz*side*3,y:enemy.y,z:enemy.z+dz*ideal-dx*side*3};}
 else if(b.memory>0&&b.lastSeen&&distance(p,b.lastSeen)>1.5){b.state='CHASE';goal=b.lastSeen;}
 else if(health&&p.hp<75&&distance(p,health)<18){b.state='SEEK_HEALTH';goal=health;}
 else {const weapons=[...(!p.hasCarbine||p.carbineAmmo<6?[w.carbine]:[]),...(!p.hasLauncher||p.ammo===0?[w.launcher]:[])].filter(a=>a.cooldown===0).sort((a,c)=>distance(p,a)-distance(p,c));
  if(weapons.length){b.state='SEEK_WEAPON';goal=weapons[0];}
  else {b.state='PATROL';if(!b.goal||b.patrol<=0||distance(p,b.goal)<1){goal=nav.nodes[Math.floor(random()*nav.nodes.length)];b.patrol=6;}else goal=b.goal;}
 }
 if(enemy){const desired=Math.atan2(enemy.x-p.x,enemy.z-p.z),turn=Math.max(-botTuning.turnSpeed*dt,Math.min(botTuning.turnSpeed*dt,angle(desired-p.yaw)));i.yaw=p.yaw+turn;
  i.pitch=Math.atan2(p.y+1.45-(enemy.y+1),Math.max(.01,Math.hypot(enemy.x-p.x,enemy.z-p.z)))+Math.sin(b.time*3+b.phase)*botTuning.aimError;
  i.yaw+=Math.sin(b.time*2.3+b.phase)*botTuning.aimError;
  i.fire=(b.state==='ATTACK'||b.state==='RETREAT')&&b.reaction>=botTuning.reaction&&Math.abs(angle(desired-i.yaw))<.09&&(i.weapon!==2||range>7)&&((b.time+b.phase)%(botTuning.burstSeconds+botTuning.pauseSeconds)<botTuning.burstSeconds);
 }else i.pitch=0;
 if(goal){
  const moved=distance(p,b.last);b.stuck=moved<.15?b.stuck+dt:0;b.last={x:p.x,y:p.y,z:p.z};
  if(b.stuck>2){const nearby=nav.nodes.filter(n=>distance(p,n)>2&&distance(p,n)<7&&Math.abs(n.y-p.y)<1);goal=nearby[Math.floor(random()*nearby.length)]??goal;b.repath=0;b.stuck=0;}
  if(b.repath<=0||!b.goal||distance(goal,b.goal)>3){b.path=nav.path(p,goal);b.goal={...goal};b.repath=.8;}
  while(b.path.length&&Math.hypot(p.x-b.path[0].x,p.z-b.path[0].z)<.45&&Math.abs(p.y-b.path[0].y)<.6)b.path.shift();
  const next=b.path[0];if(next){const dx=next.x-p.x,dz=next.z-p.z,len=Math.max(.5,Math.hypot(dx,dz)),speed=.78;if(!enemy){const desired=Math.atan2(dx,dz);i.yaw=p.yaw+Math.max(-botTuning.turnSpeed*dt,Math.min(botTuning.turnSpeed*dt,angle(desired-p.yaw)));}i.f=(dx*Math.sin(i.yaw)+dz*Math.cos(i.yaw))/len*speed;i.s=(dx*Math.cos(i.yaw)-dz*Math.sin(i.yaw))/len*speed;}
 }
 i.reload=b.state==='RELOAD'||(!enemy&&i.weapon===3&&p.carbineClip<8&&p.carbineAmmo>p.carbineClip);
 applyManeuvers(p,i,b,w,enemy,dt,random);
 p.botState=b.dodgeLeft>0?'DODGE':i.jump?'JUMP':b.state;return i;
}
