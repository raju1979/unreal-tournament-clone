import type {Arena} from './maps';
import {blocked,type Player,type Input} from './game';
export type CarbinePickup={x:number,y:number,z:number,cooldown:number,spot:number};
// Pick a location at round setup; collection only starts this same spot's timer.
export function tickWeaponPickup(pickup:CarbinePickup,dt:number){pickup.cooldown=Math.max(0,pickup.cooldown-dt);}
export function chooseCarbine(map:Arena,previous=-1,random=Math.random):CarbinePickup {
 const spots=map.weaponSpawns.filter(p=>!blocked(p[0],p[1]+.01,p[2],map));
 if(!spots.length)throw new Error('Arena needs a clear weapon spawn');
 const eligible=spots.map((_,i)=>i).filter(i=>spots.length===1||i!==previous);
 const spot=eligible[Math.min(eligible.length-1,Math.floor(random()*eligible.length))];
 const [x,y,z]=spots[spot];return {x,y,z,cooldown:0,spot};
}
export function collectCarbine(p:Player,i:Input,pickup:CarbinePickup){
 if(p.hp<=0||pickup.cooldown>0||(p.hasCarbine&&p.carbineAmmo>=60)||Math.hypot(p.x-pickup.x,p.y-pickup.y,p.z-pickup.z)>=1.5)return false;
 const first=!p.hasCarbine;p.hasCarbine=true;p.carbineAmmo=Math.min(60,p.carbineAmmo+30);if(first)p.carbineClip=Math.min(18,p.carbineAmmo);p.weapon=3;i.weapon=3;pickup.cooldown=20;return true;
}
export function collectLauncher(p:Player,i:Input,pickup:CarbinePickup){
 if(p.hp<=0||pickup.cooldown>0||(p.hasLauncher&&p.ammo>=30)||Math.hypot(p.x-pickup.x,p.y-pickup.y,p.z-pickup.z)>=1.5)return false;
 const first=!p.hasLauncher;p.hasLauncher=true;p.ammo=Math.min(30,p.ammo+6);if(first)p.launcherLoaded=1;p.weapon=2;i.weapon=2;pickup.cooldown=25;return true;
}
