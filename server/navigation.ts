import {blocked} from '../shared/game';
import type {Arena} from '../shared/maps';
export type NavPoint={x:number,y:number,z:number};
type Node=NavPoint & {links:number[]};
const distance=(a:NavPoint,b:NavPoint)=>Math.hypot(a.x-b.x,a.z-b.z,(a.y-b.y)*1.4);
export class Navigation {
 readonly nodes:Node[]=[];
 constructor(readonly map:Arena){
  const surfaces=map.boxes.filter(b=>b.kind==='floor'||b.kind==='stair');
  const cells=new Map<string,number[]>();
  const minX=Math.ceil(Math.min(...surfaces.map(b=>b.x-b.w/2))+1),maxX=Math.floor(Math.max(...surfaces.map(b=>b.x+b.w/2))-1),minZ=Math.ceil(Math.min(...surfaces.map(b=>b.z-b.d/2))+1),maxZ=Math.floor(Math.max(...surfaces.map(b=>b.z+b.d/2))-1);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
   const heights=[...new Set(surfaces.filter(b=>Math.abs(x-b.x)<=b.w/2+.38&&Math.abs(z-b.z)<=b.d/2+.38).map(b=>b.y+b.h/2))];
   for(const y of heights)if(y>=0&&y<6&&!blocked(x,y+.015,z,map)){
    const n=this.nodes.length;this.nodes.push({x,y,z,links:[]});const key=`${x},${z}`;cells.set(key,[...(cells.get(key)??[]),n]);
   }
  }
  for(let n=0;n<this.nodes.length;n++){const a=this.nodes[n];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])for(const m of cells.get(`${a.x+dx},${a.z+dz}`)??[]){const b=this.nodes[m];if(b.y-a.y>.8||a.y-b.y>1.2)continue;
   let previous=a.y,clear=true;const steps=8;
   for(let i=1;i<=steps;i++){const t=i/steps,x=a.x+dx*t,z=a.z+dz*t,expected=a.y+(b.y-a.y)*t;
    const candidates=surfaces.filter(s=>Math.abs(x-s.x)<=s.w/2+.38&&Math.abs(z-s.z)<=s.d/2+.38).map(s=>s.y+s.h/2).filter(y=>y<=previous+.405&&y>=previous-1.2&&!blocked(x,y+.015,z,map)).sort((y,v)=>Math.abs(y-expected)-Math.abs(v-expected));
    if(!candidates.length){clear=false;break;}previous=candidates[0];
   }
   if(clear&&Math.abs(previous-b.y)<.1)a.links.push(m);
  }}
 }
 nearest(p:NavPoint){let best=-1,cost=Infinity;for(let i=0;i<this.nodes.length;i++){const d=distance(p,this.nodes[i]);if(d<cost){cost=d;best=i;}}return best;}
 path(from:NavPoint,to:NavPoint):NavPoint[]{
  const start=this.nearest(from),end=this.nearest(to);if(start<0||end<0)return [];
  const g=new Map([[start,0]]),parent=new Map<number,number>(),closed=new Set<number>(),heap:{node:number,score:number}[]=[];
  const push=(node:number,score:number)=>{let i=heap.push({node,score})-1;while(i){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p;}heap[i]={node,score};};
  const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
  push(start,distance(this.nodes[start],this.nodes[end]));
  while(heap.length){const entry=pop();let current=entry.node;const score=entry.score,currentG=g.get(current);if(currentG===undefined||closed.has(current)||score>currentG+distance(this.nodes[current],this.nodes[end])+.0001)continue;
   if(current===end){const result=[this.nodes[end]];while(parent.has(current)){const previous=parent.get(current)!;result.push(this.nodes[previous]);if(previous===start)break;current=previous;}return result.reverse();}
   closed.add(current);for(const n of this.nodes[current].links){if(closed.has(n))continue;const candidate=currentG+distance(this.nodes[current],this.nodes[n]);if(candidate<(g.get(n)??Infinity)){parent.set(n,current);g.set(n,candidate);push(n,candidate+distance(this.nodes[n],this.nodes[end]));}}
  }return [];
 }
}
