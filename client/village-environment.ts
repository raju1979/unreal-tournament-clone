import {Scene,TransformNode,DirectionalLight,ShadowGenerator,DynamicTexture,StandardMaterial,Color3,Color4,Vector3,Mesh,MeshBuilder,ParticleSystem,Layer,RenderTargetTexture,PointLight,VertexBuffer,type AbstractMesh} from '@babylonjs/core';
import {villageSmoke} from '../shared/village-layout';

/** Daylight, soft shadows and inexpensive water/smoke for the canal arena. */
export class VillageEnvironment {
 private readonly sun:DirectionalLight;
 private readonly shadows:ShadowGenerator;
 private readonly waterTexture:DynamicTexture;
 private readonly smoke:ParticleSystem;
 private readonly sky:Layer;
 private readonly fire:ParticleSystem;
 private readonly fireLight:PointLight;
 private time=0;
 private enabled=false;
 constructor(private scene:Scene,root:TransformNode){
  this.sun=new DirectionalLight('Village afternoon sunlight',new Vector3(.45,-1,.55),scene);this.sun.position.set(-35,80,-42);this.sun.diffuse=new Color3(1,.88,.69);this.sun.intensity=1.65;this.sun.parent=root;
  this.sun.autoUpdateExtends=false;this.sun.orthoLeft=-78;this.sun.orthoRight=78;this.sun.orthoBottom=-78;this.sun.orthoTop=78;this.sun.shadowMinZ=1;this.sun.shadowMaxZ=190;
  this.shadows=new ShadowGenerator(2048,this.sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;this.shadows.bias=.0003;this.shadows.normalBias=.035;this.shadows.setDarkness(.25);
  const skyTexture=new DynamicTexture('Village sky gradient',{width:16,height:256},scene,false);const ctx=skyTexture.getContext();const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#2cadd4');gradient.addColorStop(.48,'#70cfe5');gradient.addColorStop(1,'#c7e8ec');ctx.fillStyle=gradient;ctx.fillRect(0,0,16,256);skyTexture.update();
  this.sky=new Layer('Village sky gradient',null,scene,true);this.sky.texture=skyTexture;this.sky.isEnabled=false;
  const cloudMat=new StandardMaterial('Cream sunlight on clouds',scene);cloudMat.emissiveColor=new Color3(.95,.97,.90);cloudMat.diffuseColor=Color3.Black();cloudMat.specularColor=Color3.Black();cloudMat.disableLighting=true;
  const clouds:Mesh[]=[];
  for(let i=0;i<15;i++){const a=i*Math.PI*2/15,x=Math.cos(a)*115,z=Math.sin(a)*115;for(let j=0;j<3;j++){const m=MeshBuilder.CreateSphere('Cloud puff',{diameter:1,segments:5},scene);m.position.set(x+j*7,48+(i%4)*6+(j%2)*2,z);m.scaling.set(28,6+(j%2)*4,13);m.material=cloudMat;clouds.push(m);}}
  const cloudMesh=Mesh.MergeMeshes(clouds,true,true);if(cloudMesh){cloudMesh.name='Village soft clouds';cloudMesh.parent=root;cloudMesh.isPickable=false;}
  this.waterTexture=new DynamicTexture('Moving canal ripples',{width:512,height:512},scene,false);const wc=this.waterTexture.getContext() as CanvasRenderingContext2D;wc.fillStyle='#40bfc4';wc.fillRect(0,0,512,512);
  for(let i=0;i<90;i++){const x=(i*137.5)%512,y=(i*79.1)%512;wc.strokeStyle=i%3?'#75d9d1':'#b9ece1';wc.lineWidth=i%3?1:2;wc.beginPath();wc.ellipse(x,y,12+i%17,2+i%3,.12,0,Math.PI);wc.stroke();}this.waterTexture.update();this.waterTexture.uScale=12;this.waterTexture.vScale=2;
  const smokeTex=new DynamicTexture('Soft chimney smoke',{width:64,height:64},scene,false);const sc=smokeTex.getContext(),sg=sc.createRadialGradient(32,32,1,32,32,31);sg.addColorStop(0,'rgba(235,232,217,0.7)');sg.addColorStop(.5,'rgba(235,232,217,0.25)');sg.addColorStop(1,'rgba(235,232,217,0)');sc.fillStyle=sg;sc.fillRect(0,0,64,64);smokeTex.update();smokeTex.hasAlpha=true;
  this.smoke=new ParticleSystem('Village chimney smoke',120,scene);this.smoke.particleTexture=smokeTex;this.smoke.emitter=Vector3.Zero();this.smoke.startPositionFunction=(_matrix,pos)=>{const s=villageSmoke[Math.floor(Math.random()*villageSmoke.length)];pos.set(s[0],s[1],s[2]);};this.smoke.direction1=new Vector3(.1,.9,.05);this.smoke.direction2=new Vector3(.3,1.2,.15);this.smoke.minEmitPower=.35;this.smoke.maxEmitPower=.75;this.smoke.gravity=new Vector3(.06,.1,.04);this.smoke.minLifeTime=2;this.smoke.maxLifeTime=5;this.smoke.minSize=.6;this.smoke.maxSize=1.7;this.smoke.emitRate=12;this.smoke.color1=new Color4(.9,.88,.81,.34);this.smoke.color2=new Color4(.8,.82,.78,.24);this.smoke.colorDead=new Color4(.85,.87,.83,0);this.smoke.blendMode=ParticleSystem.BLENDMODE_STANDARD;this.smoke.addSizeGradient(0,.45);this.smoke.addSizeGradient(1,2.2);
  this.fire=new ParticleSystem('Tavern courtyard campfire',65,scene);this.fire.particleTexture=smokeTex;this.fire.emitter=new Vector3(-8,.32,34);this.fire.minEmitBox=new Vector3(-.25,0,-.25);this.fire.maxEmitBox=new Vector3(.25,.05,.25);this.fire.direction1=new Vector3(-.15,1,-.1);this.fire.direction2=new Vector3(.15,1.8,.1);this.fire.minEmitPower=.5;this.fire.maxEmitPower=1.3;this.fire.minLifeTime=.25;this.fire.maxLifeTime=.8;this.fire.minSize=.25;this.fire.maxSize=.6;this.fire.emitRate=38;this.fire.color1=new Color4(1,.64,.13,.9);this.fire.color2=new Color4(1,.20,.025,.8);this.fire.colorDead=new Color4(.3,.07,.01,0);this.fire.addSizeGradient(0,1);this.fire.addSizeGradient(1,.1);this.fire.blendMode=ParticleSystem.BLENDMODE_ADD;
  this.fireLight=new PointLight('Warm campfire light',new Vector3(-8,.7,34),scene);this.fireLight.diffuse=new Color3(1,.42,.12);this.fireLight.range=6;this.fireLight.intensity=.7;this.fireLight.parent=root;

 }
 attachMeshes(meshes:AbstractMesh[]){
  const water=new StandardMaterial('Canal animated water',this.scene);water.diffuseTexture=this.waterTexture;water.diffuseColor=new Color3(.75,1,1);water.emissiveColor=new Color3(.015,.10,.12);water.specularColor=new Color3(.8,.9,.85);water.specularPower=96;water.alpha=.93;
  for(const m of meshes){m.isPickable=false;m.receiveShadows=!m.name.includes('backdrop');if(m.name.includes('Canal water')){m.material=water;m.receiveShadows=false;const positions=m.getVerticesData(VertexBuffer.PositionKind);if(positions&&m instanceof Mesh){const uv:number[]=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]+.5,positions[i+2]+.5);m.setVerticesData(VertexBuffer.UVKind,uv);}}if(/Village (buildings|architecture|props|vegetation)/.test(m.name))this.shadows.addShadowCaster(m);}
  // The village geometry and sunlight are static; render the shadow atlas once.
  this.scene.executeWhenReady(()=>{const map=this.shadows.getShadowMap();if(map){map.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;map.resetRefreshCounter();}});
 }
 setEnabled(enabled:boolean){if(enabled===this.enabled)return;this.enabled=enabled;this.sky.isEnabled=enabled;if(enabled){this.smoke.start();this.fire.start();}else{this.smoke.stop();this.fire.stop();}}
 update(dt:number){if(!this.enabled)return;this.time+=dt;this.fireLight.intensity=.7+Math.sin(this.time*13)*.10+Math.sin(this.time*23)*.06;this.waterTexture.uOffset=this.time*.013;this.waterTexture.vOffset=this.time*.005;}
}
