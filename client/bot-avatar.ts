import {Scene,TransformNode,Vector3,Quaternion,Axis,type AssetContainer,type Animation,type AnimationGroup,type Skeleton} from '@babylonjs/core';
import type {Player} from '../shared/game';
import {advanceStride,angleDelta,gaitDirection} from '../shared/bot-motion';
type Snapshot={t:number,x:number,y:number,z:number,yaw:number,pitch:number,vy:number,hp:number};
type Property='position'|'rotationQuaternion'|'scaling';
type Track={target:TransformNode,property:Property,animation:Animation};
type Clip={from:number,to:number,tracks:Map<string,Track>};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const blend=(a:Vector3|Quaternion,b:Vector3|Quaternion,w:number)=>a instanceof Quaternion?Quaternion.Slerp(a,b as Quaternion,w):Vector3.Lerp(a,b as Vector3,w);

/** Snapshot interpolation and a distance-driven, eight-direction armed gait. */
export class BotAvatar {
 readonly weaponDock:TransformNode;
 readonly ready:Promise<void>;
 private readonly grip:TransformNode;
 private readonly model:TransformNode;
 private snapshots:Snapshot[]=[];
 private clips=new Map<string,Clip>();
 private bindings=new Map<string,Track>();
 private groups:AnimationGroup[]=[];
 private skeletons:Skeleton[]=[];
 private spine?:TransformNode;
 private phase=0;
 private walkWeight=0;
 private jumpWeight=0;
 private airborne=false;
 private descending=false;
 private recoil=0;
 private direction=gaitDirection(0,1,0);
 private lastRender=0;
 private disposed=false;
 constructor(private scene:Scene,readonly root:TransformNode,p:Player,asset:Promise<AssetContainer>){
  root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;
  this.model=new TransformNode('Red Warden armed model',scene);this.model.parent=root;this.model.scaling.setAll(.85);
  this.grip=new TransformNode('Bot animated right-hand grip',scene);this.grip.parent=root;this.grip.position.set(.20,1.16,.18);
  this.weaponDock=new TransformNode('Bot held weapon',scene);this.weaponDock.parent=this.grip;
  this.push(p,performance.now());
  this.ready=asset.then(container=>{
   if(this.disposed||root.isDisposed())return;
   const instance=container.instantiateModelsToScene(n=>'warden-'+n,false);
   for(const n of instance.rootNodes)n.parent=this.model;
   this.groups=instance.animationGroups;this.skeletons=instance.skeletons;
   for(const g of this.groups){
    g.stop();const tracks=new Map<string,Track>();
    for(const t of g.targetedAnimations){const property=t.animation.targetProperty as Property;if(!['position','rotationQuaternion','scaling'].includes(property))continue;const track={target:t.target as TransformNode,property,animation:t.animation},key=track.target.uniqueId+':'+property;tracks.set(key,track);this.bindings.set(key,track);}
    this.clips.set(g.name.replace(/^warden-/,'').replace(/^.*\|/,'').replace(/^Warden_/,'').replace(/\.\d+$/,''),{from:g.from,to:g.to,tracks});
   }
   const socket=this.model.getDescendants().find(n=>n.name.startsWith('warden-Warden_WeaponSocket')) as TransformNode|undefined;
   if(!socket)throw Error('Character hand socket missing. Rebuild the avatar assets.');
   this.grip.parent=socket;this.grip.position.setAll(0);this.grip.rotation.setAll(0);
   this.spine=this.model.getDescendants().find(n=>n.name==='warden-spine') as TransformNode|undefined;
   this.applyPose('Idle','Idle',0,0,0,0);
  }).catch(e=>console.warn('Bot presentation:',e));
 }
 push(p:Player,t:number){
  const last=this.snapshots.at(-1);
  if(last&&(Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)>8||(last.hp<=0&&p.hp>0))){this.snapshots=[];this.phase=0;this.walkWeight=0;this.airborne=false;this.descending=false;this.jumpWeight=0;this.root.position.set(p.x,p.y,p.z);}
  const s={t,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,vy:p.vy,hp:p.hp};
  if(last&&Math.abs(t-last.t)<.1)this.snapshots[this.snapshots.length-1]=s;else this.snapshots.push(s);
  if(this.snapshots.length>24)this.snapshots.shift();
 }
 private interpolate(t:number):Snapshot {
  while(this.snapshots.length>2&&this.snapshots[1].t<=t)this.snapshots.shift();
  const a=this.snapshots[0],b=this.snapshots[1]??a,w=a===b?0:Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));
  return {t,x:lerp(a.x,b.x,w),y:lerp(a.y,b.y,w),z:lerp(a.z,b.z,w),yaw:a.yaw+angleDelta(a.yaw,b.yaw)*w,pitch:lerp(a.pitch,b.pitch,w),vy:lerp(a.vy,b.vy,w),hp:b.hp};
 }
 private sample(clip:Clip|undefined,key:string,phase:number,fallback:Track){
  const track=clip?.tracks.get(key)??fallback;
  return track.animation.evaluate(clip?lerp(clip.from,clip.to,phase):0) as Vector3|Quaternion;
 }
 private applyPose(a:string,b:string,directionWeight:number,walkWeight:number,jumpPhase:number,jumpWeight:number){
  const idle=this.clips.get('Idle'),ca=this.clips.get(a),cb=this.clips.get(b),jump=this.clips.get('Jump');
  const idlePhase=(performance.now()%2200)/2200;
  for(const [key,track] of this.bindings){
   const rest=this.sample(idle,key,idlePhase,track),va=this.sample(ca,key,this.phase,track),vb=this.sample(cb,key,this.phase,track);
   let value=blend(rest,blend(va,vb,directionWeight),walkWeight);
   if(jumpWeight>.001)value=blend(value,this.sample(jump,key,jumpPhase,track),jumpWeight);
   // Recoil moves the animated arms and their hand socket together; it never replaces the legs.
   if(this.recoil>.001&&/(upper_arm|forearm|hand)\./.test(track.target.name))value=blend(value,this.sample(this.clips.get('Fire'),key,.5,track),this.recoil);
   if(track.property==='rotationQuaternion')track.target.rotationQuaternion=value as Quaternion;
   else if(track.property==='position')track.target.position=value as Vector3;
   else track.target.scaling=value as Vector3;
  }
 }
 fire(){this.recoil=1;}
 update(now:number){
  if(!this.snapshots.length||this.disposed)return;
  const elapsed=this.lastRender?Math.max(.001,(now-this.lastRender)/1000):1/60,dt=Math.min(.2,elapsed);this.lastRender=now;
  const s=this.interpolate(now-100),dx=s.x-this.root.position.x,dz=s.z-this.root.position.z,distance=Math.hypot(dx,dz);
  this.root.position.set(s.x,s.y,s.z);this.root.rotation.y+=angleDelta(this.root.rotation.y,s.yaw)*(1-Math.exp(-dt*12));
  const speed=distance/elapsed,moving=s.hp>0&&speed>.12;
  // Ground collision alternates vy between 0 and about -0.37. That is not a jump.
  if(!this.airborne&&Math.abs(s.vy)>2){this.airborne=true;this.descending=s.vy<0;}
  if(this.airborne&&s.vy< -1)this.descending=true;
  if(s.hp<=0||(this.airborne&&this.descending&&s.vy>-.8&&s.vy<1)){this.airborne=false;this.descending=false;}
  const airborne=this.airborne;
  if(moving&&!airborne&&distance<4)this.phase=advanceStride(this.phase,distance);
  this.walkWeight=lerp(this.walkWeight,moving?1:0,1-Math.exp(-dt*15));this.jumpWeight=lerp(this.jumpWeight,airborne?1:0,1-Math.exp(-dt*20));
  if(moving)this.direction=gaitDirection(dx,dz,this.root.rotation.y);
  const direction=this.direction,jumpPhase=Math.max(0,Math.min(1,(8-s.vy)/16));
  this.applyPose(direction.a,direction.b,direction.weight,this.walkWeight,jumpPhase,this.jumpWeight);
  if(this.spine?.rotationQuaternion)this.spine.rotationQuaternion=this.spine.rotationQuaternion.multiply(Quaternion.RotationAxis(Axis.X,Math.max(-.65,Math.min(.65,s.pitch))));
  this.recoil*=Math.exp(-dt*17);
  this.root.metadata={...this.root.metadata,visualSpeed:speed,gaitPhase:this.phase,gaitDirection:direction.a,walkWeight:this.walkWeight,jumpWeight:this.jumpWeight};
 }
 dispose(){this.disposed=true;for(const g of this.groups)g.dispose();for(const skeleton of this.skeletons)skeleton.dispose();}
}
