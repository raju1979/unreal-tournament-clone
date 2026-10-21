import type {Arena} from './maps';
import type {Player} from './game';

export const ammoPackRules={initialMin:3,initialMax:8,respawnMin:8,respawnMax:18,rockets:6,carbineRounds:24,maxRockets:30,maxCarbineRounds:60};
function delay(min:number,max:number,random:()=>number){return min+(max-min)*Math.max(0,Math.min(1,random()));}
export function createPickupTimers(map:Arena,random=Math.random){return map.pickups.map(p=>p.type==='ammo'?delay(ammoPackRules.initialMin,ammoPackRules.initialMax,random):0);}
export function tickPickupTimers(timers:number[],dt:number){for(let n=0;n<timers.length;n++)timers[n]=Math.max(0,timers[n]-dt);}
export function collectPickup(p:Player,map:Arena,timers:number[],index:number,random=Math.random){
 const a=map.pickups[index];
 if(!a||p.hp<=0||timers[index]!==0||Math.hypot(p.x-a.x,p.y-a.y,p.z-a.z)>=1.5)return false;
 if(a.type==='health'){
  if(p.hp>=100)return false;p.hp=Math.min(100,p.hp+35);timers[index]=12;return true;
 }
 if(a.type!=='ammo')return false;
 const rockets=p.hasLauncher&&p.ammo<ammoPackRules.maxRockets,carbine=p.hasCarbine&&p.carbineAmmo<ammoPackRules.maxCarbineRounds;
 if(!rockets&&!carbine)return false;
 if(rockets)p.ammo=Math.min(ammoPackRules.maxRockets,p.ammo+ammoPackRules.rockets);
 if(carbine)p.carbineAmmo=Math.min(ammoPackRules.maxCarbineRounds,p.carbineAmmo+ammoPackRules.carbineRounds);
 // Add reserve ammo only: picking a pack never bypasses magazine reloads.
 timers[index]=delay(ammoPackRules.respawnMin,ammoPackRules.respawnMax,random);return true;
}
