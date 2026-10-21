import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];let core,avatarModule;
 page.on('request',r=>{if(r.url().includes('/@babylonjs_core.js?'))core=r.url();if(r.url().includes('/client/bot-avatar.ts'))avatarModule=r.url()});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.locator('#join:not([disabled])').waitFor({timeout:90000});await page.selectOption('#map','reactor');
 const result=await page.evaluate(async({core,avatarModule})=>{
  const B=await import(core),{BotAvatar}=await import(avatarModule),s=B.EngineStore.LastCreatedScene;
  const asset=await B.SceneLoader.LoadAssetContainerAsync('/assets/bots/','red-warden.glb',s);
  const make=()=>({id:'test',x:0,y:0,z:0,yaw:0,pitch:0,vy:0,hp:100});const results=[];let finalRoot,finalAvatar;
  for(const [name,vx,vz] of [['forward',0,4],['right',4,0],['back',0,-4],['left',-4,0]]){
   const root=new B.TransformNode('Controlled bot '+name,s),p=make(),avatar=new BotAvatar(s,root,p,Promise.resolve(asset));await avatar.ready;const base=performance.now()+100;
   const foot=root.getDescendants().find(n=>n.name==='warden-foot.L'),socket=root.getDescendants().find(n=>n.name==='warden-Warden_WeaponSocket');if(!foot||!socket)throw Error('Missing rig nodes');
   let last,drift=0,plantSamples=0,startPhase;
   for(let n=0;n<=150;n++){
    const time=n/60;if(n%3===0){p.x=vx*time;p.z=vz*time;p.vy=n%6===0?-.3666667:0;avatar.push({...p},base+time*1000);}if(n===70){startPhase=root.metadata.gaitPhase;avatar.fire();}
    avatar.update(base+time*1000);foot.computeWorldMatrix(true);const pos=foot.getAbsolutePosition().clone(),phase=root.metadata.gaitPhase;
    if(n>30&&phase>.04&&phase<.23&&last&&last.phase>.04&&last.phase<.23){drift=Math.max(drift,B.Vector3.Distance(pos,last.pos));plantSamples++;}
    last={pos,phase};
   }
   avatar.push({...p},base+2600);for(let n=0;n<10;n++)avatar.update(base+2700+n*16.667);const movingPhase=root.metadata.gaitPhase;for(let n=10;n<25;n++)avatar.update(base+2700+n*16.667);const stopPhase=root.metadata.gaitPhase;
   const groundJumpWeight=root.metadata.jumpWeight;
   p.y=.5;p.vy=7;avatar.push({...p},base+3200);avatar.update(base+3350);
   p.y=1.4;p.vy=0;avatar.push({...p},base+3400);avatar.update(base+3550);const apexWeight=root.metadata.jumpWeight;
   p.y=.4;p.vy=-4;avatar.push({...p},base+3600);avatar.update(base+3750);
   p.y=0;p.vy=0;avatar.push({...p},base+3800);avatar.update(base+3950);avatar.update(base+4200);const landingWeight=root.metadata.jumpWeight;
   socket.computeWorldMatrix(true);const forward=B.Vector3.TransformNormal(new B.Vector3(0,0,1),socket.getWorldMatrix()).normalize();
   results.push({name,direction:root.metadata.gaitDirection,plantDrift:drift,plantSamples,stoppedPhaseError:Math.abs(stopPhase-movingPhase),socketForward:forward.asArray(),hasHandParent:socket.parent.name.includes('hand.R'),groundJumpWeight,apexWeight,landingWeight});
   if(finalRoot){finalAvatar.dispose();finalRoot.dispose();}finalRoot=root;finalAvatar=avatar;
  }
  // A close view of the same exported character and actual game weapon, away from arena walls.
  s.getTransformNodeByName('Reactor arena visuals').setEnabled(false);s.clearColor=new B.Color4(.055,.075,.10,1);
  const ground=B.MeshBuilder.CreateGround('Bot presentation floor',{width:60,height:60},s),floor=new B.StandardMaterial('Bot presentation floor material',s);floor.diffuseColor=new B.Color3(.14,.19,.23);floor.specularColor=B.Color3.Black();ground.material=floor;s.activeCamera.fov=.70;for(const m of s.meshes)if(m.name.startsWith('Pickup '))m.setEnabled(false);
  const sun=new B.DirectionalLight('Bot presentation sunlight',new B.Vector3(-.4,-1,-.5),s);sun.intensity=1.6;
  const weapon=await B.SceneLoader.LoadAssetContainerAsync('/assets/weapons/','pulse-carbine.glb',s),instance=weapon.instantiateModelsToScene(n=>'preview-'+n,false),orient=new B.TransformNode('Preview held carbine',s);orient.parent=finalAvatar.weaponDock;orient.rotation.y=-Math.PI/2;orient.scaling.setAll(.54);for(const node of instance.rootNodes)node.parent=orient;
  const grip=orient.getDescendants().find(n=>n.name.includes('PC01_GRIP_SOCKET'));grip.computeWorldMatrix(true);orient.position.subtractInPlace(B.Vector3.TransformCoordinates(grip.getAbsolutePosition(),B.Matrix.Invert(finalAvatar.weaponDock.computeWorldMatrix(true))));
  document.getElementById('menu').style.display='none';document.getElementById('hud').style.display='none';s.onBeforeRenderObservable.add(()=>{s.activeCamera.position.copyFrom(finalRoot.position.add(new B.Vector3(2.4,1.6,3)));s.activeCamera.setTarget(finalRoot.position.add(new B.Vector3(0,.95,0)));s.activeCamera.getViewMatrix(true);});
  return results;
 },{core,avatarModule});await page.waitForTimeout(1200);await page.screenshot({path:'3d/characters/red-warden/game-armed-bot.png'});console.log(JSON.stringify(result,null,2));
 assert.deepEqual(errors,[]);assert.ok(result.every(r=>r.plantSamples>10&&r.plantDrift<.01),'Feet stay planted during the stance phase in every direction');assert.ok(result.every(r=>r.stoppedPhaseError<1e-6),'No walking in place after the snapshots settle');assert.ok(result.every(r=>r.hasHandParent));assert.ok(result.every(r=>r.socketForward[2]>.98));assert.ok(result.every(r=>r.groundJumpWeight<.001),'Ground collision jitter must not trigger a jump pose');assert.ok(result.every(r=>r.apexWeight>.95&&r.landingWeight<.01),'A real jump persists through the apex and returns to locomotion on landing');
 console.log('PASS: armed directional rig sampled in browser');
}finally{await browser.close()}
