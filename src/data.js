// ================= CONSTANTS =================
const CELL=16, PLAIN=0, FOREST=1, HILL=2, MOUNT=3, WATER=4, TAU=Math.PI*2, YEAR=60, MONTH=5;
const SPEED={foot:[1,.72,.62,.38,0], veh:[1,.5,.6,0,0]};
const DEF={foot:[1,.7,.78,.6,1], veh:[1,.85,.85,1,1]};
const DX=[1,-1,0,0,1,1,-1,-1], DY=[0,0,1,-1,1,-1,1,-1];
const TC={0:{m:'#9aa5b1',d:'#3a4047',l:'#e0e6ec',rgb:[150,160,170]},1:{m:'#3ea6ff',d:'#0c3a63',l:'#d2ecff',rgb:[62,166,255]},2:{m:'#ff4f5e',d:'#5f0d16',l:'#ffd3d7',rgb:[255,79,94]}};
const DIVC=['#ffd166','#7bf1a8','#f78cff','#ff9f43','#5ef1ff','#c3a6ff','#fff27a','#ff7aa8','#a0ff6b','#ffffff'];
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const RES=['food','wood','coal','iron','oil','steel','guns','goods','gold'];
const RI={
 food:{n:'Food',p:1.5,mk:700,tgt:250},
 wood:{n:'Wood',p:2,mk:500,tgt:150},
 coal:{n:'Coal',p:3,mk:400,tgt:80},
 iron:{n:'Iron',p:3.5,mk:400,tgt:110},
 oil:{n:'Petrol',p:5,mk:320,tgt:120},
 steel:{n:'Steel',p:8,mk:260,tgt:100},
 guns:{n:'Guns',p:9,mk:260,tgt:100},
 goods:{n:'Goods',p:6,mk:300,tgt:60},
 gold:{n:'Gold',p:30,mk:80,tgt:20},
};
const START_RES={food:320,wood:220,coal:60,iron:120,oil:90,steel:70,guns:90,goods:30,gold:15};
const UT={
 inf:{name:'Rifle Squad',cost:{$:30,guns:10,mp:100},time:4,hp:100,speed:15,cls:'foot',air:0,arm:0,w:1,vis:110,r:6,row:1,ap:.3,g:{dmg:9,range:36,cd:1},a:{dmg:3,range:36,cd:1},tag:'Needs guns. Tough in forest & hills'},
 tank:{name:'Tank',cost:{$:90,steel:20,oil:10,mp:40},time:8,hp:280,speed:25,cls:'veh',air:0,arm:1,w:1.3,vis:110,r:7,row:0,ap:1,fuel:55,g:{dmg:30,range:46,cd:1.6},a:null,tag:'Armored spearhead. Burns petrol'},
 art:{name:'Howitzer',cost:{$:80,steel:12,guns:4,mp:60},time:8,hp:80,speed:12,cls:'veh',air:0,arm:0,w:.5,vis:120,r:6,row:3,ap:.7,fuel:70,g:{dmg:34,range:165,cd:3.6,splash:22,min:36,shell:1},a:null,tag:'Long-range splash. Smashes walls'},
 aa:{name:'Anti-Air',cost:{$:60,steel:10,mp:40},time:6,hp:120,speed:17,cls:'veh',air:0,arm:0,w:.6,vis:150,r:6,row:2,ap:.35,fuel:70,g:{dmg:6,range:40,cd:.7},a:{dmg:24,range:105,cd:.55},tag:'Shreds aircraft'},
 eng:{name:'Builder',cost:{$:25,mp:20},time:3,hp:60,speed:17,cls:'foot',air:0,arm:0,w:0,vis:90,r:5,row:4,ap:0,g:null,a:null,tag:'Carries materials and builds or repairs structures'},
 ftr:{name:'Fighter',cost:{$:110,steel:12,oil:8,mp:10},time:9,hp:90,speed:95,cls:'air',air:1,arm:0,w:0,vis:160,r:6,row:0,ap:.3,g:{dmg:5,range:55,cd:.6},a:{dmg:16,range:75,cd:.45},fuel:45,turn:2.6,tag:'Air superiority. Refuels at base'},
 bmb:{name:'Bomber',cost:{$:160,steel:22,oil:12,mp:25},time:12,hp:150,speed:62,cls:'air',air:1,arm:0,w:0,vis:130,r:7,row:0,ap:1,g:{dmg:55,range:22,cd:2.2,splash:26,bomb:1},a:null,fuel:55,turn:1.5,tag:'Bombs troops, industry & walls'},
};
const TYPES=['inf','tank','art','aa','ftr','bmb','eng'];
const ARMY_T=TYPES.filter(t=>t!=='eng');
const CAN_BUILD={capital:TYPES,factory:['eng','inf','tank','art','aa'],airbase:['eng','inf','ftr','bmb'],town:['eng','inf','aa']};
const CITY_CAP={capital:16000,factory:6000,airbase:6000,town:6000};
const CITY_W={capital:4.5,factory:1.6,airbase:1.6,town:1.3};
const CITY_NAME={capital:'Capital',factory:'Factory',airbase:'Airbase',town:'Town'};
const BT={
 house:{n:'Housing',ico:'house',cost:{$:40,wood:20},time:5,hp:120,on:'house',cap:3000,d:'+3,000 homes. Near your cities'},
 farm:{n:'Farm',ico:'food',cost:{$:40,wood:10},time:5,hp:100,on:'plain',work:900,out:{food:2.6},d:'Grows food. Plains'},
 lumber:{n:'Lumber Mill',ico:'wood',cost:{$:40},time:5,hp:100,on:'forest',work:700,out:{wood:1.3},d:'Cuts wood. Forest'},
 coal:{n:'Coal Mine',ico:'coal',cost:{$:70,wood:15},time:7,hp:140,on:'dep',dep:'coal',work:1100,out:{coal:1.1},d:'On a coal deposit'},
 iron:{n:'Iron Mine',ico:'iron',cost:{$:70,wood:15},time:7,hp:140,on:'dep',dep:'iron',work:1100,out:{iron:1.1},d:'On an iron deposit'},
 oil:{n:'Oil Well',ico:'oil',cost:{$:100,wood:10,iron:10},time:8,hp:120,on:'dep',dep:'oil',work:700,out:{oil:1.2},d:'Petrol. Oil deposit'},
 gold:{n:'Gold Mine',ico:'gold',cost:{$:120,wood:20},time:9,hp:140,on:'dep',dep:'gold',work:1300,out:{gold:.22},d:'On a gold deposit'},
 steel:{n:'Steel Mill',ico:'steel',cost:{$:150,wood:20,iron:15},time:10,hp:200,on:'land',work:1500,inp:{iron:1,coal:.6},out:{steel:.8},d:'Iron + coal make steel'},
 arms:{n:'Arms Factory',ico:'guns',cost:{$:140,wood:15,iron:15},time:10,hp:200,on:'land',work:1400,inp:{iron:.5,wood:.4},out:{guns:1},d:'Iron + wood make guns'},
 goods:{n:'Goods Factory',ico:'goods',cost:{$:160,wood:25,iron:20},time:10,hp:200,on:'land',work:1300,inp:{iron:.25,wood:.3,coal:.15},out:{goods:1},d:'Makes consumer goods. Sell them or supply shops'},
 shop:{n:'Market Hall',ico:'shop',cost:{$:120,wood:30},time:8,hp:150,on:'land',work:600,inp:{goods:.35},out:{$:5},d:'Sells goods to citizens for cash'},
 bank:{n:'Bank',ico:'bank',cost:{$:220,wood:20,iron:10,gold:5},time:12,hp:220,on:'land',work:400,inp:{gold:.03},out:{$:4},d:'Turns gold reserves into steady income'},
 silo:{n:'Missile Silo',ico:'silo',cost:{$:450,steel:60,iron:30},time:16,hp:400,on:'land',d:'Builds and launches missiles and nukes'},
 wall:{n:'Wall',ico:'wall',cost:{$:6,wood:4,iron:1},time:1.5,hp:900,on:'wall',d:'Blocks enemy troops. Drag to paint'},
};
const BTYPES=Object.keys(BT);
const BCAT=[['Homes & food',['house','farm']],['Raw materials',['lumber','coal','iron','oil','gold']],['Industry',['steel','arms','goods']],['Money',['shop','bank']],['Defence & strike',['wall','silo']]];
const STRIKE={
 missile:{n:'Cruise Missile',ico:'missile',cost:{$:180,steel:20,oil:15},time:12,r:36,dmg:150,speed:230,d:'Precise strike. Wrecks troops, buildings and walls'},
 nuke:{n:'Nuclear Warhead',ico:'nuke',cost:{$:2500,steel:150,oil:60,gold:60},time:60,r:140,dmg:6000,speed:115,d:'Wipes out everything in a huge radius and leaves fallout. The world will never forgive you'},
};
const DEPS=['coal','iron','oil','gold'];
const POL={
 tax:{n:'Taxes',o:['Low','Normal','High'],m:[.6,1,1.5],h:[10,0,-12]},
 draft:{n:'Conscription',o:['Volunteer','Draft','Total War'],m:[.035,.075,.14],h:[4,-4,-16]},
 ration:{n:'Rations',o:['Generous','Normal','Strict'],m:[1.3,1,.7],h:[8,0,-10]},
};
const TREATY={
 trade:{n:'Trade Pact',req:15,cost:{$:150},d:'15% better prices on every trade'},
 vol:{n:'Volunteer Accord',req:30,cost:{$:200},d:'Hire their manpower 40% cheaper. 300 volunteers arrive every year'},
 aid:{n:'Lend-Lease',req:50,cost:{gold:8},d:'Free shipments of their exports every 4 months'},
 ally:{n:'Military Alliance',req:72,cost:{gold:20},d:'They send troops during the war and embargo your enemy'},
};
const TKEYS=Object.keys(TREATY);
const PERSONA={
 merchant:{n:'Mercantile',d:'Cares about trade above all. Treaties come easily.',adj:{trade:-5,vol:0,aid:0,ally:5},mp:1500,mpP:70,base:12},
 pacifist:{n:'Pacifist',d:'Hates bombing and total war. A reluctant ally.',adj:{trade:0,vol:10,aid:-10,ally:18},mp:600,mpP:110,base:8},
 militarist:{n:'Militarist',d:'Respects strength and sides with whoever is winning.',adj:{trade:5,vol:-10,aid:5,ally:-12},mp:3500,mpP:45,base:0},
 isolationist:{n:'Isolationist',d:'Distrusts everyone and warms up slowly.',adj:{trade:10,vol:10,aid:15,ally:23},mp:1200,mpP:90,base:-5},
};
// Difficulty never changes the rules or the economy: only how fast and how well the enemy "player" thinks.
// ap = actions per second (a human taps ~0.5-1/s), react = seconds before it notices a threat, err = chance of a poor decision
const DIFFS={easy:{ap:.35,react:7,wave:.8,err:.35,grace:300,think:1.5},normal:{ap:.6,react:3.5,wave:1,err:.15,grace:200,think:1.1},hard:{ap:1,react:1.5,wave:1.1,err:.03,grace:90,think:.8}};
const HOUSE_MAX={capital:10,factory:5,airbase:5,town:5};
const CAP_R=46;
const SIZES={small:[64,44],medium:[88,60],large:[120,80]};
const UNIT_CAP=140;

// ================= UTILS =================
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy};
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.random()*a.length|0];
const wrapA=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a};
const $=s=>document.querySelector(s);
const fmt=n=>{n=Math.floor(n);const a=Math.abs(n);return a<1e4?String(n):a<1e6?(n/1e3).toFixed(a<1e5?1:0)+'k':(n/1e6).toFixed(2)+'M'};
const fmtR=n=>(n>=0?'+':'')+(Math.abs(n)<10?n.toFixed(1):n.toFixed(0));
const fmtT=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const ordinal=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
const dateStr=t=>`Y${1+Math.floor(t/YEAR)} · ${MONTHS[Math.floor((t%YEAR)/MONTH)]}`;
const durStr=t=>{const y=Math.floor(t/YEAR),m=Math.ceil((t-y*YEAR)/MONTH);return (y?y+'Y ':'')+(m%12||!y?(m===12?'1Y':m+'M'):'')};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeNoise(rng){
  const p=new Uint8Array(512),v=new Float32Array(256);
  for(let i=0;i<256;i++){p[i]=i;v[i]=rng();}
  for(let i=255;i>0;i--){const j=(rng()*(i+1))|0;const t=p[i];p[i]=p[j];p[j]=t;}
  for(let i=0;i<256;i++)p[i+256]=p[i];
  const h=(x,y)=>v[p[p[x&255]+(y&255)]], s=t=>t*t*(3-2*t);
  return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),u=s(x-xi),w=s(y-yi);const a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);return a+(b-a)*u+(c-a)*w+(a-b-c+d)*u*w;};
}
function fbm(n,x,y,o){let s=0,a=1,t=0;for(let i=0;i<o;i++){s+=n(x,y)*a;t+=a;a*=.5;x*=2.03;y*=2.03;}return s/t;}

// ================= ICONS (shared by SVG UI and canvas) =================
const IC={
 food:[['M11 21.5h2V9h-2z','#a8b84a'],['M12 1.8c-1.7 1.5-1.7 3.9 0 5.4 1.7-1.5 1.7-3.9 0-5.4zM7.4 5.6c-.4 2.2.9 4.2 3 4.8.4-2.2-.9-4.2-3-4.8zM16.6 5.6c-2.1.6-3.4 2.6-3 4.8 2.1-.6 3.4-2.6 3-4.8zM7.4 10.8c-.4 2.2.9 4.2 3 4.8.4-2.2-.9-4.2-3-4.8zM16.6 10.8c-2.1.6-3.4 2.6-3 4.8 2.1-.6 3.4-2.6 3-4.8z','#e3e86b']],
 wood:[['M5 7h12a5 5 0 0 1 0 10H5a5 5 0 0 1 0-10z','#9a6436'],['M17 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8z','#e2b77d'],['M17 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 1 0 0-2.4z','#9a6436']],
 coal:[['M2.5 18l2.5-6.5 5.5-2.2 3.6 3.2-1.1 5.5z','#4b525b'],['M12.4 12.2l4-5.2 4.7 2.1.6 5.3-3.1 4.1h-4.2z','#666f79'],['M6.6 12.2l2.6-1.1 1.5 1.5-2.1 1z','#a3acb6'],['M15.3 9.3l2-1.6 1.6 1-1.5 1.6z','#a3acb6']],
 iron:[['M2.5 18.5l3-7.5h13l3 7.5z','#8c99a6'],['M5.5 11l2.2-3.6h8.6l2.2 3.6z','#dbe3ea']],
 oil:[['M12 1.5C9 6.5 5.5 10.2 5.5 14.3a6.5 6.5 0 0 0 13 0C18.5 10.2 15 6.5 12 1.5z','#ffb648'],['M8.8 14.4a3.2 3.2 0 0 0 3.2 3.2V16a1.6 1.6 0 0 1-1.6-1.6z','#fff1d6']],
 steel:[['M4 3.5h16v4h-5.5v9H20v4H4v-4h5.5v-9H4z','#7fb8ff']],
 guns:[['M1.5 10.5h13.5l1.5-1.5h6v3h-3l-1.2 1.2v1.3H14l-1.4 3.5H9.3l1.2-3.5H6.8l-1.2 2.2H2.8l1.2-2.6-2.5-.6z','#e9d27a']],
 gold:[['M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19z','#d39b00'],['M12 4.6a7.4 7.4 0 1 0 0 14.8 7.4 7.4 0 1 0 0-14.8z','#ffd23f'],['M12 7.2l1.4 3 3.2.3-2.4 2.2.7 3.2-2.9-1.7-2.9 1.7.7-3.2-2.4-2.2 3.2-.3z','#b98500']],
 money:[['M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19z','#2f7d45'],['M11 6h2v1.3c1.4.3 2.4 1.3 2.5 2.6h-2.1c-.1-.6-.7-1-1.4-1-.9 0-1.4.4-1.4.9s.5.8 1.7 1.1c2.1.5 3.3 1.2 3.3 2.8 0 1.4-1 2.4-2.6 2.7V18h-2v-1.6c-1.6-.3-2.7-1.3-2.8-2.8h2.1c.1.7.7 1.1 1.7 1.1s1.5-.4 1.5-1-.4-.8-1.8-1.1c-2-.5-3.1-1.2-3.1-2.8 0-1.3 1-2.3 2.4-2.6z','#d8ffd0']],
 mp:[['M3 15.5a9 8.5 0 0 1 18 0V17H3z','#8fb36b'],['M1.5 16.5h21v2.4h-21z','#6f8f50'],['M11 6.5h2V10h-2z','#c3dca3']],
 pop:[['M12 2.5a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 1 0 0-8.6zM3.5 21.5c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5z','#e8eef5']],
 house:[['M12 2.5l9.5 8V21h-6.3v-6H8.8v6H2.5V10.5z','#f1e6d0'],['M12 2.5l9.5 8-1.2 1.4L12 4.9l-8.3 7L2.5 10.5z','#e07a5f']],
 wall:[['M2 9.5h20V21H2z','#a7b0ba'],['M2 13.6h20v1.4H2zM2 17.4h20v1.3H2zM8 9.5h1.4v4.1H8zM15 9.5h1.4v4.1H15zM5 15h1.4v2.4H5zM11.3 15h1.4v2.4h-1.3zM18 15h1.4v2.4H18z','#5b646e'],['M2 5h4v4.5H2zM10 5h4v4.5h-4zM18 5h4v4.5h-4z','#a7b0ba']],
 goods:[['M3 8l9-4.5L21 8v9l-9 4.5L3 17z','#c98a4b'],['M3 8l9 4.5L21 8M12 12.5V21.5','#7a4f26',1.3],['M7.5 5.8l9 4.5','#f1d3a4',1.3]],
 shop:[['M3 9.5h18V21H3z','#e9e2d0'],['M2 9.5l2.5-5.5h15L22 9.5z','#e05a4f'],['M2 9.5h20v2.2H2z','#c4483e'],['M9.5 14h5v7h-5z','#6b4a2b'],['M4.5 13h3.5v3.5H4.5zM16 13h3.5v3.5H16z','#8fc7ff']],
 bank:[['M12 2.5l10 5V9H2V7.5z','#d9cfb8'],['M3 20h18v2H3zM2.5 9h19v1.5h-19z','#bfb39a'],['M4.5 11h2.5v8H4.5zM10.75 11h2.5v8h-2.5zM17 11h2.5v8H17z','#efe7d4'],['M12 4.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2z','#d39b00']],
 silo:[['M3.5 14.5a8.5 4 0 0 0 17 0V20h-17z','#6a737d'],['M12 1.5c1.6 1.7 2.4 4 2.4 6.6V15H9.6V8.1c0-2.6.8-4.9 2.4-6.6z','#e8eef5'],['M9.6 12.5l-2.4 2.5h2.4zM14.4 12.5l2.4 2.5h-2.4z','#ff5a5a']],
 missile:[['M20.5 3.5c-.6 3.4-2.5 6.4-5.3 8.6l-4.6 3.6-2.3-2.3 3.6-4.6c2.2-2.8 5.2-4.7 8.6-5.3z','#e8eef5'],['M8.3 13.4l-3.6.7-1.8 1.8 3.4.4zM10.6 15.7l-.7 3.6-1.8 1.8-.4-3.4z','#ff5a5a'],['M7.8 16.2l-3.3 3.3','#ffb648',2]],
 nuke:[['M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19z','#ffd23f'],['M12 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2zM12 9.4L8.8 3.9a8.2 8.2 0 0 1 6.4 0zM13.7 13l6.3.1a8.2 8.2 0 0 1-3.2 5.5zM10.3 13l-3.1 5.6A8.2 8.2 0 0 1 4 13.1z','#1a1205']],
 eng:[['M6 9.5a6 6 0 0 1 12 0z','#ffb648'],['M4.5 9.5h15v1.8h-15z','#e08a1e'],['M8 12.6h8v1.6a4 4 0 0 1-8 0z','#f1d0b5'],['M5 21.5c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2z','#3c6aa0']],
 t_army:[['M12 2l8.5 3.2v6.3c0 5.3-3.6 9.6-8.5 11-4.9-1.4-8.5-5.7-8.5-11V5.2z','currentColor']],
 t_build:[['M14.2 2.2l6.6 6.6-2.4 2.4-1.7-1.7-8.4 8.4-3-3 8.4-8.4-1.7-1.7zM4.6 15.6l3 3-3.1 3.1a2.1 2.1 0 0 1-3-3z','currentColor']],
 t_market:[['M3 20h18v1.6H3zM4.5 13h3.2v6H4.5zM10.4 9h3.2v10h-3.2zM16.3 4.5h3.2V19h-3.2z','currentColor']],
 t_world:[['M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 1 0 0-18.8zM12 2.6c-2.9 2.6-4.2 6-4.2 9.4s1.3 6.8 4.2 9.4c2.9-2.6 4.2-6 4.2-9.4S14.9 5.2 12 2.6zM2.6 12h18.8M4.2 7.3h15.6M4.2 16.7h15.6','currentColor',1.7]],
 t_people:[['M9 3.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 1 0 0-7.6zM1.5 20.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5zM17 5.5a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 1 0 0-6.4zM17.6 13.4c2.8.5 4.9 3.3 4.9 7.1h-4.4c0-2.8-.8-5.3-2.3-6.8.6-.2 1.2-.3 1.8-.3z','currentColor']],
 x:[['M6 6l12 12M18 6L6 18','currentColor',2.6]],
 warn:[['M12 2.5l10.5 18.5h-21z','#ffb648'],['M11 9h2v6h-2zM11 16.5h2v2h-2z','#1a1205']],
 handshake:[['M2 9l5-4 4 2 2-1 4 0 5 4-3 4-6 5-2-1-1 1-2-1-1 1-2-2 1-1-1-1z','currentColor']],
};
function svgI(k,cls){const L=IC[k];if(!L)return'';return `<svg viewBox="0 0 24 24"${cls?` class="${cls}"`:''}>${L.map(l=>l[2]?`<path d="${l[0]}" fill="none" stroke="${l[1]}" stroke-width="${l[2]}" stroke-linecap="round" stroke-linejoin="round"/>`:`<path d="${l[0]}" fill="${l[1]}" fill-rule="evenodd"/>`).join('')}</svg>`}
const P2D={};const p2d=d=>P2D[d]||(P2D[d]=new Path2D(d));
function drawIco(c,k,x,y,sz,mono){const L=IC[k];if(!L)return;c.save();c.translate(x-sz/2,y-sz/2);c.scale(sz/24,sz/24);
  for(const l of L){const col=mono||(l[1]==='currentColor'?'#fff':l[1]);if(l[2]){c.strokeStyle=col;c.lineWidth=l[2];c.stroke(p2d(l[0]));}else{c.fillStyle=col;c.fill(p2d(l[0]),'evenodd');}}c.restore();}
// side-view silhouettes for the UI (readable at 16px)
function uIcon(t,c='currentColor'){const k='#0b1118',s={
  inf:`<path d="M9.6 2.6c-2.3 0-3.8 1.4-4 3.4h8C13.4 4 11.9 2.6 9.6 2.6z" fill="${c}"/><path d="M6.8 6.6h5.6v1.5a2.8 2.8 0 0 1-5.6 0z" fill="${c}"/><path d="M5.6 11.2h7.6l.9 6.4h-1.9l-.6 4.6h-1.9l-.4-4.6h-.5l-.4 4.6H7l-.6-4.6H4.6z" fill="${c}"/><path d="M12.6 12.6l9.2-6.1.8 1.1-9.2 6.2z" fill="${c}"/>`,
  tank:`<path d="M5.5 9.3h7.6l1.8 3.2H4.4z" fill="${c}"/><path d="M13 10h9.4v1.5H13z" fill="${c}"/><path d="M2.6 12.8h18.6l-1.4 2H4z" fill="${c}"/><rect x="2.4" y="15" width="19.2" height="5.2" rx="2.6" fill="${c}"/><circle cx="5.6" cy="17.6" r="1.4" fill="${k}"/><circle cx="9.5" cy="17.6" r="1.4" fill="${k}"/><circle cx="13.4" cy="17.6" r="1.4" fill="${k}"/><circle cx="17.6" cy="17.6" r="1.4" fill="${k}"/>`,
  art:`<path d="M7 13.2L21 5.6l.8 1.5L7.8 14.8z" fill="${c}"/><path d="M5.4 9.6h4.4v6.6H5.4z" fill="${c}"/><path d="M8.6 15.4l-6.8 5 .9 1.2 6.8-5z" fill="${c}"/><circle cx="9" cy="17" r="3.8" fill="${c}"/><circle cx="9" cy="17" r="1.4" fill="${k}"/>`,
  aa:`<path d="M1.8 12.6h13v5H1.8z" fill="${c}"/><path d="M15.2 10.4h4.4l2.6 3.4v3.8h-7z" fill="${c}"/><path d="M6.6 11.8l8.8-7.6.9 1-8.8 7.6zM8.6 12.4l8.8-7.6.9 1-8.8 7.6z" fill="${c}"/><circle cx="5.6" cy="18.4" r="2.3" fill="${c}"/><circle cx="18.2" cy="18.4" r="2.3" fill="${c}"/><circle cx="5.6" cy="18.4" r=".9" fill="${k}"/><circle cx="18.2" cy="18.4" r=".9" fill="${k}"/>`,
  ftr:`<path d="M12 1.2c.8 0 1.2 1.2 1.3 3l.2 4.4 8.6 2.6v2l-8.6-.6-.5 6.2 3.2 1.6V22l-4.2-.6L7.8 22v-1.6l3.2-1.6-.5-6.2-8.6.6v-2l8.6-2.6.2-4.4c.1-1.8.5-3 1.3-3z" fill="${c}"/>`,
  bmb:`<path d="M12 1c1 0 1.5 1.4 1.5 3.4v4l9.3 1.6v2.6l-9.3-.4-.4 7 3 1.4V22l-4.1-.5-4.1.5v-1.4l3-1.4-.4-7-9.3.4V10l9.3-1.6v-4C10.5 2.4 11 1 12 1z" fill="${c}"/><rect x="5" y="7.2" width="2.4" height="4.4" rx="1" fill="${c}"/><rect x="16.6" y="7.2" width="2.4" height="4.4" rx="1" fill="${c}"/>`,
  eng:`<path d="M7 7.5a5 5 0 0 1 10 0z" fill="${c}"/><rect x="5.5" y="7.3" width="13" height="1.7" rx=".8" fill="${c}"/><circle cx="12" cy="11.6" r="2.6" fill="${c}"/><path d="M6.5 22c0-4 2.5-7.5 5.5-7.5s5.5 3.5 5.5 7.5z" fill="${c}"/><path d="M17.2 13.5l4.6-4.6 1.4 1.4-4.6 4.6z" fill="${c}"/>`}[t];
  return `<svg viewBox="0 0 24 24">${s}</svg>`;}
const ICO_KEY=k=>k==='$'?'money':k;
function costHTML(cost,E,mult=1){return '<span class="costs">'+Object.entries(cost).map(([k,v])=>{v=Math.ceil(v*mult);const have=!E?1e9:k==='$'?E.money:k==='mp'?E.mp:E.res[k];
  return `<span class="cost${have<v?' no':''}">${svgI(ICO_KEY(k))}${k==='$'?'$':''}${fmt(v)}</span>`}).join('')+'</span>'}

// ================= FLAGS =================
const FLAGC=['#c8102e','#00247d','#ffffff','#ffcc00','#009246','#111111','#ff8200','#5b2c83','#1e90ff','#7a1f1f','#2e8b57','#f2a900','#0b3d91','#d52b1e','#00a3e0','#6b8e23'];
function starPath(cx,cy,r){let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;d+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(2)+' '+(cy+Math.sin(a)*rr).toFixed(2);}return d+'z'}
function flagSVG(f,cls='flag'){const [a,b,c]=f.c;let s=`<rect width="30" height="20" fill="${a}"/>`;
  switch(f.t){
    case 'h3':s+=`<rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`;break;
    case 'v3':s+=`<rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;break;
    case 'cross':s+=`<rect x="8" width="6" height="20" fill="${b}"/><rect y="7" width="30" height="6" fill="${b}"/><rect x="9.8" width="2.4" height="20" fill="${c}"/><rect y="8.8" width="30" height="2.4" fill="${c}"/>`;break;
    case 'diag':s+=`<path d="M0 20L30 0V20z" fill="${b}"/><path d="M0 17.5L26.3 0H30v2.5L3.7 20H0z" fill="${c}"/>`;break;
    case 'chev':s+=`<rect width="30" height="10" fill="${b}"/><rect y="10" width="30" height="10" fill="${c}"/><path d="M0 0L13 10 0 20z" fill="${a}"/>`;break;
    case 'band':s+=`<rect y="5" width="30" height="10" fill="${b}"/><rect y="5" width="30" height="1.2" fill="${c}"/><rect y="13.8" width="30" height="1.2" fill="${c}"/>`;break;
    case 'canton':s+=`<rect y="10" width="30" height="10" fill="${b}"/><rect width="13" height="10" fill="${c}"/>`;break;
  }
  const ex=f.t==='chev'?4.6:f.t==='canton'?6.5:15,ey=f.t==='canton'?5:10,ec=f.ec;
  if(f.e==='star')s+=`<path d="${starPath(ex,ey,f.t==='canton'?3.6:4.4)}" fill="${ec}"/>`;
  else if(f.e==='disc')s+=`<circle cx="${ex}" cy="${ey}" r="${f.t==='canton'?3:4}" fill="${ec}"/>`;
  else if(f.e==='ring')s+=`<circle cx="${ex}" cy="${ey}" r="3.6" fill="none" stroke="${ec}" stroke-width="1.4"/>`;
  else if(f.e==='sun'){let d='';for(let i=0;i<12;i++){const q=i*Math.PI/6;d+=`M${ex} ${ey}L${(ex+Math.cos(q-.13)*5.4).toFixed(2)} ${(ey+Math.sin(q-.13)*5.4).toFixed(2)}L${(ex+Math.cos(q+.13)*5.4).toFixed(2)} ${(ey+Math.sin(q+.13)*5.4).toFixed(2)}z`;}s+=`<path d="${d}" fill="${ec}"/><circle cx="${ex}" cy="${ey}" r="2.6" fill="${ec}"/>`;}
  return `<svg class="${cls}" viewBox="0 0 30 20" preserveAspectRatio="none">${s}</svg>`;
}
function makeFlag(rng){const pal=FLAGC.slice();const take=()=>pal.splice(rng()*pal.length|0,1)[0];
  return {t:['h3','v3','cross','diag','chev','band','canton'][rng()*7|0],c:[take(),take(),take()],e:['star','disc','ring','sun','none','none'][rng()*6|0],ec:take()};}

// ================= CITIZENS: names, portraits, quotes =================
const FIRST=['Ana','Boris','Clara','Dmitri','Elena','Felix','Greta','Hugo','Ines','Jonas','Katya','Lev','Mira','Nils','Olga','Pavel','Rosa','Stefan','Tilda','Ugo','Vera','Wim','Yana','Zoltan','Ilse','Marek','Nadia','Oskar','Lena','Tomas','Irina','Anton','Sofia','Emil','Hana','Viktor','Agnes','Jakub','Maren','Radu'];
const LS1=['Kov','Mar','Vel','Dra','Hol','Sten','Bran','Lut','Orl','Pet','Rad','Sok','Tar','Ven','Zel','Gor','Fen','Ivas','Bel','Kor','Mil','Nov'];
const LS2=['ek','ov','ani','berg','sen','ova','ic','mann','ski','escu','ner','ar','ez','in','ard','enko'];
const JOBS=['farmer','coal miner','steelworker','teacher','nurse','baker','clerk','student','retired soldier','shopkeeper','lumberjack','engineer','dockworker','seamstress','railway worker','doctor','priest','journalist','mechanic','widow','factory foreman','tram driver'];
const SKIN=['#f1d0b5','#e7b892','#d39b72','#b67a52','#8d5a3b','#6a4029'];
const HAIRC=['#1d1a17','#3b2a1f','#6b4a2b','#a97b45','#d8b46a','#8a8f96','#e5e5e5','#7a2e1d'];
const SHIRT=['#3c5a80','#6b3e3e','#4f6b3a','#7a6a4f','#55606e','#8a5a2b','#4b3f6b','#2f5f5f'];
const MOODC={happy:'#1f4d33',neutral:'#2a3542',sad:'#2b3350',angry:'#5a1f24',scared:'#4d3d16'};
function avatarSVG(v,mood){
  const bg=MOODC[mood]||MOODC.neutral,sk=v.skin,hc=v.hairC,ln='#2a1610';
  let s=`<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${bg}"/><path d="M5.5 40c0-8 6.4-12.5 14.5-12.5S34.5 32 34.5 40z" fill="${v.shirt}"/><rect x="17.2" y="23" width="5.6" height="6" fill="${sk}"/>`;
  if(v.hs===2)s+=`<path d="M10.5 18c0-7 4.3-11 9.5-11s9.5 4 9.5 11v10h-4V18h-11v10h-4z" fill="${hc}"/>`;
  s+=`<ellipse cx="20" cy="17.5" rx="7.4" ry="8.4" fill="${sk}"/>`;
  if(v.hs===0)s+=`<path d="M12.5 15.5c0-5.4 3.3-8.2 7.5-8.2s7.5 2.8 7.5 8.2c-1.7-2.2-4.2-3.6-7.5-3.6s-5.8 1.4-7.5 3.6z" fill="${hc}"/>`;
  else if(v.hs===1)s+=`<path d="M12.8 19c1 5 3.6 7.2 7.2 7.2s6.2-2.2 7.2-7.2c-1.5 1.6-3.6 2.4-7.2 2.4s-5.7-.8-7.2-2.4z" fill="${hc}"/><path d="M13 13.5c.8-3.4 3.6-5.6 7-5.6s6.2 2.2 7 5.6c-2-1.2-4.4-1.8-7-1.8s-5 .6-7 1.8z" fill="${hc}" opacity=".55"/>`;
  else if(v.hs===2)s+=`<path d="M12.5 15.5c0-5.2 3.3-8 7.5-8s7.5 2.8 7.5 8c-3-.5-5.8-2-7.5-4.3-1.7 2.3-4.5 3.8-7.5 4.3z" fill="${hc}"/>`;
  else if(v.hs===3)s+=`<path d="M12 14.2c0-5 3.6-7.6 8-7.6s8 2.6 8 7.6z" fill="${v.shirt}"/><rect x="10.5" y="13.2" width="19" height="2.4" rx="1.2" fill="${v.shirt}"/><rect x="18.6" y="8.4" width="2.8" height="2.8" rx="1.4" fill="#d9c27a"/>`;
  else s+=`<path d="M12.5 15.5c0-5.4 3.3-8.2 7.5-8.2s7.5 2.8 7.5 8.2c-1.7-2.2-4.2-3.6-7.5-3.6s-5.8 1.4-7.5 3.6z" fill="${hc}"/><circle cx="20" cy="6.6" r="3" fill="${hc}"/>`;
  const ey=17.6;
  if(mood==='scared')s+=`<circle cx="16.8" cy="${ey}" r="1.6" fill="#fff"/><circle cx="23.2" cy="${ey}" r="1.6" fill="#fff"/><circle cx="16.8" cy="${ey}" r=".8" fill="${ln}"/><circle cx="23.2" cy="${ey}" r=".8" fill="${ln}"/>`;
  else s+=`<circle cx="16.8" cy="${ey}" r="1" fill="${ln}"/><circle cx="23.2" cy="${ey}" r="1" fill="${ln}"/>`;
  const br={angry:['M14.6 14.6l3.8 1.4','M25.4 14.6l-3.8 1.4'],sad:['M14.8 15.6l3.6-1.2','M25.2 15.6l-3.6-1.2'],scared:['M14.8 14.2l3.6-.8','M25.2 14.2l-3.6-.8']}[mood];
  if(br)s+=`<path d="${br[0]}M${br[1].slice(1)}" stroke="${hc==='#e5e5e5'?'#999':hc}" stroke-width="1.2" stroke-linecap="round"/>`;
  const m={happy:'M16.6 21.4q3.4 3.2 6.8 0',neutral:'M17 22.4h6',sad:'M16.8 23.4q3.2-2.6 6.4 0',angry:'M16.8 23h6.4'}[mood];
  if(mood==='scared')s+=`<ellipse cx="20" cy="22.6" rx="1.6" ry="2" fill="${ln}"/>`;
  else s+=`<path d="${m}" stroke="${ln}" stroke-width="${mood==='angry'?1.6:1.3}" fill="none" stroke-linecap="round"/>`;
  return s+'</svg>';
}
const QUOTES={
 prep:[['neutral',"They say war is coming. I'm planting extra potatoes."],['sad',"My brother signed up yesterday. Mother hasn't stopped crying."],['happy','New houses going up on our street. Finally!'],['neutral',"Everyone talks about {enemy}. Nobody knows what they want."],['neutral','The factories run day and night now. Something is coming.']],
 content:[['happy',"Work is steady and the shelves are full. Can't complain."],['happy','Proud of this country today.'],['happy','The mill hired twenty more workers this week!'],['happy','Fresh bread, a roof, a job. That is all I ask.']],
 hunger:[['sad','The bread lines go around the block.'],['angry','My children went to bed hungry. Again.'],['sad','We boil the same bones three times now.']],
 tax:[['angry','Every coin I earn, the state takes half.'],['angry','Taxes up again? Who pays for all this?']],
 draft:[['sad',"They took my son to the front. He's seventeen."],['angry','No more young men left in our village.'],['sad',"My husband's papers came this morning."]],
 jobs:[['sad','No work at the mill again.'],['angry','Hundreds of us waiting at the factory gates.']],
 housing:[['angry','Six of us in one room. We need houses!'],['sad',"We sleep in shifts in my sister's flat."]],
 weary:[['sad','Another telegram on our street today.'],['sad','How many more must we bury?'],['angry','End this war. Bring them home.']],
 attack:[['scared','Sirens at dawn. Explosions everywhere.'],['scared','We hid in the cellar all night.'],['angry','They hit {city}! They will pay for this.'],['scared',"Grab the children, we're leaving {city}."]],
 bombed:[['scared','They bombed the {bld}. My street is gone.'],['angry','Bombs on workers! Cowards!'],['sad','My neighbour was inside when the {bld} was hit.']],
 refugee:[['scared','We walked all night from {city} with only our coats.'],['sad','Our home in {city} is gone. We have nothing now.']],
 lost:[['sad',"My cousin lives in {city}. We've heard nothing."],['angry','How could we lose {city}? Heads must roll!']],
 win:[['happy','We took {city}! Drinks are on me tonight.'],['happy','Did you hear? {city} is ours!'],['happy','Our soldiers are pushing them back!']],
 war:[['scared','So it begins. God help us all.'],['angry',"{enemy} wants war? They'll get it."],['sad','I lived through the last war. I did not want another.']],
 ally:[['happy',"{country} is with us! We're not alone."],['happy',"Foreign soldiers marching through {city}. They're on our side!"]],
 riot:[['angry','Enough! We march on the palace tonight.'],['angry','Smash the windows of the ministry!'],['angry','Down with the government!']],
 protest:[['angry','Strike! Nobody works until things change.'],['angry','We demand bread and fair wages!']],
 trade:[['happy','Foreign goods in the shops again!'],['neutral','Ships from {country} at the docks all morning.']],
 occupied:[['angry','Your flag over {city}? We never asked for this.'],['scared','New soldiers in {city}. Nobody goes out after dark.']],
 nuke:[['scared','A light brighter than the sun over {city}. Then the wind.'],['sad','{city} is gone. Just gone.'],['angry','They used the bomb! There is no forgiving this.']],
 nukeUse:[['sad','We dropped the bomb. God forgive us.'],['angry','How could our leaders do this in our name?'],['neutral','They say it will end the war faster. I cannot sleep.']],
 missile:[['scared','A missile hit {city} at noon. No warning at all.'],['angry','Missiles on our homes! Shoot them down!']],
 civdead:[['sad','The shelling killed people on our street today.'],['sad','We buried my neighbour this morning.']],
 builders:[['happy','Builders working day and night on the new {bld}.'],['neutral','More cranes on the skyline every week.']],
 goods:[['happy','New shoes, new radio. The shops are full again!'],['happy','I bought my daughter a coat from the new market hall.']],
 nofuel:[['neutral','Tanks stuck on the road outside {city}. No petrol, they say.']],
 noguns:[['angry','Recruits training with broomsticks! Where are the rifles?']],
 hired:[['neutral','Foreign volunteers at the station. They barely speak our language.']],
};
