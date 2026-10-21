import {Scene,TransformNode,DirectionalLight,ShadowGenerator,DynamicTexture,Layer,MeshBuilder,StandardMaterial,Color3,Vector3,RenderTargetTexture,type AbstractMesh} from '@babylonjs/core';

/** Cold sky and distant ice; the supplied atlas already contains baked lighting. */
export class OutpostEnvironment {
 private sky:Layer;
 private shadows:ShadowGenerator;
 constructor(scene:Scene,root:TransformNode){
  const texture=new DynamicTexture('Outpost sky gradient',{width:8,height:256},scene,false),ctx=texture.getContext(),gradient=ctx.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#5a7895');gradient.addColorStop(.5,'#a7c5d8');gradient.addColorStop(1,'#e3edf0');ctx.fillStyle=gradient;ctx.fillRect(0,0,8,256);texture.update();
  this.sky=new Layer('Outpost cold sky',null,scene,true);this.sky.texture=texture;this.sky.isEnabled=false;
  const sun=new DirectionalLight('Outpost cold sunlight',new Vector3(-.4,-1,.3),scene);sun.position.set(25,65,-30);sun.diffuse=new Color3(.83,.92,1);sun.intensity=.8;sun.parent=root;
  sun.autoUpdateExtends=false;sun.orthoLeft=-40;sun.orthoRight=40;sun.orthoTop=40;sun.orthoBottom=-40;sun.shadowMinZ=1;sun.shadowMaxZ=140;
  this.shadows=new ShadowGenerator(1024,sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.bias=.0005;this.shadows.normalBias=.04;this.shadows.setDarkness(.3);
  const ice=new StandardMaterial('Outpost distant ice',scene);ice.diffuseColor=new Color3(.56,.62,.65);ice.specularColor=Color3.Black();
  const snow=new StandardMaterial('Outpost glacier snow',scene);snow.diffuseColor=new Color3(.82,.89,.93);snow.specularColor=new Color3(.15,.2,.25);
  const ground=MeshBuilder.CreateGround('Outpost frozen horizon',{width:450,height:450},scene);ground.position.y=-6;ground.material=ice;ground.parent=root;ground.isPickable=false;
  for(let i=0;i<22;i++){const a=i*Math.PI*2/22,r=85+(i%3)*15,h=14+(i*7)%22;const hill=MeshBuilder.CreateIcoSphere('Outpost glacier ridge',{radius:1,subdivisions:1,flat:true},scene);hill.scaling.set(20+(i%4)*6,h,16+(i%3)*5);hill.position.set(Math.cos(a)*r,h/3-6,Math.sin(a)*r);hill.rotation.y=i*1.7;hill.material=snow;hill.parent=root;hill.isPickable=false;}
 }
 setEnabled(enabled:boolean){this.sky.isEnabled=enabled;}
 attachMeshes(scene:Scene,meshes:AbstractMesh[]){
  for(const m of meshes){m.isPickable=false;m.receiveShadows=true;this.shadows.addShadowCaster(m);}
  scene.executeWhenReady(()=>{const target=this.shadows.getShadowMap();if(target){target.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;target.resetRefreshCounter();}});
 }
}
