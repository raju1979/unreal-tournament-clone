import {Engine,WebGPUEngine,Scene,FreeCamera,Vector3,Color3,Color4,HemisphericLight,PointLight,MeshBuilder,StandardMaterial,DefaultRenderingPipeline,TransformNode,SceneLoader,Matrix,type AbstractEngine,type Mesh} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {arenas,type Arena} from '../shared/maps';
import {move,emptyInput,type Player,type Input} from '../shared/game';
import './style.css';
import {weaponExtension} from '../shared/weapon';
import {CombatEffects} from './combat-effects';
import {weaponStats} from '../shared/weapons';
import {VillageEnvironment} from './village-environment';
import {OutpostEnvironment} from './outpost-environment';
import {CanyonEnvironment} from './canyon-environment';
import {FortressEnvironment} from './fortress-environment';
import {FoundryEnvironment} from './foundry-environment';
import {BotAvatar} from './bot-avatar';
const $=(id:string)=>document.getElementById(id)!;
const canvas=$('game') as HTMLCanvasElement;
let engine:AbstractEngine;let renderer='WebGL';
try{if(!await WebGPUEngine.IsSupportedAsync)throw Error('Unavailable');const gpu=new WebGPUEngine(canvas);await gpu.initAsync();engine=gpu;renderer='WebGPU';}catch{engine=new Engine(canvas,true);}
const scene=new Scene(engine);scene.clearColor=new Color4(.025,.045,.07,1);scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.009;scene.fogColor=new Color3(.025,.045,.07);
const camera=new FreeCamera('eyes',new Vector3(30,25,-30),scene);camera.minZ=.05;camera.maxZ=150;camera.fov=1.35;camera.setTarget(new Vector3(0,2,0));camera.inputs.clear();
const ambient=new HemisphericLight('ambient',new Vector3(.2,1,.1),scene);ambient.intensity=.75;ambient.groundColor=new Color3(.15,.2,.28);
const combatEffects=new CombatEffects(scene);
const pipeline=new DefaultRenderingPipeline('finish',true,scene,[camera]);pipeline.fxaaEnabled=true;pipeline.bloomEnabled=true;pipeline.bloomThreshold=.7;pipeline.bloomWeight=.32;pipeline.bloomKernel=48;
function material(name:string,color:string,glow=false){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(.22,.26,.3);if(glow)m.emissiveColor=m.diffuseColor;return m;}
const mats={wall:material('Bulkhead steel','#263c4c'),floor:material('Deck plating','#364b59'),pillar:material('Buttress','#182c3b'),crate:material('Supply crate','#a05d32'),stair:material('Stair tread','#51636a'),reactor:material('Core foundation','#172e3c')};
const botArmor=material('Bot armor','#586a83');
const cyan=material('Ion cyan','#38f4d2',true),orange=material('Warning amber','#ff9646',true),dark=material('Weapon charcoal','#14212c'),white=material('Armor','#9fbac8');
function cube(name:string,pos:number[],size:number[],mat:StandardMaterial){const m=MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);m.position.set(...pos as [number,number,number]);m.material=mat;return m;}
const reactorMap=arenas.reactor;
const reactorVisual=new TransformNode('Reactor arena visuals',scene);
const reactorMeshes=new Set(scene.meshes),reactorLights=new Set(scene.lights);
for(const b of reactorMap.boxes){const m=cube(b.name,[b.x,b.y,b.z],[b.w,b.h,b.d],mats[b.kind as keyof typeof mats]??mats.wall);m.isPickable=false;
 if(b.kind==='crate'){for(const x of [-1,1])cube('Crate band',[b.x+x*b.w*.32,b.y,b.z],[.09,b.h+.025,b.d+.025],dark);}
}
for(const x of [-22.8,22.8])for(let z=-20;z<=20;z+=5){cube('Wall rib',[x,4,z],[.3,8,.3],dark);cube('Guide light',[x,2,z],[.12,.08,2.5],cyan);}
for(const z of [-22.8,22.8])for(let x=-20;x<=20;x+=5){cube('Wall rib',[x,4,z],[.3,8,.3],dark);cube('Warning strip',[x,5,z],[2,.1,.1],orange);}
for(let x=-22;x<=22;x+=4)cube('Deck seam',[x,.012,0],[.025,.015,46],dark);
for(let z=-22;z<=22;z+=4)cube('Deck seam',[0,.013,z],[46,.015,.025],dark);
for(const x of [-17,17])for(const z of [-12,12]){const l=new PointLight('Gallery lamp',new Vector3(x,6,z),scene);l.diffuse=Color3.FromHexString('#76b9d7');l.intensity=1.4;l.range=12;}
const coreLight=new PointLight('Core light',new Vector3(0,4,0),scene);coreLight.diffuse=new Color3(0,1,.7);coreLight.intensity=4;coreLight.range=20;
const core=MeshBuilder.CreateCylinder('Energy core',{height:5,diameter:1.6,tessellation:12},scene);core.position.y=3.7;core.material=cyan;
for(const y of [1.4,3,5.8]){const ring=MeshBuilder.CreateTorus('Containment ring',{diameter:4,thickness:.25,tessellation:16},scene);ring.position.y=y;ring.material=dark;}
// Blender-authored assemblies add scenery while collision remains server-authoritative.
for(const m of scene.meshes)if(!reactorMeshes.has(m))m.parent=reactorVisual;
for(const l of scene.lights)if(!reactorLights.has(l))l.parent=reactorVisual;
reactorVisual.setEnabled(false);
SceneLoader.ImportMeshAsync('', '/assets/','reactor.glb',scene).then(result=>{const root=result.meshes.find(m=>m.name==='__root__');if(root)root.parent=reactorVisual;}).catch(()=>console.info('Using built-in reactor visuals'));
let map:Arena=arenas.village;
const villageVisual=new TransformNode('Village scenery',scene);
const villageEnvironment=new VillageEnvironment(scene,villageVisual);
// The authored map coordinates are already in game space; cancel glTF's X reflection.
const villageModel=new TransformNode('Village coordinate alignment',scene);villageModel.parent=villageVisual;villageModel.scaling.x=-1;
SceneLoader.LoadAssetContainerAsync('/assets/village/','village-arena.glb',scene).then(asset=>{const instance=asset.instantiateModelsToScene(name=>'village-'+name,false);for(const root of instance.rootNodes)root.parent=villageModel;villageEnvironment.attachMeshes(villageModel.getChildMeshes());}).catch(()=>feed('Village scenery could not load. Run npm run build and refresh.'));
const outpostVisual=new TransformNode('Outpost scenery',scene);outpostVisual.setEnabled(false);
const outpostEnvironment=new OutpostEnvironment(scene,outpostVisual);
const outpostModel=new TransformNode('Outpost coordinate alignment',scene);outpostModel.parent=outpostVisual;outpostModel.scaling.x=-1;
SceneLoader.LoadAssetContainerAsync('/assets/outpost/','outpost-arena.glb',scene).then(asset=>{const instance=asset.instantiateModelsToScene(name=>'outpost-'+name,false);for(const root of instance.rootNodes)root.parent=outpostModel;outpostEnvironment.attachMeshes(scene,outpostModel.getChildMeshes());}).catch(()=>feed('Outpost scenery could not load. Run npm run build and refresh.'));
const canyonVisual=new TransformNode('Sunspire scenery',scene);canyonVisual.setEnabled(false);
const canyonEnvironment=new CanyonEnvironment(scene,canyonVisual);
const canyonModel=new TransformNode('Sunspire coordinate alignment',scene);canyonModel.parent=canyonVisual;canyonModel.scaling.x=-1;
SceneLoader.LoadAssetContainerAsync('/assets/canyon/','sunspire-arena.glb',scene).then(asset=>{const instance=asset.instantiateModelsToScene(name=>'canyon-'+name,false);for(const root of instance.rootNodes)root.parent=canyonModel;canyonEnvironment.attachMeshes(canyonModel.getChildMeshes());}).catch(()=>feed('Sunspire scenery could not load. Run npm run build and refresh.'));
const fortressEnvironment=new FortressEnvironment(scene);
const foundryEnvironment=new FoundryEnvironment(scene);
let pickupMeshes:Mesh[]=[];
function makePickupMeshes(){
 for(const p of pickupMeshes)p.dispose();
 pickupMeshes=map.pickups.map((p,n)=>{
  const m=p.type==='ammo'?MeshBuilder.CreateBox('Ammo pack '+n,{width:.65,height:.35,depth:.42},scene):MeshBuilder.CreatePolyhedron('Health pickup '+n,{type:1,size:.45},scene);
  m.position.set(p.x,p.y+.65,p.z);m.material=p.type==='health'?cyan:dark;
  if(p.type==='ammo'){
   for(const x of [-.20,0,.20]){const round=MeshBuilder.CreateCylinder('Ammo pack cartridge',{height:.43,diameter:.105,tessellation:6},scene);round.parent=m;round.position.set(x,.12,0);round.material=orange;}
   const band=MeshBuilder.CreateBox('Ammo pack amber band',{width:.67,height:.07,depth:.44},scene);band.parent=m;band.material=orange;
  }
  if(p.type==='ammo')m.setEnabled(false);
  return m;
 });
}
function setArena(name:string){map=arenas[name]??arenas.village;fortressEnvironment.setEnabled(map.id==='fortress');foundryEnvironment.setEnabled(map.id==='foundry');reactorVisual.setEnabled(map.id==='reactor');villageVisual.setEnabled(map.id==='village');outpostVisual.setEnabled(map.id==='outpost');outpostEnvironment.setEnabled(map.id==='outpost');const outdoors=map.id==='village';const cold=map.id==='outpost',desert=map.id==='canyon';canyonVisual.setEnabled(desert);canyonEnvironment.setEnabled(desert);villageEnvironment.setEnabled(outdoors);scene.clearColor=outdoors?new Color4(.63,.84,.90,1):cold?new Color4(.67,.78,.85,1):desert?new Color4(.73,.79,.79,1):new Color4(.025,.045,.07,1);scene.fogColor=outdoors?new Color3(.63,.84,.90):cold?new Color3(.67,.78,.85):desert?new Color3(.73,.79,.79):new Color3(.025,.045,.07);scene.fogDensity=outdoors?.0035:cold?.0025:desert?.0018:.009;ambient.intensity=outdoors?.85:cold?.65:desert?.72:.75;ambient.diffuse=outdoors?new Color3(.92,.97,1):Color3.White();ambient.groundColor=outdoors?new Color3(.37,.40,.27):cold?new Color3(.48,.57,.63):desert?new Color3(.42,.36,.24):new Color3(.15,.2,.28);camera.maxZ=desert?500:outdoors||cold?340:150;pipeline.bloomWeight=outdoors?.13:cold?.10:desert?.09:.32;pipeline.bloomThreshold=outdoors||cold||desert?1.1:.7;makePickupMeshes();$('arena-name').textContent=map.name;}
const arenaSelect=$('map') as HTMLSelectElement;arenaSelect.onchange=()=>setArena(arenaSelect.value);setArena(arenaSelect.value);
const gunRoot=new TransformNode('View weapon',scene);gunRoot.parent=camera;gunRoot.position.set(.32,-.29,.65);gunRoot.setEnabled(false);
const basicWeapon=new TransformNode('Basic view weapons',scene);basicWeapon.parent=gunRoot;
const launcherView=new TransformNode('Launcher view',scene);launcherView.parent=gunRoot;
const launcherRemotes=new Map<string,TransformNode>();
const launcherAsset=SceneLoader.LoadAssetContainerAsync('/assets/weapons/','rocket-launcher.glb',scene);
const projectileAsset=SceneLoader.LoadAssetContainerAsync('/assets/weapons/','rocket.glb',scene);
function attachLauncher(parent:TransformNode,scale:number,held=false){return launcherAsset.then(asset=>{if(parent.isDisposed())return;const instance=asset.instantiateModelsToScene(name=>'launcher-'+name,false);const orient=new TransformNode('Launcher orientation',scene);orient.parent=parent;orient.rotation.y=-Math.PI/2;orient.scaling.setAll(scale);for(const root of instance.rootNodes)root.parent=orient;if(held)alignWeaponGrip(parent,orient,'RL01_GRIP_SOCKET');return orient;});}
const launcherPickup=new TransformNode('Launcher pickup',scene);launcherPickup.setEnabled(false);let launcherAvailable=false,launcherBaseY=0;attachLauncher(launcherPickup,.7).catch(()=>{});const launcherHalo=MeshBuilder.CreateTorus('Launcher pickup halo',{diameter:1.7,thickness:.04,tessellation:32},scene);launcherHalo.parent=launcherPickup;launcherHalo.material=orange;launcherHalo.position.y=-.48;
attachLauncher(launcherView,.6).catch(()=>feed('Launcher model could not load. Refresh to retry.'));
const carbineView=new TransformNode('Carbine view',scene);carbineView.parent=gunRoot;
const carbinePickup=new TransformNode('Carbine pickup',scene);carbinePickup.setEnabled(false);
const carbineRemoteTemplates=new Map<string,TransformNode>();
const carbineAsset=SceneLoader.LoadAssetContainerAsync('/assets/weapons/','pulse-carbine.glb',scene);
function attachCarbine(parent:TransformNode,scale:number,held=false){return carbineAsset.then(asset=>{if(parent.isDisposed())return;const instance=asset.instantiateModelsToScene(name=>'carbine-'+name,false);const orient=new TransformNode('Carbine orientation',scene);orient.parent=parent;orient.rotation.y=-Math.PI/2;orient.scaling.setAll(scale);for(const root of instance.rootNodes)root.parent=orient;if(held)alignWeaponGrip(parent,orient,'PC01_GRIP_SOCKET');return orient;});}
function alignWeaponGrip(parent:TransformNode,orient:TransformNode,name:string){const grip=orient.getDescendants().find(n=>n.name.includes(name)) as TransformNode|undefined;if(!grip)return;grip.computeWorldMatrix(true);const offset=Vector3.TransformCoordinates(grip.getAbsolutePosition(),Matrix.Invert(parent.computeWorldMatrix(true)));orient.position.subtractInPlace(offset);}
attachCarbine(carbineView,.65).catch(()=>feed('Carbine model could not load. Refresh to retry.'));
attachCarbine(carbinePickup,.85).catch(()=>{});
const pickupHalo=MeshBuilder.CreateTorus('Carbine pickup halo',{diameter:1.4,thickness:.035,tessellation:32},scene);pickupHalo.material=cyan;pickupHalo.parent=carbinePickup;pickupHalo.position.y=-.5;
let pickupAvailable=false,pickupBaseY=0;
const gun=cube('Pulse rifle',[0,0,0],[.18,.18,.65],dark);gun.parent=basicWeapon;gun.position.set(0,0,0);
const barrel=cube('Barrel',[0,0,0],[.09,.09,.4],white);barrel.parent=basicWeapon;barrel.position.set(0,.015,.4);
const rail=cube('Energy rail',[0,0,0],[.035,.04,.45],cyan);rail.parent=basicWeapon;rail.position.set(0,.11,.03);
const basicMuzzle=new TransformNode('Pulse muzzle socket',scene);basicMuzzle.parent=basicWeapon;basicMuzzle.position.set(0,.015,.61);
const carbineMuzzle=new TransformNode('Carbine muzzle fallback',scene);carbineMuzzle.parent=carbineView;carbineMuzzle.position.set(0,.049,.437);
let modelMuzzle:TransformNode|undefined;
carbineAsset.then(()=>{modelMuzzle=carbineView.getDescendants().find(n=>n.name.includes('PC01_MUZZLE')) as TransformNode|undefined;}).catch(()=>{});
const rocketLaunches=new Map<string,{from:Vector3,time:number}>();
function shotSocket(owner:string,kind:number){if(owner===id){if(!gunRoot.isEnabled())return undefined;if(kind===2)return (launcherView.getDescendants().find(n=>n.name.includes('RL01_MUZZLE')) as TransformNode|undefined)??basicMuzzle;return kind===3?(modelMuzzle??carbineMuzzle):basicMuzzle;}const remote=remotes.get(owner);if(!remote)return undefined;if(kind===2){const socket=launcherRemotes.get(owner)?.getDescendants().find(n=>n.name.includes('RL01_MUZZLE'));if(socket)return socket as TransformNode;}const carbine=carbineRemoteTemplates.get(owner);if(kind===3&&carbine){const socket=carbine.getDescendants().find(n=>n.name.includes('PC01_MUZZLE'));if(socket)return socket as TransformNode;}return remoteBasicWeapons.get(owner)?.getChildren().find(n=>n.name==='Remote muzzle') as TransformNode|undefined;}
const keys=new Set<string>();let firing=false,joined=false,id='',me:Player|undefined,socket:WebSocket|undefined,seq=0,weapon=1,pending:{i:Input,dt:number}[]=[],players:Player[]=[],time=600,netCooldown=0;
let extension=1,recoil=0,shake=0,reloadRequested=false;
let yaw=0,pitch=0,lastHp=100,audio:AudioContext|undefined;
const remotes=new Map<string,TransformNode>(),rocketMeshes=new Map<string,TransformNode>();
const botModelAsset=SceneLoader.LoadAssetContainerAsync('/assets/bots/','red-warden.glb',scene);
const botAvatars=new Map<string,BotAvatar>();
const remoteWeaponDocks=new Map<string,TransformNode>(),remoteBasicWeapons=new Map<string,TransformNode>();
function tone(freq:number,duration=.08){try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='sawtooth';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq/3,audio.currentTime+duration);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration);}catch{}}
function remote(p:Player){
 const root=new TransformNode(p.id,scene);root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;let dock:TransformNode;
 if(p.bot){const avatar=new BotAvatar(scene,root,p,botModelAsset);botAvatars.set(p.id,avatar);dock=avatar.weaponDock;}
 else{const body=MeshBuilder.CreateCapsule('Armored ranger',{height:1.6,radius:.34,tessellation:8},scene);body.material=white;body.parent=root;body.position.y=.8;const visor=cube('Visor',[0,1.35,.29],[.42,.15,.15],orange);visor.parent=root;dock=new TransformNode('Remote player weapon grip',scene);dock.parent=root;dock.position.set(.24,1.0,.20);}
 remoteWeaponDocks.set(p.id,dock);
 const basic=new TransformNode('Remote pulse rifle',scene);basic.parent=dock;remoteBasicWeapons.set(p.id,basic);
 for(const [name,position,size,mat] of [['Remote rifle body',[0,.06,.16],[.15,.15,.43],dark],['Remote rifle barrel',[0,.07,.43],[.07,.07,.25],white],['Remote rifle grip',[0,-.065,0],[.08,.18,.09],dark],['Remote rifle rail',[0,.145,.22],[.025,.025,.36],cyan]] as const){const mesh=cube(name,[...position],[...size],mat);mesh.parent=basic;}
 const muzzle=new TransformNode('Remote muzzle',scene);muzzle.parent=basic;muzzle.position.set(0,.07,.57);
 remotes.set(p.id,root);return root;
}
function feed(text:string){$('feed').textContent=text;setTimeout(()=>{if($('feed').textContent===text)$('feed').textContent='';},4500);}

const button=$('join') as HTMLButtonElement;button.disabled=false;button.textContent='ENTER ARENA';$('message').textContent=`${renderer} ready · 4 players per room · First to 20 / 10 minutes`;
button.onclick=()=>{if(joined){canvas.requestPointerLock();$('menu').style.display='none';return;}button.disabled=true;button.textContent='CONNECTING…';socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
 socket.onopen=()=>socket!.send(JSON.stringify({type:'join',name:($('name') as HTMLInputElement).value,room:($('room') as HTMLInputElement).value,bots:($('bots') as HTMLInputElement).checked,map:arenaSelect.value}));
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='welcome'){id=m.id;if(m.map){setArena(m.map);arenaSelect.value=m.map;}arenaSelect.disabled=true;yaw=m.yaw??0;pitch=0;joined=true;pending=[];$('menu').style.display='none';canvas.requestPointerLock();tone(400);}
 if(m.type==='launcher'){weapon=2;feed(m.text);tone(480,.15);}
 if(m.type==='carbine'){weapon=3;feed(m.text);tone(650,.15);}
 if(m.type==='ammo')feed(m.text);
 if(m.type==='state'){if(m.launcher){launcherAvailable=m.launcher.cooldown===0;launcherBaseY=m.launcher.y+.95;launcherPickup.position.set(m.launcher.x,launcherBaseY,m.launcher.z);launcherPickup.setEnabled(launcherAvailable);}if(m.carbine){pickupAvailable=m.carbine.cooldown===0;pickupBaseY=m.carbine.y+.95;carbinePickup.position.set(m.carbine.x,pickupBaseY,m.carbine.z);carbinePickup.setEnabled(pickupAvailable);}players=m.players;time=m.time;const authoritative=players.find(p=>p.id===id);if(authoritative){pending=pending.filter(p=>p.i.seq>authoritative.seq);if(!me||(lastHp<=0&&authoritative.hp>0)){yaw=authoritative.yaw;pitch=0;weapon=authoritative.weapon;}me={...authoritative};for(const p of pending)move(me,p.i,p.dt,map);if(me.hp<lastHp){document.body.classList.add('damage');setTimeout(()=>document.body.classList.remove('damage'),160);}lastHp=me.hp;}
 pickupMeshes.forEach((p,n)=>p.setEnabled(m.pickups[n]===0));
 const alive=new Set<string>();for(const p of players)if(p.id!==id){alive.add(p.id);const r=remotes.get(p.id)??remote(p);r.metadata=p;r.setEnabled(p.hp>0);if(p.bot)botAvatars.get(p.id)?.push(p,performance.now());let model=carbineRemoteTemplates.get(p.id);if(!model){model=new TransformNode('Remote carbine',scene);model.parent=remoteWeaponDocks.get(p.id)??r;carbineRemoteTemplates.set(p.id,model);attachCarbine(model,.54,true).catch(()=>{});}model.setEnabled(p.weapon===3);let launcher=launcherRemotes.get(p.id);if(!launcher){launcher=new TransformNode('Remote launcher',scene);launcher.parent=remoteWeaponDocks.get(p.id)??r;launcherRemotes.set(p.id,launcher);attachLauncher(launcher,.52,true).catch(()=>{});}launcher.setEnabled(p.weapon===2);remoteBasicWeapons.get(p.id)?.setEnabled(p.weapon===1);}for(const [key,r]of remotes)if(!alive.has(key)){botAvatars.get(key)?.dispose();r.dispose(false,false);remotes.delete(key);carbineRemoteTemplates.delete(key);launcherRemotes.delete(key);botAvatars.delete(key);remoteBasicWeapons.delete(key);remoteWeaponDocks.delete(key);}
 const rockets=new Set<string>();for(const r of m.rockets){rockets.add(r.id);let mesh=rocketMeshes.get(r.id);if(!mesh){mesh=new TransformNode('Rocket projectile',scene);rocketMeshes.set(r.id,mesh);const projectile=mesh;projectileAsset.then(asset=>{if(projectile.isDisposed())return;const instance=asset.instantiateModelsToScene(name=>'rocket-'+name,false);const orient=new TransformNode('Rocket orientation',scene);orient.parent=projectile;orient.rotation.y=-Math.PI/2;for(const node of instance.rootNodes)node.parent=orient;const exhaust=MeshBuilder.CreateSphere('Rocket exhaust flame',{diameter:.08,segments:6},scene);exhaust.parent=projectile;exhaust.position.z=-.27;exhaust.scaling.z=4;exhaust.material=orange;}).catch(()=>feed('Rocket model could not load. Refresh to retry.'));}const launch=rocketLaunches.get(r.id);const actual=new Vector3(r.x,r.y,r.z);if(launch){const t=Math.min(1,(performance.now()-launch.time)/150);mesh.position.copyFrom(Vector3.Lerp(launch.from,actual,t));if(t===1)rocketLaunches.delete(r.id);}else mesh.position.copyFrom(actual);mesh.lookAt(mesh.position.add(new Vector3(r.dx,r.dy,r.dz)));}for(const [key,r]of rocketMeshes)if(!rockets.has(key)){r.dispose();rocketMeshes.delete(key);rocketLaunches.delete(key);}}
 if(m.type==='launch'){const socket=shotSocket(m.owner,2);if(socket){combatEffects.flash(socket,2);socket.computeWorldMatrix(true);rocketLaunches.set(m.id,{from:socket.getAbsolutePosition().clone(),time:performance.now()});}botAvatars.get(m.owner)?.fire();if(m.owner===id){recoil=.10;tone(90,.12);}}
 if(m.type==='shot'){const socket=shotSocket(m.owner,m.weapon);let from=Vector3.FromArray(m.from);if(socket){socket.computeWorldMatrix(true);from=socket.getAbsolutePosition().clone();combatEffects.flash(socket,m.weapon);}combatEffects.shot(from,Vector3.FromArray(m.to),m.weapon,m.impact??true,m.hit);botAvatars.get(m.owner)?.fire();if(m.owner===id){tone(m.weapon===3?360:240);recoil=.07;if(m.hit){$('cross').style.color='#ff984b';setTimeout(()=>$('cross').style.color='',130);}}}
 if(m.type==='explosion'){const at=Vector3.FromArray(m.at);combatEffects.explosion(at);shake=Math.max(shake,.025*Math.max(0,1-Vector3.Distance(camera.position,at)/15));tone(60,.2);}
 if(m.type==='kill')feed(m.text);};
 socket.onclose=e=>{arenaSelect.disabled=false;joined=false;me=undefined;pending=[];document.exitPointerLock();$('menu').style.display='flex';button.disabled=false;button.textContent='RECONNECT';$('message').textContent=e.reason||'Disconnected. Click reconnect to join again.';};socket.onerror=()=>$('message').textContent='Connection failed. Is the server running?';};
document.addEventListener('keydown',e=>{if(['Space','Tab'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR'&&!e.repeat)reloadRequested=true;if(e.code==='Digit1')weapon=1;if(e.code==='Digit2'){if(me?.hasLauncher)weapon=2;else feed('Find the orange RL-01 launcher pickup to unlock weapon 2.');}if(e.code==='Digit3'){if(me?.hasCarbine)weapon=3;else feed('Find the glowing PC-01 carbine pickup to unlock weapon 3.');}});document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();firing=false;});
document.addEventListener('pointerlockchange',()=>{keys.clear();firing=false;if(joined){$('menu').style.display=document.pointerLockElement===canvas?'none':'flex';button.disabled=false;button.textContent='RESUME MATCH';}});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){yaw+=e.movementX*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch+e.movementY*.0022));}});
canvas.onmousedown=e=>{if(e.button===0&&document.pointerLockElement===canvas)firing=true;};document.addEventListener('mouseup',()=>firing=false);canvas.oncontextmenu=e=>e.preventDefault();
let accumulator=0;
engine.runRenderLoop(()=>{const dt=Math.min(engine.getDeltaTime()/1000,.05),locked=document.pointerLockElement===canvas;
 if(joined&&socket?.readyState===WebSocket.OPEN){accumulator+=dt;while(accumulator>=1/60){const i={...emptyInput(),f:locked?Number(keys.has('KeyW'))-Number(keys.has('KeyS')):0,s:locked?Number(keys.has('KeyD'))-Number(keys.has('KeyA')):0,yaw,pitch,jump:locked&&keys.has('Space'),reload:reloadRequested,fire:locked&&firing,weapon,seq:++seq};reloadRequested=false;socket.send(JSON.stringify({type:'input',...i}));if(me){move(me,i,1/60,map);pending.push({i,dt:1/60});if(pending.length>120)pending.shift();}accumulator-=1/60;}
 if(me){camera.position.set(me.x,me.y+1.45,me.z);camera.rotation.set(pitch,yaw,0);gunRoot.setEnabled(me.hp>0);$('stats').textContent=me.hp>0?`${me.hp} HEALTH   /   ${weapon===1?'PULSE ∞':weapon===2?'ROCKETS '+me.launcherLoaded+' / '+Math.max(0,me.ammo-me.launcherLoaded):'PC-01 '+me.carbineClip+' / '+Math.max(0,me.carbineAmmo-me.carbineClip)}`:`RESPAWNING ${Math.max(1,Math.ceil(me.respawn))}…`;}
 if(me&&me.hp>0&&me.reloadLeft>0&&me.reloadWeapon===weapon)$('stats').textContent+='   RELOADING '+me.reloadLeft.toFixed(1)+'s';
 if(me&&me.hp>0&&me.spawnShield>0)$('stats').textContent+='   SPAWN SHIELD '+me.spawnShield.toFixed(1)+'s';
 }else if(!joined){netCooldown+=dt;if(map.id==='village'){camera.position.set(8+Math.sin(netCooldown*.025)*1.5,5,-22);camera.setTarget(new Vector3(0,3,16));}else if(map.id==='foundry'){camera.position.set(27,7.5,-23);camera.setTarget(new Vector3(0,5,2));}else if(map.id==='fortress'){camera.position.set(15,5,-22);camera.setTarget(new Vector3(0,6,4));}else if(map.id==='canyon'){camera.position.set(88*Math.sin(.7+netCooldown*.018),65,105*Math.cos(.7+netCooldown*.018));camera.setTarget(new Vector3(0,5,0));}else if(map.id==='outpost'){camera.position.set(32*Math.sin(.7+netCooldown*.025),35,45*Math.cos(.7+netCooldown*.025));camera.setTarget(new Vector3(0,14,0));}else{camera.position.set(Math.sin(netCooldown*.06)*32,24,Math.cos(netCooldown*.06)*32);camera.setTarget(new Vector3(0,1,0));}}
 for(const r of remotes.values()){const p=r.metadata as Player,avatar=botAvatars.get(p.id);if(avatar){avatar.update(performance.now());continue;}const v=new Vector3(p.x,p.y,p.z);r.position=Vector3.Lerp(r.position,v,Math.min(1,dt*15));r.rotation.y=p.yaw;}
 if(launcherAvailable){launcherPickup.rotation.y+=dt*.65;launcherPickup.position.y=launcherBaseY+Math.sin(performance.now()*.002)*.1;}
 basicWeapon.setEnabled(weapon===1);launcherView.setEnabled(weapon===2);carbineView.setEnabled(weapon===3);if(pickupAvailable){carbinePickup.rotation.y+=dt*.8;carbinePickup.position.y=pickupBaseY+Math.sin(performance.now()*.002)*.1;}
 for(const m of pickupMeshes)m.rotation.y+=dt;core.rotation.y+=dt*.3;const allowed=me?weaponExtension([me.x,me.y+1.45,me.z],yaw,pitch,map,weapon):1;extension=allowed<extension?allowed:Math.min(allowed,extension+dt*2.5);recoil*=Math.exp(-dt*15);gunRoot.scaling.setAll(extension);gunRoot.position.set(.32*extension,-.29*extension,(.65-recoil-(me&&me.reloadLeft>0&&me.reloadWeapon===weapon?.10*Math.sin(Math.PI*(1-me.reloadLeft/weaponStats[weapon].reload)):0))*extension);gunRoot.setEnabled(joined&&!!me&&me.hp>0&&extension>.12);rail.material=weapon===1?cyan:orange;
 $('status').textContent=`${renderer} / ${players.length}/4 PLAYERS (${players.filter(p=>p.bot).length} BOTS) / ${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
 $('board').style.display=keys.has('Tab')?'block':'none';if(keys.has('Tab')){const board=$('board');board.replaceChildren();const title=document.createElement('h2');title.textContent=map.name.toUpperCase()+' / SCOREBOARD';board.append(title);for(const p of [...players].sort((a,b)=>b.kills-a.kills)){const row=document.createElement('p');const name=document.createElement('span');name.textContent=p.bot?p.name+' [BOT · '+(p.botState??'PATROL')+']':p.name;const score=document.createElement('span');score.textContent=`${p.kills} K / ${p.deaths} D`;row.append(name,score);board.append(row);}}
 if(joined){shake*=Math.exp(-dt*10);camera.rotation.x+=Math.sin(performance.now()*.08)*shake;camera.rotation.y+=Math.cos(performance.now()*.07)*shake*.5;}villageEnvironment.update(dt);combatEffects.update(dt);scene.render();});
window.addEventListener('resize',()=>engine.resize());
