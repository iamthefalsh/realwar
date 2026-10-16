
// ================= TRAINING MISSION =================
// A guided game against a passive enemy. Each step waits until you actually do the thing.
const T_=(touch,pc)=>IS_PC?pc:touch;
const ownCount=type=>G.blds.filter(b=>b.owner===1&&b.type===type).length;
const TUT=[
 {t:'Your nation',d:()=>T_('This blue land is yours. The ★ is your capital. Drag to move the map and pinch to zoom.','This blue land is yours. The ★ is your capital. Move the map with WASD, right-drag or the screen edges, and zoom with the mouse wheel.'),
  start:s=>{s.cx=CAM.x;s.cy=CAM.y;s.z=CAM.z;},ok:s=>Math.hypot(CAM.x-s.cx,CAM.y-s.cy)>90||Math.abs(CAM.z-s.z)>.25,next:1},
 {t:'Select your troops',d:()=>T_('Tap one of your soldiers to select it. To grab several, hold your finger, then drag a box around them.','Left-click a soldier to select it, or left-drag a box around several units.'),
  start:()=>{const c=capitalOf(1);CAM.x=c.x;CAM.y=c.y;CAM.z=Math.max(CAM.z,1.3);},ok:()=>G.sel.length>0},
 {t:'Move out',d:()=>T_('With troops selected, tap the glowing neutral city to send them there.','With troops selected, right-click the glowing neutral city to send them there.'),
  start:s=>{s.city=tutTarget(0);G.tut.mark=s.city;},ok:s=>G.units.some(u=>u.team===1&&(u.state==='move'||dist2(u.x,u.y,s.city.x,s.city.y)<CAP_R*CAP_R)),
  show:s=>s.city},
 {t:'Capture the city',d:()=>'Ground troops inside a city with no defenders capture it. Keep them there until the ring fills. The city, its province and its people become yours.',
  start:s=>{s.city=G.tut.steps[2].city;G.tut.mark=s.city;},ok:s=>s.city.owner===1,show:s=>s.city,skip:1},
 {t:'Grow food',d:()=>T_('Open BUILD, pick Farm, then tap a green spot. Farms feed your citizens.','Open BUILD (B), pick Farm, then click a green spot. Farms feed your citizens.'),
  hl:'.tab[data-tab="build"],#panel .card[data-t="farm"]',start:s=>{s.n=ownCount('farm');G.tut.mark=null;},ok:s=>ownCount('farm')>s.n},
 {t:'Builders at work',d:()=>'Your farm is a construction site. Builders (yellow hard hats) carry materials from the city, then build. The amber bar shows materials and the green bar shows construction. More builders = faster building.',
  start:s=>{s.b=G.blds.filter(b=>b.owner===1&&b.type==='farm'&&b.prog<1).pop();G.tut.mark=s.b||null;
    if(s.b){G.tab=null;G.place=null;G.placeCells=null;G.selDirty=true;CAM.x=s.b.x;CAM.y=s.b.y+40;CAM.z=Math.max(CAM.z,2);clampCam();}},ok:s=>!s.b||s.b.prog>=1,show:s=>s.b,skip:1},
 {t:'Dig for iron',d:()=>'Mines must sit on a resource deposit (the dashed circles). Build an Iron Mine on the iron deposit near your capital.',
  hl:'.tab[data-tab="build"],#panel .card[data-t="iron"]',start:s=>{s.n=ownCount('iron');const d=G.deps.find(d=>d.type==='iron'&&G.own[d.ci]===1&&!G.bAt.has(d.ci));G.tut.mark=d||null;s.dep=d;},
  ok:s=>ownCount('iron')>s.n,show:s=>s.dep,skip:1},
 {t:'Recruit soldiers',d:()=>T_('Tap your capital and recruit a Rifle Squad. Units cost money, resources and manpower, and infantry also need guns.','Click your capital and recruit a Rifle Squad. Units cost money, resources and manpower, and infantry also need guns.'),
  start:s=>{s.n=G.stats[1].built;const c=capitalOf(1);G.tut.mark=c;},ok:s=>{const c=capitalOf(1);return G.stats[1].built>s.n||(c&&c.queue.length>0);},show:()=>capitalOf(1)},
 {t:'Form a division',d:()=>T_('Select several units (hold and drag a box, or tap ALL ARMY at the top) and tap Form Division. Divisions get their own button and move in formation.','Select several units (drag a box, or press Ctrl+A) and press F to form a division. Save it to a key with Ctrl+1, then press 1 to select it again.'),
  hl:'#divBar .chip[data-div="all"],#panel [data-act="form"]',start:()=>{G.tut.mark=null;},ok:()=>G.divs.some(d=>d.team===1)},
 {t:'The market',d:()=>T_('Open MARKET and buy or sell something. Buying raises the price and selling lowers it.','Open MARKET (M) and buy or sell something. Buying raises the price and selling lowers it.'),
  hl:'.tab[data-tab="market"]',start:s=>{const E=G.E[1];s.v=E.tradeIn+E.tradeOut;},ok:s=>{const E=G.E[1];return E.tradeIn+E.tradeOut>s.v;}},
 {t:'Your people',d:()=>'Open PEOPLE. Citizens work, pay taxes and become soldiers. Keep them fed, housed and happy, or they protest, riot and can bring down your government.',
  hl:'.tab[data-tab="people"]',ok:()=>G.tab==='people'},
 {t:'The world',d:()=>'Open WORLD. Neutral nations trade with you, sell you manpower and sign treaties. Allies even send troops. Your enemy is courting them too.',
  hl:'.tab[data-tab="world"]',ok:()=>G.tab==='world'},
 {t:'Go to war',d:()=>'War is declared! Take the marked enemy city. Bring tanks and infantry. Hurt units retreat on their own to heal.',
  start:s=>{G.tut.calm=false;if(G.peace)declareWar();s.city=tutTarget(2);G.tut.mark=s.city;},ok:s=>s.city&&s.city.owner===1,show:s=>s.city,skip:1},
];
function tutTarget(owner){const cap=capitalOf(1);return G.cities.filter(c=>c.owner===owner&&c.type!=='capital').sort((a,b)=>dist2(a.x,a.y,cap.x,cap.y)-dist2(b.x,b.y,cap.x,cap.y))[0]||G.cities.find(c=>c.owner===owner);}
function startTutorial(){
  startGame({size:'small',diff:'easy',prep:'5',tut:true});
  G.peaceEnd=1e9;tipI=TIPS.length;const E=G.E[1];E.money+=1500;for(const r of RES)E.res[r]+=r==='gold'?20:200;E.mp+=600;
  G.tut={i:-1,steps:TUT.map(()=>({})),calm:true,mark:null,done:false,okT:0};$('#toasts').innerHTML='';tutGo(0);
}
function tutGo(i){const T=G.tut;T.i=i;T.okT=0;if(i>=TUT.length)return tutDone();const st=TUT[i],s=T.steps[i];if(st.start)st.start(s);tutCard();}
function tutCard(){const T=G.tut,st=TUT[T.i],s=T.steps[T.i],box=$('#coach');box.classList.remove('hide','ok');
  box.innerHTML=`<div class="cs"><span>TRAINING ${T.i+1}/${TUT.length}<span class="bar"><i style="width:${100*T.i/TUT.length}%"></i></span></span><button class="lnk" data-tut="exit">EXIT</button></div>
  <b>${st.t}</b><p>${st.d()}</p><div class="ca">${st.show?'<button class="btn" data-tut="show">Show me</button>':''}${st.next||st.skip?`<button class="btn" data-tut="skip">${st.next?'Next':'Skip'}</button>`:''}</div>`;}
function tutDone(){const T=G.tut;T.done=true;T.mark=null;const box=$('#coach');box.classList.remove('hide');box.classList.add('ok');
  box.innerHTML=`<div class="cs"><span>TRAINING COMPLETE</span></div><b>You're ready, Commander</b><p>You know how to move, capture, build, recruit, trade and fight. Keep playing this map, or start a real game.</p>
  <div class="ca"><button class="btn" data-tut="exit">Main menu</button><button class="btn pri" data-tut="play">Play vs AI</button></div>`;
  sfx('capture');for(const el of document.querySelectorAll('.tutHL'))el.classList.remove('tutHL');}
function tutHighlight(){const T=G&&G.tut,st=T&&!T.done&&T.i>=0?TUT[T.i]:null;
  for(const el of document.querySelectorAll('.tutHL'))el.classList.remove('tutHL');
  if(st&&st.hl&&!T.okT)for(const el of document.querySelectorAll(st.hl))el.classList.add('tutHL');}
function tutTick(){
  const T=G&&G.tut;if(!T||T.done||G.demo||T.i<0)return;const st=TUT[T.i],s=T.steps[T.i];
  tutHighlight();
  if(T.okT){if(performance.now()>T.okT)tutGo(T.i+1);return;}
  if(st.ok(s)){T.okT=performance.now()+1100;$('#coach').classList.add('ok');sfx('blip');}
}
$('#coach').addEventListener('click',e=>{const b=e.target.closest('[data-tut]');if(!b||!G||!G.tut)return;const a=b.dataset.tut,T=G.tut;
  if(a==='exit'){$('#coach').classList.add('hide');toMenu();}
  else if(a==='play'){$('#coach').classList.add('hide');startGame({...menuOpts});}
  else if(a==='skip'&&!T.okT)tutGo(T.i+1);
  else if(a==='show'){const m=TUT[T.i].show(T.steps[T.i]);if(m){CAM.x=m.x;CAM.y=m.y;CAM.z=Math.max(CAM.z,1.2);clampCam();}}});
$('#bTrain').onclick=()=>{initAudio();if(AC&&AC.state==='suspended')AC.resume();startTutorial();};
