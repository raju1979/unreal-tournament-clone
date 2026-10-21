import {test} from 'node:test';import assert from 'node:assert/strict';
import {Navigation} from './navigation';import {canSee,createBrain,thinkBot,type BotWorld} from './bots';import {reactor} from '../shared/maps';import {player,blocked,move} from '../shared/game';import {chooseCarbine} from '../shared/carbine';
const nav=new Navigation(reactor);
function setup(){const p=player('bot','Rook');Object.assign(p,{x:8,y:0,z:18,yaw:Math.PI,spawnShield:0,bot:true});const enemy=player('human','Ranger');Object.assign(enemy,{x:8,y:0,z:12,spawnShield:0});const world:BotWorld={map:reactor,players:[p,enemy],pickups:reactor.pickups.map(()=>0),carbine:chooseCarbine(reactor,-1,()=>0),launcher:chooseCarbine(reactor,-1,()=>.4)};return {p,enemy,world,brain:createBrain(p,()=>.5)};}
test('navigation routes to galleries through traversable stairs',()=>{assert.ok(nav.nodes.length>1000);const path=nav.path({x:8,y:0,z:19},{x:17,y:3.5,z:5});assert.ok(path.length>10);assert.ok(path.some(p=>p.y>0&&p.y<3.5));const end=path.at(-1)!;assert.equal(end.y,3.5);assert.ok(path.every(n=>!blocked(n.x,n.y+.015,n.z,reactor)));});
test('navigation waypoints can be followed with actual player movement',()=>{const {p}=setup();const path=nav.path(p,{x:17,y:3.5,z:5});assert.ok(path.length>0);let index=0;for(let n=0;n<1800&&index<path.length;n++){const next=path[index],dx=next.x-p.x,dz=next.z-p.z;if(Math.hypot(dx,dz)<.35&&Math.abs(p.y-next.y)<.5){index++;continue;}move(p,{f:.7,s:0,yaw:Math.atan2(dx,dz),pitch:0,jump:false,fire:false,reload:false,weapon:1,seq:n},1/60);}assert.equal(index,path.length,`Stopped at ${p.x},${p.y},${p.z} / waypoint ${index}`);});
test('walls block bot perception and prevent firing',()=>{const {p,enemy,world,brain}=setup();world.map={...reactor,boxes:[...reactor.boxes,{name:'occluder',x:8,y:2,z:15,w:4,h:4,d:1}]};assert.equal(canSee(p,enemy,world.map),false);assert.equal(thinkBot(p,brain,world,nav).fire,false);});
test('attack requires reaction time and aim alignment',()=>{const {p,world,brain}=setup();assert.equal(thinkBot(p,brain,world,nav).fire,false);let shots=0;for(let n=0;n<20;n++){const i=thinkBot(p,brain,world,nav);p.yaw=i.yaw;if(i.fire)shots++;if(brain.reaction<.9)assert.equal(i.fire,false);}assert.equal(brain.state,'ATTACK');assert.ok(shots>0&&shots<10,'Bot must pause between bursts');});
test('FSM covers retreat, health, weapon, reload, lost-target chase and death',()=>{const {p,enemy,world,brain}=setup();p.hp=20;thinkBot(p,brain,world,nav);assert.equal(brain.state,'RETREAT');world.players=[p];brain.memory=0;thinkBot(p,brain,world,nav);assert.equal(brain.state,'SEEK_HEALTH');p.hp=100;thinkBot(p,brain,world,nav);assert.equal(brain.state,'SEEK_WEAPON');p.weapon=3;p.hasCarbine=true;p.reloadLeft=1;p.reloadWeapon=3;thinkBot(p,brain,world,nav);assert.equal(brain.state,'RELOAD');p.reloadLeft=0;p.weapon=1;brain.target=enemy.id;brain.memory=2;brain.lastSeen={x:8,y:0,z:12};world.players=[p,enemy];world.map={...reactor,boxes:[...reactor.boxes,{name:'occluder',x:8,y:2,z:15,w:4,h:4,d:1}]};thinkBot(p,brain,world,nav);assert.equal(brain.state,'CHASE');p.hp=0;const dead=thinkBot(p,brain,world,nav);assert.equal(brain.state,'DEAD');assert.equal(dead.fire,false);assert.equal(dead.f,0);});
test('recent damage makes a bot flee toward cover even after losing sight of the attacker',()=>{const {p,world,brain}=setup();world.players=[p];brain.hurt=1.8;brain.threat={x:p.x,y:p.y,z:p.z-6};thinkBot(p,brain,world,nav);assert.equal(brain.state,'RETREAT');assert.ok(brain.goal);assert.ok(Math.hypot(brain.goal!.x-brain.threat!.x,brain.goal!.z-brain.threat!.z)>5);});
test('bots never select unowned launchers or fire rockets at unsafe close range',()=>{const {p,enemy,world,brain}=setup();let i=thinkBot(p,brain,world,nav);assert.equal(i.weapon,1);Object.assign(p,{hasLauncher:true,ammo:6,launcherLoaded:1});enemy.z=16;i=thinkBot(p,brain,world,nav);assert.notEqual(i.weapon,2);});
test('nearby weapon pickup can take priority over a distant opponent',()=>{const {p,enemy,world,brain}=setup();enemy.x=-8;enemy.z=18;p.yaw=-Math.PI/2;thinkBot(p,brain,world,nav);assert.equal(brain.state,'SEEK_WEAPON');});




test('travel facing follows the next path waypoint while combat keeps aiming at the enemy',()=>{
 const {p,world,brain}=setup();world.players=[p];p.hasCarbine=true;p.carbineAmmo=30;p.hasLauncher=true;p.ammo=30;world.carbine.cooldown=10;world.launcher.cooldown=10;
 brain.state='PATROL';brain.patrol=6;brain.repath=2;brain.goal={x:p.x,y:p.y,z:p.z+4};brain.path=[{x:p.x+3,y:p.y,z:p.z}];p.yaw=0;
 const travel=thinkBot(p,brain,world,nav);assert.ok(travel.yaw>.3,'Look along the right-hand route, not straight at the final goal');
 const fight=setup();fight.enemy.x=fight.p.x;fight.enemy.z=fight.p.z-6;fight.p.yaw=Math.PI;
 const input=thinkBot(fight.p,fight.brain,fight.world,nav);assert.ok(Math.cos(input.yaw)<-.9,'Keep facing the opponent while the path can strafe');
});


test('bots seek available ammo packs when low on owned ammunition',()=>{
 const {p,world,brain}=setup();world.players=[p];Object.assign(p,{x:15,y:3.5,z:1,hasCarbine:true,carbineAmmo:3});
 thinkBot(p,brain,world,nav);assert.equal(brain.state,'SEEK_AMMO');assert.equal(brain.goal?.x,17);assert.equal(brain.goal?.y,3.5);
 world.pickups[reactor.pickups.findIndex(a=>a.type==='ammo'&&a.x===17)]=10;
 thinkBot(p,brain,world,nav);assert.notEqual(brain.state,'SEEK_AMMO');
});
