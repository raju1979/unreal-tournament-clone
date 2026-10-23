import type {Arena} from './maps';

// Fit the entire view-model envelope, rather than just tracing its muzzle.
// Scaling its camera-relative placement and size retracts it toward the eye.
export function weaponExtension(eye:number[],yaw:number,pitch:number,map:Arena,weapon=1):number {
 const right=[Math.cos(yaw),0,-Math.sin(yaw)];
 const up=[Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];
 const forward=[Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 const bounds=weapon===4?[[.15,.49],[-.4,.13],[.25,1.53]]:weapon===2?[[.17,.47],[-.53,.04],[.19,1.13]]:[[.23,.41],[-.53,-.10],[.25,1.25]];
 for(const x of bounds[0])for(const y of bounds[1])for(const z of bounds[2]) {
  for(let a=0;a<3;a++){const v=right[a]*x+up[a]*y+forward[a]*z;low[a]=Math.min(low[a],v);high[a]=Math.max(high[a],v);}
 }
 let extension=1;
 for(const b of map.boxes){
  const min=[b.x-b.w/2-.035,b.y-b.h/2-.035,b.z-b.d/2-.035];
  const max=[b.x+b.w/2+.035,b.y+b.h/2+.035,b.z+b.d/2+.035];
  let enter=0,exit=1;
  // Intersect the time intervals in which a growing AABB overlaps each slab.
  for(let a=0;a<3;a++)for(const [slope,rhs] of [[high[a],min[a]-eye[a]],[-low[a],eye[a]-max[a]]]){
   if(Math.abs(slope)<1e-9){if(rhs>0)exit=-1;}
   else if(slope>0)enter=Math.max(enter,rhs/slope);
   else exit=Math.min(exit,rhs/slope);
  }
  if(enter<=exit&&exit>=0&&enter<=1)extension=Math.min(extension,Math.max(0,enter-.005));
 }
 return extension;
}
