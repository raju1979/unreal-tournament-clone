import {Scene,TransformNode,SceneLoader,PointLight,Color3,Vector3} from '@babylonjs/core';

/** Load this arena only when selected; collision comes from the shared layout. */
export class FoundryEnvironment {
 readonly root:TransformNode;
 private loading?:Promise<void>;
 constructor(private scene:Scene){
  this.root=new TransformNode('Ember Foundry scenery',scene);this.root.setEnabled(false);
  for(const x of [-7,7])for(const z of [-12,12]){
   const lamp=new PointLight('Foundry furnace spill',new Vector3(x,5,z),scene);
   lamp.diffuse=new Color3(1,.28,.055);lamp.intensity=2.4;lamp.range=20;lamp.parent=this.root;
  }
  for(const z of [-18,0,18]){
   const fill=new PointLight('Foundry overhead fill',new Vector3(0,10,z),scene);
   fill.diffuse=new Color3(.55,.75,1);fill.intensity=1.7;fill.range=35;fill.parent=this.root;
  }
 }
 setEnabled(enabled:boolean){
  this.root.setEnabled(enabled);
  if(enabled&&!this.loading){
   this.loading=this.load().catch(error=>{this.loading=undefined;console.error('Foundry scenery failed to load',error);});
  }
 }
 private async load(){
  const asset=await SceneLoader.LoadAssetContainerAsync('/assets/foundry/','ember-foundry.glb',this.scene);
  const model=new TransformNode('Foundry coordinate alignment',this.scene);model.parent=this.root;model.scaling.x=-1;
  const instance=asset.instantiateModelsToScene(name=>'foundry-'+name,false);
  for(const root of instance.rootNodes)root.parent=model;
  for(const mesh of model.getChildMeshes())mesh.isPickable=false;
 }
}
