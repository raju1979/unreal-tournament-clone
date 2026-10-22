import {Scene,TransformNode,SceneLoader,PointLight,Color3,Vector3} from '@babylonjs/core';

/** Load this arena only when selected; collision comes from the shared layout. */
export class FortressEnvironment {
 readonly root:TransformNode;
 private loading?:Promise<void>;
 constructor(private scene:Scene){
  this.root=new TransformNode('Iron Veil scenery',scene);this.root.setEnabled(false);
  for(const x of [-22,22])for(const z of [-20,-8,8,20]){
   const lamp=new PointLight('Fortress amber torch',new Vector3(x,6.25,z),scene);
   lamp.diffuse=new Color3(1,.48,.17);lamp.intensity=1.8;lamp.range=15;lamp.parent=this.root;
  }
  const pool=new PointLight('Fortress reservoir glow',new Vector3(0,2,0),scene);
  pool.diffuse=new Color3(.08,.65,.43);pool.intensity=.8;pool.range=17;pool.parent=this.root;
 }
 setEnabled(enabled:boolean){
  this.root.setEnabled(enabled);
  if(enabled&&!this.loading){
   this.loading=this.load().catch(error=>{this.loading=undefined;console.error('Fortress scenery failed to load',error);});
  }
 }
 private async load(){
  const asset=await SceneLoader.LoadAssetContainerAsync('/assets/fortress/','iron-veil-fortress.glb',this.scene);
  const model=new TransformNode('Fortress coordinate alignment',this.scene);model.parent=this.root;model.scaling.x=-1;
  const instance=asset.instantiateModelsToScene(name=>'fortress-'+name,false);
  for(const root of instance.rootNodes)root.parent=model;
  for(const mesh of model.getChildMeshes())mesh.isPickable=false;
 }
}
