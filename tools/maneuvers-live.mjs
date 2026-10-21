import WebSocket from 'ws';import assert from 'node:assert/strict';
import {reactor} from '../shared/maps.ts';import {Navigation} from '../server/navigation.ts';import {emptyInput} from '../shared/game.ts';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const nav=new Navigation(reactor);
async function connect(bots){const ws=new WebSocket('ws://localhost:3000/ws');const c={ws,id:'',state:null,seq:0,records:{},dodged:false,jumped:false};
 ws.on('open',()=>ws.send(JSON.stringify({type:'join',map:'reactor',room:'behaviors-'+bots+'-'+Date.now(),name:'Live check',bots})));
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')c.id=m.id;if(m.type==='state'){
  c.state=m;for(const key of ['carbine','launcher']){const p=m[key],r=c.records[key]??={x:p.x,y:p.y,z:p.z,spot:p.spot,hidden:false,returned:false};assert.deepEqual([p.x,p.y,p.z,p.spot],[r.x,r.y,r.z,r.spot]);if(p.cooldown>0)r.hidden=true;else if(r.hidden)r.returned=true;}
  for(const p of m.players)if(p.bot){if(p.botState==='DODGE')c.dodged=true;if(p.vy>2&&p.y>.08)c.jumped=true;}
 }});await until(()=>c.state&&c.id,10000);return c;
}
async function until(predicate,timeout){const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw Error('Live check timed out');await sleep(35)}}
const me=c=>c.state.players.find(p=>p.id===c.id);
function input(c,extra={}){c.ws.send(JSON.stringify({type:'input',...emptyInput(),...extra,seq:++c.seq}));}
async function follow(c,goal){let path=nav.path(me(c),goal);path.push(goal);const end=Date.now()+50000;while(path.length){const p=me(c);while(path.length&&Math.hypot(path[0].x-p.x,path[0].z-p.z)<.4&&Math.abs(path[0].y-p.y)<.5)path.shift();if(!path.length)break;if(Date.now()>end)throw Error('Route stalled '+JSON.stringify({p,next:path[0]}));input(c,{f:.55,yaw:Math.atan2(path[0].x-p.x,path[0].z-p.z)});await sleep(33);}input(c);}
async function weapons(){const c=await connect(false);try{
 await follow(c,c.state.carbine);await until(()=>me(c).hasCarbine,3000);
 await follow(c,c.state.launcher);await until(()=>me(c).hasLauncher,3000);
 const p=me(c),safe=nav.nodes.find(n=>Math.abs(n.y-p.y)<.1&&Math.hypot(n.x-p.x,n.z-p.z)>4&&Math.hypot(n.x-p.x,n.z-p.z)<7&&['carbine','launcher'].every(k=>Math.hypot(n.x-c.state[k].x,n.z-c.state[k].z)>3));assert.ok(safe);await follow(c,safe);
 await until(()=>c.records.carbine.returned&&c.records.launcher.returned,35000);console.log('PASS: live carbine and launcher collected, hidden, and returned at the same coordinates');
 }finally{c.ws.close()}}
async function bots(){const c=await connect(true);try{
 const end=Date.now()+25000;while(Date.now()<end&&!(c.dodged&&c.jumped)){
  const p=me(c),target=c.state.players.filter(q=>q.bot&&q.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  if(target)input(c,{fire:p.hp>0,yaw:Math.atan2(target.x-p.x,target.z-p.z),pitch:Math.atan2(p.y+1.45-target.y-1,Math.hypot(target.x-p.x,target.z-p.z))});await sleep(40);
 }
 assert.ok(c.dodged,'live bot sidestep');assert.ok(c.jumped,'live bot jump with upward velocity');console.log('PASS: live bots dodge under fire and jump using authoritative movement');
 }finally{c.ws.close()}}
await Promise.all([weapons(),bots()]);
