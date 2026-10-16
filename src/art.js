
// ================= UNIT ART =================
// Top-down military look. Team colours are worked into the paint scheme so sides stay readable.
const ARMY={1:{base:'#5f7d99',mid:'#4a647e',dark:'#2c3e51',light:'#a3bdd6',helm:'#3e576f',acc:'#3ea6ff'},2:{base:'#97665d',mid:'#7a4c45',dark:'#4c2c28',light:'#d4a59c',helm:'#6d413b',acc:'#ff4f5e'}};
const WRECK={base:'#3a3632',mid:'#2b2825',dark:'#1a1816',light:'#4a4540',helm:'#2b2825',acc:'#2b2825'};
const unitScale=()=>clamp(1.15/CAM.z,1,2.4);
const recoil=u=>Math.max(0,1-(G.time-u.fireT)/.3);
function shadowRect(L,W,r){ctx.fillStyle='rgba(0,0,0,.3)';rrect(ctx,-L/2+1.3,-W/2+1.7,L,W,r);ctx.fill();}
function drawSoldier(x,y,a,C,step,s,prone){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(s,s);
  ctx.fillStyle='rgba(0,0,0,.26)';ctx.beginPath();ctx.ellipse(.5,.7,2.3,1.7,0,0,TAU);ctx.fill();
  const st=Math.sin(step)*1.1;
  ctx.fillStyle=C.dark;ctx.beginPath();ctx.ellipse(st-.3,-.8,1.05,.55,0,0,TAU);ctx.ellipse(-st-.3,.8,1.05,.55,0,0,TAU);ctx.fill();
  ctx.fillRect(-2.3,-1.15,1.3,2.3);
  ctx.fillStyle=C.base;ctx.beginPath();ctx.ellipse(-.2,0,1.3,2.1,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#15110c';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(.4,1.15);ctx.lineTo(4.4,1);ctx.stroke();ctx.strokeStyle='#6b4a2b';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(-.9,1.2);ctx.lineTo(.6,1.15);ctx.stroke();
  ctx.strokeStyle=C.mid;ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(-.1,1.8);ctx.lineTo(1.5,1.2);ctx.moveTo(-.1,-1.7);ctx.lineTo(2,.95);ctx.stroke();
  ctx.fillStyle=C.helm;ctx.beginPath();ctx.arc(.15,0,1.3,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.arc(-.25,-.45,.42,0,TAU);ctx.fill();
  ctx.restore();
}
function drawSquad(u,s){
  const C=ARMY[u.team],men=menOf(u),mv=u.mv>1;
  for(let k=0;k<men;k++){const [x,y]=soldierPos(u,k);const sway=mv?0:Math.sin(G.time*1.3+u.ph+k)*.04;
    drawSoldier(x,y,u.ang+sway+(k-2)*.04,u.flash>0&&k===0?{...C,base:'#fff'}:C,mv?u.walk*.55+k*1.9:0,s*1.3);}
}
function drawTank(u,s,C,dead){
  C=C||ARMY[u.team];const L=14,Wd=9.2,rec=dead?0:recoil(u)*2.6;
  ctx.save();ctx.translate(u.x,u.y);ctx.scale(s,s);ctx.rotate(u.ang);
  shadowRect(L,Wd,2);
  ctx.fillStyle='#1a1d21';rrect(ctx,-L/2,-Wd/2,L,2.7,1.2);ctx.fill();rrect(ctx,-L/2,Wd/2-2.7,L,2.7,1.2);ctx.fill();
  if(!dead){ctx.strokeStyle='#40464d';ctx.lineWidth=.45;ctx.beginPath();const off=(u.walk*1.25)%1.6;
    for(let x=-L/2+.3+off;x<L/2-.2;x+=1.6){ctx.moveTo(x,-Wd/2+.25);ctx.lineTo(x,-Wd/2+2.45);ctx.moveTo(x,Wd/2-2.45);ctx.lineTo(x,Wd/2-.25);}ctx.stroke();}
  ctx.fillStyle=u.flash>0?'#fff':C.base;rrect(ctx,-L/2+.7,-Wd/2+1.9,L-1.4,Wd-3.8,1.2);ctx.fill();
  ctx.fillStyle=C.mid;ctx.fillRect(L/2-3.1,-Wd/2+2.1,2.2,Wd-4.2);
  ctx.strokeStyle=C.dark;ctx.lineWidth=.35;ctx.beginPath();for(let k=0;k<4;k++){ctx.moveTo(-L/2+1.4+k*.8,-1.7);ctx.lineTo(-L/2+1.4+k*.8,1.7);}ctx.stroke();
  ctx.rotate((u.tAng??u.ang)-u.ang+(dead?.5:0));
  ctx.fillStyle=C.dark;ctx.fillRect(1.6-rec,-.62,9.6,1.24);ctx.fillRect(10.3-rec,-.95,1.5,1.9);
  ctx.fillStyle=u.flash>0?'#fff':C.mid;rrect(ctx,-3.4,-3.1,6.8,6.2,2);ctx.fill();ctx.strokeStyle=C.dark;ctx.lineWidth=.4;ctx.stroke();
  ctx.fillStyle=C.dark;ctx.beginPath();ctx.arc(-1.1,-.9,1.1,0,TAU);ctx.fill();
  if(!dead){ctx.fillStyle=C.light;ctx.beginPath();ctx.arc(-1.1,-.9,.45,0,TAU);ctx.fill();ctx.fillStyle=C.acc;ctx.fillRect(-3.2,2.3,3.6,.65);}
  ctx.restore();
}
function drawArt(u,s,C,dead){
  C=C||ARMY[u.team];const rec=dead?0:recoil(u)*3;
  ctx.save();ctx.translate(u.x,u.y);ctx.scale(s,s);ctx.rotate(u.ang);
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(-1,1.4,7,4.5,0,0,TAU);ctx.fill();
  ctx.strokeStyle=C.dark;ctx.lineWidth=1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-1,.9);ctx.lineTo(-8.5,2.9);ctx.moveTo(-1,-.9);ctx.lineTo(-8.5,-2.9);ctx.stroke();
  ctx.fillStyle='#1a1d21';rrect(ctx,-2.4,-4.7,3.4,1.7,.6);ctx.fill();rrect(ctx,-2.4,3,3.4,1.7,.6);ctx.fill();
  ctx.fillStyle=C.dark;ctx.fillRect(-1.2-rec,-1.1,3.4,2.2);ctx.fillRect(-rec,-.66,11.4,1.32);ctx.fillRect(10.4-rec,-.9,1.2,1.8);
  ctx.fillStyle=u.flash>0?'#fff':C.base;rrect(ctx,-.8,-3.3,1.8,6.6,.6);ctx.fill();
  ctx.restore();
  if(!dead){const c=Math.cos(u.ang),n=Math.sin(u.ang);for(const [ox,oy] of [[-6,4.8],[-6.6,-4.6]]){const x=u.x+(ox*c-oy*n)*s,y=u.y+(ox*n+oy*c)*s;drawSoldier(x,y,u.ang,C,u.mv>1?u.walk*.6:0,s*.9);}}
}
function drawAA(u,s,C,dead){
  C=C||ARMY[u.team];const rec=dead?0:recoil(u)*1.2;
  ctx.save();ctx.translate(u.x,u.y);ctx.scale(s,s);ctx.rotate(u.ang);
  shadowRect(14,7,1.5);
  ctx.fillStyle='#1a1d21';for(const [x,y] of [[-5.2,-3.6],[-5.2,2.4],[3.4,-3.6],[3.4,2.4]])rrect(ctx,x,y,2.6,1.2,.5),ctx.fill();
  ctx.fillStyle=C.mid;rrect(ctx,-6.8,-2.9,8.8,5.8,.8);ctx.fill();
  ctx.fillStyle=u.flash>0?'#fff':C.base;rrect(ctx,2.3,-2.7,4.6,5.4,1.2);ctx.fill();
  ctx.fillStyle=dead?'#222':'rgba(170,215,255,.75)';ctx.fillRect(5.5,-2,.9,4);
  ctx.translate(-2.4,0);ctx.rotate((u.tAng??u.ang)-u.ang);
  ctx.fillStyle='#202326';ctx.fillRect(.6-rec,-1.25,7.2,.62);ctx.fillRect(.6-rec,.63,7.2,.62);
  ctx.fillStyle=C.dark;ctx.beginPath();ctx.arc(0,0,2.1,0,TAU);ctx.fill();ctx.fillStyle=C.light;ctx.fillRect(-1.3,-.4,2,.8);
  ctx.restore();
}
function planeBody(type,C,bank,shadow,prop){
  const k=Math.cos(clamp(bank,-1,1)*.6);ctx.fillStyle=shadow?'rgba(0,0,0,.3)':C.base;
  if(type==='ftr'){
    ctx.beginPath();ctx.moveTo(2.4,0);ctx.lineTo(-.4,-8.2*k);ctx.lineTo(-2.8,-8.2*k);ctx.lineTo(-1.8,0);ctx.lineTo(-2.8,8.2*k);ctx.lineTo(-.4,8.2*k);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-4.6,0);ctx.lineTo(-6,-3.2*k);ctx.lineTo(-7.1,-3.2*k);ctx.lineTo(-6.6,0);ctx.lineTo(-7.1,3.2*k);ctx.lineTo(-6,3.2*k);ctx.closePath();ctx.fill();
    if(!shadow)ctx.fillStyle=C.mid;ctx.beginPath();ctx.ellipse(0,0,6.6,1.3,0,0,TAU);ctx.fill();
    if(shadow)return;
    ctx.fillStyle='rgba(160,215,255,.85)';ctx.beginPath();ctx.ellipse(1.4,0,1.4,.65,0,0,TAU);ctx.fill();
    for(const sy of [-1,1]){ctx.fillStyle=C.acc;ctx.beginPath();ctx.arc(-1.6,sy*5.4*k,1.1,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-1.6,sy*5.4*k,.42,0,TAU);ctx.fill();}
    ctx.fillStyle='rgba(225,225,225,.2)';ctx.beginPath();ctx.ellipse(6.9,0,.5,2.7,0,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(30,30,30,.7)';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(6.9,-Math.cos(prop)*2.6);ctx.lineTo(6.9,Math.cos(prop)*2.6);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(2.6,0);ctx.lineTo(.6,-13*k);ctx.lineTo(-1.6,-13*k);ctx.lineTo(-2,0);ctx.lineTo(-1.6,13*k);ctx.lineTo(.6,13*k);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-6.6,0);ctx.lineTo(-7.8,-4.6*k);ctx.lineTo(-9.2,-4.6*k);ctx.lineTo(-8.8,0);ctx.lineTo(-9.2,4.6*k);ctx.lineTo(-7.8,4.6*k);ctx.closePath();ctx.fill();
    if(!shadow)ctx.fillStyle=C.mid;ctx.beginPath();ctx.ellipse(-.6,0,9.2,1.75,0,0,TAU);ctx.fill();
    if(shadow)return;
    ctx.fillStyle=C.dark;for(const y of [-9,-4.6,4.6,9]){rrect(ctx,-.2,y*k-.85,4,1.7,.6);ctx.fill();}
    ctx.fillStyle='rgba(225,225,225,.2)';for(const y of [-9,-4.6,4.6,9]){ctx.beginPath();ctx.ellipse(4.1,y*k,.45,1.9,0,0,TAU);ctx.fill();}
    ctx.strokeStyle='rgba(30,30,30,.6)';ctx.lineWidth=.4;ctx.beginPath();for(const y of [-9,-4.6,4.6,9]){ctx.moveTo(4.1,y*k-Math.cos(prop+y)*1.8);ctx.lineTo(4.1,y*k+Math.cos(prop+y)*1.8);}ctx.stroke();
    ctx.fillStyle='rgba(160,215,255,.8)';ctx.beginPath();ctx.ellipse(6.6,0,1.6,.9,0,0,TAU);ctx.fill();
    for(const sy of [-1,1]){ctx.fillStyle=C.acc;ctx.beginPath();ctx.arc(-.6,sy*11*k,1.2,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-.6,sy*11*k,.45,0,TAU);ctx.fill();}
  }
}
function drawPlane(u,s){
  const d=UT[u.type],C=ARMY[u.team],prop=G.time*60+u.id;
  if(!u.landed&&u.hp<u.maxHp*.5&&Math.random()<.35&&G.parts.length<650)G.parts.push({x:u.x,y:u.y,vx:0,vy:0,life:.9,max:.9,sz:2,c:'smoke'});
  if(u.landed){ctx.save();ctx.translate(u.x,u.y);ctx.scale(s*.62,s*.62);ctx.rotate(-Math.PI/2);planeBody(u.type,C,0,true,0);planeBody(u.type,C,0,false,0);ctx.restore();return;}
  if(u.trail.length>3){ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1.1*s;ctx.beginPath();ctx.moveTo(u.trail[0],u.trail[1]);for(let i=2;i<u.trail.length;i+=2)ctx.lineTo(u.trail[i],u.trail[i+1]);ctx.lineTo(u.x,u.y);ctx.stroke();}
  ctx.save();ctx.translate(u.x+8*s,u.y+12*s);ctx.scale(s*.9,s*.9);ctx.rotate(u.ang);planeBody(u.type,C,u.bank,true,0);ctx.restore();
  ctx.save();ctx.translate(u.x,u.y);ctx.scale(s,s);
  if(u.sel){ctx.strokeStyle='#fff';ctx.lineWidth=1;circ(ctx,0,0,u.type==='bmb'?15:10);ctx.stroke();}
  else if(u.div&&u.team===1){ctx.strokeStyle=u.div.color;ctx.lineWidth=.9;circ(ctx,0,0,u.type==='bmb'?14:9);ctx.stroke();}
  ctx.save();ctx.rotate(u.ang);planeBody(u.type,u.flash>0?{...C,base:'#fff',mid:'#ddd'}:C,u.bank,false,prop);ctx.restore();
  if(u.team===1||G.demo){const f=u.hp/u.maxHp,fu=u.fuel/d.fuel,R=u.type==='bmb'?14:10;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(-6,R,12,3.4);ctx.fillStyle=hpCol(f);ctx.fillRect(-6,R,12*f,1.5);ctx.fillStyle=fu<.25?'#ff7b39':'#ffb648';ctx.fillRect(-6,R+1.9,12*fu,1.5);}
  ctx.restore();
}
function drawGround(u,s){
  const d=UT[u.type],R=u.type==='inf'?8.5:u.type==='art'?9:8.5;
  ctx.save();ctx.translate(u.x,u.y);ctx.scale(s,s);
  if(u.sel){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1;ctx.setLineDash([2.4,1.6]);circ(ctx,0,0,R+1.5);ctx.stroke();ctx.setLineDash([]);}
  else if(u.div&&u.team===1){ctx.strokeStyle=u.div.color;ctx.globalAlpha=.75;ctx.lineWidth=.9;circ(ctx,0,0,R);ctx.stroke();ctx.globalAlpha=1;}
  ctx.restore();
  if(u.type==='inf')drawSquad(u,s);else if(u.type==='eng')drawBuilder(u,s);else if(u.type==='tank')drawTank(u,s);else if(u.type==='art')drawArt(u,s);else drawAA(u,s);
  ctx.save();ctx.translate(u.x,u.y);ctx.scale(s,s);
  if(u.sel||(u.hp<u.maxHp*.98&&G.time-u.lastHit<8)){const f=u.hp/u.maxHp;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(-5,-R-3,10,1.6);ctx.fillStyle=hpCol(f);ctx.fillRect(-5,-R-3,10*f,1.6);}
  if(u.ally!=null){ctx.fillStyle=G.countries[u.ally].flag.c[0];ctx.fillRect(6.6,-R-3.6,2.6,2.2);ctx.strokeStyle='#000';ctx.lineWidth=.3;ctx.strokeRect(6.6,-R-3.6,2.6,2.2);}
  if(u.rank){ctx.strokeStyle='#ffd166';ctx.lineWidth=.6;ctx.beginPath();for(let i=0;i<u.rank;i++){const y=-R-5-i*1.3;ctx.moveTo(-1.4,y+.7);ctx.lineTo(0,y);ctx.lineTo(1.4,y+.7);}ctx.stroke();}
  if(u.state==='retreat'){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(-2,R+1.5);ctx.lineTo(0,R+3.5);ctx.lineTo(2,R+1.5);ctx.stroke();}
  if(d.cls==='veh'&&(u.team===1||G.demo)&&u.fuel<d.fuel*.3)drawIco(ctx,'oil',R+1,-R,5,u.fuel<=0?'#ff5a5a':'#ffb648');
  ctx.restore();
}
function drawWreck(w,s){
  const age=G.time-w.t,fake={x:w.x,y:w.y,ang:w.ang,tAng:w.tAng,team:w.team,walk:0,flash:0,fireT:-9,mv:0};
  ctx.globalAlpha=age>45?Math.max(0,1-(age-45)/15):1;
  if(w.type==='tank')drawTank(fake,s,WRECK,true);else if(w.type==='art')drawArt(fake,s,WRECK,true);else drawAA(fake,s,WRECK,true);
  ctx.globalAlpha=1;
  if(age<20){const f=.6+.4*Math.sin(G.time*20+w.x);ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(w.x,w.y,0,w.x,w.y,7*s);
    g.addColorStop(0,`rgba(255,170,60,${.55*f})`);g.addColorStop(1,'rgba(255,80,0,0)');ctx.fillStyle=g;circ(ctx,w.x,w.y,7*s);ctx.fill();ctx.globalCompositeOperation='source-over';
    if(Math.random()<.35&&G.parts.length<650){G.parts.push({x:w.x+rnd(-3,3),y:w.y+rnd(-3,3),vx:rnd(-3,3),vy:rnd(-14,-8),life:rnd(1.2,2.2),max:2.2,sz:rnd(2,3.5),c:'smoke'});
      G.parts.push({x:w.x+rnd(-2,2),y:w.y+rnd(-2,2),vx:rnd(-4,4),vy:rnd(-10,-4),life:.35,max:.35,sz:rnd(.8,1.6),c:'#ffb648'});}}
}
function drawFalling(f,s){const k=1-f.t/1.6;ctx.save();ctx.translate(f.x,f.y);ctx.scale(s*k,s*k);ctx.rotate(f.ang);ctx.globalAlpha=.9;planeBody(f.type,{...ARMY[f.team],base:'#3b3633',mid:'#2b2725'},Math.sin(f.t*6),false,0);ctx.restore();ctx.globalAlpha=1;}

// ================= BATTLEFIELD EFFECTS =================
function smoke(x,y,n){for(let i=0;i<n&&G.parts.length<650;i++)G.parts.push({x:x+rnd(-2,2),y:y+rnd(-2,2),vx:rnd(-6,6),vy:rnd(-8,-2),life:rnd(.6,1.2),max:1.2,sz:rnd(1.5,3),c:'smoke'});}
function sparks(x,y,n){for(let i=0;i<n&&G.parts.length<650;i++){const a=Math.random()*TAU,v=rnd(40,90);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.1,.25),max:.25,sz:.7,c:'#ffe28a'});}}
function debris(x,y,n){for(let i=0;i<n&&G.parts.length<650;i++){const a=Math.random()*TAU,v=rnd(20,55);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.4,.8),max:.8,sz:rnd(.7,1.4),c:'#3b342c'});}}
function burn(x,y,secs){(G.burns||(G.burns=[])).push({x,y,until:G.time+secs});}
function shakeAt(x,y,a){if(!G.demo&&onScreen(x,y))G.shake=Math.min(7,Math.max(G.shake,a));}
function trackMark(u){const g=G.tctx,c=Math.cos(u.ang),n=Math.sin(u.ang),o=u.type==='tank'?3.3:2.8;g.fillStyle='rgba(28,22,16,.13)';
  for(const sd of [-1,1]){g.save();g.translate(u.x-n*o*sd,u.y+c*o*sd);g.rotate(u.ang);g.fillRect(-1.2,-.9,2.4,1.8);g.restore();}}
function crater(x,y){const g=G.tctx;g.fillStyle='rgba(20,16,12,.45)';g.beginPath();g.ellipse(x,y,4.2,3.6,Math.random(),0,TAU);g.fill();
  g.strokeStyle='rgba(150,130,100,.25)';g.lineWidth=1.2;g.beginPath();g.arc(x,y,5,0,TAU);g.stroke();}
function fallen(x,y,team,a){const g=G.tctx,C=ARMY[team];g.save();g.translate(x,y);g.rotate(a+rnd(-1.4,1.4));g.globalAlpha=.75;
  g.fillStyle=C.dark;g.beginPath();g.ellipse(0,0,2.4,1.1,0,0,TAU);g.fill();g.fillStyle=C.helm;g.beginPath();g.arc(2.6,.2,1,0,TAU);g.fill();
  g.strokeStyle='#241a12';g.lineWidth=.5;g.beginPath();g.moveTo(-1.5,1.8);g.lineTo(2.5,2.4);g.stroke();g.restore();}
function updateArt(dt){
  for(const f of G.falling){f.t+=dt;f.ang+=f.spin*dt;f.x+=Math.cos(f.ang)*f.sp*dt*.6;f.y+=Math.sin(f.ang)*f.sp*dt*.6+12*dt;
    if(G.parts.length<650)G.parts.push({x:f.x,y:f.y,vx:0,vy:0,life:1.1,max:1.1,sz:2.6,c:'smoke'});
    if(f.t>1.6){f.done=true;explode(f.x,f.y,1.4);scorch(f.x,f.y,8,.35);crater(f.x,f.y);debris(f.x,f.y,10);burn(f.x,f.y,8);shakeAt(f.x,f.y,2.5);sfx('boom',f.x,f.y);}}
  if(G.falling.length)G.falling=G.falling.filter(f=>!f.done);
  if(G.wrecks.length>40)G.wrecks.shift();G.wrecks=G.wrecks.filter(w=>G.time-w.t<60);
  if(G.burns){for(const b of G.burns)if(Math.random()<dt*6&&G.parts.length<650){G.parts.push({x:b.x+rnd(-4,4),y:b.y+rnd(-4,4),vx:rnd(-3,3),vy:rnd(-12,-6),life:rnd(1,2),max:2,sz:rnd(2,3.5),c:'smoke'});G.parts.push({x:b.x+rnd(-3,3),y:b.y+rnd(-3,3),vx:0,vy:rnd(-8,-3),life:.3,max:.3,sz:1.2,c:'#ff9a3c'});}
    G.burns=G.burns.filter(b=>b.until>G.time);}
}
function drawProj(p,s){
  if(p.t<0)return;const t=Math.min(1,p.t/p.dur),x=p.sx+(p.tx-p.sx)*t,y=p.sy+(p.ty-p.sy)*t,dx=p.tx-p.sx,dy=p.ty-p.sy,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;
  if(p.kind==='shell'){const h=Math.sin(Math.PI*t)*L*.28;ctx.fillStyle='rgba(0,0,0,.35)';circ(ctx,x,y,1.2);ctx.fill();
    ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,200,120,.35)';circ(ctx,x,y-h,3.2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.fillStyle='#ffe2a0';circ(ctx,x,y-h,1.4);ctx.fill();
    if(Math.random()<.5&&G.parts.length<650)G.parts.push({x,y:y-h,vx:0,vy:0,life:.5,max:.5,sz:1,c:'smoke'});return;}
  if(p.kind==='bomb'){const k=1.6-t*.7;ctx.fillStyle='rgba(0,0,0,.3)';circ(ctx,x+8*(1-t),y+12*(1-t),1.6*k);ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.rotate(p.ang||0);ctx.scale(k,k);ctx.fillStyle='#2a2d30';ctx.beginPath();ctx.ellipse(0,0,2.3,1,0,0,TAU);ctx.fill();ctx.fillRect(-3.4,-1.2,1.2,2.4);ctx.restore();return;}
  const len=p.kind==='ap'?10:p.kind==='flak'?4:6;
  ctx.strokeStyle=p.kind==='ap'?'rgba(255,214,120,1)':p.kind==='flak'?'rgba(255,180,100,.95)':'rgba(255,238,170,.95)';ctx.lineWidth=p.kind==='ap'?1.7:.75;
  ctx.beginPath();ctx.moveTo(x-ux*len,y-uy*len);ctx.lineTo(x,y);ctx.stroke();
  if(p.kind==='ap'){ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,200,100,.4)';circ(ctx,x,y,2.4);ctx.fill();ctx.globalCompositeOperation='source-over';}
}
