
// ================= MISSILES, NUKES & FALLOUT =================
// A Missile Silo builds warheads one at a time. Launching sends a missile on a ballistic arc;
// enemy anti-air near its path may shoot it down. Nukes destroy everything in a large radius,
// kill a city's people, leave radioactive fallout and turn the whole world against you.
function siloOf(T){return G.blds.filter(b=>b.owner===T&&b.type==='silo'&&siteDone(b))}
function stock(T,k){let n=0;for(const b of siloOf(T))n+=b.ars?b.ars[k]:0;return n}
function armSilo(T,b,k){const S=STRIKE[k];if(!S||!b||b.owner!==T||b.type!=='silo')return 'Not your silo';if(!siteDone(b))return 'The silo is still under construction';
  if(b.aq.length>=3)return 'Silo queue full';const m=missing(G.E[T],S.cost);if(m)return 'Not enough '+m;
  if(k==='nuke'&&(stock(T,'nuke')+G.blds.filter(o=>o.owner===T&&o.aq&&o.aq.includes('nuke')).length)>=2)return 'You can hold at most 2 nuclear warheads';
  pay(G.E[T],S.cost);b.aq.push(k);return ''}
function siloTick(dt){for(const b of G.blds){if(b.type!=='silo'||!b.aq||!b.aq.length||!siteDone(b))continue;const k=b.aq[0];b.ap+=dt;
  if(b.ap>=STRIKE[k].time){b.ap=0;b.aq.shift();b.ars[k]++;note(b.owner,`${STRIKE[k].n} ready to launch`,'good',STRIKE[k].ico,'blip');}}}
function launchStrike(T,k,x,y){
  const S=STRIKE[k];if(!S)return '';if(G.peace)return 'You cannot strike in peacetime';
  x=clamp(x,0,G.W*CELL);y=clamp(y,0,G.H*CELL);
  const silos=siloOf(T).filter(b=>b.ars[k]>0).sort((a,b)=>dist2(a.x,a.y,x,y)-dist2(b.x,b.y,x,y));
  if(!silos.length)return `No ${S.n.toLowerCase()} ready. Build one at a Missile Silo`;
  const b=silos[0];b.ars[k]--;const D=Math.hypot(x-b.x,y-b.y),s={id:G.nextId++,kind:k,team:T,sx:b.x,sy:b.y,tx:x,ty:y,t:0,dur:D/S.speed+(k==='nuke'?2.2:1.2),tried:new Set()};
  G.strikes.push(s);strikeFx(s);
  if(k==='nuke'){note(T,'Nuclear missile launched','bad','nuke','siren');note(3-T,'NUCLEAR LAUNCH DETECTED! Take cover','bad','nuke','siren');
    for(const c of G.countries)c.rel[T]=clamp(c.rel[T]-30,-100,100);G.E[T].sh.attack=Math.max(-30,G.E[T].sh.attack-10);voice(T,'nukeUse',{},true);}
  else{note(T,'Missile launched','',k,'');note(3-T,'Incoming missile!','bad','missile','alert');}
  return '';
}
function strikePos(s,t){const f=clamp(t/s.dur,0,1),x=s.sx+(s.tx-s.sx)*f,y=s.sy+(s.ty-s.sy)*f;return [x,y,f]}
function strikesTick(dt){
  if(!G.strikes.length)return;
  for(const s of G.strikes){s.t+=dt;const [x,y,f]=strikePos(s,s.t);
    // anti-air gets one chance per battery once the warhead descends into range
    if(f>.6&&f<.97)for(const u of G.units){if(u.dead||u.team===s.team||u.type!=='aa'||s.tried.has(u.id))continue;
      if(dist2(u.x,u.y,x,y)>105*105)continue;s.tried.add(u.id);
      if(Math.random()<(s.kind==='nuke'?.07:.24)){s.done=true;interceptFx(s,x,y);explode(x,y,1.4);note(s.team,'Your missile was shot down','bad','missile');note(u.team,`Anti-air shot down an enemy ${s.kind==='nuke'?'NUCLEAR missile':'missile'}!`,'good','aa');break;}}
    if(!s.done&&s.t>=s.dur){s.done=true;impact(s);}}
  G.strikes=G.strikes.filter(s=>!s.done);
}
function impact(s){const S=STRIKE[s.kind];
  if(s.kind==='missile'){splash({kind:'bomb',tx:s.tx,ty:s.ty,dmg:S.dmg,splash:S.r,ap:1,team:s.team,src:null});
    for(const c of G.cities)if(c.owner&&c.owner!==s.team&&dist2(c.x,c.y,s.tx,s.ty)<80*80)voice(c.owner,'missile',{city:c.name});return;}
  nukeBlast(s);
}
function nukeBlast(s){
  const R=STRIKE.nuke.r,x=s.tx,y=s.ty,R2=R*R;nukeFx(x,y,R);civHit(x,y,R*1.1);
  for(const u of G.units){if(u.dead)continue;const d2=dist2(u.x,u.y,x,y);if(d2<R2*(UT[u.type].air&&!u.landed?.45:1))damage(u,STRIKE.nuke.dmg*(1-.4*Math.sqrt(d2)/R),1,null);}
  for(const b of G.blds.slice())if(dist2(b.x,b.y,x,y)<R2*.85)destroyBld(b,s.team);
  const W=G.W,cr=Math.ceil(R/CELL),cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);
  for(let yy=cy-cr;yy<=cy+cr;yy++)for(let xx=cx-cr;xx<=cx+cr;xx++){if(xx<0||yy<0||xx>=W||yy>=G.H)continue;const i=yy*W+xx;if(G.wall[i]&&dist2((xx+.5)*CELL,(yy+.5)*CELL,x,y)<R2*.8){G.wall[i]=0;G.wallDirty=true;}}
  for(const c of G.cities){const d=Math.sqrt(dist2(c.x,c.y,x,y));if(d>R*1.4)continue;const k=clamp(1.15-d/(R*1.4),0,.85),dead=c.pop*k;
    c.pop-=dead;c.panic=1;if(c.owner){const E=G.E[c.owner];E.civDead+=dead;E.sh.attack=-30;E.sh.loss=Math.max(-30,E.sh.loss-15);voice(c.owner,'nuke',{city:c.name},true);
      note(c.owner,`${c.name} was hit by a nuclear bomb. ${fmt(dead)} people killed`,'bad','nuke','alert');}}
  G.fallout.push({x,y,r:R*.85,until:G.time+120});
  shakeAt(x,y,7);sfx('boom',x,y);
}
function falloutTick(dt){if(!G.fallout.length)return;G.fallout=G.fallout.filter(f=>f.until>G.time);
  for(const f of G.fallout){const r2=f.r*f.r;
    for(const u of G.units)if(!u.dead&&!(UT[u.type].air&&!u.landed)&&dist2(u.x,u.y,f.x,f.y)<r2)damage(u,(UT[u.type].arm?2:5)*dt,1,null);
    for(const c of G.cities)if(dist2(c.x,c.y,f.x,f.y)<r2)c.pop*=1-.004*dt;}}
