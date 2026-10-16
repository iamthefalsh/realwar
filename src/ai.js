
// ================= BUILD PLACEMENT (shared by player & AI) =================
const cityNear=(i,r)=>{const x=i%G.W,y=i/G.W|0;return G.cities.some(c=>Math.abs(c.cx-x)<=r&&Math.abs(c.cy-y)<=r)};
const DEPN={coal:'coal',iron:'iron',oil:'oil',gold:'gold'};
const housesOf=c=>G.blds.filter(b=>b.type==='house'&&b.city===c).length;
function placeErr(T,type,i){
  if(G.own[i]!==T)return 'Must be inside your territory';
  const t=G.terr[i],B=BT[type];
  if(t===WATER)return 'Cannot build on water';
  if(G.wall[i]||G.bAt.has(i))return 'That spot is taken';
  if(type==='wall')return cityNear(i,0)?'Not on a city':'';
  if(cityNear(i,1))return 'Too close to a city';
  if(B.on==='dep')return G.depAt[i]===DEPS.indexOf(B.dep)?'':`Needs a ${DEPN[B.dep]} deposit`;
  if(G.depAt[i]>=0)return 'Deposit reserved for a mine';
  if(t===MOUNT)return 'Too steep to build';
  if(B.on==='plain'&&t!==PLAIN)return 'Farms need open plains';
  if(B.on==='forest'&&t!==FOREST)return 'Lumber mills need forest';
  if(B.on==='house'){const x=(i%G.W+.5)*CELL,y=((i/G.W|0)+.5)*CELL,c=nearestCity(x,y,T);
    if(!c||Math.abs(c.cx-i%G.W)>8||Math.abs(c.cy-(i/G.W|0))>8)return 'Homes must be near one of your cities';
    if(housesOf(c)>=HOUSE_MAX[c.type])return `${c.name} is full (max ${HOUSE_MAX[c.type]} housing blocks)`;}
  return '';
}
function findBuildSpot(T,type){
  const W=G.W,N=W*G.H,cap=capitalOf(T);if(!cap)return -1;const foe=capitalOf(3-T)||{x:W*CELL/2,y:G.H*CELL/2};
  let best=-1,bs=1e18;
  for(let i=0;i<N;i++){if(G.own[i]!==T)continue;if(placeErr(T,type,i))continue;
    const x=(i%W+.5)*CELL,y=((i/W|0)+.5)*CELL;let s;
    if(type==='house'){const c=nearestCity(x,y,T);s=Math.sqrt(dist2(x,y,c.x,c.y))+(c.cap-c.pop)*.002;}
    else s=Math.sqrt(dist2(x,y,cap.x,cap.y))-.45*Math.sqrt(dist2(x,y,foe.x,foe.y));
    s+=Math.random()*14;if(s<bs){bs=s;best=i;}}
  return best;
}

// ================= AI: plays by the same rules as you =================
// It only knows what its units have seen, notices threats after a delay,
// and has a limited number of "taps" per second, like a human player.
function aiState(T){return G.ai[T]||(G.ai[T]={think:1,strat:2,plane:4,econ:1.5,dip:5,wall:8,stk:12,ap:2,mem:new Map(),bseen:new Set()})}
const aiP=T=>(T===2&&!G.demo)?G.diff:{ap:.6,react:3,wave:1,err:.12,grace:150,think:1};
function act(T){const S=aiState(T);if(S.ap<1)return false;S.ap-=1;return true}
function known(T,airToo){const S=aiState(T),r=aiP(T).react,out=[];for(const m of S.mem.values()){if(G.time-m.first<r)continue;if(!airToo&&m.air)continue;out.push(m);}return out}
function aiTick(T,dt){
  const S=aiState(T),P=aiP(T),k=P.think;
  S.ap=Math.min(4,S.ap+P.ap*dt);
  if((S.strat-=dt)<=0){S.strat=2*k;aiStrategy(T);}
  if((S.think-=dt)<=0){S.think=1.2*k;aiProduce(T);}
  if((S.plane-=dt)<=0){S.plane=5*k;if(!G.peace)aiPlanes(T);}
  if((S.econ-=dt)<=0){S.econ=2.5*k;aiEcon(T);}
  if((S.dip-=dt)<=0){S.dip=7*k;aiDiplomacy(T);}
  if((S.wall-=dt)<=0){S.wall=4*k;aiWalls(T);}
  if((S.stk-=dt)<=0){S.stk=8*k;aiStrikes(T);}
}
function frontDist(c,T){let b=1e18;for(const o of G.cities)if(o.owner!==T)b=Math.min(b,dist2(c.x,c.y,o.x,o.y));return b}
function aiProduce(T){
  const E=G.E[T],P=aiP(T),cnt={},pc={};for(const t of TYPES){cnt[t]=0;pc[t]=0;}let total=0;
  for(const u of G.units){if(u.dead||u.team!==T)continue;cnt[u.type]++;total++;}
  for(const m of known(T,true))pc[m.type]++;
  const own=G.cities.filter(c=>c.owner===T);
  for(const c of own)for(const q of c.queue){cnt[q]++;total++;}
  if(total>=UNIT_CAP)return;
  // builders first: enough of them to keep every construction site moving
  const wantB=clamp(2+Math.ceil(sitesOf(T).length/2),2,6);
  if(cnt.eng<wantB&&!missing(E,UT.eng.cost)){const c=own.filter(c=>c.queue.length<2).sort((a,b)=>a.queue.length-b.queue.length)[0];if(c&&act(T)){enqueueUnit(c,'eng');return;}}
  const reserve=G.peace?130:30;
  const want={inf:4,tank:2,art:1,aa:.5,ftr:.35,bmb:.35};
  want.aa+=(pc.ftr+pc.bmb)*.4;want.ftr+=(pc.ftr+pc.bmb)*.25;want.art+=pc.tank*.12+pc.inf*.03;want.tank+=pc.inf*.04;
  if(G.time<50){want.ftr=0;want.bmb=0;want.art=.3;}
  let bt=null,bv=-1;const ok=[];
  for(const t of TYPES){if(!want[t]||!own.some(c=>CAN_BUILD[c.type].includes(t)))continue;if(missing(E,UT[t].cost))continue;
    if(E.money-UT[t].cost.$<reserve)continue;ok.push(t);const v=want[t]/(cnt[t]+1);if(v>bv){bv=v;bt=t;}}
  if(!bt)return;
  if(Math.random()<P.err)bt=pick(ok);
  let bc=null,bs=1e18;
  for(const c of own){if(!CAN_BUILD[c.type].includes(bt)||c.queue.length>=2)continue;const s=c.queue.length*1e9+frontDist(c,T);if(s<bs){bs=s;bc=c;}}
  if(!bc||!act(T))return;enqueueUnit(bc,bt);
}
function pickTarget(T,x,y){
  const P=aiP(T),foes=known(T),myCap=capitalOf(T),fCap=capitalOf(3-T),lim=(T===2&&!G.demo)?{easy:1e9,normal:3*YEAR,hard:2*YEAR}[G.opts.diff||'normal']:1.5*YEAR;
  const list=[];
  for(const c of G.cities){if(c.owner===T)continue;if(G.peace&&c.owner)continue;
    if(G.peace&&myCap&&fCap&&G.time<lim&&dist2(c.x,c.y,myCap.x,myCap.y)>dist2(c.x,c.y,fCap.x,fCap.y))continue;
    let def=0;for(const m of foes)if(dist2(m.x,m.y,c.x,c.y)<22500)def+=UT[m.type].w;
    const grace=P.grace,wt=G.time-G.peaceEnd,front=[...G.adj[c.id]].some(id=>G.cities[id].owner===T);
    let v=(c.type==='capital'?(wt<grace?.08:1.5):1)*(c.owner===0?1.5:1)*(c.type==='factory'||c.type==='airbase'?1.2:1)*(front?1.8:1);
    if(G.divs.some(d=>d.team===T&&d.target===c))v*=.7;
    list.push([v/(Math.sqrt(dist2(x,y,c.x,c.y))+200+def*80),c]);}
  if(!list.length)return null;list.sort((a,b)=>b[0]-a[0]);
  return Math.random()<P.err?pick(list.slice(0,3))[1]:list[0][1];
}
function aiStrategy(T){
  const mine=[];for(const u of G.units)if(!u.dead&&!UT[u.type].air&&u.team===T&&u.type!=="eng")mine.push(u);
  const foe=known(T),myC=G.cities.filter(c=>c.owner===T);if(!myC.length)return;
  for(const c of myC){c.threat=0;if(G.peace)continue;for(const e of foe)if(dist2(e.x,e.y,c.x,c.y)<170*170)c.threat+=UT[e.type].w;}
  for(const u of mine)if(u.aiDef&&!u.garrison&&(u.aiDef.owner!==T||u.aiDef.threat===0))u.aiDef=null;
  const cap=myC.find(c=>c.type==='capital');
  if(cap){const gar=mine.filter(u=>u.garrison);const want=Math.min(4,Math.floor(mine.length/5));
    if(gar.length<want){const cand=mine.filter(u=>!u.garrison&&!u.div&&u.state!=='retreat'&&u.type!=='art').sort((a,b)=>dist2(a.x,a.y,cap.x,cap.y)-dist2(b.x,b.y,cap.x,cap.y)).slice(0,want-gar.length);
      if(cand.length&&act(T)){for(const u of cand){u.garrison=true;u.aiDef=cap;}orderMove(cand,cap.x,cap.y);}}}
  const thr=myC.filter(c=>c.threat>0).sort((a,b)=>((b.type==='capital')-(a.type==='capital'))||b.threat-a.threat);
  for(const c of thr){
    let have=0;for(const u of mine)if(u.aiDef===c||(u.state!=='retreat'&&dist2(u.x,u.y,c.x,c.y)<130*130))have+=UT[u.type].w;
    let need=c.threat*1.3-have;if(need<=0)continue;
    const R=c.type==='capital'?700:420;
    const cand=mine.filter(u=>!u.aiDef&&u.state!=='retreat'&&(!u.div||c.type==='capital')&&dist2(u.x,u.y,c.x,c.y)<R*R).sort((a,b)=>dist2(a.x,a.y,c.x,c.y)-dist2(b.x,b.y,c.x,c.y));
    const grp=[];for(const u of cand){if(need<=0)break;grp.push(u);need-=UT[u.type].w;}
    if(grp.length&&act(T)){for(const u of grp){removeFromDiv(u);u.aiDef=c;}orderMove(grp,c.x,c.y);}
  }
  for(const div of G.divs.slice()){if(div.team!==T)continue;
    div.units=div.units.filter(u=>!u.dead);if(!div.units.length){disband(div);continue;}
    if(div.retreating){if(G.time>div.disbandAt)disband(div);continue;}
    if(strength(div.units)<div.st0*.35){if(!act(T))continue;const cen=centroid(div.units),c=nearestCity(cen.x,cen.y,T);if(c)orderMove(div.units,c.x,c.y);div.retreating=true;div.disbandAt=G.time+20;continue;}
    if(!div.target||div.target.owner===T||(G.peace&&div.target.owner)){if(!act(T))continue;const cen=centroid(div.units);div.target=pickTarget(T,cen.x,cen.y);if(div.target){orderMove(div.units,div.target.x,div.target.y);div.reT=G.time;}else disband(div);}
    else if(G.time-div.reT>14&&act(T)){orderMove(div.units,div.target.x,div.target.y);div.reT=G.time;}
  }
  const free=mine.filter(u=>!u.div&&!u.aiDef&&u.state!=='retreat');
  const k=aiP(T).wave,wt=Math.max(0,G.time-G.peaceEnd),wave=Math.min(26,Math.round((4+wt/35)*k));
  const neutralLeft=G.cities.some(c=>c.owner===0);
  if((free.length>=wave&&(!G.peace||neutralLeft))||(free.length>=3&&neutralLeft&&(G.peace||wt<90))){
    const cen=centroid(free),tg=pickTarget(T,cen.x,cen.y);
    if(tg&&act(T)){const grp=G.peace?free.slice(0,Math.max(3,Math.ceil(free.length/2))):free;const div=makeDiv(T,grp);div.st0=strength(grp);div.target=tg;orderMove(grp,tg.x,tg.y);div.reT=G.time;return;}
  }
  if(free.length){
    const cp=cap||myC[0],foeCap=capitalOf(3-T),tg=G.peace?foeCap:pickTarget(T,cp.x,cp.y);
    let st=cp;if(tg){let bd=1e18;for(const c of myC){const d=dist2(c.x,c.y,tg.x,tg.y)+c.threat*1e5;if(d<bd){bd=d;st=c;}}}
    const grp=free.filter(u=>u.state==='idle'&&dist2(u.x,u.y,st.x,st.y)>70*70);
    if(grp.length&&act(T))orderMove(grp,st.x+rnd(-20,20),st.y+rnd(-20,20));
  }
}
function aiPlanes(T){
  const planes=G.units.filter(u=>u.team===T&&!u.dead&&UT[u.type].air);if(!planes.length||!act(T))return;
  const K=known(T,true),foeAir=K.filter(m=>m.air&&!m.landed),foeG=K.filter(m=>!m.air);
  let cl=null,cs=0;
  for(const e of foeG){let s=0;for(const o of foeG)if(dist2(e.x,e.y,o.x,o.y)<3600)s+=o.type==='art'||o.type==='tank'?1.6:1;
    const b=nearestBase(e.x,e.y,T);if(!b||dist2(b.x,b.y,e.x,e.y)>800*800)continue;if(s>cs){cs=s;cl=e;}}
  let ind=null;if(cs<3){let bd=850*850;const base=nearestBase(G.W*CELL/2,G.H*CELL/2,T),S=aiState(T);
    if(base)for(const b of G.blds){if(b.owner!==3-T||b.type==='house'||!S.bseen.has(b.id))continue;const d=dist2(b.x,b.y,base.x,base.y);if(d<bd&&(b.type==='steel'||b.type==='arms'||b.type==='oil'||Math.random()<.3)){bd=d;ind=b;}}}
  const myDiv=G.divs.filter(d=>d.team===T&&d.units.length).sort((a,b)=>b.units.length-a.units.length)[0];
  for(const p of planes){if(p.landed&&p.fuel<UT[p.type].fuel*.9)continue;
    if(p.type==='ftr'){let e=null,bd=700*700;for(const a of foeAir){const d=dist2(p.x,p.y,a.x,a.y);if(d<bd){bd=d;e=a;}}
      if(e)orderPlane(p,e.x,e.y);else if(myDiv){const c=centroid(myDiv.units);orderPlane(p,c.x,c.y);}else orderPlane(p,null);}
    else{if(cl&&cs>=3)orderPlane(p,cl.x+rnd(-10,10),cl.y+rnd(-10,10));else if(ind)orderPlane(p,ind.x,ind.y);else orderPlane(p,null);}}
}
function aiEcon(T){
  const E=G.E[T],cnt={};for(const k of BTYPES)cnt[k]=0;for(const b of G.blds)if(b.owner===T)cnt[b.type]++;
  const t=G.time,need=[];
  if(E.net.food<.5||E.res.food<150)need.push('farm');
  if(E.pop>E.cap*.85)need.push('house');
  if(cnt.lumber<2||(E.res.wood<90&&cnt.lumber<5))need.push('lumber');
  if(cnt.iron<2+(t>180)+(t>420))need.push('iron');
  if(cnt.coal<1+(t>200)+(t>450))need.push('coal');
  if(cnt.arms<1+(t>160)+(t>420))need.push('arms');
  if(cnt.steel<1+(t>140)+(t>380))need.push('steel');
  if(cnt.oil<1+(t>220)+(t>450))need.push('oil');
  if(cnt.gold<1&&t>80)need.push('gold');
  // money makers: a real player builds them once the basics run, earlier if cash is short
  const poor=E.tax+(E.biz||0)<14;
  if(cnt.bank<1+(t>420)&&E.res.gold>=8&&(t>90||poor))need.unshift('bank');
  if((t>140||poor)&&cnt.goods<1+(t>400))need.push('goods');
  if(cnt.goods>0&&cnt.shop<cnt.goods)need.unshift('shop');
  if(t>280&&cnt.silo<1&&(!G.peace||G.peaceEnd-G.time<YEAR))need.push('silo');
  if(E.fill<.9&&!need.includes('house'))need.unshift('house');
  if(sitesOf(T).length>=4)return; // like a person: don't start more than the builders can handle
  for(const k of need){const B=BT[k];if(B.work>600&&E.fill<(k==='goods'?.7:.82)&&k!=='farm')continue;
    if(missing(E,B.cost)||E.money-B.cost.$<60)continue;
    const ci=findBuildSpot(T,k);if(ci<0)continue;if(!act(T))return;pay(E,B.cost);addBld(k,T,ci,false);break;}
  for(const r of RES){const tgt=RI[r].tgt*(t>300?1.4:1);
    if(E.res[r]>tgt*2.6&&r!=='gold'){aiSell(T,r,Math.min(80,Math.floor(E.res[r]-tgt*1.6)));}
    else if(E.res[r]<tgt*.35&&E.money>220){aiBuy(T,r,Math.ceil(Math.min(40,tgt-E.res[r])));}}
  if(E.res.gold>45)aiSell(T,'gold',10);
  const losing=!G.peace&&G.terrPct[T]<G.terrPct[3-T]*.8;
  const pol={draft:E.hap<28?0:losing&&E.hap>45?2:1,tax:E.hap<38?0:E.money<80&&E.hap>55?2:1,ration:E.res.food<70?2:E.hap<40&&E.net.food>1?0:1};
  for(const k in pol)if(E.pol[k]!==pol[k]&&act(T))E.pol[k]=pol[k];
  if(!G.peace&&E.mp<150&&E.money>450){const c=G.countries.filter(c=>!embargo(c,T)&&c.mpA>=500).sort((a,b)=>hireP(a,T)-hireP(b,T))[0];if(c&&act(T))hire(T,c,500);}
}
function aiSell(T,r,q){if(q<=0)return;const E=G.E[T];let best=null,bv=mQuote(E,r,q,false);
  for(const c of G.countries){if(embargo(c,T)||c.dm[r]<q)continue;const v=cSellP(c,r,T)*q;if(v>bv){bv=v;best=c;}}
  if(!act(T))return;if(best)cTrade(T,best,r,q,false);else mSell(T,r,q);}
function aiBuy(T,r,q){if(q<=0)return;const E=G.E[T];let best=null,bv=E.mk[r]-q>RI[r].mk*.08?mQuote(E,r,q,true):1e9;
  for(const c of G.countries){if(embargo(c,T)||c.st[r]<q)continue;const v=cBuyP(c,r,T)*q;if(v<bv){bv=v;best=c;}}
  if(bv>E.money*.45||!act(T))return;if(best)cTrade(T,best,r,q,true);else mBuy(T,r,q);}
function aiDiplomacy(T){
  const E=G.E[T];
  for(const c of G.countries){if(embargo(c,T))continue;
    for(const k of TKEYS){if(c.tr[T][k])continue;const cost=TREATY[k].cost;if(cost.$&&E.money-cost.$<200)continue;if(cost.gold&&E.res.gold-cost.gold<2)continue;if(!canSign(c,k,T)){if(act(T))sign(c,k,T);return;}}}
  if(E.res.gold>=14){let best=null,bg=1e9;for(const c of G.countries){if(embargo(c,T))continue;
      const nk=TKEYS.find(k=>!c.tr[T][k]);if(!nk)continue;const gap=treatyReq(c,nk)-c.rel[T];if(gap>0&&gap<bg){bg=gap;best=c;}}
    if(best&&act(T))gift(T,best,'gold');}
  else if(E.money>900){const c=G.countries.filter(c=>!embargo(c,T)).sort((a,b)=>b.rel[T]-a.rel[T])[0];if(c&&act(T))gift(T,c,'$');}
}
function aiWalls(T){
  const E=G.E[T];if(E.res.wood<60||E.money<120||E.res.iron<20)return;
  const nearWar=G.peace?G.peaceEnd-G.time<2*YEAR:true;if(!nearWar)return;
  const cap=capitalOf(T),foe=capitalOf(3-T);if(!cap||!foe)return;
  const base=Math.atan2(foe.cy-cap.cy,foe.cx-cap.cx),R=6.5;let placed=0;
  for(let a=-1.25;a<=1.25&&placed<4;a+=.12){const x=Math.round(cap.cx+Math.cos(base+a)*R),y=Math.round(cap.cy+Math.sin(base+a)*R);
    if(x<0||y<0||x>=G.W||y>=G.H)continue;const i=y*G.W+x;if(G.wall[i]||placeErr(T,'wall',i))continue;if(missing(E,BT.wall.cost))return;
    if(placed===0&&!act(T))return;pay(E,BT.wall.cost);addBld('wall',T,i,false);placed++;}
}

function aiStrikes(T){
  if(G.peace)return;const E=G.E[T],silos=siloOf(T);if(!silos.length)return;
  const queued=silos.reduce((n,b)=>n+b.aq.length,0),losing=G.terrPct[T]<G.terrPct[3-T]*.6&&G.time-G.peaceEnd>300;
  if(!queued&&stock(T,'missile')<2&&E.money>600&&!missing(E,STRIKE.missile.cost)){if(act(T))armSilo(T,silos[0],'missile');return;}
  if(losing&&!queued&&stock(T,'nuke')<1&&E.money>STRIKE.nuke.cost.$+400&&!missing(E,STRIKE.nuke.cost)&&Math.random()<.5){if(act(T))armSilo(T,silos[0],'nuke');return;}
  const K=known(T).filter(m=>!m.air);let best=null,bs=0;
  for(const e of K){let v=0;for(const o of K)if(dist2(e.x,e.y,o.x,o.y)<40*40)v+=UT[o.type].cost.$;if(v>bs){bs=v;best=e;}}
  if(losing&&stock(T,'nuke')>0&&best&&bs>500){const R=STRIKE.nuke.r*1.4;
    const ownNear=G.cities.some(c=>c.owner===T&&dist2(c.x,c.y,best.x,best.y)<R*R)||G.units.filter(u=>u.team===T&&dist2(u.x,u.y,best.x,best.y)<R*R).length>2;
    if(!ownNear&&act(T)){launchStrike(T,'nuke',best.x,best.y);return;}}
  if(stock(T,'missile')>0){let tx=null,ty=null;if(best&&bs>=250){tx=best.x;ty=best.y;}
    else{const S=aiState(T),b=G.blds.find(b=>b.owner===3-T&&S.bseen.has(b.id)&&['silo','steel','arms','oil','goods'].includes(b.type));if(b){tx=b.x;ty=b.y;}}
    if(tx!=null&&act(T))launchStrike(T,'missile',tx,ty);}
}
