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

/* ---------- Arcade & Gaming: detailed shapes (still just boxes, cylinders and a few spheres; materials are shared) ---------- */
var EXMC={};
function mc(T,hex,o){o=o||{};var key=hex+'|'+JSON.stringify(o);if(!EXMC[key])EXMC[key]=exMat(T,hex,o);return EXMC[key]}
// little drawn "screens" so cabinets and monitors read as screens, not flat colour (a handful of shared textures)
var EXST={};
function scrTex(T,kind){if(EXST[kind])return EXST[kind];var W=256,H=kind==='marquee'||kind==='dmd'||kind==='score'||kind==='popcorn'?80:160,c=document.createElement('canvas');c.width=W;c.height=H;var g=c.getContext('2d'),rnd=(function(s){return function(){s=(s*9301+49297)%233280;return s/233280}})(kind.length*77+3);
 var grad=function(a,b){var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,W,H)};
 if(kind==='game'){grad('#0b0c2a','#2a0b3a');for(var i=0;i<40;i++){g.fillStyle='rgba(255,255,255,'+(.3+rnd()*.7)+')';g.fillRect(rnd()*W,rnd()*H*.7,2,2)}
  g.fillStyle='#38d0ff';for(var r=0;r<3;r++)for(var q=0;q<7;q++){var x=30+q*30,y=22+r*20;g.fillRect(x,y,14,8);g.fillRect(x-3,y+8,4,4);g.fillRect(x+13,y+8,4,4)}
  g.fillStyle='#ffe14a';g.fillRect(W/2-10,H-30,20,10);g.fillRect(W/2-3,H-38,6,8);g.fillStyle='#ff5ab4';g.font='bold 12px monospace';g.fillText('1UP 004200',8,14);g.fillText('HI 091350',W-86,14)}
 else if(kind==='race'){grad('#7fc4ff','#d8efff');g.fillStyle='#4a8a3a';g.fillRect(0,H*.55,W,H*.45);g.fillStyle='#555';g.beginPath();g.moveTo(W*.42,H*.55);g.lineTo(W*.58,H*.55);g.lineTo(W*.95,H);g.lineTo(W*.05,H);g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.setLineDash([10,10]);g.beginPath();g.moveTo(W/2,H*.56);g.lineTo(W/2,H);g.stroke();g.setLineDash([]);g.fillStyle='#d92b2b';g.fillRect(W/2-18,H-44,36,22)}
 else if(kind==='desktop'){grad('#1a1f3a','#3a1f5a');g.fillStyle='rgba(255,255,255,.08)';for(var k2=0;k2<6;k2++)g.fillRect(20+k2*36,30+((k2*37)%50),26,18);g.fillStyle='#7a5cff';g.fillRect(0,H-14,W,14);g.fillStyle='#fff';g.font='bold 11px sans-serif';g.fillText('PLAYER 1  ●  READY',12,H-4)}
 else if(kind==='dmd'){g.fillStyle='#120700';g.fillRect(0,0,W,H);g.fillStyle='#ff8a1a';g.font='bold 34px monospace';g.fillText('2,450,000',14,52);for(var y2=0;y2<H;y2+=4)for(var x2=0;x2<W;x2+=4){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x2+3,y2,1,4);g.fillRect(x2,y2+3,4,1)}}
 else if(kind==='score'){g.fillStyle='#050505';g.fillRect(0,0,W,H);g.fillStyle='#ff3b2a';g.font='bold 44px monospace';g.fillText('07',20,58);g.fillStyle='#ffcc33';g.fillText('12',W-80,58);g.fillStyle='#38d0ff';g.font='bold 16px monospace';g.fillText('TIME 0:42',W/2-42,40)}
 else if(kind==='sports'||kind==='sports2'){var two=kind==='sports2';grad(two?'#2f6a2a':'#3a7a2e',two?'#4d8a3a':'#5a9a46');g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;
  if(two){g.strokeRect(20,20,W-40,H-40);g.beginPath();g.arc(W/2,H/2,24,0,7);g.stroke();g.beginPath();g.moveTo(W/2,20);g.lineTo(W/2,H-20);g.stroke()}else{for(var yl=0;yl<7;yl++){g.beginPath();g.moveTo(10+yl*38,10);g.lineTo(10+yl*38,H-10);g.stroke()}}
  for(var pl=0;pl<12;pl++){g.fillStyle=pl%2?'#e8e8f0':'#d9302f';g.beginPath();g.arc(30+((pl*53)%200),30+((pl*37)%100),4,0,7);g.fill()}g.fillStyle='rgba(0,0,0,.75)';g.fillRect(8,H-24,120,16);g.fillStyle='#fff';g.font='bold 11px sans-serif';g.fillText(two?'HOM 2  -  1 AWY':'Q3  21 - 17  4:12',13,H-12)}
 else if(kind==='movie'){var gm=g.createLinearGradient(0,0,0,H);gm.addColorStop(0,'#1d2a5a');gm.addColorStop(.55,'#e06a3a');gm.addColorStop(.62,'#f3b25a');gm.addColorStop(1,'#2a1a2a');g.fillStyle=gm;g.fillRect(0,0,W,H);g.fillStyle='#ffe2a0';g.beginPath();g.arc(W*.62,H*.58,18,0,7);g.fill();
  g.fillStyle='#1a1020';g.beginPath();g.moveTo(0,H);g.lineTo(0,H*.66);g.lineTo(60,H*.5);g.lineTo(110,H*.64);g.lineTo(170,H*.46);g.lineTo(W,H*.68);g.lineTo(W,H);g.fill();g.fillStyle='#000';g.fillRect(0,0,W,12);g.fillRect(0,H-12,W,12)}
 else if(kind==='scope'){g.fillStyle='#06140c';g.fillRect(0,0,W,H);g.strokeStyle='rgba(80,160,110,.35)';g.lineWidth=1;for(var gx=0;gx<=W;gx+=32){g.beginPath();g.moveTo(gx,0);g.lineTo(gx,H);g.stroke()}for(var gy=0;gy<=H;gy+=32){g.beginPath();g.moveTo(0,gy);g.lineTo(W,gy);g.stroke()}
  g.strokeStyle='#f3e03a';g.lineWidth=2.5;g.beginPath();for(var sx=0;sx<W;sx++){var v=H*.35+Math.sin(sx/14)*22;sx?g.lineTo(sx,v):g.moveTo(sx,v)}g.stroke();g.strokeStyle='#3ad0f3';g.beginPath();for(var sx2=0;sx2<W;sx2++){var v2=H*.72+((sx2>>4)%2?-14:14);sx2?g.lineTo(sx2,v2):g.moveTo(sx2,v2)}g.stroke()}
 else{var gr2=g.createLinearGradient(0,0,W,0);gr2.addColorStop(0,'#ff3cac');gr2.addColorStop(.5,'#784ba0');gr2.addColorStop(1,'#2b86c5');g.fillStyle=gr2;g.fillRect(0,0,W,H);g.fillStyle='rgba(255,255,255,.95)';g.font='900 44px sans-serif';g.textAlign='center';g.fillText(kind==='marquee2'?'GAME ON':kind==='popcorn'?'POPCORN':'PLAY',W/2,H/2+15);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=3;g.strokeRect(6,6,W-12,H-12)}
 var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return EXST[kind]=t}
function scrMat(T,kind,ei){var key='scr|'+kind+'|'+(ei||1.15);if(!EXMC[key])EXMC[key]=new T.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveMap:scrTex(T,kind),emissiveIntensity:ei||1.15,roughness:.3});return EXMC[key]}
function exArcade(T,c,w,d,h,M,k,g){var r=c.r;if(!/^(g-|x-motion$)/.test(r))return false;
 var blk=mc(T,0x1c1c1f,{r:.5}),chrome=mc(T,0xcfd3d6,{m:.85,r:.25}),glass=mc(T,0xdfeeff,{op:.22,r:.05}),rail=M.wood,felt=M.felt;
 var lit=function(hex,ei){return mc(T,0x111111,{e:hex,ei:ei||1.5,r:.35})};
 var sph=function(x,y,z,rad,mat){var m=new T.Mesh(new T.SphereGeometry(rad,12,8),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 var tor=function(x,y,z,R,rr,mat,rx){var m=new T.Mesh(new T.TorusGeometry(R,rr,8,24),mat);m.position.set(x,y,z);m.rotation.x=rx==null?Math.PI/2:rx;m.castShadow=true;g.add(m);return m};
 var tilt=function(x,yc,z,bw,bh,bd,mat,ax){var m=new T.Mesh(new T.BoxGeometry(bw,bh,bd),mat);m.position.set(x,yc,z);m.rotation.x=ax||0;m.castShadow=m.receiveShadow=true;g.add(m);return m};
 var btn=function(x,y,z,hex){k.cyl(x,y,z,.07,.07,.05,mc(T,hex,{r:.3,e:hex,ei:.35}))};
 var stick=function(x,y,z){k.cyl(x,y,z,.025,.025,.28,chrome);sph(x,y+.32,z,.09,mc(T,0xd92b2b,{r:.3}))};
 var legs=function(lw,ld,lh,t,mat){k.legs(lw,ld,lh,t,mat)};
 var hue=[0x6d2bd9,0xd92b6d,0x2b8fd9,0xd9902b,0x2bd98a][(c.n.length+r.length)%5];var art=mc(T,hue,{r:.55}),art2=mc(T,shade('#'+('00000'+hue.toString(16)).slice(-6),.45),{r:.6});
 switch(r){
 case 'g-cab':{var cw=w*.92,cd=d*.8,z0=-d/2+cd/2;
  k.box(0,0,z0,cw,2.7,cd,blk);k.box(-cw/2+.05,0,z0,.1,h-.2,cd,art);k.box(cw/2-.05,0,z0,.1,h-.2,cd,art);// side art
  k.box(0,0,z0+cd/2-.02,cw-.2,2.7,.06,art2);k.box(0,.9,z0+cd/2+.02,.8,1.1,.04,blk);[-.18,.18].forEach(function(x){k.box(x,1.6,z0+cd/2+.05,.12,.2,.03,lit(0xffcc33,1))});// coin door
  tilt(0,2.95,z0+cd/2-.05,cw-.2,.12,1.1,blk,-.25);stick(-cw*.22,2.98,z0+cd/2-.1);[0,1,2].forEach(function(i){btn(cw*.02+i*.22,2.98,z0+cd/2-.15,[0xff4f4f,0x4fb0ff,0xffd24f][i]);btn(cw*.02+i*.22,2.98,z0+cd/2-.38,[0x4fff8a,0xff4fd8,0xffffff][i])});
  k.box(0,3.1,z0-.1,cw-.2,2.1,cd-.6,blk);tilt(0,4.15,z0+cd/2-.45,cw-.35,1.6,.06,scrMat(T,'game'),.18);
  k.box(0,h-.95,z0,cw,.95,cd,blk);k.box(0,h-.85,z0+cd/2-.02,cw-.2,.7,.05,scrMat(T,'marquee',1.4));k.box(0,5.25,z0+cd/2-.2,cw-.3,.12,.05,mc(T,0x333333,{r:.9}));
  return true}
 case 'g-pin':{var pw=w*.75,pd=d*.72,pz=d/2-pd/2-.2;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(pw/2-.1),0,pz+s[1]*(pd/2-.15),.16,2.5,.16,chrome);k.cyl(s[0]*(pw/2-.1),0,pz+s[1]*(pd/2-.15),.09,.09,.05,blk)});
  tilt(0,3,pz,pw,.95,pd,art,.06);tilt(0,3.5,pz,pw-.2,.04,pd-.3,lit(0x4fa8ff,1.1),.06);tilt(0,3.53,pz,pw-.15,.02,pd-.25,glass,.06);
  k.box(0,2.6,pz+pd/2-.02,.9,.75,.05,blk);k.box(0,3.42,pz+pd/2+.02,pw,.08,.15,chrome);[-1,1].forEach(function(s){btn(s*(pw/2+.01),3.1,pz+pd/2-.3,0xffffff)});
  k.box(0,3.4,pz-pd/2-.05,pw,h-3.4,.7,art2);k.box(0,4.2,pz-pd/2+.32,pw-.2,1.5,.04,scrMat(T,'marquee2',1.2));k.box(0,3.75,pz-pd/2+.33,pw*.55,.28,.04,scrMat(T,'dmd',1.5));
  return true}
 case 'g-gun':{var gz=-d/2+1.4;k.box(0,0,gz,w,h-.8,2.8,blk);k.box(-w/2,0,gz,.12,h,2.8,art);k.box(w/2,0,gz,.12,h,2.8,art);
  k.box(0,1.8,gz+1.42,w-.4,h-3,.06,scrMat(T,'game'));k.box(0,h-.8,gz,w,.8,2.8,blk);k.box(0,h-.72,gz+1.42,w-.3,.6,.05,scrMat(T,'marquee',1.4));
  k.box(0,0,gz+1.6,w-.3,3,1.6,art2);tilt(0,3.05,gz+1.9,w-.3,.12,1.2,blk,-.15);
  [-1,1].forEach(function(s){var gx=s*w*.25;k.box(gx,3.1,gz+2,.3,.32,.5,mc(T,s<0?0xd92b2b:0x2b6fd9,{r:.4}));var gb=k.cyl(gx,3.32,gz+1.9,.06,.06,.6,blk);gb.rotation.x=Math.PI/2;gb.position.y=3.32;k.box(gx,2.9,gz+2.05,.1,.25,.15,blk)});
  [-1,1].forEach(function(s){k.box(s*(w/2+.05),.4,gz+1.3,.06,h-1,.06,lit(0x44ddff,1.2))});return true}
 case 'g-claw':{k.box(0,0,0,w,2.8,d,art);k.box(0,0,d/2-.02,w-.2,2.8,.05,art2);k.box(0,1.1,d/2+.02,.6,.7,.04,blk);k.box(0,2.8,d/2-.4,w-.2,.12,.8,blk);stick(-w*.2,2.9,d/2-.3);btn(w*.22,2.9,d/2-.3,0xff4f4f);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.06),2.8,s[1]*(d/2-.06),.12,2.8,.12,chrome)});
  k.box(0,2.85,0,w-.2,2.7,d-.2,glass);for(var i=0;i<14;i++)sph(-w*.32+((i*.618)%1)*w*.64,3.05+(i%3)*.18,-d*.32+((i*.371)%1)*d*.5,.16,mc(T,[0xff6b8a,0x6bc0ff,0xffd24f,0x8aff6b,0xd28cff][i%5],{r:.8}));
  k.box(0,5.25,0,.2,.08,d-.3,chrome);k.cyl(0,4.4,0,.015,.015,.85,chrome);k.cyl(0,4.25,0,.12,.08,.18,chrome);[0,1,2].forEach(function(i){var a=i*2.09;k.box(Math.cos(a)*.1,4.05,Math.sin(a)*.1,.04,.25,.04,chrome)});
  k.box(0,5.6,0,w,h-5.6,d,art);k.box(0,5.65,d/2+.01,w-.2,h-5.75,.04,scrMat(T,'marquee2',1.4));return true}
 case 'g-skee':{var rz=-d/2;k.box(-w/2+.08,0,0,.16,2.7,d,art);k.box(w/2-.08,0,0,.16,2.7,d,art);k.box(0,0,d/2-1.2,w-.3,2.4,2.4,art2);
  tilt(0,2.45,d/2-3.4,w-.3,.08,4.6,mc(T,0xc9a06a,{r:.5}),-.14);k.box(0,2.4,d/2-1.25,w-.4,.12,.9,mc(T,0x333333,{r:.7}));for(var b=0;b<5;b++)sph(-w*.3+b*.15*w,2.65,d/2-1.25,.15,mc(T,0x8a4a2a,{r:.4}));
  var tz=rz+1.3;k.box(0,0,rz+1,w-.3,3.4,2,blk);[[0,3.1,.75],[0,3.4,.5],[0,3.75,.3]].forEach(function(t){tor(0,t[1],tz,t[2],.05,chrome,Math.PI/2-.5)});
  k.box(0,3.4,rz+.3,w,h-3.4,.6,art);k.box(0,h-1.6,rz+.62,w-.3,.9,.04,scrMat(T,'score',1.4));k.box(0,h-.6,rz+.62,w-.3,.4,.04,scrMat(T,'marquee',1.4));
  [-1,1].forEach(function(s){k.box(s*(w/2-.08),2.7,0,.16,.3,d-2.5,glass)});return true}
 case 'g-bball':{var fz=d/2;k.box(0,0,fz-1.2,w,3,2.4,art);k.box(0,1,fz+.01,.8,.8,.04,blk);tilt(0,2.6,0,w-.3,.08,d-2.8,mc(T,0x2f6a3a,{r:.8}),-.18);
  [-1,1].forEach(function(s){k.box(s*(w/2-.05),0,-.5,.1,h-1,d-2.4,glass)});k.box(0,0,-d/2+.5,w,h-.2,1,art2);
  k.box(0,5.4,-d/2+1.02,w*.6,1.6,.06,mc(T,0xf4f4f4,{op:.85,r:.2}));k.box(0,5.4,-d/2+1.05,w*.25,.6,.02,mc(T,0xff5a1f));tor(0,5.6,-d/2+1.55,.38,.035,mc(T,0xff5a1f,{m:.4}));
  k.cyl(0,4.95,-d/2+1.55,.36,.26,.65,mc(T,0xffffff,{op:.45,r:1}),12);k.box(0,h-.9,-d/2+1.02,w-.3,.6,.05,scrMat(T,'score',1.4));sph(.4,3,0,.42,mc(T,0xe0701f,{r:.7}));return true}
 case 'g-darts':{var bz=-d/2;k.box(0,0,bz+.3,w,h,.6,art2);k.box(0,0,bz+.62,w-.3,3.4,.05,art);
  [[.75,0x1c1c1c],[.66,0x2b6a3a],[.6,0xeee3c8],[.42,0xc23a2a],[.36,0xeee3c8],[.1,0x2b6a3a],[.05,0xc23a2a]].forEach(function(rg,i){k.cyl(0,5.2,bz+.64+i*.012,rg[0],rg[0],.02,mc(T,rg[1],{r:.8}),28).rotation.x=Math.PI/2});
  k.box(0,h-1,bz+.63,w-.4,.6,.04,scrMat(T,'score',1.3));k.box(0,3.6,bz+.65,w-.6,.4,.04,lit(0x44ddff,1.2));k.box(0,.01,bz+7.75,2,.02,.12,mc(T,0xd9d9d9));// oche at 7'9"
  return true}
 case 'g-airh':{legs(w,d,2.2,.35,blk);k.box(0,2.2,0,w,.42,d,art);k.box(0,2.6,0,w-.3,.04,d-.3,M.white);
  k.box(0,2.62,0,w-.3,.01,.05,mc(T,0xd92b2b));[-1,1].forEach(function(s){tor(0,2.63,s*(d/2-1),.5,.025,mc(T,0x2b6fd9),Math.PI/2);k.box(0,2.6,s*(d/2-.15),1.2,.25,.12,blk)});
  [[-1,0x2b6fd9],[1,0xd92b2b]].forEach(function(p){k.cyl(0,2.64,p[0]*(d/2-.9),.22,.22,.12,mc(T,p[1],{r:.35}));k.cyl(0,2.76,p[0]*(d/2-.9),.07,.07,.12,mc(T,p[1],{r:.35}))});k.cyl(.3,2.64,.2,.12,.12,.03,mc(T,0xff3b2a,{r:.3}));
  [-1,1].forEach(function(s){k.box(s*(w/2-.15),2.6,0,.3,.25,d,art2)});k.box(w/2-.4,2.85,0,.12,1.6,.12,chrome);k.box(w/2-.4,4.3,0,.2,.5,1.6,blk);k.box(w/2-.29,4.35,0,.02,.4,1.4,lit(0xff3b2a,1.8));return true}
 case 'g-foos':{legs(w,d,2.2,.3,blk);k.box(0,2.2,0,w,.12,d,art);[-1,1].forEach(function(s){k.box(s*(w/2-.06),2.2,0,.12,.8,d,art);k.box(0,2.2,s*(d/2-.06),w,.8,.12,art);k.box(0,2.6,s*(d/2-.06),.7,.25,.13,blk)});k.box(0,2.32,0,w-.24,.03,d-.24,mc(T,0x2f8a3a,{r:.85}));k.box(0,2.35,0,w-.3,.005,.04,M.white);k.cyl(0,2.35,0,.35,.35,.005,M.white);k.cyl(0,2.36,0,.32,.32,.006,mc(T,0x2f8a3a,{r:.85}));
  for(var i2=0;i2<8;i2++){var rz2=-d/2+.5+i2*(d-1)/7,team=(i2===0||i2===1||i2===3||i2===5)?0xd92b2b:0x2b6fd9;var rod=k.cyl(0,2.75,rz2,.025,.025,w+1.2,chrome);rod.rotation.z=Math.PI/2;rod.position.y=2.75;
   var hx=(i2%2?1:-1)*(w/2+.45);var hd=k.cyl(hx,2.75,rz2,.07,.07,.4,blk);hd.rotation.z=Math.PI/2;hd.position.y=2.75;var np=[1,2,5,3,3,5,2,1][i2];for(var q=0;q<np;q++)k.box(-w*.35+(np>1?q*w*.7/(np-1):w*.35),2.4,rz2,.12,.42,.09,mc(T,team,{r:.4}))}
  return true}
 case 'g-shuffle':{legs(w,d,2,.3,blk);k.box(0,2,0,w,.45,d,M.wood);k.box(0,2.45,0,w-.5,.06,d-.6,mc(T,0xe8d3a8,{r:.18}));[-1,1].forEach(function(s){k.box(s*(w/2-.12),2.42,0,.24,.18,d,blk)});
  [1,2,3].forEach(function(n){[-1,1].forEach(function(s){k.box(0,2.515,s*(d/2-.4-n*.7),w-.5,.005,.03,mc(T,0x8a2a2a))})});[[.2,0xd92b2b],[-.25,0x2b6fd9],[.1,0xd92b2b],[-.05,0x2b6fd9]].forEach(function(p,i){k.cyl(p[0],2.51,d/2-1.5-i*.4,.11,.11,.06,mc(T,p[1],{m:.5,r:.3}))});return true}
 case 'g-pool':{var tw=w-.2,td=d-.2;[[-1,-1],[1,-1],[-1,1],[1,1],[-1,0],[1,0]].forEach(function(s){if(!s[1]&&false)return;k.box(s[0]*(tw/2-.35),0,s[1]*(td/2-.5),.42,2.15,.42,rail)});
  k.box(0,2.15,0,tw,.3,td,rail);k.box(0,2.45,0,tw-.6,.06,td-.6,felt);[[-1,0],[1,0],[0,-1],[0,1]].forEach(function(s){k.box(s[0]*(tw/2-.17),2.45,s[1]*(td/2-.17),s[0]?.34:tw,.2,s[1]?.34:td,rail)});
  [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]].forEach(function(s){k.cyl(s[0]*(tw/2-.32),2.47,s[1]*(td/2-.32),.16,.16,.06,blk)});
  for(var di=1;di<4;di++){[-1,1].forEach(function(s){k.cyl(s*(tw/2-.17),2.651,-td/2+di*td/4,.025,.025,.01,M.white);k.cyl(-tw/2+di*tw/4,2.651,s*(td/2-.17),.025,.025,.01,M.white)})}
  var bc=[0xe6c52f,0x2b4fd9,0xd23b2f,0x6b2bb0,0xe0701f,0x1f8a3a,0x7a2a1a,0x111111,0xe6c52f,0x2b4fd9,0xd23b2f,0x6b2bb0,0xe0701f,0x1f8a3a,0x7a2a1a],bi=0;
  for(var row=0;row<5;row++)for(var j=0;j<=row;j++){sph((j-row/2)*.2,2.59,-td/4-row*.175,.095,mc(T,bc[bi++%15],{r:.15}))}sph(0,2.59,td/4,.095,mc(T,0xf8f8f2,{r:.15}));
  var cue=k.cyl(tw/2-.12,2.7,0,.02,.04,4.7,mc(T,0xc9a06a,{r:.4}));cue.rotation.x=Math.PI/2;cue.position.y=2.7;return true}
 case 'g-console':{var dz=-d/2+1.2;k.box(0,2.4,dz,w,.12,2.2,M.wood);[[-1],[1]].forEach(function(s){k.box(s[0]*(w/2-.15),0,dz,.1,2.4,2,blk)});
  [-1,0,1].forEach(function(i){var mon=k.box(i*1.65,2.75,dz-.6,1.6,.95,.08,blk);mon.rotation.y=-i*.35;var sc=k.box(i*1.65,2.8,dz-.55+(Math.abs(i)*.06),1.48,.85,.02,scrMat(T,i?'desktop':'game'));sc.rotation.y=-i*.35;k.box(i*1.65,2.52,dz-.6,.15,.25,.15,blk)});
  k.box(w/2-.55,0,dz-.4,.6,1.5,1.2,blk);k.box(w/2-.26,.2,dz-.4,.02,1.1,1,lit(0x44ffd8,1.2));k.box(0,2.52,dz+.4,1.3,.05,.45,blk);
  var cz=d/2-.9;k.cyl(0,0,cz,.6,.6,.12,blk);k.cyl(0,0,cz,.06,.06,1.5,chrome);k.box(0,1.5,cz,1.6,.35,1.5,mc(T,0xd92b2b,{r:.6}));k.box(0,1.85,cz+.6,1.5,2.2,.3,mc(T,0xd92b2b,{r:.6}));k.box(0,2.2,cz+.75,1.1,1.2,.05,blk);return true}
 case 'g-sim':case 'x-motion':{var al=mc(T,0x9aa0a6,{m:.7,r:.35});
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w*.22),0,s[1]*(d*.35),.15,.15,.15,al)});k.box(-w*.22,0,0,.15,.25,d*.75,al);k.box(w*.22,0,0,.15,.25,d*.75,al);
  if(r==='x-motion'){k.box(0,0,0,w*.6,.7,d*.6,blk);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.cyl(s[0]*w*.2,.7,s[1]*d*.2,.12,.12,.6,chrome)});k.box(0,1.3,0,w*.55,.12,d*.55,al)}
  var sb=r==='x-motion'?1.4:.25;k.box(0,sb,d*.15,1.6,.5,1.8,blk);k.box(0,sb+.5,d*.15+.75,1.6,2,.4,mc(T,0x2b2b2b,{r:.7}));k.box(0,sb+.5,d*.15+.55,1.1,1.6,.06,mc(T,0xd92b2b,{r:.6}));
  k.box(0,sb,-d*.2,.15,2.3,.15,al);tor(0,sb+2.4,-d*.2+.05,.5,.06,blk,-.3);k.box(0,sb,-d*.32,1,.35,.6,blk);
  if(r==='g-sim'){k.box(0,0,-d/2+.3,.15,3.5,.15,al);[-1,0,1].forEach(function(i){var m=k.box(i*1.85,3,-d/2+.45+Math.abs(i)*.55,1.8,1.05,.08,blk);m.rotation.y=-i*.55;var s2=k.box(i*1.85,3.05,-d/2+.5+Math.abs(i)*.55,1.7,.95,.02,scrMat(T,'race'));s2.rotation.y=-i*.55})}
  return true}
 case 'g-vr':{[[0,-d/2,w,.08],[0,d/2,w,.08],[-w/2,0,.08,d],[w/2,0,.08,d]].forEach(function(b){k.box(b[0],.01,b[1],b[2],.02,b[3],lit(0x44ddff,.9))});k.box(0,.005,0,w-.2,.01,d-.2,mc(T,0x3a3f4a,{r:1}));
  k.cyl(w/2-.4,0,d/2-.4,.25,.3,.08,blk);k.cyl(w/2-.4,0,d/2-.4,.04,.04,3.6,chrome);k.box(w/2-.4,3.6,d/2-.4,.55,.3,.3,M.white);return true}
 case 'g-poker':{k.cyl(0,0,0,.6,.9,.12,blk);k.cyl(0,0,0,.35,.35,2.2,blk);var tbl=k.cyl(0,2.2,0,1,1,.28,mc(T,0x3b2416,{r:.5}),32);tbl.scale.set(w/2,1,d/2);var fl=k.cyl(0,2.48,0,.86,.86,.03,felt,32);fl.scale.set(w/2,1,d/2);var rl=tor(0,2.5,0,1,.09,mc(T,0x1c1c1c,{r:.6}),Math.PI/2);rl.scale.set(w/2-.05,d/2-.05,1);
  for(var s3=0;s3<6;s3++)for(var cc=0;cc<4;cc++)k.cyl(-w*.28+s3*w*.11,2.51+cc*.035,(s3%2?.4:-.4)*d*.4,.09,.09,.03,mc(T,[0xd92b2b,0x2b6fd9,0x1c1c1c,0xffffff][cc],{r:.4}));return true}
 case 'g-cocktail':{k.box(0,0,0,w,h-.12,d,art2);k.box(0,h-.12,0,w,.12,d,blk);k.box(0,h-.01,0,w*.6,.02,d*.6,scrMat(T,'game'));k.box(0,h+.005,0,w*.95,.02,d*.95,glass);[-1,1].forEach(function(s){stick(-w*.25,h-.4,s*(d/2+.05));btn(w*.15,h-.35,s*(d/2+.02),0xff4f4f);btn(w*.3,h-.35,s*(d/2+.02),0x4fb0ff)});return true}
 case 'g-bubble':{k.box(0,0,0,w,3.2,d,art);k.box(0,3.2,0,w,.3,d,blk);var dm=new T.Mesh(new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),glass);dm.position.set(0,3.5,0);dm.scale.set(w/2-.15,.9,d/2-.15);g.add(dm);
  k.box(0,3.5,0,w-.5,.02,d-.6,M.white);for(var p2=0;p2<6;p2++)k.box((p2%3-1)*w*.25,3.52,(p2<3?-1:1)*d*.18,.12,.35,.12,mc(T,p2<3?0xd92b2b:0x2b6fd9));[-1,1].forEach(function(s){for(var q=0;q<3;q++){var rr=k.cyl((q-1)*w*.25,3.3,s*(d/2+.1),.04,.04,.4,blk);rr.rotation.x=Math.PI/2;rr.position.y=3.3}});k.cyl(0,4.3,0,.06,.06,.2,blk);k.cyl(0,4.48,0,.16,.16,.22,lit(0xffcc33,1.6));return true}
 case 'g-cornhole':{[-1,1].forEach(function(s){var bd=tilt(0,.55,s*(d/2-2),2,.12,4,M.wood,s*-.12);var hole=k.cyl(0,.85,s*(d/2-1),.25,.25,.02,blk);[0,1,2,3].forEach(function(i){k.box(s*.4+i*.12-.2,.04,s*(d/2-5.2)+i*.15,.45,.08,.45,mc(T,[0xd92b2b,0x2b6fd9][i%2],{r:.9}))})});k.box(0,.005,0,w,.01,d,mc(T,0x6a6a6a,{op:.25}));return true}
 case 'g-beerpong':{legs(w,d,2.2,.15,chrome);k.box(0,2.2,0,w,.1,d,mc(T,0x1c1c1c,{r:.3}));k.box(0,2.3,0,w-.15,.005,d-.15,lit(0x2b6fd9,.4));
  [-1,1].forEach(function(s){for(var row=0;row<4;row++)for(var j=0;j<=row;j++)k.cyl((j-row/2)*.32,2.31,s*(d/2-.4-row*.28),.14,.1,.4,mc(T,0xd92b2b,{r:.4}))});sph(0,2.4,0,.07,M.white);return true}
 case 'g-putt':{k.box(0,0,0,w,.08,d,mc(T,0x3f9a4a,{r:1}));[[-.25,-.3],[.2,.1],[-.1,.35]].forEach(function(p){k.cyl(p[0]*w,.08,p[1]*d,.18,.18,.01,blk);k.cyl(p[0]*w+.02,.08,p[1]*d,.015,.015,2.2,M.white);k.box(p[0]*w+.2,1.9,p[1]*d,.4,.25,.02,mc(T,0xd92b2b))});sph(.1*w,.17,.3*d,.07,M.white);return true}
 case 'g-axe':{var fence=mc(T,0x333333,{op:.35,r:1,side:T.DoubleSide});k.box(-w/2,0,0,.06,h,d,fence);k.box(w/2,0,0,.06,h,d,fence);k.box(0,0,-d/2+.3,w,h,.6,mc(T,0x8a6a4a,{r:.8}));
  for(var pl=0;pl<6;pl++)k.box(0,.3+pl*1.2,-d/2+.62,w*.8,1.1,.08,mc(T,0xc9a06a,{r:.75}));[[1.1,0x1c1c1c],[.8,0xd92b2b],[.55,0x1c1c1c],[.3,0x2b6fd9],[.12,0xd92b2b]].forEach(function(rg,i){var t=k.cyl(0,4,-d/2+.7+i*.01,rg[0],rg[0],.01,mc(T,rg[1],{r:.8}),28);t.rotation.x=Math.PI/2;t.position.y=4});
  k.box(0,.005,d/2-3,w,.02,.15,mc(T,0xd92b2b));k.box(0,.005,d/2-5,w,.02,.15,mc(T,0xd92b2b));return true}
 }
 return false}
/* ---------- Building & Support, Built-ins & Counters, Bar & Lounge: detailed shapes ----------
   Same rules as the arcade pass: boxes, cylinders and a few spheres, shared materials, and repeated small things
   (bottles, cans, records, spools, slats, boards) drawn as one instanced mesh each so they cost a single draw call. */
var EXG={};
function exGeo(T,k){if(!EXG[k])EXG[k]=k==='box'?new T.BoxGeometry(1,1,1):k==='cyl'?new T.CylinderGeometry(.5,.5,1,10):k==='sph'?new T.SphereGeometry(.5,10,7):k==='tor'?new T.TorusGeometry(.5,.12,6,18):null;return EXG[k]}
function exBuilt(T,c,w,d,h,M,k,g){var r=c.r;
 if(!/^(b-net|b-gas|b-hvac|b-stage|l-|kr-counter|kr-prep|kr-pantry|m-bench|m-filament|w-bench|w-assy|w-lumber|w-wall)/.test(r))return false;
 var blk=mc(T,0x1c1c1f,{r:.5}),chrome=mc(T,0xcfd3d6,{m:.85,r:.25}),ss=mc(T,0xb9bec3,{m:.75,r:.32}),glass=mc(T,0xdfeeff,{op:.22,r:.05}),wood=M.wood,
  oak=mc(T,0xc49a6c,{r:.55}),walnut=mc(T,0x7a5236,{r:.5}),paint=mc(T,0xe9e5dc,{r:.6}),stone=mc(T,0xe6e1d8,{r:.3}),rubber=mc(T,0x2a2a2a,{r:.9}),
  lit=function(hex,ei){return mc(T,0x111111,{e:hex,ei:ei||1.5,r:.35})},white=mc(T,0xffffff,{r:.45}),whiteG=mc(T,0xffffff,{r:.15,m:.05});
 var D=new T.Object3D(),tmpC=new T.Color();
 // a = [x, yCenter, z, sx, sy, sz, rx, ry, rz]
 var inst=function(geo,mat,arr,cols){if(!arr.length)return null;var m=new T.InstancedMesh(exGeo(T,geo),mat,arr.length);arr.forEach(function(a,i){D.position.set(a[0],a[1],a[2]);D.rotation.set(a[6]||0,a[7]||0,a[8]||0);D.scale.set(a[3],a[4],a[5]);D.updateMatrix();m.setMatrixAt(i,D.matrix);if(cols)m.setColorAt(i,tmpC.setHex(cols[(i*7+3)%cols.length]))});m.castShadow=m.receiveShadow=true;g.add(m);return m};
 var sph=function(x,y,z,rad,mat){var m=new T.Mesh(exGeo(T,'sph'),mat);m.scale.set(rad*2,rad*2,rad*2);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
 var hcyl=function(x,y,z,rad,len,mat,ax){var m=k.cyl(x,y,z,rad,rad,len,mat,12);if(ax==='x')m.rotation.z=Math.PI/2;else m.rotation.x=Math.PI/2;m.position.y=y;return m};
 var handle=function(x,y,z,len,vert){k.box(x,y,z,vert?.04:len,vert?len:.04,.05,chrome)};
 var doors=function(x0,x1,y0,y1,z,n,mat,knob){var dw=(x1-x0)/n;for(var i=0;i<n;i++){var cx=x0+dw*(i+.5);k.box(cx,y0+.02,z,dw-.05,y1-y0-.04,.04,mat);if(knob!==false)handle(cx+(i%2?-1:1)*(dw/2-.15),y0+(y1-y0)*.55,z+.04,.35,true)}};
 var drawers=function(x0,x1,y0,y1,z,n,mat){var dh=(y1-y0)/n;for(var i=0;i<n;i++){var y=y0+dh*i;k.box((x0+x1)/2,y+.02,z,x1-x0-.05,dh-.04,.04,mat);handle((x0+x1)/2,y+dh/2,z+.04,Math.min(.5,(x1-x0)*.4),false)}};
 // bottles standing on a shelf: one instanced body + one instanced neck
 var BOT=[0x2f5d3a,0x6b3a1e,0xb8862e,0x9aa9b8,0x3a2a5a,0x7a1f2a,0xd9c27a,0x2a6a7a];
 var bottles=function(x0,x1,y,z,depth){var bd=[],nk=[],n=Math.max(2,Math.floor((x1-x0)/.32));for(var i=0;i<n;i++){var x=x0+.16+i*(x1-x0-.32)/Math.max(1,n-1),zz=z+((i%3)-1)*depth*.2,hh=.85+((i*37)%5)*.06;bd.push([x,y+hh*.36,zz,.26,hh*.72,.26]);nk.push([x,y+hh*.72+.11,zz,.09,.22,.09])}
  inst('cyl',mc(T,0xffffff,{r:.15}),bd,BOT);inst('cyl',mc(T,0xffffff,{r:.2}),nk,[0x1a1a1a,0xc9a64a,0x7a1f2a])};
 var glasses=function(pts,y){inst('cyl',mc(T,0xe8f4ff,{op:.45,r:.05}),pts.map(function(p){return [p[0],y+.2,p[1],.22,.4,.22]}))};
 var ledStrip=function(x,y,z,len,hex){k.box(x,y,z,len,.03,.04,lit(hex||0xffd9a0,2))};
 switch(r){
 /* ---------------- Building & Support ---------------- */
 case 'b-net':{var post=blk;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.08),.15,s[1]*(d/2-.08),.14,h-.3,.14,post)});
  k.box(0,0,0,w,.15,d,blk);k.box(0,h-.15,0,w,.15,d,blk);[-1,1].forEach(function(s){k.box(s*(w/2-.03),.15,0,.05,h-.3,d-.3,mc(T,0x2a2b30,{r:.6}))});k.box(0,.15,-d/2+.03,w-.3,h-.3,.05,mc(T,0x2a2b30,{r:.6}));
  var u=[[.6,0x3a3d44],[.3,0xd9dbde],[.6,0x2d3036],[.45,0x2d3036],[.3,0xd9dbde],[1,0x26282c],[.6,0x2d3036],[.9,0x1f2125]],yy=.5,leds=[],ports=[];
  u.forEach(function(q,i){if(yy+q[0]>h-.4)return;k.box(0,yy,.05,w-.5,q[0]-.04,d-.6,mc(T,q[1],{r:.45,m:.2}));
   if(q[1]===0xd9dbde){for(var p=0;p<24;p++)ports.push([-w/2+.45+p*(w-.9)/23,yy+q[0]/2,d/2-.25,.07,.06,.02])}else{for(var l=0;l<6;l++)leds.push([-w/2+.45+l*.13,yy+q[0]-.12,d/2-.25,.04,.04,.02])}yy+=q[0]+.06});
  inst('box',blk,ports);inst('box',mc(T,0x111111,{e:0x33ff77,ei:2}),leds);
  var gd=new T.Mesh(new T.BoxGeometry(w-.3,h-.4,.03),mc(T,0x8fb0c8,{op:.18,r:.05}));gd.position.set(0,h/2,d/2-.02);g.add(gd);handle(w/2-.3,h*.5,d/2,.9,true);return true}
 case 'b-gas':{var cage=mc(T,0xe0b31b,{m:.3,r:.5}),bars=[];[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.06),0,s[1]*(d/2-.06),.12,h,.12,cage)});
  [.15,h/2,h-.12].forEach(function(y){k.box(0,y,-d/2+.04,w,.08,.08,cage);[-1,1].forEach(function(s){k.box(s*(w/2-.04),y,0,.08,.08,d,cage)})});
  for(var i=1;i<Math.floor(w/.35);i++)bars.push([-w/2+i*.35,h/2,-d/2+.04,.03,h-.3,.03]);for(var j=1;j<Math.floor(d/.35);j++){bars.push([-w/2+.04,h/2,-d/2+j*.35,.03,h-.3,.03]);bars.push([w/2-.04,h/2,-d/2+j*.35,.03,h-.3,.03])}
  inst('box',cage,bars);k.box(0,h-.12,0,w,.04,d,cage);
  var cols=[0x2e7d4f,0x8a9096,0x2b5fa8,0x8a9096,0x2e7d4f,0x5a5f66],n=0;for(var cx=-w/2+.5;cx<=w/2-.45;cx+=.8)for(var cz=-d/2+.5;cz<=d/2-.45;cz+=.85){var col=mc(T,cols[n++%cols.length],{m:.3,r:.4}),ch=Math.min(h-.6,4.6);k.cyl(cx,.05,cz,.3,.3,ch,col,16);sph(cx,.05+ch,cz,.3,col);k.cyl(cx,ch+.25,cz,.08,.08,.25,chrome);k.cyl(cx,ch+.5,cz,.14,.14,.06,blk)}
  k.box(0,h*.62,d/2-.02,w*.9,.04,.04,chrome);return true}
 case 'b-hvac':{var cab=mc(T,0xd6d8d4,{r:.55,m:.15});k.box(0,0,0,w,h-.5,d,cab);k.box(0,h-.5,0,w*.8,.5,d*.8,mc(T,0xbfc2c4,{m:.5,r:.4}));
  [.33,.66].forEach(function(f){k.box(0,(h-.5)*f,d/2+.005,w-.1,.02,.02,mc(T,0x9a9c98))});k.box(0,h*.55,d/2+.01,w*.3,.5,.02,mc(T,0x3a3d44,{r:.4}));
  var sl=[];for(var i=0;i<10;i++)sl.push([0,.35+i*.12,d/2+.02,w-.6,.035,.06,-.6]);inst('box',mc(T,0x8d9094,{m:.3,r:.5}),sl);
  hcyl(w/2+.08,1.2,-d/4,.06,.5,mc(T,0xc8743a,{m:.7,r:.3}),'x');k.cyl(w/2+.3,0,-d/4,.06,.06,1.25,mc(T,0xc8743a,{m:.7,r:.3}));k.cyl(w/2+.2,0,d/4,.05,.05,.8,mc(T,0xffffff,{r:.4}));return true}
 /* ---------------- Built-ins & Counters ---------------- */
 case 'b-stage':{k.box(0,0,0,w,h-.12,d,mc(T,0x141416,{r:.9}));k.box(0,h-.12,0,w,.12,d,mc(T,0x2a221c,{r:.6}));
  var pl=[];for(var x=-w/2+.5;x<w/2;x+=.5)pl.push([x,h+.002,0,.015,.004,d-.05]);inst('box',mc(T,0x120d0a),pl);
  k.box(0,h-.18,d/2+.005,w,.04,.02,lit(0x7fb8ff,1.4));
  [[-1,0xff3a8a],[1,0x38d0ff]].forEach(function(p){k.cyl(p[0]*(w/2-.6),h,-d/2+.6,.12,.12,.35,blk);sph(p[0]*(w/2-.6),h+.45,-d/2+.6,.16,lit(p[1],1.6))});return true}
 case 'l-bar':case 'l-barc':case 'l-rail':{
  var bar=r!=='l-rail',full=r==='l-bar',cd=full?Math.min(2.6,d*.33):d,cz=full?d/2-cd/2:0,th=r==='l-rail'?3.4:3.35;
  if(r==='l-rail'){for(var p2=0;p2<Math.max(2,Math.round(w/4))+1;p2++){var px=-w/2+.3+p2*(w-.6)/Math.max(2,Math.round(w/4));k.cyl(px,0,cz,.08,.08,th,blk);k.box(px,th-.35,cz,.08,.3,cd*.7,blk);k.cyl(px,0,cz,.3,.3,.04,blk)}k.box(0,th,cz,w,.14,cd,walnut)}
  else{k.box(0,0,cz-.1,w-.3,th-.15,cd-.5,walnut);var pn=[];for(var x2=-w/2+.15+.9;x2<w/2-.3;x2+=.9)pn.push([x2,(th-.15)/2,cz+cd/2-.34,.05,th-.5,.03]);inst('box',mc(T,0x3a2618,{r:.5}),pn);
   k.box(0,.1,cz+cd/2-.36,w-.3,.12,.04,mc(T,0x3a2618));k.box(0,th-.15,cz,w,.15,cd,wood);k.box(0,th-.01,cz+cd/2-.1,w,.06,.25,mc(T,0x2a1a10,{r:.4}));ledStrip(0,th-.2,cz+cd/2-.32,w-.4,0xffb35a)}
  hcyl(0,.55,cz+cd/2+.1,.05,w-.3,chrome,'x');for(var b2=0;b2<Math.max(2,Math.round(w/3))+1;b2++){var bx=-w/2+.3+b2*(w-.6)/Math.max(2,Math.round(w/3));k.box(bx,.05,cz+cd/2-.05,.05,.52,.25,chrome)}
  if(bar){var tx=-w/2+Math.min(3,w*.25);k.cyl(tx,th,cz-.2,.09,.09,1.1,chrome);hcyl(tx,th+1.1,cz-.2,.08,1.1,chrome,'x');[-.4,-.13,.13,.4].forEach(function(o,i){k.cyl(tx+o,th+.72,cz-.12,.025,.025,.3,chrome);k.cyl(tx+o,th+1.17,cz-.2,.035,.03,.38,mc(T,[0x1a1a1a,0xd9902b,0x2b6fd9,0x1a1a1a][i],{r:.4}))});k.box(tx,th,cz-.1,1.2,.03,.35,blk)}
  var gp=[];for(var q=0;q<Math.floor(w/2.2);q++)gp.push([-w/2+1.4+q*2.2,cz+(q%2?.15:-.1)]);glasses(gp.slice(bar?1:0),th+(r==='l-rail'?.14:0));
  if(full){var bz=-d/2+.55,bh=3;k.box(0,0,bz,w,bh-.1,1.1,mc(T,0x2e2620,{r:.6}));doors(-w/2+.1,w/2-.1,.2,bh-.15,bz+.56,Math.max(2,Math.round(w/2)),mc(T,0x3a2a20,{r:.55}));k.box(0,.0,bz+.5,w,.18,.08,blk);k.box(0,bh-.1,bz,w+.05,.12,1.15,stone);
   k.box(0,bh+.02,-d/2+.04,w-.2,Math.min(h-bh-.6,3.4),.06,mc(T,0xc9d3dc,{m:.95,r:.08}));
   [bh+.9,bh+2.1].forEach(function(y){if(y>h-.5)return;k.box(0,y,-d/2+.32,w-.4,.05,.55,mc(T,0xdfeeff,{op:.35,r:.05}));ledStrip(0,y-.04,-d/2+.12,w-.5,0xffd9a0);bottles(-w/2+.4,w/2-.4,y+.05,-d/2+.32,.4)});
   bottles(-w/2+.5,-w/2+Math.min(5,w*.35),bh+.02,-d/2+.6,.3);k.box(w/2-1.5,bh+.02,-d/2+.6,1.2,.5,.4,ss);k.box(0,h-.45,-d/2+.3,w,.45,.6,mc(T,0x2e2620,{r:.6}))}
  return true}
 case 'kr-counter':case 'kr-prep':{var ch=Math.min(h,3),cab=paint,tk=.35;k.box(0,0,-.05,w,tk,d-.2,blk);k.box(0,tk,-.02,w,ch-tk-.12,d-.08,mc(T,0xd8d3c8,{r:.6}));
  var sinkW=r==='kr-counter'?Math.min(2.6,w*.3):0,nb=Math.max(1,Math.round(w/2)),bw=w/nb;
  for(var i3=0;i3<nb;i3++){var x0=-w/2+i3*bw,x1=x0+bw,mid=(x0+x1)/2;if(sinkW&&Math.abs(mid)<bw/2+.01){doors(x0,x1,tk,ch-.12,d/2-.04,2,cab);k.box(mid,ch-.55,d/2-.02,bw-.05,.02,.02,mc(T,0xcfc9bc))}
   else if(i3%2===0){drawers(x0,x1,tk,ch-.12,d/2-.04,3,cab)}else{drawers(x0,x1,ch-.7,ch-.12,d/2-.04,1,cab);doors(x0,x1,tk,ch-.72,d/2-.04,bw>2.2?2:1,cab)}}
  k.box(0,ch-.12,0,w+.06,.13,d+.06,stone);
  if(sinkW){k.box(0,ch-.11,.05,sinkW,.02,d*.55,mc(T,0x8d969c,{m:.7,r:.25}));k.box(0,ch-.1,.05,sinkW-.15,.02,d*.48,mc(T,0x3d4348,{m:.6,r:.3}));var fz=-d/2+.25;k.cyl(0,ch,fz,.05,.06,.9,chrome);hcyl(0,ch+.9,fz+.2,.04,.45,chrome,'z');k.cyl(.25,ch,fz,.04,.04,.25,chrome);
   k.box(-w/2+.6,ch+.01,-.1,.9,.06,.6,oak);k.cyl(w/2-.8,ch+.01,-.2,.18,.15,.5,mc(T,0x2b6fd9,{r:.4}))}
  else{k.box(-w/4,ch+.01,0,1.4,.07,.9,oak);k.box(w/4,ch+.01,-.2,.4,.55,.25,walnut);inst('box',blk,[[w/4-.1,ch+.62,-.2,.03,.18,.12],[w/4,ch+.64,-.2,.03,.2,.12],[w/4+.1,ch+.6,-.2,.03,.16,.12]]);[[-.2,0xe2442a],[.15,0xf0c53a],[.05,0x6aa84f]].forEach(function(f,i){sph(w/4+f[0]+.6,ch+.1,.2+i*.1,.1,mc(T,f[1],{r:.5}))})}
  return true}
 case 'kr-pantry':case 'm-filament':{var fil=r==='m-filament',up=fil?mc(T,0x7d8288,{m:.4,r:.5}):oak,nsh=Math.max(4,Math.round(h/1.4));
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.06),0,s[1]*(d/2-.06),.12,h,.12,up)});if(!fil)k.box(0,0,-d/2+.02,w,h,.04,mc(T,0xd8c4a4,{r:.7}));
  var jars=[],cans=[],box2=[],spools=[],dry=[];for(var s3=0;s3<nsh;s3++){var y3=.25+s3*(h-.4)/(nsh-1);k.box(0,y3,0,w,.06,d,up);if(s3===nsh-1)break;var gap=(h-.4)/(nsh-1)-.1;
   if(fil){if(s3%2===0){for(var sx=-w/2+.4;sx<w/2-.3;sx+=.42)spools.push([sx,y3+.06+.42,.05,.75,.75,1.6,0,Math.PI/2,0])}else{for(var bx2=-w/2+.75;bx2<w/2-.6;bx2+=1.45)dry.push([bx2,y3+.06+Math.min(gap,1)/2,0,1.3,Math.min(gap,1),d-.3])}}
   else{var xx=-w/2+.3;while(xx<w/2-.3){var kind=(Math.floor(xx*3)+s3)%3;if(kind===0){jars.push([xx,y3+.06+.3,0,.32,.6,.32]);xx+=.4}else if(kind===1){cans.push([xx,y3+.06+.22,.1,.26,.44,.26]);cans.push([xx,y3+.06+.22,-.25,.26,.44,.26]);xx+=.3}else{box2.push([xx+.25,y3+.06+.4,-.05,.5,.8,.35]);xx+=.6}}}}
  if(fil){var sp=inst('tor',mc(T,0xffffff,{r:.5}),spools,[0xe2442a,0x2b6fd9,0xf0f0f0,0x1a1a1a,0xf0c53a,0x6aa84f,0xff8a1a,0x8a5cd9]);inst('box',mc(T,0xdfeeff,{op:.4,r:.1}),dry)}
  else{inst('cyl',mc(T,0xe9f2f6,{op:.6,r:.1}),jars);inst('cyl',mc(T,0xffffff,{r:.4,m:.3}),cans,[0xc23a2a,0x2b6fd9,0xe0b31b,0x2e7d4f,0xeeeeee]);inst('box',mc(T,0xffffff,{r:.8}),box2,[0xd9a441,0xc96a3a,0x6a9a5a,0x3a6aa8,0xe8e0cc])}
  return true}
 case 'm-bench':{var th2=Math.min(3,h*.6),mat=mc(T,0x2b6aa8,{r:.8});k.legs(w,d,th2-.12,.14,mc(T,0x8d939a,{m:.5,r:.4}),.05);k.box(0,.5,0,w-.3,.06,d-.3,mc(T,0x8d939a,{m:.5,r:.4}));k.box(0,th2-.12,0,w,.12,d,mc(T,0xd4cfc4,{r:.6}));k.box(0,th2,.15,w*.7,.015,d*.55,mat);
  k.box(0,th2,-d/2+.15,w,h-th2,.08,mc(T,0xbfb7a6,{r:.8}));var hl=[];for(var px2=-w/2+.2;px2<w/2;px2+=.25)for(var py=th2+1.3;py<h-.1;py+=.25)hl.push([px2,py,-d/2+.2,.04,.04,.01]);inst('box',blk,hl);
  var sh=th2+1.05;k.box(0,sh,-d/2+.6,w,.08,1,mc(T,0x8d939a,{m:.5,r:.4}));[-1,1].forEach(function(s){k.box(s*(w/2-.06),th2,-d/2+.6,.08,1.05,.9,mc(T,0x8d939a,{m:.5,r:.4}))});
  k.box(-w/4,sh+.08,-d/2+.6,1.3,.7,.8,mc(T,0xdedcd6,{r:.5}));k.box(-w/4-.18,sh+.16,-d/2+1.01,.7,.5,.02,scrMat(T,'scope',1.3));inst('cyl',blk,[[-w/4+.3,sh+.35,-d/2+1.02,.1,.04,.1,Math.PI/2],[-w/4+.48,sh+.35,-d/2+1.02,.1,.04,.1,Math.PI/2],[-w/4+.3,sh+.55,-d/2+1.02,.1,.04,.1,Math.PI/2]]);
  k.box(w/6,sh+.08,-d/2+.6,.9,.45,.7,mc(T,0x2d3036,{r:.4}));k.box(w/6-.15,sh+.25,-d/2+.96,.4,.12,.01,lit(0x33ff77,1.4));k.box(w/6+.25,sh+.25,-d/2+.96,.2,.12,.01,lit(0xff5533,1.4));
  k.box(w/2-.9,th2+.015,0,.6,.3,.5,mc(T,0x2d3036,{r:.4}));k.box(w/2-.9,th2+.2,.26,.2,.08,.01,lit(0xff5533,1.4));k.cyl(w/2-.45,th2+.015,0,.12,.12,.08,blk);k.cyl(w/2-.45,th2+.1,0,.03,.03,.5,chrome);
  k.cyl(-w/2+.3,th2+.015,-d/2+.4,.14,.14,.05,blk);var arm=k.box(-w/2+.3,th2+.05,-d/2+.4,.06,1.4,.06,blk);arm.rotation.z=-.4;arm.position.set(-w/2+.55,th2+.7,-d/2+.4);var hd=k.box(-w/2+.95,th2+1.15,-d/2+.4,.5,.12,.35,blk);k.box(-w/2+.95,th2+1.14,-d/2+.4,.4,.02,.25,lit(0xffffff,1.2));
  k.box(0,th2+.015,.35,.4,.03,.3,mc(T,0x2e7d4f,{r:.6}));return true}
 case 'w-bench':case 'w-assy':{var assy=r==='w-assy',top=assy?mc(T,0xd9c49a,{r:.6}):mc(T,0xd2a86a,{r:.5}),ht=Math.min(h,3),tt=assy?.25:.33;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(w/2-.35),0,s[1]*(d/2-.3),.3,ht-tt,.3,assy?mc(T,0x2d3036,{m:.4,r:.4}):oak)});
  [-1,1].forEach(function(s){k.box(0,.55,s*(d/2-.3),w-.7,.22,.12,assy?mc(T,0x2d3036,{m:.4,r:.4}):oak)});k.box(0,.75,0,w-.7,.06,d-.6,assy?mc(T,0x2d3036,{m:.4,r:.4}):mc(T,0xcfae7a,{r:.6}));
  k.box(0,ht-tt,0,w,tt,d,top);
  if(assy){var holes=[];for(var hx=-w/2+.35;hx<w/2-.2;hx+=.32)for(var hz=-d/2+.3;hz<d/2-.2;hz+=.32)holes.push([hx,ht+.001,hz,.07,.004,.07]);inst('cyl',blk,holes);
   [[-w/4,0xff6a1a],[w/5,0xff6a1a]].forEach(function(cp){k.box(cp[0],ht,d/2-.2,.06,.55,.06,ss);k.box(cp[0],ht+.5,d/2-.45,.06,.06,.55,ss);k.cyl(cp[0],ht+.25,d/2-.68,.05,.05,.3,mc(T,cp[1],{r:.4}))})}
  else{var dogs=[];for(var dx=-w/2+.6;dx<w/2-.4;dx+=.5)dogs.push([dx,ht+.001,d/2-.35,.07,.004,.07]);inst('box',blk,dogs);
   k.box(-w/2+1,ht-.45,d/2+.15,1,.42,.22,mc(T,0x1f5fa8,{m:.4,r:.4}));k.box(-w/2+1,ht-.45,d/2+.32,1,.42,.08,oak);hcyl(-w/2+1,ht-.3,d/2+.6,.04,.6,chrome,'z');hcyl(-w/2+1,ht-.3,d/2+.9,.025,.6,chrome,'x');
   k.box(w/4,ht,-.2,.7,.18,.22,mc(T,0x1f5fa8,{m:.4,r:.3}));k.box(w/4+.15,ht+.18,-.2,.18,.12,.08,mc(T,0x8a5a3c,{r:.5}));hcyl(-.3,ht+.06,.2,.06,.9,oak,'x');k.box(.15,ht+.03,.2,.25,.12,.18,walnut)}
  return true}
 case 'w-lumber':{var st=mc(T,0x3a3d44,{m:.5,r:.4}),nu=Math.max(2,Math.round(w/3))+1,ar=[],bd2=[];for(var u2=0;u2<nu;u2++){var ux=-w/2+.15+u2*(w-.3)/(nu-1);k.box(ux,0,-d/2+.12,.18,h,.18,st)}
  var lv=Math.max(3,Math.round(h/1.4));for(var l2=0;l2<lv;l2++){var ly=.8+l2*(h-1.2)/(lv-1);for(var u3=0;u3<nu;u3++){var ux2=-w/2+.15+u3*(w-.3)/(nu-1);ar.push([ux2,ly,-d/2+.12+d*.45,.12,.1,d*.9]);ar.push([ux2,ly+.18,d/2-.08,.12,.2,.06])}
   if(l2<lv-1){var nb2=2+(l2%3);for(var b3=0;b3<nb2;b3++)for(var b4=0;b4<3;b4++)bd2.push([0,ly+.12+b3*.15,-d/2+.45+b4*(d-.75)/2,w-.2-(l2%2)*.8,.13,.42])}}
  inst('box',st,ar);inst('box',mc(T,0xffffff,{r:.7}),bd2,[0xd9b47a,0xcfa86a,0xc49a5c,0xe0c08a,0xa8743e]);return true}
 case 'w-wall':{var ch2=Math.min(3,h*.42);k.box(0,0,.15,w,ch2-.12,d-.3,mc(T,0xb8312f,{m:.4,r:.4}));for(var dd=0;dd<Math.round(w/2);dd++){var dx2=-w/2+1+dd*2;drawers(dx2-.95,dx2+.95,.25,ch2-.2,d/2,4,mc(T,0xc23a37,{m:.4,r:.4}))}
  k.box(0,ch2-.12,.1,w+.04,.13,d-.2,oak);k.box(0,ch2,-d/2+.05,w,h-ch2,.1,mc(T,0xc6b49a,{r:.85}));
  var holes2=[];for(var hx2=-w/2+.15;hx2<w/2;hx2+=.25)for(var hy=ch2+.2;hy<h-.1;hy+=.25)holes2.push([hx2,hy,-d/2+.105,.035,.035,.01]);inst('box',mc(T,0x6b5a46),holes2);
  var tools=[],tc=[];for(var ti=0;ti<Math.floor(w/.6);ti++){var tx2=-w/2+.4+ti*.6,ty=ch2+1.2+(ti%3)*.7;if(ty>h-.4)ty=ch2+1.2;tools.push([tx2,ty,-d/2+.16,.12+(ti%2)*.1,.5+(ti%4)*.15,.06])}inst('box',mc(T,0xffffff,{r:.5,m:.3}),tools,[0x2d3036,0xe2442a,0x2b6fd9,0xf0c53a,0x9aa1a8]);
  k.box(0,ch2+.75,-d/2+.3,w*.7,.05,.45,oak);var bats=[],dr=[];for(var ci=0;ci<Math.floor(w*.7/.75);ci++){var cx2=-w*.35+.4+ci*.75;k.box(cx2,ch2+.8,-d/2+.3,.45,.2,.3,mc(T,0x2d3036,{r:.5}));dr.push([cx2,ch2+.92,-d/2+.46,.08,.05,.01]);bats.push([cx2,ch2+1.12,-d/2+.3,.32,.22,.22])}
  inst('box',mc(T,0x111111,{e:0x33ff77,ei:2}),dr);inst('box',mc(T,0xffffff,{r:.4}),bats,[0xf0c53a,0xe2442a,0x2b6fd9]);
  k.box(-w/4,ch2,.2,.35,.6,.25,mc(T,0xf0c53a,{r:.4}));k.box(-w/4,ch2+.4,.32,.15,.15,.4,mc(T,0x2d3036));k.box(w/4,ch2,.25,.9,.35,.4,mc(T,0x2d3036,{r:.5}));return true}
 /* ---------------- Bar & Lounge ---------------- */
 case 'l-keg':{k.box(0,.2,0,w,h-.45,d,ss);k.box(0,h-.25,0,w+.04,.06,d+.04,blk);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.cyl(s[0]*(w/2-.2),0,s[1]*(d/2-.2),.09,.09,.2,rubber)});
  handle(w/2-.25,h*.5,d/2+.02,.9,true);k.box(-w/2+.4,h-.5,d/2+.01,.3,.12,.01,lit(0x38d0ff,1.4));var tz=0;k.cyl(0,h-.2,tz,.11,.11,1.2,chrome);hcyl(0,h+1.0,tz,.1,.6,chrome,'x');
  [-.18,.18].forEach(function(o){k.cyl(o,h+.75,tz+.08,.03,.03,.2,chrome);k.cyl(o,h+1.08,tz+.08,.04,.035,.42,blk)});k.box(0,h-.2,tz+.3,.7,.05,.25,blk);return true}
 case 'l-ice':case 'l-glass':{var gl2=r==='l-glass';k.box(0,0,0,w,h-.05,d,gl2?ss:blk);k.box(0,.3,d/2+.005,w-.1,h-.45,.03,ss);k.box(0,h-.05,0,w+.02,.05,d+.02,ss);
  if(gl2){k.box(0,h-.4,d/2+.025,w-.3,.2,.02,mc(T,0x2d3036,{r:.4}));inst('box',mc(T,0x111111,{e:0x33ff77,ei:2}),[[-.4,h-.3,d/2+.04,.06,.06,.01],[-.25,h-.3,d/2+.04,.06,.06,.01]]);handle(0,h-.7,d/2+.04,w*.6,false)}
  else{handle(0,h-.5,d/2+.04,w*.6,false);var lv2=[];for(var i4=0;i4<6;i4++)lv2.push([0,.1+i4*.035,d/2+.01,w-.3,.015,.02]);inst('box',blk,lv2)}return true}
 case 'l-icec':{var binH=Math.min(3.2,h*.5);k.legs(w,d,.5,.12,ss,.1);k.box(0,.5,0,w,binH-.5,d,ss);var fl=k.box(0,0,0,w-.2,.06,.9,ss);fl.rotation.x=-.5;fl.position.set(0,binH-.35,d/2-.25);handle(0,binH-.55,d/2+.02,w*.5,false);
  k.box(0,binH,0,w-.1,h-binH,d-.1,ss);var lv3=[];for(var i5=0;i5<9;i5++)lv3.push([0,binH+.3+i5*.12,d/2-.04,w-.5,.03,.03]);inst('box',mc(T,0x6e757b,{m:.5,r:.4}),lv3);
  k.box(0,h-.8,d/2-.04,w*.5,.25,.02,mc(T,0x2b6fd9,{r:.4}));k.box(0,h-.4,d/2-.04,.35,.1,.02,lit(0x38d0ff,1.4));return true}
 case 'l-fridge':case 'l-wine':{var wine=r==='l-wine';k.box(0,0,0,w-.1,.1,d-.1,rubber);[-1,1].forEach(function(s){k.box(s*(w/2-.05),.1,0,.1,h-.1,d,blk)});k.box(0,h-.1,0,w,.1,d,blk);k.box(0,.1,0,w,.25,d,blk);k.box(0,.1,-d/2+.05,w,h-.1,.1,lit(wine?0x5a3a66:0xe0f0ff,wine?.35:.55));k.box(0,h-.16,0,w-.2,.04,d-.2,lit(0xffffff,1.4));
  var items=[];if(wine){for(var wy=.5;wy<h-.4;wy+=.32)for(var wx=-w/2+.2;wx<w/2-.15;wx+=.24)items.push([wx,wy,0,.22,d-.5,.22,Math.PI/2])}else{for(var sy=.45;sy<h-.4;sy+=.62){k.box(0,sy-.03,0,w-.25,.03,d-.4,mc(T,0xdfeeff,{op:.4}));for(var sx2=-w/2+.22;sx2<w/2-.15;sx2+=.24)for(var sz=-d/2+.4;sz<d/2-.25;sz+=.35)items.push([sx2,sy+.22,sz,.2,.42,.2])}}
  inst('cyl',mc(T,0xffffff,{r:wine?.2:.35,m:wine?0:.3}),items,wine?[0x3a0f18,0x1f3a24,0x5a1a24,0xd9c27a]:[0xc23a2a,0x2b6fd9,0xe0b31b,0x2e7d4f,0xeeeeee,0x1a1a1a]);
  var gd2=new T.Mesh(new T.BoxGeometry(w-.1,h-.35,.04),mc(T,0x9fc0d8,{op:.25,r:.03}));gd2.position.set(0,.1+(h-.35)/2+.05,d/2+.01);g.add(gd2);k.box(0,.12,d/2+.01,w,.13,.04,ss);handle(w/2-.15,h*.5,d/2+.05,h*.45,true);return true}
 case 'l-winewall':{var nc=Math.max(2,Math.round(w/1.5)),nr=Math.max(4,Math.round((h-.6)/.42)),cw=w/nc,bt=[],vs=[],hs=[];k.box(0,0,0,w,.3,d,walnut);k.box(0,h-.3,0,w+.1,.3,d+.1,walnut);
  for(var vi=0;vi<=nc;vi++)vs.push([-w/2+vi*cw,h/2,0,.08,h-.6,d]);for(var hi=0;hi<=nr;hi++)hs.push([0,.3+hi*(h-.6)/nr,0,w,.04,d]);inst('box',walnut,vs);inst('box',walnut,hs);
  for(var vi2=0;vi2<nc;vi2++)for(var hi2=0;hi2<nr;hi2++){var bx3=-w/2+cw*(vi2+.5),by=.3+(hi2+.5)*(h-.6)/nr;for(var q2=-1;q2<=1;q2++)bt.push([bx3+q2*cw*.28,by,.05,.22,d-.35,.22,Math.PI/2])}
  inst('cyl',mc(T,0xffffff,{r:.2}),bt,[0x3a0f18,0x1f3a24,0x5a1a24,0x2a1a10,0xd9c27a]);ledStrip(0,h-.33,d/2-.1,w-.2,0xffc27a);return true}
 case 'l-coffee':{var ch3=Math.min(3,h);k.box(0,0,0,w,ch3-.12,d,walnut);doors(-w/2+.05,w/2-.05,.25,ch3-.17,d/2+.01,Math.max(2,Math.round(w/1.6)),mc(T,0x6b4a33,{r:.5}));k.box(0,ch3-.12,0,w+.06,.12,d+.06,stone);
  var mx=-w/6,mz=-.1;k.box(mx,ch3,mz,1.9,1.15,1.3,ss);k.box(mx,ch3+1.15,mz,1.9,.06,1.3,chrome);k.box(mx,ch3+.75,mz+.66,1.7,.25,.02,blk);
  [-.45,.45].forEach(function(o){k.cyl(mx+o,ch3+.62,mz+.72,.11,.13,.14,chrome);hcyl(mx+o,ch3+.55,mz+.95,.03,.4,blk,'z');k.cyl(mx+o,ch3+.04,mz+.85,.08,.07,.18,white)});k.box(mx,ch3+.02,mz+.75,1.6,.06,.3,blk);
  var wd=k.cyl(mx+.85,ch3+.5,mz+.75,.02,.02,.5,chrome);wd.rotation.z=.25;inst('cyl',whiteG,[[mx-.5,ch3+1.25,mz,.22,.14,.22],[mx-.2,ch3+1.25,mz,.22,.14,.22],[mx+.1,ch3+1.25,mz,.22,.14,.22],[mx+.4,ch3+1.25,mz,.22,.14,.22],[mx-.35,ch3+1.38,mz,.22,.14,.22],[mx+.25,ch3+1.38,mz,.22,.14,.22]]);
  var gx=w/2-.8;k.box(gx,ch3,-.1,.55,.9,.7,blk);k.cyl(gx,ch3+.9,-.1,.25,.12,.6,mc(T,0x6b4027,{op:.6,r:.2}));k.cyl(gx+.9,ch3,-.1,.2,.2,.35,blk);return true}
 case 'l-popcorn':{var red=mc(T,0xc8202a,{r:.45}),cw2=Math.min(w,2),cd2=Math.min(d,1.6);k.box(0,.45,0,cw2,2.2,cd2,red);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){hcyl(s[0]*(cw2/2-.1),.25,s[1]*(cd2/2-.1),.25,.12,blk,'x')});
  hcyl(-cw2/2-.15,.3,0,.32,.1,blk,'x');hcyl(cw2/2+.15,.3,0,.32,.1,blk,'x');k.box(0,1.2,cd2/2+.005,cw2-.4,1,.02,mc(T,0xe8c040,{r:.5}));handle(0,1.55,cd2/2+.04,.6,false);
  var gh=Math.max(1,h-3.6);k.box(0,2.65,0,cw2,.08,cd2,chrome);var gb=new T.Mesh(new T.BoxGeometry(cw2-.1,gh,cd2-.1),mc(T,0xfff4d0,{op:.22,r:.05}));gb.position.set(0,2.73+gh/2,0);g.add(gb);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){k.box(s[0]*(cw2/2-.04),2.73,s[1]*(cd2/2-.04),.06,gh,.06,red)});
  k.box(0,2.73,0,cw2-.15,.35,cd2-.15,mc(T,0xffe58a,{r:.9,e:0xffc23a,ei:.25}));var pc=[];for(var pi=0;pi<40;pi++)pc.push([(((pi*37)%17)/17-.5)*(cw2-.3),3.15+((pi*13)%7)*.03,(((pi*23)%11)/11-.5)*(cd2-.3),.12,.1,.12]);inst('sph',mc(T,0xfff3c4,{r:.9}),pc);
  k.cyl(0,2.73+gh-.55,0,.3,.22,.35,ss);k.cyl(0,2.73+gh-.2,0,.04,.04,.2,chrome);k.box(0,2.73+gh,0,cw2+.1,.12,cd2+.1,red);k.box(0,2.85+gh,cd2/2+.02,cw2,.45,.04,scrMat(T,'popcorn',1.2));k.box(0,2.85+gh,-cd2/2-.02,cw2,.45,.04,red);
  var rf=k.box(0,3.3+gh,0,cw2+.25,.12,cd2+.25,red);k.box(0,2.73+gh-.02,0,cw2-.2,.02,cd2-.2,lit(0xfff0c0,1.2));return true}
 case 'l-pizza':{var sh2=Math.max(2.2,h-1.9);k.legs(w,d,sh2,.12,ss,.1);k.box(0,.6,0,w-.25,.05,d-.25,ss);k.box(0,sh2-.08,0,w,.08,d,ss);
  var oh=h-sh2;k.box(0,sh2,0,w-.1,oh-.1,d-.2,ss);k.box(0,sh2+oh*.25,d/2-.09,w*.65,oh*.45,.01,lit(0xff6a14,1.5));k.box(0,sh2+oh*.25,d/2-.07,w*.65,oh*.45,.02,mc(T,0x2a1206,{op:.35,r:.05}));k.box(0,sh2+oh*.2,d/2-.06,w*.75,.08,.04,blk);
  handle(0,sh2+oh*.76,d/2-.04,w*.5,false);inst('cyl',blk,[[w/2-.25,sh2+oh*.3,d/2-.06,.12,.05,.12,Math.PI/2],[w/2-.25,sh2+oh*.55,d/2-.06,.12,.05,.12,Math.PI/2]]);k.box(-w/2+.25,sh2+oh*.4,d/2-.07,.2,.1,.01,lit(0xff3b2a,1.4));
  k.cyl(w/4,sh2+oh-.1,-d/4,.12,.12,.4,ss);var peel=k.box(-w/2-.05,.2,0,.04,2.5,.08,oak);peel.rotation.z=-.15;k.box(-w/2+.05,2.4,0,.04,.04,.6,oak);return true}
 case 'l-jukebox':{var base=Math.min(2.6,h*.5),bw2=w,bd3=d,top=h-base,wd2=mc(T,0x6b3a1e,{r:.4});k.box(0,0,0,bw2,base,bd3,wd2);
  var gr=[];for(var gi=0;gi<9;gi++)gr.push([0,.4+gi*.15,bd3/2+.005,bw2*.6,.05,.02]);k.box(0,.35,bd3/2-.01,bw2*.66,1.45,.02,mc(T,0x2a1a10,{r:.7}));inst('box',chrome,gr);
  var arch=new T.Mesh(new T.CylinderGeometry(bw2/2,bw2/2,bd3,28,1,false,-Math.PI/2,Math.PI),wd2);arch.rotation.x=-Math.PI/2;arch.position.set(0,base+top-bw2/2,0);g.add(arch);
  k.box(0,base,0,bw2,top-bw2/2,bd3,wd2);
  [-1,1].forEach(function(s){k.box(s*(bw2/2-.12),base,bd3/2+.01,.14,top-bw2/2,.05,lit(s<0?0xff3cac:0x38d0ff,1.7))});
  var tub=new T.Mesh(new T.TorusGeometry(bw2/2-.12,.07,8,28,Math.PI),lit(0xffb33a,1.8));tub.position.set(0,base+top-bw2/2,bd3/2+.02);g.add(tub);
  var tub2=new T.Mesh(new T.TorusGeometry(bw2/2-.38,.05,8,28,Math.PI),lit(0xff3cac,1.6));tub2.position.set(0,base+top-bw2/2,bd3/2+.02);g.add(tub2);
  k.box(0,base+.25,bd3/2+.01,bw2*.55,top-bw2/2-.3,.02,mc(T,0x9fc0d8,{op:.3,r:.03}));k.box(0,base+.25,bd3/2-.15,bw2*.5,top-bw2/2-.35,.02,lit(0xfff0c8,.6));inst('cyl',mc(T,0x1a1a1a,{r:.3}),[[0,base+1.0,bd3/2-.2,.9,.02,.9,Math.PI/2]]);
  k.box(0,base-.05,bd3/2+.02,bw2*.7,.12,.06,chrome);return true}
 case 'l-tv':case 'l-tvwall':{var multi=r==='l-tvwall',cH=Math.min(2.2,h*.28),cD=Math.min(d,1.5);k.box(0,0,0,w,cH-.1,cD,walnut);doors(-w/2+.05,w/2-.05,.2,cH-.15,cD/2+.01,Math.max(2,Math.round(w/3)),mc(T,0x3a2618,{r:.5}),false);k.box(0,cH-.1,0,w+.04,.1,cD+.04,mc(T,0x2a1a10,{r:.4}));
  if(multi){var sw2=(w-.6)/3,sh3=sw2*.56,ys=[cH+.6,cH+.6+sh3+.25];ys.forEach(function(y,row){if(y+sh3>h)return;for(var tv=0;tv<3;tv++){var x3=-w/2+.3+sw2*(tv+.5);k.box(x3,y,-d/2+.15,sw2-.12,sh3,.12,blk);k.box(x3,y+.06,-d/2+.22,sw2-.26,sh3-.12,.01,scrMat(T,(tv+row)%2?'sports':'sports2',1.2))}});
   k.box(0,cH+.15,-.1,w*.5,.25,.35,blk);k.box(-w/4,cH,0,1.4,.3,.9,blk);k.box(-w/4+.55,cH+.15,.46,.1,.06,.01,lit(0x38d0ff,1.4))}
  else{var sw3=w*.92,sh4=Math.min(h-cH-.8,sw3*.5625);k.box(0,h-sh4-.5,-d/2+.08,sw3+.2,sh4+.2,.1,blk);k.box(0,h-sh4-.4,-d/2+.14,sw3,sh4,.01,scrMat(T,'movie',1.25));
   [-1,1].forEach(function(s){var sz=d/2-.4;k.box(s*(w/2-.45),cH,sz,.7,3.4,.6,blk);inst('cyl',mc(T,0x3a3d44,{r:.6}),[[s*(w/2-.45),cH+2.8,sz+.31,.4,.02,.4,Math.PI/2],[s*(w/2-.45),cH+1.7,sz+.31,.55,.02,.55,Math.PI/2],[s*(w/2-.45),cH+.8,sz+.31,.55,.02,.55,Math.PI/2]])});
   k.box(0,cH,0,w*.4,.2,.4,blk);}
  return true}
 case 'l-records':{var ch4=Math.min(2.6,h*.65),lh=.6;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){var lg=k.cyl(s[0]*(w/2-.3),0,s[1]*(d/2-.2),.05,.03,lh,oak);lg.rotation.z=s[0]*.08});
  k.box(0,lh,0,w,ch4-lh,d,walnut);var cub=Math.max(2,Math.round(w/1.4)),cw3=w/cub,rec=[];for(var ci2=0;ci2<cub;ci2++){var cx3=-w/2+cw3*(ci2+.5);k.box(cx3,lh+.08,d/2-.02,cw3-.12,ch4-lh-.2,.03,mc(T,0x2a1a10,{r:.6}));
   for(var ri=0;ri<Math.floor((cw3-.3)/.06);ri++)rec.push([cx3-cw3/2+.2+ri*.06,lh+.08+(ch4-lh-.2)/2,d/2-.3,.03,ch4-lh-.35,d-.65])}inst('box',mc(T,0xffffff,{r:.6}),rec,[0xe2442a,0x1a1a1a,0xf0c53a,0x2b6fd9,0xeeeeee,0x6aa84f,0x8a5cd9,0xd96a2b]);
  k.box(-w/4,ch4,0,1.5,.25,1.15,walnut);k.cyl(-w/4-.12,ch4+.25,0,.5,.5,.05,mc(T,0x1a1a1a,{r:.3}),28);k.cyl(-w/4-.12,ch4+.3,0,.15,.15,.01,mc(T,0xe2442a,{r:.5}));var ta=k.box(-w/4+.45,ch4+.33,-.2,.03,.03,.7,chrome);ta.rotation.y=.35;k.cyl(-w/4+.55,ch4+.25,-.35,.06,.06,.1,chrome);
  [-1,1].forEach(function(s){var sx3=w/4+s*.55;k.box(sx3,ch4,-.1,.6,.9,.6,walnut);k.cyl(sx3,ch4+.55,.21,.18,.18,.02,mc(T,0x3a3d44,{r:.6}),20).rotation.x=Math.PI/2;k.cyl(sx3,ch4+.2,.21,.08,.08,.02,mc(T,0x3a3d44,{r:.6})).rotation.x=Math.PI/2});
  if(h>ch4+1.2)k.box(w/2-.6,ch4,-d/2+.3,.9,h-ch4,.3,mc(T,0x2a1a10,{r:.6}));return true}
 case 'l-seat':{var fab=mc(T,0x4d5f73,{r:.95}),fab2=mc(T,0x8a6a4a,{r:.9}),rug=mc(T,0xd8cfbf,{r:1}),sd=Math.min(3.2,d*.32),sW=Math.min(w-1,9);
  k.box(0,0,0,w-.4,.03,d-.6,rug);k.box(0,.005,0,w-.9,.03,d-1.1,mc(T,0xb9ac94,{r:1}));
  var sz2=-d/2+sd/2+.2;k.box(0,.3,sz2,sW,.9,sd,fab);k.box(0,1.2,sz2-sd/2+.35,sW,1.3,.7,fab);[-1,1].forEach(function(s){k.box(s*(sW/2-.35),1.2,sz2,.7,.8,sd,fab)});
  var cu=[];for(var cc=0;cc<3;cc++)cu.push([-sW/2+.7+(cc+.5)*(sW-1.4)/3,1.27,sz2+.25,(sW-1.4)/3-.08,.18,sd-.9]);inst('box',mc(T,0x56697e,{r:.95}),cu);
  inst('box',mc(T,0xffffff,{r:.9}),[[-sW/2+1.2,1.7,sz2-sd/2+.85,1,.8,.25,-.2],[sW/2-1.2,1.7,sz2-sd/2+.85,1,.8,.25,-.2]],[0xe0b31b,0xc8743a]);
  [-1,1].forEach(function(s){k.box(s*w/2*.55,0,sz2,.1,.3,sd-.2,blk)});
  var az=d/2-1.6;[-1,1].forEach(function(s){var ax=s*Math.min(w/2-1.6,3.2);var gch=new T.Group();g.add(gch);var kk=Kit(T,gch);kk.box(0,.3,0,2.4,.85,2.4,fab2);kk.box(0,1.15,-.9,2.4,1.2,.6,fab2);kk.box(-1,1.15,.1,.4,.6,2,fab2);kk.box(1,1.15,.1,.4,.6,2,fab2);kk.legs(2.4,2.4,.3,.1,walnut,.1);gch.position.set(ax,0,az);gch.rotation.y=Math.PI+s*-.35});
  var tz2=(sz2+sd/2+az-1.2)/2;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){k.box(q[0]*1.6,0,tz2+q[1]*.8,.12,1.3,.12,walnut)});k.box(0,1.3,tz2,3.6,.12,2,walnut);
  k.box(0,.4,tz2,3.2,.04,1.6,walnut);k.cyl(.6,1.42,tz2,.2,.2,.04,mc(T,0x2a2a2a));k.box(-.7,1.42,tz2+.2,.7,.08,.5,mc(T,0x8a2a2a,{r:.7}));k.cyl(-.2,1.42,tz2-.3,.09,.07,.35,mc(T,0x6aa84f,{op:.7}));return true}
 }
 return false}
/* ---------- shapes: local space, centered, width along x, depth along z, front = +z ---------- */
function exShape(T,c,w,d,h,M){var g=new T.Group(),k=Kit(T,g),col=CATCOLOR[c.c]||'#9a958b',n=c.n,r=c.r;
 var body=exMat(T,shade(col,.55),{r:.6}),bodyL=exMat(T,shade(col,1.35),{r:.7}),dark=M.dark,wood=M.wood,steel=M.steel,white=M.white;
 if(exArcade(T,c,w,d,h,M,k,g)||exBuilt(T,c,w,d,h,M,k,g))return g;
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
 if(/^h-(rack|micro|sproutr|flood|tent|tower|tank|drum)$/.test(r)){var leaf=exMat(T,0x6cbf5a,{r:.9}),tray=exMat(T,0x2f3a33,{r:.6}),frame=exMat(T,0xd9d6ce,{m:.3,r:.5}),led=exMat(T,0xffffff,{e:0xe9b8ff,ei:1.6});
  if(r==='h-flood'){k.legs(w,d,h-.35,.25,frame);k.box(0,h-.35,0,w,.35,d,tray);k.box(0,h-.02,0,w-.4,.06,d-.4,leaf);return g}
  if(r==='h-tent'){k.box(0,0,0,w,h,d,exMat(T,0x2a2a2a,{r:.9}));k.box(0,.2,d/2+.01,w*.6,h-.6,.02,exMat(T,0xdcdcdc,{r:.5}));return g}
  if(r==='h-tower'){k.cyl(0,0,0,Math.min(w,d)*.3,Math.min(w,d)*.35,h,exMat(T,0xeeeeea));for(var t=0;t<16;t++){var a2=t*1.3,yy=1+(t%8)*(h-1.5)/8;k.box(Math.cos(a2)*Math.min(w,d)*.33,yy,Math.sin(a2)*Math.min(w,d)*.33,.35,.3,.35,leaf)}return g}
  if(r==='h-tank'||r==='h-drum'){k.cyl(0,0,0,Math.min(w,d)*.45,Math.min(w,d)*.45,h,exMat(T,r==='h-tank'?0x3a6a8a:0xd6dadd,{m:r==='h-drum'?.5:0,r:.4}),24);return g}
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s3){k.box(s3[0]*(w/2-.06),0,s3[1]*(d/2-.06),.12,h,.12,frame)});var ns=Math.max(3,Math.round(h/1.6));
  for(var i3=0;i3<ns;i3++){var y3=.4+i3*(h-.8)/(ns-1);k.box(0,y3,0,w,.06,d,frame);k.box(0,y3+.06,0,w-.3,.15,d-.3,tray);k.box(0,y3+.21,0,w-.4,.05,d-.4,leaf);if(i3<ns-1)k.box(0,y3+(h-.8)/(ns-1)-.08,0,w-.5,.04,.25,led)}return g}
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
