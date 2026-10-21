import {villageLayout} from './village-layout';
import {outpostLayout} from './outpost-layout';
import {canyonLayout} from './canyon-layout';
export type Box={name:string,x:number,y:number,z:number,w:number,h:number,d:number,kind?:string};
export type Arena={id:string,name:string,boxes:Box[],spawns:number[][],weaponSpawns:number[][],pickups:{x:number,y:number,z:number,type:string}[]};
const boxes:Box[]=[];
function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,kind='wall'){boxes.push({name,x,y,z,w,h,d,kind});}
box('Foundation',0,-1,0,48,2,48,'floor');
box('North bulkhead',0,5,24,50,12,2);box('South bulkhead',0,5,-24,50,12,2);box('East bulkhead',24,5,0,2,12,48);box('West bulkhead',-24,5,0,2,12,48);
for(const x of [-10,10])for(const z of [-10,10])box('Reactor buttress',x,2.5,z,3,5,3,'pillar');
for(const x of [-17,17]){box('Gallery',x,3,0,8,1,28,'floor');for(const z of [-8,8])box('Cover',x,4.3,z,2,1.6,3,'crate');}
box('North bridge',0,3,13,28,1,4,'floor');box('South bridge',0,3,-13,28,1,4,'floor');
for(const x of [-17,17])for(const sign of [-1,1])for(let i=0;i<10;i++)box('Stair',x,(i+1)*.175,sign*(21-i*.7),5,(i+1)*.35,.75,'stair');
for(const z of [-6,6]){box('Cover',-5,1,z,3,2,2,'crate');box('Cover',5,1,z,3,2,2,'crate');}
box('Reactor plinth',0,.6,0,5,1.2,5,'reactor');
export const reactor:Arena={id:'reactor',name:'Reactor',boxes,weaponSpawns:[[0,0,18],[0,0,-18],[-8,0,0],[8,0,0],[-17,3.5,5],[17,3.5,-5]],spawns:[[-8,0,-19],[8,0,19],[-8,0,19],[8,0,-19]],pickups:[{x:0,y:0,z:10,type:'health'},{x:0,y:0,z:-10,type:'health'},{x:-17,y:3.5,z:0,type:'ammo'},{x:17,y:3.5,z:0,type:'ammo'}]};
export const village:Arena=villageLayout;
export const outpost:Arena=outpostLayout;
export const canyon:Arena=canyonLayout;
export const arenas:Record<string,Arena>={reactor,village,outpost,canyon};
