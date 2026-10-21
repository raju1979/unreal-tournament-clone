import {Scene,TransformNode,DirectionalLight,ShadowGenerator,DynamicTexture,Layer,MeshBuilder,Mesh,StandardMaterial,Color3,Vector3,RenderTargetTexture,type AbstractMesh} from '@babylonjs/core';

/** Fixed daylight: a warm sun, blue sky and static soft shadows. */
export class CanyonEnvironment {
 private sky:Layer;
 private shadows:ShadowGenerator;
 constructor(private scene:Scene,root:TransformNode){
  const texture=new DynamicTexture('Sunspire daylight gradient',{width:8,height:256},scene,false),ctx=texture.getContext(),gradient=ctx.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#458bbd');gradient.addColorStop(.55,'#9acbdf');gradient.addColorStop(1,'#e5dfc8');ctx.fillStyle=gradient;ctx.fillRect(0,0,8,256);texture.update();
  this.sky=new Layer('Sunspire daylight sky',null,scene,true);this.sky.texture=texture;this.sky.isEnabled=false;
  const sun=new DirectionalLight('Sunspire midday sunlight',new Vector3(.42,-1,.32),scene);sun.position.set(-55,100,-42);sun.diffuse=new Color3(1,.93,.79);sun.intensity=1.35;sun.parent=root;
  sun.autoUpdateExtends=false;sun.orthoLeft=-87;sun.orthoRight=87;sun.orthoTop=87;sun.orthoBottom=-87;sun.shadowMinZ=1;sun.shadowMaxZ=240;
  this.shadows=new ShadowGenerator(2048,sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;this.shadows.bias=.0015;this.shadows.normalBias=.1;this.shadows.setDarkness(.2);
  const haze=new StandardMaterial('Sunspire canyon basin',scene);haze.diffuseColor=new Color3(.48,.32,.20);haze.specularColor=Color3.Black();
  const ground=MeshBuilder.CreateGround('Sunspire canyon basin',{width:1400,height:1400},scene);ground.position.y=-14;ground.material=haze;ground.parent=root;ground.isPickable=false;
  const cloudMaterial=new StandardMaterial('Sunspire daylight clouds',scene);cloudMaterial.disableLighting=true;cloudMaterial.emissiveColor=new Color3(.93,.95,.94);
  const clouds:Mesh[]=[];
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12;for(let j=0;j<3;j++){const puff=MeshBuilder.CreateIcoSphere('Sunspire cloud',{radius:1,subdivisions:1,flat:true},scene);puff.position.set(Math.cos(a)*170+j*9,62+(i%3)*9+(j%2)*3,Math.sin(a)*170);puff.scaling.set(22,4+(j%2)*2,12);puff.material=cloudMaterial;clouds.push(puff);}}
  const merged=Mesh.MergeMeshes(clouds,true,true);if(merged){merged.name='Sunspire daylight clouds';merged.parent=root;merged.isPickable=false;}
 }
 setEnabled(enabled:boolean){this.sky.isEnabled=enabled;if(enabled)this.shadows.getShadowMap()?.resetRefreshCounter();}
 attachMeshes(meshes:AbstractMesh[]){
  for(const m of meshes){m.isPickable=false;m.receiveShadows=!m.name.includes('backdrop');if(m.getTotalVertices()>0&&!m.name.includes('ground')&&!m.name.includes('backdrop'))this.shadows.addShadowCaster(m,false);}
  this.scene.executeWhenReady(()=>{const target=this.shadows.getShadowMap();if(target){target.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;target.resetRefreshCounter();}});
 }
}
