
// ================= PC: keyboard, edge scrolling, control groups, cursor =================
const IS_PC=typeof matchMedia!=='undefined'&&matchMedia('(hover:hover) and (pointer:fine)').matches;
const KEYS=new Set(),GROUPS={};let grpTap={k:'',t:0},edgeScroll=localStorage.getItem('rw_edge')!=='0',curT=0;
const TAB_KEY={army:'Q',build:'B',market:'M',world:'G',people:'P'};
const typing=e=>/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||'');
const shown=id=>!$(id).classList.contains('hide');
function toggleHelp(v){const h=$('#helpScr');h.classList.toggle('hide',v===undefined?!h.classList.contains('hide'):!v);}
function zoomBy(f,sx=VW/2,sy=VH/2){if(!G)return;const [wx,wy]=s2w(sx,sy);CAM.z=clamp(CAM.z*f,CAM.minZ,CAM.maxZ);CAM.x=wx-(sx-VW/2)/CAM.z;CAM.y=wy-(sy-VH/2)/CAM.z;clampCam();}
function openTabKey(k){G.place=null;const cur=!G.sel.length&&!G.selCity&&!G.selBld?G.tab:null;setSel([]);G.tab=cur===k?null:k;if(k!=='world')G.country=null;G.selDirty=true;sfx('blip');}
function mouseCursor(){
  if(!G||G.demo||hoverX<0){cv.style.cursor='';return;}
  if(G.place){cv.style.cursor='crosshair';return;}
  const [wx,wy]=s2w(hoverX,hoverY);
  if(G.sel.length&&pickUnit(wx,wy,2)){cv.style.cursor='crosshair';return;}
  cv.style.cursor=pickUnit(wx,wy,1)||pickCity(wx,wy)||pickBld(wx,wy)?'pointer':'default';
}
function camTick(dt){
  if(!G||G.demo||G.over)return;let vx=0,vy=0;
  if(KEYS.has('a')||KEYS.has('arrowleft'))vx--;if(KEYS.has('d')||KEYS.has('arrowright'))vx++;
  if(KEYS.has('w')||KEYS.has('arrowup'))vy--;if(KEYS.has('s')||KEYS.has('arrowdown'))vy++;
  if(edgeScroll&&IS_PC&&hoverX>=0&&!gest&&document.hasFocus()){const m=12;if(hoverX<m)vx--;else if(hoverX>VW-m)vx++;if(hoverY<m)vy--;else if(hoverY>VH-m)vy++;}
  if(vx||vy){const sp=Math.min(900,620/CAM.z)*dt;CAM.x+=vx*sp;CAM.y+=vy*sp;clampCam();}
  if((curT-=dt)<=0){curT=.12;mouseCursor();}
}
addEventListener('keydown',e=>{
  if(typing(e))return;const k=e.key.toLowerCase(),ctrl=e.ctrlKey||e.metaKey;
  if(e.key==='?'){toggleHelp();e.preventDefault();return;}
  if(shown('#helpScr')){if(k==='escape')toggleHelp(false);return;}
  if(!G||G.demo)return;
  if(k===' '){togglePause();e.preventDefault();return;}
  if(k==='escape'){if(shown('#pauseScr')){$('#bResume').click();return;}
    if(G.place)endPlace();else if(G.sel.length)setSel([]);else if(G.selCity||G.selBld||G.tab){clearFocus();G.tab=null;G.country=null;G.selDirty=true;}return;}
  if(G.over||shown('#pauseScr'))return;
  if(!ctrl&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){KEYS.add(k);e.preventDefault();return;}
  if(k==='+'||k==='='){zoomBy(1.25);return;}if(k==='-'||k==='_'){zoomBy(1/1.25);return;}
  if(ctrl&&k==='a'){e.preventDefault();setSel(G.units.filter(u=>u.team===1&&!UT[u.type].air));return;}
  if(/^[1-9]$/.test(k)){e.preventDefault();
    if(ctrl){GROUPS[k]=G.sel.map(u=>u.id);toast(`Group ${k} saved (${G.sel.length} units)`);return;}
    const l=(GROUPS[k]||[]).map(id=>G.units.find(u=>u.id===id)).filter(u=>u&&!u.dead);
    if(!l.length){toast(`Group ${k} is empty. Select units and press Ctrl+${k}`);return;}
    setSel(l);const now=performance.now();if(grpTap.k===k&&now-grpTap.t<400){const c=centroid(l);if(c){CAM.x=c.x;CAM.y=c.y;clampCam();}}grpTap={k,t:now};sfx('blip');return;}
  if(ctrl||e.altKey)return;
  const ids=G.sel.map(u=>u.id);
  switch(k){
    case 'f':if(ids.length){doCmd('form',{ids});G.selDirty=true;}return;
    case 'x':if(ids.length)doCmd('stop',{ids});return;
    case 'r':if(ids.length){doCmd('retreat',{ids});toast('Falling back');}return;
    case 't':if(ids.length){doCmd('refuel',{ids});toast('Heading to a city to refuel','','oil');}return;
    case 'c':$('#bHome').click();return;
    case 'z':if(!G.mp)$('#bSpeed').click();return;
    case 'q':return openTabKey('army');case 'b':return openTabKey('build');case 'm':return openTabKey('market');
    case 'g':return openTabKey('world');case 'p':return openTabKey('people');
  }
});
addEventListener('keyup',e=>KEYS.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{KEYS.clear();hoverX=-1;});
$('#bHelp').onclick=()=>toggleHelp(true);$('#bHelp2').onclick=()=>toggleHelp(true);$('#bHelpClose').onclick=()=>toggleHelp(false);
$('#bEdge').textContent='Edge scrolling: '+(edgeScroll?'ON':'OFF');
$('#bEdge').onclick=()=>{edgeScroll=!edgeScroll;localStorage.setItem('rw_edge',edgeScroll?'1':'0');$('#bEdge').textContent='Edge scrolling: '+(edgeScroll?'ON':'OFF');};
