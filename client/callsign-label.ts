import {DynamicTexture,Mesh,MeshBuilder,StandardMaterial,Color3,Vector3,type Scene,type TransformNode} from '@babylonjs/core';

/** World-space text: follows the character, faces the camera, and obeys depth. */
export class CallsignLabel {
 readonly mesh:Mesh;
 private texture:DynamicTexture;
 private material:StandardMaterial;
 constructor(scene:Scene,root:TransformNode,name:string,bot:boolean){
  this.texture=new DynamicTexture('Callsign texture '+root.name,{width:512,height:96},scene,false);
  this.texture.hasAlpha=true;
  const ctx=this.texture.getContext() as CanvasRenderingContext2D;ctx.clearRect(0,0,512,96);
  ctx.fillStyle='rgba(6,16,26,0.82)';ctx.fillRect(0,0,512,96);
  ctx.fillStyle=bot?'#ffbd79':'#80f3e1';ctx.fillRect(0,0,5,96);
  const text=name.slice(0,20);let size=42;ctx.font=`bold ${size}px Arial`;
  while(ctx.measureText(text).width>470&&size>20)ctx.font=`bold ${--size}px Arial`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f3f8fc';ctx.fillText(text,256,49);this.texture.update();
  this.material=new StandardMaterial('Callsign material '+root.name,scene);
  this.material.diffuseTexture=this.texture;this.material.useAlphaFromDiffuseTexture=true;
  this.material.disableLighting=true;this.material.emissiveColor=Color3.White();this.material.backFaceCulling=false;this.material.fogEnabled=false;
  this.mesh=MeshBuilder.CreatePlane('Callsign '+name,{width:2.15,height:.40},scene);
  this.mesh.parent=root;this.mesh.position.y=2.10;this.mesh.billboardMode=Mesh.BILLBOARDMODE_ALL;
  this.mesh.material=this.material;this.mesh.isPickable=false;this.mesh.metadata={callsign:text,bot};
 }
 update(camera:Vector3,visible:boolean){
  const distance=Vector3.Distance(camera,this.mesh.getAbsolutePosition());
  this.mesh.setEnabled(visible&&distance<44);
  this.mesh.visibility=Math.min(1,Math.max(0,(44-distance)/12));
  this.mesh.scaling.setAll(Math.min(1.65,Math.max(.8,distance/18)));
 }
 dispose(){this.mesh.dispose();this.material.dispose();this.texture.dispose();}
}
