
// ================= WORLD ART (client only) =================
// Neutral nations across the sea, towns, detailed buildings with workers, citizens,
// builders, missiles, nukes, fallout, clouds and trade convoys.
const WM=46,STRAIT=9; // world margin around the theatre of war (cells) and sea gap before neutral land
const ROOF=['#a5523d','#8c4a39','#6f5a4a','#5b6470','#7d6a55','#934c3c','#4f5965'],WALLC=['#e6dcc8','#d8ccb6','#cfc4ae','#e9e3d6'];
const CIVC=['#5f7fa6','#a35d4f','#6b8f5a','#8a7656','#7a6aa8','#b08a3f','#4f8a8a','#9a5f84','#c9c2b0','#55606e'];
function srand(n){return mulberry32((n*2654435761)>>>0)}
function flagImg(f){const svg=flagSVG(f,'').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40" ');const im=new Image();im.src='data:image/svg+xml,'+encodeURIComponent(svg);return im}
function worldSeed(){let h=G.seed|0;if(!h)for(const c of G.cities)for(const ch of c.name)h=(h*31+ch.charCodeAt(0))|0;return h>>>0}
function buildWorld(){
  // The outer world is sampled R times per cell from one continuous land field, so coasts and borders come out
  // as smooth curves (no per-cell blocks). Shading: hillshade relief, sandy shores, shallow-water halo, country tint.
  const W=G.W,H=G.H,TW=W+WM*2,TH=H+WM*2,R=4,PW=TW*R,PH=TH*R,N=PW*PH,rng=mulberry32(worldSeed()^0xabc),n1=makeNoise(rng),n2=makeNoise(rng),n3=makeNoise(rng);
  // neutral capitals on a ring around the theatre, on the far side of the strait
  const cx=TW/2,cy=TH/2,rx=W/2+STRAIT+15,ry=H/2+STRAIT+15,anchors=[];
  for(let i=0;i<G.countries.length;i++){const a=(i+.5)/G.countries.length*TAU+(G.vertical?0:Math.PI/2);anchors.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}
  const own=new Int8Array(N).fill(-1),ownA=new Int8Array(N).fill(-1),V=new Float32Array(N),DP=new Float32Array(N),GAP=new Float32Array(N).fill(99);
  for(let Y=0;Y<PH;Y++)for(let X=0;X<PW;X++){const i=Y*PW+X,x=(X+.5)/R,y=(Y+.5)/R,px=x-WM,py=y-WM;
    const ddx=Math.max(-px,0,px-W),ddy=Math.max(-py,0,py-H),dPlay=Math.hypot(ddx,ddy),e=fbm(n1,x/14,y/14,4);DP[i]=dPlay;
    const dE=Math.min(x,y,TW-x,TH-y);let v=e+.2*clamp((dPlay-STRAIT)/14,0,1)-.56-.6*clamp((STRAIT+1.5-dPlay)/3,0,1)-.5*clamp((9-dE)/9,0,1);
    if(v>-.12){// territory: voronoi around the capitals with a noise-warped boundary; GAP (2nd nearest - nearest) draws the border
      const wx=x+(fbm(n2,x/11,y/11,2)-.5)*26,wy=y+(fbm(n2,x/11+40,y/11+40,2)-.5)*26;let best=0,bd=1e9,bd2=1e9,da=1e9;
      for(let k=0;k<anchors.length;k++){const d=Math.hypot(wx-anchors[k][0],wy-anchors[k][1]);if(d<bd){bd2=bd;bd=d;best=k;}else if(d<bd2)bd2=d;da=Math.min(da,Math.hypot(x-anchors[k][0],y-anchors[k][1]));}
      v+=.4*clamp(1-da/7,0,1)-.02*Math.max(0,bd-30);ownA[i]=best;GAP[i]=bd2-bd;if(v>0)own[i]=best;}
    V[i]=v;}
  const cv2=document.createElement('canvas');cv2.width=PW;cv2.height=PH;const g=cv2.getContext('2d'),img=g.createImageData(PW,PH),D=img.data;
  const sat=([r,g,b])=>Math.max(r,g,b)-Math.min(r,g,b);// tint each nation with its most colourful flag colour (never white)
  const tint=G.countries.map(c=>c.flag.c.map(hexRgb).sort((a,b)=>sat(b)-sat(a))[0]);
  const LOW=[66,86,52],HIGH=[104,96,72],PEAK=[150,146,140],SAND=[196,182,134];
  for(let Y=0;Y<PH;Y++)for(let X=0;X<PW;X++){const i=Y*PW+X,j=i*4,o=ownA[i],v=V[i],cov=o<0?0:clamp(.5+v/.03,0,1);let r=0,gg=0,b=0,sr=0,sg=0,sb=0;
    // cov = how much of this pixel is land; blending land and sea along the shore keeps coastlines smooth at any zoom
    if(cov>0){// land: elevation colour, relief shading, country tint, sandy shore, border line
      const h=clamp(v/.38,0,1),c1=h<.55?LOW:HIGH,c2=h<.55?HIGH:PEAK,f=h<.55?h/.55:(h-.55)/.45;
      r=c1[0]+(c2[0]-c1[0])*f;gg=c1[1]+(c2[1]-c1[1])*f;b=c1[2]+(c2[2]-c1[2])*f;
      const forest=fbm(n3,X/R/5,Y/R/5,2);if(forest>.56&&h<.6){const k=clamp((forest-.56)*6,0,.55);r-=r*k*.45;gg-=gg*k*.2;b-=b*k*.4;}
      const X0=Math.max(0,X-1),Y0=Math.max(0,Y-1),X1=Math.min(PW-1,X+1),Y1=Math.min(PH-1,Y+1),sh=(V[Y0*PW+X0]-V[Y1*PW+X1])*R*3;
      const lit=clamp(1+sh,.62,1.4);r*=lit;gg*=lit;b*=lit;
      const gap=GAP[i],t=tint[o],tk=.2+.22*clamp(1-gap/3.5,0,1);r+=(t[0]-r)*tk;gg+=(t[1]-gg)*tk;b+=(t[2]-b)*tk;
      const sd=clamp(1-v/.022,0,1);r+=(SAND[0]-r)*sd*.8;gg+=(SAND[1]-gg)*sd*.8;b+=(SAND[2]-b)*sd*.8;
      const ln=clamp((.5-gap)/.25,0,1)*.75;r+=(232-r)*ln;gg+=(230-gg)*ln;b+=(220-b)*ln;}
    if(cov<1){// sea: deep blue, lighter shallows near any shore, gentle swell
      const sh=Math.max(clamp(1+Math.min(v,0)/.09,0,1),clamp(1-DP[i]/4,0,1)*.8),w=fbm(n2,X/R/5,Y/R/5,2);
      sr=10+16*sh+w*6;sg=24+46*sh+w*8;sb=42+50*sh+w*10;if(sh>.92){sr+=40*(sh-.92)/.08;sg+=50*(sh-.92)/.08;sb+=50*(sh-.92)/.08;}}
    D[j]=r*cov+sr*(1-cov);D[j+1]=gg*cov+sg*(1-cov);D[j+2]=b*cov+sb*(1-cov);D[j+3]=255;}
  g.putImageData(img,0,0);
  const at=(wx,wy)=>{const X=clamp(Math.floor((wx/CELL+WM)*R),0,PW-1),Y=clamp(Math.floor((wy/CELL+WM)*R),0,PH-1);return own[Y*PW+X]};
  G.wcan=cv2;G.wanchors=anchors.map(([x,y],k)=>({c:G.countries[k],x:(x-WM)*CELL,y:(y-WM)*CELL,img:flagImg(G.countries[k].flag),
    towns:Array.from({length:5},()=>{const a=rng()*TAU,r=60+rng()*130;return [(x-WM)*CELL+Math.cos(a)*r,(y-WM)*CELL+Math.sin(a)*r];}).filter(([tx,ty])=>at(tx,ty)===k)}));
  G.clouds=Array.from({length:7},(_,i)=>({x:rng()*W*CELL,y:rng()*H*CELL,r:90+rng()*120,sp:4+rng()*5,seed:i}));
  G.convoys=[];G.nfx=[];
}
const hexRgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
function drawWorld(z,inV){
  if(!G.wcan)return;const W=G.W,H=G.H;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(G.wcan,-WM*CELL,-WM*CELL,(W+WM*2)*CELL,(H+WM*2)*CELL);
  // a soft coast around the theatre of war
  ctx.strokeStyle='rgba(170,210,230,.22)';ctx.lineWidth=10;ctx.strokeRect(-5,-5,W*CELL+10,H*CELL+10);
  ctx.strokeStyle='rgba(10,20,30,.55)';ctx.lineWidth=3;ctx.strokeRect(-1.5,-1.5,W*CELL+3,H*CELL+3);
  for(const a of G.wanchors){if(!inV(a.x,a.y,260))continue;const k=clamp(1/z,.9,3.2);
    ctx.fillStyle='rgba(230,236,240,.75)';for(const [tx,ty] of a.towns){circ(ctx,tx,ty,2.6*k);ctx.fill();}
    ctx.fillStyle='#0b1118';circ(ctx,a.x,a.y,6.5*k);ctx.fill();ctx.strokeStyle='#e8eef5';ctx.lineWidth=1.6*k;ctx.stroke();
    if(a.img.complete)ctx.drawImage(a.img,a.x-9*k,a.y-25*k,18*k,12*k);
    const r=a.c.rel[1],tr=TKEYS.filter(t=>a.c.tr[1][t]).length,en=a.c.tr[2].ally,sub=en?'ALLIED WITH ENEMY':a.c.tr[1].ally?'YOUR ALLY':`NEUTRAL · RELATIONS ${Math.round(r)}${tr?' · '+tr+' TREATIES':''}`;
    // keep the label readable when the capital sits near the screen edge
    if(z>1.3)continue;ctx.font=`700 ${8.5*k}px system-ui,sans-serif`;const hw=Math.max(ctx.measureText(sub).width,a.c.name.length*7.5*k)/2+4/z,vx=VW/2/z,lx=a.x+clamp(clamp(a.x,CAM.x-vx+hw,CAM.x+vx-hw)-a.x,-hw,hw);
    ctx.font=`800 ${11*k}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(a.c.name.toUpperCase(),lx+.8,a.y+18*k+.8);
    ctx.fillStyle='#e8eef5';ctx.fillText(a.c.name.toUpperCase(),lx,a.y+18*k);
    ctx.font=`700 ${8.5*k}px system-ui,sans-serif`;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(sub,lx+.6,a.y+29*k+.6);ctx.fillStyle=en?'#ff8a92':a.c.tr[1].ally?'#7be39a':'#c9d5e2';ctx.fillText(sub,lx,a.y+29*k);}
  for(const cv of G.convoys)drawConvoy(cv);
}
function pickForeign(wx,wy){if(!G.wanchors)return null;const R=Math.max(26,40/CAM.z);for(const a of G.wanchors)if(dist2(wx,wy,a.x,a.y)<R*R)return a.c;return null}
function convoy(c,toEnemy){if(!G.wanchors||G.convoys.length>12)return;const a=G.wanchors.find(a=>a.c===c);if(!a)return;
  const dest=nearestCity(a.x,a.y,toEnemy?2:1);if(!dest)return;G.convoys.push({sx:a.x,sy:a.y,tx:dest.x,ty:dest.y,t:0,dur:Math.hypot(dest.x-a.x,dest.y-a.y)/55});}
function drawConvoy(v){const f=v.t/v.dur,x=v.sx+(v.tx-v.sx)*f,y=v.sy+(v.ty-v.sy)*f,a=Math.atan2(v.ty-v.sy,v.tx-v.sx);
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=Math.min(1,f*8,(1-f)*8);
  ctx.strokeStyle='rgba(220,240,250,.35)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-6,-2.5);ctx.lineTo(-18,-6);ctx.moveTo(-6,2.5);ctx.lineTo(-18,6);ctx.stroke();
  ctx.fillStyle='#2b2f35';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(4,-3);ctx.lineTo(-7,-3);ctx.lineTo(-7,3);ctx.lineTo(4,3);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c98a4b';ctx.fillRect(-5,-2,3,4);ctx.fillStyle='#6b8f5a';ctx.fillRect(-1.5,-2,3,4);ctx.fillStyle='#e8eef5';ctx.fillRect(2.2,-1.5,1.6,3);ctx.restore();ctx.globalAlpha=1;}

// ---------- people ----------
function drawPerson(x,y,a,o,s){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(s,s);
  ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(.4,.6,2.1,1.5,0,0,TAU);ctx.fill();
  const st=Math.sin(o.step||0)*1;
  ctx.fillStyle=o.legs||'#2e2a26';ctx.beginPath();ctx.ellipse(st-.2,-.7,.95,.5,0,0,TAU);ctx.ellipse(-st-.2,.7,.95,.5,0,0,TAU);ctx.fill();
  ctx.fillStyle=o.shirt;ctx.beginPath();ctx.ellipse(-.1,0,1.15,1.9,0,0,TAU);ctx.fill();
  if(o.vest){ctx.fillStyle='#d9e64a';ctx.fillRect(-.9,-1.2,1.4,2.4);}
  const sw=o.tool?Math.sin(o.toolT||0)*.9:-st*.8;
  ctx.strokeStyle=o.skin;ctx.lineWidth=.7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-1.6);ctx.lineTo(1.2+sw*.5,-1.8);ctx.moveTo(0,1.6);ctx.lineTo(1.2-sw*.5,1.8);ctx.stroke();
  if(o.carry){ctx.fillStyle='#b07a43';ctx.fillRect(1.1,-1.6,2.2,3.2);ctx.strokeStyle='#6b4a2b';ctx.lineWidth=.35;ctx.strokeRect(1.1,-1.6,2.2,3.2);}
  if(o.tool){ctx.save();ctx.translate(1.5,-1.9);ctx.rotate(-.6+sw);ctx.strokeStyle='#6b4a2b';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(2.4,0);ctx.stroke();ctx.fillStyle='#8a9096';ctx.fillRect(2.1,-.6,.8,1.2);ctx.restore();}
  ctx.fillStyle=o.hat||o.hair;ctx.beginPath();ctx.arc(.15,0,1.05,0,TAU);ctx.fill();
  if(o.hat){ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(-.15,-.35,.4,0,TAU);ctx.fill();}
  else{ctx.fillStyle=o.skin;ctx.beginPath();ctx.arc(.55,0,.55,0,TAU);ctx.fill();}
  ctx.restore();
}
function civLook(v){if(!v.look){const r=srand((v.id||Math.random()*1e9)|0);v.look={shirt:CIVC[r()*CIVC.length|0],skin:SKIN[r()*SKIN.length|0],hair:HAIRC[r()*HAIRC.length|0],legs:['#2e2a26','#3a3f52','#4a3b2e','#5a5048'][r()*4|0]};}return v.look}
function drawCivs(z,inV){if(z<.5)return;const s=clamp(1.15/z,.9,2);
  for(const v of G.civs){if(!inV(v.x,v.y))continue;const L=civLook(v);drawPerson(v.x,v.y,v.ang||0,{...L,step:v.walk*.9,shirt:v.fl?'#e0b44a':L.shirt},s*.95);}}
function civHit(x,y,r){if(!G.civs)return;const r2=r*r;for(const v of G.civs)if(!v.dead&&dist2(v.x,v.y,x,y)<r2){v.dead=true;if(v.c)v.c.civN--;fallenCiv(v);}
  if(G.civs.some(v=>v.dead))G.civs=G.civs.filter(v=>!v.dead);}
function fallenCiv(v){const g=G.tctx;if(!g)return;const L=civLook(v);g.save();g.translate(v.x,v.y);g.rotate(Math.random()*TAU);g.globalAlpha=.8;
  g.fillStyle='rgba(90,10,10,.35)';g.beginPath();g.ellipse(0,0,3,2,0,0,TAU);g.fill();g.fillStyle=L.shirt;g.beginPath();g.ellipse(0,0,2.1,1,0,0,TAU);g.fill();
  g.fillStyle=L.skin;g.beginPath();g.arc(2.3,.1,.85,0,TAU);g.fill();g.restore();}
function drawBuilder(u,s){const C=ARMY[u.team],mv=u.mv>1;
  drawPerson(u.x,u.y,u.ang,{shirt:u.flash>0?'#fff':C.base,skin:'#e7b892',hair:'#3b2a1f',hat:'#ffb648',vest:1,legs:C.dark,step:mv?u.walk*.6:0,carry:!!u.carry,tool:!!u.busy&&!u.carry,toolT:G.time*12+u.id},s*1.35);}

// ---------- towns ----------
function cityArt(c){if(c.art)return c.art;const r=srand(c.id*977+c.cx*31+c.cy),n=c.type==='capital'?26:16,out=[];
  for(let k=0;k<n*3&&out.length<n;k++){const a=r()*TAU,d=10+r()*(c.type==='capital'?34:26),x=c.x+Math.cos(a)*d,y=c.y+Math.sin(a)*d;
    if(G.terr[cellIdx(x,y)]===WATER||G.wall[cellIdx(x,y)])continue;if(out.some(h=>dist2(h.x,h.y,x,y)<36))continue;
    out.push({x,y,w:4+r()*3.5,h:3.5+r()*3,rot:(r()-.5)*.5+(r()<.5?0:Math.PI/2),roof:ROOF[r()*ROOF.length|0],wall:WALLC[r()*WALLC.length|0],d});}
  out.sort((a,b)=>a.d-b.d);return c.art=out}
function drawHouse(h,dmg){ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.rot);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-h.w/2+1,-h.h/2+1.3,h.w,h.h);
  ctx.fillStyle=dmg?'#4a4540':h.roof;ctx.fillRect(-h.w/2,-h.h/2,h.w,h.h);
  ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(-h.w/2,-h.h/2,h.w,h.h/2);
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(-h.w/2,0);ctx.lineTo(h.w/2,0);ctx.stroke();ctx.restore();}
function drawCityArt(c,z){
  const art=cityArt(c),fill=clamp(c.pop/Math.max(2000,c.cap*.85),.15,1),n=Math.max(3,Math.round(art.length*fill)),dmg=c.panic>.6;
  ctx.fillStyle='rgba(120,110,90,.18)';circ(ctx,c.x,c.y,(c.type==='capital'?30:22)*Math.sqrt(fill)+6);ctx.fill();
  if(c.type==='airbase'){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(-.35);ctx.fillStyle='#4b4f55';ctx.fillRect(-34,-3.5,68,7);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.6;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(-32,0);ctx.lineTo(32,0);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#7d858d';for(const x of [-18,12])ctx.fillRect(x,6,10,6);ctx.restore();}
  for(let i=0;i<n;i++)drawHouse(art[i],dmg&&i%3===0);
  if(c.type==='factory'){for(const [dx,dy] of [[-16,-12],[18,-8]]){ctx.fillStyle='#5a5550';ctx.fillRect(c.x+dx-5,c.y+dy-3,10,7);ctx.fillStyle='#3d3a37';ctx.fillRect(c.x+dx+2,c.y+dy-7,2.4,6);
    if(c.owner&&Math.random()<.04&&G.parts.length<650)G.parts.push({x:c.x+dx+3,y:c.y+dy-8,vx:rnd(-2,2),vy:rnd(-9,-5),life:1.8,max:1.8,sz:2.4,c:'smoke'});}}
  if(c.type==='capital'){ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(c.x-7,c.y-15,15,8);ctx.fillStyle='#e9e3d6';ctx.fillRect(c.x-8,c.y-16,15,8);ctx.fillStyle='#b9a77e';ctx.beginPath();ctx.arc(c.x-.5,c.y-16,4,Math.PI,0);ctx.fill();}
}

// ---------- buildings ----------
const OREC={coal:'#2b2d30',iron:'#8a5a4a',gold:'#e0b030'};
function worker(x,y,a,t,s,o){drawPerson(x,y,a,{shirt:o&&o.shirt||'#5f6f7f',skin:'#e7b892',hair:'#3b2a1f',hat:o&&o.hat||'#e8c040',legs:'#2e2a26',step:t,tool:o&&o.tool,toolT:t*1.6},s);}
function drawBldArt(b,s,mine){
  const B=BT[b.type],done=b.prog>=1,F=13,C=TC[b.owner],t=G.time+b.id,work=done&&b.eff>.12,ps=s*.8;
  ctx.save();ctx.translate(b.x,b.y);ctx.scale(s,s);
  // owner pad
  ctx.fillStyle='rgba(0,0,0,.22)';rrect(ctx,-F/2-1,-F/2-1,F+2,F+2,2.5);ctx.fill();
  ctx.strokeStyle=C.m;ctx.globalAlpha=.85;ctx.lineWidth=.9;rrect(ctx,-F/2-1,-F/2-1,F+2,F+2,2.5);ctx.stroke();ctx.globalAlpha=1;
  if(!done){drawSite(b,F);ctx.restore();return;}
  switch(b.type){
    case 'house':for(const [x,y,r] of [[-3,-3,.1],[3,-2.5,-.2],[-1.5,3.4,.25],[4,3.5,0]])drawHouse({x,y,w:4.6,h:3.6,rot:r,roof:ROOF[(b.id+x*3)&3|0]||ROOF[0]});break;
    case 'farm':{ctx.fillStyle='#6e7a3a';ctx.fillRect(-F/2,-F/2,F,F);ctx.strokeStyle='#c9b75a';ctx.lineWidth=.9;ctx.beginPath();for(let y=-F/2+1.2;y<F/2;y+=2){ctx.moveTo(-F/2+.6,y);ctx.lineTo(F/2-4.5,y);}ctx.stroke();
      ctx.fillStyle='#8c3b2f';ctx.fillRect(F/2-4,-F/2+.5,3.5,4.5);ctx.fillStyle='#5a2a22';ctx.fillRect(F/2-4,-F/2+.5,3.5,1.2);
      if(work){const k=(t*.25)%2,y=-F/2+1.2+Math.floor(k*3)*2,x=-F/2+1+((t*3)%1)*(F-6);worker(x,y,0,t*4,ps*.75,{hat:'#d8c48a',shirt:'#6b5a3a'});}break;}
    case 'lumber':{for(let i=0;i<3;i++){ctx.fillStyle='#8a5a32';ctx.fillRect(-5,-4.5+i*2.2,7,1.9);ctx.fillStyle='#d8b07a';circ(ctx,2,-3.6+i*2.2,.9);ctx.fill();}
      ctx.fillStyle='#5f4630';ctx.fillRect(1.5,1.5,5,4.5);ctx.fillStyle='#3d2e20';ctx.fillRect(1.5,1.5,5,1.2);
      if(work){worker(-4,3.5,-.4,t*2,ps*.8,{tool:1,hat:'#c94',shirt:'#7a3b2e'});if(Math.random()<.08)puff(b.x-3*s,b.y+3*s,'rgba(216,176,122,.9)',2);}break;}
    case 'coal':case 'iron':case 'gold':{ctx.fillStyle='#6a5f52';ctx.beginPath();ctx.ellipse(0,1,F/2,F/2-1.5,0,0,TAU);ctx.fill();
      ctx.fillStyle='#16130f';ctx.beginPath();ctx.arc(-2,1.5,2.6,Math.PI,0);ctx.fillRect(-4.6,1.5,5.2,1.6);ctx.fill();
      ctx.strokeStyle='#7a5a3a';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-4.8,-3.5);ctx.lineTo(-2,-6);ctx.lineTo(.8,-3.5);ctx.moveTo(-3.4,-4.8);ctx.lineTo(-.6,-4.8);ctx.stroke();
      ctx.strokeStyle='#5c534a';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(-1,3.6);ctx.lineTo(5.5,3.6);ctx.moveTo(-1,4.6);ctx.lineTo(5.5,4.6);ctx.stroke();
      ctx.fillStyle=OREC[b.type];ctx.beginPath();ctx.ellipse(4.2,-2.2,2.6,1.9,0,0,TAU);ctx.fill();
      const cx=work?.5+(Math.sin(t*.9)*.5+.5)*4:2;ctx.fillStyle='#3d3833';ctx.fillRect(cx-1.2,3.1,2.4,1.9);ctx.fillStyle=OREC[b.type];ctx.fillRect(cx-1,3.1,2,.8);
      if(work){worker(-2+Math.sin(t*.7)*1.5,4.5,Math.PI/2,t*3,ps*.75,{hat:'#ffd23f',shirt:'#4a4f57'});worker(3,-.5,Math.PI,0,ps*.75,{hat:'#ffd23f',shirt:'#5a4a3a',tool:1});
        ctx.fillStyle='rgba(255,240,170,.85)';circ(ctx,-2,1.2,.5+.3*Math.sin(t*6));ctx.fill();}break;}
    case 'oil':{ctx.fillStyle='#3a3530';ctx.fillRect(-F/2+1,-F/2+1,F-2,F-2);ctx.fillStyle='#8a8f96';ctx.beginPath();ctx.arc(3.5,3.5,2.8,0,TAU);ctx.fill();ctx.strokeStyle='#5a5f66';ctx.lineWidth=.4;ctx.stroke();
      const nod=work?Math.sin(t*2.4)*.45:0;ctx.fillStyle='#2b2d30';ctx.fillRect(-2.6,-1.2,1.4,4);ctx.save();ctx.translate(-1.9,-1.2);ctx.rotate(nod);ctx.fillStyle='#e0a030';ctx.fillRect(-5,-.8,9,1.6);ctx.fillStyle='#2b2d30';ctx.beginPath();ctx.arc(-5,0,1.3,0,TAU);ctx.fill();ctx.restore();break;}
    case 'steel':{ctx.fillStyle='#4a4d52';ctx.fillRect(-F/2+.5,-2,F-1,7);ctx.fillStyle='#35373b';ctx.fillRect(-F/2+.5,-2,F-1,1.4);
      for(const x of [-3.5,2]){ctx.fillStyle='#2f3135';ctx.fillRect(x,-F/2,2.2,6);}
      const g=work?.6+.4*Math.sin(t*5):.15;ctx.fillStyle=`rgba(255,${120+60*g|0},40,${g})`;ctx.fillRect(-4,1.5,8,1.6);break;}
    case 'arms':case 'goods':{const roof=b.type==='arms'?'#5a6150':'#6a5a7a';ctx.fillStyle='#9a958a';ctx.fillRect(-F/2+.5,-3.5,F-1,8);ctx.fillStyle=roof;
      for(let x=-F/2+.5;x<F/2-1;x+=3){ctx.beginPath();ctx.moveTo(x,-3.5);ctx.lineTo(x+3,-3.5);ctx.lineTo(x+3,-1);ctx.closePath();ctx.fill();}
      ctx.fillStyle=b.type==='arms'?'#5b6b3a':'#c98a4b';for(let i=0;i<(work?3:1);i++)ctx.fillRect(-5+i*2.6,5,2.2,1.6);
      if(b.type==='goods'&&work){const x=-F/2+((t*2)%F);ctx.fillStyle='#3c5a80';ctx.fillRect(x,-F/2+.3,3.4,2);ctx.fillStyle='#e8eef5';ctx.fillRect(x+2.4,-F/2+.5,.8,1.6);}break;}
    case 'shop':{ctx.fillStyle='#e9e2d0';ctx.fillRect(-F/2+.5,-F/2+.5,F-1,F-4);for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#e9e2d0':'#c4483e';ctx.fillRect(-F/2+.5+i*(F-1)/5,F/2-4,(F-1)/5,2);}
      if(work)for(let i=0;i<3;i++){const a=t*.8+i*2.1;worker(Math.cos(a)*4,F/2-.8+Math.sin(a*1.3)*.6,a,t*3+i,ps*.7,{hat:HAIRC[i+1],shirt:CIVC[(b.id+i)%CIVC.length]});}break;}
    case 'bank':{ctx.fillStyle='#d9cfb8';ctx.fillRect(-F/2+.5,-F/2+2.5,F-1,F-3);ctx.fillStyle='#bfb39a';ctx.beginPath();ctx.moveTo(-F/2,-F/2+3);ctx.lineTo(0,-F/2);ctx.lineTo(F/2,-F/2+3);ctx.fill();
      ctx.fillStyle='#efe7d4';for(let x=-4.5;x<5;x+=3)ctx.fillRect(x,-1.5,1.4,6);ctx.fillStyle='#d39b00';circ(ctx,0,-F/2+1.8,.9);ctx.fill();break;}
    case 'silo':{ctx.fillStyle='#7d858d';circ(ctx,0,0,F/2-.5);ctx.fill();ctx.strokeStyle='#5a6168';ctx.lineWidth=.6;ctx.stroke();
      const armed=b.ars&&(b.ars.missile||b.ars.nuke);ctx.fillStyle='#4a5056';ctx.save();ctx.rotate(armed?-.5:0);ctx.fillRect(-3.5,-3.5,7,7);ctx.restore();
      if(armed){ctx.fillStyle=b.ars.nuke?'#ffd23f':'#e8eef5';circ(ctx,0,0,1.8);ctx.fill();ctx.fillStyle='#ff4f5e';circ(ctx,0,0,.7);ctx.fill();}
      if(b.aq&&b.aq.length){ctx.strokeStyle='#ffb648';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,F/2+1.6,-Math.PI/2,-Math.PI/2+TAU*b.ap/STRIKE[b.aq[0]].time);ctx.stroke();}break;}
  }
  ctx.restore();
  if(b.hp<b.maxHp){const f=b.hp/b.maxHp,w=F*s;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(b.x-w/2,b.y+F*s*.62,w,1.8*s);ctx.fillStyle=hpCol(f);ctx.fillRect(b.x-w/2,b.y+F*s*.62,w*f,1.8*s);}
  if(mine&&B.out&&b.eff<.4){ctx.fillStyle='rgba(0,0,0,.7)';circ(ctx,b.x+F*s*.5,b.y-F*s*.5,2.6*s);ctx.fill();ctx.fillStyle='#ffb648';ctx.font=`900 ${4*s}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',b.x+F*s*.5,b.y-F*s*.48);ctx.textBaseline='alphabetic';}
  if(work&&(b.type==='steel'||b.type==='arms'||b.type==='goods')&&(b.smokeT-=.016)<0){b.smokeT=.3;if(G.parts.length<650)G.parts.push({x:b.x-1*s,y:b.y-F*s*.55,vx:rnd(-3,3),vy:rnd(-12,-6),life:1.6,max:1.6,sz:2.4,c:'smoke'});}
}
function drawSite(b,F){
  ctx.setLineDash([1.6,1.2]);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.6;ctx.strokeRect(-F/2+.5,-F/2+.5,F-1,F-1);ctx.setLineDash([]);
  ctx.fillStyle='rgba(120,100,70,.55)';ctx.fillRect(-F/2+1,-F/2+1,(F-2),(F-2)*b.prog);
  ctx.strokeStyle='#8a6a42';ctx.lineWidth=.55;ctx.beginPath();const h=(F-2)*b.prog;
  for(let x=-F/2+1;x<=F/2-1;x+=3){ctx.moveTo(x,F/2-1);ctx.lineTo(x,F/2-1-h);}for(let y=F/2-1;y>=F/2-1-h;y-=2.5){ctx.moveTo(-F/2+1,y);ctx.lineTo(F/2-1,y);}ctx.stroke();
  const crates=Math.round(b.mat*4);for(let i=0;i<crates;i++){ctx.fillStyle='#b07a43';ctx.fillRect(-F/2+1.2+i*2.4,F/2-2.4,2,2);}
  // two-tone progress bar: amber = materials on site, green = built
  const w=F+4,y=-F/2-4.2;ctx.fillStyle='rgba(0,0,0,.7)';rrect(ctx,-w/2,y,w,2.6,1.3);ctx.fill();
  ctx.fillStyle='#ffb648';ctx.fillRect(-w/2+.4,y+.4,(w-.8)*b.mat,1.8);ctx.fillStyle='#5be37d';ctx.fillRect(-w/2+.4,y+.4,(w-.8)*b.prog,1.8);
  if(G.time%1<.5&&b.owner===1&&!buildersOf(1).length){ctx.fillStyle='#ff8a92';ctx.font='800 3.4px system-ui';ctx.textAlign='center';ctx.fillText('NO BUILDERS',0,y-1.2);}
}

// ---------- strikes, nukes, fallout, clouds ----------
function strikeFx(){} function interceptFx(){}
function nukeFx(x,y,r){G.nfx.push({x,y,r,t:0});if(!G.demo&&onScreen(x,y)){const f=$('#flash');f.style.transition='none';f.style.opacity='.95';requestAnimationFrame(()=>{f.style.transition='opacity 1.6s ease-out';f.style.opacity='0';});}scorch(x,y,r*.95,.75);for(let i=0;i<14;i++){const a=Math.random()*TAU,d=Math.random()*r*.7;burn(x+Math.cos(a)*d,y+Math.sin(a)*d,30);}
  for(let i=0;i<40;i++)crater(x+rnd(-r*.5,r*.5),y+rnd(-r*.5,r*.5));if(!G.demo)vib([200,80,300]);}
function drawStrikes(z){
  for(const s of G.strikes){const [x,y,f]=strikePos(s,s.t),L=Math.hypot(s.tx-s.sx,s.ty-s.sy),h=Math.sin(Math.PI*f)*Math.min(L*.4,260),nk=s.kind==='nuke';
    const R=STRIKE[s.kind].r;ctx.strokeStyle=`rgba(255,${nk?60:90},70,${.45+.4*Math.sin(G.time*10)})`;ctx.lineWidth=(nk?3:1.6)/Math.max(z,.4);ctx.setLineDash([6/z,5/z]);circ(ctx,s.tx,s.ty,R);ctx.stroke();ctx.setLineDash([]);
    if(nk){ctx.fillStyle='rgba(255,60,60,.08)';circ(ctx,s.tx,s.ty,R);ctx.fill();}
    const [x2,y2,f2]=strikePos(s,s.t+.05),h2=Math.sin(Math.PI*f2)*Math.min(L*.4,260),a=Math.atan2((y2-h2)-(y-h),x2-x),sc=(nk?1.6:1.1)*(1+h/300);
    ctx.fillStyle='rgba(0,0,0,.25)';circ(ctx,x,y,2*sc);ctx.fill();
    if(G.parts.length<700)G.parts.push({x:x+rnd(-1,1),y:y-h+rnd(-1,1),vx:rnd(-2,2),vy:rnd(-2,2),life:nk?2.2:1.4,max:2.2,sz:nk?3:2,c:'smoke'});
    ctx.save();ctx.translate(x,y-h);ctx.rotate(a);ctx.scale(sc,sc);ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,170,60,.9)';ctx.beginPath();ctx.moveTo(-4,-1.2);ctx.lineTo(-9-Math.random()*3,0);ctx.lineTo(-4,1.2);ctx.fill();ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=nk?'#d8dde2':'#c9d0d6';rrect(ctx,-4.5,-1.3,9,2.6,1.2);ctx.fill();ctx.fillStyle=nk?'#ffd23f':'#ff4f5e';ctx.beginPath();ctx.moveTo(4.5,-1.3);ctx.lineTo(7,0);ctx.lineTo(4.5,1.3);ctx.fill();
    ctx.fillStyle='#5a6168';ctx.beginPath();ctx.moveTo(-4.5,-1.3);ctx.lineTo(-6,-3);ctx.lineTo(-3,-1.3);ctx.moveTo(-4.5,1.3);ctx.lineTo(-6,3);ctx.lineTo(-3,1.3);ctx.fill();ctx.restore();}
}
function drawNukes(){for(const n of G.nfx){const t=n.t,R=n.r;
  if(t<1.6){const k=t/1.6;ctx.strokeStyle=`rgba(255,240,220,${.8*(1-k)})`;ctx.lineWidth=6*(1-k)+1;circ(ctx,n.x,n.y,R*.2+R*1.25*k);ctx.stroke();}
  if(t<3){const k=Math.min(1,t/.5),fade=1-clamp((t-1)/2,0,1),g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,R*.55*k);
    g.addColorStop(0,`rgba(255,255,230,${fade})`);g.addColorStop(.35,`rgba(255,190,80,${.9*fade})`);g.addColorStop(1,'rgba(255,60,0,0)');ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;circ(ctx,n.x,n.y,R*.55*k);ctx.fill();ctx.globalCompositeOperation='source-over';}
  const rise=Math.min(1,t/5),alpha=clamp(1-(t-10)/6,0,1);if(alpha<=0)continue;const cy=n.y-R*.55*rise;
  ctx.fillStyle=`rgba(70,60,55,${.55*alpha})`;ctx.beginPath();ctx.moveTo(n.x-R*.08,n.y);ctx.lineTo(n.x-R*.05,cy);ctx.lineTo(n.x+R*.05,cy);ctx.lineTo(n.x+R*.08,n.y);ctx.fill();
  for(let i=0;i<9;i++){const a=i/9*TAU+t*.15,rr=R*(.16+.06*Math.sin(i*2.3))*(.6+.4*rise);const g2=ctx.createRadialGradient(n.x+Math.cos(a)*R*.14,cy+Math.sin(a)*R*.07,0,n.x+Math.cos(a)*R*.14,cy+Math.sin(a)*R*.07,rr);
    g2.addColorStop(0,`rgba(${t<4?230:120},${t<4?140:110},${t<4?70:100},${.7*alpha})`);g2.addColorStop(1,'rgba(60,55,50,0)');ctx.fillStyle=g2;circ(ctx,n.x+Math.cos(a)*R*.14,cy+Math.sin(a)*R*.07,rr);ctx.fill();}}}
function drawFallout(z){for(const f of G.fallout){const p=.5+.5*Math.sin(G.time*2);
  const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);g.addColorStop(0,'rgba(190,230,60,.18)');g.addColorStop(1,'rgba(190,230,60,.04)');ctx.fillStyle=g;circ(ctx,f.x,f.y,f.r);ctx.fill();
  ctx.strokeStyle=`rgba(210,240,80,${.35+.25*p})`;ctx.lineWidth=1.5/Math.max(z,.4);ctx.setLineDash([8/z,6/z]);circ(ctx,f.x,f.y,f.r);ctx.stroke();ctx.setLineDash([]);
  drawIco(ctx,'nuke',f.x,f.y,Math.max(16,22/z));}}
function drawClouds(z){if(!G.clouds)return;const W=G.W*CELL;for(const c of G.clouds){c.x+=c.sp*.016;if(c.x-c.r>W+300)c.x=-300-c.r;
  const r=srand(c.seed);for(let i=0;i<5;i++){const ox=(r()-.5)*c.r*1.4,oy=(r()-.5)*c.r*.6,rr=c.r*(.4+r()*.4);
    ctx.fillStyle='rgba(0,0,0,.05)';circ(ctx,c.x+ox+40,c.y+oy+60,rr);ctx.fill();
    const g=ctx.createRadialGradient(c.x+ox,c.y+oy,0,c.x+ox,c.y+oy,rr);g.addColorStop(0,`rgba(255,255,255,${z<.7?.16:.07})`);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;circ(ctx,c.x+ox,c.y+oy,rr);ctx.fill();}}}
function worldFx(dt){if(!G.nfx)return;for(const n of G.nfx)n.t+=dt;G.nfx=G.nfx.filter(n=>n.t<16);
  for(const c of G.convoys)c.t+=dt;G.convoys=G.convoys.filter(c=>c.t<c.dur);
  if(G.mp){for(const s of G.strikes)s.t+=dt;G.strikes=G.strikes.filter(s=>s.t<s.dur+.2);}}
