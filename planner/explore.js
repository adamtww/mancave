/* ================= Explore: walk the room in 3D =================
   Three.js is loaded only when Explore opens. Units are feet; plan x → world x, plan y → world z, up is y.
   Objects use simple shapes (by type, with a tidy fallback by kind); ceiling lights really light the room. */
var EX={on:false,T:null,r:null,S:null,cam:null,raf:0,keys:{},yaw:0,pitch:0,pos:null,solid:[],last:0,joy:null,look:null,dirty:true};
var EYE=5.4,RAD=0.8,WALK=9,RUN=16;
var NOWALK=/^(c-half|c-pickle|g-vr|f-turf|g-putt|f-free|c-bowl|c-bowlmini|g-cornhole|g-axe|g-darts|a-car|a-pickup|a-evbay|x-tennis|c-net|b-stage|ht-riser)$/;
function exLoad(){if(EX.T)return Promise.resolve(EX.T);return import('./vendor/three-0.170.0.module.min.js').then(function(m){EX.T=m;return m})}
function setExplore(on){if(EX.on===on)return;EX.on=on;document.body.classList.toggle('exploring',on);strip();
 if(!on){exStop();return}
 var host=$('#explore');host.innerHTML='<div class="exload">Building the room…</div>';
 exLoad().then(function(){exStart()}).catch(function(e){host.innerHTML='<div class="exload">Couldn\'t load the 3D view. Check your connection and try again.</div>'})}
function exStop(){cancelAnimationFrame(EX.raf);EX.raf=0;if(document.pointerLockElement)document.exitPointerLock();if(EX.r){EX.r.dispose();EX.r=null}EX.S=null;$('#explore').innerHTML=''}

/* ---------- materials & helpers ---------- */
function exMat(T,col,o){o=o||{};return new T.MeshStandardMaterial({color:col,roughness:o.r!=null?o.r:.75,metalness:o.m||0,emissive:o.e||0,emissiveIntensity:o.ei||1,map:o.map||null,transparent:!!o.op,opacity:o.op||1,side:o.side||T.FrontSide})}
function exTex(T,draw,s,rep){var c=document.createElement('canvas');c.width=c.height=s;draw(c.getContext('2d'),s);var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);t.anisotropy=4;return t}
function shade(hex,f){var c=parseInt(hex.slice(1),16),r=c>>16,g=c>>8&255,b=c&255,m=function(v){return Math.max(0,Math.min(255,Math.round(f>1?v+(255-v)*(f-1):v*f)))};return (m(r)<<16)|(m(g)<<8)|m(b)}
function Kit(T,grp){var k={};
 k.box=function(x,y,z,w,h,d,mat){var m=new T.Mesh(new T.BoxGeometry(Math.max(w,.01),Math.max(h,.01),Math.max(d,.01)),mat);m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;grp.add(m);return m};
 k.cyl=function(x,y,z,rt,rb,h,mat,seg){var m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||16),mat);m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;grp.add(m);return m};
 k.legs=function(w,d,h,t,mat,ins){ins=ins||.15;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-ins-t/2),0,s[1]*(d/2-ins-t/2),t,h,t,mat)})};
 return k}

/* ---------- shapes: local space, centered, width along x, depth along z, front = +z ---------- */
function exShape(T,c,w,d,h,M){var g=new T.Group(),k=Kit(T,g),col=CATCOLOR[c.c]||'#9a958b',n=c.n,r=c.r;
 var body=exMat(T,shade(col,.55),{r:.6}),bodyL=exMat(T,shade(col,1.35),{r:.7}),dark=M.dark,wood=M.wood,steel=M.steel,white=M.white;
 var scr=function(x,y,z,sw,sh,hex){var m=exMat(T,0x111111,{e:hex,ei:1.4,r:.3});k.box(x,y,z,sw,sh,.06,m)};
 var top=function(th,mat){k.box(0,h-th,0,w,th,d,mat)};
 if(r==='g-pool'||r==='g-airh'||r==='g-shuffle'||r==='g-bubble'||r==='c-pp'||r==='g-beerpong'||r==='g-foos'){
  var bed=r==='g-pool'?M.felt:r==='c-pp'?exMat(T,0x1d4d8c,{r:.6}):r==='g-airh'||r==='g-bubble'?white:r==='g-beerpong'?exMat(T,0x1d1d1d,{r:.4}):wood;
  k.legs(w,d,h-.4,.35,r==='g-pool'||r==='g-shuffle'?wood:dark);k.box(0,h-.4,0,w,.32,d,r==='g-pool'||r==='g-shuffle'?wood:dark);k.box(0,h-.08,0,w-.5,.05,d-.5,bed);
  if(r==='g-pool'){[[-1,0],[1,0],[0,-1],[0,1]].forEach(function(s){k.box(s[0]*(w/2-.18),h-.08,s[1]*(d/2-.18),s[0]?.36:w,.25,s[1]?.36:d,wood)});[[.2,.1,0xffffff],[-.15,-.2,0xd23b2f],[-.3,.25,0xe6c52f]].forEach(function(b){k.cyl(b[0]*w,h-.04,b[1]*d,.12,.12,.12,exMat(T,b[2],{r:.2}))})}
  if(r==='g-airh'){k.box(0,h-.04,-d/2+.12,w,.18,.12,exMat(T,0x2b6fd9));k.box(0,h-.04,d/2-.12,w,.18,.12,exMat(T,0x2b6fd9))}
  if(r==='c-pp'){k.box(0,h-.04,0,.05,.5,d,white)}
  if(r==='g-bubble'){var dm=new T.Mesh(new T.SphereGeometry(Math.min(w,d)*.45,24,12,0,Math.PI*2,0,Math.PI/2),exMat(T,0xcfe8ff,{op:.35,r:.1}));dm.position.set(0,h-.05,0);dm.scale.set(w/Math.min(w,d),.6,d/Math.min(w,d));g.add(dm)}
  if(r==='g-foos'){for(var i=0;i<8;i++)k.box(-w/2+w*(i+.5)/8,h-.3,0,.06,.06,d+.6,steel)}
  return g}
 if(/^g-(cab|pin|gun|claw|bball|skee)$/.test(r)){var hc=[0x6d2bd9,0xd92b6d,0x2b8fd9,0xd9902b][r.length%4];
  if(r==='g-skee'||r==='g-bball'){k.box(0,0,0,w,3,d,exMat(T,hc,{r:.5}));k.box(0,3,-d/2+.6,w,h-3,1.2,exMat(T,shade('#'+hc.toString(16).padStart(6,'0'),.6)));scr(0,h-2.4,-d/2+1.22,w*.8,1.4,0xffcc33);if(r==='g-bball'){k.cyl(0,h-3.6,-d/2+2,0.8,.8,.08,exMat(T,0xff6a2a,{m:.5}))}return g}
  if(r==='g-pin'){k.legs(w,d,2.6,.25,dark);k.box(0,2.6,0,w,.9,d,exMat(T,hc,{r:.5}));k.box(0,3.5,-d/2+.3,w,h-3.5,.6,exMat(T,hc,{r:.5}));scr(0,4.2,-d/2+.62,w*.8,1.6,0x66ccff);scr(0,3.52,0,w*.8,.04,0x332266);return g}
  if(r==='g-claw'){k.box(0,0,0,w,3,d,exMat(T,hc));var gl=new T.Mesh(new T.BoxGeometry(w-.2,2.6,d-.2),exMat(T,0xdff2ff,{op:.25,r:.1}));gl.position.set(0,4.3,0);g.add(gl);k.box(0,5.6,0,w,h-5.6,d,exMat(T,hc));scr(0,5.8,d/2+.01,w*.8,.4,0xffee66);return g}
  k.box(0,0,0,w,h*.45,d*.75,exMat(T,hc,{r:.5}));k.box(0,h*.45,-d*.1,w,h*.55,d*.55,exMat(T,hc,{r:.5}));k.box(0,h*.45,d*.2,w,.35,d*.35,dark);scr(0,h*.55,d*.17,w*.8,h*.26,[0x44ddff,0xff66aa,0x88ff66][r.length%3]);scr(0,h*.88,d*.18,w*.8,h*.08,0xffcc33);return g}
 if(/sofa|sectional|recliner|armchair|seating|lounge seating/i.test(n)){var fab=exMat(T,0x5a6b7d,{r:.95}),seat=Math.min(1.5,h*.5);
  k.box(0,0,0,w,seat,d,fab);k.box(0,seat,-d/2+.35,w,h-seat,.7,fab);k.box(-w/2+.3,seat,0,.6,.7,d,fab);k.box(w/2-.3,seat,0,.6,.7,d,fab);
  if(/L-shaped|U-shaped/.test(n)){k.box(-w/2+.35,seat,0,.7,h-seat,d,fab)}return g}
 if(/stool/i.test(n)){k.cyl(0,0,0,w*.35,w*.4,.1,steel);k.cyl(0,0,0,.06,.06,h-.25,steel);k.cyl(0,h-.25,0,w*.45,w*.4,.25,exMat(T,0x8b5a3c,{r:.7}));return g}
 if(/^(l-bar|l-barc|l-rail|f-hightop)$/.test(r)){var bb=r==='l-bar';var cd=bb?Math.min(2.5,d*.4):d;k.box(0,0,bb?d/2-cd/2:0,w,3.3,cd,exMat(T,0x3b2a20,{r:.6}));k.box(0,3.3,bb?d/2-cd/2:0,w+.2,.2,cd+.3,wood);
  if(bb){k.box(0,0,-d/2+.5,w,3,1,exMat(T,0x2e2620));k.box(0,3,-d/2+.5,w,.12,1,wood);[4.2,5.4].forEach(function(y){k.box(0,y,-d/2+.4,w-.4,.08,.7,steel)});for(var b=0;b<Math.floor(w/.9);b++)k.cyl(-w/2+.5+b*.9,4.28,-d/2+.4,.12,.12,.85,exMat(T,[0x3d7a4a,0x7a3d2a,0xcfa24a][b%3],{r:.2}))}return g}
 if(/(^f-tv$|tv wall|projector \+ screen|big screen)/i.test(n)||r==='l-tv'||r==='ht-screen'||r==='l-tvwall'){k.box(0,0,0,w,Math.min(2,h*.3),Math.min(d,1.5),exMat(T,0x2a2420,{r:.6}));var tw=Math.min(w*.9,r==='f-tv'?5.5:w*.9),th=tw*.56;k.box(0,h-th-.3,-d/2+.1,tw,th,.15,dark);scr(0,h-th-.2,-d/2+.2,tw-.2,th-.2,0x3a7bd5);return g}
 if(/table|desk/i.test(n)&&!/table saw|plasma|waterjet|cutting table|router table|fixture table/i.test(n)){k.legs(w,d,h-.15,.25,dark);k.box(0,h-.15,0,w,.15,d,/conference|dining|poker|game|chess|coffee|round/i.test(n)?wood:exMat(T,0xd9d4c8,{r:.6}));return g}
 if(/rack|shelving|shelf|bins|racking|lumber|filament|pantry \/|storage shelving/i.test(n)&&!/AV|equipment rack|power rack|hydroponic|print farm|pan rack/i.test(n)){var post=exMat(T,/pallet/i.test(n)?0x2b5fa8:0x7d8288,{m:.4,r:.5}),bm=/pallet/i.test(n)?exMat(T,0xe0701f,{m:.3,r:.5}):post;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.08),0,s[1]*(d/2-.08),.16,h,.16,post)});var nsh=Math.max(3,Math.round(h/1.8));for(var s2=0;s2<nsh;s2++){var y=.3+s2*(h-.4)/(nsh-1);k.box(0,y,0,w,.08,d,bm);if(s2<nsh-1&&s2%2===0)k.box(0,y+.08,0,w*.8,.9,d*.8,exMat(T,[0xc8a878,0x8a9aa8,0xb8b0a0][s2%3],{r:.9}))}return g}
 if(/fridge|freezer|cooler|locker|safe|cabinet|kegerator|ice machine|ice maker|heater|wine|walk-in|copier|filing/i.test(n)&&!/arcade|base cabinet/i.test(n)){var cm=/walk-in|reach-in|commercial|freezer|ice machine|kegerator|bar fridge|beverage|under-counter|worktop/i.test(n)?steel:/safe/i.test(n)?exMat(T,0x2f3338,{m:.5,r:.4}):/flammables/i.test(n)?exMat(T,0xe2b21b,{r:.5}):white;
  k.box(0,0,0,w,h,d,cm);k.box(0,h*.15,d/2+.01,.03,h*.7,.03,dark);k.box(w*.35,h*.45,d/2+.05,.06,h*.25,.08,dark);if(/wine/i.test(n))k.box(0,.3,d/2+.02,w*.85,h*.8,.02,exMat(T,0x3a1a20,{op:.6,r:.1}));return g}
 if(/counter|base cabinet|island|cabinets|sink|cooktop|range|dishwasher|oven|steam table|prep|griddle|fryer|charbroiler|coffee bar|glass washer|trash/i.test(n)){var ctr=r.indexOf('kc-')===0||/stainless|commercial/i.test(n)?steel:exMat(T,0x8a7a66,{r:.6});
  k.box(0,0,0,w,Math.min(h,3)-.12,d,ctr);k.box(0,Math.min(h,3)-.12,0,w+.05,.12,d+.05,/kc-/.test(r)?steel:exMat(T,0xe9e4da,{r:.35}));
  if(/sink/i.test(n))k.box(0,Math.min(h,3)-.1,0,Math.min(1.8,w*.5),.04,Math.min(1.4,d*.6),exMat(T,0x9aa4aa,{m:.6,r:.2}));
  if(/range|cooktop|griddle|charbroiler/i.test(n)){for(var bx=0;bx<2;bx++)for(var bz=0;bz<2;bz++)k.cyl((bx-.5)*w*.45,Math.min(h,3),(bz-.5)*d*.45,.3,.3,.03,dark)}
  if(h>3.2)k.box(0,3,-d/2+.2,w,h-3,.4,ctr);return g}
 if(/car|suv|pickup|motorcycle/i.test(n)&&/^a-/.test(r)){return g}
 if(r==='c-half'||r==='c-hoop'){var bx2=r==='c-half'?0:0;k.box(0,0,-d/2+.6,.4,10,.4,exMat(T,0x3a3a3a,{m:.5}));k.box(0,9.5,-d/2+.3,6,3.5,.15,exMat(T,0xf4f4f4,{op:.85}));k.cyl(0,10,-d/2+1.6,.75,.75,.06,exMat(T,0xff5a1f,{m:.4}));return g}
 if(/net|cage|batting|golf/i.test(n)){var net=exMat(T,0x222222,{op:.35,r:1,side:T.DoubleSide});var nh=h;
  k.box(0,nh-.05,0,w,.05,d,net);k.box(-w/2,0,0,.05,nh,d,net);k.box(w/2,0,0,.05,nh,d,net);k.box(0,0,-d/2,w,nh,.05,net);
  if(/golf/i.test(n)){k.box(0,.02,0,w*.8,.03,d*.6,exMat(T,0x3f8a4a,{r:1}));scr(0,1,-d/2+.1,w*.85,nh-2,0x8fd0ff)}return g}
 if(/sauna|booth|enclosure|spray|powder-coat|curing oven/i.test(n)){k.box(0,0,0,w,h,d,/sauna/i.test(n)?wood:exMat(T,0xc9ccd0,{m:.3,r:.5}));k.box(0,0,d/2+.01,Math.min(3,w*.4),Math.min(7,h-.4),.04,dark);return g}
 if(/lift/i.test(n)&&/^a-/.test(r)){var lc=exMat(T,0x2b62c4,{m:.3,r:.5});if(r==='a-lift2'){k.box(-w/2+.6,0,0,1.2,h,1.2,lc);k.box(w/2-.6,0,0,1.2,h,1.2,lc);k.box(0,h-.6,0,w,.4,.6,lc)}else{[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.4),0,s[1]*(d/2-.4),.6,h,.6,lc)});k.box(-w/4,4,0,1.6,.3,d-1,lc);k.box(w/4,4,0,1.6,.3,d-1,lc)}return g}
 if(r==='s-gantry'){var gm=exMat(T,0xe2b21b,{r:.5});k.box(-w/2+.3,0,0,.4,h,.4,gm);k.box(w/2-.3,0,0,.4,h,.4,gm);k.box(-w/2+.3,0,0,.4,.3,d,gm);k.box(w/2-.3,0,0,.4,.3,d,gm);k.box(0,h-.6,0,w,.6,.5,gm);return g}
 if(/^(f-rack|f-cable|c-ninja|c-climb)$/.test(r)){var fm=exMat(T,0x2a2a2a,{m:.5,r:.4});if(r==='c-climb'){k.box(0,0,-d/2+.6,w,h,1.2,exMat(T,0x6a8ab0,{r:.9}));for(var hh=0;hh<30;hh++)k.box((Math.sin(hh*7.1)*.45)*w,1+((hh*2.7)%(h-2)),-d/2+1.25,.4,.3,.15,exMat(T,[0xff4f4f,0x4fb0ff,0xffd24f,0x4fff8a][hh%4]));k.box(0,0,d/4,w,.8,d/2,exMat(T,0x2d3f5a,{r:1}));return g}
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.15),0,s[1]*(d/2-.15),.25,h,.25,fm)});k.box(0,h-.25,-d/2+.15,w,.25,.25,fm);k.box(0,h-.25,d/2-.15,w,.25,.25,fm);if(r==='f-rack')k.box(0,0,0,w+1,.1,d+1,exMat(T,0x4a3a2a,{r:1}));return g}
 if(r==='mu-upright'||r==='mu-grand'){var pn=exMat(T,0x111111,{r:.15});if(r==='mu-grand'){k.legs(w,d,2.2,.25,pn);k.box(0,2.2,0,w,1,d,pn);k.box(0,2.6,d/2-.4,w*.9,.15,.6,white)}else{k.box(0,0,0,w,h,d,pn);k.box(0,2.3,d/2,w*.9,.15,.5,white)}return g}
 if(r==='mu-drums'||r==='mu-edrums'){[[-.25,.1,.55],[.25,.1,.5],[0,-.2,.9],[-.35,-.3,.4],[.35,-.3,.4]].forEach(function(t,i){k.cyl(t[0]*w,i===2?0:2,t[1]*d,t[2]*.8,t[2]*.8,i===2?1.6:.5,exMat(T,i===2?0xb22a2a:0xdddddd,{r:.4}))});k.cyl(0,0,.25*d,.4,.4,1.6,dark);return g}
 if(r==='ht-row3'){var rc=exMat(T,0x2a2a2e,{r:.8}),n3=Math.max(1,Math.round(w/3));for(var q=0;q<n3;q++){var cx=-w/2+w*(q+.5)/n3;k.box(cx,0,0,w/n3-.3,1.6,d,rc);k.box(cx,1.6,-d/2+.4,w/n3-.3,1.8,.8,rc)}return g}
 if(r==='ht-speaker'||r==='ht-sub'){k.box(0,0,0,w,h,d,dark);k.cyl(0,h*.35,d/2,.35,.35,.04,exMat(T,0x333333));return g}
 if(/^(m-laser|mf-fiber|m-uvflat|m-large|w-cnc|mf-plasma|mf-water|m-weld2|m-mill)/.test(r)){var mc=exMat(T,/laser|fiber|uv/.test(r)?0xf0f0ee:0x9aa0a6,{m:.2,r:.5});
  if(/plasma|water|w-cnc|m-weld2/.test(r)){k.legs(w,d,2.8,.4,dark);k.box(0,2.8,0,w,.4,d,mc);k.box(0,3.2,0,w-.4,.05,d-.4,exMat(T,/water/.test(r)?0x7fb8d8:0x55585e,{op:/water/.test(r)?.8:1}));k.box(0,3.2,0,.6,h-3.2,d,exMat(T,0xe0701f));k.box(0,h-.7,0,w,.5,.5,exMat(T,0xe0701f));return g}
  k.box(0,0,0,w,h*.55,d,mc);k.box(0,h*.55,-.05*d,w,h*.4,d*.9,mc);k.box(0,h*.7,d*.4,w*.8,h*.2,.05,exMat(T,0xff6a2a,{op:.55,r:.1}));return g}
 // fallback: a tidy block with a plinth and a lighter top
 k.box(0,0,0,w,.25,d,dark);k.box(0,.25,0,w-.06,h-.35,d-.06,body);k.box(0,h-.1,0,w,.1,d,bodyL);return g}

function exCeilShape(T,c,w,d,M){var g=new T.Group(),k=Kit(T,g),r=c.r,lamp=/^cl-/.test(r);
 if(r==='cc-hvls'||r==='cc-fan'){var rr=Math.min(w,d)/2;k.cyl(0,-.6,0,.3,.3,.5,M.steel);for(var i=0;i<(r==='cc-hvls'?6:5);i++){var b=new T.Mesh(new T.BoxGeometry(rr*.9,.06,r==='cc-hvls'?.7:.45),exMat(T,r==='cc-hvls'?0xcfe0e4:0x8a6a4a));var a=i*Math.PI*2/(r==='cc-hvls'?6:5);b.position.set(Math.cos(a)*rr*.5,-.4,Math.sin(a)*rr*.5);b.rotation.y=-a;b.castShadow=true;g.add(b)}return {g:g}}
 if(/^cs-/.test(r)){k.box(0,-.4,0,w,.4,d,r==='cs-inceil'?M.white:M.dark);return {g:g}}
 if(r==='cc-unith'||r==='cc-cassette'||r==='cc-irtube'){k.box(0,-.8,0,w,.8,d,r==='cc-irtube'?exMat(T,0xb0aaa0,{m:.4}):M.white);if(r==='cc-irtube')k.box(0,-.85,0,w-.4,.1,.3,exMat(T,0xff6a2a,{e:0xff4a1a,ei:.8}));return {g:g}}
 var lc=r==='cl-growb'||r==='cl-growp'?0xd28cff:r==='cl-black'?0x9a5cff:r==='cl-stage'?0x8fe0ff:0xfff1cf;
 var glow=exMat(T,0xffffff,{e:lc,ei:2.2,r:.3});
 if(r==='cl-hbr'||r==='cl-cage'||r==='cl-down'||r==='cl-stage'){var rad=Math.min(w,d)/2;k.cyl(0,-.7,0,rad*.35,rad,.7,M.dark,24);var lens=new T.Mesh(new T.CircleGeometry(rad*.9,24),glow);lens.rotation.x=Math.PI/2;lens.position.y=-.71;g.add(lens)}
 else{k.box(0,-.3,0,w,.3,d,M.dark);var pl=new T.Mesh(new T.PlaneGeometry(w*.92,d*.8),glow);pl.rotation.x=Math.PI/2;pl.position.y=-.31;g.add(pl)}
 return {g:g,light:lamp?lc:null}}

/* ---------- the scene ---------- */
function exBuild(){var T=EX.T,W=P.room.w,D=P.room.d,H=P.room.h||10,S=new T.Scene();S.background=new T.Color(0x1b1b1d);S.fog=new T.Fog(0x1b1b1d,Math.max(W,D)*1.2,Math.max(W,D)*3);
 var M={dark:exMat(T,0x26262a,{r:.5}),steel:exMat(T,0xaeb3b8,{m:.7,r:.35}),white:exMat(T,0xeeece6,{r:.5}),felt:exMat(T,0x1f6b4a,{r:.95}),
  wood:exMat(T,0x6b4027,{r:.45,map:exTex(T,function(g,s){g.fillStyle='#6b4027';g.fillRect(0,0,s,s);for(var i=0;i<70;i++){g.strokeStyle='rgba(30,15,5,'+(Math.random()*.25)+')';g.lineWidth=1+Math.random()*3;g.beginPath();var y=Math.random()*s;g.moveTo(0,y);g.bezierCurveTo(s/3,y+8,s*2/3,y-8,s,y);g.stroke()}},256,[1,1])})};
 var floor=new T.Mesh(new T.PlaneGeometry(W,D),exMat(T,0xb9b4ab,{r:.55,map:exTex(T,function(g,s){g.fillStyle='#aaa59c';g.fillRect(0,0,s,s);for(var i=0;i<s*s/8;i++){g.fillStyle='rgba('+(Math.random()<.5?'0,0,0':'255,255,255')+','+(Math.random()*.05)+')';g.fillRect(Math.random()*s,Math.random()*s,2,2)}g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=3;g.strokeRect(0,0,s,s);for(var k=0;k<12;k++){g.fillStyle='rgba(80,70,60,'+(Math.random()*.05)+')';g.beginPath();g.arc(Math.random()*s,Math.random()*s,20+Math.random()*70,0,7);g.fill()}},512,[W/10,D/10])}));
 floor.rotation.x=-Math.PI/2;floor.position.set(W/2,0,D/2);floor.receiveShadow=true;S.add(floor);
 var wallM=exMat(T,0xc4c8cc,{m:.25,r:.55,map:exTex(T,function(g,s){g.fillStyle='#c4c8cc';g.fillRect(0,0,s,s);for(var x=0;x<s;x+=16){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x,0,6,s);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x+6,0,3,s)}},256,[1,1])});
 var wall=function(x,z,w,d,len){var m=new T.Mesh(new T.BoxGeometry(w,H,d),wallM.clone());m.material.map=wallM.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(len/6,H/6);m.position.set(x,H/2,z);m.receiveShadow=true;S.add(m)};
 wall(W/2,-.25,W+1,.5,W);wall(W/2,D+.25,W+1,.5,W);wall(-.25,D/2,.5,D,D);wall(W+.25,D/2,.5,D,D);
 var ceil=new T.Mesh(new T.PlaneGeometry(W,D),exMat(T,0x2b2c30,{r:.9}));ceil.rotation.x=Math.PI/2;ceil.position.set(W/2,H,D/2);S.add(ceil);
 var bm=exMat(T,0x3a3c42,{m:.5,r:.45});for(var bx=Math.min(8,W/3);bx<W;bx+=Math.max(8,W/6)){var be=new T.Mesh(new T.BoxGeometry(.5,1.2,D),bm);be.position.set(bx,H-.6,D/2);S.add(be)}
 // objects
 EX.solid=[];var lights=[];
 P.items.forEach(function(it){var c=defOf(it);if(!c)return;var m=dims(it,it.rot),w0=it.w||c.w,d0=it.d||c.d,cx=it.x+m.w/2,cz=it.y+m.d/2;
  if(c.ceiling){var cs=exCeilShape(T,c,w0,d0,M),drop=c.drop||0;cs.g.position.set(cx,H-drop,cz);cs.g.rotation.y=-(it.rot||0)*Math.PI/2;
   if(drop>.4){var rod=new T.Mesh(new T.CylinderGeometry(.03,.03,drop),M.dark);rod.position.set(cx,H-drop/2,cz);S.add(rod)}S.add(cs.g);if(cs.light)lights.push({x:cx,z:cz,y:H-drop-.8,col:cs.light,c:c});return}
  var h=c.h||Math.max(2,Math.min(6,Math.min(w0,d0)));var g=exShape(T,c,w0,d0,h,M);g.position.set(cx,0,cz);g.rotation.y=-(it.rot||0)*Math.PI/2;S.add(g);
  if(/^a-(car|pickup|evbay)$/.test(c.r)||NOWALK.test(c.r)){var ln=new T.Mesh(new T.PlaneGeometry(m.w,m.d),exMat(T,/^c-/.test(c.r)?0x3c6e9e:0xffffff,{op:/^c-/.test(c.r)?.55:.12,r:.8}));ln.rotation.x=-Math.PI/2;ln.position.set(cx,.02,cz);S.add(ln)}
  if(!NOWALK.test(c.r)&&h>.6)EX.solid.push({x:it.x,z:it.y,w:m.w,d:m.d})});
 // light: ceiling lights do the work; with none placed, soft work light so the room is still readable
 S.add(new T.HemisphereLight(0xcfd6e0,0x2a2622,lights.length?.5:1.1));
 if(!lights.length){var dl=new T.DirectionalLight(0xffffff,.7);dl.position.set(W*.3,H*3,D*.2);dl.target.position.set(W/2,0,D/2);dl.castShadow=true;dl.shadow.mapSize.set(1024,1024);var sc=dl.shadow.camera;sc.left=-W;sc.right=W;sc.top=D;sc.bottom=-D;sc.far=H*6;S.add(dl);S.add(dl.target);
  var nx=Math.max(1,Math.min(4,Math.round(W/15))),nz=Math.max(1,Math.min(3,Math.round(D/15)));for(var ix=0;ix<nx;ix++)for(var iz=0;iz<nz;iz++){var pl=new T.PointLight(0xfff4e0,Math.max(40,H*H*.9),Math.max(W,D),1.5);pl.position.set(W*(ix+.5)/nx,H-1,D*(iz+.5)/nz);S.add(pl)}}
 var maxL=24,shad=4,lim=lights.slice(0,maxL);
 lim.forEach(function(L,i){var big=/General|Specialty/.test(L.c.c),pw=(L.c.p&&L.c.p[1])||60;var sp=new T.SpotLight(L.col,Math.min(400,pw*(big?1.6:2.2)),Math.max(14,H*2.2),big?Math.PI/3:Math.PI/4,.6,1.6);
  sp.position.set(L.x,L.y,L.z);sp.target.position.set(L.x,0,L.z);if(i<shad){sp.castShadow=true;sp.shadow.mapSize.set(1024,1024);sp.shadow.bias=-.0006}S.add(sp);S.add(sp.target)});
 if(lights.length>maxL){S.children.filter(function(o){return o.isHemisphereLight}).forEach(function(h){h.intensity=.6})}
 // glowing screens light their surroundings a little
 return S}
function exSpawn(){var W=P.room.w,D=P.room.d,best=null,bs=-1;for(var y=1.5;y<D-1;y+=1)for(var x=1.5;x<W-1;x+=1){if(exHit(x,y))continue;var sc=-Math.hypot(x-W/2,y-(D-2))+(exClear(x,y)*2);if(sc>bs){bs=sc;best={x:x,y:y}}}
 return best||{x:W/2,y:D/2}}
function exClear(x,z){var m=4;EX.solid.forEach(function(s){var dx=Math.max(s.x-x,0,x-(s.x+s.w)),dz=Math.max(s.z-z,0,z-(s.z+s.d));m=Math.min(m,Math.hypot(dx,dz))});return m}
function exHit(x,z){var W=P.room.w,D=P.room.d;if(x<RAD||z<RAD||x>W-RAD||z>D-RAD)return true;for(var i=0;i<EX.solid.length;i++){var s=EX.solid[i],dx=Math.max(s.x-x,0,x-(s.x+s.w)),dz=Math.max(s.z-z,0,z-(s.z+s.d));if(dx*dx+dz*dz<RAD*RAD)return true}return false}
function exStart(){var T=EX.T,host=$('#explore');host.innerHTML='<canvas id="excv"></canvas><div class="exhud">'+(TOUCH?'Left thumb: walk · drag anywhere else: look':'Click to look around · WASD / arrows to walk · Shift to run · Esc to free the mouse')+'</div><div class="exjoy" id="exjoy"><i></i></div>'+(P.items.some(function(i){var c=defOf(i);return c&&c.ceiling&&/^cl-/.test(c.r)})?'':'<div class="exnote">No ceiling lights yet, so the room has soft work light. Add lights in Ceiling view to see them here.</div>');
 var cv=$('#excv'),r=EX.r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio||1,TOUCH?1.5:2));r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.toneMapping=T.ACESFilmicToneMapping;r.outputColorSpace=T.SRGBColorSpace;
 EX.S=exBuild();EX.cam=new T.PerspectiveCamera(70,1,.1,600);var sp=exSpawn();EX.pos={x:sp.x,z:sp.y};EX.yaw=0;EX.pitch=-.05;
 var size=function(){var b=host.getBoundingClientRect();r.setSize(b.width,b.height,false);EX.cam.aspect=b.width/Math.max(1,b.height);EX.cam.updateProjectionMatrix()};size();EX.size=size;
 // desktop: pointer lock look; touch: joystick + drag look
 cv.onclick=function(){if(!TOUCH&&cv.requestPointerLock)cv.requestPointerLock()};
 var joy=$('#exjoy'),jk=joy.querySelector('i');EX.joy={x:0,y:0,id:null};EX.look=null;
 cv.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse')return;var b=joy.getBoundingClientRect();
  if(e.clientX<b.right+40&&e.clientY>b.top-40&&EX.joy.id==null){EX.joy.id=e.pointerId;EX.joy.cx=b.left+b.width/2;EX.joy.cy=b.top+b.height/2}else if(!EX.look)EX.look={id:e.pointerId,x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId)});
 cv.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'){if(document.pointerLockElement===cv){EX.yaw-=e.movementX*.0025;EX.pitch=Math.max(-1.3,Math.min(1.3,EX.pitch-e.movementY*.0025))}return}
  if(EX.joy.id===e.pointerId){var dx=e.clientX-EX.joy.cx,dy=e.clientY-EX.joy.cy,L=Math.hypot(dx,dy),R=44;if(L>R){dx*=R/L;dy*=R/L}EX.joy.x=dx/R;EX.joy.y=dy/R;jk.style.transform='translate('+dx+'px,'+dy+'px)'}
  else if(EX.look&&EX.look.id===e.pointerId){EX.yaw-=(e.clientX-EX.look.x)*.005;EX.pitch=Math.max(-1.3,Math.min(1.3,EX.pitch-(e.clientY-EX.look.y)*.005));EX.look.x=e.clientX;EX.look.y=e.clientY}});
 var up=function(e){if(EX.joy.id===e.pointerId){EX.joy.id=null;EX.joy.x=EX.joy.y=0;jk.style.transform=''}if(EX.look&&EX.look.id===e.pointerId)EX.look=null};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 EX.last=performance.now();var loop=function(t){if(!EX.on||!EX.r)return;var dt=Math.min(.05,(t-EX.last)/1000);EX.last=t;exStep(dt);EX.raf=requestAnimationFrame(loop)};EX.raf=requestAnimationFrame(loop)}
function exStep(dt){var k=EX.keys,f=(k.w||k.arrowup?1:0)-(k.s||k.arrowdown?1:0)-EX.joy.y,s=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0)+EX.joy.x,L=Math.hypot(f,s);
 if(L>0){if(L>1){f/=L;s/=L}var sp=(k.shift?RUN:WALK)*dt,sy=Math.sin(EX.yaw),cy=Math.cos(EX.yaw),dx=(-sy*f+cy*s)*sp,dz=(-cy*f-sy*s)*sp,p=EX.pos;
  if(!exHit(p.x+dx,p.z))p.x+=dx;if(!exHit(p.x,p.z+dz))p.z+=dz}
 var c=EX.cam;c.position.set(EX.pos.x,EYE,EX.pos.z);c.rotation.order='YXZ';c.rotation.y=EX.yaw;c.rotation.x=EX.pitch;EX.r.render(EX.S,c)}
window.addEventListener('keydown',function(e){if(!EX.on||/INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||''))return;var k=e.key.toLowerCase();if(/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright|shift)$/.test(k)){EX.keys[k]=true;e.preventDefault()}});
window.addEventListener('keyup',function(e){EX.keys[e.key.toLowerCase()]=false});
window.addEventListener('blur',function(){EX.keys={}});
window.addEventListener('resize',function(){if(EX.on&&EX.size)EX.size()});
