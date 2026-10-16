
// ================= NATIONS =================
const CS1=['Val','Nor','Ast','Bel','Cor','Dal','Esh','Fal','Gal','Hel','Iber','Kar','Lum','Mor','Ost','Pel','Quel','Rav','Sel','Tor','Ur','Ves','Wyn','Zar','Brin','Cald'];
const CS2=['oria','avia','enia','mark','land','istan','ovia','ethia','ura','ennia','ador','esia','ania','heim'];
const GOV=[['Republic','President'],['Kingdom','King'],['Kingdom','Queen'],['Federation','Chancellor'],['Grand Duchy','Grand Duke'],['Union','Premier'],['Commonwealth','Prime Minister'],['Sultanate','Sultan'],['Free State','Consul'],['Principality','Prince']];
function genCountries(seed){
  const rng=mulberry32(seed^0x9e3779b9),used=new Set(),list=[];
  const nm=()=>{let n;do{n=CS1[rng()*CS1.length|0]+CS2[rng()*CS2.length|0];}while(used.has(n));used.add(n);return n};
  const person=()=>FIRST[rng()*FIRST.length|0]+' '+LS1[rng()*LS1.length|0]+LS2[rng()*LS2.length|0];
  G.nat=[null];for(const t of [1,2]){const g=GOV[rng()*GOV.length|0],n=nm();G.nat.push({name:n,full:g[0]+' of '+n,flag:makeFlag(rng),leader:g[1]+' '+person()});}
  const pers=['merchant','pacifist','militarist','isolationist','merchant','militarist'];
  for(let i=pers.length-1;i>0;i--){const j=rng()*(i+1)|0;[pers[i],pers[j]]=[pers[j],pers[i]];}
  for(let i=0;i<6;i++){
    const g=GOV[rng()*GOV.length|0],n=nm(),persona=pers[i],P=PERSONA[persona];
    const order=RES.slice();for(let k=order.length-1;k>0;k--){const j=rng()*(k+1)|0;[order[k],order[j]]=[order[j],order[k]];}
    const ne=2+(rng()<.4?1:0),exp=order.slice(0,ne),imp=order.slice(ne,ne+2);
    const c={id:i,name:n,full:g[0]+' of '+n,gov:g[0],leader:g[1]+' '+person(),persona,flag:makeFlag(rng),exp,imp,
      m:{},st:{},stMax:{},dm:{},dmMax:{},tr:{1:{},2:{}},tm:{1:{aid:20,vol:60,ally:30},2:{aid:20,vol:60,ally:30}},
      mpA:P.mp,rel:[0,P.base+Math.round(rng()*20-8),P.base+Math.round(rng()*20-8)]};
    for(const r of RES){const e=exp.includes(r),im=imp.includes(r);
      c.m[r]=e?.62+rng()*.12:im?1.42+rng()*.2:.96+rng()*.14;
      c.stMax[r]=c.st[r]=(e?520:110)*(r==='gold'?.15:1);c.dmMax[r]=c.dm[r]=(im?520:110)*(r==='gold'?.15:1);}
    list.push(c);}
  return list;
}

// ================= ECONOMY =================
function newEcon(t){
  const mk={},ph={},net={};for(const r of RES){mk[r]=RI[r].mk;ph[r]=[];net[r]=0;}
  return {t,money:500,res:{...START_RES},mp:400,pol:{tax:1,draft:1,ration:1},hap:62,hapT:62,fac:[],
    sh:{attack:0,loss:0,win:0,war:0,ally:0,trade:0},weary:0,cas:0,civDead:0,fled:0,
    prod:{},cons:{},net,pop:0,cap:0,jobs:0,labor:0,fill:1,unemp:0,mil:0,mpCap:0,recruit:0,tax:0,growth:0,starving:false,
    mk,ph,phT:0,fuelUse:0,noOil:false,state:'stable',collapseT:0,tradeIn:0,tradeOut:0};
}
function econTick(dt){
  for(const t of [1,2])econTeam(t,dt);
  countriesTick(dt);
  if(dt>0){const W=G.W,N=W*G.H;for(let i=0;i<N;i++)if(G.wall[i]&&G.wallHp[i]<BT.wall.hp&&G.time-G.wallHit[i]>6)G.wallHp[i]=Math.min(BT.wall.hp,G.wallHp[i]+45*dt);}
  if(dt>0&&!G.demo)periodicVoices(dt);
  if(dt>0)marketEvents(dt);
}
function econTeam(t,dt){
  const E=G.E[t],eff0=1,cities=G.cities.filter(c=>c.owner===t); // identical economy rules for both nations
  for(const c of cities)c.cap=CITY_CAP[c.type];
  for(const b of G.blds)if(b.type==='house'&&b.prog>=1&&b.owner===t){if(!b.city||b.city.owner!==t)b.city=nearestCity(b.x,b.y,t);if(b.city)b.city.cap+=BT.house.cap;}
  let pop=0,cap=0;for(const c of cities){pop+=c.pop;cap+=c.cap;}
  E.pop=pop;E.cap=cap;
  let jobs=0;for(const b of G.blds)if(b.owner===t&&b.prog>=1&&BT[b.type].work)jobs+=BT[b.type].work;
  const labor=pop*.3;E.jobs=jobs;E.labor=labor;E.fill=jobs?Math.min(1,labor/jobs):1;E.unemp=labor>0?Math.max(0,labor-jobs)/labor:0;
  const st=E.state,hapMod=st==='riot'?.55:st==='protest'?.8:st==='patriotic'?1.1:1,eff=E.fill*hapMod*eff0;
  const prod={},cons={};for(const r of RES){prod[r]=0;cons[r]=0;}
  for(const b of G.blds){if(b.owner!==t)continue;const B=BT[b.type];
    if(b.prog<1){b.prog=Math.min(1,b.prog+dt/B.time);b.eff=0;continue;}
    if(!B.out)continue;
    let k=eff;
    if(B.inp&&dt>0)for(const r in B.inp)k=Math.min(k,E.res[r]/(B.inp[r]*dt));
    k=Math.max(0,k);b.eff=k;
    if(B.inp)for(const r in B.inp){const v=B.inp[r]*k;E.res[r]-=v*dt;cons[r]+=v;}
    for(const r in B.out){const v=B.out[r]*k;E.res[r]+=v*dt;prod[r]+=v;}}
  const ration=POL.ration.m[E.pol.ration],need=pop*.00018*ration;cons.food+=need;
  if(E.res.food>=need*dt){E.res.food-=need*dt;E.starving=false;}else{E.res.food=0;E.starving=dt>0;}
  if(dt>0)cons.oil+=E.fuelUse/dt;E.fuelUse=0;
  E.prod=prod;E.cons=cons;for(const r of RES)E.net[r]=prod[r]-cons[r];
  E.tax=pop*.0004*POL.tax.m[E.pol.tax]*(.55+E.hap/150)*(st==='riot'?.5:st==='protest'?.75:1)*eff0;
  E.money+=E.tax*dt;
  let growth=0;
  for(const c of cities){
    const p0=c.pop;
    if(E.starving)c.pop*=1-.006*dt;
    else if(c.pop<c.cap)c.pop+=.012*c.pop*(1-c.pop/c.cap)*clamp(E.hap/60,.2,1.3)*(ration>1?1.15:ration<1?.8:1)*dt;
    if(c.pop>c.cap)c.pop-=(c.pop-c.cap)*.05*dt;
    c.panic=Math.max(0,c.panic-dt*.06);c.occ=Math.max(0,c.occ-dt);
    if(c.panic>.5&&!G.peace){const fl=c.pop*.01*dt*c.panic;c.pop-=fl;refugees(t,fl,c);}
    growth+=c.pop-p0;}
  E.growth=dt>0?growth/dt:0;
  let inUnits=0;for(const u of G.units)if(u.team===t&&!u.dead&&u.ally==null)inUnits+=UT[u.type].cost.mp;
  for(const c of cities)for(const q of c.queue)inUnits+=UT[q].cost.mp;
  E.mil=inUnits+E.mp;E.mpCap=pop*POL.draft.m[E.pol.draft];E.recruit=0;
  if(E.mil<E.mpCap&&st!=='riot'&&pop>0){const r=Math.min((E.mpCap-E.mil)*.05,pop*.002)*(st==='patriotic'?1.25:1);E.recruit=r;const take=r*dt;
    for(const c of cities)c.pop-=take*c.pop/pop;E.mp+=take;}
  happiness(E,t,dt);
  const k=Math.exp(-dt/25);for(const s in E.sh)E.sh[s]*=k;E.weary*=Math.exp(-dt/90);
  updateState(E,t,dt);
  for(const r of RES)E.mk[r]+=(RI[r].mk-E.mk[r])*.012*dt;
  E.phT-=dt;if(E.phT<=0){E.phT=2;for(const r of RES){const h=E.ph[r];h.push(mPrice(E,r));if(h.length>40)h.shift();}}
  if(E.hap<10&&!G.peace)E.collapseT+=dt;else E.collapseT=Math.max(0,E.collapseT-dt*2);
  if(E.collapseT>45&&!G.over)gameOver(t===1?'lose':'win','collapse');
  G.stats[t].peakPop=Math.max(G.stats[t].peakPop,pop);
  if(E.collapseT>15&&!(G.alertT['col'+t]>G.time)){G.alertT['col'+t]=G.time+15;note(t,'The government is about to collapse! Raise happiness now','bad','warn');}
  E.noOil=false;
}
function happiness(E,t,dt){
  const f=[],add=(n,v)=>{v=Math.round(v);if(v)f.push([n,v]);return v};
  let h=50;
  h+=add(G.peace?'Peacetime':'At war',G.peace?6:-4);
  h+=add('Food supply',E.starving?-30:E.res.food<E.cons.food*25?-6:4);
  h+=add('Rations',POL.ration.h[E.pol.ration]);
  h+=add('Taxes',POL.tax.h[E.pol.tax]);
  h+=add('Conscription',POL.draft.h[E.pol.draft]);
  const occ=E.cap?E.pop/E.cap:1;h+=add('Housing',occ>.97?-8:occ<.8?3:0);
  h+=add('Unemployment',E.unemp>.3?-Math.min(12,(E.unemp-.3)*40):E.unemp<.1&&E.fill>.95?2:0);
  h+=add('War losses',-Math.min(25,E.weary));
  h+=add('Attacks on cities',E.sh.attack);
  h+=add('Lost cities',E.sh.loss);
  h+=add('Victories',E.sh.win);
  h+=add('Declaration of war',E.sh.war);
  h+=add('Foreign allies',Math.min(9,G.countries.filter(c=>c.tr[t].ally).length*3)+E.sh.ally);
  h+=add('Foreign goods',E.sh.trade);
  h+=add('Unrest in occupied cities',-Math.min(10,G.cities.filter(c=>c.owner===t&&c.occ>0).length*3));
  E.hapT=clamp(h,0,100);E.hap+=(E.hapT-E.hap)*Math.min(1,.07*dt);
  f.sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));E.fac=f;
}
const STATE_TXT={stable:'Stable',protest:'Protests',riot:'Riots',patriotic:'Patriotic'};
function updateState(E,t,dt){
  const H=E.hap;let s=E.state;
  if(H<18)s='riot';else if(H<33)s=s==='riot'&&H<22?'riot':'protest';else if(H>72)s='patriotic';
  else if((s==='protest'&&H>37)||(s==='patriotic'&&H<68)||(s==='riot'))s='stable';
  if(s!==E.state){const prev=E.state;E.state=s;
    if(s==='protest'){note(t,'Protests break out across the country','bad','pop');voice(t,'protest',{},true);}
    else if(s==='riot'){note(t,'RIOTS! Production and recruitment collapse','bad','warn','alert');voice(t,'riot',{},true);}
    else if(s==='patriotic'){note(t,'Patriotic fervour! Output and volunteers up','good','pop');voice(t,'content',{},true);}
    else if(prev==='protest'||prev==='riot')note(t,'Calm returns to the streets','good','pop');}
  if(s==='riot'&&dt>0&&Math.random()<.12*dt*2){const own=G.blds.filter(b=>b.owner===t&&b.type!=='house');if(own.length){const b=pick(own);damageBld(b,25,null);puff(b.x,b.y,'rgba(255,140,40,.9)',6);}}
}
function refugees(t,amt,from){
  if(amt<=0)return;const E=G.E[t];let left=amt;
  const dest=G.cities.filter(c=>c.owner===t&&c!==from&&c.panic<.3).sort((a,b)=>(b.cap-b.pop)-(a.cap-a.pop));
  for(const c of dest){if(left<=0)break;const room=Math.max(0,c.cap-c.pop),m=Math.min(room,left);c.pop+=m;left-=m;}
  E.fled+=left;
  if(amt>50&&Math.random()<.25)voice(t,'refugee',{city:from.name});
}

// ================= INTERNAL MARKET =================
const mP=(r,inv)=>RI[r].p*clamp(Math.pow(RI[r].mk/Math.max(1,inv),.8),.3,4.5);
const mPrice=(E,r)=>mP(r,E.mk[r]);
function mQuote(E,r,q,buy){return q*mP(r,buy?E.mk[r]-q/2:E.mk[r]+q/2)*(buy?1.06:.94)}
function mBuy(t,r,q){const E=G.E[t];if(E.mk[r]-q<RI[r].mk*.08)return 'The market has run dry';const c=mQuote(E,r,q,true);if(E.money<c)return 'Not enough money';
  E.money-=c;E.mk[r]-=q;E.res[r]+=q;E.tradeOut+=c;return ''}
function mSell(t,r,q){const E=G.E[t];if(E.res[r]<q)return 'Not enough '+RI[r].n.toLowerCase();const c=mQuote(E,r,q,false);
  E.money+=c;E.mk[r]+=q;E.res[r]-=q;E.tradeIn+=c;G.stats[t].traded+=c;return ''}
let mEvT=35;
function marketEvents(dt){
  if((mEvT-=dt)>0)return;mEvT=rnd(30,55);
  const r=pick(RES),up=Math.random()<.55,t=Math.random()<.5?1:2,E=G.E[t];
  E.mk[r]*=up?.55:1.6;
  {const n=RI[r].n.toLowerCase();
    const msg=up?pick([`Shortage! ${RI[r].n} prices soar`,`Hoarders drive up ${n} prices`,`Strike cuts ${n} supply. Prices up`]):pick([`Glut of ${n}. Prices crash`,`Merchants dump ${n}. Cheap for now`]);
    note(t,msg,up?'bad':'good',r);}
}

// ================= FOREIGN TRADE & DIPLOMACY =================
const embargo=(c,t)=>!!c.tr[3-t].ally;
const cBuyP=(c,r,t)=>RI[r].p*c.m[r]*(1+.7*(1-c.st[r]/c.stMax[r]))*1.08*(c.tr[t].trade?.85:1)*(1.08-c.rel[t]/600);
const cSellP=(c,r,t)=>RI[r].p*c.m[r]*(1-.5*(1-c.dm[r]/c.dmMax[r]))*.92*(c.tr[t].trade?1.15:1)*(.95+c.rel[t]/600);
function relGain(c,t,v){c.rel[t]=Math.min(100,c.rel[t]+v/(c.persona==='merchant'?110:c.persona==='isolationist'?320:200));}
function cTrade(t,c,r,q,buy){
  const E=G.E[t],n=RI[r].n.toLowerCase();
  if(embargo(c,t))return `${c.name} is embargoing you`;
  if(buy){if(c.st[r]<q)return `${c.name} has no ${n} to spare`;const v=cBuyP(c,r,t)*q;if(E.money<v)return 'Not enough money';
    E.money-=v;c.st[r]-=q;E.res[r]+=q;relGain(c,t,v);E.tradeOut+=v;}
  else{if(E.res[r]<q)return 'Not enough '+n;if(c.dm[r]<q)return `${c.name} doesn't want more ${n}`;const v=cSellP(c,r,t)*q;
    E.money+=v;E.res[r]-=q;c.dm[r]-=q;relGain(c,t,v);E.tradeIn+=v;G.stats[t].traded+=v;}
  E.sh.trade=Math.min(5,E.sh.trade+.5);
  if(Math.random()<.2)voice(t,'trade',{country:c.name});
  return '';
}
const hireP=(c,t)=>PERSONA[c.persona].mpP*(1.25-c.rel[t]/200)*(c.tr[t].vol?.6:1);
function hire(t,c,n){const E=G.E[t];
  if(embargo(c,t))return `${c.name} is embargoing you`;
  if(c.mpA<n)return `${c.name} has only ${fmt(c.mpA)} volunteers left`;
  const v=hireP(c,t)*n/100;if(E.money<v)return 'Not enough money';
  E.money-=v;E.mp+=n;c.mpA-=n;relGain(c,t,v*.5);voice(t,'hired',{country:c.name});return ''}
function gift(t,c,kind){const E=G.E[t],k=Math.max(.15,1-c.rel[t]/130);
  if(kind==='gold'){if(E.res.gold<5)return 'Not enough gold';E.res.gold-=5;c.rel[t]=Math.min(100,c.rel[t]+7*k);}
  else{if(E.money<250)return 'Not enough money';E.money-=250;c.rel[t]=Math.min(100,c.rel[t]+4.5*k);}
  return ''}
const treatyReq=(c,k)=>TREATY[k].req+PERSONA[c.persona].adj[k];
function canSign(c,k,t){if(c.tr[t][k])return 'Signed';if(k==='ally'&&c.tr[3-t].ally)return 'Allied with your enemy';
  if(c.rel[t]<treatyReq(c,k))return `Needs relations ${treatyReq(c,k)}`;const m=missing(G.E[t],TREATY[k].cost);return m?'Not enough '+m:''}
function sign(c,k,t){const r=canSign(c,k,t);if(r)return r;pay(G.E[t],TREATY[k].cost);c.tr[t][k]=true;
  if(k==='ally'){c.rel[3-t]-=25;G.E[t].sh.ally=Math.min(10,G.E[t].sh.ally+6);}
  note(t,`${TREATY[k].n} signed with ${c.name}`,'good','handshake','capture');if(k==='ally')voice(t,'ally',{country:c.name},true);
  note(3-t,`${c.name} signs a ${TREATY[k].n} with ${G.nat[t].name}`,'bad','handshake');
  G.selDirty=true;return ''}
function countriesTick(dt){
  if(dt<=0)return;
  for(const c of G.countries){const P=PERSONA[c.persona];
    for(const r of RES){c.st[r]+=(c.stMax[r]-c.st[r])*.015*dt;c.dm[r]+=(c.dmMax[r]-c.dm[r])*.015*dt;}
    c.mpA=Math.min(P.mp,c.mpA+P.mp*.006*dt);
    for(const t of [1,2]){const tr=c.tr[t],nT=TKEYS.filter(k=>tr[k]).length;
      c.rel[t]+=((P.base+nT*6)-c.rel[t])*.0025*dt;
      if(!G.peace&&c.persona==='militarist')c.rel[t]+=(G.terrPct[t]>G.terrPct[3-t]?.05:-.03)*dt;
      if(c.persona==='pacifist'&&G.E[t].pol.draft===2)c.rel[t]-=.03*dt;
      if(c.tr[3-t].ally)c.rel[t]-=.02*dt;
      c.rel[t]=clamp(c.rel[t],-100,100);
      for(const k of TKEYS)if(tr[k]&&c.rel[t]<treatyReq(c,k)-25){tr[k]=false;note(t,`${c.name} cancels the ${TREATY[k].n}!`,'bad','handshake');}
      const tm=c.tm[t],E=G.E[t];
      if(tr.aid&&(tm.aid-=dt)<=0){tm.aid=20;const got=[];for(const r of c.exp.slice(0,2)){const q=r==='gold'?4:25;E.res[r]+=q;got.push(`+${q} ${RI[r].n.toLowerCase()}`);}
        note(t,`Lend-Lease from ${c.name}: ${got.join(', ')}`,'good',c.exp[0]);}
      if(tr.vol&&(tm.vol-=dt)<=0){tm.vol=YEAR;E.mp+=300;note(t,`300 volunteers arrive from ${c.name}`,'good','mp');}
      if(tr.ally&&!G.peace&&(tm.ally-=dt)<=0){tm.ally=40;allyForce(c,t);}}}
}
function allyForce(c,t){const cap=capitalOf(t);if(!cap||G.units.filter(u=>u.team===t).length>=UNIT_CAP+10)return;
  const list=['inf','inf','tank'];if(c.persona==='militarist')list.push('art','inf');
  const us=list.map(k=>spawnUnit(k,t,cap.x+rnd(-20,20),cap.y+rnd(-20,20),null,c.id));
  note(t,`${c.name} sends ${us.length} units to help!`,'good','handshake');voice(t,'ally',{country:c.name,city:cap.name});
  note(3-t,`${c.name} troops join the enemy`,'bad','handshake');
}

// ================= CITIZEN VOICES =================
const VCOOL={attack:10,bombed:12,refugee:20,trade:30,win:4,lost:4,hired:20,nofuel:30,noguns:40,occupied:25};
const LOUD=new Set(['attack','bombed','lost','win','war','ally','riot','protest']);
function voice(t,cat,ctx={},force){
  if(!t||!G||G.demo)return;if(!G.mp&&t!==1)return;const now=G.time,key=t+cat;
  if(!force&&G.lastVoice[key]>now)return;G.lastVoice[key]=now+(VCOOL[cat]||14);
  const q=pick(QUOTES[cat]||[]);if(!q)return;
  const mine=G.cities.filter(c=>c.owner===t),home=(ctx.city&&!['win','lost'].includes(cat))?ctx.city:(pick(mine)||{name:'the capital'}).name;
  const p={id:G.nextId++,name:pick(FIRST)+' '+pick(LS1)+pick(LS2),age:18+(Math.random()*64|0),job:pick(JOBS),city:home,mood:q[0],
    skin:pick(SKIN),hairC:pick(HAIRC),shirt:pick(SHIRT),hs:Math.random()*5|0,t:now,cat};
  p.text=q[1].replace('{city}',ctx.city||home).replace('{enemy}',G.nat[3-t].name).replace('{country}',ctx.country||'abroad').replace('{bld}',ctx.bld||'factory');
  if(G.emit){G.emit(t,['v',p,LOUD.has(cat)?1:0]);return;}
  addVoice(p,LOUD.has(cat));
}
function addVoice(p,loud){G.voices.unshift(p);if(G.voices.length>40)G.voices.pop();G.peopleDirty=true;if(loud)voiceToast(p);}
function periodicVoices(dt){for(const t of (G.mp?[1,2]:[1])){if((G.pvT[t]-=dt)<=0){G.pvT[t]=rnd(12,18);nationVoice(t);}}}
function nationVoice(t){const E=G.E[t];
  let cat=null;
  if(E.starving)cat='hunger';else if(E.state==='riot')cat='riot';else if(E.state==='protest')cat='protest';
  else if(E.pop>E.cap*.97)cat='housing';else if(E.unemp>.4)cat='jobs';else if(E.weary>8)cat='weary';
  else if(E.pol.tax===2&&Math.random()<.6)cat='tax';else if(E.pol.draft===2&&Math.random()<.6)cat='draft';
  else if(G.peace)cat=Math.random()<.6?'prep':'content';else cat=E.hap>60?'content':pick(['weary','draft','content']);
  voice(t,cat);
}

// ================= CIVILIANS ON THE MAP =================
function civTick(dt){
  if((G.civT-=dt)<=0){G.civT=.8;
    for(const c of G.cities){if(!c.owner)continue;c.civN=c.civN||0;const want=Math.min(10,Math.round(c.pop/1600));
      if(c.civN<want&&G.civs.length<180){const a=Math.random()*TAU,r=rnd(6,26);
        G.civs.push({c,owner:c.owner,x:c.x+Math.cos(a)*r,y:c.y+Math.sin(a)*r,tx:c.x,ty:c.y,sp:rnd(5,8),fl:0,life:0,shade:Math.random()});c.civN++;}}}
  for(const v of G.civs){const c=v.c;v.life+=dt;
    if(c.owner!==v.owner){v.gone=v.gone||G.time+12;const h=nearestCity(v.x,v.y,v.owner);if(h){v.tx=h.x;v.ty=h.y;}v.fl=1;}
    else if(c.panic>.35){if(!v.fl||dist2(v.x,v.y,v.tx,v.ty)<9){const a=Math.atan2(v.y-c.y,v.x-c.x)+rnd(-.6,.6),r=rnd(40,75);v.tx=c.x+Math.cos(a)*r;v.ty=c.y+Math.sin(a)*r;}v.fl=1;}
    else{v.fl=0;if(dist2(v.x,v.y,v.tx,v.ty)<4){
      const near=[];for(const b of G.blds)if(b.owner===c.owner&&dist2(b.x,b.y,c.x,c.y)<4900)near.push(b);
      const b=near.length&&Math.random()<.65?pick(near):null;v.tx=b?b.x+rnd(-5,5):c.x+rnd(-24,24);v.ty=b?b.y+rnd(-5,5):c.y+rnd(-24,24);}}
    const dx=v.tx-v.x,dy=v.ty-v.y,L=Math.hypot(dx,dy);if(L>.5){const s=Math.min(L,(v.fl?24:v.sp)*dt);v.x+=dx/L*s;v.y+=dy/L*s;}
    if(v.gone&&(G.time>v.gone||L<3)){v.dead=true;c.civN--;}}
  if(G.civs.some(v=>v.dead))G.civs=G.civs.filter(v=>!v.dead);
}

// ================= WAR =================
function declareWar(){
  G.peace=false;G.peaceEnd=G.time;
  for(const t of [1,2])G.E[t].sh.war=-8;
  for(const u of G.units)if(u.state==='move'&&!UT[u.type].air)requestPath(u,u.goalX,u.goalY);
  if(G.demo||G.mp||typeof document==='undefined')return;
  const b=$('#warBan');b.innerHTML=`<h1>WAR</h1><p>${G.nat[2].name.toUpperCase()} MARCHES</p>`;b.classList.remove('hide');setTimeout(()=>b.classList.add('hide'),3300);
  sfx('siren');vib([120,60,120]);toast(`War with ${G.nat[2].name} has begun!`,'bad','warn');voice(1,'war',{},true);
}
let prepWarned=0;
function prepTick(){
  if(!G.peace||G.demo)return;const left=G.peaceEnd-G.time;
  if(left<=YEAR&&prepWarned<1){prepWarned=1;toast('One year until war. Finish your defences!','bad','warn');}
  if(left<=15&&prepWarned<2){prepWarned=2;toast('War in 3 months. Troops to the border!','bad','warn');sfx('alert');}
  if(left<=0)declareWar();
}
