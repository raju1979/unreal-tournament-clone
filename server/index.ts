import express from 'express';
import {tickHammer} from '../shared/hammer';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {arenas} from '../shared/maps';
import {randomAvatar} from '../shared/avatars';
import {player,spawn,move,emptyInput,rayBox,type Player,type Input} from '../shared/game';
import {tickWeaponPickup,type CarbinePickup} from '../shared/carbine';
import {createWeaponPickups,collectArenaWeapon,type ArenaWeaponPickup} from '../shared/weapon-pickups';
import {weaponStats,rocketStats,splashDamage,beginReload,tickWeapons,tryFire} from '../shared/weapons';
import {Navigation} from './navigation';
import {createBrain,thinkBot,type BotBrain} from './bots';
import {incomingDamage} from '../shared/combat';
import {createPickupTimers,tickPickupTimers,collectPickup} from '../shared/pickups';
const app=express(),http=createServer(app),wss=new WebSocketServer({server:http,path:'/ws',maxPayload:2048});
type Rocket={id:string,owner:string,x:number,y:number,z:number,dx:number,dy:number,dz:number,life:number};
type Room={map:string,players:Map<string,Player>,inputs:Map<string,Input>,sockets:Map<string,WebSocket>,pickups:number[],rockets:Rocket[],time:number,round:number,carbine:CarbinePickup,launcher:CarbinePickup,weaponPickups:ArenaWeaponPickup[],botsEnabled:boolean,brains:Map<string,BotBrain>,shots:Map<string,number>};
const rooms=new Map<string,Room>();
const navigations=new Map<string,Navigation>();
function navFor(id:string){let nav=navigations.get(id);if(!nav){nav=new Navigation(arenas[id]);navigations.set(id,nav);}return nav;}
function removeBot(r:Room){const id=r.brains.keys().next().value;if(id){r.brains.delete(id);r.players.delete(id);r.inputs.delete(id);r.shots.delete(id);}}
function syncBots(r:Room){const desired=r.botsEnabled?Math.max(0,4-r.sockets.size):0;while(r.brains.size>desired)removeBot(r);while(r.brains.size<desired){const id='bot-'+randomUUID(),used=new Set([...r.players.values()].map(p=>p.name)),name=['Rook','Vex','Atlas'].find(n=>!used.has(n))??'Sentinel';const p=player(id,name,randomAvatar([...r.players.values()].filter(q=>q.bot).map(q=>q.avatar)));p.bot=true;p.botState='PATROL';const spots=[...arenas[r.map].spawns].sort((a,b)=>{const score=(s:number[])=>Math.min(...[...r.players.values()].map(q=>Math.hypot(q.x-s[0],q.z-s[2])));return score(b)-score(a);});if(spots[0])Object.assign(p,{x:spots[0][0],y:spots[0][1],z:spots[0][2]});r.players.set(id,p);r.brains.set(id,createBrain(p));r.inputs.set(id,emptyInput());}if(desired)navFor(r.map);}
function broadcast(r:Room,msg:unknown){const s=JSON.stringify(msg);for(const ws of r.sockets.values())if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<100000)ws.send(s);}
function damage(r:Room,target:Player,amount:number,owner:string){if(target.hp<=0)return;amount=incomingDamage(amount,r.players.get(owner)?.bot===true,target.bot===true,target.spawnShield);if(amount<=0)return;const brain=r.brains.get(target.id),attacker=r.players.get(owner);if(brain&&attacker&&owner!==target.id){brain.hurt=1.8;brain.threat={x:attacker.x,y:attacker.y,z:attacker.z};}target.hp=Math.max(0,target.hp-amount);if(!target.hp){target.deaths++;target.respawn=3;const killer=r.players.get(owner);if(killer)killer.kills+=owner===target.id?-1:1;broadcast(r,{type:'kill',text:`${killer?.name??'Arena'} → ${target.name}`});}}
function wallDistance(r:Room,o:number[],d:number[]){return Math.min(120,...arenas[r.map].boxes.map(b=>rayBox(o,d,[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2])));}
wss.on('connection',ws=>{let room:Room|undefined,id='',last=Date.now(),count=0;
 ws.on('message',raw=>{try{const now=Date.now();if(now-last>1000){count=0;last=now;}if(++count>100){ws.close(1008,'Too many messages');return;}const m=JSON.parse(raw.toString());
 if(m.type==='join'&&!room){const key=String(m.room??'brothers').trim().slice(0,24)||'brothers';room=rooms.get(key);if(!room){if(rooms.size>=16){ws.close(1013,'Server full');return;}const mapId=typeof m.map==='string'&&Object.hasOwn(arenas,m.map)?m.map:'reactor',arena=arenas[mapId],weaponPickups=createWeaponPickups(arena);room={map:mapId,players:new Map(),inputs:new Map(),sockets:new Map(),pickups:createPickupTimers(arena),rockets:[],time:600,round:1,weaponPickups,carbine:weaponPickups.find(p=>p.weapon===3)!,launcher:weaponPickups.find(p=>p.weapon===2)!,botsEnabled:m.bots===true,brains:new Map(),shots:new Map()};rooms.set(key,room);}if(room.sockets.size>=4){ws.close(1008,'Room full');return;}if(room.players.size>=4)removeBot(room);id=randomUUID();room.players.set(id,player(id,String(m.name??'Ranger').trim().slice(0,20)||'Ranger',m.avatar));spawn(room.players.get(id)!,arenas[room.map]);room.inputs.set(id,{...emptyInput(),yaw:room.players.get(id)!.yaw});room.sockets.set(id,ws);syncBots(room);ws.send(JSON.stringify({type:'welcome',id,map:room.map,yaw:room.players.get(id)!.yaw}));}
 if(m.type==='input'&&room&&id){if(![m.f,m.s,m.yaw,m.pitch,m.seq].every(Number.isFinite))return;room.inputs.set(id,{f:Math.max(-1,Math.min(1,m.f)),s:Math.max(-1,Math.min(1,m.s)),yaw:m.yaw%(Math.PI*2),pitch:Math.max(-1.45,Math.min(1.45,m.pitch)),jump:m.jump===true,reload:m.reload===true||room.inputs.get(id)?.reload===true,fire:m.fire===true,altFire:m.altFire===true,weapon:m.weapon===4?4:m.weapon===3?3:m.weapon===2?2:1,seq:Math.max(0,Math.min(1e12,Math.floor(m.seq)))});}}
 catch{/* Malformed packets do not affect the simulation. */}});
 ws.on('close',()=>{if(!room)return;room.players.delete(id);room.inputs.delete(id);room.shots.delete(id);room.sockets.delete(id);if(room.sockets.size)syncBots(room);for(const [key,r]of rooms)if(!r.sockets.size)rooms.delete(key);});
 ws.on('error',()=>ws.close());
});
let ticks=0;
function tick(){const dt=1/60;for(const r of rooms.values()){
 if(r.botsEnabled&&ticks%12===0){const world={map:arenas[r.map],players:[...r.players.values()],pickups:r.pickups,carbine:r.carbine,launcher:r.launcher,weaponPickups:r.weaponPickups,rockets:r.rockets,firing:[...r.shots].filter(([,until])=>until>ticks).map(([id])=>id)};for(const [id,brain]of r.brains){const bot=r.players.get(id);if(bot)r.inputs.set(id,thinkBot(bot,brain,world,navFor(r.map)));}}
 r.time-=dt;if(r.time<=0||[...r.players.values()].some(p=>p.kills>=20)){broadcast(r,{type:'kill',text:'ROUND COMPLETE — scores reset. Next round!'});r.time=600;r.round++;r.rockets=[];r.shots.clear();r.pickups=createPickupTimers(arenas[r.map]);r.weaponPickups=createWeaponPickups(arenas[r.map]);r.carbine=r.weaponPickups.find(p=>p.weapon===3)!;r.launcher=r.weaponPickups.find(p=>p.weapon===2)!;for(const p of r.players.values()){p.kills=0;p.deaths=0;spawn(p,arenas[r.map]);}}
 for(const pickup of r.weaponPickups)tickWeaponPickup(pickup,dt);
 tickPickupTimers(r.pickups,dt);
 for(const p of r.players.values()){const i=r.inputs.get(p.id)!;p.spawnShield=Math.max(0,p.spawnShield-dt);tickWeapons(p,dt);if(p.hp<=0){p.respawn-=dt;if(p.respawn<=0)spawn(p,arenas[r.map]);continue;}move(p,i,dt,arenas[r.map]);
 arenas[r.map].pickups.forEach((a,n)=>{if(collectPickup(p,arenas[r.map],r.pickups,n)&&a.type==='ammo')r.sockets.get(p.id)?.send(JSON.stringify({type:'ammo',text:'AMMO PACK — reserves replenished / R to reload'}));});
 for(const pickup of r.weaponPickups)if(collectArenaWeapon(p,i,pickup))r.sockets.get(p.id)?.send(JSON.stringify({type:pickup.weapon===2?'launcher':pickup.weapon===3?'carbine':'weaponPickup',weapon:pickup.weapon,text:weaponStats[pickup.weapon].name+' acquired — press '+pickup.weapon+' to equip'}));
 if(i.reload){beginReload(p);i.reload=false;}
 const hammer=tickHammer(p,i,dt,[...r.players.values()],arenas[r.map]);
 if(hammer){
  r.shots.set(p.id,ticks+18);
  if(hammer.target)damage(r,hammer.target,hammer.damage,p.id);
  if(hammer.jump){damage(r,p,Math.round(15+20*hammer.charge),p.id);if(p.hp>0)p.vy=Math.max(p.vy,10+6*hammer.charge);}
  if(hammer.quick)for(const rocket of r.rockets){const delta=[rocket.x-p.x,rocket.y-(p.y+1.45),rocket.z-p.z],dist=Math.hypot(...delta);if(rocket.owner!==p.id&&dist<2.6&&delta.reduce((v,x,a)=>v+x*hammer.direction[a],0)/Math.max(.001,dist)>.5&&wallDistance(r,hammer.origin,delta.map(v=>v/Math.max(.001,dist)))>=dist){[rocket.dx,rocket.dy,rocket.dz]=hammer.direction;rocket.owner=p.id;}}
  broadcast(r,{type:'hammer',owner:p.id,charge:hammer.charge,quick:hammer.quick,hit:!!hammer.target,impact:!!hammer.target||hammer.wall<=2.15,to:hammer.origin.map((v,a)=>v+hammer.direction[a]*hammer.distance),direction:hammer.direction});
 }
 if(i.fire&&tryFire(p)){r.shots.set(p.id,ticks+18);const d=[Math.sin(p.yaw)*Math.cos(p.pitch),-Math.sin(p.pitch),Math.cos(p.yaw)*Math.cos(p.pitch)],o=[p.x,p.y+1.45,p.z];
 if(p.weapon===2){const rocket={id:randomUUID(),owner:p.id,x:o[0],y:o[1],z:o[2],dx:d[0],dy:d[1],dz:d[2],life:rocketStats.lifetime};r.rockets.push(rocket);broadcast(r,{type:'launch',id:rocket.id,owner:p.id,from:o});}
 else{let distance=wallDistance(r,o,d),hit:Player|undefined;for(const q of r.players.values())if(q.id!==p.id&&q.hp>0){const t=rayBox(o,d,[q.x-.4,q.y,q.z-.4],[q.x+.4,q.y+1.7,q.z+.4]);if(t<distance){distance=t;hit=q;}}if(hit)damage(r,hit,weaponStats[p.weapon].damage,p.id);broadcast(r,{type:'shot',owner:p.id,weapon:p.weapon,from:o,to:o.map((v,n)=>v+d[n]*distance),hit:!!hit,impact:distance<119.99||!!hit});}}
 }
 for(const rocket of [...r.rockets]){
  rocket.life-=dt;const origin=[rocket.x,rocket.y,rocket.z],direction=[rocket.dx,rocket.dy,rocket.dz],step=rocketStats.speed*dt;
  let travel=Math.min(step,wallDistance(r,origin,direction)),direct:Player|undefined;
  const wallHit=travel<step;
  for(const p of r.players.values())if(p.id!==rocket.owner&&p.hp>0){const t=rayBox(origin,direction,[p.x-.4,p.y,p.z-.4],[p.x+.4,p.y+1.7,p.z+.4]);if(t<travel){travel=t;direct=p;}}
  rocket.x+=rocket.dx*travel;rocket.y+=rocket.dy*travel;rocket.z+=rocket.dz*travel;
  if(wallHit||direct||rocket.life<=0){
   if(direct)damage(r,direct,weaponStats[2].damage,rocket.owner);
   const blast=[rocket.x-rocket.dx*.04,rocket.y-rocket.dy*.04,rocket.z-rocket.dz*.04];
   for(const p of r.players.values())if(p.id!==direct?.id&&p.hp>0){
    const target=[p.x,p.y+.85,p.z],dist=Math.hypot(...target.map((v,a)=>v-blast[a]));
    if(dist<rocketStats.splashRadius){const ray=target.map((v,a)=>(v-blast[a])/Math.max(.0001,dist));if(wallDistance(r,blast,ray)>=dist-.03)damage(r,p,splashDamage(dist,p.id===rocket.owner),rocket.owner);}
   }
   broadcast(r,{type:'explosion',at:blast});r.rockets.splice(r.rockets.indexOf(rocket),1);
  }
 }
 if(ticks%3===0)broadcast(r,{type:'state',players:[...r.players.values()],rockets:r.rockets,pickups:r.pickups,carbine:r.carbine,launcher:r.launcher,weaponPickups:r.weaponPickups,time:r.time,round:r.round});
 }ticks++;}
let previous=performance.now(),accumulator=0;
setInterval(()=>{const now=performance.now();accumulator+=Math.min((now-previous)/1000,.25);previous=now;while(accumulator>=1/60){tick();accumulator-=1/60;}},4);
app.get('/health',(_req,res)=>res.json({ok:true,rooms:rooms.size}));
if(process.env.NODE_ENV==='production')app.use(express.static('dist'));else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
http.listen(Number(process.env.PORT??3000),process.env.HOST??'0.0.0.0',()=>console.log(`Reactor Arena: http://${process.env.HOST??'localhost'}:${process.env.PORT??3000}`));
