
// ================= MATCH SERVER SHIM =================
// Included only in the server build. Replaces drawing/sound/UI with event recorders
// and exposes the API the room uses: newGame, update, commands and snapshot encoding.
const CAM={x:0,y:0,z:1.15};
const unitScale=()=>1;
let EV=[];const TEV={1:[],2:[]};
const ri=Math.round,r2=v=>Math.round(v*100)/100;
function explode(x,y,s){EV.push(['x',ri(x),ri(y),r2(s)]);}
function puff(x,y,c,n){EV.push(['p',ri(x),ri(y),c,n]);}
function scorch(x,y,r,a){EV.push(['s',ri(x),ri(y),r,a]);}
function debris(x,y,n){EV.push(['d',ri(x),ri(y),n]);}
function burn(x,y,s){EV.push(['b',ri(x),ri(y),s]);}
function shakeAt(x,y,a){EV.push(['k',ri(x),ri(y),a]);}
function smoke(x,y,n){EV.push(['m',ri(x),ri(y),n]);}
function sparks(x,y,n){EV.push(['z',ri(x),ri(y),n]);}
function crater(x,y){EV.push(['c',ri(x),ri(y)]);}
function exFx(x,y,r){EV.push(['e',ri(x),ri(y),r]);}
function flakFx(x,y){EV.push(['f',ri(x),ri(y)]);}
function sfx(k,x,y){if(x!=null)EV.push(['S',k,ri(x),ri(y)]);}
function shotEv(u,kind,n,tx,ty,dur,step){EV.push(['F',u.id,kind,n,ri(tx),ri(ty),ri((dur||0)*1000),ri((step||0)*1000)]);}
// clients derive these from unit state themselves
function mzFx(){}function muzzle(){}function fallen(){}function trackMark(){}function addWreck(){}function addFalling(){}
function toast(){}function voiceToast(){}function vib(){}function initVisuals(){}
function gameOver(res,why){if(G.over)return;G.over=true;G.winner=res==='win'?1:2;G.why=why;}

const TYPEI=Object.fromEntries(TYPES.map((t,i)=>[t,i])),BTI=Object.fromEntries(BTYPES.map((t,i)=>[t,i]));
const CST={'':0,cap:1,fight:2};
function b64(u8){let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s);}
function mapPack(){
  return {W:G.W,H:G.H,terr:b64(G.terr),elev:b64(Uint8Array.from(G.elev,v=>clamp(v*255,0,255)|0)),
    prov:b64(new Uint8Array(G.prov.buffer.slice(0))),road:b64(G.road),depAt:b64(new Uint8Array(G.depAt.buffer.slice(0))),
    deps:G.deps.map(d=>[d.type,d.ci]),roads:G.roads,cities:G.cities.map(c=>[c.id,c.name,c.cx,c.cy,c.type]),nat:G.nat,
    countries:G.countries.map(c=>({id:c.id,name:c.name,full:c.full,gov:c.gov,leader:c.leader,persona:c.persona,flag:c.flag,exp:c.exp,imp:c.imp,m:c.m,stMax:c.stMax,dmMax:c.dmMax}))};
}
// 28 bytes per unit: id u32, type u8, team u8, x,y,ang,tAng i16, hp u16, flags u8, div u32, fuel% u8, rank u8, ally i8, goal x,y i16
function encUnits(){
  const U=G.units.filter(u=>!u.dead),buf=new ArrayBuffer(8+U.length*28),v=new DataView(buf);
  v.setFloat32(0,G.time,true);v.setUint32(4,U.length,true);let o=8;
  const q=x=>clamp(Math.round(x*10),-32000,32000);
  for(const u of U){const d=UT[u.type];
    v.setUint32(o,u.id,true);v.setUint8(o+4,TYPEI[u.type]);v.setUint8(o+5,u.team);
    v.setInt16(o+6,q(u.x),true);v.setInt16(o+8,q(u.y),true);v.setInt16(o+10,Math.round(wrapA(u.ang)*1000),true);v.setInt16(o+12,Math.round(wrapA(u.tAng||0)*1000),true);
    v.setUint16(o+14,Math.max(0,Math.round(u.hp)),true);
    const moving=d.air?!!(u.order&&!u.landed):u.state==='move';
    v.setUint8(o+16,(u.landed?1:0)|(u.state==='retreat'?2:0)|(moving?4:0)|(u.retreatOn?8:0)|(u.rcWhy==='fuel'?16:0));
    v.setUint32(o+17,u.div?u.div.id:0,true);v.setUint8(o+21,d.fuel?clamp(Math.round(100*u.fuel/d.fuel),0,100):0);v.setUint8(o+22,u.rank);v.setInt8(o+23,u.ally==null?-1:u.ally);
    const gx=d.air?(u.order?u.order.x:u.x):u.goalX,gy=d.air?(u.order?u.order.y:u.y):u.goalY;v.setInt16(o+24,q(gx),true);v.setInt16(o+26,q(gy),true);
    o+=28;}
  return new Uint8Array(buf);
}
const lastB=new Map();let lastW=null;
const bpack=b=>[b.id,BTI[b.type],b.owner,b.ci,Math.round(b.hp),r2(b.prog),r2(b.eff),b.city?b.city.id:-1];
function sharedDiff(){
  const add=[],cur=new Set();
  for(const b of G.blds){cur.add(b.id);const sig=b.owner+'|'+Math.round(b.hp)+'|'+Math.round(b.prog*20)+'|'+Math.round(b.eff*20);if(lastB.get(b.id)!==sig){lastB.set(b.id,sig);add.push(bpack(b));}}
  const del=[];for(const id of lastB.keys())if(!cur.has(id)){del.push(id);lastB.delete(id);}
  const N=G.W*G.H;if(!lastW)lastW=new Uint8Array(N*2);const w=[];
  for(let i=0;i<N;i++){const o=G.wall[i],hq=o?Math.ceil(G.wallHp[i]/BT.wall.hp*15):0;if(lastW[i*2]!==o||lastW[i*2+1]!==hq){lastW[i*2]=o;lastW[i*2+1]=hq;w.push(i,o,hq);}}
  return {b:{add,del},w};
}
function fullStructs(){const w=[],N=G.W*G.H;for(let i=0;i<N;i++)if(G.wall[i])w.push(i,G.wall[i],Math.ceil(G.wallHp[i]/BT.wall.hp*15));return {b:{full:1,add:G.blds.map(bpack),del:[]},w,wf:1};}
function econPack(E,withHist){const o={money:r2(E.money),mp:Math.round(E.mp),pol:E.pol,hap:r2(E.hap),hapT:r2(E.hapT),fac:E.fac,state:E.state,pop:Math.round(E.pop),cap:Math.round(E.cap),
  jobs:Math.round(E.jobs),labor:Math.round(E.labor),fill:r2(E.fill),unemp:r2(E.unemp),mil:Math.round(E.mil),mpCap:Math.round(E.mpCap),recruit:r2(E.recruit),tax:r2(E.tax),growth:r2(E.growth),
  starving:E.starving,collapseT:r2(E.collapseT),weary:r2(E.weary),cas:Math.round(E.cas),civDead:Math.round(E.civDead),fled:Math.round(E.fled),res:{},net:{},mk:{}};
  for(const r of RES){o.res[r]=r2(E.res[r]);o.net[r]=r2(E.net[r]);o.mk[r]=r2(E.mk[r]);}
  if(withHist){o.ph={};for(const r of RES)o.ph[r]=E.ph[r].map(r2);}return o;}
const countriesPack=()=>G.countries.map(c=>{const st={},dm={};for(const r of RES){st[r]=Math.round(c.st[r]);dm[r]=Math.round(c.dm[r]);}
  return [[0,r2(c.rel[1]),r2(c.rel[2])],c.tr[1],c.tr[2],st,dm,Math.round(c.mpA)];});
let nPay=0;
function teamPayload(T,full,shared){
  const o={t:r2(G.time),ev:EV,me:TEV[T]};
  o.c=G.cities.map(c=>[c.id,c.owner,Math.round(c.pop),Math.round(c.cap),r2(c.panic),Math.round(c.occ),Math.round(c.cp*1000)/1000,c.cpBy,CST[c.cstate]||0,r2(c.contest),
    c.owner===T?c.queue.map(q=>TYPEI[q]):[],c.owner===T?r2(c.prog):0]);
  if(full||nPay%3===0){o.e=econPack(G.E[T],full||nPay%12===0);const F=G.E[3-T];o.oe={hap:r2(F.hap),state:F.state,pop:Math.round(F.pop)};o.tp=[0,r2(G.terrPct[1]),r2(G.terrPct[2])];}
  if(full||nPay%6===0)o.k=countriesPack();
  o.d=G.divs.filter(d=>d.team===T).map(d=>[d.id,d.num,d.color]);
  const st=full?fullStructs():shared;if(full||st.b.add.length||st.b.del.length)o.b=st.b;if(full||st.w.length){o.w=st.w;if(full)o.wf=1;}
  if(G.over)o.over={winner:G.winner,why:G.why,stats:G.stats[T],time:r2(G.time)};
  return o;
}
function endBroadcast(){EV=[];TEV[1]=[];TEV[2]=[];nPay++;}
function setup(){G.emit=(t,e)=>{if(TEV[t])TEV[t].push(e);};}
function forfeit(t){gameOver(t===1?'lose':'win','disconnect');}
function timeUp(){gameOver(G.terrPct[1]>=G.terrPct[2]?'win':'lose','time');}
return {newGame:o=>{newGame(o);setup();},update,runCmd,note:(t,m)=>note(t,m,'bad'),mapPack,encUnits,sharedDiff,teamPayload,endBroadcast,forfeit,timeUp,get G(){return G}};
