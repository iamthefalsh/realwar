
// ================= ONLINE MULTIPLAYER (client) =================
// The match runs on the server. This client only shows the server's state and sends orders.
// Each player always sees themselves as team 1 (blue, base at the bottom): for player 2 every
// position, cell and team number is mirrored when it arrives and mirrored back when sent.
const MP_DEFAULT_SERVER=(typeof window!=='undefined'&&window.RW_TEST_SERVER)||'realwar.zerapagamentos.workers.dev'; // the Cloudflare Worker that runs online matches
const MP={ws:null,lobby:null,state:'off',team:1,flip:false,room:'',key:'',opp:'',me:'',units:new Map(),bmap:new Map(),divSig:'',retry:0,pingT:null,lpT:null,lastMsg:0,ping:0,WPX:0,HPX:0,N:0};
const mpServer=()=>(localStorage.getItem('rw_server')||MP_DEFAULT_SERVER).trim();
// accepts "host", "https://host/", "wss://host/lobby"…: keeps scheme + host only
function srvParts(s){s=(s||mpServer()).trim();if(!s)return null;if(!/^[a-z]+:\/\//i.test(s))s='https://'+s;
  let u;try{u=new URL(s);}catch(e){return null;}const sec=!/^(http|ws):$/i.test(u.protocol);return {ws:(sec?'wss://':'ws://')+u.host,http:(sec?'https://':'http://')+u.host,host:u.host};}
function wsBase(s){const p=srvParts(s);return p?p.ws:'';}
// tells apart "can't reach it" from "reached something that isn't the game server"
async function mpCheck(s){const p=srvParts(s);if(!p)return 'That server address is not valid';
  const tm=ms=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;};
  try{const r=await fetch(p.http+'/health',{signal:tm(8000),cache:'no-store'});const j=await r.json();if(j&&j.game==='realwar')return '';}
  catch(e){try{await fetch(p.http+'/',{mode:'no-cors',signal:tm(8000),cache:'no-store'});
    return `${p.host} is online but is not the RealWar game server yet. In Cloudflare, redeploy the Worker from the realwar GitHub repo.`;}
    catch(e2){return `Cannot reach ${p.host}. Check the address and your internet connection.`;}}
  return `${p.host} is online but is not the RealWar game server yet. In Cloudflare, redeploy the Worker from the realwar GitHub repo.`;}
const mpStatus=t=>{$('#mpStatus').textContent=t};
const MX=x=>MP.flip?MP.WPX-x:x,MY=y=>MP.flip?MP.HPX-y:y,MA=a=>MP.flip?wrapA(a+Math.PI):a,MT=t=>MP.flip&&t?3-t:t,MC=i=>MP.flip?MP.N-1-i:i;

// ---------- lobby ----------
function openMP(){$('#menu').classList.add('hide');$('#endScr').classList.add('hide');$('#mpScr').classList.remove('hide');
  $('#mpName').value=localStorage.getItem('rw_name')||'';const custom=localStorage.getItem('rw_server')||'';$('#mpSrv').value=custom;$('#mpSrvBox').open=false;
  mpStatus('Tap Find match to enter the queue');}
async function mpFind(){
  if(MP.state==='queue'||MP.state==='checking')return mpCancel();
  const name=$('#mpName').value.trim()||'Commander';localStorage.setItem('rw_name',name);
  const srv=$('#mpSrv').value.trim();
  if(srv&&wsBase(srv)!==wsBase(MP_DEFAULT_SERVER))localStorage.setItem('rw_server',srv);else localStorage.removeItem('rw_server');
  initAudio();if(AC&&AC.state==='suspended')AC.resume();
  MP.state='checking';$('#bFind').textContent='CANCEL';mpStatus('Connecting to the game server…');
  let bad=await mpCheck();if(MP.state!=='checking')return;
  // a saved custom address that doesn't work falls back to the built-in server
  if(bad&&localStorage.getItem('rw_server')){const b2=await mpCheck(MP_DEFAULT_SERVER);if(MP.state!=='checking')return;
    if(!b2){localStorage.removeItem('rw_server');$('#mpSrv').value='';bad='';}}
  if(bad){MP.state='off';$('#bFind').textContent='FIND MATCH';return mpStatus(bad);}
  const base=wsBase();
  let ws;try{ws=new WebSocket(base+'/lobby');}catch(e){MP.state='off';$('#bFind').textContent='FIND MATCH';return mpStatus('That server address is not valid');}
  MP.lobby=ws;MP.state='queue';$('#bFind').textContent='CANCEL';mpStatus('Connecting…');
  ws.onopen=()=>ws.send(JSON.stringify({t:'queue',name}));
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}
    if(m.t==='status'&&MP.state==='queue')mpStatus(`Searching for an opponent… ${m.online} online · ${m.waiting} in queue`);
    else if(m.t==='match'){Object.assign(MP,{state:'joining',room:m.room,key:m.key,team:m.team,opp:m.opp,me:m.me});
      sessionStorage.setItem('rw_match',JSON.stringify({room:m.room,key:m.key,team:m.team,opp:m.opp,me:m.me,srv:base}));
      ws.onclose=null;ws.close();MP.lobby=null;clearInterval(MP.lpT);mpStatus(`Opponent found: ${m.opp}. Starting…`);sfx('capture');vib([40,40,40]);mpJoin(base);}
    else if(m.t==='error')mpStatus(m.msg);};
  ws.onclose=()=>{if(MP.state!=='queue')return;MP.state='off';MP.lobby=null;$('#bFind').textContent='FIND MATCH';mpStatus('Lost the connection to the matchmaking queue. Tap Find match to try again.');};
  clearInterval(MP.lpT);MP.lpT=setInterval(()=>{if(MP.lobby&&MP.lobby.readyState===1)MP.lobby.send('{"t":"ping"}');},15000);
}
function mpCancel(){const ws=MP.lobby;if(ws){ws.onclose=null;try{ws.send('{"t":"cancel"}');ws.close();}catch(e){}}MP.lobby=null;MP.state='off';clearInterval(MP.lpT);$('#bFind').textContent='FIND MATCH';mpStatus('Search cancelled');}
function mpRejoin(){const s=JSON.parse(sessionStorage.getItem('rw_match')||'null');if(!s)return;Object.assign(MP,{state:'joining',room:s.room,key:s.key,team:s.team,opp:s.opp,me:s.me});openMP();mpStatus('Rejoining your match…');mpJoin(s.srv);}

// ---------- match connection ----------
function mpJoin(base){
  base=base||(JSON.parse(sessionStorage.getItem('rw_match')||'{}').srv)||wsBase();
  const ws=new WebSocket(`${base}/room/${MP.room}?team=${MP.team}&key=${MP.key}`);ws.binaryType='arraybuffer';MP.ws=ws;MP.lastMsg=performance.now();
  ws.onopen=()=>{MP.retry=0;clearInterval(MP.pingT);MP.pingT=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({t:'ping',c:Date.now()%1e6}));},4000);};
  ws.onmessage=e=>{MP.lastMsg=performance.now();if(typeof e.data==='string'){let m;try{m=JSON.parse(e.data);}catch(x){return;}mpCtrl(m);}else if(G&&G.mp&&MP.state==='play')mpSnap(e.data);};
  ws.onclose=()=>{clearInterval(MP.pingT);if(MP.ws!==ws)return;MP.ws=null;
    if(['play','joining','wait'].includes(MP.state)){if(++MP.retry>25)return mpEnd('Connection lost.');if(G&&G.mp&&MP.state==='play')toast('Connection lost. Reconnecting…','bad','warn');setTimeout(()=>{if(!MP.ws&&MP.state!=='off'&&MP.state!=='over')mpJoin(base);},2000);}};
}
function mpCtrl(m){
  if(m.t==='wait'){MP.state='wait';mpStatus(`Waiting for ${m.opp} to connect…`);}
  else if(m.t==='init')mpInit(m);
  else if(m.t==='opp'){if(G&&G.mp)toast(m.online?`${MP.opp} reconnected`:`${MP.opp} disconnected. You win in ${m.grace}s if they don't return`,m.online?'good':'bad','warn');}
  else if(m.t==='pong')MP.ping=Math.round(((Date.now()%1e6)-m.c+1e6)%1e6);
  else if(m.t==='error')mpEnd(m.msg);
}
function mpEnd(msg){const playing=G&&G.mp&&!G.over;MP.state='off';sessionStorage.removeItem('rw_match');const w=MP.ws;MP.ws=null;if(w)try{w.close();}catch(e){}
  if(playing){toast(msg,'bad','warn');setTimeout(toMenu,2500);}else{mpStatus(msg);$('#bFind').textContent='FIND MATCH';}}
function mpSend(name,a){if(!MP.ws||MP.ws.readyState!==1){toast('Not connected to the match','bad');return;}
  a=a?{...a}:{};if(MP.flip){if(NUM(a.x))a.x=MP.WPX-a.x;if(NUM(a.y))a.y=MP.HPX-a.y;if(Array.isArray(a.cells))a.cells=a.cells.map(i=>MP.N-1-i);}
  MP.ws.send(JSON.stringify({t:'cmd',n:name,a}));}
function mpLeave(){if(G&&G.mp&&!G.over)mpSend('surrender',{});MP.state='off';sessionStorage.removeItem('rw_match');const w=MP.ws;MP.ws=null;if(w)setTimeout(()=>{try{w.close();}catch(e){}},300);}

// ---------- building the local view from the server's map ----------
function ub64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function mpInit(m){
  const M=m.map,W=M.W,H=M.H,N=W*H,F=m.team===2;
  Object.assign(MP,{team:m.team,flip:F,N,WPX:W*CELL,HPX:H*CELL,opp:m.names[3-m.team],me:m.names[m.team],units:new Map(),bmap:new Map(),divSig:'',state:'play'});
  const rev=a=>(F?a.reverse():a);
  const terr=rev(ub64(M.terr)),elev=Float32Array.from(rev(ub64(M.elev)),v=>v/255),prov=rev(new Int16Array(ub64(M.prov).buffer)),road=rev(ub64(M.road)),depAt=rev(new Int8Array(ub64(M.depAt).buffer));
  const cities=M.cities.map(([id,name,cx,cy,type])=>{if(F){cx=W-1-cx;cy=H-1-cy;}return {id,name,cx,cy,ci:cy*W+cx,x:(cx+.5)*CELL,y:(cy+.5)*CELL,type,owner:0,queue:[],prog:0,contest:0,threat:0,
    pop:0,cap:CITY_CAP[type],panic:0,occ:0,seen1:true,cp:0,cpBy:0,cstate:'',civN:0};});
  const deps=M.deps.map(([type,c])=>{const i=MC(c);return {type,ci:i,cx:i%W,cy:i/W|0,x:(i%W+.5)*CELL,y:((i/W|0)+.5)*CELL};});
  const countries=M.countries.map(c=>({...c,st:{...c.stMax},dm:{...c.dmMax},tr:{1:{},2:{}},rel:[0,0,0],mpA:0,tm:{1:{},2:{}}}));
  G={W,H,seed:0,opts:{size:'medium',mp:true},vertical:H>W,terr,elev,cities,deps,depAt,prov,adj:null,roads:M.roads.map(p=>p.map(MC)),road,
    units:[],proj:[],fx:[],parts:[],markers:[],civs:[],blds:[],bAt:new Map(),wrecks:[],falling:[],shake:0,
    wall:new Uint8Array(N),wallHp:new Float32Array(N),wallHit:new Float32Array(N),own:new Uint8Array(N),
    time:0,peaceEnd:0,peace:false,terrPct:[0,0,0],divs:[],sel:[],selCity:null,demo:false,mp:true,
    diff:DIFFS.normal,speed:1,paused:false,over:false,nextId:1e9,civT:0,pathQ:[],stats:{1:newStats(),2:newStats()},ai:{},alertT:{},
    divDirty:true,selDirty:true,landCount:0,voices:[],tab:null,place:null,country:null,lastVoice:{},pvT:{1:1e9,2:1e9},
    E:[null,newEcon(1),newEcon(2)],countries,nat:F?[null,M.nat[2],M.nat[1]]:M.nat};
  for(let i=0;i<N;i++)if(terr[i]!==WATER)G.landCount++;
  G.provCells=cities.map(()=>[]);for(let i=0;i<N;i++)G.provCells[prov[i]].push(i);
  initVisuals();mpStartUI();
}
function mpStartUI(){
  resetUI();G.qty=10;tipI=TIPS.length;
  for(const id of ['#menu','#mpScr','#pauseScr','#endScr'])$(id).classList.add('hide');
  $('#ui').style.display='';$('#bSpeed').style.display='none';
  fitBounds();sizeMini();renderResBar();renderTabs();
  const cap=G.cities.filter(c=>c.type==='capital').sort((a,b)=>b.y-a.y)[0];
  CAM.z=clamp(Math.min(VW,VH)/360,CAM.minZ,CAM.maxZ);CAM.x=cap.x;CAM.y=cap.y;clampCam();
  setTimeout(()=>toast(`Online match vs ${MP.opp}. Same rules for both of you. Invade whenever you are ready!`,'','warn'),400);
}

// ---------- snapshots ----------
function mpSnap(buf){const dv=new DataView(buf),ul=dv.getUint32(0,true);mpUnits(new DataView(buf,4,ul));
  let p;try{p=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4+ul)));}catch(e){return;}mpApply(p);}
function mpUnit(id,type,team,x,y,a){const d=UT[type];return {id,type,team,x,y,tx:x,ty:y,ang:a,tAng:a,ta:a,tta:a,hp:d.hp,maxHp:d.hp,state:'idle',vis:[false,true,true],div:null,divId:0,sel:false,
  rank:0,ally:null,fuel:d.fuel||0,mv:0,walk:Math.random()*10,trk:0,fireT:-9,flash:0,lastHit:-99,ph:Math.random()*TAU,trail:[],trT:0,bank:0,landed:false,order:null,goalX:x,goalY:y,retreatOn:true,dead:false};}
function mpUnits(v){
  const t=v.getFloat32(0,true),n=v.getUint32(4,true),seen=new Set();let o=8;
  for(let k=0;k<n;k++,o+=28){
    const id=v.getUint32(o,true),type=TYPES[v.getUint8(o+4)],team=MT(v.getUint8(o+5)),x=MX(v.getInt16(o+6,true)/10),y=MY(v.getInt16(o+8,true)/10),
      ang=MA(v.getInt16(o+10,true)/1000),ta=MA(v.getInt16(o+12,true)/1000),hp=v.getUint16(o+14,true),fl=v.getUint8(o+16),div=v.getUint32(o+17,true),
      fuel=v.getUint8(o+21),rank=v.getUint8(o+22),ally=v.getInt8(o+23),gx=MX(v.getInt16(o+24,true)/10),gy=MY(v.getInt16(o+26,true)/10),d=UT[type];
    if(!d)continue;seen.add(id);let u=MP.units.get(id);
    if(!u){u=mpUnit(id,type,team,x,y,ang);MP.units.set(id,u);}
    else if(hp<u.hp){u.flash=.07;u.lastHit=G.time;
      if(type==='inf'){const m0=menOf(u),m1=menOf({hp,maxHp:u.maxHp});for(let j=m1;j<m0;j++){const p=soldierPos(u,j);fallen(p[0],p[1],u.team,u.ang);}}}
    Object.assign(u,{tx:x,ty:y,ta:ang,tta:ta,hp,landed:!!(fl&1),state:fl&2?'retreat':fl&4?'move':'idle',retreatOn:!!(fl&8),rcWhy:fl&16?'fuel':null,
      fuel:d.fuel?fuel/100*d.fuel:0,rank,ally:ally<0?null:ally,goalX:gx,goalY:gy,divId:div});
    if(d.air)u.order=fl&4?{x:gx,y:gy}:null;
  }
  for(const [id,u] of MP.units)if(!seen.has(id)){MP.units.delete(id);u.dead=true;const d=UT[u.type];
    if(d.air){if(!u.landed)addFalling(u);}
    else if(u.type==='inf'){for(let j=0;j<menOf(u);j++){const p=soldierPos(u,j);fallen(p[0],p[1],u.team,u.ang+rnd(-1,1));}}
    else addWreck(u);}
  G.units=[...MP.units.values()];
  const n0=G.sel.length;G.sel=G.sel.filter(u=>!u.dead);if(G.sel.length!==n0)G.selDirty=true;
  G.time=t;
}
function mpApply(p){
  if(p.ev)for(const e of p.ev)mpEv(e);
  if(p.me)for(const e of p.me){if(e[0]==='n'){const [,msg,kind,ic,snd]=e;if(msg)toast(msg,kind,ic);if(snd)sfx(snd);if(snd==='alert')vib(60);}else if(e[0]==='v')addVoice(e[1],!!e[2]);}
  if(p.c){let own=false;for(const r of p.c){const c=G.cities[r[0]];if(!c)continue;const o=MT(r[1]);if(c.owner!==o){c.owner=o;own=true;if(G.selCity===c)G.selDirty=true;}
      c.pop=r[2];c.cap=r[3];c.panic=r[4];c.occ=r[5];c.cp=r[6];c.cpBy=MT(r[7]);c.cstate=['','cap','fight'][r[8]]||'';c.contest=r[9];c.queue=r[10].map(i=>TYPES[i]);c.prog=r[11];}
    if(own)refreshOwn();}
  if(p.e){const E=G.E[1],{res,net,mk,ph,...rest}=p.e;Object.assign(E,rest);Object.assign(E.res,res);Object.assign(E.net,net);Object.assign(E.mk,mk);if(ph)E.ph=ph;}
  if(p.oe)Object.assign(G.E[2],p.oe);
  if(p.k)p.k.forEach((k,i)=>{const c=G.countries[i];if(!c)return;const [rel,t1,t2,st,dm,mpA]=k;c.rel=MP.flip?[0,rel[2],rel[1]]:rel;c.tr=MP.flip?{1:t2,2:t1}:{1:t1,2:t2};c.st=st;c.dm=dm;c.mpA=mpA;});
  if(p.d){const sig=JSON.stringify(p.d);if(sig!==MP.divSig){MP.divSig=sig;G.divs=p.d.map(([id,num,color])=>({id,team:1,num,short:ordinal(num),name:ordinal(num)+' Division',color,units:[]}));G.divDirty=true;}}
  const dm=new Map(G.divs.map(d=>[d.id,d]));for(const d of G.divs)d.units=[];
  for(const u of G.units){const d=u.team===1&&u.divId?dm.get(u.divId):null;u.div=d||null;if(d)d.units.push(u);}
  if(p.b){if(p.b.full)MP.bmap.clear();
    for(const [id,ti,ow,c0,hp,prog,eff,cid] of p.b.add){const ci=MC(c0),type=BTYPES[ti];let b=MP.bmap.get(id);
      if(!b){b={id,type,ci,x:(ci%G.W+.5)*CELL,y:((ci/G.W|0)+.5)*CELL,maxHp:BT[type].hp,smokeT:Math.random()};MP.bmap.set(id,b);}
      Object.assign(b,{owner:MT(ow),hp,prog,eff,city:cid>=0?G.cities[cid]:null});}
    for(const id of p.b.del)MP.bmap.delete(id);
    G.blds=[...MP.bmap.values()];G.bAt=new Map(G.blds.map(b=>[b.ci,b]));G.placeDirty=true;}
  if(p.w){if(p.wf){G.wall.fill(0);G.wallHp.fill(0);}for(let i=0;i<p.w.length;i+=3){const c=MC(p.w[i]);G.wall[c]=MT(p.w[i+1]);G.wallHp[c]=p.w[i+2]/15*BT.wall.hp;}G.placeDirty=true;}
  if(p.over&&!G.over)mpOver(p.over);
}
function mpEv(e){const X=MX(e[1]),Y=MY(e[2]);
  switch(e[0]){
    case 'x':return explode(X,Y,e[3]);case 'p':return puff(X,Y,e[3],e[4]);case 's':return scorch(X,Y,e[3],e[4]);case 'd':return debris(X,Y,e[3]);
    case 'b':return burn(X,Y,e[3]);case 'k':return shakeAt(X,Y,e[3]);case 'm':return smoke(X,Y,e[3]);case 'z':return sparks(X,Y,e[3]);case 'c':return crater(X,Y);
    case 'e':return exFx(X,Y,e[3]);case 'f':return flakFx(X,Y);case 'S':return sfx(e[1],MX(e[2]),MY(e[3]));case 'F':return mpFire(e);}}
function mpFire([,id,kind,n,tx0,ty0,durMs,stepMs]){const u=MP.units.get(id);if(!u)return;const tx=MX(tx0),ty=MY(ty0);u.fireT=G.time;
  if(kind==='shell'){const [mx,my]=muzzlePos(u);G.proj.push({kind,sx:mx,sy:my,tx,ty,t:0,dur:durMs/1000,vis:true});mzFx(mx,my,u.ang,2.2,0);return;}
  if(kind==='bomb'){G.proj.push({kind,sx:u.x,sy:u.y,tx,ty,t:0,dur:durMs/1000,vis:true,ang:u.ang});return;}
  const sp=kind==='ap'?900:kind==='flak'?620:720,step=stepMs/1000,air=UT[u.type].air,turret=u.type==='tank'||u.type==='aa';
  for(let k=0;k<n;k++){const [mx,my]=muzzlePos(u,u.type==='inf'?(k*2)%menOf(u):k),x=tx+rnd(-3,3),y=ty+rnd(-3,3);
    G.proj.push({kind,sx:mx,sy:my,tx:x,ty:y,t:-k*step,dur:Math.hypot(x-mx,y-my)/sp,vis:true});
    mzFx(mx,my,air?u.ang:turret?u.tAng:Math.atan2(ty-u.y,tx-u.x),kind==='ap'?1.6:.6,k*step);}}
function mpOver(o){MP.state='over';sessionStorage.removeItem('rw_match');G.mpStats=o.stats;gameOver(MT(o.winner)===1?'win':'lose',o.why);
  const w=MP.ws;MP.ws=null;if(w)setTimeout(()=>{try{w.close();}catch(e){}},1500);}

// ---------- per-frame smoothing and effects derived from state ----------
function mpFrame(dt){
  if(!G||!G.mp)return;G.time+=dt;const k=1-Math.exp(-dt*9);
  for(const u of G.units){const ox=u.x,oy=u.y,dx=u.tx-u.x,dy=u.ty-u.y,d=UT[u.type];
    if(dx*dx+dy*dy>110*110){u.x=u.tx;u.y=u.ty;}else{u.x+=dx*k;u.y+=dy*k;}
    const da=wrapA(u.ta-u.ang);u.ang+=da*k;u.tAng+=wrapA(u.tta-u.tAng)*k;
    const md=Math.hypot(u.x-ox,u.y-oy);u.mv=dt>0?md/dt:0;u.walk+=md;if(u.flash>0)u.flash-=dt;
    if(d.cls==='veh'&&md>0){u.trk+=md;if(u.trk>4.5){u.trk=0;trackMark(u);}}
    if(d.air&&!u.landed){if((u.trT-=dt)<=0){u.trT=.05;u.trail.push(u.x,u.y);if(u.trail.length>24)u.trail.splice(0,2);}u.bank+=(clamp(da*6,-1,1)-u.bank)*Math.min(1,dt*4);}
    else if(d.air)u.trail.length=0;}
  updateFx(dt);civTick(dt);if(!G.over&&MP.state==='play')alerts();
  if(MP.ws&&MP.state==='play'&&performance.now()-MP.lastMsg>9000){MP.lastMsg=performance.now();try{MP.ws.close();}catch(e){}}
}
