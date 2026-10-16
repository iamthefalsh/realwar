
// ================= MAP GEN =================
const SYL=['ar','bel','cor','dun','el','fen','gar','hol','ist','jor','kal','lin','mor','nor','ost','pra','ros','sar','tol','ur','val','wen','yor','zan','vik','bra','dor','mil','tar','ka','re','sol'];
const SUF=['grad','burg','ia','ton','mir','sk','vale','port','ov','heim'];
function genMap(W,H,seed,vertical){
  const rng=mulberry32(seed), N=W*H;
  const nE=makeNoise(rng),nF=makeNoise(rng),nR=makeNoise(rng);
  const e=new Float32Array(N),f=new Float32Array(N),mm=new Float32Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;
    e[i]=fbm(nE,x/16,y/16,4);
    const r=1-Math.abs(fbm(nR,x/12+50,y/12+50,3)-.5)*2;
    mm[i]=r*.6+e[i]*.4; f[i]=fbm(nF,x/8+100,y/8,3);}
  const pct=(a,q)=>{const s=Float32Array.from(a).sort();return s[Math.floor(q*(s.length-1))]};
  const wT=pct(e,.1),mT=pct(mm,.95),hT=pct(mm,.85),fT=pct(f,.7);
  const terr=new Uint8Array(N);
  for(let i=0;i<N;i++)terr[i]=e[i]<wT?WATER:mm[i]>mT?MOUNT:mm[i]>hT?HILL:f[i]>fT?FOREST:PLAIN;
  // point-symmetric map: both nations get exactly the same terrain
  for(let i=0;i<N/2;i++){const j=N-1-i;terr[j]=terr[i];e[j]=e[i];}
  let emin=1,emax=0;for(let i=0;i<N;i++){emin=Math.min(emin,e[i]);emax=Math.max(emax,e[i]);}
  for(let i=0;i<N;i++)e[i]=(e[i]-emin)/(emax-emin+1e-6);
  const clear=(cx,cy,r)=>{for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){if(x<0||y<0||x>=W||y>=H)continue;if((x-cx)**2+(y-cy)**2<=r*r+1)terr[y*W+x]=PLAIN;}};
  const cities=[], names=new Set();
  const name=()=>{let n;do{n=SYL[rng()*SYL.length|0]+SYL[rng()*SYL.length|0];if(rng()<.45)n+=SUF[rng()*SUF.length|0];n=n[0].toUpperCase()+n.slice(1);}while(names.has(n));names.add(n);return n};
  const addCity=(cx,cy,type,owner)=>{clear(cx,cy,1);cities.push({id:cities.length,name:name(),cx,cy,ci:cy*W+cx,x:(cx+.5)*CELL,y:(cy+.5)*CELL,type,owner,queue:[],prog:0,contest:0,threat:0,pop:0,cap:CITY_CAP[type],panic:0,occ:0,seen:[0,1,1]});};
  const inHalf=(x,y)=>vertical?y>H/2+1:x<W/2-1;
  let pcx,pcy;
  if(vertical){pcx=Math.round(W/2+(rng()-.5)*W*.3);pcy=Math.round(H*.91);}else{pcx=Math.round(W*.09);pcy=Math.round(H/2+(rng()-.5)*H*.3);}
  clear(pcx,pcy,3);clear(W-1-pcx,H-1-pcy,3);
  addCity(pcx,pcy,'capital',1);addCity(W-1-pcx,H-1-pcy,'capital',2);
  const K=Math.max(4,Math.round(N/900));
  const types=['factory','airbase'];if(K>=6)types.push('factory');if(K>=9)types.push('airbase');while(types.length<K)types.push('town');
  for(let i=types.length-1;i>0;i--){const j=rng()*(i+1)|0;[types[i],types[j]]=[types[j],types[i]];}
  let placed=0,tries=0;
  while(placed<K&&tries<4000){tries++;
    const x=3+(rng()*(W-6)|0),y=3+(rng()*(H-6)|0);
    if(!(vertical?y>H/2+2:x<W/2-2))continue;
    const t=terr[y*W+x];if(t===WATER||t===MOUNT)continue;
    const mx=W-1-x,my=H-1-y,md=tries<3000?8.5:6;
    if(cities.some(c=>(c.cx-x)**2+(c.cy-y)**2<md*md||(c.cx-mx)**2+(c.cy-my)**2<md*md))continue;
    addCity(x,y,types[placed],0);addCity(mx,my,types[placed],0);placed++;}
  const near=cap=>{let b=null,bd=1e9;for(const c of cities){if(c.owner||c.type==='capital')continue;const d=(c.cx-cap.cx)**2+(c.cy-cap.cy)**2;if(d<bd){bd=d;b=c;}}return b};
  const n1=near(cities[0]);if(n1){n1.owner=1;const m=cities.find(c=>c.cx===W-1-n1.cx&&c.cy===H-1-n1.cy);if(m)m.owner=2;}
  const ccost=[1,1.5,2,12,25];
  for(const c of cities){if(c===cities[0])continue;
    const path=carveAstar(W,H,terr,ccost,cities[0].ci,c.ci);
    for(const i of path)for(const k of [i,N-1-i]){if(terr[k]===MOUNT)terr[k]=HILL;else if(terr[k]===WATER)terr[k]=PLAIN;}}
  // roads: each city links to its two nearest neighbours (drawn on the terrain)
  const roads=[],seen=new Set(),rcost=[1,1.8,2.4,9,6],road=new Uint8Array(N);
  for(const c of cities){const nb=cities.filter(o=>o!==c).sort((a,b)=>((a.cx-c.cx)**2+(a.cy-c.cy)**2)-((b.cx-c.cx)**2+(b.cy-c.cy)**2)).slice(0,2);
    for(const o of nb){const key=Math.min(c.id,o.id)+'-'+Math.max(c.id,o.id);if(seen.has(key))continue;seen.add(key);
      const p=carveAstar(W,H,terr,rcost,c.ci,o.ci);roads.push(p,p.map(i=>N-1-i));
      for(const i of p)for(const k of [i,N-1-i]){road[k]=1;if(terr[k]===MOUNT)terr[k]=HILL;else if(terr[k]===WATER)terr[k]=PLAIN;}}}
  // provinces: every cell belongs to the city that is cheapest to reach over terrain
  const prov=new Int16Array(N).fill(-1),pd=new Float64Array(N).fill(1e9),pcost=[1,1.6,2.2,5,2.5],hp=[];
  const hpush=(d,i)=>{hp.push([d,i]);let k=hp.length-1;while(k>0){const p=(k-1)>>1;if(hp[p][0]<=hp[k][0])break;[hp[p],hp[k]]=[hp[k],hp[p]];k=p;}};
  const hpop=()=>{const t=hp[0],l=hp.pop();if(hp.length){hp[0]=l;let k=0;for(;;){const a=2*k+1,b=a+1;let m=k;if(a<hp.length&&hp[a][0]<hp[m][0])m=a;if(b<hp.length&&hp[b][0]<hp[m][0])m=b;if(m===k)break;[hp[m],hp[k]]=[hp[k],hp[m]];k=m;}}return t};
  for(const c of cities){pd[c.ci]=0;prov[c.ci]=c.id;hpush(0,c.ci);}
  while(hp.length){const [d,i]=hpop();if(d>pd[i])continue;const x=i%W,y=i/W|0;
    for(let k=0;k<4;k++){const nx=x+DX[k],ny=y+DY[k];if(nx<0||ny<0||nx>=W||ny>=H)continue;const n=ny*W+nx,nd=d+pcost[terr[n]];if(nd<pd[n]){pd[n]=nd;prov[n]=prov[i];hpush(nd,n);}}}
  const adj=cities.map(()=>new Set());
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,a=prov[i];if(x<W-1&&prov[i+1]!==a){adj[a].add(prov[i+1]);adj[prov[i+1]].add(a);}if(y<H-1&&prov[i+W]!==a){adj[a].add(prov[i+W]);adj[prov[i+W]].add(a);}}
  // resource deposits, mirrored for fairness
  const deps=[],depAt=new Int8Array(N).fill(-1),K2=Math.max(1,Math.round(N/2600));
  const want=[['coal',1+K2],['iron',1+K2],['oil',K2],['gold',Math.max(1,K2-1)]];
  const okT={coal:t=>t===HILL||t===MOUNT,iron:t=>t===HILL||t===MOUNT,gold:t=>t===MOUNT||t===HILL,oil:t=>t===PLAIN};
  const fixT={coal:HILL,iron:HILL,gold:HILL,oil:PLAIN};
  const cap=cities[0];
  for(const [type,n] of want){let got=0,tr=0;
    while(got<n&&tr<6000){tr++;
      const x=2+(rng()*(W-4)|0),y=2+(rng()*(H-4)|0);if(!inHalf(x,y))continue;
      const i=y*W+x;if(terr[i]===WATER)continue;
      // first coal & iron sit inside the starting territory; first oil just outside it
      if(got===0&&type!=='gold'){const d=Math.hypot(x-cap.cx,y-cap.cy),lo=type==='oil'?7.5:3.5,hi=type==='oil'?11:6.3;if((d<lo||d>hi)&&tr<4500)continue;}
      else if(!okT[type](terr[i])&&tr<4000)continue;
      if(cities.some(c=>Math.abs(c.cx-x)<=2&&Math.abs(c.cy-y)<=2))continue;
      const mx=W-1-x,my=H-1-y;
      if(deps.some(d=>(d.cx-x)**2+(d.cy-y)**2<12||(d.cx-mx)**2+(d.cy-my)**2<12))continue;
      if(cities.some(c=>Math.abs(c.cx-mx)<=2&&Math.abs(c.cy-my)<=2))continue;
      for(const [px,py] of [[x,y],[mx,my]]){const j=py*W+px;if(!okT[type](terr[j]))terr[j]=fixT[type];
        depAt[j]=DEPS.indexOf(type);deps.push({type,cx:px,cy:py,ci:j,x:(px+.5)*CELL,y:(py+.5)*CELL});}
      got++;}}
  return {terr,elev:e,cities,deps,depAt,prov,adj,roads,road};
}
function carveAstar(W,H,terr,cc,s,g){
  const N=W*H,G=new Float32Array(N).fill(1e9),came=new Int32Array(N).fill(-1),done=new Uint8Array(N);
  const gx=g%W,gy=(g/W)|0,h=i=>Math.abs(i%W-gx)+Math.abs(((i/W)|0)-gy);
  const open=[[h(s),s]];G[s]=0;
  while(open.length){let bi=0;for(let k=1;k<open.length;k++)if(open[k][0]<open[bi][0])bi=k;
    const c=open[bi][1];open[bi]=open[open.length-1];open.pop();
    if(done[c])continue;done[c]=1;if(c===g)break;
    const cx=c%W,cy=(c/W)|0;
    for(let k=0;k<4;k++){const nx=cx+DX[k],ny=cy+DY[k];if(nx<0||ny<0||nx>=W||ny>=H)continue;const n=ny*W+nx;if(done[n])continue;
      const ng=G[c]+cc[terr[n]];if(ng<G[n]){G[n]=ng;came[n]=c;open.push([ng+h(n),n]);}}}
  const out=[];for(let c=g;c!==-1;c=came[c])out.push(c);return out;
}

// ================= PATHFINDING =================
let AS=null;
function initAstar(N){AS={g:new Float32Array(N),came:new Int32Array(N),gen:new Uint32Array(N),cl:new Uint32Array(N),cur:0,hi:new Int32Array(N*8+16),hf:new Float32Array(N*8+16)};}
// can a unit of this class & team stand at (x,y)? enemy walls and (in peace) enemy land block ground units
function cellOk(cls,i,team){if(!SPEED[cls][G.terr[i]])return false;if(team){const w=G.wall[i];if(w&&w!==team)return false;if(G.peace){const o=G.own[i];if(o&&o!==team)return false;}}return true}
function passable(cls,x,y,team){if(cls==='air')return true;const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);if(cx<0||cy<0||cx>=G.W||cy>=G.H)return false;return cellOk(cls,cy*G.W+cx,team)}
function nearestPassableCell(cls,cx,cy,team){
  for(let r=0;r<12;r++)for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
    if(Math.max(Math.abs(x-cx),Math.abs(y-cy))!==r||x<0||y<0||x>=G.W||y>=G.H)continue;
    if(cellOk(cls,y*G.W+x,team))return y*G.W+x;}
  return -1;
}
function snapPassable(cls,x,y,team){
  x=clamp(x,2,G.W*CELL-2);y=clamp(y,2,G.H*CELL-2);
  if(passable(cls,x,y,team))return [x,y];
  const i=nearestPassableCell(cls,Math.floor(x/CELL),Math.floor(y/CELL),team);
  return i<0?[x,y]:[(i%G.W+.5)*CELL,((i/G.W|0)+.5)*CELL];
}
function astar(cls,s,goal,team){
  const W=G.W,H=G.H,sp=SPEED[cls],T=G.terr,A=AS,gen=++A.cur,wall=G.wall,own=G.own,peace=G.peace;
  const gx=goal%W,gy=(goal/W)|0;
  const h=i=>{const dx=Math.abs(i%W-gx),dy=Math.abs(((i/W)|0)-gy);return dx+dy-.5858*Math.min(dx,dy)};
  const g=A.g,came=A.came,gn=A.gen,cl=A.cl,hi=A.hi,hf=A.hf;let hn=0;
  const push=(i,f)=>{let k=hn++;hi[k]=i;hf[k]=f;while(k>0){const p=(k-1)>>1;if(hf[p]<=hf[k])break;let t=hi[p];hi[p]=hi[k];hi[k]=t;t=hf[p];hf[p]=hf[k];hf[k]=t;k=p;}};
  const pop=()=>{const top=hi[0];hn--;if(hn>0){hi[0]=hi[hn];hf[0]=hf[hn];let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<hn&&hf[l]<hf[m])m=l;if(r<hn&&hf[r]<hf[m])m=r;if(m===k)break;let t=hi[m];hi[m]=hi[k];hi[k]=t;t=hf[m];hf[m]=hf[k];hf[k]=t;k=m;}}return top};
  gn[s]=gen;g[s]=0;came[s]=-1;push(s,h(s));
  let best=s,bestH=h(s),it=0;
  while(hn>0){const c=pop();if(cl[c]===gen)continue;cl[c]=gen;
    if(c===goal){best=c;break;}
    const hc=h(c);if(hc<bestH){bestH=hc;best=c;}
    if(++it>W*H)break;
    const cx=c%W,cy=(c/W)|0;
    for(let k=0;k<8;k++){const nx=cx+DX[k],ny=cy+DY[k];if(nx<0||ny<0||nx>=W||ny>=H)continue;
      const n=ny*W+nx,sv=sp[T[n]];if(!sv||cl[n]===gen)continue;
      let cost=(k>=4?1.4142:1)/(sv*(G.road[n]?1.35:1));
      if(team){const w=wall[n];if(w&&w!==team){if(peace||k>=4)continue;cost*=9;}if(peace){const o=own[n];if(o&&o!==team)continue;}}
      if(k>=4){const a=cy*W+nx,b=ny*W+cx;if(!sp[T[a]]||!sp[T[b]])continue;if(team&&((wall[a]&&wall[a]!==team)||(wall[b]&&wall[b]!==team)))continue;}
      const ng=g[c]+cost;
      if(gn[n]!==gen||ng<g[n]){gn[n]=gen;g[n]=ng;came[n]=c;push(n,ng+h(n));}}}
  const out=[];for(let c=best;c!==-1;c=came[c])out.push(c);out.reverse();return out;
}
function los(cls,x0,y0,x1,y1,team){const L=Math.hypot(x1-x0,y1-y0),n=Math.ceil(L/(CELL*.4));for(let i=1;i<n;i++){const t=i/n;if(!passable(cls,x0+(x1-x0)*t,y0+(y1-y0)*t,team))return false;}return true;}
function computePath(u){
  const cls=UT[u.type].cls,W=G.W,team=u.team;
  const sc=cellIdx(u.x,u.y);
  let gc=cellIdx(u.goalX,u.goalY);
  if(!cellOk(cls,gc,team)){const n=nearestPassableCell(cls,gc%W,(gc/W)|0,team);if(n<0){u.path=null;return;}gc=n;u.goalX=(gc%W+.5)*CELL;u.goalY=((gc/W|0)+.5)*CELL;}
  const cells=astar(cls,sc,gc,team);
  const pts=cells.map(c=>[(c%W+.5)*CELL,((c/W|0)+.5)*CELL]);
  const reached=cells[cells.length-1]===gc;
  if(reached)pts[pts.length-1]=[u.goalX,u.goalY];else{const l=pts[pts.length-1];u.goalX=l[0];u.goalY=l[1];}
  pts[0]=[u.x,u.y];
  const out=[];let i=0;
  while(i<pts.length-1){let j=Math.min(pts.length-1,i+20);while(j>i+1&&!los(cls,pts[i][0],pts[i][1],pts[j][0],pts[j][1],team))j--;out.push(pts[j][0],pts[j][1]);i=j;}
  u.path=out.length?out:[u.goalX,u.goalY];u.pi=0;
}
function requestPath(u,x,y){u.goalX=x;u.goalY=y;u.path=null;u.pi=0;if(!u.pq){u.pq=true;G.pathQ.push(u);}}
function processPaths(){let n=0;while(G.pathQ.length&&n<12){const u=G.pathQ.shift();u.pq=false;if(u.dead)continue;computePath(u);n++;}}

// ================= SPATIAL HASH =================
const HS=48;let HB=[],HW=0,HH=0;
function initHash(){HW=Math.ceil(G.W*CELL/HS)+1;HH=Math.ceil(G.H*CELL/HS)+1;HB=Array.from({length:HW*HH},()=>[]);}
function rebuildHash(){for(const b of HB)b.length=0;for(const u of G.units){if(u.dead||u.landed)continue;HB[clamp((u.y/HS)|0,0,HH-1)*HW+clamp((u.x/HS)|0,0,HW-1)].push(u);}}
function queryHash(x,y,r,cb){const x0=clamp(((x-r)/HS)|0,0,HW-1),x1=clamp(((x+r)/HS)|0,0,HW-1),y0=clamp(((y-r)/HS)|0,0,HH-1),y1=clamp(((y+r)/HS)|0,0,HH-1);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const b=HB[cy*HW+cx];for(let i=0;i<b.length;i++)cb(b[i]);}}
const cellIdx=(x,y)=>clamp(Math.floor(y/CELL),0,G.H-1)*G.W+clamp(Math.floor(x/CELL),0,G.W-1);
