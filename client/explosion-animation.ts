import {Scene,Sprite,SpriteManager,Texture,Vector3} from '@babylonjs/core';
import {explosionAnimation as settings} from '../shared/explosion-settings';

/** One shared atlas; each impact has its own frame and lifetime. */
export class ExplosionAnimations {
 private manager:SpriteManager;
 private active:{sprite:Sprite,age:number}[]=[];
 constructor(scene:Scene){
  this.manager=new SpriteManager('Blender rocket explosions','/assets/effects/rocket-explosion.png',24,{width:settings.cellSize,height:settings.cellSize},scene,.005,Texture.BILINEAR_SAMPLINGMODE);
  this.manager.texture.wrapU=this.manager.texture.wrapV=Texture.CLAMP_ADDRESSMODE;
  this.manager.disableDepthWrite=true;this.manager.isPickable=false;
 }
 spawn(at:Vector3){
  if(!this.manager.texture.isReady())return false;
  if(this.active.length>=24)this.active.shift()!.sprite.dispose();
  const sprite=new Sprite('Rocket impact fire and smoke',this.manager),size=.92+Math.random()*.16;
  sprite.position.copyFrom(at);sprite.position.y+=settings.centerHeight*size;
  sprite.width=sprite.height=settings.worldSize*size;sprite.cellIndex=0;sprite.invertU=Math.random()<.5;sprite.isPickable=false;
  this.active.push({sprite,age:0});return true;
 }
 update(dt:number){
  for(let n=this.active.length-1;n>=0;n--){
   const blast=this.active[n];blast.age+=dt;
   if(blast.age>=settings.duration){blast.sprite.dispose();this.active.splice(n,1);continue;}
   blast.sprite.color.a=Math.min(1,(settings.duration-blast.age)/.5);
   blast.sprite.cellIndex=Math.min(settings.frames-1,Math.floor(blast.age*settings.fps));
  }
 }
}
