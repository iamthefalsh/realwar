
// ================= PLAYER COMMANDS =================
// Every action a player can take goes through runCmd(team, name, args).
// Single player runs it directly; online, the match server runs it for the sender's team.
// Inputs are validated so a modified client cannot cheat.
const QTY=[10,50,200];
const NUM=v=>typeof v==='number'&&isFinite(v);
function myUnits(T,ids){if(!Array.isArray(ids))return [];const s=new Set(ids.slice(0,UNIT_CAP+20));return G.units.filter(u=>!u.dead&&u.team===T&&s.has(u.id));}
function splitHalves(l){const xs=l.map(u=>u.x),ys=l.map(u=>u.y),hz=Math.max(...xs)-Math.min(...xs)>Math.max(...ys)-Math.min(...ys);
  l=l.slice().sort((p,q)=>hz?p.x-q.x:p.y-q.y);const h=Math.ceil(l.length/2);return [l.slice(0,h),l.slice(h)];}
const CMD={
  move(T,a){const us=myUnits(T,a.ids);if(!us.length||!NUM(a.x)||!NUM(a.y))return;let x=clamp(a.x,0,G.W*CELL),y=clamp(a.y,0,G.H*CELL);
    if(a.tid){const e=G.units.find(u=>u.id===a.tid&&u.team!==T&&!u.dead);if(e){x=e.x;y=e.y;}}
    for(const u of us)if(u.type==='eng'){dropJob(u);u.manualT=G.time+8;}orderMove(us,x,y,us.length===1);},
  stop(T,a){for(const u of myUnits(T,a.ids)){if(UT[u.type].air)orderPlane(u,null);else{u.ordX=null;if(u.state==='retreat')u.rc=null;arrive(u);}}},
  retreat(T,a){for(const u of myUnits(T,a.ids))if(!UT[u.type].air)startRetreat(u,true,'hp');},
  refuel(T,a){for(const u of myUnits(T,a.ids))if(UT[u.type].cls==='veh')startRetreat(u,true,'fuel');},
  autoret(T,a){for(const u of myUnits(T,a.ids))u.retreatOn=!!a.v;},
  form(T,a){const us=myUnits(T,a.ids);if(!us.length)return;if(G.divs.filter(d=>d.team===T).length>=12)return 'Max 12 divisions';const d=makeDiv(T,us);note(T,d.name+' formed','good');},
  split(T,a){const l=myUnits(T,a.ids);if(l.length<2)return;if(G.divs.filter(d=>d.team===T).length>10)return 'Too many divisions';const [A,B]=splitHalves(l);makeDiv(T,A);makeDiv(T,B);},
  disband(T,a){const d=G.divs.find(d=>d.id===a.div&&d.team===T);if(d)disband(d);},
  queue(T,a){const c=G.cities[a.city];if(!c||c.owner!==T||!UT[a.type])return 'Not your city';return enqueueUnit(c,a.type);},
  cancel(T,a){const c=G.cities[a.city];if(!c||c.owner!==T)return;const i=a.i|0;if(i<0||i>=c.queue.length)return;refund(G.E[T],UT[c.queue[i]].cost);c.queue.splice(i,1);if(i===0)c.prog=0;},
  place(T,a){const B=BT[a.type];if(!B||!Array.isArray(a.cells))return;let err='',n=0;
    for(const i of a.cells.slice(0,64)){if(!Number.isInteger(i)||i<0||i>=G.W*G.H)continue;const m=missing(G.E[T],B.cost),e=placeErr(T,a.type,i)||(m?'Not enough '+m:'');
      if(e){err=err||e;continue;}pay(G.E[T],B.cost);addBld(a.type,T,i,false);n++;G.stats[T].blds++;}
    return n?'':err;},
  demolish(T,a){const b=G.blds.find(b=>b.id===a.id);if(!b||b.owner!==T)return;refund(G.E[T],BT[b.type].cost,.25);removeBld(b);},
  mbuy(T,a){return RES.includes(a.r)&&QTY.includes(a.q)?mBuy(T,a.r,a.q):'';},
  msell(T,a){return RES.includes(a.r)&&QTY.includes(a.q)?mSell(T,a.r,a.q):'';},
  cbuy(T,a){const c=G.countries[a.c];return c&&RES.includes(a.r)&&QTY.includes(a.q)?cTrade(T,c,a.r,a.q,true):'';},
  csell(T,a){const c=G.countries[a.c];return c&&RES.includes(a.r)&&QTY.includes(a.q)?cTrade(T,c,a.r,a.q,false):'';},
  hire(T,a){const c=G.countries[a.c];return c&&(a.n===100||a.n===500)?hire(T,c,a.n):'';},
  gift(T,a){const c=G.countries[a.c];return c&&(a.k==='gold'||a.k==='$')?gift(T,c,a.k):'';},
  sign(T,a){const c=G.countries[a.c];return c&&TREATY[a.k]?sign(c,a.k,T):'';},
  arm(T,a){const b=G.blds.find(b=>b.id===a.id);return armSilo(T,b,a.k);},
  launch(T,a){if(!STRIKE[a.k]||!NUM(a.x)||!NUM(a.y))return '';return launchStrike(T,a.k,a.x,a.y);},
  pol(T,a){if(POL[a.k]&&[0,1,2].includes(a.v))G.E[T].pol[a.k]=a.v;},
  war(T){if(G.peace&&!G.mp)declareWar();},
  surrender(T){if(G.mp&&!G.over)gameOver(T===1?'lose':'win','surrender');},
};
function runCmd(T,name,a){const f=Object.prototype.hasOwnProperty.call(CMD,name)?CMD[name]:null;if(!f||!G||G.over)return '';
  try{const r=f(T,a&&typeof a==='object'?a:{});return typeof r==='string'?r:'';}catch(e){return 'Command failed';}}
