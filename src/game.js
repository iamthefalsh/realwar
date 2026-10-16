
// ================= GAME STATE =================
let G=null;
function newGame(opts){
  const [a,b]=SIZES[opts.size];
  const vertical=opts.vertical!=null?!!opts.vertical:(typeof innerHeight!=='undefined'&&innerHeight>innerWidth);
  const W=vertical?b:a,H=vertical?a:b,seed=(Math.random()*1e9)|0,N=W*H;
  const m=genMap(W,H,seed,vertical);
  const prep=opts.demo||opts.mp?0:(+opts.prep||0);
  G={W,H,seed,opts,vertical,terr:m.terr,elev:m.elev,cities:m.cities,deps:m.deps,depAt:m.depAt,prov:m.prov,adj:m.adj,roads:m.roads,road:m.road,
    units:[],proj:[],fx:[],parts:[],markers:[],civs:[],blds:[],bAt:new Map(),wrecks:[],falling:[],shake:0,
    wall:new Uint8Array(N),wallHp:new Float32Array(N),wallHit:new Float32Array(N),own:new Uint8Array(N),
    time:0,peaceEnd:prep*YEAR,peace:prep>0,terrPct:[0,0,0],divs:[],sel:[],selCity:null,demo:!!opts.demo,
    diff:DIFFS[opts.diff||'normal'],speed:opts.demo?2:1,paused:false,over:false,nextId:1,terrT:0,visT:0,visN:0,econT:0,civT:0,pathQ:[],
    stats:{1:newStats(),2:newStats()},mp:!!opts.mp,pvT:{1:8,2:10},ai:{},alertT:{},divDirty:true,selDirty:true,landCount:0,
    voices:[],tab:null,place:null,country:null,lastVoice:{}};
  for(let i=0;i<N;i++)if(G.terr[i]!==WATER)G.landCount++;
  G.provCells=G.cities.map(()=>[]);for(let i=0;i<N;i++)G.provCells[G.prov[i]].push(i);
  initAstar(N);initHash();
  for(const c of G.cities){c.pop=c.cap*(c.owner?.8:.45);c.cp=0;c.cpBy=0;c.cstate='';}
  G.E=[null,newEcon(1),newEcon(2)];
  G.countries=genCountries(seed);
  refreshOwn();
  // identical, mirrored starting positions for both nations
  for(const type of ['farm','farm','lumber','house']){const ci=findBuildSpot(1,type);if(ci<0)continue;addBld(type,1,ci,true);
    const mi=N-1-ci;if(!placeErr(2,type,mi))addBld(type,2,mi,true);else{const c2=findBuildSpot(2,type);if(c2>=0)addBld(type,2,c2,true);}}
  const cap=capitalOf(1),off=[[-14,-10,'inf'],[14,-10,'inf'],[0,16,'inf'],[0,-2,'tank']];
  for(const [dx,dy,t] of off){spawnUnit(t,1,cap.x+dx,cap.y+dy);spawnUnit(t,2,(W*CELL)-(cap.x+dx),(H*CELL)-(cap.y+dy));}
  econTick(0);
  if(!opts.headless)initVisuals();
  return G;
}
const newStats=()=>({built:0,lost:0,kills:0,peak:0,caps:0,blds:0,traded:0,peakPop:0});
// messages for one nation: shown locally in single player, routed to that player online
function note(t,msg,kind,ic,snd){if(!t||!G||G.demo)return;if(G.emit){G.emit(t,['n',msg||'',kind||'',ic||'',snd||'']);return;}
  if(t!==1)return;if(msg)toast(msg,kind,ic);if(snd)sfx(snd);if(snd==='alert')vib(60);}
const capitalOf=t=>G.cities.find(c=>c.type==='capital'&&c.owner===t);
function spawnUnit(type,team,x,y,city,ally){
  const d=UT[type];
  if(!d.air)[x,y]=snapPassable(d.cls,x,y,team);
  const foe=capitalOf(3-team),a0=foe?Math.atan2(foe.y-y,foe.x-x):0;
  const u={id:G.nextId++,type,team,x,y,hp:d.hp,maxHp:d.hp,ang:a0,tAng:a0,state:'idle',path:null,pi:0,pq:false,
    goalX:x,goalY:y,ordX:null,ordY:null,ax:x,ay:y,cd:Math.random(),scan:Math.random()*.3,target:null,chase:null,lastHit:-99,
    flash:0,xp:0,rank:0,dead:false,div:null,vis:[false,team===1,team===2],retreatOn:true,stkT:0,stkX:x,stkY:y,stkN:0,sel:false,rc:null,rcWhy:null,aiDef:null,
    ally:ally==null?null:ally,wallT:-1,fuel:d.fuel||0,warned:false,mv:0,walk:Math.random()*10,trk:0,fireT:-9,men:5,ph:Math.random()*TAU};
  if(d.air){u.landed=!!city;u.base=city||null;u.parkOx=rnd(-9,9);u.parkOy=rnd(-9,9);u.order=null;u.pstate='go';u.trail=[];u.trT=0;u.bT=null;u.bank=0;}
  G.units.push(u);return u;
}
const nearCity=(x,y,team,r)=>{for(const c of G.cities)if((!team||c.owner===team)&&dist2(x,y,c.x,c.y)<r*r)return c;return null};
function nearestCity(x,y,team,filter){let b=null,bd=1e18;for(const c of G.cities){if(c.owner!==team||(filter&&!filter(c)))continue;const d=dist2(x,y,c.x,c.y);if(d<bd){bd=d;b=c;}}return b}
const isBase=c=>c.type==='airbase'||c.type==='capital';
const nearestBase=(x,y,t)=>nearestCity(x,y,t,isBase);
const menOf=u=>Math.max(1,Math.ceil(5*u.hp/u.maxHp));

// ================= COSTS =================
function missing(E,cost,mult=1){for(const k in cost){const v=cost[k]*mult;
  if(k==='$'){if(E.money<v)return 'money';}else if(k==='mp'){if(E.mp<v)return 'manpower';}else if(E.res[k]<v)return RI[k].n.toLowerCase();}return ''}
function pay(E,cost,mult=1){for(const k in cost){const v=cost[k]*mult;if(k==='$')E.money-=v;else if(k==='mp')E.mp-=v;else E.res[k]-=v;}}
function refund(E,cost,mult=1){pay(E,cost,-mult);}
function enqueueUnit(c,t){const E=G.E[c.owner];
  if(!CAN_BUILD[c.type].includes(t))return 'Needs '+(UT[t].air?'an Airbase':'a Factory');
  if(c.queue.length>=5)return 'Queue full';
  if(G.units.filter(u=>u.team===c.owner).length>=UNIT_CAP)return 'Army at maximum size';
  const m=missing(E,UT[t].cost);if(m)return 'Not enough '+m;
  pay(E,UT[t].cost);c.queue.push(t);return '';}

// ================= STRUCTURES =================
function addBld(type,owner,ci,instant){
  if(type==='wall'){G.wall[ci]=owner;G.wallHp[ci]=instant?BT.wall.hp:BT.wall.hp*.2;G.wallHit[ci]=-99;G.wallDirty=true;return null;}
  const x=(ci%G.W+.5)*CELL,y=((ci/G.W|0)+.5)*CELL;
  const b={id:G.nextId++,type,owner,ci,x,y,hp:BT[type].hp,maxHp:BT[type].hp,prog:instant?1:0,city:null,eff:0,smokeT:Math.random()};
  if(type==='house')b.city=nearestCity(x,y,owner);
  G.blds.push(b);G.bAt.set(ci,b);return b;
}
function removeBld(b){G.blds=G.blds.filter(x=>x!==b);G.bAt.delete(b.ci);if(G.place)G.placeDirty=true;}
function damageWall(i,amt){G.wallHp[i]-=amt;G.wallHit[i]=G.time;
  if(G.wallHp[i]<=0){const t=G.wall[i];G.wall[i]=0;G.wallDirty=true;const x=(i%G.W+.5)*CELL,y=((i/G.W|0)+.5)*CELL;explode(x,y,.9);debris(x,y,10);
    if(t&&!(G.alertT['wall'+t]>G.time)){G.alertT['wall'+t]=G.time+15;note(t,'Enemy breached your wall!','bad','wall');}}}
function damageBld(b,amt,by){b.hp-=amt;if(b.hp<=0)destroyBld(b,by);}
function destroyBld(b,by){
  removeBld(b);explode(b.x,b.y,1.3);scorch(b.x,b.y,10,.35);debris(b.x,b.y,12);burn(b.x,b.y,25);
  const E=G.E[b.owner];if(!E)return;
  E.sh.attack=Math.max(-30,E.sh.attack-(b.type==='house'?5:2.5));
  if(b.type==='house'&&b.city&&b.city.owner===b.owner){const dead=Math.min(b.city.pop*.04,700);b.city.pop-=dead;E.civDead+=dead;}
  for(const c of G.countries)if(c.persona==='pacifist'&&by)c.rel[by]-=b.type==='house'||b.type==='farm'?3:1.2;
  note(b.owner,`Your ${BT[b.type].n} was destroyed`,'bad',BT[b.type].ico);voice(b.owner,'bombed',{bld:BT[b.type].n.toLowerCase(),city:(b.city||nearestCity(b.x,b.y,b.owner)||{name:''}).name});
}
function captureBld(b,o){b.owner=o;b.prog=Math.max(b.prog,.5);if(b.type==='house')b.city=nearestCity(b.x,b.y,o);}

// ================= COMBAT =================
function weaponFor(u,t){const d=UT[u.type];return t.air?d.a:d.g}
function inWeapon(u,t){const w=weaponFor(u,t);if(!w)return false;const dd=dist2(u.x,u.y,t.x,t.y);return dd<=(w.range+2)**2&&(!w.min||dd>=w.min*w.min)}
function findTarget(u,extra){
  if(G.peace)return null;
  const d=UT[u.type];let best=null,bs=1e18;
  const R=Math.max(d.g?d.g.range:0,d.a?d.a.range:0)+extra;
  queryHash(u.x,u.y,R,e=>{
    if(e.team===u.team||e.dead||!e.vis[u.team])return;
    const w=e.air?d.a:d.g;if(!w)return;
    if(extra&&e.air)return;
    const r=w.range+extra,dd=dist2(u.x,u.y,e.x,e.y);
    if(dd>r*r||(w.min&&dd<w.min*w.min))return;
    let s=dd*(.6+.4*e.hp/e.maxHp);
    if(e.air&&w.dmg>15)s*=.3;
    if(u.type==='tank'&&e.type==='tank')s*=.7;
    if(s<bs){bs=s;best=e;}});
  return best;
}
function cityAlarm(team,x,y,amt){if(!team)return;for(const c of G.cities)if(c.owner===team&&dist2(x,y,c.x,c.y)<130*130){c.panic=Math.min(1,c.panic+amt);const E=G.E[team];E.sh.attack=Math.max(-30,E.sh.attack-amt*1.2);}}
function damage(t,amt,ap,src){
  if(t.dead)return;const d=UT[t.type];let m=1;
  if(d.arm)m*=.3+.7*ap;
  if(!d.air){const ci=cellIdx(t.x,t.y);m*=DEF[d.cls][G.terr[ci]];if(nearCity(t.x,t.y,0,26))m*=.8;if(nearWall(ci,t.team))m*=.7;}
  const men0=t.type==='inf'?menOf(t):0;
  t.hp-=amt*m;t.lastHit=G.time;t.flash=.07;
  if(Math.random()<.15)cityAlarm(t.team,t.x,t.y,.06);
  if(t.hp<=0){kill(t,src);return;}
  if(t.type==='inf'){const men1=menOf(t);for(let k=men1;k<men0;k++){const p=soldierPos(t,k);fallen(p[0],p[1],t.team,t.ang);}}
}
function nearWall(ci,team){const W=G.W;for(let k=0;k<4;k++){const n=ci+DX[k]+DY[k]*W;if(n>=0&&n<G.W*G.H&&G.wall[n]===team)return true;}return false}
function kill(t,src){
  t.dead=true;t.hp=0;const d=UT[t.type];
  if(d.air)addFalling(t);
  else if(t.type==='inf'){for(let k=0;k<menOf({hp:t.maxHp*.2,maxHp:t.maxHp})+1;k++){const p=soldierPos(t,k);fallen(p[0],p[1],t.team,t.ang+rnd(-1,1));}puff(t.x,t.y,'rgba(120,110,90,.8)',5);}
  else{explode(t.x,t.y,1.4);scorch(t.x,t.y,8,.35);debris(t.x,t.y,10);addWreck(t);shakeAt(t.x,t.y,3);}
  if(src&&!src.dead){src.xp++;src.rank=src.xp>=12?3:src.xp>=6?2:src.xp>=2?1:0;}
  const E=G.E[t.team];if(t.ally==null){E.cas+=d.cost.mp;E.weary+=d.cost.mp/140;}
  G.stats[t.team].lost++;if(src&&src.team!==t.team)G.stats[src.team].kills++;
  G.selDirty=true;
}
// where each soldier of a squad stands (world coords)
const SQUAD=[[3,0],[-1,-3.6],[-1,3.6],[-5,-1.8],[-5,1.8]];
function soldierPos(u,k){const s=unitScale(),o=SQUAD[k%5],c=Math.cos(u.ang),n=Math.sin(u.ang),ox=o[0]*s*1.5,oy=o[1]*s*1.5;return [u.x+ox*c-oy*n,u.y+ox*n+oy*c]}
function muzzlePos(u,k){const d=UT[u.type],s=unitScale();
  if(u.type==='inf'){const p=soldierPos(u,k||0),a=u.ang;return [p[0]+Math.cos(a)*3.2*s,p[1]+Math.sin(a)*3.2*s]}
  if(u.type==='tank')return [u.x+Math.cos(u.tAng)*12*s,u.y+Math.sin(u.tAng)*12*s];
  if(u.type==='aa')return [u.x+Math.cos(u.ang)*-1.5*s+Math.cos(u.tAng)*7*s,u.y+Math.sin(u.ang)*-1.5*s+Math.sin(u.tAng)*7*s];
  if(u.type==='art')return [u.x+Math.cos(u.ang)*11*s,u.y+Math.sin(u.ang)*11*s];
  const side=(k||0)%2?1:-1,sp=u.type==='bmb'?3:5,c=Math.cos(u.ang),n=Math.sin(u.ang);return [u.x+c*4*s-n*side*sp*s,u.y+n*4*s+c*side*sp*s];
}
function fire(u,t,isPlane){
  const d=UT[u.type],w=t.air?d.a:d.g,vet=1+.15*u.rank,dmg=w.dmg*vet;
  u.cd=w.cd*rnd(.9,1.1);u.fireT=G.time;
  const a=Math.atan2(t.y-u.y,t.x-u.x);
  if(!isPlane){if(u.type==='tank'||u.type==='aa'){}else u.ang=a;}
  if(w.shell){const [mx,my]=muzzlePos(u),D=Math.sqrt(dist2(mx,my,t.x,t.y));
    G.proj.push({kind:'shell',sx:mx,sy:my,tx:t.x+rnd(-9,9),ty:t.y+rnd(-9,9),t:0,dur:D/170+.5,dmg,splash:w.splash,ap:d.ap,team:u.team,src:u});
    mzFx(mx,my,u.ang,2.2,0);smoke(mx,my,6);shakeAt(u.x,u.y,1);sfx('cannon',u.x,u.y);shotEv(u,'shell',1,G.proj[G.proj.length-1].tx,G.proj[G.proj.length-1].ty,G.proj[G.proj.length-1].dur,0);return;}
  if(w.bomb){const p={kind:'bomb',sx:u.x,sy:u.y,tx:t.x+rnd(-5,5),ty:t.y+rnd(-5,5),t:0,dur:.75,dmg,splash:w.splash,ap:d.ap,team:u.team,src:u,ang:u.ang};G.proj.push(p);sfx('whistle',u.x,u.y);shotEv(u,'bomb',1,p.tx,p.ty,p.dur,0);return;}
  const kind=u.type==='tank'?'ap':u.type==='aa'&&t.air?'flak':'bullet';
  const n=u.type==='inf'?Math.min(3,menOf(u)):u.type==='aa'?4:isPlane?4:u.type==='tank'?1:2;
  const speed=kind==='ap'?900:kind==='flak'?620:720;
  for(let k=0;k<n;k++){const [mx,my]=muzzlePos(u,u.type==='inf'?(k*2+((G.time*7)|0))%menOf(u):k),tx=t.x+rnd(-3,3),ty=t.y+rnd(-3,3),D=Math.sqrt(dist2(mx,my,tx,ty));
    G.proj.push({kind,sx:mx,sy:my,tx,ty,t:-k*(u.type==='aa'?.06:.09),dur:D/speed,dmg:k===0?dmg:0,ap:d.ap,team:u.team,src:u,tgt:t,air:!!t.air});
    mzFx(mx,my,isPlane?u.ang:u.type==='tank'||u.type==='aa'?u.tAng:a,kind==='ap'?1.6:.6,k*(u.type==='aa'?.06:.09));}
  shotEv(u,kind,n,t.x,t.y,0,u.type==='aa'?.06:.09);
  if(kind==='ap'){smoke(...muzzlePos(u),3);shakeAt(u.x,u.y,.6);sfx('cannon',u.x,u.y);}else sfx(kind==='flak'?'flak':'shot',u.x,u.y);
}
function fireAtWall(u,wi){
  const d=UT[u.type],w=d.g;if(!w)return;const x=(wi%G.W+.5)*CELL,y=((wi/G.W|0)+.5)*CELL;
  u.cd=w.cd*rnd(.9,1.1);u.fireT=G.time;if(u.type!=='tank'&&u.type!=='aa')u.ang=Math.atan2(y-u.y,x-u.x);
  if(w.shell){const p={kind:'shell',sx:u.x,sy:u.y,tx:x+rnd(-4,4),ty:y+rnd(-4,4),t:0,dur:Math.sqrt(dist2(u.x,u.y,x,y))/170+.5,dmg:w.dmg,splash:w.splash,ap:d.ap,team:u.team,src:u};G.proj.push(p);shotEv(u,'shell',1,p.tx,p.ty,p.dur,0);return;}
  const [mx,my]=muzzlePos(u,0),kind=u.type==='tank'?'ap':'bullet';
  G.proj.push({kind,sx:mx,sy:my,tx:x+rnd(-3,3),ty:y+rnd(-3,3),t:0,dur:Math.sqrt(dist2(mx,my,x,y))/800,dmg:0,wi,wdmg:w.dmg*(u.type==='tank'?1.6:u.type==='inf'?.5:1)*(1+.15*u.rank),team:u.team});
  mzFx(mx,my,u.type==='tank'?u.tAng:u.ang,kind==='ap'?1.6:.6,0);shotEv(u,kind,1,x,y,0,0);sfx(kind==='ap'?'cannon':'shot',u.x,u.y);
}
function updateProj(dt){let any=false;for(const p of G.proj){p.t+=dt;if(p.t>=p.dur){p.done=true;any=true;if(!p.vis)projHit(p);}}if(any)G.proj=G.proj.filter(p=>!p.done);}
function projHit(p){
  if(p.kind==='shell'||p.kind==='bomb'){splash(p);return;}
  if(p.wi!=null){if(G.wall[p.wi]&&G.wall[p.wi]!==p.team)damageWall(p.wi,p.wdmg);puff(p.tx,p.ty,'rgba(200,200,190,.9)',p.kind==='ap'?6:2);return;}
  const t=p.tgt;
  if(p.dmg&&t&&!t.dead)damage(t,p.dmg,p.ap,p.src&&!p.src.dead?p.src:null);
  if(p.kind==='ap'){exFx(p.tx,p.ty,5);sparks(p.tx,p.ty,6);}
  else if(p.kind==='flak'){flakFx(p.tx+rnd(-8,8),p.ty+rnd(-8,8));}
  else if(!p.air){puff(p.tx,p.ty,t&&UT[t.type].arm?'rgba(255,220,150,.9)':'rgba(140,120,90,.7)',2);}
}
function splash(p){
  const R=p.splash,src=p.src&&!p.src.dead?p.src:null;
  queryHash(p.tx,p.ty,R+8,e=>{if(e.team===p.team||e.dead||UT[e.type].air)return;const dd=Math.hypot(e.x-p.tx,e.y-p.ty);if(dd>R)return;damage(e,p.dmg*(1-.6*dd/R),p.ap,src);});
  const W=G.W,x0=Math.max(0,Math.floor((p.tx-R)/CELL)),x1=Math.min(W-1,Math.floor((p.tx+R)/CELL)),y0=Math.max(0,Math.floor((p.ty-R)/CELL)),y1=Math.min(G.H-1,Math.floor((p.ty+R)/CELL));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x,cx=(x+.5)*CELL,cy=(y+.5)*CELL;if(dist2(cx,cy,p.tx,p.ty)>R*R)continue;
    const w=G.wall[i];if(w&&w!==p.team)damageWall(i,p.dmg*1.4);
    const b=G.bAt.get(i);if(b&&b.owner!==p.team)damageBld(b,p.dmg*(p.kind==='bomb'?1.5:.8),p.team);}
  for(const c of G.cities)if(c.owner&&c.owner!==p.team&&dist2(p.tx,p.ty,c.x,c.y)<140*140)cityAlarm(c.owner,p.tx,p.ty,p.kind==='bomb'?.5:.25);
  if(p.kind==='bomb')for(const c of G.countries)if(c.persona==='pacifist'&&G.cities.some(k=>k.owner&&k.owner!==p.team&&dist2(p.tx,p.ty,k.x,k.y)<90*90))c.rel[p.team]-=.6;
  const big=p.kind==='bomb';explode(p.tx,p.ty,big?1.6:1);scorch(p.tx,p.ty,big?9:5,big?.4:.22);debris(p.tx,p.ty,big?14:7);if(big)crater(p.tx,p.ty);
  shakeAt(p.tx,p.ty,big?4:1.5);sfx('boom',p.tx,p.ty);
}

// ================= ORDERS / DIVISIONS =================
function setMove(u,x,y,force){
  u.ordX=x;u.ordY=y;
  if(u.state==='retreat'&&!force)return;
  u.state='move';u.rc=null;u.rcWhy=null;u.chase=null;u.target=null;u.stkN=0;u.stkT=0;u.stkX=u.x;u.stkY=u.y;u.wallT=-1;
  requestPath(u,x,y);
}
function arrive(u){u.state='idle';u.path=null;u.ax=u.x;u.ay=u.y;u.stkN=0;}
function orderPlane(u,x,y){
  if(x==null){u.order=null;u.bT=null;if(!u.landed){u.pstate='rtb';u.base=nearestBase(u.x,u.y,u.team);}return;}
  const b=G.cities.find(c=>c.owner===u.team&&isBase(c)&&dist2(c.x,c.y,x,y)<40*40);
  if(b){u.order=null;if(!u.landed||u.base!==b){u.landed=false;u.pstate='rtb';u.base=b;}return;}
  u.order={x,y};u.pstate='go';u.bT=null;
  if(u.landed&&u.fuel>UT[u.type].fuel*.35)takeoff(u);
}
function takeoff(u){u.landed=false;u.pstate='go';if(u.order)u.ang=Math.atan2(u.order.y-u.y,u.order.x-u.x);}
function land(u,b){u.landed=true;u.base=b;u.pstate='go';u.target=null;u.trail=[];u.bT=null;if(u.order&&(u.order.auto||dist2(u.order.x,u.order.y,b.x,b.y)<1600))u.order=null;}
function orderMove(list,x,y,force){
  const ground=[],air=[];
  for(const u of list){if(u.dead)continue;(UT[u.type].air?air:ground).push(u);}
  air.forEach((u,i)=>orderPlane(u,x+(i%3-1)*14,y+((i/3|0)%3-1)*14));
  if(!ground.length)return;
  const T=ground[0].team;
  if(ground.length===1){const [sx,sy]=snapPassable(UT[ground[0].type].cls,x,y,T);setMove(ground[0],sx,sy,true);return;}
  const n=ground.length;let cx=0,cy=0;for(const u of ground){cx+=u.x;cy+=u.y;}cx/=n;cy/=n;
  let fx=x-cx,fy=y-cy,L=Math.hypot(fx,fy);if(L<1){fx=1;fy=0;L=1;}fx/=L;fy/=L;const px=-fy,py=fx;
  ground.sort((a,b)=>UT[a.type].row-UT[b.type].row);
  const cols=Math.max(1,Math.ceil(Math.sqrt(n*2.2))),rows=Math.ceil(n/cols),SP=15;
  for(let r=0;r<rows;r++){const ch=ground.slice(r*cols,(r+1)*cols),m=ch.length;
    ch.sort((a,b)=>(a.x*px+a.y*py)-(b.x*px+b.y*py));
    for(let i=0;i<m;i++){const lat=(i-(m-1)/2)*SP,fw=((rows-1)/2-r)*SP;
      const [sx,sy]=snapPassable(UT[ch[i].type].cls,x+px*lat+fx*fw,y+py*lat+fy*fw,T);setMove(ch[i],sx,sy,force);}}
}
function startRetreat(u,manual,why){
  const c=nearestCity(u.x,u.y,u.team);if(!c)return;
  if(!manual&&dist2(u.x,u.y,c.x,c.y)<60*60)return;
  u.state='retreat';u.rc=c;u.rcWhy=why||'hp';u.target=null;u.chase=null;u.wallT=-1;requestPath(u,c.x+rnd(-14,14),c.y+rnd(-14,14));
}
function endRetreat(u){u.rc=null;u.rcWhy=null;if(u.ordX!=null&&u.div){u.state='idle';setMove(u,u.ordX,u.ordY,true);}else{u.state='idle';u.path=null;arrive(u);}}
function makeDiv(team,list){
  for(const u of list)removeFromDiv(u);
  const used=new Set(G.divs.filter(d=>d.team===team).map(d=>d.num));let num=1;while(used.has(num))num++;
  const div={id:G.nextId++,team,num,short:ordinal(num),name:ordinal(num)+' Division',color:DIVC[(num-1)%DIVC.length],units:list.slice(),st0:0,target:null,reT:0};
  for(const u of list)u.div=div;G.divs.push(div);G.divDirty=true;return div;
}
function removeFromDiv(u){const d=u.div;if(!d)return;const i=d.units.indexOf(u);if(i>=0)d.units.splice(i,1);u.div=null;G.divDirty=true;}
function disband(div){for(const u of div.units)u.div=null;div.units=[];G.divs=G.divs.filter(d=>d!==div);G.divDirty=true;}
const strength=l=>l.reduce((s,u)=>s+UT[u.type].cost.$*u.hp/u.maxHp,0);
function centroid(l){let x=0,y=0,n=0;for(const u of l){if(UT[u.type].air)continue;x+=u.x;y+=u.y;n++;}if(!n)for(const u of l){x+=u.x;y+=u.y;n++;}return n?{x:x/n,y:y/n}:null}

// ================= UNIT UPDATE =================
function moveGround(u,dt,gx,gy,mul){
  const d=UT[u.type],T=u.team,ci=cellIdx(u.x,u.y);let sp=SPEED[d.cls][G.terr[ci]]||.5;sp*=d.speed*(mul||1)*(G.road[ci]?1.35:1);
  let vx=0,vy=0,moving=false;
  if(gx!==undefined){const dx=gx-u.x,dy=gy-u.y,L=Math.hypot(dx,dy);if(L>.5){const s=Math.min(sp*dt,L);vx=dx/L*s;vy=dy/L*s;
    const ta=Math.atan2(dy,dx);if(d.cls==='veh'){const mt=(u.type==='tank'?2.6:3.2)*dt;u.ang+=clamp(wrapA(ta-u.ang),-mt,mt);if(Math.abs(wrapA(ta-u.ang))>1){vx*=.25;vy*=.25;}}else u.ang=ta;moving=true;}}
  let px=0,py=0;
  queryHash(u.x,u.y,18,o=>{if(o===u||o.dead||UT[o.type].air)return;const dx=u.x-o.x,dy=u.y-o.y,md=d.r+UT[o.type].r+1.5,dd=dx*dx+dy*dy;
    if(dd<md*md){if(dd<1e-4){px+=Math.random()-.5;py+=Math.random()-.5;return;}const L=Math.sqrt(dd),p=(md-L)/md;px+=dx/L*p;py+=dy/L*p;}});
  vx+=px*20*dt;vy+=py*20*dt;
  if(!vx&&!vy){u.mv=0;return false;}
  const cls=d.cls,nx=u.x+vx,ny=u.y+vy,here=passable(cls,u.x,u.y,T),ox=u.x,oy=u.y;
  if(!here||(passable(cls,nx,ny,T)&&(passable(cls,nx,u.y,T)||passable(cls,u.x,ny,T)))){u.x=nx;u.y=ny;}
  else{
    if(moving&&!G.peace){const wi=cellIdx(u.x+Math.cos(u.ang)*CELL*.75,u.y+Math.sin(u.ang)*CELL*.75);if(G.wall[wi]&&G.wall[wi]!==T)u.wallT=wi;}
    if(passable(cls,nx,u.y,T))u.x=nx;else if(passable(cls,u.x,ny,T))u.y=ny;
  }
  u.x=clamp(u.x,1,G.W*CELL-1);u.y=clamp(u.y,1,G.H*CELL-1);
  const md=Math.hypot(u.x-ox,u.y-oy);u.mv=moving&&md>.01?md/dt:0;u.walk+=md;
  if(d.cls==='veh'&&md>0){u.trk+=md;if(u.trk>4.5){u.trk=0;trackMark(u);}}
  return moving;
}
function updateGround(u,dt){
  const d=UT[u.type],E=G.E[u.team],ci=cellIdx(u.x,u.y),o=G.own[ci],veh=d.cls==='veh';
  if(o===u.team){if(G.time-u.lastHit>4)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*(nearCity(u.x,u.y,u.team,44)?.06:.012)*dt);}
  else if(o&&u.hp>u.maxHp*.4)u.hp-=u.maxHp*.004*dt;
  if(veh&&o===u.team&&u.fuel<d.fuel){const need=Math.min((nearCity(u.x,u.y,u.team,95)?7:1)*dt,d.fuel-u.fuel),cost=need*.08;
    if(E.res.oil>=cost){u.fuel+=need;E.res.oil-=cost;E.fuelUse+=cost;}else E.noOil=true;}
  if(u.state!=='retreat'&&u.retreatOn){
    if(u.hp<u.maxHp*.3&&G.time-u.lastHit<6)startRetreat(u,false,'hp');
    else if(veh&&u.fuel<d.fuel*.12&&o!==u.team)startRetreat(u,false,'fuel');}
  if(u.state==='retreat'){
    if(!u.rc||u.rc.owner!==u.team){const c=nearestCity(u.x,u.y,u.team);if(c){u.rc=c;requestPath(u,c.x+rnd(-14,14),c.y+rnd(-14,14));}else{u.rc=null;arrive(u);}}
    if(u.hp>=u.maxHp*.9&&(!veh||u.fuel>=d.fuel*.85||E.res.oil<1))endRetreat(u);
  }
  u.scan-=dt;
  if(u.scan<=0){u.scan=rnd(.22,.34);
    if(u.state==='retreat'){u.target=null;u.chase=null;}
    else{u.target=findTarget(u,0);u.chase=null;if(!u.target&&u.state==='idle'&&u.type!=='art')u.chase=findTarget(u,50);}}
  let t=u.target;
  if(t&&(t.dead||t.landed||!t.vis[u.team]||!inWeapon(u,t)))t=u.target=null;
  // turrets traverse toward the target (tanks & AA), hull keeps driving
  const turret=u.type==='tank'||u.type==='aa';
  if(turret){const want=t?Math.atan2(t.y-u.y,t.x-u.x):u.wallT>=0?Math.atan2(((u.wallT/G.W|0)+.5)*CELL-u.y,(u.wallT%G.W+.5)*CELL-u.x):u.ang,tr=(u.type==='aa'?5:2.2)*dt;u.tAng+=clamp(wrapA(want-u.tAng),-tr,tr);}
  const aimed=t&&(!turret||Math.abs(wrapA(Math.atan2(t.y-u.y,t.x-u.x)-u.tAng))<.2);
  let gx,gy,mul=1;
  if(veh&&u.fuel<=0)mul=.15;
  if(t){if(!turret)u.ang=Math.atan2(t.y-u.y,t.x-u.x);if(u.cd<=0&&aimed)fire(u,t);
    if(u.type==='tank'&&u.state==='move'&&u.path){}else{moveGround(u,dt);return;}}
  if(u.wallT>=0){const wi=u.wallT,wx=(wi%G.W+.5)*CELL,wy=((wi/G.W|0)+.5)*CELL;
    if(G.wall[wi]&&G.wall[wi]!==u.team&&!G.peace&&u.state!=='retreat'&&dist2(u.x,u.y,wx,wy)<(d.g&&d.g.shell?150:34)**2){
      if(d.g&&u.cd<=0&&(!turret||Math.abs(wrapA(Math.atan2(wy-u.y,wx-u.x)-u.tAng))<.25))fireAtWall(u,wi);u.stkT=0;moveGround(u,dt);return;}
    u.wallT=-1;}
  if(u.state==='move'||u.state==='retreat'){
    if(u.state==='retreat')mul*=1.2;
    if(u.path){const tx=u.path[u.pi*2],ty=u.path[u.pi*2+1],last=u.pi*2+2>=u.path.length,dd=dist2(u.x,u.y,tx,ty);
      if(dd<(last?4:36)){u.pi++;if(last){u.path=null;if(u.state==='move')arrive(u);}}else{gx=tx;gy=ty;}}
    else if(u.pq){gx=u.goalX;gy=u.goalY;}
    else if(u.state==='move')arrive(u);
  }else{
    const c=u.chase;
    if(c&&!c.dead&&dist2(u.ax,u.ay,c.x,c.y)<110*110){gx=c.x;gy=c.y;}
    else{u.chase=null;if(dist2(u.x,u.y,u.ax,u.ay)>25){gx=u.ax;gy=u.ay;}}
  }
  if(u.state==='move'){u.stkT+=dt;if(u.stkT>1.5){
    if(dist2(u.x,u.y,u.stkX,u.stkY)<9){u.stkN++;if(dist2(u.x,u.y,u.goalX,u.goalY)<35*35||u.stkN>=3)arrive(u);else requestPath(u,u.goalX,u.goalY);}else u.stkN=0;
    u.stkT=0;u.stkX=u.x;u.stkY=u.y;}}
  const ox=u.x,oy=u.y;
  moveGround(u,dt,gx,gy,mul*(t?.6:1));
  if(veh&&gx!==undefined&&u.fuel>0){u.fuel=Math.max(0,u.fuel-Math.hypot(u.x-ox,u.y-oy)/d.speed);
    if(u.fuel<=0&&!u.warned){u.warned=true;note(u.team,`${d.name} out of petrol!`,'bad','oil');voice(u.team,'nofuel',{city:(nearestCity(u.x,u.y,u.team)||{name:'the front'}).name});}}
  if(u.fuel>d.fuel*.3)u.warned=false;
}
function planeTarget(u){
  const d=UT[u.type],cx=u.order?u.order.x:u.x,cy=u.order?u.order.y:u.y;let best=null,bs=1e18;
  queryHash(u.x,u.y,d.vis,e=>{if(e.team===u.team||e.dead||!e.vis[u.team])return;const w=e.air?d.a:d.g;if(!w)return;
    if(dist2(cx,cy,e.x,e.y)>150*150)return;let s=dist2(u.x,u.y,e.x,e.y);
    if(e.air&&u.type==='ftr')s*=.15;
    if(u.type==='bmb'){if(e.type==='art'||e.type==='tank')s*=.5;if(e.type==='aa')s*=3;}
    if(s<bs){bs=s;best=e;}});
  return best;
}
function structTarget(u){
  const o=u.order;if(!o)return null;let best=null,bd=75*75;
  for(const b of G.blds){if(b.owner===u.team||!b.owner)continue;const d=dist2(o.x,o.y,b.x,b.y);if(d<bd){bd=d;best={x:b.x,y:b.y};}}
  if(best)return best;
  const W=G.W,cx=Math.floor(o.x/CELL),cy=Math.floor(o.y/CELL);
  for(let y=cy-4;y<=cy+4;y++)for(let x=cx-4;x<=cx+4;x++){if(x<0||y<0||x>=W||y>=G.H)continue;const w=G.wall[y*W+x];if(w&&w!==u.team){const px=(x+.5)*CELL,py=(y+.5)*CELL,d=dist2(o.x,o.y,px,py);if(d<bd){bd=d;best={x:px,y:py};}}}
  return best;
}
function updatePlane(u,dt){
  const d=UT[u.type],E=G.E[u.team];
  if(u.landed){const b=u.base;
    if(!b||b.owner!==u.team){u.landed=false;u.base=null;u.pstate='rtb';}
    else{u.x=b.x+u.parkOx;u.y=b.y+u.parkOy;
      const need=Math.min(d.fuel/6*dt,d.fuel-u.fuel),cost=need*.12;
      if(need>0){if(E.res.oil>=cost){u.fuel+=need;E.res.oil-=cost;E.fuelUse+=cost;}else E.noOil=true;}
      u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.1*dt);
      if(u.fuel>=d.fuel*.98&&u.hp>=u.maxHp*.6){
        if(u.order)takeoff(u);
        else if(!G.peace){u.scan-=dt;if(u.scan<=0){u.scan=.5;let e=null,bd=170*170;
          for(const o of G.units){if(o.team===u.team||o.dead||o.landed||!o.vis[u.team])continue;if(u.type==='bmb'&&UT[o.type].air)continue;const dd=dist2(b.x,b.y,o.x,o.y);if(dd<bd){bd=dd;e=o;}}
          if(e){u.order={x:e.x,y:e.y,auto:true};takeoff(u);}}}}
      return;}
  }
  u.fuel-=dt;
  if(u.fuel<=0){note(u.team,d.name+' ran out of fuel and crashed','bad','oil');kill(u,null);return;}
  u.trT-=dt;if(u.trT<=0){u.trT=.05;u.trail.push(u.x,u.y);if(u.trail.length>24)u.trail.splice(0,2);}
  if(u.pstate!=='rtb'){const b=nearestBase(u.x,u.y,u.team);
    if(b&&(u.fuel<Math.sqrt(dist2(b.x,b.y,u.x,u.y))/d.speed+5||u.hp<u.maxHp*.3)){u.pstate='rtb';u.base=b;}}
  u.scan-=dt;if(u.scan<=0){u.scan=.25;u.target=u.pstate==='rtb'?null:planeTarget(u);
    if(!u.target&&u.type==='bmb'&&u.pstate!=='rtb'&&!G.peace)u.bT=structTarget(u);else u.bT=null;}
  let t=u.target;if(t&&(t.dead||t.landed||!t.vis[u.team]))t=u.target=null;
  let gx,gy,loiter=false;
  if(u.pstate==='rtb'){let b=u.base;if(!b||b.owner!==u.team)b=u.base=nearestBase(u.x,u.y,u.team);
    if(b){gx=b.x;gy=b.y;if(dist2(u.x,u.y,b.x,b.y)<14*14){land(u,b);return;}}
    else if(u.order){gx=u.order.x;gy=u.order.y;loiter=true;}else{gx=u.x;gy=u.y;loiter=true;}}
  else if(t){gx=t.x;gy=t.y;}
  else if(u.bT){gx=u.bT.x;gy=u.bT.y;}
  else if(u.order){gx=u.order.x;gy=u.order.y;loiter=true;}
  else{const b=nearestBase(u.x,u.y,u.team);if(b){u.pstate='rtb';u.base=b;gx=b.x;gy=b.y;}else{gx=u.x;gy=u.y;loiter=true;}}
  const dx=gx-u.x,dy=gy-u.y,L=Math.hypot(dx,dy);
  const desired=(loiter&&L<42)?u.ang+(u.id%2?1:-1):Math.atan2(dy,dx);
  const mt=d.turn*dt,turn=clamp(wrapA(desired-u.ang),-mt,mt);u.ang+=turn;u.bank+=((turn/(mt||1))-u.bank)*Math.min(1,dt*4);
  const sp=d.speed*(u.pstate==='rtb'?1.05:1);
  let nx=clamp(u.x+Math.cos(u.ang)*sp*dt,-30,G.W*CELL+30),ny=clamp(u.y+Math.sin(u.ang)*sp*dt,-30,G.H*CELL+30);
  if(G.peace){const o=G.own[cellIdx(nx,ny)];if(o&&o!==u.team){const b=nearestBase(u.x,u.y,u.team)||capitalOf(u.team);if(b)u.ang=Math.atan2(b.y-u.y,b.x-u.x);nx=u.x+Math.cos(u.ang)*sp*dt;ny=u.y+Math.sin(u.ang)*sp*dt;}}
  u.x=nx;u.y=ny;
  if(u.cd<=0){
    if(t){const w=weaponFor(u,t);if(w&&dist2(u.x,u.y,t.x,t.y)<w.range*w.range&&(w.bomb||Math.abs(wrapA(Math.atan2(t.y-u.y,t.x-u.x)-u.ang))<.55))fire(u,t,true);}
    else if(u.bT&&dist2(u.x,u.y,u.bT.x,u.bT.y)<22*22){const w=d.g;u.cd=w.cd;const p={kind:'bomb',sx:u.x,sy:u.y,tx:u.bT.x+rnd(-4,4),ty:u.bT.y+rnd(-4,4),t:0,dur:.75,dmg:w.dmg,splash:w.splash,ap:d.ap,team:u.team,src:u,ang:u.ang};G.proj.push(p);sfx('whistle',u.x,u.y);shotEv(u,'bomb',1,p.tx,p.ty,p.dur,0);}
  }
}
function updateUnit(u,dt){u.cd-=dt;if(u.flash>0)u.flash-=dt;if(UT[u.type].air)updatePlane(u,dt);else updateGround(u,dt);}

// ================= VISIBILITY & ENEMY INTEL =================
const FOG=false; // no fog of war: both sides always see every unit and building
function visTick(){
  const U=G.units;
  if(!FOG){for(const u of U){u.vis[1]=true;u.vis[2]=true;}for(const c of G.cities)c.seen1=true;
    for(const T of [1,2]){const S=aiState(T),mem=S.mem;
      for(const e of U){if(e.team===T||e.dead)continue;let m=mem.get(e.id);if(!m){m={first:G.time};mem.set(e.id,m);}m.x=e.x;m.y=e.y;m.type=e.type;m.t=G.time;m.u=e;m.air=!!UT[e.type].air;m.landed=e.landed;}
      for(const [id,m] of mem)if(m.u.dead)mem.delete(id);
      for(const b of G.blds)if(b.owner!==T)S.bseen.add(b.id);}
    return;}
  for(const u of U){u.vis[1]=u.team===1;u.vis[2]=u.team===2;}
  for(const u of U){if(u.dead||u.landed)continue;const V=UT[u.type].vis,V2=V*V,t=u.team;
    queryHash(u.x,u.y,V,e=>{if(e.team!==t&&!e.vis[t]&&dist2(u.x,u.y,e.x,e.y)<V2)e.vis[t]=true;});}
  for(const c of G.cities){c.seen1=c.owner===1;if(!c.owner)continue;const t=c.owner;queryHash(c.x,c.y,130,e=>{if(e.team!==t&&!e.vis[t]&&dist2(c.x,c.y,e.x,e.y)<16900)e.vis[t]=true;if(e.team===1&&!e.landed)c.seen1=true;});}
  for(const e of U){if(e.dead)continue;const o=G.own[cellIdx(e.x,e.y)];if(o&&o!==e.team)e.vis[o]=true;}
  // each side only remembers what it has actually seen (memory fades after 30s)
  G.visN++;
  for(const T of [1,2]){const S=aiState(T),mem=S.mem;
    for(const e of U){if(e.team===T||e.dead||!e.vis[T])continue;let m=mem.get(e.id);if(!m){m={first:G.time};mem.set(e.id,m);}m.x=e.x;m.y=e.y;m.type=e.type;m.t=G.time;m.u=e;m.air=!!UT[e.type].air;m.landed=e.landed;}
    for(const [id,m] of mem)if(G.time-m.t>30||m.u.dead)mem.delete(id);
    if(G.visN%5===0){const mine=U.filter(u=>u.team===T&&!u.dead&&!u.landed);
      for(const b of G.blds){if(b.owner===T||S.bseen.has(b.id))continue;if(mine.some(u=>dist2(u.x,u.y,b.x,b.y)<170*170)||G.cities.some(c=>c.owner===T&&dist2(c.x,c.y,b.x,b.y)<150*150))S.bseen.add(b.id);}}}
}

// ================= CITY-BY-CITY CONQUEST =================
function refreshOwn(){
  const N=G.W*G.H,own=G.own,P=G.prov,C=G.cities,D=G.ovImg&&G.ovImg.data;let lp=0,le=0;
  for(let i=0;i<N;i++){const o=C[P[i]].owner;own[i]=o;if(G.terr[i]!==WATER){if(o===1)lp++;else if(o===2)le++;}}
  G.terrPct[1]=lp/G.landCount;G.terrPct[2]=le/G.landCount;for(const t of [1,2])G.stats[t].peak=Math.max(G.stats[t].peak,G.terrPct[t]);
  G.placeDirty=true;if(!G.ovImg)return;
  for(let i=0;i<N;i++){const o=own[i],j=i*4;if(!o){D[j+3]=0;continue;}const c=TC[o].rgb;D[j]=c[0];D[j+1]=c[1];D[j+2]=c[2];D[j+3]=G.terr[i]===WATER?14:40;}
  G.ovCtx.putImageData(G.ovImg,0,0);
  const W=G.W,H=G.H,f=new Float32Array(N),g=new Float32Array(N);
  const field=t=>{for(let i=0;i<N;i++)f[i]=own[i]===t?1:0;
    for(let pass=0;pass<2;pass++){for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;s+=f[Y*W+X];n++;}g[y*W+x]=s/n;}f.set(g);}
    return contour(i=>f[i]-.5);};
  G.pathP=field(1);G.pathE=field(2);
}
function terrTick(dt){
  let changed=false;
  for(const c of G.cities){
    const w=[0,0,0];
    queryHash(c.x,c.y,CAP_R,u=>{if(u.dead||UT[u.type].air||dist2(u.x,u.y,c.x,c.y)>CAP_R*CAP_R)return;w[u.team]+=UT[u.type].w*(.4+.6*u.hp/u.maxHp)*(u.state==='retreat'?.3:1);});
    const def=c.owner?w[c.owner]:0;let att=0,by=0;
    for(const t of [1,2])if(t!==c.owner&&w[t]>att){att=w[t];by=t;}
    if(by&&!c.owner&&w[3-by]>0)by=-1;
    if(G.peace&&c.owner)by=0;
    c.contest=att;
    if(by>0&&def<.05){if(c.cpBy!==by){c.cpBy=by;c.cp=0;}
      c.cp+=clamp(.05+.03*att,.05,.28)*(c.type==='capital'?.35:1)*(c.owner?1:1.4)*dt;c.cstate='cap';
      if(c.cp>=1){c.cp=0;c.cpBy=0;c.cstate='';cityCaptured(c,by);changed=true;if(G.over)return;}}
    else if(by){c.cstate='fight';}
    else{c.cstate='';c.cp=Math.max(0,c.cp-.12*dt);if(!c.cp)c.cpBy=0;}
  }
  if(changed||G.ownDirty){G.ownDirty=false;refreshOwn();}
}
function contour(f){
  const W=G.W,H=G.H,p=new Path2D(),S=CELL;
  for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){const i=y*W+x;
    const a=f(i),b=f(i+1),c=f(i+W+1),d=f(i+W);
    const k=(a>0?8:0)|(b>0?4:0)|(c>0?2:0)|(d>0?1:0);if(k===0||k===15)continue;
    const X=(x+.5)*S,Y=(y+.5)*S;
    const T=()=>[X+S*a/(a-b),Y],R=()=>[X+S,Y+S*b/(b-c)],B=()=>[X+S*d/(d-c),Y+S],L=()=>[X,Y+S*a/(a-d)];
    const seg=(m,n)=>{const P=m(),Q=n();p.moveTo(P[0],P[1]);p.lineTo(Q[0],Q[1]);};
    switch(k){case 1:case 14:seg(L,B);break;case 2:case 13:seg(B,R);break;case 3:case 12:seg(L,R);break;case 4:case 11:seg(T,R);break;
      case 6:case 9:seg(T,B);break;case 7:case 8:seg(L,T);break;case 5:seg(T,R);seg(L,B);break;case 10:seg(L,T);seg(B,R);break;}}
  return p;
}
function cityCaptured(c,o){
  const prev=c.owner;c.owner=o;c.queue=[];c.prog=0;c.panic=1;
  for(const b of G.blds)if(G.prov[b.ci]===c.id&&b.owner!==o)captureBld(b,o);
  for(const i of G.provCells[c.id])if(G.wall[i])G.wall[i]=o;
  G.ownDirty=true;
  if(G.selCity===c)G.selDirty=true;
  if(c.type==='capital'&&prev){refreshOwn();gameOver(prev===1?'lose':'win','capital');return;}
  if(prev){const fled=c.pop*.3;c.pop-=fled;refugees(prev,fled,c);c.occ=60;G.E[prev].sh.loss=Math.max(-30,G.E[prev].sh.loss-8);}
  else c.occ=20;
  G.E[o].sh.win=Math.min(20,G.E[o].sh.win+(prev?6:3));
  for(const u of G.units)if(u.state==='retreat'&&u.rc===c)u.rc=null;
  G.stats[o].caps++;note(o,(prev?'Captured ':'Annexed ')+c.name,'good','t_army','capture');if(prev)voice(o,'win',{city:c.name});
  if(prev){note(prev,'Lost '+c.name+'!','bad','warn','alert');voice(prev,'lost',{city:c.name});if(Math.random()<.6)voice(o,'occupied',{city:c.name},true);}
}
function production(dt){
  for(const c of G.cities){if(!c.owner||!c.queue.length)continue;
    c.prog+=dt;const t=c.queue[0];
    if(c.prog>=UT[t].time){c.prog=0;c.queue.shift();
      const u=spawnUnit(t,c.owner,c.x+rnd(-12,12),c.y+rnd(-12,12),UT[t].air&&isBase(c)?c:null);
      if(UT[t].air&&!isBase(c))u.pstate='rtb';
      if(!UT[t].air){const a=Math.atan2(G.H*CELL/2-c.y,G.W*CELL/2-c.x)+rnd(-1.2,1.2),[sx,sy]=snapPassable(UT[t].cls,c.x+Math.cos(a)*30,c.y+Math.sin(a)*30,c.owner);setMove(u,sx,sy,true);u.ordX=null;}
      G.stats[c.owner].built++;note(c.owner,'','','','blip');}}
}

// ================= SIMULATION STEP =================
// Pure game rules: runs in the browser (single player) or on the match server (online).
function update(dt){
  G.time+=dt;prepTick();
  rebuildHash();processPaths();
  if((G.visT-=dt)<=0){G.visT=.2;visTick();}
  for(const u of G.units)if(!u.dead)updateUnit(u,dt);
  production(dt);updateProj(dt);
  if((G.terrT-=dt)<=0){G.terrT=.25;terrTick(.25);}
  if((G.econT-=dt)<=0){G.econT=.5;econTick(.5);}
  if(G.over)return;
  if(!G.mp){if(!(G.tut&&G.tut.calm))aiTick(2,dt);if(G.demo)aiTick(1,dt);}
  if(G.units.some(u=>u.dead)){G.units=G.units.filter(u=>!u.dead);
    const n=G.sel.length;G.sel=G.sel.filter(u=>!u.dead);if(G.sel.length!==n)G.selDirty=true;
    for(const d of G.divs.slice()){const m=d.units.length;d.units=d.units.filter(u=>!u.dead);if(d.units.length!==m)G.divDirty=true;if(!d.units.length&&!(d.team!==1&&d.retreating))disband(d);}}
}
