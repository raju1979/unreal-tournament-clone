import type {Arena} from './maps';
import {blocked,type Player,type Input} from './game';
import {collectCarbine,collectLauncher,type CarbinePickup} from './carbine';

export type ArenaWeaponPickup=CarbinePickup & {weapon:number};
/** Populate every clear authored position, with every weapon represented. */
export function createWeaponPickups(map:Arena,random=Math.random):ArenaWeaponPickup[]{
 const spots=map.weaponSpawns.map((p,spot)=>({p,spot})).filter(({p})=>!blocked(p[0],p[1]+.01,p[2],map));
 if(spots.length<4)throw new Error('Arena needs at least four clear weapon positions');
 for(let i=spots.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[spots[i],spots[j]]=[spots[j],spots[i]];}
 return spots.map(({p,spot},i)=>({x:p[0],y:p[1],z:p[2],spot,weapon:[2,3,4,1][i%4],cooldown:0}));
}
export function collectArenaWeapon(p:Player,i:Input,pickup:ArenaWeaponPickup){
 if(pickup.weapon===2)return collectLauncher(p,i,pickup);
 if(pickup.weapon===3)return collectCarbine(p,i,pickup);
 if(p.hp<=0||pickup.cooldown>0||p.weapon===pickup.weapon||Math.hypot(p.x-pickup.x,p.y-pickup.y,p.z-pickup.z)>=1.5)return false;
 p.weapon=pickup.weapon;i.weapon=pickup.weapon;pickup.cooldown=12;return true;
}
