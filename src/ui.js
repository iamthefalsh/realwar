
// ================= LOOP =================
// one entry point for player actions: local in single player, sent to the server online
function doCmd(name,a){if(G.mp){mpSend(name,a);return '';}const r=runCmd(1,name,a);if(r)toast(r,'bad');return r;}
function alerts(){
  const A=G.alertT,cap=capitalOf(1),E=G.E[1];
  if(cap&&cap.contest>.3&&!(A.cap>G.time)){A.cap=G.time+25;toast('Capital under attack!','bad','warn');sfx('alert');vib([40,40,40]);voice(1,'attack',{city:cap.name},true);}
  if(!(A.air>G.time)&&G.units.some(u=>u.team===2&&UT[u.type].air&&!u.landed&&u.vis[1])){A.air=G.time+40;toast('Enemy aircraft spotted','bad','warn');}
  if(E.starving&&!(A.food>G.time)){A.food=G.time+30;toast('Your people are starving! Build farms or buy food','bad','food');}
  if(E.res.oil<4&&G.units.some(u=>u.team===1&&UT[u.type].fuel)&&!(A.oil>G.time)){A.oil=G.time+35;toast('Out of petrol! Vehicles and planes cannot refuel','bad','oil');}
  if(E.res.guns<UT.inf.cost.guns&&!(A.guns>G.time)&&G.time>20){A.guns=G.time+45;toast('No guns for new infantry. Build an Arms Factory or buy guns','bad','guns');voice(1,'noguns');}
  for(const c of G.cities)if(c.owner===1&&c.panic>.6&&!(A['p'+c.id]>G.time)){A['p'+c.id]=G.time+30;voice(1,'attack',{city:c.name});}
}
const TIPS=[[4,'Open BUILD to place farms, homes and mines on resource deposits','t_build'],[16,'Infantry need guns. An Arms Factory turns iron + wood into guns','guns'],
  [30,'Tanks and planes need steel (iron + coal) and burn petrol from Oil Wells','steel'],[46,'Trade with neutral nations and sign treaties in the WORLD tab','t_world'],
  [62,'Keep your PEOPLE fed, housed and happy, or they will protest and riot','t_people'],[80,'Paint walls along your border: drag across your land in wall mode','wall']];
let tipI=0;
function advisor(){if(G.peaceEnd<=0||tipI>=TIPS.length)return;if(G.time>=TIPS[tipI][0]){toast(TIPS[tipI][1],'',TIPS[tipI][2]);tipI++;}}
let lastT=performance.now(),uiT=0,demoEnd=0;
function frame(now){
  const dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  if(G&&G.mp)mpFrame(dt);
  else if(G&&!G.paused){if(!G.over)for(let i=0;i<G.speed;i++)update(dt);updateFx(dt);civTick(dt);if(!G.demo&&!G.over){alerts();advisor();}}
  if(G&&G.demo){if(G.over){if(!demoEnd)demoEnd=now+2500;else if(now>demoEnd){demoEnd=0;startDemo();}}
    CAM.z=CAM.minZ*1.08;CAM.x=G.W*CELL/2+Math.sin(now/9000)*40;CAM.y=G.H*CELL/2+Math.cos(now/11000)*30;}
  camTick(dt);render();
  if(G&&!G.demo){if((uiT-=dt)<=0){uiT=.25;uiTick();tutTick();}
    if(G.selDirty){G.selDirty=false;renderPanel();}
    if(G.divDirty){G.divDirty=false;renderDivBar();}}
  requestAnimationFrame(frame);
}

// ================= INPUT =================
const ptrs=new Map();let gest=null,lpTimer=0,boxMode=false;
function pickUnit(wx,wy,team){const R=Math.max(8,22/CAM.z);let b=null,bd=R*R;
  for(const u of G.units){if(u.dead||u.landed||u.team!==team||(team!==1&&!u.vis[1]))continue;const d=dist2(wx,wy,u.x,u.y);if(d<bd){bd=d;b=u;}}return b}
function pickCity(wx,wy,R){R=R||Math.max(14,24/CAM.z);let b=null,bd=R*R;for(const c of G.cities){const d=dist2(wx,wy,c.x,c.y);if(d<bd){bd=d;b=c;}}return b}
function pickBld(wx,wy){const R=Math.max(9,16/CAM.z);let b=null,bd=R*R;for(const o of G.blds){const d=dist2(wx,wy,o.x,o.y);if(d<bd){bd=d;b=o;}}return b}
function clearFocus(){G.selCity=null;G.selBld=null;}
function setSel(list){for(const u of G.sel)u.sel=false;G.sel=list.filter(u=>!u.dead&&u.team===1);for(const u of G.sel)u.sel=true;clearFocus();if(G.sel.length)G.tab=null;G.selDirty=true;}
function openCity(c){setSel([]);G.tab=null;G.selCity=c;G.selDirty=true;sfx('blip');}
function onTap(sx,sy,long){
  if(!G||G.demo||G.over)return;const [wx,wy]=s2w(sx,sy);
  if(G.place){placeAt(wx,wy);return;}
  if(!G.sel.length&&!long){const c=pickCity(wx,wy,13*clamp(1/CAM.z,.75,2.2));if(c){openCity(c);return;}}
  const u=pickUnit(wx,wy,1);
  if(u){const d=u.div;
    if(long||!d)setSel([u]);
    else{const same=G.sel.length===d.units.length&&d.units.every(x=>x.sel);setSel(same?[u]:d.units);}
    sfx('blip');return;}
  if(G.sel.length){
    const e=pickUnit(wx,wy,2),tx=e?e.x:wx,ty=e?e.y:wy;
    if(G.peace&&G.own[cellIdx(tx,ty)]===2&&!(G.alertT.bord>G.time)){G.alertT.bord=G.time+4;toast('Borders are closed until war is declared','', 'warn');}
    doCmd('move',{ids:G.sel.map(u=>u.id),x:tx,y:ty,tid:e?e.id:0});
    G.markers.push({x:tx,y:ty,life:.6,max:.6,c:e?'255,110,110':'255,255,255'});sfx('blip');return;}
  const b=pickBld(wx,wy);if(b){setSel([]);G.tab=null;G.selBld=b;G.selDirty=true;sfx('blip');return;}
  const c=pickCity(wx,wy);if(c){openCity(c);return;}
  if(G.selCity||G.selBld||G.tab){clearFocus();G.tab=null;G.country=null;G.selDirty=true;}
}
function boxSelect(g,add){const x0=Math.min(g.sx,g.ex),x1=Math.max(g.sx,g.ex),y0=Math.min(g.sy,g.ey),y1=Math.max(g.sy,g.ey);
  const l=G.units.filter(u=>{if(u.team!==1||u.dead||u.landed)return false;const [sx,sy]=w2s(u.x,u.y);return sx>=x0&&sx<=x1&&sy>=y0&&sy<=y1;});
  setSel(add?[...new Set([...G.sel,...l])]:l);boxMode=false;$('#bBox').classList.remove('on');if(l.length)sfx('blip');}
// ---- mouse (PC): left = select / box, right = command, right/middle drag = pan ----
function orderAt(sx,sy){const [wx,wy]=s2w(sx,sy),e=pickUnit(wx,wy,2),tx=e?e.x:wx,ty=e?e.y:wy;
  if(G.peace&&G.own[cellIdx(tx,ty)]===2&&!(G.alertT.bord>G.time)){G.alertT.bord=G.time+4;toast('Borders are closed until war is declared','','warn');}
  doCmd('move',{ids:G.sel.map(u=>u.id),x:tx,y:ty,tid:e?e.id:0});G.markers.push({x:tx,y:ty,life:.6,max:.6,c:e?'255,110,110':'255,255,255'});sfx('blip');}
function leftClick(sx,sy,shift){
  if(!G||G.demo||G.over)return;const [wx,wy]=s2w(sx,sy);
  if(G.place){placeAt(wx,wy);return;}
  const u=pickUnit(wx,wy,1);
  if(u){if(shift){const has=G.sel.includes(u);setSel(has?G.sel.filter(x=>x!==u):[...G.sel,u]);}else setSel([u]);sfx('blip');return;}
  if(shift)return;
  const c=pickCity(wx,wy,13*clamp(1/CAM.z,.75,2.2));if(c){openCity(c);return;}
  const b=pickBld(wx,wy);if(b){setSel([]);G.tab=null;G.selBld=b;G.selDirty=true;sfx('blip');return;}
  const c2=pickCity(wx,wy);if(c2){openCity(c2);return;}
  if(G.sel.length)setSel([]);
  if(G.selCity||G.selBld||G.tab){clearFocus();G.tab=null;G.country=null;G.selDirty=true;}
}
function rightClick(sx,sy){if(!G||G.demo||G.over)return;if(G.place){endPlace();return;}if(G.sel.length)orderAt(sx,sy);}
function dblPick(sx,sy){if(!G||G.demo||G.place)return;const [wx,wy]=s2w(sx,sy),u=pickUnit(wx,wy,1);if(!u)return;
  if(u.div)setSel(u.div.units);else setSel(G.units.filter(o=>o.team===1&&o.type===u.type&&!o.landed&&(([x,y])=>x>=0&&y>=0&&x<=VW&&y<=VH)(w2s(o.x,o.y))));sfx('blip');}
const isMouse=e=>e.pointerType==='mouse';
let hoverX=-1,hoverY=-1,lastClick={t:0,x:0,y:0};
function paintTo(sx,sy){const [wx,wy]=s2w(sx,sy),cx=clamp(Math.floor(wx/CELL),0,G.W-1),cy=clamp(Math.floor(wy/CELL),0,G.H-1);
  let x=gest.lx==null?cx:gest.lx,y=gest.ly==null?cy:gest.ly;const dx=Math.abs(cx-x),dy=-Math.abs(cy-y),sx2=x<cx?1:-1,sy2=y<cy?1:-1;let err=dx+dy;
  const cells=[];
  for(let n=0;n<200;n++){if(!(x===gest.lx&&y===gest.ly)){const i=y*G.W+x,e=placeErr(1,'wall',i)||(missing(G.E[1],BT.wall.cost)?'Not enough '+missing(G.E[1],BT.wall.cost):'');if(e){if(!gest.err)gest.err=e;}else cells.push(i);}
    if(x===cx&&y===cy)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx2;}if(e2<=dx){err+=dx;y+=sy2;}}
  gest.lx=cx;gest.ly=cy;if(cells.length)placeCells('wall',cells);}
function finishPaint(){if(gest&&gest.type==='paint'&&gest.err&&!gest.ok)toast(gest.err,'bad');gest=null;}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  if(!G||G.demo)return;cv.setPointerCapture(e.pointerId);
  if(isMouse(e)){e.preventDefault();
    if(e.button===0&&G.place&&G.place.type==='wall'){gest={type:'paint',lx:null,ly:null,err:'',ok:0,mouse:1};paintTo(e.clientX,e.clientY);return;}
    gest={type:e.button===0?'lpend':e.button===2?'rpend':'pan',sx:e.clientX,sy:e.clientY,ex:e.clientX,ey:e.clientY,cx:CAM.x,cy:CAM.y,shift:e.shiftKey,mouse:1,btn:e.button};return;}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1){
    if(G.place&&G.place.type==='wall'){gest={type:'paint',lx:null,ly:null,err:'',ok:0};paintTo(e.clientX,e.clientY);return;}
    gest={type:'pend',sx:e.clientX,sy:e.clientY,ex:e.clientX,ey:e.clientY,cx:CAM.x,cy:CAM.y,box:boxMode,lp:false};
    clearTimeout(lpTimer);if(!G.place)lpTimer=setTimeout(()=>{if(gest&&gest.type==='pend'){gest.box=true;gest.lp=true;vib(12);}},380);}
  else if(ptrs.size===2){clearTimeout(lpTimer);if(gest&&gest.type==='paint')finishPaint();const [a,b]=[...ptrs.values()],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,[wx,wy]=s2w(mx,my);
    gest={type:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,z0:CAM.z,wx,wy};}
});
cv.addEventListener('pointermove',e=>{
  if(isMouse(e)){hoverX=e.clientX;hoverY=e.clientY;if(!gest||!gest.mouse){mouseCursor();return;}
    if(gest.type==='paint'){paintTo(e.clientX,e.clientY);return;}
    gest.ex=e.clientX;gest.ey=e.clientY;const far=Math.hypot(gest.ex-gest.sx,gest.ey-gest.sy)>6;
    if(gest.type==='lpend'&&far&&!G.place)gest.type='box';else if(gest.type==='rpend'&&far)gest.type='pan';
    if(gest.type==='pan'){CAM.x=gest.cx-(gest.ex-gest.sx)/CAM.z;CAM.y=gest.cy-(gest.ey-gest.sy)/CAM.z;clampCam();}
    return;}
  if(!ptrs.has(e.pointerId)||!gest)return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(gest.type==='pinch'&&ptrs.size>=2){const [a,b]=[...ptrs.values()],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    CAM.z=clamp(gest.z0*Math.hypot(a.x-b.x,a.y-b.y)/gest.d0,CAM.minZ,CAM.maxZ);CAM.x=gest.wx-(mx-VW/2)/CAM.z;CAM.y=gest.wy-(my-VH/2)/CAM.z;clampCam();return;}
  if(gest.type==='paint'){paintTo(e.clientX,e.clientY);return;}
  gest.ex=e.clientX;gest.ey=e.clientY;
  if(gest.type==='pend'&&Math.hypot(gest.ex-gest.sx,gest.ey-gest.sy)>9){clearTimeout(lpTimer);gest.type=gest.box?'box':'pan';}
  if(gest.type==='pan'){CAM.x=gest.cx-(gest.ex-gest.sx)/CAM.z;CAM.y=gest.cy-(gest.ey-gest.sy)/CAM.z;clampCam();}
});
function endPtr(e,cancel){
  if(isMouse(e)){const g=gest;if(!g||!g.mouse)return;gest=null;if(cancel)return;
    if(g.type==='paint'){gest=g;finishPaint();return;}
    if(g.type==='box')boxSelect(g,g.shift||e.shiftKey);
    else if(g.type==='lpend'){const now=performance.now();if(now-lastClick.t<330&&Math.hypot(g.sx-lastClick.x,g.sy-lastClick.y)<8){dblPick(g.sx,g.sy);lastClick.t=0;}
      else{leftClick(g.sx,g.sy,g.shift||e.shiftKey);lastClick={t:now,x:g.sx,y:g.sy};}}
    else if(g.type==='rpend')rightClick(g.sx,g.sy);
    return;}
  if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);clearTimeout(lpTimer);if(!gest)return;
  if(gest.type==='paint'){finishPaint();return;}
  if(gest.type==='pinch'){if(ptrs.size===1){const p=[...ptrs.values()][0];gest={type:'pan',sx:p.x,sy:p.y,ex:p.x,ey:p.y,cx:CAM.x,cy:CAM.y};}else if(!ptrs.size)gest=null;return;}
  if(!cancel){if(gest.type==='pend')onTap(gest.sx,gest.sy,gest.lp);else if(gest.type==='box')boxSelect(gest);}
  if(!ptrs.size)gest=null;
}
cv.addEventListener('pointerup',e=>endPtr(e,false));cv.addEventListener('pointercancel',e=>endPtr(e,true));
cv.addEventListener('wheel',e=>{if(!G||G.demo)return;e.preventDefault();const [wx,wy]=s2w(e.clientX,e.clientY);
  CAM.z=clamp(CAM.z*Math.exp(-e.deltaY*.0015),CAM.minZ,CAM.maxZ);CAM.x=wx-(e.clientX-VW/2)/CAM.z;CAM.y=wy-(e.clientY-VH/2)/CAM.z;clampCam();},{passive:false});
cv.addEventListener('pointerleave',e=>{if(isMouse(e)){hoverX=-1;hoverY=-1;}});
document.addEventListener('gesturestart',e=>e.preventDefault());

// ================= PLACEMENT =================
function startPlace(t){G.place={type:t,n:0};G.placeDirty=true;setSel([]);G.tab=null;G.selDirty=true;
  toast(t==='wall'?(IS_PC?'Left-drag across your land to paint walls. Right-click to stop':'Drag across your land to paint walls'):`${IS_PC?'Click':'Tap'} a highlighted spot to build a ${BT[t].n}${IS_PC?'. Right-click to stop':''}`,'',BT[t].ico);}
function endPlace(){G.place=null;G.placeCells=null;G.tab='build';G.selDirty=true;}
function placeCells(t,cells){const r=doCmd('place',{type:t,cells});if(!r){G.place.n+=cells.length;G.placeDirty=true;if(gest&&gest.type==='paint')gest.ok++;sfx('build');}return r}
function placeOne(t,i){const e=placeErr(1,t,i);if(e)return e;const m=missing(G.E[1],BT[t].cost);if(m)return 'Not enough '+m;return placeCells(t,[i])}
function placeAt(wx,wy){const t=G.place.type,W=G.W,cx=Math.floor(wx/CELL),cy=Math.floor(wy/CELL),R=t==='wall'?0:2;let best=-1,bd=1e9;
  for(let y=cy-R;y<=cy+R;y++)for(let x=cx-R;x<=cx+R;x++){if(x<0||y<0||x>=W||y>=G.H)continue;const i=y*W+x;if(placeErr(1,t,i))continue;const d=(x+.5-wx/CELL)**2+(y+.5-wy/CELL)**2;if(d<bd){bd=d;best=i;}}
  if(best<0){toast(placeErr(1,t,clamp(cy,0,G.H-1)*W+clamp(cx,0,W-1)),'bad');return;}
  const e=placeOne(t,best);if(!e)G.markers.push({x:(best%W+.5)*CELL,y:((best/W|0)+.5)*CELL,life:.5,max:.5,c:'123,227,154'});}
function renderPlace(){const P=$('#place');if(!G.place){P.classList.add('hide');return;}const t=G.place.type,B=BT[t];P.classList.remove('hide');
  P.innerHTML=`<div class="pi"><b>${svgI(B.ico)}${B.n} <span data-cost="bld:${t}"></span></b><small>${t==='wall'?'Drag to paint walls · pinch to move the map':B.d+' · tap a green spot'} · <span data-v="placed">0</span> built</small></div><button class="btn pri" id="bDone">Done</button>`;
  $('#bDone').onclick=endPlace;liveUpdate(P);}

// ================= HUD =================
function toast(msg,kind,ic){if(!G||G.demo||!msg)return;const T=$('#toasts'),el=document.createElement('div');el.className='toast '+(kind||'');el.innerHTML=(ic?svgI(ic):'')+'<span></span>';el.lastChild.textContent=msg;T.prepend(el);
  while(T.children.length>3)T.lastChild.remove();setTimeout(()=>el.classList.add('out'),2900);setTimeout(()=>el.remove(),3400);}
function voiceToast(p){const T=$('#toasts'),el=document.createElement('div');el.className='toast vt';el.innerHTML=avatarSVG(p,p.mood)+`<div><b>${p.name}, ${p.age} · ${p.job}</b><span></span></div>`;
  el.querySelector('span').textContent='“'+p.text+'”';T.prepend(el);while(T.children.length>3)T.lastChild.remove();setTimeout(()=>el.classList.add('out'),4200);setTimeout(()=>el.remove(),4700);}
const TABS=[['army','ARMY','t_army'],['build','BUILD','t_build'],['market','MARKET','t_market'],['world','WORLD','t_world'],['people','PEOPLE','t_people']];
function renderTabs(){const cur=!G.sel.length&&!G.selCity&&!G.selBld&&!G.place?G.tab:null;
  $('#tabs').innerHTML=TABS.map(([k,n,i])=>`<button class="tab${cur===k?' on':''}" data-tab="${k}">${svgI(i)}${n}<kbd>${TAB_KEY[k]}</kbd><span class="badge hide" data-badge="${k}"></span></button>`).join('');}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b||!G)return;const k=b.dataset.tab;if(G.place)G.place=null;
  const cur=!G.sel.length&&!G.selCity&&!G.selBld?G.tab:null;setSel([]);G.tab=cur===k?null:k;if(k!=='world')G.country=null;G.selDirty=true;sfx('blip');});
function renderResBar(){
  $('#resBar').innerHTML=`<button class="rc" data-go="people">${svgI('pop')}<b data-v="pop"></b><i data-v="growth"></i></button><button class="rc" data-go="army">${svgI('mp')}<b data-v="mp"></b></button>`+
    RES.map(r=>`<button class="rc" data-go="market" data-low="${r}">${svgI(r)}<b data-v="res:${r}"></b><i data-v="net:${r}"></i></button>`).join('');}
$('#resBar').addEventListener('click',e=>{const b=e.target.closest('.rc');if(!b)return;setSel([]);G.place=null;G.country=null;G.tab=b.dataset.go;G.selDirty=true;});
function uiTick(){
  const E=G.E[1];
  $('#mVal').textContent='$'+fmt(E.money);$('#mInc').textContent=fmtR(E.tax)+'/s';
  const p=G.terrPct[1]*100,q=G.terrPct[2]*100;$('#tP').textContent=p.toFixed(0)+'%';$('#tE').textContent=q.toFixed(0)+'%';
  $('#tbP').style.width=p+'%';$('#tbE').style.width=q+'%';$('#tDate').textContent=dateStr(G.time);
  const ph=$('#phase');
  if(G.mp){ph.className='war';$('#phT').textContent=`ONLINE · VS ${MP.opp.toUpperCase()} · ${fmtT(G.time)}${MP.ping?' · '+MP.ping+'MS':''}`;$('#phB').parentNode.style.display='none';}
  else if(G.tut&&G.peace){ph.className='peace';$('#phT').textContent=`TRAINING · STEP ${Math.min(G.tut.i+1,TUT.length)} OF ${TUT.length}`;$('#phB').style.width=(100*Math.max(0,G.tut.i)/TUT.length)+'%';$('#phB').parentNode.style.display='';}
  else if(G.peace){ph.className='peace';$('#phT').textContent='PEACE · WAR IN '+durStr(G.peaceEnd-G.time);$('#phB').style.width=(100*G.time/G.peaceEnd)+'%';$('#phB').parentNode.style.display='';}
  else{ph.className='war';$('#phT').textContent='AT WAR · '+fmtT(G.time-G.peaceEnd);$('#phB').parentNode.style.display='none';}
  liveUpdate($('#resBar'));
  for(const el of document.querySelectorAll('#resBar [data-low]')){const r=el.dataset.low;el.classList.toggle('low',E.res[r]<(r==='gold'?3:12)&&E.net[r]<=0);}
  const pb=document.querySelector('[data-badge="people"]');if(pb)pb.classList.toggle('hide',!(E.starving||E.state==='protest'||E.state==='riot'||E.collapseT>0));
  liveUpdate($('#panel'));if(G.place)liveUpdate($('#place'));drawMini();
}
// ---- live values bound with data-v / data-en / data-cost attributes ----
const CKEYS=new Set(['cbuy','csell','cst','crel','cmp','chire']);
function liveVal(k){const a=k.split(':'),E=G.E[1],c=CKEYS.has(a[0])?G.countries[+a[1]]:null;
  switch(a[0]){
    case 'pop':return fmt(E.pop);case 'cap':return fmt(E.cap);case 'mp':return fmt(E.mp);case 'mil':return fmt(E.mil);case 'mpCap':return fmt(E.mpCap);
    case 'growth':{const v=E.growth;return [fmtR(v)+'/s',v<-.5?'n':v>.5?'p':''];}
    case 'recruit':return fmtR(E.recruit)+'/s';case 'jobs':return fmt(E.jobs);case 'labor':return fmt(E.labor);
    case 'unemp':return (E.unemp*100).toFixed(0)+'%';case 'fill':return (E.fill*100).toFixed(0)+'%';
    case 'hap':return String(Math.round(E.hap));case 'state':return STATE_TXT[E.state];case 'tax':return fmtR(E.tax)+'/s';
    case 'res':return fmt(E.res[a[1]]);
    case 'net':{const v=E.net[a[1]];return [fmtR(v),v<-.05?'n':v>.05?'p':''];}
    case 'mprice':return '$'+mPrice(E,a[1]).toFixed(1);
    case 'mbuy':return '$'+fmt(mQuote(E,a[1],G.qty,true));case 'msell':return '$'+fmt(mQuote(E,a[1],G.qty,false));
    case 'cbuy':return '$'+fmt(cBuyP(c,a[2],1)*G.qty);case 'csell':return '$'+fmt(cSellP(c,a[2],1)*G.qty);
    case 'cst':return fmt(c.st[a[2]]);case 'crel':return String(Math.round(c.rel[+a[2]]));case 'cmp':return fmt(c.mpA);case 'chire':return '$'+fmt(hireP(c,1));
    case 'cpop':{const ct=G.cities[+a[1]];return fmt(ct.pop)+' / '+fmt(ct.cap);}
    case 'cmood':{const ct=G.cities[+a[1]],m=cityMood(ct);return ct.panic>.4?'Panic!':m>65?'Happy':m>40?'Content':m>22?'Unhappy':'Furious';}
    case 'placed':return String(G.place?G.place.n:0);
    case 'beff':{const b=G.selBld;return b?(b.prog<1?'Building '+Math.round(b.prog*100)+'%':Math.round(b.eff*100)+'%'):'';}
    case 'bhp':{const b=G.selBld;return b?Math.round(b.hp)+' / '+b.maxHp:'';}
    case 'bout':{const b=G.selBld;if(!b||!BT[b.type].out)return '';return Object.entries(BT[b.type].out).map(([r,v])=>`+${(v*b.eff).toFixed(2)} ${RI[r].n.toLowerCase()}/s`).join(' ');}
    case 'warin':return durStr(Math.max(0,G.peaceEnd-G.time));
    case 'nu':return String(G.units.filter(u=>u.team===1&&u.type===a[1]).length);
  }return ''}
function liveEn(k){const a=k.split(':'),E=G.E[1];
  switch(a[0]){
    case 'bld':return !missing(E,BT[a[1]].cost);
    case 'unit':{const c=G.cities[+a[1]];return c.owner===1&&CAN_BUILD[c.type].includes(a[2])&&!missing(E,UT[a[2]].cost)&&c.queue.length<5;}
    case 'mbuy':return E.money>=mQuote(E,a[1],G.qty,true)&&E.mk[a[1]]-G.qty>RI[a[1]].mk*.08;
    case 'msell':return E.res[a[1]]>=G.qty;
    case 'cbuy':{const c=G.countries[+a[1]];return !embargo(c,1)&&c.st[a[2]]>=G.qty&&E.money>=cBuyP(c,a[2],1)*G.qty;}
    case 'csell':{const c=G.countries[+a[1]];return !embargo(c,1)&&c.dm[a[2]]>=G.qty&&E.res[a[2]]>=G.qty;}
    case 'sign':return !canSign(G.countries[+a[1]],a[2],1);
    case 'hire':{const c=G.countries[+a[1]],n=+a[2];return !embargo(c,1)&&c.mpA>=n&&E.money>=hireP(c,1)*n/100;}
    case 'gift':return a[2]==='gold'?E.res.gold>=5:E.money>=250;
  }return true}
function liveCost(k){const a=k.split(':'),E=G.E[1];
  if(a[0]==='bld')return costHTML(BT[a[1]].cost,E);if(a[0]==='unit')return costHTML(UT[a[1]].cost,E);if(a[0]==='treaty')return costHTML(TREATY[a[1]].cost,E);return ''}
function liveUpdate(root){if(!root||!G)return;
  for(const el of root.querySelectorAll('[data-v]')){const v=liveVal(el.dataset.v),t=Array.isArray(v)?v[0]:v;if(el.textContent!==t)el.textContent=t;
    if(Array.isArray(v)){el.classList.toggle('p',v[1]==='p');el.classList.toggle('n',v[1]==='n');}}
  for(const el of root.querySelectorAll('[data-en]'))el.classList.toggle('dis',!liveEn(el.dataset.en));
  for(const el of root.querySelectorAll('[data-cost]')){const h=liveCost(el.dataset.cost);if(el._h!==h){el._h=h;el.innerHTML=h;}}
  for(const el of root.querySelectorAll('[data-rel]')){const [cid,t]=el.dataset.rel.split(':'),v=G.countries[+cid].rel[+t];el.style.width=((v+100)/2)+'%';el.style.background=v>50?'#7be39a':v>15?'#5ec8ff':v>-15?'#9aa5b1':'#ff5a5a';}
  for(const el of root.querySelectorAll('canvas[data-spark]'))drawSpark(el,G.E[1].ph[el.dataset.spark]);
  if(root.id==='panel'){const hb=$('#selHp');if(hb&&G.sel.length){const f=G.sel.reduce((s,u)=>s+u.hp/u.maxHp,0)/G.sel.length;hb.style.width=f*100+'%';hb.style.background=hpCol(f);}
    const sf=$('#selFuel');if(sf){const l=G.sel.filter(u=>UT[u.type].fuel);sf.textContent=l.length?Math.round(100*l.reduce((s,u)=>s+u.fuel/UT[u.type].fuel,0)/l.length)+'%':'';}
    if(G.selCity){const q=$('#cq');if(q)renderQueue(q,G.selCity);if(G.selCity.owner!==1&&root.querySelector('.cards'))G.selDirty=true;}
    if(G.selBld&&!G.blds.includes(G.selBld)){G.selBld=null;G.selDirty=true;}
    if(G.tab==='people'&&!G.sel.length&&!G.selCity&&!G.selBld)livePeople();}
}
function drawSpark(cv2,h){const w=cv2.width=112,hh=cv2.height=48,g=cv2.getContext('2d');if(!h||h.length<2)return;
  let mn=Math.min(...h),mx=Math.max(...h);const flat=mx-mn<h[0]*.02;if(mx-mn<1e-6){mx+=.5;mn-=.5;}const up=h[h.length-1]>h[0];
  g.lineWidth=3;g.strokeStyle=flat?'#6b7785':up?'#ff8a92':'#7be39a';g.beginPath();h.forEach((v,i)=>{const x=i/(h.length-1)*(w-4)+2,y=hh-4-(v-mn)/(mx-mn)*(hh-8);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();}

// ================= PANELS =================
const X_BTN=`<button class="x" data-act="close">${svgI('x')}</button>`;
function selInfo(){const cnt={};for(const u of G.sel)cnt[u.type]=(cnt[u.type]||0)+1;const d=G.sel[0]&&G.sel[0].div;
  const isDiv=!!d&&G.sel.length===d.units.length&&G.sel.every(u=>u.div===d);return {cnt,div:isDiv?d:null};}
function panelKey(){if(G.place)return '';if(G.sel.length)return 'sel';if(G.selCity)return 'city'+G.selCity.id;if(G.selBld)return 'bld'+G.selBld.id;if(G.tab==='world'&&G.country)return 'country'+G.country.id;return G.tab?'tab'+G.tab:''}
function renderPanel(){
  const P=$('#panel'),k=panelKey();renderTabs();renderPlace();
  if(!k){P.classList.add('hide');P.innerHTML='';G.pk='';return;}
  P.classList.remove('hide');const keep=G.pk===k?P.scrollTop:0;
  P.innerHTML=G.sel.length?selPanel():G.selCity?cityPanel(G.selCity):G.selBld?bldPanel(G.selBld):G.country?countryPanel(G.country):TABP[G.tab]();
  P.scrollTop=keep;G.pk=k;G.peopleSig=null;liveUpdate(P);tutHighlight();
}
function selPanel(){
  const {cnt,div}=selInfo(),n=G.sel.length,ar=G.sel.every(u=>u.retreatOn),onlyAir=G.sel.every(u=>UT[u.type].air),veh=G.sel.some(u=>UT[u.type].cls==='veh'),allies=G.sel.filter(u=>u.ally!=null).length;
  const u0=G.sel[0],title=div?`<span class="dot" style="background:${div.color}"></span>${div.name}`:n===1?UT[u0.type].name+(u0.rank?' · Rank '+u0.rank:'')+(u0.ally!=null?` <small>${G.countries[u0.ally].name}</small>`:''):`${n} units`;
  return `<div class="ph"><div class="pt">${title}</div><div class="hpw"><div class="hpb" id="selHp"></div></div>${X_BTN}</div>
  <div class="comp">${TYPES.filter(t=>cnt[t]).map(t=>`<span class="cc">${uIcon(t)}<b>${cnt[t]}</b></span>`).join('')}${G.sel.some(u=>UT[u.type].fuel)?`<span class="cc">${svgI('oil')}<b id="selFuel"></b></span>`:''}${allies?`<span class="cc">${svgI('handshake')}<b>${allies} allied</b></span>`:''}</div>
  <div class="acts">${div?`<button data-act="disband">Disband</button>`:`<button data-act="form" class="pri">Form Division</button>`}
  ${n>1?`<button data-act="split">Split</button>`:''}<button data-act="stop">${onlyAir?'Return to base':'Hold'}</button>
  ${onlyAir?'':`<button data-act="retreat">Retreat</button>${veh?'<button data-act="refuel">Refuel</button>':''}<button data-act="autoret" class="${ar?'on':''}">Auto-retreat ${ar?'ON':'OFF'}</button>`}</div>
  <div class="hint">${G.peace?'Peacetime: enemy borders are closed. Claim neutral land and cities. ':''}${IS_PC?'Right-click to move · right-click an enemy to attack · F division · X hold · R retreat · Ctrl+1–9 save group':'Tap map to move · tap enemy to attack'}${onlyAir?(IS_PC?' · bombers hit buildings & walls near the target · right-click a base to land':' · bombers hit buildings & walls near the target · tap a base to land'):''}</div>`;
}
function renderQueue(q,c){const sig=c.queue.join(',');if(q.dataset.sig!==sig){q.dataset.sig=sig;q.innerHTML=c.queue.length?c.queue.map((t,i)=>`<button class="qi" data-act="cancel" data-i="${i}">${uIcon(t,TC[1].l)}${i===0?'<div class="pg"></div>':''}</button>`).join('')+'<span class="qe">tap to cancel</span>':'<span class="qe">Queue empty. Pick a unit below</span>';}
  const pg=q.querySelector('.pg');if(pg&&c.queue.length)pg.style.width=(c.prog/UT[c.queue[0]].time*100)+'%';}
function cityPanel(c){const mine=c.owner===1,can=CAN_BUILD[c.type];
  const head=`<div class="ph"><div class="pt"><span class="dot" style="background:${TC[c.owner].m}"></span>${c.name}<small>${CITY_NAME[c.type]}</small></div>${X_BTN}</div>
   <div class="kv"><div><b data-v="cpop:${c.id}"></b><span>PEOPLE</span></div><div><b data-v="cmood:${c.id}"></b><span>MOOD</span></div><div><b>${c.owner?(c.owner===1?G.nat[1].name:G.nat[2].name):'Neutral'}</b><span>OWNER</span></div></div>`;
  if(!mine)return head+`<div class="hint">${c.owner?'Enemy':'Neutral'} ${CITY_NAME[c.type].toLowerCase()}. Move ground troops into it. Once no defenders remain, hold it until the ring fills to take the city, its province and its people.${G.peace&&c.owner?' Borders are closed until war.':''}</div>`;
  return head+`<div class="sh">RECRUIT</div><div class="queue" id="cq"></div><div class="cards">${TYPES.map(t=>`<button class="card${can.includes(t)?'':' na'}" data-act="build" data-t="${t}" data-en="unit:${c.id}:${t}"><div class="ct">${uIcon(t,TC[1].l)}<span>${UT[t].name}</span><em>${UT[t].time}s</em></div><span data-cost="unit:${t}"></span><small>${can.includes(t)?UT[t].tag:'Needs '+(UT[t].air?'an Airbase':'a Factory')}</small></button>`).join('')}</div>
   <div class="hint">Units cost money, resources and manpower. Infantry need guns.</div>`;}
function bldPanel(b){const B=BT[b.type],mine=b.owner===1;
  return `<div class="ph"><div class="pt">${svgI(B.ico)}${B.n}<small>${b.owner===1?'Yours':b.owner===2?'Enemy':'Neutral'}</small></div>${X_BTN}</div>
  <div class="kv"><div><b data-v="beff"></b><span>${B.out?'OUTPUT':'STATUS'}</span></div><div><b data-v="bhp"></b><span>CONDITION</span></div><div><b>${B.work?fmt(B.work):b.type==='house'?'+'+fmt(B.cap):'-'}</b><span>${B.work?'WORKERS':'HOMES'}</span></div></div>
  ${B.out?`<div class="hint"><span data-v="bout"></span>${B.inp?' · uses '+Object.entries(B.inp).map(([r,v])=>v+' '+RI[r].n.toLowerCase()+'/s').join(', '):''}</div><div class="hint">Output drops when you lack workers, inputs or your people are unhappy.</div>`:''}
  ${b.type==='house'&&b.city?`<div class="hint">Homes for the people of ${b.city.name}.</div>`:''}
  ${mine?`<div class="acts" style="margin-top:10px"><button data-act="demolish">Demolish (25% refund)</button></div>`:''}`;}
const TABP={
 army(){const E=G.E[1],cities=G.cities.filter(c=>c.owner===1);
  return `<div class="ph"><div class="pt">${svgI('t_army')}Military<small>${G.nat[1].full}</small></div>${X_BTN}</div>
  ${G.peace?`<div class="tr"><div><b>Peacetime</b><small>War begins automatically in <span data-v="warin"></span>. Borders are closed until then.</small></div><button class="btn red" data-act="war">Declare war</button></div>`:''}
  <div class="kv"><div><b data-v="mp"></b><span>MANPOWER</span></div><div><b data-v="mil"></b><span>MILITARY</span></div><div><b data-v="mpCap"></b><span>DRAFT LIMIT</span></div>
   <div><b data-v="recruit"></b><span>RECRUITING</span></div><div><b data-v="res:guns"></b><span>GUNS</span></div><div><b data-v="res:oil"></b><span>PETROL</span></div></div>
  ${polBlock('draft')}
  <div class="sh">FORCES</div><div class="comp">${TYPES.map(t=>`<span class="cc">${uIcon(t)}<b data-v="nu:${t}"></b></span>`).join('')}</div>
  <div class="sh">CITIES · TAP TO RECRUIT</div>${cities.map(c=>`<button class="tr" style="width:100%;text-align:left;border:0" data-act="city" data-id="${c.id}"><div><b>${c.name}</b><small>${CITY_NAME[c.type]} · ${CAN_BUILD[c.type].map(t=>UT[t].name).join(', ')}</small></div><span class="ok">${c.queue.length?c.queue.length+' queued':'Open'}</span></button>`).join('')}
  <div class="hint">Manpower comes from your citizens. Raise conscription for more soldiers, or hire foreign volunteers in <b>World</b>.</div>`;},
 build(){const cnt={};for(const b of G.blds)if(b.owner===1)cnt[b.type]=(cnt[b.type]||0)+1;let wc=0;for(let i=0;i<G.W*G.H;i++)if(G.wall[i]===1)wc++;cnt.wall=wc;
  return `<div class="ph"><div class="pt">${svgI('t_build')}Construction<small><span data-v="fill"></span> staffed</small></div>${X_BTN}</div>
  <div class="cards">${BTYPES.map(k=>{const B=BT[k];return `<button class="card" data-act="place" data-t="${k}" data-en="bld:${k}"><div class="ct">${svgI(B.ico)}<span>${B.n}</span><em>×${cnt[k]||0}</em></div><span data-cost="bld:${k}"></span><small>${B.d}${B.out?'<br>+'+Object.entries(B.out).map(([r,v])=>v+' '+RI[r].n.toLowerCase()).join(', ')+'/s · '+fmt(B.work)+' workers':''}</small></button>`}).join('')}</div>
  <div class="hint">Workplaces need citizens. When you run short of workers, every building slows down, so build housing too.</div>`;},
 market(){return `<div class="ph"><div class="pt">${svgI('t_market')}Internal Market<small>prices move with supply</small></div>${X_BTN}</div>${qtySel()}
  ${RES.map(r=>`<div class="mrow">${svgI(r)}<div class="nm"><b>${RI[r].n} <span style="font-weight:600;color:#9fb3c8" data-v="mprice:${r}"></span></b><small><span data-v="res:${r}"></span> in stock · <i data-v="net:${r}"></i>/s</small></div><canvas class="spark" data-spark="${r}"></canvas>
   <div class="tbs"><button class="tb buy" data-act="mbuy" data-r="${r}" data-en="mbuy:${r}">BUY<small data-v="mbuy:${r}"></small></button><button class="tb sell" data-act="msell" data-r="${r}" data-en="msell:${r}">SELL<small data-v="msell:${r}"></small></button></div></div>`).join('')}
  <div class="hint">Buying pushes prices up and selling pushes them down. Prices drift back over time. Foreign nations often pay more. Check the World tab.</div>`;},
 world(){const n=G.nat;return `<div class="ph"><div class="pt">${svgI('t_world')}World</div>${X_BTN}</div>
  <div class="tr"><div style="display:flex;gap:10px;align-items:center">${flagSVG(n[1].flag)}<div><b>${n[1].full}</b><small>You · ${n[1].leader}</small></div></div></div>
  <div class="tr"><div style="display:flex;gap:10px;align-items:center">${flagSVG(n[2].flag)}<div><b>${n[2].full}</b><small>Enemy · ${n[2].leader}</small></div></div></div>
  <div class="sh">NEUTRAL NATIONS · TRADE, HIRE, ALLY</div>
  ${G.countries.map(c=>`<button class="ccard" data-act="country" data-id="${c.id}">${flagSVG(c.flag)}<div style="min-width:0"><div class="cn"><span>${c.name}</span></div><div class="cm">${c.gov} · ${PERSONA[c.persona].n} · exports ${c.exp.map(r=>RI[r].n.toLowerCase()).join(', ')}</div>
   <div class="rels"><span>YOU</span><div class="relb"><i style="left:0" data-rel="${c.id}:1"></i></div><span data-v="crel:${c.id}:1"></span><span>ENEMY</span><div class="relb"><i style="left:0" data-rel="${c.id}:2"></i></div><span data-v="crel:${c.id}:2"></span></div>
   <div class="tgs">${TKEYS.filter(k=>c.tr[1][k]).map(k=>`<span class="tg">${TREATY[k].n}</span>`).join('')}${TKEYS.filter(k=>c.tr[2][k]).map(k=>`<span class="tg e">Enemy: ${TREATY[k].n}</span>`).join('')}</div></div></button>`).join('')}`;},
 people(){const E=G.E[1];return `<div class="ph"><div class="pt">${svgI('t_people')}Your People<small data-v="state"></small></div>${X_BTN}</div>
  <div class="hap"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="33" fill="none" stroke="#2a323b" stroke-width="8"/><circle id="gArc" cx="40" cy="40" r="33" fill="none" stroke="#7be39a" stroke-width="8" stroke-linecap="round" stroke-dasharray="207.3" stroke-dashoffset="100" transform="rotate(-90 40 40)"/>
   <circle cx="40" cy="40" r="21" fill="#1a222b"/><circle cx="33" cy="36" r="2.4" fill="#e8eef5"/><circle cx="47" cy="36" r="2.4" fill="#e8eef5"/><path id="gMouth" d="M31 46q9 7 18 0" stroke="#e8eef5" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>
   <div><div style="font-size:30px;font-weight:900"><span data-v="hap"></span><small style="font-size:13px;color:#8aa0b6"> / 100 happiness</small></div><div class="hint" id="hapHint" style="margin-top:2px"></div></div></div>
  <div class="kv"><div><b data-v="pop"></b><span>CITIZENS</span></div><div><b data-v="cap"></b><span>HOMES</span></div><div><b data-v="growth"></b><span>GROWTH</span></div>
   <div><b data-v="labor"></b><span>WORKFORCE</span></div><div><b data-v="jobs"></b><span>JOBS</span></div><div><b data-v="unemp"></b><span>JOBLESS</span></div></div>
  <div class="wf" id="wfBar"><i style="background:#3ea6ff"></i><i style="background:#9aa5b1"></i><i style="background:#8fb36b"></i></div>
  <div class="lg"><span style="--c:#3ea6ff">Employed</span><span style="--c:#9aa5b1">Jobless</span><span style="--c:#8fb36b">Soldiers</span></div>
  <div class="sh">POLICIES</div>${polBlock('tax')}${polBlock('draft')}${polBlock('ration')}
  <div class="sh">WHAT YOUR PEOPLE FEEL</div><div id="facs"></div>
  <div class="sh">CITIES</div><div id="cities"></div>
  <div class="sh">VOICES FROM THE STREET</div><div id="voices"></div>`;},
};
const POLD={tax:['More happiness, less money','','Much more money, angry people'],draft:['3.5% of citizens may serve','7.5% may serve','14% may serve. Very unpopular'],ration:['30% more food eaten, happier','','30% less food eaten, unhappy']};
function polBlock(k){const E=G.E[1],P=POL[k],v=E.pol[k];return `<div class="pol"><div class="pl">${P.n}<span>${POLD[k][v]||'Balanced'}</span></div><div class="seg">${P.o.map((o,i)=>`<button class="${i===v?'on':''}" data-act="pol" data-k="${k}" data-pv="${i}">${o}</button>`).join('')}</div></div>`}
function qtySel(){return `<div class="qsel">AMOUNT<div class="seg">${[10,50,200].map(q=>`<button class="${G.qty===q?'on':''}" data-act="qty" data-q="${q}">${q}</button>`).join('')}</div></div>`}
function countryPanel(c){const P=PERSONA[c.persona],emb=embargo(c,1);
  return `<div class="ph"><button class="x" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="pt">${c.name}</div>${X_BTN}</div>
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">${flagSVG(c.flag,'flag big')}<div style="min-width:0"><b>${c.full}</b><div class="cm">${c.leader}</div><div class="hint" style="margin:0"><b style="color:#e8eef5">${P.n}.</b> ${P.d}</div></div></div>
  <div class="rels" style="font-size:11px"><span>YOU</span><div class="relb" style="height:7px"><i style="left:0" data-rel="${c.id}:1"></i></div><b data-v="crel:${c.id}:1"></b><span>ENEMY</span><div class="relb" style="height:7px"><i style="left:0" data-rel="${c.id}:2"></i></div><b data-v="crel:${c.id}:2"></b></div>
  ${emb?`<div class="tr" style="margin-top:8px;background:rgba(255,79,94,.12)"><div><b>Embargo</b><small>${c.name} is allied with ${G.nat[2].name} and refuses to trade with you.</small></div></div>`:''}
  <div class="sh">TREATIES</div>${TKEYS.map(k=>{const T=TREATY[k],on=c.tr[1][k],en=c.tr[2][k];return `<div class="tr"><div><b>${T.n}</b><small>${T.d}. Needs relations ${treatyReq(c,k)}.${en?' <span style="color:#ff8a92">Signed with your enemy.</span>':''}</small>${on?'':`<span data-cost="treaty:${k}"></span>`}</div>${on?'<span class="ok">ACTIVE</span>':`<button class="btn pri" data-act="sign" data-k="${k}" data-en="sign:${c.id}:${k}">Sign</button>`}</div>`}).join('')}
  <div class="sh">TRADE</div>${qtySel()}
  ${RES.map(r=>`<div class="mrow" style="grid-template-columns:24px minmax(0,1fr) auto">${svgI(r)}<div class="nm"><b>${RI[r].n}${c.exp.includes(r)?' <span class="tg">EXPORT</span>':c.imp.includes(r)?' <span class="tg e">WANTS</span>':''}</b><small>They have <span data-v="cst:${c.id}:${r}"></span> · you have <span data-v="res:${r}"></span></small></div>
   <div class="tbs"><button class="tb buy" data-act="cbuy" data-r="${r}" data-en="cbuy:${c.id}:${r}">BUY<small data-v="cbuy:${c.id}:${r}"></small></button><button class="tb sell" data-act="csell" data-r="${r}" data-en="csell:${c.id}:${r}">SELL<small data-v="csell:${c.id}:${r}"></small></button></div></div>`).join('')}
  <div class="sh">HIRE MANPOWER</div><div class="tr"><div><b><span data-v="cmp:${c.id}"></span> volunteers available</b><small><span data-v="chire:${c.id}"></span> per 100 men. Saves your own citizens.</small></div>
   <div class="tbs"><button class="tb" data-act="hire" data-n="100" data-en="hire:${c.id}:100">+100</button><button class="tb" data-act="hire" data-n="500" data-en="hire:${c.id}:500">+500</button></div></div>
  <div class="sh">DIPLOMATIC GIFTS</div><div class="acts"><button data-act="gift" data-k="gold" data-en="gift:${c.id}:gold">${'Gift 5 gold'}</button><button data-act="gift" data-k="$" data-en="gift:${c.id}:$">Gift $250</button></div>
  <div class="hint">Trade, gifts and treaties improve relations, and relations slowly drift back without them. ${c.persona==='pacifist'?'Bombing cities angers them.':c.persona==='militarist'?'They warm to whoever holds more land.':''}</div>`;}
function livePeople(){const E=G.E[1];
  const arc=$('#gArc');if(arc){arc.setAttribute('stroke-dashoffset',String(207.3*(1-E.hap/100)));arc.setAttribute('stroke',moodCol(E.hap));
    const m=E.hap>65?'M31 45q9 8 18 0':E.hap>40?'M31 47h18':'M31 50q9-7 18 0';$('#gMouth').setAttribute('d',m);
    const tr=E.hapT-E.hap;$('#hapHint').textContent=(Math.abs(tr)<1?'Steady':tr>0?'Rising toward '+Math.round(E.hapT):'Falling toward '+Math.round(E.hapT))+' · '+STATE_TXT[E.state]+(E.collapseT>0?' · GOVERNMENT AT RISK':'');}
  const wf=$('#wfBar');if(wf){const emp=Math.min(E.labor,E.jobs),jl=Math.max(0,E.labor-E.jobs),sol=E.mil,tot=emp+jl+sol||1;const s=wf.children;s[0].style.width=emp/tot*100+'%';s[1].style.width=jl/tot*100+'%';s[2].style.width=sol/tot*100+'%';}
  const fs=JSON.stringify(E.fac),fe=$('#facs');if(fe&&fe._s!==fs){fe._s=fs;fe.innerHTML=E.fac.map(([n,v])=>`<div class="fac"><span>${n}</span><b class="${v>0?'p':'n'}">${v>0?'+':''}${v}</b></div>`).join('')||'<div class="hint">Nothing in particular.</div>';}
  const mine=G.cities.filter(c=>c.owner===1),cs=mine.map(c=>c.id+':'+Math.round(c.pop/100)+':'+Math.round(cityMood(c)/5)).join(),ce=$('#cities');
  if(ce&&ce._s!==cs){ce._s=cs;ce.innerHTML=mine.map(c=>{const m=cityMood(c);return `<div class="city"><span class="dot" style="background:${moodCol(m)}"></span><b>${c.name} <span style="color:#8aa0b6;font-weight:500">${CITY_NAME[c.type]}</span></b><span>${fmt(c.pop)} / ${fmt(c.cap)} · <span class="mood" style="color:${moodCol(m)}">${c.panic>.4?'Panic':Math.round(m)}</span></span></div>`}).join('');}
  const vs=G.voices.length?G.voices[0].id+':'+G.voices.length:'0',ve=$('#voices');
  if(ve&&ve._s!==vs){ve._s=vs;ve.innerHTML=G.voices.slice(0,14).map(p=>`<div class="voice">${avatarSVG(p,p.mood)}<div><div class="vn">${p.name}, ${p.age} <span>· ${p.job} · ${p.city} · ${dateStr(p.t)}</span></div><q>${p.text.replace(/</g,'&lt;')}</q></div></div>`).join('')||'<div class="hint">The streets are quiet.</div>';}
}
$('#panel').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||!G)return;const a=b.dataset.act,E=G.E[1],c=G.country;
  const ids=()=>G.sel.map(u=>u.id);
  switch(a){
    case 'close':setSel([]);G.tab=null;G.country=null;return;
    case 'build':{const ct=G.selCity;if(!ct||ct.owner!==1)return;if(!doCmd('queue',{city:ct.id,type:b.dataset.t})){sfx('blip');liveUpdate($('#panel'));}return;}
    case 'cancel':{const ct=G.selCity,i=+b.dataset.i;if(!ct||i>=ct.queue.length)return;doCmd('cancel',{city:ct.id,i});liveUpdate($('#panel'));return;}
    case 'form':doCmd('form',{ids:ids()});G.selDirty=true;return;
    case 'disband':{const {div}=selInfo();if(div)doCmd('disband',{div:div.id});G.selDirty=true;return;}
    case 'split':{if(G.sel.length<2)return;const [A]=splitHalves(G.sel);doCmd('split',{ids:ids()});setSel(A);return;}
    case 'stop':doCmd('stop',{ids:ids()});return;
    case 'retreat':doCmd('retreat',{ids:ids()});toast('Falling back');return;
    case 'refuel':doCmd('refuel',{ids:ids()});toast('Heading to a city to refuel','','oil');return;
    case 'autoret':{const v=!G.sel.every(u=>u.retreatOn);doCmd('autoret',{ids:ids(),v});for(const u of G.sel)u.retreatOn=v;G.selDirty=true;return;}
    case 'place':return void startPlace(b.dataset.t);
    case 'qty':G.qty=+b.dataset.q;G.selDirty=true;return;
    case 'mbuy':if(!doCmd('mbuy',{r:b.dataset.r,q:G.qty}))sfx('coin');liveUpdate($('#panel'));return;
    case 'msell':if(!doCmd('msell',{r:b.dataset.r,q:G.qty}))sfx('coin');liveUpdate($('#panel'));return;
    case 'country':G.country=G.countries[+b.dataset.id];G.selDirty=true;sfx('blip');return;
    case 'back':G.country=null;G.selDirty=true;return;
    case 'sign':if(!doCmd('sign',{c:c.id,k:b.dataset.k}))G.selDirty=true;return;
    case 'cbuy':if(!doCmd('cbuy',{c:c.id,r:b.dataset.r,q:G.qty}))sfx('coin');liveUpdate($('#panel'));return;
    case 'csell':if(!doCmd('csell',{c:c.id,r:b.dataset.r,q:G.qty}))sfx('coin');liveUpdate($('#panel'));return;
    case 'hire':if(!doCmd('hire',{c:c.id,n:+b.dataset.n})){sfx('coin');toast(`Hired ${b.dataset.n} volunteers from ${c.name}`,'good','mp');}return;
    case 'gift':if(!doCmd('gift',{c:c.id,k:b.dataset.k})){sfx('coin');toast(`${c.name} appreciates the gift`,'good','handshake');}return;
    case 'pol':doCmd('pol',{k:b.dataset.k,v:+b.dataset.pv});E.pol[b.dataset.k]=+b.dataset.pv;G.selDirty=true;sfx('blip');return;
    case 'war':if(G.peace){doCmd('war',{});G.selDirty=true;}return;
    case 'city':{const ct=G.cities[+b.dataset.id];openCity(ct);CAM.x=ct.x;CAM.y=ct.y;clampCam();return;}
    case 'demolish':{const bd=G.selBld;if(bd&&bd.owner===1){doCmd('demolish',{id:bd.id});G.selBld=null;G.selDirty=true;toast(BT[bd.type].n+' demolished');}return;}
  }
});
function renderDivBar(){
  const ds=G.divs.filter(d=>d.team===1).sort((a,b)=>a.num-b.num);
  $('#divBar').innerHTML=`<button class="chip" data-div="all">ALL ARMY</button><button class="chip" data-div="air">${uIcon('ftr')}AIR</button>`+
    ds.map(d=>`<button class="chip" data-div="${d.id}" style="--c:${d.color}"><i></i>${d.short}<b>${d.units.length}</b></button>`).join('');
  updateDivLive();
}
function updateDivLive(){const {div}=G.sel.length?selInfo():{div:null};
  for(const ch of document.querySelectorAll('#divBar .chip')){const id=ch.dataset.div;ch.classList.toggle('act',!!div&&String(div.id)===id);
    const b=ch.querySelector('b');if(b){const d=G.divs.find(x=>String(x.id)===id);if(d)b.textContent=d.units.length;}}}
let chipTap={id:null,t:0};
$('#divBar').addEventListener('click',e=>{const ch=e.target.closest('.chip');if(!ch)return;const id=ch.dataset.div;let l;G.place=null;
  if(id==='all')l=G.units.filter(u=>u.team===1&&!UT[u.type].air);else if(id==='air')l=G.units.filter(u=>u.team===1&&UT[u.type].air);
  else{const d=G.divs.find(x=>String(x.id)===id);if(!d)return;l=d.units;}
  setSel(l);sfx('blip');updateDivLive();
  const now=performance.now();if(chipTap.id===id&&now-chipTap.t<400){const c=centroid(l);if(c){CAM.x=c.x;CAM.y=c.y;clampCam();}}chipTap={id,t:now};
  if(!l.length)toast(id==='air'?'No aircraft. Build them at an Airbase':'No units');});
// minimap
const mini=$('#mini'),mctx=mini.getContext('2d');
function sizeMini(){if(!G)return;const L=VW<500?100:140,asp=G.W/G.H,w=asp>=1?L:L*asp,h=asp>=1?L/asp:L;
  mini.style.width=w+'px';mini.style.height=h+'px';mini.width=w*DPR|0;mini.height=h*DPR|0;}
function drawMini(){
  const w=mini.width,h=mini.height,sx=w/(G.W*CELL),sy=h/(G.H*CELL);
  mctx.imageSmoothingEnabled=true;mctx.globalAlpha=.9;mctx.drawImage(G.miniBase,0,0,w,h);mctx.globalAlpha=1;mctx.drawImage(G.ov,0,0,w,h);
  for(const u of G.units){if(u.dead||(u.team===2&&!u.vis[1]))continue;mctx.fillStyle=u.team===1?'#bfe3ff':'#ffb3ba';mctx.fillRect(u.x*sx-1,u.y*sy-1,DPR*1.2,DPR*1.2);}
  for(const c of G.cities){mctx.fillStyle=TC[c.owner].m;mctx.strokeStyle='#000';mctx.lineWidth=1;mctx.beginPath();mctx.arc(c.x*sx,c.y*sy,(c.type==='capital'?3.2:2.2)*DPR,0,TAU);mctx.fill();mctx.stroke();}
  mctx.strokeStyle='#fff';mctx.lineWidth=DPR;mctx.strokeRect((CAM.x-VW/2/CAM.z)*sx,(CAM.y-VH/2/CAM.z)*sy,VW/CAM.z*sx,VH/CAM.z*sy);
}
function miniJump(e){const r=mini.getBoundingClientRect();CAM.x=(e.clientX-r.left)/r.width*G.W*CELL;CAM.y=(e.clientY-r.top)/r.height*G.H*CELL;clampCam();}
mini.addEventListener('pointerdown',e=>{mini.setPointerCapture(e.pointerId);miniJump(e);});
mini.addEventListener('pointermove',e=>{if(mini.hasPointerCapture(e.pointerId))miniJump(e);});

// ================= MENUS / FLOW =================
$('#bBox').onclick=()=>{boxMode=!boxMode;$('#bBox').classList.toggle('on',boxMode);if(boxMode)toast('Drag to select units');};
$('#bHome').onclick=()=>{const c=capitalOf(1);if(c){CAM.x=c.x;CAM.y=c.y;clampCam();}};
$('#bSpeed').onclick=()=>{G.speed=G.speed===1?2:G.speed===2?3:1;$('#bSpeed').textContent=G.speed+'×';};
function togglePause(){if(G.over)return;
  if(G.mp){const h=$('#pauseScr').classList.toggle('hide');$('#bRestart').style.display='none';$('#bQuit').textContent='Surrender & leave';return;}
  G.paused=!G.paused;$('#pauseScr').classList.toggle('hide',!G.paused);$('#bRestart').style.display='';$('#bQuit').textContent='Main menu';}
$('#bPause').onclick=togglePause;$('#bResume').onclick=()=>{if(G.mp)$('#pauseScr').classList.add('hide');else togglePause();};
$('#bSound').onclick=()=>{muted=!muted;$('#bSound').textContent='Sound: '+(muted?'OFF':'ON');};
$('#bRestart').onclick=()=>startGame(G.opts);$('#bQuit').onclick=()=>{if(G.mp&&!G.over&&!confirm('Surrender this match?'))return;toMenu();};
$('#bAgain').onclick=()=>{if(G.mp){toMenu();openMP();}else startGame(G.opts);};$('#bMenu').onclick=toMenu;
$('#bOnline').onclick=openMP;$('#bFind').onclick=mpFind;$('#bMpBack').onclick=()=>{if(MP.state==='queue')mpCancel();$('#mpScr').classList.add('hide');$('#menu').classList.remove('hide');};
const menuOpts={diff:'normal',size:'medium',prep:'5'};
for(const [id,key] of [['#sDiff','diff'],['#sSize','size'],['#sPrep','prep']])$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  menuOpts[key]=b.dataset.v;for(const x of $(id).children)x.classList.toggle('on',x===b);});
$('#bStart').onclick=()=>{initAudio();if(AC&&AC.state==='suspended')AC.resume();startGame({...menuOpts});};
function startGame(opts){
  if(G&&G.mp)mpLeave();$('#coach').classList.add('hide');newGame(opts);resetUI();G.qty=10;prepWarned=0;tipI=0;mEvT=35;$('#bSpeed').style.display='';
  $('#menu').classList.add('hide');$('#pauseScr').classList.add('hide');$('#endScr').classList.add('hide');$('#ui').style.display='';
  fitBounds();sizeMini();renderResBar();renderTabs();const cap=capitalOf(1);
  CAM.z=clamp(Math.min(VW,VH)/360,CAM.minZ,CAM.maxZ);CAM.x=cap.x;CAM.y=cap.y;clampCam();
  $('#bSpeed').textContent='1×';uiTick();
  if(opts.tut)return;
  setTimeout(()=>{if(G.peace){toast(`${G.nat[1].full}: ${durStr(G.peaceEnd)} of peace to prepare for war with ${G.nat[2].name}`,'', 'warn');voice(1,'prep',{},true);}
    else toast('War from day one! Tap your capital to recruit','bad','warn');},500);
}
function resetUI(){$('#panel').classList.add('hide');$('#panel').innerHTML='';$('#place').classList.add('hide');$('#toasts').innerHTML='';boxMode=false;$('#bBox').classList.remove('on');gest=null;ptrs.clear();G.pk=null;}
function startDemo(){newGame({size:'small',diff:'normal',demo:true});fitBounds();}
function toMenu(){if(G&&G.mp){mpLeave();$('#bSpeed').style.display='';}$('#coach').classList.add('hide');$('#mpScr').classList.add('hide');$('#pauseScr').classList.add('hide');$('#endScr').classList.add('hide');$('#ui').style.display='none';resetUI();startDemo();$('#menu').classList.remove('hide');}
function gameOver(res,why){
  if(G.over)return;G.over=true;G.result=res+':'+why;if(G.demo)return;
  setTimeout(()=>{const s=G.mpStats||G.stats[1],E=G.E[1];$('#endTitle').textContent=res==='win'?'VICTORY':'DEFEAT';$('#endTitle').className='res '+res;
    $('#endSub').textContent=why==='surrender'?(res==='win'?`${G.nat[2].name} surrendered.`:'You surrendered.'):why==='disconnect'?(res==='win'?'Your opponent left the match.':'You were disconnected for too long.'):why==='time'?(res==='win'?'Time is up. You hold more land.':'Time is up. The enemy holds more land.'):why==='collapse'?(res==='win'?`${G.nat[2].name}'s government collapsed under unrest.`:'Your government collapsed. The people have had enough.'):res==='win'?`${G.nat[2].name}'s capital has fallen.`:'Your capital has fallen.';
    $('#endStats').innerHTML=[['TIME',dateStr(G.time)],['UNITS BUILT',s.built],['KILLS',s.kills],['LOSSES',s.lost],['PEAK TERRITORY',(s.peak*100).toFixed(0)+'%'],['CITIES TAKEN',s.caps],
      ['PEAK POPULATION',fmt(s.peakPop)],['BUILDINGS',s.blds],['TRADE VOLUME','$'+fmt(s.traded)],['CIVILIANS LOST',fmt(E.civDead+E.fled)]].map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join('');
    $('#endScr').classList.remove('hide');},1200);
  sfx(res==='win'?'capture':'alert');vib(200);
}
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=innerWidth;VH=innerHeight;cv.width=VW*DPR|0;cv.height=VH*DPR|0;
  if(G&&G.demo&&(G.H>G.W)!==(VH>VW))startDemo();fitBounds();sizeMini();}
addEventListener('resize',resize);
resize();startDemo();requestAnimationFrame(frame);setTimeout(resize,300);
if(sessionStorage.getItem('rw_match'))setTimeout(mpRejoin,400);
