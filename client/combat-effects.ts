import {Color3,Mesh,MeshBuilder,PointLight,RawTexture,Scene,StandardMaterial,Texture,TransformNode,Vector3} from '@babylonjs/core';
import {ExplosionAnimations} from './explosion-animation';

type Effect={mesh:Mesh,age:number,life:number,update?:(dt:number,age:number)=>void,done?:()=>void};
export class CombatEffects {
 private explosions:ExplosionAnimations;
 private effects:Effect[]=[];
 private cyan:StandardMaterial;
 private amber:StandardMaterial;
 private hot:StandardMaterial;
 private light:PointLight;
 private lightTime=0;
 private fire:StandardMaterial;
 private blastFlash:StandardMaterial;
 private smoke:StandardMaterial;
 private shock:StandardMaterial;
 private blastLight:PointLight;
 private blastTime=0;
 constructor(private scene:Scene){
  this.explosions=new ExplosionAnimations(scene);
  const make=(name:string,color:Color3)=>{const m=new StandardMaterial(name,scene);m.disableLighting=true;m.emissiveColor=color;m.diffuseColor=color;return m;};
  this.cyan=make('FX / ion tracer',new Color3(.12,1,.85));
  this.amber=make('FX / carbine tracer',new Color3(1,.54,.12));
  this.hot=make('FX / hot core',new Color3(1,.93,.64));
  const cloud=(ring=false)=>{const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const nx=(x-size/2)/(size/2),ny=(y-size/2)/(size/2),r=Math.hypot(nx,ny);
   const noise=.08*Math.sin(nx*18+Math.sin(ny*11))+.04*Math.sin(ny*23-nx*7);
   const a=ring?Math.max(0,1-Math.abs(r-.72)/.045):Math.pow(Math.max(0,1-r+noise),1.7)*.85;
   const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.min(255,Math.round(a*255));
  }const texture=RawTexture.CreateRGBATexture(data,size,size,scene,false,false,Texture.BILINEAR_SAMPLINGMODE);texture.hasAlpha=true;return texture;};
  const puff=cloud();this.fire=make('FX / textured fire',new Color3(1,.24,.025));this.smoke=make('FX / textured smoke',new Color3(.10,.12,.14));this.shock=make('FX / blast wave',new Color3(.8,.7,.5));
  this.blastFlash=make('FX / blast flash',new Color3(1,.85,.5));
  for(const m of [this.fire,this.smoke,this.shock,this.blastFlash]){m.diffuseTexture=m===this.shock?cloud(true):puff;m.useAlphaFromDiffuseTexture=true;m.backFaceCulling=false;}
  this.blastLight=new PointLight('FX / explosion light',Vector3.Zero(),scene);this.blastLight.intensity=0;this.blastLight.range=12;this.blastLight.diffuse=new Color3(1,.3,.06);this.blastLight.renderPriority=101;
  this.light=new PointLight('FX / muzzle light',Vector3.Zero(),scene);this.light.intensity=0;this.light.range=4;
  // Static materials otherwise use the first four lights in the scene.
  this.light.renderPriority=100;this.scene.sortLightsByPriority();
 }
 private add(e:Effect){e.mesh.isPickable=false;this.effects.push(e);while(this.effects.length>160)this.effects.shift()!.mesh.dispose();}
 flash(socket:TransformNode,weapon:number){
  const flare=MeshBuilder.CreateSphere('FX muzzle flash',{diameter:1,segments:6},this.scene);
  flare.parent=socket;flare.material=weapon===1?this.cyan:this.amber;
  const scale=weapon===2?.18:.10;flare.scaling.set(scale,scale,scale*3);flare.position.z=.06;
  this.add({mesh:flare,age:0,life:.065,update:(_dt,age)=>flare.scaling.scaleInPlace(Math.max(.2,1-age*4))});
  const core=MeshBuilder.CreateSphere('FX muzzle core',{diameter:.07,segments:4},this.scene);core.parent=socket;core.material=this.hot;
  this.add({mesh:core,age:0,life:.045});
  socket.computeWorldMatrix(true);this.light.position.copyFrom(socket.getAbsolutePosition());this.light.diffuse=weapon===1?new Color3(.15,1,.8):new Color3(1,.5,.1);this.light.intensity=2;this.lightTime=.065;
 }
 shot(from:Vector3,to:Vector3,weapon:number,impact:boolean,hit:boolean){
  const length=Vector3.Distance(from,to);if(length<.02)return;
  const direction=to.subtract(from).normalize(),speed=180,flight=length/speed;
  const mesh=MeshBuilder.CreateBox('FX bullet tracer',{width:.018,height:.018,depth:1},this.scene);mesh.material=weapon===1?this.cyan:this.amber;
  const update=(_dt:number,age:number)=>{const head=Math.min(length,age*speed),tail=Math.max(0,head-.95);mesh.scaling.z=Math.max(.025,head-tail);mesh.position.copyFrom(from.add(direction.scale((head+tail)/2)));mesh.lookAt(mesh.position.add(direction));};
  update(0,.0001);this.add({mesh,age:0,life:Math.max(.085,flight),update,done:()=>{if(impact)this.impact(to,direction,hit);}});
 }
 private impact(at:Vector3,incoming:Vector3,hit:boolean){
  const burst=MeshBuilder.CreateSphere('FX impact core',{diameter:hit?.14:.09,segments:4},this.scene);burst.position.copyFrom(at.subtract(incoming.scale(.025)));burst.material=this.hot;
  this.add({mesh:burst,age:0,life:.07});
  for(let i=0;i<7;i++){
   const spark=MeshBuilder.CreateBox('FX impact spark',{width:.018,height:.018,depth:.09},this.scene);spark.position.copyFrom(at.subtract(incoming.scale(.04)));spark.material=hit?this.cyan:this.amber;
   const velocity=new Vector3((Math.random()-.5)*3,(Math.random()-.2)*3,(Math.random()-.5)*3).subtract(incoming.scale(1.5));
   this.add({mesh:spark,age:0,life:.16+Math.random()*.12,update:(dt)=>{velocity.y-=8*dt;spark.position.addInPlace(velocity.scale(dt));spark.lookAt(spark.position.add(velocity));}});
  }
 }
 explosion(at:Vector3){
  this.blastLight.position.copyFrom(at);this.blastTime=.28;this.blastLight.intensity=12;
  const plane=(name:string,material:StandardMaterial)=>{const m=MeshBuilder.CreatePlane(name,{size:1},this.scene);m.material=material;m.billboardMode=Mesh.BILLBOARDMODE_ALL;m.position.copyFrom(at);m.rotation.z=Math.random()*Math.PI;return m;};
  const flash=plane('FX explosion flash',this.blastFlash);flash.scaling.setAll(.45);
  this.add({mesh:flash,age:0,life:.065,update:(_dt,age)=>{flash.scaling.setAll(.45+age*12);flash.visibility=1-age/.065;}});
  const wave=plane('FX shockwave',this.shock);
  this.add({mesh:wave,age:0,life:.32,update:(_dt,age)=>{wave.scaling.setAll(.5+age*16);wave.visibility=Math.pow(1-age/.32,2)*.45;}});
  // Keep the procedural fallback while the shared Blender atlas is loading.
  if(!this.explosions.spawn(at)){
  for(let i=0;i<14;i++){
   const m=plane('FX fire puff',this.fire),direction=new Vector3(Math.random()-.5,(Math.random()-.25)*.8,Math.random()-.5).normalize();
   const velocity=direction.scale(2+Math.random()*2),life=.32+Math.random()*.28,size=.3+Math.random()*.5;
   m.position.addInPlace(direction.scale(.15));m.scaling.setAll(size);
   this.add({mesh:m,age:0,life,update:(dt,age)=>{m.position.addInPlace(velocity.scale(dt));velocity.scaleInPlace(Math.exp(-dt*4));m.position.y+=dt*.7;m.scaling.setAll(size+1.6*(1-Math.exp(-age*6)));m.visibility=Math.pow(1-age/life,1.2);}});
  }
  for(let i=0;i<12;i++){
   const m=plane('FX smoke puff',this.smoke),velocity=new Vector3((Math.random()-.5)*1.2,.65+Math.random()*.65,(Math.random()-.5)*1.2),life=1.1+Math.random()*1.2,size=.6+Math.random()*.6;
   m.position.addInPlace(new Vector3((Math.random()-.5)*.8,(Math.random()-.5)*.6,(Math.random()-.5)*.8));m.visibility=0;
   this.add({mesh:m,age:0,life,update:(dt,age)=>{m.position.addInPlace(velocity.scale(dt));m.scaling.setAll(size+age*1.2);m.visibility=.65*Math.min(1,age/.22)*Math.pow(1-age/life,1.5);}});
  }
  }
  for(let i=0;i<18;i++){
   const m=MeshBuilder.CreateBox('FX blast ember',{width:.025,height:.025,depth:.12},this.scene);m.position.copyFrom(at);m.material=this.amber;
   const velocity=new Vector3(Math.random()-.5,Math.random()*.9,Math.random()-.5).normalize().scale(3+Math.random()*7),life=.35+Math.random()*.6;
   this.add({mesh:m,age:0,life,update:(dt,age)=>{velocity.y-=9*dt;m.position.addInPlace(velocity.scale(dt));m.lookAt(m.position.add(velocity));m.visibility=1-age/life;}});
  }
 }
 update(dt:number){
  this.explosions.update(dt);
  this.lightTime-=dt;if(this.lightTime<=0)this.light.intensity=0;
  this.blastTime=Math.max(0,this.blastTime-dt);this.blastLight.intensity=12*Math.pow(this.blastTime/.28,2);
  for(const e of [...this.effects]){if(!this.effects.includes(e))continue;e.age+=dt;if(e.age>=e.life){e.mesh.dispose();this.effects.splice(this.effects.indexOf(e),1);e.done?.();}else e.update?.(dt,e.age);}
 }
}
