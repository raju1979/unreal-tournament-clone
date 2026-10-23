import type {Player} from './game';

export const weaponStats:Record<number,{name:string,damage:number,interval:number,magazine:number,reload:number}>={
 1:{name:'Pulse rifle',damage:18,interval:.20,magazine:0,reload:0},
 2:{name:'RL-01 launcher',damage:110,interval:.65,magazine:1,reload:2.2},
 4:{name:'Impact Hammer',damage:135,interval:.65,magazine:0,reload:0},
 3:{name:'PC-01 carbine',damage:24,interval:.13,magazine:18,reload:1.5},
};
export const rocketStats={speed:24,lifetime:4,splashDamage:90,splashRadius:4.5,selfDamageScale:.65};
export function splashDamage(distance:number,self=false){return Math.round(rocketStats.splashDamage*Math.max(0,1-distance/rocketStats.splashRadius)*(self?rocketStats.selfDamageScale:1));}
export function beginReload(p:Player,weapon=p.weapon){
 if(p.hp<=0||p.reloadLeft>0||(weapon===1||weapon===4))return false;
 const total=weapon===2?p.ammo:p.carbineAmmo,loaded=weapon===2?p.launcherLoaded:p.carbineClip;
 if((weapon===2&&!p.hasLauncher)||(weapon===3&&!p.hasCarbine)||loaded>=Math.min(weaponStats[weapon].magazine,total))return false;
 p.reloadWeapon=weapon;p.reloadLeft=weaponStats[weapon].reload;return true;
}
export function tickWeapons(p:Player,dt:number){
 p.cool=Math.max(0,p.cool-dt);
 if(p.reloadLeft>0){p.reloadLeft=Math.max(0,p.reloadLeft-dt);if(p.reloadLeft===0){
  if(p.reloadWeapon===2&&p.hasLauncher)p.launcherLoaded=Math.min(1,p.ammo);
  if(p.reloadWeapon===3&&p.hasCarbine)p.carbineClip=Math.min(weaponStats[3].magazine,p.carbineAmmo);
  p.reloadWeapon=0;
 }}
}
export function tryFire(p:Player){
 if(p.weapon===4||p.hp<=0||p.cool>0||(p.reloadLeft>0&&p.reloadWeapon===p.weapon))return false;
 if(p.weapon===2&&(!p.hasLauncher||p.ammo<=0))return false;
 if(p.weapon===3&&(!p.hasCarbine||p.carbineAmmo<=0))return false;
 if((p.weapon===2&&p.launcherLoaded<=0)||(p.weapon===3&&p.carbineClip<=0)){beginReload(p);return false;}
 p.cool=weaponStats[p.weapon].interval;
 p.spawnShield=0;
 if(p.weapon===2){p.ammo--;p.launcherLoaded--;if(!p.launcherLoaded)beginReload(p);}
 if(p.weapon===3){p.carbineAmmo--;p.carbineClip--;if(!p.carbineClip)beginReload(p);}
 return true;
}
