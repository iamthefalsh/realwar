
// ================= BUILDERS & CONSTRUCTION =================
// Placing a structure pays for it and creates a construction site (mat = materials delivered,
// prog = built). Builders fetch materials from the nearest city in loads, carry them to the
// site, then build. Progress can never run ahead of the materials on site.
// Idle builders also repair damaged buildings and walls.
const B_CAP=30,B_REACH=20,B_LOAD=.8;
function siteNeed(b){if(b.need==null){let n=0;const c=BT[b.type].cost;for(const k in c)if(k!=='$')n+=c[k];b.need=Math.max(6,n);}return b.need;}
const siteDone=b=>b.prog>=1;
const crewAt=b=>G.units.filter(u=>!u.dead&&u.type==='eng'&&u.bj&&u.bj.b===b).length;
function depotFor(u,b){return nearestCity(b?b.x:u.x,b?b.y:u.y,u.team)}
function jobValid(u,j){
  if(j.wi!=null){const i=j.wi;return G.wall[i]===u.team&&G.wallHp[i]<BT.wall.hp-1;}
  const b=j.b;if(!b||b.owner!==u.team||!G.blds.includes(b))return false;
  if(j.k==='rep')return siteDone(b)&&b.hp<b.maxHp-1;return !siteDone(b);
}
function pickJob(u){
  const T=u.team;let best=null,bs=1e18;
  for(const b of G.blds){if(b.owner!==T)continue;
    const d=Math.sqrt(dist2(u.x,u.y,b.x,b.y)),crew=crewAt(b);
    if(!siteDone(b)){const need=siteNeed(b),left=need*(1-b.mat)-(b.inb||0);
      if(left>.01){const dep=depotFor(u,b);if(!dep)continue;const sc=Math.sqrt(dist2(u.x,u.y,dep.x,dep.y))+Math.sqrt(dist2(dep.x,dep.y,b.x,b.y))+crew*40;
        if(sc<bs){bs=sc;best={k:'mat',b,ph:'load',dep,amt:Math.min(B_CAP,left)};}}
      else if(b.prog<b.mat){const sc=d+crew*90;if(sc<bs){bs=sc;best={k:'work',b,ph:'go'};}}}
    else if(b.hp<b.maxHp-1&&G.time-(b.hitT||-99)>5){const sc=d+200+crew*120;if(sc<bs){bs=sc;best={k:'rep',b,ph:'go'};}}}
  // walls: new segments start weak and must be finished; damaged ones get repaired
  if(!best||bs>120){const W=G.W,cx=Math.floor(u.x/CELL),cy=Math.floor(u.y/CELL),R=22;
    for(let y=Math.max(0,cy-R);y<=Math.min(G.H-1,cy+R);y++)for(let x=Math.max(0,cx-R);x<=Math.min(W-1,cx+R);x++){const i=y*W+x;
      if(G.wall[i]!==T||G.wallHp[i]>=BT.wall.hp-1||G.time-G.wallHit[i]<5)continue;
      if(G.units.some(o=>o!==u&&o.type==='eng'&&o.bj&&o.bj.wi===i))continue;
      const sc=Math.hypot(x-cx,y-cy)*CELL+60;if(sc<bs){bs=sc;best={k:'wall',wi:i,ph:'go'};}}}
  if(best&&best.k==='mat')best.b.inb=(best.b.inb||0)+best.amt;
  return best;
}
function dropJob(u){const j=u.bj;if(j&&j.k==='mat'&&j.b){j.b.inb=Math.max(0,(j.b.inb||0)-(u.carry||j.amt||0));}u.bj=null;u.carry=0;u.busy=0;}
function goTo(u,x,y){if(dist2(u.x,u.y,x,y)<B_REACH*B_REACH)return true;if(u.state!=='move'||dist2(u.goalX,u.goalY,x,y)>100)setMove(u,x,y,true);return false;}
function updateBuilder(u,dt){
  u.busy=0;
  if(u.state==='retreat')return false;
  if(u.manualT>G.time)return false;          // the player moved this builder by hand
  if(u.state==='move'&&!u.bj)return false;
  let j=u.bj;
  if(j&&!jobValid(u,j)){dropJob(u);j=null;}
  if(!j){if((u.jt=(u.jt||0)-dt)>0)return u.state!=='move';u.jt=.7;j=u.bj=pickJob(u);if(!j)return false;}
  if(j.k==='mat'){
    if(j.ph==='load'){if(!j.dep||j.dep.owner!==u.team){j.dep=depotFor(u,j.b);if(!j.dep){dropJob(u);return false;}}
      if(goTo(u,j.dep.x,j.dep.y)){if(u.state==='move')arrive(u);j.lt=(j.lt||0)+dt;if(j.lt>=B_LOAD){u.carry=j.amt;j.ph='carry';}}return true;}
    if(j.ph==='carry'){if(goTo(u,j.b.x,j.b.y)){if(u.state==='move')arrive(u);const b=j.b;b.mat=Math.min(1,b.mat+u.carry/siteNeed(b));b.inb=Math.max(0,(b.inb||0)-u.carry);u.carry=0;
        j.k='work';j.ph='go';}return true;}
  }
  if(j.k==='work'||j.k==='rep'){const b=j.b;if(!goTo(u,b.x,b.y))return true;if(u.state==='move')arrive(u);
    u.busy=1;u.ang=Math.atan2(b.y-u.y,b.x-u.x);
    if(j.k==='rep'){b.hp=Math.min(b.maxHp,b.hp+b.maxHp*.08*dt);if(b.hp>=b.maxHp-1)u.bj=null;return true;}
    b.prog=Math.min(b.mat,b.prog+dt/BT[b.type].time);
    if(b.prog>=1){b.prog=1;u.bj=null;siteFinished(b);}else if(b.prog>=b.mat)u.bj=null;
    return true;}
  if(j.k==='wall'){const i=j.wi,x=(i%G.W+.5)*CELL,y=((i/G.W|0)+.5)*CELL;if(!goTo(u,x,y))return true;if(u.state==='move')arrive(u);
    u.busy=1;u.ang=Math.atan2(y-u.y,x-u.x);G.wallHp[i]=Math.min(BT.wall.hp,G.wallHp[i]+BT.wall.hp*.14*dt);G.wallDirty=true;
    if(G.wallHp[i]>=BT.wall.hp-1)u.bj=null;return true;}
  return false;
}
function siteFinished(b){note(b.owner,`${BT[b.type].n} complete`,'good',BT[b.type].ico,'build');if(Math.random()<.25)voice(b.owner,'builders',{bld:BT[b.type].n.toLowerCase()});}
const buildersOf=T=>G.units.filter(u=>u.team===T&&u.type==='eng'&&!u.dead);
const sitesOf=T=>G.blds.filter(b=>b.owner===T&&!siteDone(b));
