
// ================= EFFECTS =================
function explode(x,y,s){G.fx.push({k:'ex',x,y,r:9*s,life:.45,max:.45});
  for(let i=0;i<8*s&&G.parts.length<600;i++){const a=Math.random()*TAU,v=rnd(15,60)*s;G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.3,.8),max:.8,sz:rnd(1,2.2)*s,c:Math.random()<.5?'#ffcf6b':'#ff7b39'});}
  for(let i=0;i<3*s&&G.parts.length<600;i++)G.parts.push({x:x+rnd(-4,4),y:y+rnd(-4,4),vx:rnd(-6,6),vy:rnd(-14,-4),life:rnd(.8,1.6),max:1.6,sz:rnd(3,6)*s,c:'smoke'});}
function puff(x,y,c,n){for(let i=0;i<n&&G.parts.length<600;i++){const a=Math.random()*TAU;G.parts.push({x,y,vx:Math.cos(a)*20,vy:Math.sin(a)*20,life:.25,max:.25,sz:1.3,c});}}
function muzzle(x,y,a,s){G.fx.push({k:'mz',x:x+Math.cos(a)*7,y:y+Math.sin(a)*7,a,s,life:.08,max:.08});}
// visual hooks called by the simulation (the match server records them as events instead)
function mzFx(x,y,a,s,delay){G.fx.push({k:'mz',x,y,a,s,life:.07,max:.07,delay});}
function exFx(x,y,r){G.fx.push({k:'ex',x,y,r,life:.25,max:.25});}
function flakFx(x,y){G.fx.push({k:'flak',x,y,life:.45,max:.45});}
function shotEv(){}
function addWreck(t){G.wrecks.push({x:t.x,y:t.y,ang:t.ang,tAng:t.tAng,type:t.type,team:t.team,t:G.time});}
function addFalling(t){G.falling.push({x:t.x,y:t.y,ang:t.ang,type:t.type,team:t.team,t:0,spin:(Math.random()<.5?-1:1)*rnd(2,4),sp:UT[t.type].speed*.7});}
function initVisuals(){const W=G.W,H=G.H;buildTerrain();buildWorld();
  G.ov=document.createElement('canvas');G.ov.width=W;G.ov.height=H;G.ovCtx=G.ov.getContext('2d');G.ovImg=G.ovCtx.createImageData(W,H);
  G.provPath=provBorders();refreshOwn();}
function provBorders(){const W=G.W,H=G.H,P=G.prov,p=new Path2D();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;
    if(x<W-1&&P[i+1]!==P[i]){p.moveTo((x+1)*CELL,y*CELL);p.lineTo((x+1)*CELL,(y+1)*CELL);}
    if(y<H-1&&P[i+W]!==P[i]){p.moveTo(x*CELL,(y+1)*CELL);p.lineTo((x+1)*CELL,(y+1)*CELL);}}
  return p;}
function scorch(x,y,r,a){const g=G.tctx,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(8,8,6,${a})`);gr.addColorStop(1,'rgba(8,8,6,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
function updateFx(dt){
  for(const f of G.fx)f.life-=dt;G.fx=G.fx.filter(f=>f.life>0);
  for(const p of G.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;}G.parts=G.parts.filter(p=>p.life>0);
  for(const m of G.markers)m.life-=dt;G.markers=G.markers.filter(m=>m.life>0);
  if(G.mp)updateProj(dt);
  for(const f of G.fx)if(f.delay>0){f.delay-=dt;f.life+=dt;}
  G.shake*=Math.exp(-dt*9);updateArt(dt);worldFx(dt);
}

// ================= AUDIO =================
let AC=null,MG=null,NB=null,muted=false;const sfxT={};
function initAudio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();MG=AC.createGain();MG.gain.value=.22;MG.connect(AC.destination);
  NB=AC.createBuffer(1,AC.sampleRate*.6,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}catch(e){AC=null;}}
function onScreen(x,y){const z=CAM.z;return Math.abs(x-CAM.x)<VW/2/z+30&&Math.abs(y-CAM.y)<VH/2/z+30}
function tone(type,freqs,step,vol,dur){const now=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;
  freqs.forEach((f,i)=>o.frequency.setValueAtTime(f,now+i*step));g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+dur);g.connect(MG);o.connect(g);o.start(now);o.stop(now+dur+.02);}
function sfx(k,x,y){
  if(!AC||muted||!G||G.demo)return;if(x!==undefined&&!onScreen(x,y))return;
  const now=AC.currentTime,gap={shot:.05,cannon:.09,boom:.11,blip:.05,capture:.3,alert:.5,coin:.06,build:.1,siren:2,whistle:.25,flak:.08}[k];if(sfxT[k]&&now-sfxT[k]<gap)return;sfxT[k]=now;
  if(k==='blip')return tone('sine',[660,880],.08,.25,.25);
  if(k==='capture')return tone('sine',[523,659,784],.08,.25,.4);
  if(k==='alert')return tone('square',[440,330],.08,.12,.3);
  if(k==='coin')return tone('triangle',[988,1319],.05,.18,.18);
  if(k==='build')return tone('square',[180,240],.05,.08,.15);
  if(k==='whistle'){const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(1400,now);o.frequency.exponentialRampToValueAtTime(380,now+.7);g.gain.setValueAtTime(.05,now);g.gain.exponentialRampToValueAtTime(.001,now+.75);o.connect(g);g.connect(MG);o.start(now);o.stop(now+.76);return;}
  if(k==='siren'){const o=AC.createOscillator(),g=AC.createGain();o.type='sawtooth';for(let i=0;i<5;i++){o.frequency.setValueAtTime(420,now+i*.6);o.frequency.linearRampToValueAtTime(760,now+i*.6+.3);o.frequency.linearRampToValueAtTime(420,now+i*.6+.6);}
    g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(.07,now+.2);g.gain.setValueAtTime(.07,now+2.6);g.gain.exponentialRampToValueAtTime(.001,now+3);o.connect(g);g.connect(MG);o.start(now);o.stop(now+3.05);return;}
  const g=AC.createGain();g.connect(MG);const s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();
  const P={flak:['bandpass',700,.12,.09],shot:['highpass',1800,.07,.05],cannon:['lowpass',900,.3,.14],boom:['lowpass',380,.55,.5]}[k];
  fl.type=P[0];fl.frequency.value=P[1];g.gain.setValueAtTime(P[2],now);g.gain.exponentialRampToValueAtTime(.001,now+P[3]);
  s.connect(fl);fl.connect(g);s.start(now,Math.random()*.1,P[3]+.02);
}
const vib=ms=>{try{if(!G.demo&&navigator.vibrate)navigator.vibrate(ms)}catch(e){}};

// ================= TERRAIN ART =================
function buildTerrain(){
  const {W,H,terr,elev}=G,sm=document.createElement('canvas');sm.width=W;sm.height=H;
  const sg=sm.getContext('2d'),id=sg.createImageData(W,H);
  const BASE=[[52,66,44],[34,56,36],[70,66,48],[92,92,98],[14,30,52]];
  for(let i=0;i<W*H;i++){const b=BASE[terr[i]],k=terr[i]===WATER?.55+.5*elev[i]:.82+.36*elev[i];
    id.data[i*4]=b[0]*k;id.data[i*4+1]=b[1]*k;id.data[i*4+2]=b[2]*k;id.data[i*4+3]=255;}
  sg.putImageData(id,0,0);
  const big=document.createElement('canvas');big.width=W*CELL;big.height=H*CELL;const g=big.getContext('2d');
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(sm,0,0,big.width,big.height);
  if('filter' in g){g.filter='blur(7px)';g.drawImage(sm,-CELL,-CELL,big.width+CELL*2,big.height+CELL*2);g.filter='none';}
  const r=mulberry32(G.seed+7);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=terr[y*W+x],X=x*CELL,Y=y*CELL;
    if(t===FOREST){for(let k=0;k<3;k++){const px=X+r()*CELL,py=Y+r()*CELL,rr=2+r()*2.4;
      g.fillStyle='rgba(8,24,12,.5)';g.beginPath();g.arc(px+1,py+1.5,rr,0,TAU);g.fill();
      g.fillStyle=`rgba(${40+r()*20|0},${84+r()*24|0},${50+r()*12|0},.8)`;g.beginPath();g.arc(px,py,rr,0,TAU);g.fill();}}
    else if(t===HILL){if(r()<.7){g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1.3;g.beginPath();g.arc(X+8+r()*2,Y+12,5,Math.PI*1.1,Math.PI*1.9);g.stroke();
      g.strokeStyle='rgba(255,240,200,.08)';g.beginPath();g.arc(X+7,Y+11,5,Math.PI*1.15,Math.PI*1.5);g.stroke();}}
    else if(t===MOUNT){if(r()<.8){const px=X+3+r()*10,py=Y+13,hh=8+r()*5;
      g.fillStyle='rgba(18,18,24,.65)';g.beginPath();g.moveTo(px-7,py);g.lineTo(px,py-hh);g.lineTo(px+7,py);g.fill();
      g.fillStyle='rgba(150,150,160,.5)';g.beginPath();g.moveTo(px,py-hh);g.lineTo(px-7,py);g.lineTo(px-1,py);g.fill();
      g.fillStyle='rgba(235,240,250,.75)';g.beginPath();g.moveTo(px,py-hh);g.lineTo(px-2.4,py-hh+3.6);g.lineTo(px+2.4,py-hh+3.6);g.fill();}}
    else if(t===WATER){if(r()<.35){g.strokeStyle='rgba(150,200,240,.16)';g.lineWidth=1;const px=X+r()*8,py=Y+r()*12;g.beginPath();g.moveTo(px,py);g.quadraticCurveTo(px+3,py-2,px+6,py);g.stroke();}}}
  g.lineCap=g.lineJoin='round';
  for(const [w,c] of [[6,'rgba(30,26,20,.55)'],[3.6,'#8b7b5a'],[1.2,'rgba(205,190,150,.35)']]){g.strokeStyle=c;g.lineWidth=w;g.beginPath();
    for(const p of G.roads){if(p.length<2)continue;const pt=i=>[(i%W+.5)*CELL,((i/W|0)+.5)*CELL];let [x,y]=pt(p[0]);g.moveTo(x,y);
      for(let k=1;k<p.length-1;k++){const [ax,ay]=pt(p[k]),[bx,by]=pt(p[k+1]);g.quadraticCurveTo(ax,ay,(ax+bx)/2,(ay+by)/2);}const [lx,ly]=pt(p[p.length-1]);g.lineTo(lx,ly);}g.stroke();}
  g.strokeStyle='rgba(255,255,255,.035)';g.lineWidth=1;g.beginPath();
  for(let x=0;x<=W;x+=4){g.moveTo(x*CELL,0);g.lineTo(x*CELL,H*CELL);}for(let y=0;y<=H;y+=4){g.moveTo(0,y*CELL);g.lineTo(W*CELL,y*CELL);}g.stroke();
  G.tcan=big;G.tctx=g;G.miniBase=sm;
}

// ================= SPRITES =================
const SPR={};
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function sprite(key,size,fn){if(SPR[key])return SPR[key];const c=document.createElement('canvas');c.width=c.height=size;fn(c.getContext('2d'),size);return SPR[key]=c;}
const bldSprite=(type,o)=>sprite('b'+type+o,64,g=>{const col=TC[o];g.translate(32,32);
  g.fillStyle='rgba(0,0,0,.4)';rrect(g,-25,-21,52,50,11);g.fill();
  g.fillStyle=col.d;rrect(g,-27,-27,54,54,12);g.fill();g.lineWidth=4;g.strokeStyle=col.m;rrect(g,-25,-25,50,50,10);g.stroke();
  drawIco(g,BT[type].ico,0,0,36);});
const depSprite=t=>sprite('d'+t,48,g=>{g.translate(24,24);g.fillStyle='rgba(8,10,12,.72)';g.beginPath();g.arc(0,0,20,0,TAU);g.fill();
  g.lineWidth=2.6;g.strokeStyle='rgba(255,255,255,.6)';g.setLineDash([6,4]);g.beginPath();g.arc(0,0,20,0,TAU);g.stroke();drawIco(g,t,0,0,26);});

// ================= RENDER =================
const cv=$('#cv'),ctx=cv.getContext('2d');let VW=0,VH=0,DPR=1;
const CAM={x:0,y:0,z:1,minZ:.3,maxZ:4};
// you can zoom out past the theatre of war to see the neutral nations across the sea
function fitBounds(){if(!G)return;const m=WM*.68;CAM.minZ=Math.min(VW/((G.W+m*2)*CELL),VH/((G.H+m*2)*CELL));CAM.z=clamp(CAM.z,CAM.minZ,CAM.maxZ);clampCam();}
// keep the view on the map: no empty space unless the whole map already fits on screen
function clampCam(){const m=WM*.85*CELL,x0=-m,y0=-m,mw=G.W*CELL+m*2,mh=G.H*CELL+m*2,hw=VW/2/CAM.z,hh=VH/2/CAM.z;
  CAM.x=hw*2>=mw?x0+mw/2:clamp(CAM.x,x0+hw,x0+mw-hw);CAM.y=hh*2>=mh?y0+mh/2:clamp(CAM.y,y0+hh,y0+mh-hh);}
const s2w=(sx,sy)=>[(sx-VW/2)/CAM.z+CAM.x,(sy-VH/2)/CAM.z+CAM.y];
const w2s=(wx,wy)=>[(wx-CAM.x)*CAM.z+VW/2,(wy-CAM.y)*CAM.z+VH/2];
function circ(c,x,y,r){c.beginPath();c.arc(x,y,r,0,TAU);}
const hpCol=f=>f>.6?'#5be37d':f>.3?'#ffd166':'#ff5a5a';
const moodCol=h=>h>65?'#7be39a':h>40?'#ffd166':h>22?'#ff9f43':'#ff5a5a';
function cityMood(c){const E=G.E[c.owner];return E?clamp(E.hap-c.panic*35-(c.occ>0?18:0),0,100):50}
function drawCity(c,z){
  const s=clamp(1/z,.75,2.2),col=TC[c.owner],R=c.type==='capital'?11:8.5;
  ctx.save();ctx.translate(c.x,c.y);ctx.scale(s,s);
  if(c.owner&&c.contest>.25){ctx.strokeStyle=`rgba(255,255,255,${.35+.35*Math.sin(G.time*8)})`;ctx.lineWidth=2;circ(ctx,0,0,R+6);ctx.stroke();}
  ctx.fillStyle='rgba(6,10,14,.88)';circ(ctx,0,0,R+2);ctx.fill();
  ctx.lineWidth=2.4;ctx.strokeStyle=col.m;circ(ctx,0,0,R);ctx.stroke();
  ctx.fillStyle=col.l;
  if(c.type==='capital'){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?2.8:6.6;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.fill();}
  else if(c.type==='factory'){ctx.fillRect(-4.5,-1.5,9,5.5);ctx.fillRect(1.5,-5.5,2.4,4);ctx.beginPath();ctx.moveTo(-4.5,-1.5);ctx.lineTo(-2,-4);ctx.lineTo(-2,-1.5);ctx.lineTo(.5,-4);ctx.lineTo(.5,-1.5);ctx.fill();}
  else if(c.type==='airbase'){ctx.rotate(-.6);ctx.fillRect(-6,-1.3,12,2.6);ctx.rotate(1.2);ctx.fillRect(-3.5,-1,7,2);ctx.rotate(-.6);}
  else{ctx.fillRect(-4.5,-1,3.5,4.5);ctx.fillRect(1,-1,3.5,4.5);ctx.beginPath();ctx.moveTo(-2.4,-4.5);ctx.lineTo(.2,-1.5);ctx.lineTo(-5,-1.5);ctx.fill();ctx.beginPath();ctx.moveTo(2.8,-4.5);ctx.lineTo(5.4,-1.5);ctx.lineTo(.2,-1.5);ctx.fill();}
  if(c.cp>0&&c.cpBy){ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.6)';circ(ctx,0,0,R+7);ctx.stroke();ctx.strokeStyle=TC[c.cpBy].m;ctx.beginPath();ctx.arc(0,0,R+7,-Math.PI/2,-Math.PI/2+TAU*c.cp);ctx.stroke();}
  if(c.cstate==='fight'){ctx.strokeStyle=`rgba(255,200,80,${.5+.5*Math.sin(G.time*10)})`;ctx.lineWidth=1.6;ctx.setLineDash([3,3]);circ(ctx,0,0,R+7);ctx.stroke();ctx.setLineDash([]);}
  if(c.queue.length&&(c.owner===1||G.demo)){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,R+4,-Math.PI/2,-Math.PI/2+TAU*c.prog/UT[c.queue[0]].time);ctx.stroke();}
  if(c.owner&&(c.owner===1||c.seen1||G.demo)){const m=cityMood(c);ctx.fillStyle=moodCol(m);circ(ctx,R*.75,-R*.75,3.4);ctx.fill();ctx.strokeStyle='#0b1118';ctx.lineWidth=1.2;ctx.stroke();
    if(c.panic>.4){ctx.fillStyle=`rgba(255,90,90,${.6+.4*Math.sin(G.time*10)})`;ctx.font='900 9px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('!',-R*.8,-R*.45);}}
  if(z>.45||c.type==='capital'){ctx.font='700 10px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillText(c.name,.8,R+15.8);ctx.fillStyle=col.l;ctx.fillText(c.name,0,R+15);
    if(z>.7){ctx.font='600 8px system-ui,sans-serif';ctx.fillStyle='rgba(220,230,240,.7)';ctx.fillText(fmt(c.pop),0,R+25);}}
  ctx.restore();
}
const STONE={1:['#a9bfd4','#dfeaf5'],2:['#d4a9ae','#f5e0e2']};
function drawWalls(cx0,cy0,cx1,cy1,z){
  const W=G.W,wl=G.wall,P={1:new Path2D(),2:new Path2D()},blocks=[];
  for(let y=cy0;y<=cy1;y++)for(let x=cx0;x<=cx1;x++){const i=y*W+x,w=wl[i];if(!w)continue;const px=(x+.5)*CELL,py=(y+.5)*CELL,p=P[w];
    p.moveTo(px,py);p.lineTo(px+.01,py);
    if(x<W-1&&wl[i+1]===w){p.moveTo(px,py);p.lineTo(px+CELL,py);}
    if(y<G.H-1&&wl[i+W]===w){p.moveTo(px,py);p.lineTo(px,py+CELL);}
    if(y<G.H-1&&x<W-1&&wl[i+W+1]===w&&wl[i+1]!==w&&wl[i+W]!==w){p.moveTo(px,py);p.lineTo(px+CELL,py+CELL);}
    if(y<G.H-1&&x>0&&wl[i+W-1]===w&&wl[i-1]!==w&&wl[i+W]!==w){p.moveTo(px,py);p.lineTo(px-CELL,py+CELL);}
    blocks.push(px,py,w,G.wallHp[i]/BT.wall.hp);}
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const t of [1,2]){ctx.strokeStyle='rgba(10,12,16,.9)';ctx.lineWidth=8.5;ctx.stroke(P[t]);ctx.strokeStyle=STONE[t][0];ctx.lineWidth=5.2;ctx.stroke(P[t]);ctx.strokeStyle=TC[t].d;ctx.lineWidth=1.3;ctx.stroke(P[t]);}
  for(let k=0;k<blocks.length;k+=4){const x=blocks[k],y=blocks[k+1],t=blocks[k+2],f=blocks[k+3];
    ctx.fillStyle='rgba(10,12,16,.9)';ctx.fillRect(x-4.5,y-4.5,9,9);ctx.fillStyle=f<.999&&f<.5?'#6a6460':STONE[t][1];ctx.fillRect(x-3.3,y-3.3,6.6,6.6);
    ctx.fillStyle=TC[t].m;ctx.fillRect(x-1.4,y-1.4,2.8,2.8);
    if(f<.999){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-5,y+5.5,10,2);ctx.fillStyle=hpCol(f);ctx.fillRect(x-5,y+5.5,10*f,2);}}
}
function drawBld(b,s,show){
  const sz=13*s;ctx.globalAlpha=b.prog<1?.5:1;ctx.drawImage(bldSprite(b.type,b.owner),b.x-sz/2,b.y-sz/2,sz,sz);ctx.globalAlpha=1;
  if(b.prog<1){ctx.strokeStyle='#fff';ctx.lineWidth=1.6*s/1.5;ctx.beginPath();ctx.arc(b.x,b.y,sz*.62,-Math.PI/2,-Math.PI/2+TAU*b.prog);ctx.stroke();}
  else if(show&&BT[b.type].out&&b.eff<.4){ctx.fillStyle='rgba(0,0,0,.65)';circ(ctx,b.x+sz*.42,b.y-sz*.42,sz*.2);ctx.fill();ctx.fillStyle='#ffb648';ctx.font=`900 ${sz*.3}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',b.x+sz*.42,b.y-sz*.4);ctx.textBaseline='alphabetic';}
  if(b.hp<b.maxHp){const f=b.hp/b.maxHp;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(b.x-sz/2,b.y+sz*.58,sz,2*s/1.5);ctx.fillStyle=hpCol(f);ctx.fillRect(b.x-sz/2,b.y+sz*.58,sz*f,2*s/1.5);}
  if((b.type==='steel'||b.type==='arms')&&b.eff>.2&&(b.smokeT-=.016)<0){b.smokeT=.35;if(G.parts.length<600)G.parts.push({x:b.x+sz*.2,y:b.y-sz*.4,vx:rnd(-3,3),vy:rnd(-12,-6),life:1.4,max:1.4,sz:2.2,c:'smoke'});}
}
function computePlaceCells(){G.placeDirty=false;const out=[],N=G.W*G.H,t=G.place.type;for(let i=0;i<N;i++)if(G.own[i]===1&&!placeErr(1,t,i))out.push(i);G.placeCells=out;}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=G&&G.wcan?'#0d1c2f':'#070a0d';ctx.fillRect(0,0,VW,VH);if(!G)return;
  const z=CAM.z,shx=G.shake>.2?rnd(-G.shake,G.shake):0,shy=G.shake>.2?rnd(-G.shake,G.shake):0,WT=()=>ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(VW/2-CAM.x*z+shx),DPR*(VH/2-CAM.y*z+shy));WT();
  const x0=CAM.x-VW/2/z-30,x1=CAM.x+VW/2/z+30,y0=CAM.y-VH/2/z-30,y1=CAM.y+VH/2/z+30;
  const inV=(x,y,m=0)=>x>x0-m&&x<x1+m&&y>y0-m&&y<y1+m;
  const cx0=Math.max(0,Math.floor(x0/CELL)),cx1=Math.min(G.W-1,Math.floor(x1/CELL)),cy0=Math.max(0,Math.floor(y0/CELL)),cy1=Math.min(G.H-1,Math.floor(y1/CELL));
  drawWorld(z,inV);ctx.imageSmoothingEnabled=true;ctx.drawImage(G.tcan,0,0);ctx.drawImage(G.ov,0,0,G.W*CELL,G.H*CELL);
  ctx.lineJoin=ctx.lineCap='round';
  ctx.strokeStyle='rgba(235,240,245,.16)';ctx.lineWidth=Math.max(.8,1/z);ctx.setLineDash([3/Math.max(z,.4),3/Math.max(z,.4)]);ctx.stroke(G.provPath);ctx.setLineDash([]);
  for(const [p,c,t] of [[G.pathP,'62,166,255',1],[G.pathE,'255,79,94',2]]){if(!p)continue;ctx.strokeStyle=`rgba(${c},.25)`;ctx.lineWidth=Math.max(4,6/z);ctx.stroke(p);
    ctx.strokeStyle=`rgba(${c},.95)`;ctx.lineWidth=Math.max(1.2,1.8/z);if(G.peace&&t===2)ctx.setLineDash([6/Math.max(z,.5),4/Math.max(z,.5)]);ctx.stroke(p);ctx.setLineDash([]);}
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2/z;ctx.strokeRect(0,0,G.W*CELL,G.H*CELL);
  if(G.place){if(G.placeDirty||!G.placeCells)computePlaceCells();const dep=BT[G.place.type].on==='dep',W=G.W;
    ctx.fillStyle=dep?'rgba(123,227,154,.5)':'rgba(123,227,154,.2)';
    for(const i of G.placeCells){const x=i%W,y=i/W|0;if(x<cx0||x>cx1||y<cy0||y>cy1)continue;ctx.fillRect(x*CELL+1.5,y*CELL+1.5,CELL-3,CELL-3);}}
  const s=clamp(1.15/z,1,2.4),show=u=>u.team===1||G.demo||u.vis[1];
  for(const d of G.deps)if(inV(d.x,d.y)&&!G.bAt.has(d.ci)){const sz=11*s;ctx.drawImage(depSprite(d.type),d.x-sz/2,d.y-sz/2,sz,sz);}
  drawWalls(cx0,cy0,cx1,cy1,z);
  drawFallout(z);
  for(const c of G.cities)if(inV(c.x,c.y,40))drawCityArt(c,z);
  for(const b of G.blds)if(inV(b.x,b.y))drawBldArt(b,s,b.owner===1);
  if(G.sel.length){ctx.setLineDash([4/z,4/z]);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1/z;ctx.beginPath();
    for(const u of G.sel){if(UT[u.type].air){if(u.order&&!u.landed){ctx.moveTo(u.x,u.y);ctx.lineTo(u.order.x,u.order.y);}}else if(u.state!=='idle'){ctx.moveTo(u.x,u.y);ctx.lineTo(u.goalX,u.goalY);}}ctx.stroke();ctx.setLineDash([]);}
  for(const m of G.markers){const t=1-m.life/m.max;ctx.strokeStyle=`rgba(${m.c},${1-t})`;ctx.lineWidth=2/z;circ(ctx,m.x,m.y,(4+t*14)/Math.max(z,.6));ctx.stroke();}
  drawCivs(z,inV);
  for(const w of G.wrecks)if(inV(w.x,w.y))drawWreck(w,s);
  for(const u of G.units)if(!u.dead&&!UT[u.type].air&&inV(u.x,u.y)&&show(u))drawGround(u,s);
  for(const c of G.cities)if(inV(c.x,c.y))drawCity(c,z);
  if(G.tut&&G.tut.mark){const m=G.tut.mark,r=(26+5*Math.sin(G.time*5))*clamp(1/z,.8,2.2);ctx.strokeStyle='rgba(255,209,102,.95)';ctx.lineWidth=3*clamp(1/z,.8,2.2);
    ctx.setLineDash([7,5]);ctx.lineDashOffset=-G.time*20;circ(ctx,m.x,m.y,r);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
    ctx.fillStyle='rgba(255,209,102,.95)';const ay=m.y-r-6-4*Math.sin(G.time*5),k=clamp(1/z,.8,2.2);ctx.beginPath();ctx.moveTo(m.x,ay);ctx.lineTo(m.x-6*k,ay-9*k);ctx.lineTo(m.x+6*k,ay-9*k);ctx.fill();}
  WT();
  for(const u of G.units)if(!u.dead&&u.landed&&inV(u.x,u.y)&&show(u))drawPlane(u,s);
  for(const p of G.proj)drawProj(p,s);
  for(const f of G.fx){const a=f.life/f.max;
    if(f.k==='tr'){ctx.strokeStyle=f.c;ctx.globalAlpha=a;ctx.lineWidth=f.w;ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();ctx.globalAlpha=1;}
    else if(f.k==='mz'){if(f.delay>0)continue;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,220,130,${a})`;ctx.beginPath();ctx.moveTo(0,-1.3*f.s);ctx.lineTo(4.5*f.s,0);ctx.lineTo(0,1.3*f.s);ctx.closePath();ctx.fill();ctx.fillStyle=`rgba(255,250,220,${a})`;circ(ctx,0,0,1.1*f.s);ctx.fill();ctx.restore();}
    else if(f.k==='flak'){ctx.fillStyle=`rgba(60,58,55,${a*.75})`;circ(ctx,f.x,f.y,4.5*(1.6-a));ctx.fill();if(a>.75){ctx.fillStyle=`rgba(255,190,90,${a})`;circ(ctx,f.x,f.y,2);ctx.fill();}}}
  ctx.globalCompositeOperation='lighter';
  for(const f of G.fx)if(f.k==='ex'){const a=f.life/f.max,r=f.r*(1.4-a*.6),g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,r);
    g.addColorStop(0,`rgba(255,240,200,${a})`);g.addColorStop(.4,`rgba(255,140,40,${a*.8})`);g.addColorStop(1,'rgba(255,60,0,0)');ctx.fillStyle=g;circ(ctx,f.x,f.y,r);ctx.fill();}
  for(const p of G.parts)if(p.c!=='smoke'){ctx.fillStyle=p.c;ctx.globalAlpha=p.life/p.max;circ(ctx,p.x,p.y,p.sz);ctx.fill();}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(const p of G.parts)if(p.c==='smoke'){ctx.fillStyle=`rgba(40,40,40,${.35*p.life/p.max})`;circ(ctx,p.x,p.y,p.sz*(2-p.life/p.max));ctx.fill();}
  for(const f of G.falling)if(inV(f.x,f.y))drawFalling(f,s);
  drawStrikes(z);drawNukes();drawClouds(z);
  if(G.target){const T=G.target,p=T.pt||(hoverX>=0?(([x,y])=>({x,y}))(s2w(hoverX,hoverY)):null);if(p){const R=STRIKE[T.k].r,nk=T.k==='nuke',a=.6+.4*Math.sin(G.time*8);
    ctx.fillStyle=nk?'rgba(255,60,60,.12)':'rgba(255,120,60,.1)';circ(ctx,p.x,p.y,R);ctx.fill();ctx.strokeStyle=`rgba(255,${nk?70:120},80,${a})`;ctx.lineWidth=2/Math.max(z,.4);circ(ctx,p.x,p.y,R);ctx.stroke();
    ctx.beginPath();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ctx.moveTo(p.x+dx*R*.55,p.y+dy*R*.55);ctx.lineTo(p.x+dx*R*1.15,p.y+dy*R*1.15);}ctx.stroke();
    if(!T.pt){ctx.globalAlpha=.6;}ctx.fillStyle='#ff5a5a';circ(ctx,p.x,p.y,2.4/Math.max(z,.4));ctx.fill();ctx.globalAlpha=1;}}
  for(const u of G.units)if(!u.dead&&UT[u.type].air&&!u.landed&&inV(u.x,u.y)&&show(u))drawPlane(u,s);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.font='800 10px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  if(!G.demo)for(const d of G.divs){if(d.team!==1||!d.units.length)continue;const c=centroid(d.units);const [sx,sy]=w2s(c.x,c.y);
    if(sx<-40||sy<-40||sx>VW+40||sy>VH+40)continue;const tw=ctx.measureText(d.short).width+14,yy=sy-30;
    ctx.fillStyle='rgba(8,12,16,.8)';rrect(ctx,sx-tw/2,yy-8,tw,16,8);ctx.fill();
    ctx.strokeStyle=d.color;ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle=d.color;ctx.fillText(d.short,sx,yy+.5);}
  ctx.textBaseline='alphabetic';
  if(gest&&gest.type==='box'){const x=Math.min(gest.sx,gest.ex),y=Math.min(gest.sy,gest.ey),w=Math.abs(gest.ex-gest.sx),h=Math.abs(gest.ey-gest.sy);
    ctx.fillStyle='rgba(62,166,255,.12)';ctx.fillRect(x,y,w,h);ctx.setLineDash([5,4]);ctx.strokeStyle='#bfe3ff';ctx.lineWidth=1.2;ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);}
}
