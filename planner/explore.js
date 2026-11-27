/* ================= Explore: walk the room in 3D =================
   Three.js is loaded only when Explore opens. Units are feet; plan x → world x, plan y → world z, up is y.
   Objects use simple shapes (by type, with a tidy fallback by kind); ceiling lights really light the room. */
var EX={on:false,T:null,r:null,S:null,cam:null,raf:0,keys:{},yaw:0,pitch:0,pos:null,solid:[],last:0,joy:null,look:null,dirty:true};
var EYE=5.4,RAD=0.8,WALK=9,RUN=16;
var NOWALK=/^(c-half|c-pickle|g-vr|f-turf|g-putt|f-free|c-bowl|c-bowlmini|g-cornhole|g-axe|g-darts|x-tennis|c-net|b-stage|ht-riser)$/;
function exLoad(){if(EX.T)return Promise.resolve(EX.T);return import('./vendor/three-0.170.0.module.min.js').then(function(m){EX.T=m;return m})}
function setExplore(on){if(EX.on===on)return;EX.on=on;document.body.classList.toggle('exploring',on);strip();
 if(!on){exStop();setTimeout(function(){var a=document.activeElement;if(a&&a!==document.body&&a.blur)a.blur()},0);return}
 var host=$('#explore');host.innerHTML='<div class="exload">Building the room…</div>';
 // desktop: grab the mouse straight away (this click is what allows it); Esc then leaves Explore
 if(!TOUCH&&host.requestPointerLock){EX.locked=false;try{var pr=host.requestPointerLock();if(pr&&pr.catch)pr.catch(function(){})}catch(_){}}
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
 else if(kind==='gym'){grad('#0a1420','#0f2436');g.fillStyle='#38d0ff';g.font='bold 30px monospace';g.fillText('3.42 mi',14,48);g.fillStyle='#ff8a1a';g.fillText('148 bpm',14,92);g.fillStyle='#7aff7a';g.font='bold 18px monospace';g.fillText('28:15   312 kcal',14,130);g.strokeStyle='#38d0ff';g.lineWidth=2;g.beginPath();for(var gx2=0;gx2<W;gx2+=8){var gv=H-12-((gx2*7)%23);gx2?g.lineTo(gx2,gv):g.moveTo(gx2,gv)}g.stroke()}
 else if(kind==='golf'){var gg=g.createLinearGradient(0,0,0,H);gg.addColorStop(0,'#8fc8ff');gg.addColorStop(.45,'#d6ecff');gg.addColorStop(.46,'#3a7a2e');gg.addColorStop(1,'#5aa04a');g.fillStyle=gg;g.fillRect(0,0,W,H);g.fillStyle='#2a5a22';g.beginPath();g.ellipse(W*.25,H*.46,60,10,0,0,7);g.fill();g.beginPath();g.ellipse(W*.8,H*.46,50,9,0,0,7);g.fill();
  g.fillStyle='#7ac85a';g.beginPath();g.moveTo(W*.45,H*.47);g.lineTo(W*.55,H*.47);g.lineTo(W*.75,H);g.lineTo(W*.25,H);g.fill();g.fillStyle='#e8d8a0';g.beginPath();g.ellipse(W*.58,H*.6,14,5,0,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1;g.beginPath();g.moveTo(W*.5,H*.5);g.lineTo(W*.5,H*.4);g.stroke();g.fillStyle='#d92b2b';g.fillRect(W*.5,H*.4,8,5);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(6,6,90,22);g.fillStyle='#fff';g.font='bold 11px sans-serif';g.fillText('HOLE 7  PAR 4',11,21)}
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
var EXG={},EXFT={};
function exGeo(T,k){if(!EXG[k])EXG[k]=k==='box'?new T.BoxGeometry(1,1,1):k==='cyl'?new T.CylinderGeometry(.5,.5,1,10):k==='sph'?new T.SphereGeometry(.5,10,7):k==='tor'?new T.TorusGeometry(.5,.12,6,18):null;return EXG[k]}
function exBuilt(T,c,w,d,h,M,k,g){var r=c.r;
 if(!/^(b-net|b-gas|b-hvac|b-stage|l-|kr-|kc-|f-(stool|sofa|chair|coffee|tv|dine8|round4|sectL|sectU|fire|fireplace|hightop|game4|chess|massage)$|f-(gym|tread|row|bike|free|rack|cable|ellip|stair|turf|sauna|plunge)$|c-|x-(batting|tennis|return)$|m-|w-|h-|ht-|mu-|a-|o-|cr-|s-|mf-|bd-|ba-)/.test(r))return false;
 var blk=mc(T,0x1c1c1f,{r:.5}),chrome=mc(T,0xcfd3d6,{m:.85,r:.25}),ss=mc(T,0xc4c9cd,{m:.35,r:.38}),glass=mc(T,0xdfeeff,{op:.22,r:.05}),wood=M.wood,
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
 /* ---------------- Bedroom ---------------- */
 case 'bd-king':case 'bd-queen':case 'bd-full':case 'bd-twin':case 'bd-bunk':case 'bd-murphy':case 'bd-night':case 'bd-dresser':case 'bd-chest':case 'bd-wardrobe':case 'bd-vanity':case 'bd-bench':case 'bd-reading':{
  var linen=mc(T,0xf3efe6,{r:.92}),duv=mc(T,0x6f84a0,{r:.95}),duvD=mc(T,0x5a6d88,{r:.95}),thr=mc(T,0xc9a26b,{r:.95}),uph=mc(T,0x9a9086,{r:.95}),bwood=walnut,bwoodD=mc(T,0x5e3f2a,{r:.5}),brass=mc(T,0xc9a45a,{m:.8,r:.3}),fab=mc(T,0x8a9aae,{r:.92}),fabD=mc(T,0x6f7f94,{r:.92}),shade=mc(T,0xf6ead0,{e:0xffd28a,ei:.55,r:.8});
  var pillow=function(x,y,z,pw,pd,mat,tilt){var m=k.box(x,y,z,pw,.42,pd,mat||linen);m.rotation.x=-(tilt==null?.32:tilt);return m};
  var lamp=function(x,y,z,s){s=s||1;k.cyl(x,y,z,.2*s,.24*s,.08,brass,16);k.cyl(x,y+.08,z,.05*s,.05*s,.75*s,brass,10);k.cyl(x,y+.6*s,z,.24*s,.36*s,.55*s,shade,18)};
  var mattress=function(x,y,z,mw,md,cover){k.box(x,y,z,mw,.7,md,mc(T,0xffffff,{r:.85}));k.box(x,y+.33,z+md/2,mw-.02,.04,.02,mc(T,0xd8d4cc));
   if(!cover)return y+.7;var dz0=z-md/2+1.45,dl=md-1.45;k.box(x,y+.7,dz0+dl/2+.03,mw+.08,.1,dl+.06,duv);k.box(x,y+.05,z+md/2+.05,mw+.08,.75,.06,duv);[-1,1].forEach(function(q){k.box(x+q*(mw/2+.04),y+.08,dz0+dl/2,.06,.72,dl,duv)});
   k.box(x,y+.8,dz0+.25,mw+.09,.06,.5,linen);k.box(x,y+.81,z+md/2-.6,mw+.1,.05,1.1,cover===2?thr:duvD);k.box(x,y+.25,z+md/2+.09,mw+.1,.6,.03,cover===2?thr:duvD);return y+.8};
  if(/^bd-(king|queen|full|twin)$/.test(r)){var hbD=.35,fz=-d/2+hbD,fl=d-hbD,np=r==='bd-king'?3:r==='bd-twin'?1:2,mw2=w-.25,top;
   [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(function(q){k.box(q[0]*(w/2-.15),0,fz+fl/2+q[1]*(fl/2-.15),.22,.35,.22,bwoodD)});
   k.box(0,.35,fz+fl/2,w,.45,fl,bwood);k.box(0,.75,fz+fl/2,w-.12,.05,fl-.1,bwoodD);
   top=mattress(0,.8,fz+fl/2-.02,mw2,fl-.2,r==='bd-twin'?2:1);
   k.box(0,0,-d/2+hbD/2,w+.1,h,hbD,bwood);k.box(0,1.55,-d/2+hbD+.02,w-.3,h-1.85,.08,uph);
   var bt=[];for(var bxi=1;bxi<Math.round(w/.9);bxi++)for(var byi=1;byi<3;byi++)bt.push([-w/2+.15+bxi*(w-.3)/Math.round(w/.9),1.55+byi*(h-1.85)/3,-d/2+hbD+.07,.06,.06,.03]);inst('box',mc(T,0x6f665c,{r:.8}),bt);
   k.box(0,h-.06,-d/2+hbD/2,w+.18,.08,hbD+.08,bwoodD);
   var pw2=(mw2-.3-(np-1)*.12)/np;for(var pi=0;pi<np;pi++)pillow(-mw2/2+.15+pw2/2+pi*(pw2+.12),top-.02,fz+.55,pw2,1,linen);
   if(np>1)for(var pj=0;pj<np-(np>2?1:0);pj++)pillow(-mw2/2+.4+(np>2?pw2/2+.06:pw2/2)+pj*(pw2+.12)+(np>2?.0:0),top+.05,fz+1.05,Math.min(pw2*.7,1.2),.35,mc(T,0xc9a26b,{r:.95}),.15);
   return true}
  if(r==='bd-bunk'){var pz=-d/2+.12,pz2=d/2-.12;[[-1,pz],[1,pz],[-1,pz2],[1,pz2]].forEach(function(q){k.box(q[0]*(w/2-.12),0,q[1],.24,h,.24,oak)});
   [.6,3.15].forEach(function(y,i){k.box(0,y,0,w-.1,.35,d-.1,oak);[-1,1].forEach(function(q){k.box(0,y+.35,q*(d/2-.12),w-.3,.12,.12,oak)});mattress(0,y+.35,0,w-.4,d-.45,i?1:2);pillow(0,y+1.05,-d/2+.75,w-.9,.95,linen)});
   [-d/2+.12,d/2-.12].forEach(function(z){k.box(0,4.2,z,w-.3,.12,.12,oak);k.box(0,4.6,z,w-.3,.12,.12,oak)});k.box(-w/2+.12,4.2,0,.12,.12,d-.3,oak);k.box(-w/2+.12,4.6,0,.12,.12,d-.3,oak);
   k.box(w/2-.12,4.4,-d/4,.12,.12,d/2,oak);var lr=[];for(var li=1;li<6;li++)lr.push([w/2+.05,li*.78,d/4,.08,.08,1.4]);[[d/4-.68],[d/4+.68]].forEach(function(q){k.box(w/2+.05,0,q[0],.12,4.7,.12,oak)});inst('box',oak,lr);return true}
  if(r==='bd-murphy'){var mcab=mc(T,0xe9dcc4,{r:.55});k.box(0,0,-d/2+.04,w,h,.08,mcab);[-1,1].forEach(function(q){k.box(q*(w/2-.06),0,0,.12,h,d,mcab)});k.box(0,h-.2,0,w,.2,d,mcab);k.box(0,h-.05,0,w+.15,.12,d+.12,mc(T,0xd8c9ae,{r:.5}));k.box(0,0,0,w,.3,d,mc(T,0xd8c9ae,{r:.5}));
   k.box(0,.3,d/2-.25,w-.25,h-.55,.4,mcab);var pl2=[];[1,2].forEach(function(i){pl2.push([-w/2+.12+i*(w-.24)/3,.3+(h-.55)/2,d/2-.04,.03,h-.75,.02])});pl2.push([0,.3+(h-.55)*.5,d/2-.04,w-.4,.03,.02]);inst('box',mc(T,0xcbbb9e),pl2);
   hcyl(0,h*.42,d/2+.06,.04,w*.55,brass,'x');[-1,1].forEach(function(q){k.box(q*w*.27,h*.42-.08,d/2+.01,.06,.16,.08,brass)});k.box(0,h-.42,d/2-.03,w-.5,.04,.04,lit(0xffd9a0,1.3));return true}
  if(r==='bd-night'){k.legs(w,d,.45,.12,bwoodD,.05);k.box(0,.45,0,w,h-.55,d,bwood);k.box(0,h-.1,0,w+.05,.1,d+.05,bwoodD);drawers(-w/2+.06,w/2-.06,.55,h-.15,d/2-.0,2,mc(T,0x8a5e3e,{r:.5}));lamp(-w*.18,h,-d*.1,.9);
   k.box(w*.2,h,0,.32,.04,.6,blk);k.box(w*.2,h+.04,0,.28,.01,.55,lit(0x334455,.4));return true}
  if(r==='bd-dresser'||r==='bd-chest'){var two=r==='bd-dresser',nd=two?3:5,dh=h-.62,front=mc(T,0x8a5e3e,{r:.5});k.legs(w,d,.35,.14,bwoodD,.06);k.box(0,.35,-.02,w,dh+.17,d-.04,bwood);k.box(0,h-.1,0,w+.08,.1,d+.06,bwoodD);
   if(two){drawers(-w/2+.08,-.02,.45,h-.15,d/2-.02,nd,front);drawers(.02,w/2-.08,.45,h-.15,d/2-.02,nd,front);k.cyl(w*.3,h,-.1,.2,.16,.35,mc(T,0xe8e2d4),14);sph(w*.3,h+.55,-.1,.28,mc(T,0x4f8a3a,{r:.9}));k.box(-w*.3,h,-.1,1,.05,.6,mc(T,0x2a2a2a,{r:.4}));k.box(-w*.32,h+.05,-.1,.5,.08,.35,brass)}
   else{drawers(-w/2+.08,w/2-.08,.45,h-.15,d/2-.02,nd,front);k.box(0,h,-.15,.9,.06,.6,mc(T,0x2a2a2a,{r:.4}));k.box(0,h+.06,-.15,.18,.5,.18,mc(T,0xd9d6cf,{r:.3}))}return true}
  if(r==='bd-wardrobe'){var fw=mc(T,0x8a5e3e,{r:.5});k.legs(w,d,.3,.18,bwoodD,.08);k.box(0,.3,0,w,h-.6,d,bwood);k.box(0,h-.3,0,w+.15,.3,d+.12,bwoodD);k.box(0,h-.35,d/2+.03,w+.05,.05,.06,brass);
   drawers(-w/2+.06,w/2-.06,.4,1.6,d/2,2,fw);doors(-w/2+.06,w/2-.06,1.68,h-.42,d/2,2,fw,false);[-1,1].forEach(function(q){k.box(q*.18,h*.55,d/2+.05,.04,.9,.05,brass);k.box(q*(w/4),1.68+(h-2.1)/2,d/2+.03,w/2-.5,h-2.6,.015,mc(T,0x7a5236,{r:.45}))});return true}
  if(r==='bd-vanity'){var tz=-.25,td=d-.5,th2=2.5;k.legs(w,td,th2-.1,.12,mc(T,0xffffff,{r:.4}),.05);k.box(0,th2-.45,tz,w,.35,td,white);k.box(0,th2-.1,tz,w+.05,.1,td+.05,mc(T,0xf2efe8,{r:.3}));drawers(-w/2+.15,w/2-.15,th2-.42,th2-.12,tz+td/2,1,white);
   k.box(0,th2,-d/2+.1,w-.3,h-th2-.05,.08,white);k.box(0,th2+.15,-d/2+.15,w-.6,h-th2-.35,.02,mc(T,0xdde8ee,{m:.25,r:.08}));var bl=[];for(var vi=0;vi<5;vi++){bl.push([-w/2+.3+vi*(w-.6)/4,h-.12,-d/2+.16,.14,.14,.14]);if(vi%4===0)for(var vj=1;vj<4;vj++)bl.push([-w/2+.3+vi*(w-.6)/4,th2+.15+vj*(h-th2-.35)/4,-d/2+.16,.14,.14,.14])}inst('sph',lit(0xfff1cc,1.6),bl);
   k.cyl(0,0,d/2-.45,.42,.38,1.5,mc(T,0xc49aa8,{r:.9}),18);k.cyl(0,1.5,d/2-.45,.43,.43,.08,mc(T,0xd8b0bc,{r:.9}),18);k.box(w*.25,th2,tz,.3,.25,.3,mc(T,0xf2c6d0,{r:.3}));k.cyl(w*.1,th2,tz-.1,.06,.06,.35,mc(T,0x2a2a2a,{r:.3}));return true}
  if(r==='bd-bench'){k.legs(w,d,.9,.14,bwoodD,.06);k.box(0,.85,0,w,.25,d,bwood);k.box(0,1.1,0,w-.08,.48,d-.08,uph);var tf=[];for(var ti=1;ti<6;ti++)for(var tj=1;tj<3;tj++)tf.push([-w/2+w*ti/6,1.58,-d/2+d*tj/3,.05,.03,.05]);inst('box',mc(T,0x6f665c),tf);k.box(0,.3,0,w-.4,.06,d-.3,bwoodD);return true}
  if(r==='bd-reading'){var cw=w-.9,cx=-w/2+cw/2;k.box(cx,.25,0,cw,1.05,d,fabD);k.box(cx,1.3,-d/2+.42,cw-.6,2.1,.8,fabD);[-1,1].forEach(function(q){k.box(cx+q*(cw/2-.3),1.3,.1,.6,.75,d-.2,fabD)});k.box(cx,1.3,.2,cw-1.2,.35,d-1.2,fab);k.box(cx,2.6,-d/2+.55,cw-1,.6,.3,fab);
   [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){k.box(cx+q[0]*(cw/2-.2),0,q[1]*(d/2-.2),.14,.25,.14,bwoodD)});k.box(cx+.3,1.65,.3,.5,.3,.5,thr);
   var lx=w/2-.4,lz=-d/2+.45;k.cyl(lx,0,lz,.32,.34,.08,blk,18);k.cyl(lx,.08,lz,.04,.04,h-.6,brass,10);var arm=k.box(lx-.6,h-.6,lz+.35,1.3,.05,.05,brass);arm.rotation.y=-.55;k.cyl(lx-1.15,h-.95,lz+.7,.18,.42,.45,shade,18);return true}
  return false}
 /* ---------------- Bathroom ---------------- */
 case 'ba-toilet':case 'ba-smart':case 'ba-urinal':case 'ba-pedestal':case 'ba-van1':case 'ba-van2':case 'ba-shower':case 'ba-walkin':case 'ba-tub':case 'ba-freetub':case 'ba-linen':case 'ba-towel':case 'ba-tankless':{
  var porc=mc(T,0xf9f9f6,{r:.16}),porcS=mc(T,0xe9ecec,{r:.2}),wtr=mc(T,0x9fd3ea,{op:.7,r:.04,e:0x2a6a88,ei:.08}),tile=mc(T,0xe6e7e2,{r:.35}),grout=mc(T,0xc9cbc6,{r:.8}),glz=mc(T,0xd8ecf6,{op:.2,r:.03,m:.1}),mir=mc(T,0xdde8ee,{m:.25,r:.08}),cabB=mc(T,0x34465a,{r:.5}),qtz=mc(T,0xf1efea,{r:.25});
  var oval=function(x,y,z,rx,rz,hh,mat,rb){var m=k.cyl(x,y,z,rx,rb==null?rx:rb,hh,mat,28);m.scale.z=rz/rx;return m};
  var faucetT=function(x,y,z,sc){sc=sc||1;k.cyl(x,y,z,.07*sc,.08*sc,.55*sc,chrome,12);var sp=hcyl(x,y+.5*sc,z+.18*sc,.035*sc,.38*sc,chrome,'z');[-1,1].forEach(function(q){k.cyl(x+q*.3*sc,y,z,.05,.06,.12,chrome,10);k.box(x+q*.3*sc,y+.12,z,.05,.03,.18,chrome)})};
  var tileWall=function(x,y,z,ww,hh,ax){if(ax==='x'){k.box(x,y,z,.08,hh,ww,tile);var gl=[];for(var yy=y+.5;yy<y+hh;yy+=.5)gl.push([x+(x>0?-.045:.045),yy,z,.01,.012,ww]);for(var zz=z-ww/2+1;zz<z+ww/2;zz+=1)gl.push([x+(x>0?-.045:.045),y+hh/2,zz,.01,hh,.012]);inst('box',grout,gl)}
   else{k.box(x,y,z,ww,hh,.08,tile);var gl2=[];for(var y3=y+.5;y3<y+hh;y3+=.5)gl2.push([x,y3,z+.045,ww,.012,.01]);for(var x3=x-ww/2+1;x3<x+ww/2;x3+=1)gl2.push([x3,y+hh/2,z+.045,.012,hh,.01]);inst('box',grout,gl2)}};
  var bottlesB=function(x,y,z){inst('cyl',mc(T,0xffffff,{r:.3}),[[x-.12,y+.18,z,.14,.36,.14],[x+.08,y+.15,z,.13,.3,.13],[x+.25,y+.2,z,.12,.4,.12]],[0x3a7ab0,0xf0f0ec,0x6aa84f])};
  if(r==='ba-toilet'||r==='ba-smart'){var sm=r==='ba-smart',bz=-d/2+1.35;
   oval(0,0,bz-.1,.3,.42,1.05,porc,.36);oval(0,1.0,bz,.5,.66,.38,porc,.38);oval(0,1.38,bz+.02,.52,.68,.06,sm?mc(T,0xf2f2ef,{r:.25}):white);oval(0,1.3,bz+.02,.33,.46,.1,wtr);
   if(sm){k.box(0,0,-d/2+.42,w*.72,1.5,.8,porc);oval(0,1.5,-d/2+.5,.5,.32,.12,porc);var lid=k.box(0,1.45,-d/2+.86,w*.66,.06,1.2,mc(T,0xf2f2ef,{r:.25}));lid.rotation.x=-1.25;lid.position.set(0,2.0,-d/2+.92);
    k.box(w/2-.16,1.25,-d/2+.6,.2,.35,.6,mc(T,0x3d4148,{r:.3}));k.box(w/2-.06,1.42,-d/2+.6,.02,.12,.35,lit(0x38d0ff,1.4));k.box(0,.05,bz+.4,.5,.04,.04,lit(0x6fb8ff,1.2))}
   else{k.box(0,1.3,-d/2+.32,w*.82,1.15,.58,porc);k.box(0,2.45,-d/2+.32,w*.88,.1,.64,porc);k.box(w*.3,2.15,-d/2+.62,.18,.06,.06,chrome);var lid2=k.box(0,1.44,bz+.02,.9,.05,1.15,white);lid2.rotation.x=-1.32;lid2.position.set(0,1.95,-d/2+.66)}
   k.cyl(-w*.3,.4,-d/2+.08,.035,.035,.6,chrome,8);k.cyl(-w*.3,.4,-d/2+.08,.07,.07,.08,chrome,10);return true}
  if(r==='ba-urinal'){k.box(0,0,-d/2+.04,w,h+.2,.08,tile);oval(0,1.75,-d/2+.42,.42,.36,1.6,porc,.34);k.box(0,1.75,-d/2+.22,w*.8,1.9,.38,porc);oval(0,2.7,-d/2+.5,.28,.24,.03,wtr);oval(0,1.82,-d/2+.5,.12,.1,.02,mc(T,0xc9b0e0,{r:.6}));
   k.cyl(0,3.45,-d/2+.22,.05,.05,.5,chrome,10);k.box(0,3.6,-d/2+.15,.25,.25,.2,chrome);k.box(.05,3.66,-d/2+.3,.25,.04,.04,chrome);k.cyl(0,1.4,-d/2+.12,.08,.08,.35,chrome,10);return true}
  if(r==='ba-pedestal'){k.box(0,0,-d/2+.04,w,h+.4,.08,tile);oval(0,0,-.05,.26,.2,2.45,porc,.34);var bowl=oval(0,2.4,0,w/2,d/2-.05,.5,porc,w/2-.2);oval(0,2.86,.08,w/2-.22,d/2-.3,.04,porcS);k.cyl(0,2.88,.08,.05,.05,.01,chrome);
   faucetT(0,2.9,-d/2+.3,.8);k.box(0,h+.05,-d/2+.15,w*.6,.04,.25,qtz);bottlesB(w*.15,h+.09,-d/2+.15);return true}
  if(r==='ba-van1'||r==='ba-van2'){var dbl=r==='ba-van2',ch=2.85,sinks=dbl?[-w/4,w/4]:[0];k.box(0,0,-.05,w,.33,d-.2,blk);k.box(0,.33,-.03,w,ch-.45,d-.06,cabB);
   if(dbl){doors(-w/2+.05,-w/2+1.6,.4,ch-.18,d/2-.02,2,cabB);drawers(-w/2+1.65,w/2-1.65,.4,ch-.18,d/2-.02,3,cabB);doors(w/2-1.6,w/2-.05,.4,ch-.18,d/2-.02,2,cabB)}else{drawers(-w/2+.05,-w/2+.95,.4,ch-.18,d/2-.02,3,cabB);doors(-w/2+1,w/2-.05,.4,ch-.18,d/2-.02,2,cabB)}
   k.box(0,ch-.12,0,w+.06,.12,d+.04,qtz);k.box(0,ch,-d/2+.04,w,.42,.08,qtz);
   sinks.forEach(function(x){oval(x,ch-.005,.08,.7,.5,.01,porcS);k.cyl(x,ch,.12,.05,.05,.01,chrome);faucetT(x,ch,-d/2+.3,.8);
    var mw3=dbl?w/2-.5:w-.4;k.box(x,3.5,-d/2+.03,mw3,2.4,.05,blk);k.box(x,3.55,-d/2+.06,mw3-.1,2.3,.02,mir);[-1,1].forEach(function(q){if(!dbl||q===(x<0?-1:1)||true){k.box(x+q*(mw3/2+.18),4.6,-d/2+.08,.12,.55,.12,lit(0xfff1cc,1.3));k.box(x+q*(mw3/2+.18),4.55,-d/2+.04,.2,.12,.06,chrome)}})});
   bottlesB(dbl?0:w/2-.55,ch,-d/2+.25);inst('box',mc(T,0xffffff,{r:.95}),[[dbl?-.15:-w/2+.45,ch+.08,-d/2+.3,.6,.16,.4],[dbl?-.15:-w/2+.45,ch+.24,-d/2+.3,.55,.16,.38]],[0xe9e6df,0x8fb6cc]);return true}
  if(r==='ba-shower'){var pan=.35;k.box(0,0,0,w,pan,d,porc);k.box(0,pan-.01,0,w-.3,.02,d-.3,porcS);k.cyl(0,pan,0,.12,.12,.01,ss,16);
   tileWall(0,pan,-d/2+.04,w,h-pan);tileWall(-w/2+.04,pan,0,d,h-pan,'x');tileWall(w/2-.04,pan,0,d,h-pan,'x');k.box(0,h-.06,0,w,.06,d,mc(T,0xf3f3f0,{r:.5}));
   k.box(0,pan,d/2-.04,w-.16,h-pan-.2,.03,glz);[[-w/2+.1],[w/2-.1]].forEach(function(q){k.box(q[0],pan,d/2-.04,.05,h-pan-.2,.06,chrome)});k.box(0,h-.24,d/2-.04,w-.1,.05,.06,chrome);k.box(0,pan,d/2-.04,w-.1,.04,.06,chrome);handle(w/2-.55,3.5,d/2+.03,1,true);
   hcyl(0,6.3,-d/2+.3,.04,.5,chrome,'z');k.cyl(0,6.15,-d/2+.6,.28,.18,.12,chrome,20);k.cyl(0,3.7,-d/2+.08,.28,.28,.03,chrome,20);k.box(0,3.7,-d/2+.13,.08,.08,.4,chrome);
   k.box(-w/2+.55,4.2,-d/2+.12,.7,.04,.2,mc(T,0xd9dbd6,{r:.3}));bottlesB(-w/2+.5,4.24,-d/2+.12);return true}
  if(r==='ba-walkin'){var tf2=mc(T,0xcfd2ce,{r:.5});k.box(0,0,0,w,.08,d,tf2);var fg=[];for(var fx=-w/2+.5;fx<w/2;fx+=.5)fg.push([fx,.081,0,.012,.003,d]);for(var fz2=-d/2+.5;fz2<d/2;fz2+=.5)fg.push([0,.081,fz2,w,.003,.012]);inst('box',grout,fg);
   k.box(0,.08,-d/2+.3,w-.6,.012,.16,ss);tileWall(0,.08,-d/2+.04,w,h-.08);tileWall(-w/2+.04,.08,0,d,h-.08,'x');
   k.box(w/4,.08,d/2-.06,w/2-.2,h-.3,.03,glz);k.box(w/4,.08,d/2-.06,w/2-.2,.05,.06,chrome);var bar=k.box(w/2-.3,h-.5,0,.04,.04,d-.1,chrome);
   hcyl(-w/4,h-.25,-d/2+.6,.035,1.1,chrome,'z');k.box(-w/4,h-.32,-d/2+1.15,1,.05,1,ss);k.box(-w/4,h-.33,-d/2+1.15,.9,.01,.9,mc(T,0x9aa0a6,{m:.6,r:.3}));
   k.box(w/4,3,-d/2+.1,.05,2.2,.05,chrome);k.box(w/4,4.4,-d/2+.2,.12,.12,.25,chrome);hcyl(w/4,4.5,-d/2+.38,.06,.3,chrome,'z');k.cyl(-w/2+1.2,3.6,-d/2+.08,.3,.3,.03,chrome,20);
   k.box(-w/2+.06,3.8,-.2,.12,1.4,1.2,mc(T,0xd2d4cf,{r:.4}));k.box(-w/2+.15,3.8,-.2,.12,.04,1.1,tile);bottlesB(-w/2+.2,3.84,-.45);return true}
  if(r==='ba-tub'){var tH=1.75,tz2=.08,td2=d-.16;k.box(0,0,tz2,w,tH-.3,td2,porc);k.box(0,tH-.3,tz2+td2/2-.18,w,.3,.36,porc);k.box(0,tH-.3,tz2-td2/2+.12,w,.3,.24,porc);[-1,1].forEach(function(q){k.box(q*(w/2-.2),tH-.3,tz2,.4,.3,td2,porc)});
   k.box(.1,tH-.72,tz2,w-.8,.02,td2-.6,wtr);k.box(0,tH-.31,tz2,w-.4,.01,td2-.55,porcS);
   tileWall(0,tH,-d/2+.04,w,h-tH);tileWall(-w/2+.04,tH,0,d,h-tH,'x');tileWall(w/2-.04,tH,0,d,h-tH,'x');k.box(0,0,d/2-.04,w,.33,.04,mc(T,0xe9e9e4,{r:.3}));
   k.cyl(-w/2+.08,2.6,0,.16,.16,.03,chrome,16);k.box(-w/2+.2,2.3,0,.25,.08,.1,chrome);k.cyl(-w/2+.08,3.6,0,.2,.2,.03,chrome,16);hcyl(-w/2+.3,6.2,0,.035,.45,chrome,'x');var hd=k.cyl(-w/2+.55,6.0,0,.2,.12,.12,chrome,16);hd.rotation.z=-.6;
   hcyl(0,6.6,d/2-.1,.03,w-.1,chrome,'x');var crt=[],cn=7;for(var ci=0;ci<cn;ci++)crt.push([w/2-.25-ci*.22,4.05,d/2-.1+(ci%2?.05:-.05),.2,5.1,.025]);inst('box',mc(T,0xffffff,{r:.95}),crt,[0xf0f2f4,0xdfe6ec]);
   k.box(w/2-.5,4.2,-d/2+.12,.7,.04,.2,mc(T,0xd9dbd6,{r:.3}));bottlesB(w/2-.55,4.24,-d/2+.12);return true}
  if(r==='ba-freetub'){var tl=w-.65,cxT=-.25,R=d/2-.05,sx=tl/2/R;var bdy=k.cyl(cxT,.1,0,R,R*.84,1.8,porc,40);bdy.scale.x=sx;var pl=k.cyl(cxT,0,0,R*.82,R*.82,.1,mc(T,0xbfc3c4,{m:.3,r:.4}),40);pl.scale.x=sx;
   var wt=k.cyl(cxT,1.82,0,R-.17,R-.17,.02,wtr,40);wt.scale.x=(tl/2-.17)/(R-.17);var inr=k.cyl(cxT,1.79,0,R-.12,R-.12,.03,porcS,40);inr.scale.x=(tl/2-.12)/(R-.12);
   var tor=new T.Mesh(new T.TorusGeometry(R-.07,.07,8,40),porc);tor.rotation.x=Math.PI/2;tor.scale.x=(tl/2-.07)/(R-.07);tor.position.set(cxT,1.9,0);tor.castShadow=tor.receiveShadow=true;g.add(tor);
   var fx2=w/2-.2;k.cyl(fx2,0,0,.18,.2,.06,chrome,16);k.cyl(fx2,.06,0,.06,.06,2.8,chrome,12);hcyl(fx2-.3,2.82,0,.045,.6,chrome,'x');k.cyl(fx2-.58,2.62,0,.04,.04,.2,chrome,10);k.box(fx2,1.8,.12,.06,.06,.2,chrome);k.cyl(fx2,2.2,.1,.05,.05,.4,chrome,10);
   inst('box',mc(T,0xffffff,{r:.95}),[[cxT-tl/2+.6,1.95,0,.6,.06,.45]],[0xe9e6df]);k.cyl(cxT-tl/2+.9,1.95,0,.08,.08,.04,mc(T,0xffe07a,{r:.6}),10);return true}
  if(r==='ba-linen'){k.box(0,0,0,w,.3,d,mc(T,0xe8e8e4,{r:.5}));k.box(0,.3,-.02,w,h-.4,d-.04,white);k.box(0,h-.1,0,w+.06,.1,d+.06,mc(T,0xf0f0ec,{r:.45}));doors(-w/2+.04,w/2-.04,.34,2.4,d/2-.02,2,white);
   k.box(0,2.45,0,w-.12,.04,d-.15,mc(T,0xe9e9e4));[3.6,4.75].forEach(function(y){k.box(0,y,0,w-.12,.04,d-.15,mc(T,0xe9e9e4))});
   var tw2=[],tc=[];[[2.49,0x8fb6cc],[3.64,0xe9e6df],[4.79,0xd9c4a8]].forEach(function(q,i){for(var ti=0;ti<2;ti++)for(var tj=0;tj<2;tj++)tw2.push([-w/4+ti*w/2,q[0]+.2+tj*.36,.05,w/2-.12,.34,d-.4])});inst('box',mc(T,0xffffff,{r:.95}),tw2,[0x8fb6cc,0xe9e6df,0xd9c4a8,0x8fb6cc,0xe9e6df]);
   k.box(0,2.45,d/2-.03,w-.1,h-2.6,.02,glz);[-1,1].forEach(function(q){k.box(q*(w/2-.03),2.45,d/2-.03,.05,h-2.6,.04,white)});handle(0,1.4,d/2+.03,.5,true);return true}
  if(r==='ba-towel'){var tz3=-d/2+.2;[-1,1].forEach(function(q){k.cyl(q*(w/2-.12),.9,tz3,.045,.045,h-.95,chrome,10);[1.2,h-.3].forEach(function(y){hcyl(q*(w/2-.12),y,tz3-.1,.03,.2,chrome,'z');k.cyl(q*(w/2-.12),y-.05,-d/2+.02,.07,.07,.1,chrome,10).rotation.x=Math.PI/2})});
   var rb=[];for(var ry=1.1;ry<h-.05;ry+=.28)rb.push([0,ry,tz3,w-.24,.06,.06]);inst('box',chrome,rb);k.box(-.15,2.2,tz3+.08,w*.55,1.2,.04,mc(T,0xd9c4a8,{r:.95}));k.box(-.15,2.2,tz3-.08,w*.55,1.2,.04,mc(T,0xd9c4a8,{r:.95}));k.box(-.15,3.36,tz3,w*.55,.08,.2,mc(T,0xd9c4a8,{r:.95}));
   k.box(w/2-.12,.62,tz3,.14,.2,.12,mc(T,0xe8e8e4));k.box(w/2-.12,.7,tz3+.065,.04,.04,.01,lit(0xff5533,1.4));return true}
  if(r==='ba-tankless'){var y0=.9,uh=h-y0;k.box(0,y0,-.02,w,uh,d-.04,white);k.box(0,y0+.05,d/2-.05,w-.1,uh-.1,.02,mc(T,0xf4f4f2,{r:.4}));k.box(0,y0+uh*.62,d/2-.02,.55,.3,.02,mc(T,0x2a2d33,{r:.3}));k.box(0,y0+uh*.62+.02,d/2-.01,.35,.12,.01,lit(0x38d0ff,1.5));
   [[-.4,0x2b6fd9],[0,0xa8a8a8],[.4,0xd92b2b]].forEach(function(q){k.cyl(q[0],0,0,.06,.06,y0,mc(T,0xc8743a,{m:.7,r:.3}),10);k.box(q[0],y0-.32,0,.14,.1,.14,mc(T,q[1],{r:.5}))});
   k.cyl(w/2-.2,h,0,.08,.08,1.2,mc(T,0x8a8d90,{m:.5,r:.4}),10);k.box(-.3,y0+uh-.25,d/2-.03,.3,.05,.01,mc(T,0x9aa0a6));return true}
  return false}
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
   k.box(0,bh+.02,-d/2+.04,w-.2,Math.min(h-bh-.6,3.4),.06,mc(T,0xaebbc4,{m:.4,r:.12}));
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
 case 'l-fridge':case 'kr-bev':case 'l-wine':{var wine=r==='l-wine';k.box(0,0,0,w-.1,.1,d-.1,rubber);[-1,1].forEach(function(s){k.box(s*(w/2-.05),.1,0,.1,h-.1,d,blk)});k.box(0,h-.1,0,w,.1,d,blk);k.box(0,.1,0,w,.25,d,blk);k.box(0,.1,-d/2+.05,w,h-.1,.1,lit(wine?0x5a3a66:0xe0f0ff,wine?.35:.55));k.box(0,h-.16,0,w-.2,.04,d-.2,lit(0xffffff,1.4));
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
 /* ---------------- shared bits for furniture & kitchens ---------------- */
 case 'f-stool':case 'f-sofa':case 'f-chair':case 'f-coffee':case 'f-tv':case 'f-dine8':case 'f-round4':case 'f-sectL':case 'f-sectU':case 'f-fire':case 'f-fireplace':case 'f-hightop':case 'f-game4':case 'f-chess':case 'f-massage':
 case 'kr-range':case 'kr-gasrange':case 'kr-fridge':case 'kr-freezer':case 'kr-dw':case 'kr-micro':case 'kr-sink':case 'kr-wallov':case 'kr-island':case 'kr-islsink':case 'kr-cooktop':case 'kr-tall':case 'kr-chest':case 'kr-trash':
 case 'kc-range':case 'kc-fridge':case 'kc-dw':case 'kc-3sink':case 'kc-hand':case 'kc-conv':case 'kc-griddle':case 'kc-fryer':case 'kc-broiler':case 'kc-pizza':case 'kc-steam':case 'kc-mixer':case 'kc-table':case 'kc-prepfr':case 'kc-under':case 'kc-freezer':case 'kc-walkin':case 'kc-dish':case 'kc-shelf':case 'kc-rack':case 'kc-mop':{
  var fabric=mc(T,0x4d5f73,{r:.95}),fabric2=mc(T,0x56697e,{r:.95}),leather=mc(T,0x6b3f26,{r:.55}),glassB=mc(T,0x101214,{r:.08,m:.2}),cabW=mc(T,0xeeebe4,{r:.55}),cabG=mc(T,0x5d6b62,{r:.55}),
   sub=function(x,z,ry){var gg=new T.Group();gg.position.set(x,0,z);gg.rotation.y=ry||0;g.add(gg);return Kit(T,gg)},
   chair=function(x,z,ry,mat,sh){var kk=sub(x,z,ry);sh=sh||1.5;kk.legs(1.4,1.4,sh,.1,mat||walnut,.08);kk.box(0,sh,0,1.4,.12,1.4,mat||walnut);kk.box(0,sh+.12,.05,1.25,.12,1.2,fabric2);kk.box(0,sh,-.62,1.4,1.4,.12,mat||walnut);return kk},
   stool=function(x,z,ry,sh){var kk=sub(x,z,ry);sh=sh||2.5;kk.cyl(0,0,0,.55,.6,.06,blk,18);kk.cyl(0,0,0,.06,.06,sh-.15,chrome);var fr=kk.cyl(0,sh*.35,0,.42,.42,.04,chrome,18);kk.cyl(0,sh-.15,0,.6,.55,.18,leather,18);kk.box(0,sh,-.5,.9,.5,.08,leather);return kk},
   sofaK=function(kk,sw,sd,mat,arms,legsOn){var sh=1.25;kk.box(0,.3,0,sw,sh-.3-.2,sd,mat);kk.box(0,1.05,-sd/2+.4,sw,1.6,.8,mat);
    if(arms!==false){[-1,1].forEach(function(s){kk.box(s*(sw/2-.3),.3,0,.6,1.75,sd,mat)})}var aw=arms!==false?.6:0,n=Math.max(1,Math.round((sw-2*aw)/2.4)),cw=(sw-2*aw)/n;
    for(var i=0;i<n;i++){var cx=-sw/2+aw+cw*(i+.5);kk.box(cx,.85,.3,cw-.06,.4,sd-.85,fabric2);kk.box(cx,1.25,-sd/2+.95,cw-.1,1.15,.45,fabric2)}if(legsOn!==false)kk.legs(sw,sd,.3,.12,walnut,.1)},
   knobs=function(x0,x1,y,z,n,mat){var a=[];for(var i=0;i<n;i++)a.push([x0+(n>1?i*(x1-x0)/(n-1):0),y,z,.14,.1,.14,Math.PI/2]);inst('cyl',mat||blk,a)},
   sLegs=function(lw,ld,lh,shelf){var a=[],f=[];[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){a.push([q[0]*(lw/2-.1),lh/2,q[1]*(ld/2-.1),.12,lh,.12]);f.push([q[0]*(lw/2-.1),.04,q[1]*(ld/2-.1),.16,.08,.16])});inst('cyl',ss,a);inst('cyl',blk,f);if(shelf)k.box(0,shelf,0,lw-.1,.04,ld-.1,ss)},
   counterTop=function(ch,mat){k.box(0,ch-.12,0,w+.04,.12,d+.04,mat||stone)},
   baseCab=function(ch,mat){k.box(0,0,-.05,w,.35,d-.2,blk);k.box(0,.35,-.02,w,ch-.47,d-.08,mat||cabW)},
   oven=function(x,y,z,ow,oh,dark){k.box(x,y,z,ow,oh,.05,dark?glassB:ss);k.box(x,y+oh*.2,z+.03,ow*.7,oh*.45,.01,mc(T,0x0a0c0e,{r:.1}));handle(x,y+oh-.18,z+.08,ow*.75,false)},
   reach=function(nd,bodyMat,lbl){k.box(0,.45,0,w,h-1.1,d,bodyMat);inst('cyl',blk,[[-w/2+.25,.15,-d/2+.25,.25,.3,.25],[w/2-.25,.15,-d/2+.25,.25,.3,.25],[-w/2+.25,.15,d/2-.25,.25,.3,.25],[w/2-.25,.15,d/2-.25,.25,.3,.25]]);k.box(0,.3,0,w,.15,d,ss);
    var dw=w/nd;for(var i=0;i<nd;i++){var cx=-w/2+dw*(i+.5);k.box(cx,.55,d/2+.01,dw-.06,h-1.3,.05,bodyMat);handle(cx+(i%2?-1:1)*(dw/2-.2),h*.5,d/2+.05,1.3,true)}
    k.box(0,h-.65,0,w,.65,d,ss);var lv=[];for(var j=0;j<5;j++)lv.push([0,h-.55+j*.1,d/2+.01,w-.4,.03,.02]);inst('box',blk,lv);k.box(-w/2+.5,h-.72,d/2+.02,.4,.12,.01,lit(lbl||0x38d0ff,1.5))};
  switch(r){
  /* ---------- Furniture & Seating ---------- */
  case 'f-stool':stool(0,0,0,Math.max(2,h));return true;
  case 'f-sofa':sofaK(k,w,d,fabric);inst('box',mc(T,0xffffff,{r:.9}),[[-w/2+1.1,1.75,-d/2+1.05,1,.8,.25,-.25],[w/2-1.1,1.75,-d/2+1.05,1,.8,.25,-.25]],[0xe0b31b,0xc8743a]);return true;
  case 'f-chair':{k.box(0,.25,0,w,1.05,d,leather);k.box(0,1.3,-d/2+.45,w-.7,2.1,.9,leather);[-1,1].forEach(function(s){k.box(s*(w/2-.33),1.3,.1,.66,.75,d-.2,leather)});k.box(0,1.3,.2,w-1.3,.35,d-1.3,mc(T,0x7a4a2e,{r:.55}));k.box(0,2.6,-d/2+.6,w-1.1,.6,.35,mc(T,0x7a4a2e,{r:.55}));k.box(0,0,0,w-.3,.25,d-.3,blk);k.box(0,.55,d/2+.01,w-1.3,.6,.04,mc(T,0x5a3520,{r:.6}));return true}
  case 'f-coffee':{k.legs(w,d,h-.12,.18,walnut,.12);k.box(0,h-.12,0,w,.12,d,oak);k.box(0,.35,0,w-.4,.06,d-.4,walnut);inst('box',mc(T,0xffffff,{r:.7}),[[-w/4,h+.04,0,1,.08,.75],[-w/4,h+.12,0,.9,.08,.7],[-w/4,.45,0,1,.1,.7]],[0x2b6fd9,0xe0b31b,0x8a2a2a]);k.cyl(w/4,h,0,.32,.36,.06,mc(T,0x2a2a2a,{r:.5}),20);k.cyl(w/4,h+.06,0,.1,.1,.25,mc(T,0xe8e2d4));sph(w/4,h+.45,0,.25,mc(T,0x4f8a3a,{r:.9}));return true}
  case 'f-tv':{var ch=Math.min(2,h*.4);k.box(0,.4,0,w,ch-.4,d,walnut);k.legs(w,d,.4,.1,blk,.25);doors(-w/2+.05,w/2-.05,.48,ch-.05,d/2+.01,3,mc(T,0x6b4a33,{r:.5}),false);
   var tw=Math.min(w*.95,6),th=tw*.5625;k.box(0,ch,-.1,1.2,.08,.7,blk);k.box(0,ch+.08,-.2,.15,.4,.1,blk);k.box(0,ch+.4,-.25,tw,th,.12,blk);k.box(0,ch+.46,-.18,tw-.14,th-.12,.01,scrMat(T,'movie',1.2));k.box(0,ch,.35,3,.2,.3,blk);k.box(-w/2+.8,ch,.1,.9,.25,.7,mc(T,0xf0f0f0,{r:.3}));return true}
  case 'f-dine8':{var tt=h-.15;[-1,1].forEach(function(s){k.box(s*(w/2-.6),0,0,.25,tt,d-.9,walnut)});k.box(0,.5,0,w-1.2,.2,.25,walnut);k.box(0,tt,0,w,.15,d,oak);
   var n=Math.max(2,Math.round((w-1)/2.2)),pts=[];for(var i=0;i<n;i++){var cx=-w/2+.5+(i+.5)*(w-1)/n;chair(cx,-d/2+.15,0);chair(cx,d/2-.15,Math.PI);pts.push([cx,tt+.16,-d/2+.75,.8,.03,.8],[cx,tt+.16,d/2-.75,.8,.03,.8])}chair(-w/2+.15,0,Math.PI/2);chair(w/2-.15,0,-Math.PI/2);pts.push([-w/2+.75,tt+.16,0,.8,.03,.8],[w/2-.75,tt+.16,0,.8,.03,.8]);
   inst('cyl',white,pts);k.cyl(0,tt+.15,0,.25,.2,.6,mc(T,0xdfeeff,{op:.5,r:.05}));sph(0,tt+.85,0,.3,mc(T,0x6aa84f,{r:.9}));return true}
  case 'f-round4':case 'f-game4':case 'f-chess':{var rnd=r==='f-round4',chess=r==='f-chess',tt2=h-.12,R=Math.min(w,d)/2;if(rnd){k.cyl(0,0,0,.7,.8,.1,blk,24);k.cyl(0,0,0,.18,.18,tt2,blk);k.cyl(0,tt2,0,R,R,.12,oak,36)}else{k.legs(chess?1.6:w-.7,chess?1.6:d-.7,tt2,.15,walnut,.05);k.box(0,tt2,0,chess?1.8:w-.5,.12,chess?1.8:d-.5,walnut)}
   var cr=chess?R-.05:R-.25;var seats=chess?[[0,1],[0,-1]]:[[0,1],[0,-1],[1,0],[-1,0]];seats.forEach(function(q){chair(q[0]*cr,q[1]*cr,Math.atan2(-q[0],-q[1]))});
   if(r==='f-game4'){k.box(0,tt2+.12,0,w-1,.02,d-1,M.felt);var ch2=[],cols=[0xd92b2b,0x2b6fd9,0xf0f0f0,0x1a1a1a];for(var p=0;p<16;p++)ch2.push([(p%4-1.5)*.18+.5,tt2+.17+Math.floor(p/4)*.035,-.4,.14,.03,.14]);inst('cyl',mc(T,0xffffff,{r:.4}),ch2,cols);inst('box',white,[[-.4,tt2+.15,.2,.25,.01,.35,0,.3],[-.1,tt2+.15,.3,.25,.01,.35,0,-.2],[.2,tt2+.15,.25,.25,.01,.35,0,.1]])}
   if(chess){var sq=[],sq2=[],pc=[],pc2=[];for(var a=0;a<8;a++)for(var b=0;b<8;b++){(a+b)%2?sq.push([-.7+a*.2,tt2+.125,-.7+b*.2,.2,.01,.2]):sq2.push([-.7+a*.2,tt2+.125,-.7+b*.2,.2,.01,.2]);if(b<2)pc.push([-.7+a*.2,tt2+.13+(b?.06:.1),-.7+b*.2,.11,b?.12:.2,.11]);if(b>5)pc2.push([-.7+a*.2,tt2+.13+(b<7?.06:.1),-.7+b*.2,.11,b<7?.12:.2,.11])}
    inst('box',mc(T,0x2a1a10),sq);inst('box',mc(T,0xe9dcc0),sq2);inst('cyl',mc(T,0xf3efe6,{r:.3}),pc);inst('cyl',mc(T,0x1a1a1a,{r:.3}),pc2)}
   if(rnd){k.cyl(0,tt2+.12,0,.12,.1,.35,mc(T,0xdfeeff,{op:.5}));inst('cyl',white,[[.8,tt2+.14,0,.7,.03,.7],[-.8,tt2+.14,0,.7,.03,.7],[0,tt2+.14,.8,.7,.03,.7],[0,tt2+.14,-.8,.7,.03,.7]])}return true}
  case 'f-hightop':{var tt3=Math.min(h,3.5)-.1;k.cyl(0,0,0,.6,.7,.08,blk,24);k.cyl(0,0,0,.12,.12,tt3,blk);k.cyl(0,tt3,0,Math.min(w,d)*.36,Math.min(w,d)*.36,.1,oak,30);
   [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(function(q){stool(q[0]*w*.36,q[1]*d*.36,Math.atan2(-q[0],-q[1]),2.5)});k.cyl(.2,tt3+.1,0,.12,.1,.4,mc(T,0xdfeeff,{op:.5}));return true}
  case 'f-sectL':case 'f-sectU':{var u=r==='f-sectU',sd=Math.min(3.2,d*.42);var kb=sub(0,-d/2+sd/2,0);sofaK(kb,w,sd,fabric,false);
   var ks=sub(-w/2+sd/2,(sd)/2,Math.PI/2);sofaK(ks,d-sd,sd,fabric,false);if(u){var kr2=sub(w/2-sd/2,sd/2,-Math.PI/2);sofaK(kr2,d-sd,sd,fabric,false)}
   if(!u)k.box(w/2-.3,.3,-d/2+sd/2,.6,1.45,sd,fabric);k.box(-w/2+sd/2,.3,d/2-.3,sd,1.45,.6,fabric);if(u)k.box(w/2-sd/2,.3,d/2-.3,sd,1.45,.6,fabric);
   inst('box',mc(T,0xffffff,{r:.9}),[[-w/2+1.3,1.75,-d/2+1.05,1,.8,.25,-.25,.6],[0,1.75,-d/2+1.05,1,.8,.25,-.25]],[0xe0b31b,0xc8743a]);return true}
  case 'f-fire':{var stoneD=mc(T,0x6e6a64,{r:.85});k.box(0,0,0,w,h-.15,d,stoneD);k.box(0,h-.15,0,w+.1,.15,d+.1,mc(T,0x9a958c,{r:.8}));k.box(0,h-.02,0,w*.6,.04,.5,blk);
   var gs=new T.Mesh(new T.BoxGeometry(w*.66,.5,.6),mc(T,0xdfeeff,{op:.2,r:.05}));gs.position.set(0,h+.25,0);g.add(gs);
   for(var f=0;f<7;f++){var fx=-w*.25+f*w*.5/6,fh=.35+((f*37)%5)*.07;k.cyl(fx,h,0,0,.11,fh,lit(f%2?0xff8a1a:0xffc23a,2.2),8)}k.box(0,h-.01,0,w*.55,.02,.35,lit(0xff5a10,1.4));return true}
  case 'f-fireplace':{var fw=w*.6,fh2=h*.5,fy=h*.2,bodyM=mc(T,0xe9e5dc,{r:.55});k.box(0,0,0,w,fy,d,bodyM);k.box(0,fy+fh2,0,w,h-.15-fy-fh2,d,bodyM);[-1,1].forEach(function(s){k.box(s*(fw/2+(w-fw)/4),fy,0,(w-fw)/2,fh2,d,bodyM)});k.box(0,fy,-d/2+.2,fw,fh2,d-.4,mc(T,0x0b0b0c,{r:.6}));k.box(0,h-.15,0,w+.15,.15,d+.1,oak);
   k.box(0,h*.2+.02,d/2-.02,fw,fh2,.02,mc(T,0x9fb5c8,{op:.18,r:.03}));[-.3,.3].forEach(function(o,i){var lg=hcyl(o*fw,h*.2+.12,d/2-.2,.08,fw*.5,mc(T,0x4a2e1c,{r:.9}),'x');lg.rotation.y=(i?-.2:.2)});k.box(0,h*.2,d/2-.2,fw*.8,.05,.15,lit(0xff4a10,1.6));
   for(var f2=0;f2<6;f2++)k.cyl(-fw*.3+f2*fw*.12,h*.2+.1,d/2-.22,0,.08,.3+((f2*29)%4)*.08,lit(f2%2?0xff8a1a:0xffc23a,2),8);
   [-1,1].forEach(function(s){doors(s>0?fw/2+.05:-w/2+.05,s>0?w/2-.05:-fw/2-.05,.15,h-.25,d/2+.01,1,mc(T,0xdedad0,{r:.55}))});k.cyl(-w/2+.6,h,-.1,.18,.15,.5,mc(T,0x6aa84f));sph(-w/2+.6,h+.65,-.1,.25,mc(T,0x4f8a3a,{r:.9}));k.box(w/2-.9,h,-.1,.8,.6,.08,mc(T,0x2a2a2a));return true}
  case 'f-massage':{var mk=mc(T,0x2a2a2e,{r:.5}),mk2=mc(T,0x8a7a66,{r:.7});k.box(0,0,-d/2+1.6,w,.6,2.6,mk);k.box(0,.6,-d/2+1.7,w-.9,.55,2.2,mk2);
   var bk=k.box(0,.6,-d/2+.55,w-.6,h-.6,.8,mk);bk.rotation.x=-.18;bk.position.set(0,.6+(h-.6)/2,-d/2+.75);var hr=k.box(0,h-.5,-d/2+.55,w-1.2,.55,.6,mk2);
   [-1,1].forEach(function(s){k.box(s*(w/2-.35),.6,-d/2+1.5,.7,1.35,2.2,mk)});var leg=k.box(0,.2,d/2-1.1,w-1.1,.45,1.8,mk);leg.rotation.x=.55;leg.position.set(0,.65,-d/2+3.4);k.box(0,0,d/2-.6,w-1.1,.6,1,mk);
   k.box(w/2-.35,1.95,-d/2+2.2,.3,.06,.5,lit(0x38d0ff,1));return true}
  /* ---------- Kitchen – Residential ---------- */
  case 'kr-range':case 'kr-gasrange':case 'kr-cooktop':{var gas=r==='kr-gasrange',ct=r==='kr-cooktop',ch3=ct?Math.min(h,3):2.95;
   if(ct){baseCab(ch3);drawers(-w/2,w/2,.35,ch3-.12,d/2-.04,3,cabW);counterTop(ch3)}else{k.box(0,.2,0,w,ch3-.2,d,ss);k.box(0,0,0,w-.2,.2,d-.2,blk);oven(0,.75,d/2,w-.15,1.75);k.box(0,.25,d/2,w-.15,.42,.04,ss);handle(0,.5,d/2+.04,w*.6,false);k.box(0,ch3-.02,0,w,.04,d,ss)}
   var top=ct?ch3:ch3;k.box(0,top,ct?0:.05,ct?w*.85:w,.03,ct?d*.8:d-.15,gas?mc(T,0x1a1a1a,{r:.6}):glassB);var bpos=[[-.27,-.25],[.27,-.25],[-.27,.27],[.27,.27]];
   if(gas){var gr=[];for(var gi=-2;gi<=2;gi++){gr.push([gi*w*.18,top+.06,0,.03,.05,d*.7]);gr.push([0,top+.06,gi*d*.14,w*.9,.05,.03])}inst('box',mc(T,0x111111,{m:.4,r:.5}),gr);inst('cyl',mc(T,0x2a2a2a,{m:.3}),bpos.map(function(b){return [b[0]*w,top+.05,b[1]*d,.3,.06,.3]}))}
   else inst('tor',mc(T,0x1a1a1a,{e:0x5a1008,ei:.35,r:.3}),bpos.map(function(b,i){var s=i%2?.55:.75;return [b[0]*w,top+.035,b[1]*d,s,s,.4,Math.PI/2]}));
   if(!ct){k.box(0,top,-d/2+.2,w,.55,.3,ss);k.box(.4,top+.25,-d/2+.36,.5,.14,.01,lit(0x38d0ff,1.4));knobs(-w/2+.3,-.05,top+.3,-d/2+.38,gas?4:3)}else knobs(-w/3,w/3,ch3-.35,d/2+.04,4);
   if(gas)knobs(-w/2+.3,w/2-.3,ch3-.25,d/2+.06,5);return true}
  case 'kr-fridge':case 'kr-freezer':{var fz=r==='kr-freezer',bm=fz?white:ss;k.box(0,.1,0,w,h-.1,d-.1,bm);k.box(0,0,0,w-.2,.1,d-.3,blk);
   if(fz){k.box(0,.15,d/2-.04,w-.04,h-.3,.06,bm);handle(-w/2+.25,h*.55,d/2+.03,1.4,true)}else{var fd=h*.32;k.box(0,.15,d/2-.04,w-.04,fd-.1,.07,bm);handle(0,fd-.25,d/2+.04,w*.7,false);
    [-1,1].forEach(function(s){k.box(s*w/4,fd+.05,d/2-.04,w/2-.03,h-fd-.2,.07,bm);handle(s*.12,fd+(h-fd)*.45,d/2+.04,1.6,true)});k.box(-w/4,fd+1.4,d/2+.005,.55,.8,.02,glassB);k.box(-w/4,fd+2.05,d/2+.02,.3,.08,.01,lit(0x38d0ff,1.4))}return true}
  case 'kr-dw':case 'kr-micro':case 'kr-sink':case 'kr-trash':{var ch4=Math.min(h,3);if(r==='kr-dw'){k.box(0,0,-.05,w,.35,d-.2,blk);k.box(0,.35,0,w,ch4-.47,d,cabW);k.box(0,.38,d/2,w-.04,ch4-.53,.05,ss);k.box(0,ch4-.4,d/2+.03,w-.1,.22,.02,blk);inst('box',mc(T,0x111111,{e:0x38d0ff,ei:1.6}),[[w/4,ch4-.29,d/2+.045,.2,.06,.01]]);handle(0,ch4-.55,d/2+.06,w*.75,false)}
   else{baseCab(ch4);if(r==='kr-micro'){k.box(0,ch4-.95,d/2-.02,w-.05,.78,.05,ss);k.box(-.25,ch4-.85,d/2+.01,w*.6,.5,.01,glassB);k.box(w/2-.35,ch4-.62,d/2+.01,.3,.15,.01,lit(0x33ff77,1.2));handle(0,ch4-.3,d/2+.05,w*.6,false);doors(-w/2,w/2,.35,ch4-1,d/2-.04,2,cabW)}
    else if(r==='kr-trash'){k.box(0,.38,d/2-.02,w-.05,ch4-.95,.05,cabW);handle(0,ch4-.75,d/2+.04,w*.6,false);drawers(-w/2,w/2,ch4-.58,ch4-.12,d/2-.04,1,cabW)}
    else{doors(-w/2,w/2,.35,ch4-.12,d/2-.04,2,cabW);k.box(0,ch4-.55,d/2-.02,w-.05,.4,.05,cabW)}}
   counterTop(ch4);if(r==='kr-sink'){k.box(0,ch4-.11,.05,w*.75,.02,d*.6,mc(T,0x8d969c,{m:.7,r:.25}));k.box(0,ch4-.1,.05,w*.68,.02,d*.52,mc(T,0x3d4348,{m:.6,r:.3}));k.cyl(0,ch4,-d/2+.25,.05,.06,1,chrome);hcyl(0,ch4+1,-d/2+.45,.04,.45,chrome,'z');k.cyl(w/2-.3,ch4,-d/2+.25,.08,.08,.35,mc(T,0x6aa84f,{r:.3}))}
   if(r==='kr-micro')k.cyl(-w/4,ch4,-.1,.2,.15,.4,mc(T,0xd9a441,{r:.6}));return true}
  case 'kr-wallov':case 'kr-tall':{var tall=r==='kr-tall';k.box(0,0,-.05,w,.35,d-.2,blk);k.box(0,.35,-.02,w,h-.35,d-.08,tall?cabW:cabG);
   if(tall){doors(-w/2,w/2,.35,h*.7,d/2-.04,2,cabW);doors(-w/2,w/2,h*.7+.04,h-.05,d/2-.04,2,cabW)}else{drawers(-w/2,w/2,.35,1.6,d/2-.04,2,cabG);oven(0,1.7,d/2-.02,w-.15,1.9,true);oven(0,3.7,d/2-.02,w-.15,1.9,true);k.box(0,5.62,d/2,w-.3,.2,.02,glassB);k.box(0,5.66,d/2+.015,.5,.1,.01,lit(0x38d0ff,1.4));doors(-w/2,w/2,5.9,h-.05,d/2-.04,2,cabG)}return true}
  case 'kr-island':case 'kr-islsink':{var ch5=Math.min(h,3),ov=1.1,bd=d-ov,bz=-d/2+bd/2,sink=r==='kr-islsink';k.box(0,0,bz-.05,w,.35,bd-.2,blk);k.box(0,.35,bz,w,ch5-.47,bd-.05,cabG);
   var nb=Math.max(2,Math.round(w/2)),bw=w/nb;for(var i2=0;i2<nb;i2++){var x0=-w/2+i2*bw;if(i2%2)doors(x0,x0+bw,.35,ch5-.12,-d/2-.0,1,cabG);else drawers(x0,x0+bw,.35,ch5-.12,-d/2,3,cabG)}
   [-1,1].forEach(function(s){k.box(s*(w/2-.08),0,d/2-ov/2-.04,.16,ch5-.12,ov,cabG)});k.box(0,ch5-.14,0,w+.1,.14,d+.05,stone);
   var ns=Math.max(2,Math.floor((w-.8)/2));for(var s2=0;s2<ns;s2++)stool(-w/2+.4+(s2+.5)*(w-.8)/ns,d/2-.15,Math.PI,2.4);
   if(sink){k.box(-w/4,ch5-.13,bz,1.8,.02,1.3,mc(T,0x3d4348,{m:.6,r:.3}));k.cyl(-w/4,ch5,bz-.75,.05,.06,1,chrome);hcyl(-w/4,ch5+1,bz-.55,.04,.45,chrome,'z')}else{k.cyl(w/4,ch5,0,.5,.55,.08,oak,20);inst('sph',mc(T,0xffffff,{r:.5}),[[w/4-.15,ch5+.18,0,.22,.22,.22],[w/4+.12,ch5+.18,.1,.22,.22,.22],[w/4,ch5+.18,-.15,.22,.22,.22]],[0xe2442a,0xf0c53a,0x6aa84f])}return true}
  case 'kr-chest':{k.box(0,.1,0,w,h-.35,d,white);k.box(0,h-.27,0,w+.02,.27,d+.02,white);k.box(0,h-.3,d/2+.015,w,.03,.02,mc(T,0xc9c5bc));handle(0,h-.4,d/2+.04,w*.4,false);k.box(-w/2+.35,h-.6,d/2+.01,.15,.08,.01,lit(0x33ff77,1.4));inst('box',blk,[[-w/2+.2,.05,-d/2+.2,.15,.1,.15],[w/2-.2,.05,-d/2+.2,.15,.1,.15],[-w/2+.2,.05,d/2-.2,.15,.1,.15],[w/2-.2,.05,d/2-.2,.15,.1,.15]]);return true}
  /* ---------- Kitchen – Commercial (stainless) ---------- */
  case 'kc-range':{var ch6=3;k.box(0,.5,0,w,ch6-.5,d,ss);sLegs(w,d,.5);oven(0,.7,d/2,w-.3,1.5);k.box(0,ch6-.4,d/2+.01,w,.32,.05,ss);knobs(-w/2+.3,w/2-.3,ch6-.25,d/2+.06,6,mc(T,0x1a1a1a));
   var gr2=[],bp=[];for(var gx=0;gx<3;gx++)for(var gz=0;gz<2;gz++){var cx=(gx-1)*w/3,cz=(gz-.5)*d*.45;gr2.push([cx,ch6+.04,cz,w/3-.1,.06,.06],[cx,ch6+.04,cz,.06,.06,d*.42]);bp.push([cx,ch6+.02,cz,.35,.05,.35])}inst('box',mc(T,0x111111,{m:.4,r:.5}),gr2);inst('cyl',mc(T,0x2a2a2a),bp);
   k.box(0,ch6,-d/2+.15,w,h-ch6,.3,ss);k.box(0,h-.5,-d/2+.55,w,.06,.8,ss);k.cyl(0,ch6+.05,.1,.5,.45,.55,ss,18);return true}
  case 'kc-fridge':reach(1,ss);return true;
  case 'kc-freezer':reach(2,ss,0x7fb8ff);return true;
  case 'kc-under':case 'kc-prepfr':{var pr=r==='kc-prepfr',ch7=2.85;k.box(0,.45,0,w,ch7-.45,d,ss);inst('cyl',blk,[[-w/2+.25,.15,-d/2+.25,.25,.3,.25],[w/2-.25,.15,-d/2+.25,.25,.3,.25],[-w/2+.25,.15,d/2-.25,.25,.3,.25],[w/2-.25,.15,d/2-.25,.25,.3,.25]]);k.box(0,.3,0,w,.15,d,ss);
   var nd=Math.max(1,Math.round(w/2.3));for(var i3=0;i3<nd;i3++){var cx2=-w/2+(i3+.5)*w/nd;k.box(cx2,.55,d/2+.01,w/nd-.06,ch7-.75,.05,ss);handle(cx2,ch7-.4,d/2+.05,w/nd*.5,false)}
   if(pr){k.box(0,ch7,-.1,w,.6,d-.6,ss);var pans=[],pc=[0xd92b2b,0x6aa84f,0xf0c53a,0xf3efe6,0x8a5a3c,0xff8a1a];for(var pi=0;pi<Math.floor(w/.6);pi++)pans.push([-w/2+.4+pi*.6,ch7+.62,-.1,.52,.05,.9]);inst('box',mc(T,0xffffff,{r:.8}),pans,pc);
    var lid=k.box(0,ch7+.6,-.1-d/2+.3,w,.06,.9,ss);lid.rotation.x=-.9;lid.position.set(0,ch7+.95,-d/2+.15);k.box(0,ch7,d/2-.35,w,.08,.7,white)}else{k.box(0,ch7,0,w,.05,d,ss);k.box(0,ch7,-d/2+.05,w,.4,.08,ss)}
   k.box(-w/2+.5,ch7-.2,d/2+.04,.35,.1,.01,lit(0x38d0ff,1.4));return true}
  case 'kc-dw':{sLegs(w,d,1.2,.3);k.box(0,1.2,0,w,1.2,d,ss);k.box(0,2.4,0,w-.1,2.2,d-.1,ss);hcyl(0,4.3,d/2+.3,.05,w*.8,chrome,'x');[-1,1].forEach(function(s){k.box(s*(w*.4),4.1,d/2+.1,.05,.05,.4,chrome)});
   k.box(0,4.6,0,w*.6,h-4.6,d*.6,ss);k.box(0,4.7,d*.3+.01,w*.45,.4,.02,blk);inst('box',mc(T,0x111111,{e:0x33ff77,ei:2}),[[-.2,4.9,d*.3+.025,.08,.08,.01],[0,4.9,d*.3+.025,.08,.08,.01],[.2,4.9,d*.3+.025,.08,.08,.01]]);k.box(0,2.4,d/2-.02,w-.2,.02,.02,blk);return true}
  case 'kc-3sink':case 'kc-dish':case 'kc-mop':case 'kc-hand':{
   if(r==='kc-mop'){var mw=mc(T,0xd8d6d0,{r:.5});k.box(0,0,0,w,.2,d,mw);[-1,1].forEach(function(q){k.box(q*(w/2-.08),.2,0,.16,.7,d,mw);k.box(0,.2,q*(d/2-.08),w,.7,.16,mw)});k.box(0,.2,0,w-.3,.01,d-.3,mc(T,0x5a5f66,{r:.6}));k.cyl(0,.9,-d/2+.1,.04,.04,2.2,chrome);hcyl(0,3,-d/2+.25,.04,.35,chrome,'z');hcyl(-.3,2.4,-d/2+.08,.06,.25,mc(T,0xd92b2b),'z');hcyl(.3,2.4,-d/2+.08,.06,.25,mc(T,0x2b6fd9),'z');
    k.cyl(.2,.2,.2,.4,.35,.8,mc(T,0xf0c53a,{r:.5}),16);k.cyl(.2,.2,.2,.03,.03,4,oak);return true}
   var ch8=3,nb2=r==='kc-3sink'?3:r==='kc-dish'?1:1,dbw=r==='kc-3sink'?Math.max(.8,(w-nb2*1.6)/2):r==='kc-dish'?w*.55:0,bw2=r==='kc-hand'?w-.3:(w-2*dbw)/nb2;
   if(r==='kc-hand'){k.cyl(0,0,-.2,.15,.2,ch8-.6,ss);k.box(0,ch8-.6,0,w,.6,d,ss);k.box(0,ch8-.5,0,w-.25,.52,d-.3,mc(T,0x8d969c,{m:.7,r:.25}));k.box(0,ch8,-d/2+.1,w,1.2,.2,ss);k.cyl(0,ch8+.05,-d/2+.25,.04,.04,.6,chrome);hcyl(0,ch8+.62,-d/2+.42,.035,.35,chrome,'z');
    k.box(-w/4,ch8+1.6,-d/2+.15,.4,.65,.3,white);k.box(w/4,ch8+1.4,-d/2+.15,.45,.9,.35,mc(T,0x2a2a2a));k.box(0,ch8+1.25,-d/2+.21,.5,.18,.01,mc(T,0x2b6fd9));return true}
   sLegs(w,d,ch8-.6,.6);var bx=[];for(var b2=0;b2<nb2;b2++){var cx3=(r==='kc-dish'?-w/2+dbw+bw2/2:-w/2+dbw+bw2*(b2+.5));k.box(cx3,ch8-1.2,0,bw2-.08,1,d-.3,ss);bx.push([cx3,ch8-.09,0,bw2-.25,.02,d-.55]);
    if(r==='kc-3sink'){k.cyl(cx3,ch8,-d/2+.2,.04,.04,1.1,chrome);hcyl(cx3,ch8+1.1,-d/2+.45,.035,.5,chrome,'z')}}inst('box',mc(T,0x3d4348,{m:.6,r:.3}),bx);
   k.box(0,ch8-.12,0,w,.08,d,ss);k.box(0,ch8-.04,-d/2+.06,w,.8,.1,ss);[-1,1].forEach(function(s){k.box(s*(w/2-.03),ch8-.04,0,.06,.12,d,ss)});
   if(r==='kc-dish'){var px=-w/2+dbw+bw2/2;k.cyl(px,ch8,-d/2+.25,.05,.05,3.2,chrome);var sp=k.cyl(px,ch8+2.2,-d/2+.6,.12,.12,1,mc(T,0xcfd3d6,{m:.6,r:.3}));hcyl(px,ch8+3.2,-d/2+.45,.04,.4,chrome,'z');
    var racks=[],rp=[];[[-w/2+dbw/2],[w/2-.95]].forEach(function(q,i){racks.push([q[0],ch8+.15,0,1.65,.3,1.65]);for(var a=0;a<5;a++)rp.push([q[0]-.6+a*.3,ch8+.4,0,.04,.45,1.4])});inst('box',mc(T,0x2b6fd9,{op:.65,r:.5}),racks);inst('cyl',white,rp)}
   return true}
  case 'kc-conv':{sLegs(w,d,1.4,.3);[1.4,3.15].forEach(function(y){k.box(0,y,0,w,1.65,d,ss);k.box(-.25,y+.15,d/2+.01,w-.9,1.35,.04,ss);k.box(-.25,y+.4,d/2+.04,w-1.3,.8,.01,glassB);handle(-.25,y+1.28,d/2+.08,w-1.4,false);k.box(w/2-.32,y+.15,d/2+.01,.5,1.35,.04,mc(T,0x2a2a2a));knobs(w/2-.32,w/2-.32,y+1.1,d/2+.05,1);k.box(w/2-.32,y+.75,d/2+.035,.3,.12,.01,lit(0xff5533,1.4))});
   k.box(0,4.8,0,w,h-4.8,d,ss);k.cyl(w/4,h,-d/4,.18,.18,.25,ss);return true}
  case 'kc-griddle':case 'kc-broiler':{var st2=2.2,br=r==='kc-broiler';sLegs(w,d,st2,.5);k.box(0,st2,0,w,.08,d,ss);k.box(0,st2+.08,0,w,h-st2-.4,d,ss);var tp=h-.32;
   if(br){var bars=[];for(var bi=0;bi<Math.floor(w/.18);bi++)bars.push([-w/2+.2+bi*.18,tp+.18,0,.05,.05,d-.6]);inst('box',mc(T,0x111111,{m:.4,r:.5}),bars);k.box(0,tp,0,w-.3,.06,d-.7,lit(0xff3a10,1.2))}
   else{k.box(0,tp,0,w-.1,.12,d-.25,mc(T,0x4a4d52,{m:.7,r:.35}));k.box(0,tp+.1,0,w-.4,.01,d-.6,mc(T,0x2a2d32,{m:.5,r:.5}));inst('cyl',mc(T,0xc8862a,{r:.8}),[[-.4,tp+.15,.1,.4,.06,.4],[.1,tp+.15,-.2,.4,.06,.4],[.5,tp+.15,.2,.4,.06,.4]])}
   [-1,1].forEach(function(s){k.box(s*(w/2-.03),tp,0,.06,.5,d,ss)});k.box(0,tp,-d/2+.03,w,.6,.06,ss);k.box(0,tp-.12,d/2-.05,w,.1,.12,ss);knobs(-w/2+.4,w/2-.4,tp-.3,d/2+.04,Math.max(2,Math.round(w/1)));return true}
  case 'kc-fryer':{k.box(0,.5,0,w,h-1.3,d,ss);sLegs(w,d,.5);k.box(0,.65,d/2+.01,w-.1,1.6,.04,ss);handle(0,2,d/2+.05,w*.5,false);k.box(0,h-.8,0,w,.15,d,ss);
   k.box(0,h-.72,.15,w-.25,.03,1.3,mc(T,0xc8901a,{r:.15,m:.2,e:0x5a3a08,ei:.3}));var bk=[];[-.25,.25].forEach(function(o){bk.push([o*w,h-.45,.35,w*.42,.4,.9])});inst('box',mc(T,0xd0d4d8,{m:.6,r:.4,op:.6}),bk);
   [-.25,.25].forEach(function(o){hcyl(o*w,h-.3,.95,.03,.5,blk,'z')});k.box(0,h-.8,-d/2+.15,w,1.1,.3,ss);knobs(-w/4,w/4,h-1,d/2+.04,2);return true}
  case 'kc-pizza':{sLegs(w,d,1.2,.35);[1.2,2.95].forEach(function(y){k.box(0,y,0,w,1.75,d,mc(T,0x9aa0a6,{m:.6,r:.35}));k.box(0,y+.5,d/2+.01,w*.7,.6,.06,ss);k.box(0,y+.62,d/2+.04,w*.3,.3,.01,lit(0xff6a14,1.3));handle(0,y+1.25,d/2+.1,w*.6,false);k.box(w/2-.45,y+.35,d/2+.03,.5,1.1,.03,mc(T,0x2a2a2a));knobs(w/2-.45,w/2-.45,y+1.05,d/2+.06,1);k.box(w/2-.45,y+.6,d/2+.05,.3,.12,.01,lit(0xff5533,1.3))});
   k.cyl(0,4.7,-d/4,.3,.3,h-4.7+.3,ss);var pl=k.box(-w/2-.1,.3,0,.04,3.5,.1,oak);pl.rotation.z=-.12;return true}
  case 'kc-steam':{var ch9=2.9;sLegs(w,d,ch9-.9,.35);k.box(0,ch9-.9,0,w,.9,d,ss);var nw=Math.max(2,Math.floor(w/1.15)),food=[];for(var wi=0;wi<nw;wi++)food.push([-w/2+(wi+.5)*w/nw,ch9+.02,0,w/nw-.2,.05,d-.8]);inst('box',mc(T,0xffffff,{r:.8}),food,[0xc8743a,0xf0c53a,0x6aa84f,0xd92b2b,0x8a5a3c]);
   var fr=[];for(var wi2=0;wi2<=nw;wi2++)fr.push([-w/2+wi2*w/nw,ch9+.02,0,.05,.06,d-.6]);inst('box',ss,fr);k.box(0,ch9-.4,d/2+.25,w,.06,.5,white);k.box(0,ch9-.46,d/2+.25,w,.06,.5,ss);
   [-1,1].forEach(function(s){k.cyl(s*(w/2-.1),ch9,-d/2+.3,.03,.03,1.5,chrome)});var sg=new T.Mesh(new T.BoxGeometry(w,.04,1.2),mc(T,0xdfeeff,{op:.3,r:.05}));sg.position.set(0,ch9+1.4,-d/2+.6+.2);sg.rotation.x=.45;g.add(sg);k.box(0,ch9+1.45,-d/2+.3,w,.08,.08,ss);knobs(-w/2+.4,w/2-.4,ch9-.6,d/2+.04,nw);return true}
  case 'kc-mixer':{k.box(0,0,0,w,.3,d,mc(T,0x9aa0a6,{m:.5,r:.4}));k.box(0,.3,-d/2+.5,w*.55,h-.3-1.1,.9,mc(T,0x9aa0a6,{m:.5,r:.4}));k.box(0,h-1.1,-d/2+.35,w*.6,1.1,1.9,mc(T,0x9aa0a6,{m:.5,r:.4}));
   k.cyl(0,1.05,.35,.75,.55,1.4,ss,24);k.cyl(0,1.05,.35,.7,.5,.02,mc(T,0x2a2d30));k.cyl(0,2.3,.35,.05,.05,h-1.4-2.3,chrome);k.box(0,1.9,-.2,1.7,.12,.3,mc(T,0x9aa0a6,{m:.5,r:.4}));var gd=k.cyl(0,2.45,.35,.78,.78,.35,mc(T,0xdfeeff,{op:.35}),24);
   k.box(w/2-.25,h-.9,.3,.06,.5,.5,mc(T,0x2a2a2a));inst('cyl',mc(T,0xffffff,{r:.4}),[[w/2-.2,h-.6,.2,.1,.05,.1,0,0,Math.PI/2],[w/2-.2,h-.6,.4,.1,.05,.1,0,0,Math.PI/2]],[0x33cc55,0xd92b2b]);return true}
  case 'kc-table':case 'kc-shelf':case 'kc-rack':{
   if(r==='kc-table'){var ch10=Math.min(h,3);sLegs(w,d,ch10-.1,.55);k.box(0,ch10-.1,0,w,.1,d,ss);k.box(0,ch10,-d/2+.04,w,.35,.08,ss);k.box(-w/4,ch10,.1,1.5,.06,1,white);k.box(-w/4-.3,ch10+.06,.1,.6,.04,.05,chrome);
    inst('box',mc(T,0xffffff,{op:.75,r:.2}),[[w/4,ch10+.3,-.2,.65,.6,.65],[w/4+.75,ch10+.3,-.2,.65,.6,.65],[w/4+.38,ch10+.9,-.2,.65,.6,.65]]);return true}
   var post=r==='kc-rack'?mc(T,0xc9cdd1,{m:.6,r:.3}):chrome,ns2=r==='kc-rack'?Math.floor((h-.6)/.3):5,pp=[];[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){pp.push([q[0]*(w/2-.05),h/2+(r==='kc-rack'?.15:0),q[1]*(d/2-.05),.08,h-(r==='kc-rack'?.3:0),.08])});inst(r==='kc-rack'?'box':'cyl',post,pp);
   if(r==='kc-rack'){inst('cyl',blk,[[-w/2+.15,.12,-d/2+.15,.24,.24,.1,0,0,Math.PI/2],[w/2-.15,.12,-d/2+.15,.24,.24,.1,0,0,Math.PI/2],[-w/2+.15,.12,d/2-.15,.24,.24,.1,0,0,Math.PI/2],[w/2-.15,.12,d/2-.15,.24,.24,.1,0,0,Math.PI/2]]);var sl=[],pn=[];for(var si=0;si<ns2;si++){var y=.5+si*.3;sl.push([-w/2+.05,y,0,.06,.03,d-.1],[w/2-.05,y,0,.06,.03,d-.1]);if(si%3!==1)pn.push([0,y+.04,0,w-.15,.04,d-.15])}inst('box',post,sl);inst('box',mc(T,0xc9a06a,{m:.5,r:.4}),pn);k.box(0,h-.1,0,w,.08,d,post);return true}
   var wire=[],items=[],ic=[];for(var s3=0;s3<ns2;s3++){var y2=.5+s3*(h-.8)/(ns2-1);for(var wx=0;wx<Math.floor(w/.12);wx++)wire.push([-w/2+.08+wx*.12,y2,0,.02,.02,d-.1]);wire.push([0,y2,d/2-.05,w,.04,.04],[0,y2,-d/2+.05,w,.04,.04]);
    if(s3<ns2-1){var xx=-w/2+.4;while(xx<w/2-.3){var kd=((xx*10|0)+s3)%3;if(kd===0){items.push([xx,y2+.4,0,.7,.75,1.3]);ic.push(0xc9a26a);xx+=.8}else if(kd===1){items.push([xx,y2+.25,-.2,.45,.5,.45],[xx,y2+.25,.3,.45,.5,.45]);ic.push(0xd92b2b,0xd92b2b);xx+=.5}else{items.push([xx+.1,y2+.3,0,.7,.6,1]);ic.push(0xe8e0cc);xx+=.8}}}}
   inst('box',chrome,wire);var im=new T.InstancedMesh(exGeo(T,'box'),mc(T,0xffffff,{r:.8}),items.length);items.forEach(function(a,i){D.position.set(a[0],a[1],a[2]);D.rotation.set(0,0,0);D.scale.set(a[3],a[4],a[5]);D.updateMatrix();im.setMatrixAt(i,D.matrix);im.setColorAt(i,tmpC.setHex(ic[i]))});im.castShadow=true;g.add(im);return true}
  case 'kc-walkin':{var pnl=mc(T,0xd9dbdc,{m:.3,r:.5});k.box(0,0,0,w,h,d,pnl);var seams=[];for(var sx=-w/2+2;sx<w/2;sx+=2)seams.push([sx,h/2,d/2+.005,.03,h,.01]);for(var sz=-d/2+2;sz<d/2;sz+=2){seams.push([w/2+.005,h/2,sz,.01,h,.03]);seams.push([-w/2-.005,h/2,sz,.01,h,.03])}inst('box',mc(T,0xa8abad,{m:.3}),seams);
   var dx=-w/4;k.box(dx,0,d/2+.03,3,6.8,.12,ss);[1.5,5.2].forEach(function(y){k.box(dx-1.45,y,d/2+.12,.25,.4,.12,chrome)});k.box(dx+1.2,3,d/2+.15,.15,.9,.2,chrome);k.box(dx+1.2,3.35,d/2+.25,.5,.1,.1,chrome);k.cyl(dx,5.1,d/2+.1,.4,.4,.03,glassB,20).rotation.x=Math.PI/2;
   k.box(w/4,4.6,d/2+.02,.5,.3,.02,blk);k.box(w/4,4.66,d/2+.035,.35,.15,.01,lit(0x38d0ff,1.4));k.box(0,h,-d/4,3,1.4,2,mc(T,0xbfc3c6,{m:.4,r:.4}));k.cyl(-.6,h+.1,-d/4+1.01,.55,.55,.05,blk,20).rotation.x=Math.PI/2;
   var sc=[];for(var ci=0;ci<10;ci++)sc.push([dx-1.3+ci*.29,3.6,d/2+.2,.27,6.4,.01]);inst('box',mc(T,0xd8eef8,{op:.35,r:.1}),sc);k.box(dx,6.8,d/2+.2,3,.12,.1,ss);return true}
  }}
 /* ---------------- Fitness, Court & Rink, Creator / Maker ---------------- */
 case 'f-gym':case 'f-tread':case 'f-row':case 'f-bike':case 'f-free':case 'f-rack':case 'f-cable':case 'f-ellip':case 'f-stair':case 'f-turf':case 'f-sauna':case 'f-plunge':
 case 'c-pp':case 'c-hoop':case 'c-net':case 'x-batting':case 'x-tennis':case 'x-return':case 'c-golf1':case 'c-golf2':case 'c-golf3':case 'c-bowl':case 'c-bowlmini':case 'c-pickle':case 'c-half':case 'c-climb':case 'c-ninja':
 case 'm-laser1':case 'm-laser2':case 'm-laser3':case 'm-fiber':case 'm-weld1':case 'm-weld2':case 'm-weld3':case 'm-comp':case 'm-dryer':case 'm-fume':case 'm-dtf':case 'm-emb1':case 'm-emb2':case 'm-emb3':case 'm-print1':case 'm-print2':case 'm-print3':case 'm-resin':case 'm-vinyl':case 'm-mill':case 'm-uvflat':case 'm-large':case 'm-screen':case 'm-expose':case 'm-tunnel':{
  var steel=mc(T,0x2a2b2e,{m:.5,r:.4}),steelL=mc(T,0x8d939a,{m:.5,r:.4}),pad=mc(T,0x1d1d20,{r:.7}),rub=mc(T,0x222326,{r:.95}),yel=mc(T,0xe0b31b,{r:.5}),red=mc(T,0xc8202a,{r:.5}),
   alu=mc(T,0xc8ccd0,{m:.5,r:.35}),body=mc(T,0xeeeeec,{r:.45}),
   sub2=function(x,z,ry,y){var gg=new T.Group();gg.position.set(x,y||0,z);gg.rotation.y=ry||0;g.add(gg);return Kit(T,gg)},
   net=function(rx,ry,col,op){var key='net|'+rx.toFixed(1)+'|'+ry.toFixed(1)+'|'+(col||0)+'|'+(op||0);if(EXMC[key])return EXMC[key];if(!EXST.net){var cv=document.createElement('canvas');cv.width=cv.height=64;var x=cv.getContext('2d');x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(0,0,64,64);EXST.net=cv}
    var t=new T.CanvasTexture(EXST.net);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,ry);return EXMC[key]=new T.MeshStandardMaterial({color:col||0x202020,alphaMap:t,transparent:true,opacity:op||.85,side:T.DoubleSide,depthWrite:false,roughness:.9})},
   plane=function(x,y,z,pw,ph,mat,rx,ry){var m=new T.Mesh(new T.PlaneGeometry(pw,ph),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);g.add(m);return m},
   lines=function(arr,mat){inst('box',mat||white,arr)},
   tube=function(x0,y0,z0,x1,y1,z1,rad,mat){var a=new T.Vector3(x0,y0,z0),b=new T.Vector3(x1,y1,z1),len=a.distanceTo(b),m=new T.Mesh(exGeo(T,'cyl'),mat);m.scale.set(rad*2,len,rad*2);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());m.castShadow=true;g.add(m);return m},
   plates=function(x,y,z,n,ax){var a=[];for(var i=0;i<n;i++){var r2=.9-i*.18;a.push(ax==='x'?[x+i*.12,y,z,r2,.1,r2,0,0,Math.PI/2]:[x,y,z+i*.12,r2,.1,r2,Math.PI/2])}inst('cyl',mc(T,0x1a1a1c,{r:.6}),a)},
   stack=function(x,z,y0,y1,pw){var a=[];for(var y=y0;y<y1;y+=.14)a.push([x,y+.06,z,pw,.11,.55]);inst('box',mc(T,0x2d2f33,{m:.4,r:.5}),a);inst('cyl',chrome,[[x-pw*.3,(y0+y1)/2+.4,z,.06,y1-y0+.9,.06],[x+pw*.3,(y0+y1)/2+.4,z,.06,y1-y0+.9,.06]])},
   floorM=function(fw,fd,mat,y){k.box(0,y||0,0,fw,.03,fd,mat)},
   bench=function(bw,bh,bd,top,mat){k.legs(bw,bd,bh-.12,.12,mat||steelL,.08);k.box(0,bh-.12,0,bw,.12,bd,top||mc(T,0xd4cfc4,{r:.6}));k.box(0,.5,0,bw-.2,.04,bd-.2,mat||steelL)},
   panelScr=function(x,y,z,sw,sh,kind){k.box(x,y,z-.02,sw+.06,sh+.06,.04,blk);k.box(x,y+.03,z,sw,sh,.01,scrMat(T,kind||'desktop',1.2))},
   tbtn=function(x,y,z,n,cols){var a=[];for(var i=0;i<n;i++)a.push([x+i*.12,y,z,.07,.03,.07,Math.PI/2]);inst('cyl',mc(T,0xffffff,{r:.4}),a,cols||[0x33cc55,0xd92b2b,0xf0c53a,0x2b6fd9])};
  switch(r){
  /* ---------- Fitness ---------- */
  case 'f-gym':{k.box(0,0,0,w,.12,d,steel);var px=-w/2+.6;[-1,1].forEach(function(s){k.box(px+s*.45,0,-d/2+.6,.2,h,.2,steel)});k.box(px,h-.2,-d/2+.6,1.1,.2,.2,steel);stack(px,-d/2+.6,.2,3.4,.8);
   k.box(px+1.4,h-.2,-d/2+.6,2.8,.2,.2,steel);k.box(px+2.6,0,-d/2+.6,.2,h-.2,.2,steel);[[px,h-.1,-d/2+.6],[px+2.6,h-.4,-d/2+.6],[px+2.6,.4,-d/2+.6]].forEach(function(p){hcyl(p[0],p[1],p[2]+.15,.2,.08,chrome,'z')});
   tube(px,h-.1,-d/2+.6,px+2.6,h-.4,-d/2+.6,.02,blk);var bx=w*.15,bz=d*.08;k.box(bx,0,bz,.3,1.4,2.6,steel);k.box(bx,1.4,bz+.3,1.4,.3,1.6,pad);var bk=k.box(bx,1.7,bz-.7,1.4,2.6,.3,pad);bk.rotation.x=-.12;
   k.box(bx,2.6,bz-1.2,.2,2.5,.2,steel);[-1,1].forEach(function(s){tube(bx+s*.2,4.2,bz-1.1,bx+s*1.6,3.6,bz+.6,.06,steel);hcyl(bx+s*1.65,3.6,bz+.75,.07,.4,pad,'z')});hcyl(bx,.9,bz+1.5,.15,1.6,pad,'x');hcyl(bx,.5,bz+1.6,.15,1.6,pad,'x');return true}
  case 'f-tread':{var dz=.4;k.box(0,0,dz,w,.45,d-1,steel);k.box(0,.45,dz,w-.6,.03,d-1.5,rub);[-1,1].forEach(function(s){k.box(s*(w/2-.18),.45,dz,.3,.06,d-1.2,steelL);tube(s*(w/2-.15),.4,-d/2+.6,s*(w/2-.15),4.1,-d/2+.9,.09,steel);tube(s*(w/2-.15),3.4,-d/2+1.,s*(w/2-.1),3.4,-d/2+2.6,.05,steelL)});
   hcyl(0,.25,d/2-.35,.18,w-.3,steelL,'x');k.box(0,4,-d/2+.6,w-.2,.12,.9,steel);var cs=k.box(0,4.1,-d/2+.7,w-.4,.9,.12,steel);cs.rotation.x=-.5;panelScr(0,4.25,-d/2+.83,1.3,.55,'gym');hcyl(0,4.05,-d/2+1.2,.05,w-.4,pad,'x');return true}
  case 'f-row':{k.box(0,.45,.6,.35,.15,d-1.5,alu);[-1,1].forEach(function(s){k.box(s*.25,0,d/2-.4,.12,.5,.12,steel)});hcyl(0,.9,-d/2+.7,.75,.5,steel,'x');hcyl(0,.9,-d/2+.7,.55,.52,mc(T,0x3a3d44,{r:.5}),'x');k.box(0,0,-d/2+.7,1.4,.2,.6,steel);
   k.box(0,.6,.6,.6,.12,.8,pad);[-1,1].forEach(function(s){var fp=k.box(s*.25,.55,-d/2+2,.3,.06,.6,steel);fp.rotation.x=-.6;fp.position.set(s*.25,.75,-d/2+2)});tube(0,1.4,-d/2+.8,0,2.6,-d/2+1.3,.04,steel);panelScr(0,2.6,-d/2+1.36,.55,.4,'gym');hcyl(0,1.2,-d/2+1.6,.04,1.2,pad,'x');return true}
  case 'f-bike':{k.box(0,0,0,w*.9,.12,d-.4,steel);hcyl(0,1.1,-d/2+.9,.75,.3,steel,'x');hcyl(0,1.1,-d/2+.9,.55,.32,red,'x');tube(0,.1,.6,0,2.9,.9,.1,steel);k.box(0,2.9,.95,.5,.18,.9,pad);tube(0,.1,-d/2+1.1,0,3.6,-d/2+1.4,.1,steel);
   hcyl(0,3.7,-d/2+1.5,.05,1.6,pad,'x');[-1,1].forEach(function(s){tube(s*.8,3.7,-d/2+1.5,s*.8,3.8,-d/2+.9,.05,pad)});panelScr(0,3.95,-d/2+1.25,.5,.35,'gym');[-1,1].forEach(function(s){k.box(s*.3,1.1,.0,.25,.06,.45,blk)});hcyl(0,1.2,0,.3,.2,steel,'x');return true}
  case 'f-free':{floorM(w,d,rub);var sm=[];for(var x=-w/2+2;x<w/2;x+=2)sm.push([x,.035,0,.02,.005,d]);for(var z=-d/2+2;z<d/2;z+=2)sm.push([0,.035,z,w,.005,.02]);lines(sm,mc(T,0x111214));
   k.box(0,.03,-d/2+.15,w-.4,3.6,.05,mc(T,0xaebbc4,{m:.4,r:.12}));var rk=-d/2+.9;[-1,1].forEach(function(s){k.box(s*(w/2-.9),.03,rk,.15,2.2,.9,steel)});[1,1.8].forEach(function(y,i){var sh=k.box(0,y,rk,w-1.6,.08,.8,steel);sh.rotation.x=-.2});
   var db=[],dh=[];for(var i=0;i<10;i++){var xx=-w/2+1.3+i*(w-2.6)/9,yy=i<5?1.25:2.05,sz=.22+(i%5)*.05;db.push([xx-.18,yy,rk,sz,.12,sz,0,0,Math.PI/2],[xx+.18,yy,rk,sz,.12,sz,0,0,Math.PI/2]);dh.push([xx,yy,rk,.05,.4,.05,0,0,Math.PI/2])}
   var dbx=db.map(function(a,j){var b=a.slice();b[0]=a[0]+(j%2?1.2:-1.2)*.1;return b});inst('cyl',mc(T,0x1a1a1c,{r:.5}),db);inst('cyl',chrome,dh);
   var kb=[],kh=[];for(var j=0;j<5;j++){var kx=-w/2+1+j*.7,ks=.35+j*.04;kb.push([kx,.03+ks/2,d/2-.8,ks,ks,ks]);kh.push([kx,.03+ks+.08,d/2-.8,.45,.45,.6,0,0,0])}inst('sph',mc(T,0x1a1a1c,{r:.5}),kb);inst('tor',mc(T,0x1a1a1c,{r:.5}),kh);
   var bk2=sub2(w/4,.4,0);bk2.box(0,0,0,.4,1.3,.4,steel);bk2.box(0,1.3,0,1.1,.25,3.8,pad);bk2.box(0,0,-1.5,.9,.15,.2,steel);bk2.box(0,0,1.5,.9,.15,.2,steel);
   k.box(w/2-1,.03,d/2-1,.25,2.2,.25,steel);plates(w/2-1.2,1,d/2-1,3,'x');plates(w/2-.8,1.6,d/2-1,3,'x');return true}
  case 'f-rack':{var pf=Math.min(w,8),pd=Math.min(d,8);k.box(0,0,0,pf,.12,pd,rub);k.box(0,.12,0,pf*.5,.02,pd,oak);var rw=4,rd=4,rz=-.6,ups=[],holes=[];[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){ups.push([q[0]*rw/2,h/2+.07,rz+q[1]*rd/2,.25,h-.1,.25]);for(var y=1;y<h-.5;y+=.25)holes.push([q[0]*rw/2,y,rz+q[1]*rd/2+(q[1]>0?.13:-.13),.07,.07,.01])});inst('box',mc(T,0x1d1d20,{m:.5,r:.4}),ups);inst('box',mc(T,0x080808),holes);
   [-1,1].forEach(function(s){k.box(0,h-.25,rz+s*rd/2,rw+.25,.2,.2,mc(T,0x1d1d20,{m:.5,r:.4}));k.box(s*rw/2,h-.25,rz,.2,.2,rd,mc(T,0x1d1d20,{m:.5,r:.4}));k.box(s*rw/2,4.2,rz+rd/2+.2,.2,.15,.4,red);k.box(s*rw/2,2.5,rz,.15,.15,rd+.5,red)});hcyl(0,h-.1,rz+rd/2+.3,.06,rw+.6,chrome,'x');
   hcyl(0,4.4,rz+rd/2+.3,.05,7,chrome,'x');[-1,1].forEach(function(s){plates(s*3,4.4,rz+rd/2+.3,3,'x')});[-1,1].forEach(function(s){hcyl(s*(rw/2+.4),1.2,rz-rd/2+.2,.06,.8,steel,'x');hcyl(s*(rw/2+.4),2.1,rz-rd/2+.2,.06,.8,steel,'x')});
   inst('cyl',mc(T,0x1a1a1c,{r:.6}),[[rw/2+.55,1.2,rz-rd/2+.2,1.5,.1,1.5,0,0,Math.PI/2],[rw/2+.65,1.2,rz-rd/2+.2,1.5,.1,1.5,0,0,Math.PI/2],[-rw/2-.55,2.1,rz-rd/2+.2,1.2,.1,1.2,0,0,Math.PI/2]]);return true}
  case 'f-cable':{[-1,1].forEach(function(s){var tx=s*(w/2-.5);k.box(tx,0,-d/2+.6,.9,.12,1.2,steel);k.box(tx-.3,0,-d/2+.6,.15,h,.15,steel);k.box(tx+.3,0,-d/2+.6,.15,h,.15,steel);stack(tx,-d/2+.6,.2,3.2,.6);
    k.box(tx,0,0,.2,h,.2,steel);k.box(tx,3.5,.1,.35,.4,.3,red);hcyl(tx,3.5,.3,.14,.12,chrome,'z');k.cyl(tx,2.8,.35,.03,.03,.6,blk);k.box(tx,2.6,.35,.5,.06,.06,blk)});
   k.box(0,h-.25,0,w,.2,.2,steel);k.box(0,h-.25,-d/2+.6,w,.2,.2,steel);hcyl(0,h-.5,.15,.05,2.4,chrome,'x');[-1,1].forEach(function(s){hcyl(s*.9,h-.5,.15,.07,.5,pad,'x')});return true}
  case 'f-ellip':{k.box(0,0,0,w*.5,.15,d-.5,steel);hcyl(0,1,d/2-.7,.6,.4,steel,'x');hcyl(0,1,d/2-.7,.45,.42,mc(T,0x3a3d44),'x');[-1,1].forEach(function(s){var pd2=k.box(s*.35,.6,.2,.4,.08,1.4,pad);pd2.rotation.x=s*.12;tube(s*.35,.6,.2,s*.4,1,d/2-.8,.06,steel);tube(s*.35,.65,-.3,s*.6,4.6,-d/2+1.2,.06,steel);hcyl(s*.6,4.6,-d/2+1.15,.06,.5,pad,'z')});
   tube(0,.1,-d/2+.6,0,4.2,-d/2+1,.1,steel);var ec=k.box(0,4.1,-d/2+1,1.4,.8,.12,steel);ec.rotation.x=-.4;panelScr(0,4.22,-d/2+1.14,1.1,.5,'gym');return true}
  case 'f-stair':{k.box(0,0,0,w,.3,d,steel);k.box(0,.3,-d/2+.9,w,h-.8,1.4,steel);var st=[];for(var i2=0;i2<7;i2++)st.push([0,.45+i2*.55,-d/2+1.9+i2*.0,w-.7,.12,.8]);var ss2=[];for(var i3=0;i3<5;i3++)ss2.push([0,.4+i3*.6,-d/2+1.6+i3*.6,w-.7,.12,.7]);inst('box',mc(T,0x3a3d44,{r:.6}),ss2);
   [-1,1].forEach(function(s){k.box(s*(w/2-.1),.3,0,.12,3.4,.12,steel);tube(s*(w/2-.1),3.7,0,s*(w/2-.1),3.9,-d/2+1.6,.06,pad)});k.box(0,h-.5,-d/2+.9,w,.5,1.4,steel);panelScr(0,h-1,-d/2+1.62,1.2,.5,'gym');return true}
  case 'f-turf':{floorM(w,d,mc(T,0x3f8a3a,{r:1}));var yl=[];for(var z2=-d/2+5;z2<d/2;z2+=5)yl.push([0,.035,z2,w-.4,.004,.12]);yl.push([-w/2+.25,.035,0,.08,.004,d-.2],[w/2-.25,.035,0,.08,.004,d-.2]);lines(yl);
   var sl=sub2(0,d/2-3,0,.03);sl.box(0,0,0,1.8,.12,2.4,steel);sl.box(0,.12,-.5,.12,.9,.12,steel);sl.box(0,.12,.6,.12,.6,.12,steel);sl.box(-.8,.12,0,.12,1.3,.12,steel);sl.box(.8,.12,0,.12,1.3,.12,steel);sl.cyl(0,.12,.6,.75,.75,.12,mc(T,0x1a1a1c),18);sl.cyl(0,.24,.6,.6,.6,.12,mc(T,0x1a1a1c),18);return true}
  case 'f-sauna':{var cedar=mc(T,0xb57a48,{r:.7});k.box(0,0,0,w,h,d,cedar);var pl=[];for(var y2=.4;y2<h;y2+=.4){pl.push([0,y2,d/2+.005,w,.02,.01]);pl.push([w/2+.005,y2,0,.01,.02,d]);pl.push([-w/2-.005,y2,0,.01,.02,d])}lines(pl,mc(T,0x8a5a32));
   k.box(-w/4,0,d/2+.01,2.2,6.4,.06,mc(T,0x7a5236,{r:.6}));k.box(-w/4,.3,d/2+.05,1.9,5.8,.02,mc(T,0xd9b48a,{op:.45,r:.05,e:0xff9a4a,ei:.25}));handle(-w/4+.85,3,d/2+.1,1.1,true);k.box(w/4,3.6,d/2+.01,1.4,1.4,.04,mc(T,0xd9b48a,{op:.45,e:0xff9a4a,ei:.3}));
   k.box(0,h,0,w+.3,.25,d+.3,mc(T,0x8a5a32,{r:.7}));k.box(w/4,5.4,d/2+.03,.5,.25,.02,blk);k.box(w/4,5.45,d/2+.045,.3,.12,.01,lit(0xff5533,1.4));return true}
  case 'f-plunge':{var tub=mc(T,0x2b2f36,{r:.4});k.box(0,0,-.5,w,h-.75,d-1,tub);[-1,1].forEach(function(q){k.box(0,h-.6,-.5+q*((d-1)/2-.1),w,.12,.2,mc(T,0x3a3f46,{r:.35}))});k.box(0,h-.62,-.5,w-.4,.03,d-1.4,mc(T,0x7fc8e8,{op:.85,r:.05,e:0x2a7aa8,ei:.35}));
   [-1,1].forEach(function(s){k.box(s*(w/2-.1),h-.6,-.5,.2,.12,d-1,mc(T,0x3a3f46))});k.box(0,0,d/2-.4,w-.4,1.6,.8,mc(T,0x3a3d44,{r:.5}));var lv=[];for(var l2=0;l2<6;l2++)lv.push([0,.3+l2*.18,d/2,w-.8,.04,.02]);lines(lv,blk);k.box(.6,1.25,d/2+.01,.4,.15,.01,lit(0x38d0ff,1.6));
   k.box(-w/2-.01,0,-d/2+1.6,.01,.6,.8,mc(T,0x3a3d44));return true}
  /* ---------- Court & Rink ---------- */
  case 'c-pp':{var tt=2.5;[-1,1].forEach(function(s){k.box(0,0,s*d*.3,w*.8,.12,.2,steel);k.box(s*0,0,s*d*.3,.12,tt-.2,.12,steel);tube(-w*.35,.1,s*d*.3,w*.35,.1,s*d*.3,.04,steel);[-1,1].forEach(function(q){k.cyl(q*w*.38,0,s*d*.3,.12,.12,.15,rub)})});
   k.box(0,tt-.2,0,w*.7,.12,d*.7,steel);k.box(0,tt-.08,0,w,.08,d,mc(T,0x1d4d8c,{r:.55}));lines([[0,tt+.002,0,.03,.005,d-.1],[-w/2+.04,tt+.002,0,.05,.005,d],[w/2-.04,tt+.002,0,.05,.005,d],[0,tt+.002,-d/2+.04,w,.005,.05],[0,tt+.002,d/2-.04,w,.005,.05]]);
   plane(0,tt+.25,0,w+.4,.5,net(30,3,0x111111,.75));k.box(0,tt+.48,0,w+.4,.03,.03,white);[-1,1].forEach(function(s){k.box(s*(w/2+.2),tt-.15,0,.08,.65,.15,blk)});sph(.6,tt+.08,d/4,.07,mc(T,0xff8a1a,{r:.4}));
   inst('cyl',red,[[-1,tt+.03,d/3,.6,.04,.6],[1.2,tt+.03,-d/3,.6,.04,.6]]);return true}
  case 'c-hoop':case 'c-half':{var full=r==='c-half',fl=mc(T,0xd8a668,{r:.4}),paint2=mc(T,0x2b5fa8,{r:.6});floorM(w,d,fl);var pl2=[];for(var x2=-w/2+.6;x2<w/2;x2+=.6)pl2.push([x2,.031,0,.015,.003,d]);lines(pl2,mc(T,0xb8864a,{r:.5}));
   var bz=-d/2+(full?4:1.5),kw=full?12:Math.min(12,w-1),kd=Math.min(full?19:13,d-2);k.box(0,.032,bz+kd/2-.6,kw,.004,kd,paint2);var ll=[[-kw/2,.036,bz+kd/2-.6,.15,.004,kd],[kw/2,.036,bz+kd/2-.6,.15,.004,kd],[0,.036,bz+kd-.6,kw,.004,.15],[-w/2+.1,.036,0,.15,.004,d],[w/2-.1,.036,0,.15,.004,d],[0,.036,-d/2+.1,w,.004,.15]];if(full)ll.push([0,.036,d/2-.1,w,.004,.15]);lines(ll);
   var ftc=new T.Mesh(new T.TorusGeometry(Math.min(6,w/2-.3),.07,4,40),white);ftc.rotation.x=Math.PI/2;ftc.scale.z=.05;ftc.position.set(0,.037,bz+kd-.6);g.add(ftc);
   if(full){var arc=new T.Mesh(new T.TorusGeometry(Math.min(22,w/2-1),.07,4,64,Math.PI),white);arc.rotation.x=Math.PI/2;arc.rotation.z=Math.PI;arc.scale.z=.05;arc.position.set(0,.037,bz);g.add(arc)}
   var hy=10,bb=new T.Mesh(new T.BoxGeometry(6,3.5,.12),mc(T,0xdfeeff,{op:.35,r:.05}));bb.position.set(0,hy+1.2,bz-1.3);g.add(bb);k.box(0,hy+.6,bz-1.23,2,1.5,.02,mc(T,0xffffff,{e:0xd92b2b,ei:.1,r:.4}));
   lines([[0,hy-.5+.1,bz-1.22,6,.12,.02],[0,hy+2.85,bz-1.22,6,.12,.02],[-3,hy+1.2,bz-1.22,.12,3.5,.02],[3,hy+1.2,bz-1.22,.12,3.5,.02],[0,hy+.62,bz-1.21,2,.08,.02],[-1,hy+1.3,bz-1.21,.08,1.5,.02],[1,hy+1.3,bz-1.21,.08,1.5,.02],[0,hy+2,bz-1.21,2,.08,.02]],mc(T,0xd92b2b,{r:.5}));
   var rim=new T.Mesh(new T.TorusGeometry(.75,.04,6,24),mc(T,0xff5a1a,{m:.4,r:.4}));rim.rotation.x=Math.PI/2;rim.position.set(0,hy,bz-.4);g.add(rim);var nt=new T.Mesh(new T.CylinderGeometry(.75,.5,1.4,16,1,true),net(10,3,0xffffff,.8));nt.position.set(0,hy-.7,bz-.4);g.add(nt);
   if(full){k.box(0,0,bz-4,.6,hy+1,.6,blk);k.box(0,0,bz-4.4,2.6,1.2,2.4,blk);tube(0,hy-.2,bz-3.8,0,hy+.5,bz-1.4,.25,blk);k.box(0,0,bz-3.7,.62,6,.1,pad)}else{tube(-1.5,hy+1,-d/2,-1.5,hy+1,bz-1.3,.08,blk);tube(1.5,hy+1,-d/2,1.5,hy+1,bz-1.3,.08,blk)}
   var balls=[];for(var bi=0;bi<6;bi++)balls.push([w/2-1.5-(bi%3)*.8,(bi<3?1:2.2),-d/2+1+(full?2:0),.78,.78,.78]);inst('sph',mc(T,0xd96a2a,{r:.7}),balls);k.box(w/2-2.3,0,-d/2+1+(full?2:0),.1,2.8,.9,steel);k.box(w/2-.7,0,-d/2+1+(full?2:0),.1,2.8,.9,steel);[.6,1.8].forEach(function(y){k.box(w/2-1.5,y,-d/2+1+(full?2:0),1.7,.06,.9,steel)});return true}
  case 'c-net':{var np=Math.max(2,Math.round(w/15))+1;for(var ni=0;ni<np;ni++){var nx=-w/2+ni*w/(np-1);k.cyl(nx,0,0,.12,.12,h,steel);k.cyl(nx,0,0,.35,.35,.08,blk)}hcyl(0,h-.1,0,.03,w,steel,'x');plane(0,h/2,0,w,h-.2,net(w/.5,(h-.2)/.5,0x1a1a1a,.8));k.box(0,0,0,w,.12,.15,blk);return true}
  case 'x-batting':{var tn=net(d/.6,(h)/.6,0x1a1a1a,.6),tw=Math.min(w,12);[-1,1].forEach(function(s){plane(s*tw/2,h/2,0,d,h,tn,0,Math.PI/2)});plane(0,h,0,tw,d,net(tw/.6,d/.6,0x1a1a1a,.6),Math.PI/2);plane(0,h/2,-d/2,tw,h,tn);plane(0,h/2,d/2,tw,h,tn);
   var fr=[];for(var fz=-d/2;fz<=d/2+.1;fz+=d/5){fr.push([-tw/2,h/2,fz,.1,h,.1],[tw/2,h/2,fz,.1,h,.1],[0,h,fz,tw,.1,.1])}lines(fr,steel);k.box(0,0,d/2-6,tw-.5,.03,8,mc(T,0x3f8a3a,{r:1}));lines([[0,.035,d/2-6,1.4,.004,1.4]]);
   k.box(0,0,-d/2+12,.2,3,.2,steel);var lsc=sub2(0,-d/2+10,0);lsc.box(-1,0,0,.12,7,.12,steel);lsc.box(1,0,0,.12,7,.12,steel);lsc.box(0,7,0,2.1,.12,.12,steel);k.box(0,0,-d/2+6,2.5,.6,1.8,steel);hcyl(0,2.4,-d/2+6.3,.8,.3,mc(T,0x1a1a1a),'x');hcyl(0,2.4,-d/2+6.3,.12,.35,steelL,'x');k.box(-.3,.6,-d/2+6,.2,1.6,.2,steel);
   k.cyl(.4,3.3,-d/2+5.8,.5,.3,.9,mc(T,0x1d4d8c,{r:.5}),14);inst('sph',white,[[.3,3.95,-d/2+5.8,.24,.24,.24],[.5,3.95,-d/2+5.9,.24,.24,.24],[.4,4.05,-d/2+5.7,.24,.24,.24]]);return true}
  case 'x-tennis':{floorM(w,d,mc(T,0x3a6aa0,{r:.8}));k.box(0,.032,0,w-2,.004,d-2,mc(T,0x2d8a5a,{r:.8}));lines([[0,.036,0,.12,.004,d-2],[-w/2+1,.036,0,.15,.004,d-2],[w/2-1,.036,0,.15,.004,d-2],[0,.036,-d/2+1,w-2,.004,.15],[0,.036,d/2-1,w-2,.004,.15],[0,.036,d/2-12,w-2,.004,.15]]);
   k.box(0,0,-d/2+2,2,1.4,1.6,mc(T,0x1d1d20,{r:.5}));k.box(0,1.4,-d/2+2,1.8,.9,1.4,mc(T,0x2a2b2e,{op:.6,r:.2}));var tb=[];for(var ti=0;ti<30;ti++)tb.push([(ti%6-2.5)*.25,1.55+Math.floor(ti/12)*.18,-d/2+1.6+(Math.floor(ti/6)%2)*.6,.22,.22,.22]);inst('sph',mc(T,0xd8f03a,{r:.8}),tb);
   hcyl(0,.9,-d/2+2.85,.2,.2,blk,'z');inst('cyl',rub,[[-.9,.25,-d/2+1.3,.5,.18,.5,0,0,Math.PI/2],[.9,.25,-d/2+1.3,.5,.18,.5,0,0,Math.PI/2]]);var lb=[];for(var li=0;li<14;li++)lb.push([(li*1.7%w)-w/2+.6,.12,d/2-2-(li*3.1%12),.22,.22,.22]);inst('sph',mc(T,0xd8f03a,{r:.8}),lb);return true}
  case 'x-return':{var fz2=-d/2+3;k.box(0,0,fz2,2.4,2.8,2.4,mc(T,0x1d1d20,{r:.5}));k.box(0,2.8,fz2,2.6,.15,2.6,blk);panelScr(0,1.8,fz2+1.22,1,.6,'score');var ch=k.box(0,1.2,fz2+1.6,1,.12,2.4,steelL);ch.rotation.x=.3;
   [-1,1].forEach(function(s){tube(s*1.2,2.9,fz2-1.1,s*2.8,h,fz2-1.5,.06,steel);tube(s*1.2,2.9,fz2+1.1,s*2.8,h,fz2+2.4,.06,steel)});tube(-2.8,h,fz2-1.5,2.8,h,fz2-1.5,.06,steel);tube(-2.8,h,fz2+2.4,2.8,h,fz2+2.4,.06,steel);
   var fn=new T.Mesh(new T.CylinderGeometry(3.2,1.3,h-3,4,1,true),net(16,10,0x1a1a1a,.7));fn.rotation.y=Math.PI/4;fn.position.set(0,2.9+(h-3)/2,fz2+.5);fn.scale.set(1,1,1.1);g.add(fn);sph(0,1.5,fz2+2.6,.39,mc(T,0xd96a2a,{r:.7}));return true}
  case 'c-golf1':case 'c-golf2':case 'c-golf3':{var lvl=+r.slice(-1),turf=mc(T,0x3f8a3a,{r:1}),sw=Math.min(w,lvl===1?10:lvl===2?12:16),sz2=-d/2+1;
   if(lvl>1){floorM(w,d,turf);var fr2=[],sd=d-2;[-1,1].forEach(function(s){fr2.push([s*sw/2,h/2,sz2+sd/2,.15,h,.15],[s*sw/2,h/2,sz2,.15,h,.15],[s*sw/2,h-.1,sz2+sd/2*.0+sd/2,.15,.15,sd])});fr2.push([0,h-.1,sz2,sw,.15,.15],[0,h-.1,sz2+sd/2,sw,.15,.15]);lines(fr2,blk);
    var side=lvl===3?mc(T,0x1d1d20,{r:.9}):net(sd/.5,h/.5,0x111111,.85);[-1,1].forEach(function(s){plane(s*sw/2,h/2,sz2+sd/2,sd,h,side,0,Math.PI/2)});plane(0,h,sz2+sd/2,sw,sd,lvl===3?mc(T,0x1d1d20,{r:.9,side:T.DoubleSide}):net(sw/.5,sd/.5,0x111111,.85),Math.PI/2);
    k.box(0,.3,sz2+.1,sw-.4,h-.6,.05,scrMat(T,'golf',1.1));k.box(0,h-.8,sz2+sd*.55,1.3,.4,1.1,white);k.cyl(0,h-.4,sz2+sd*.55,.06,.06,.4,blk)}
   else{floorM(sw,d,mc(T,0x6a6a66,{r:.9}));lines([[-sw/2+.2,h/2,sz2,.12,h,.12],[sw/2-.2,h/2,sz2,.12,h,.12],[0,h-.1,sz2,sw-.4,.12,.12],[-sw/2+.2,h/2,sz2+1.5,.12,h,.12],[sw/2-.2,h/2,sz2+1.5,.12,h,.12]],blk);plane(0,h/2,sz2+.05,sw-.4,h-.2,mc(T,0xf2f2ee,{r:.9,side:T.DoubleSide}));plane(0,h/2,sz2+1.5,sw-.4,h-.2,net(sw/.4,h/.4,0x1a1a1a,.55))}
   var mz=d/2-4.5;k.box(0,0,mz,5,.12,5,turf);k.box(.8,.12,mz,1.6,.03,4,mc(T,0x4fa04a,{r:1}));k.box(-1.3,0,mz+.8,.55,.35,.45,blk);k.box(-1.3,.2,mz+.56,.4,.1,.01,lit(0x38d0ff,1.4));sph(.8,.2,mz-.6,.07,white);
   var gb=sub2(sw/2-1.2,mz+1.5,.3);gb.cyl(0,0,0,.4,.4,2.8,mc(T,0x1d1d20,{r:.6}),14);gb.cyl(0,2.8,0,.42,.42,.08,red,14);for(var ci=0;ci<6;ci++)gb.cyl((ci%3-1)*.15,2.9,(ci<3?-.1:.1),.025,.025,.8+ci*.05,chrome,6);
   if(lvl===3){k.box(-w/2+2,0,d/2-2,3,.08,3,mc(T,0x4fa04a,{r:1}));var cup=k.cyl(-w/2+2,.08,d/2-2,.18,.18,.01,blk);k.cyl(w/2-2,0,d/2-1.5,.9,.9,1.4,mc(T,0x6b3f26,{r:.55}),16)}return true}
  case 'c-bowl':case 'c-bowlmini':{var mini=r==='c-bowlmini',lw=mini?3.2:3.5,lane=mc(T,0xd9b27a,{r:.25}),appr=mini?6:15,lz=-d/2+2.5,le=d/2-appr;k.box(0,0,(lz+le)/2,lw,.15,le-lz,lane);k.box(0,0,le+appr/2,w,.15,appr,mc(T,0xc9a26a,{r:.35}));
   var bd2=[];for(var bi2=0;bi2<Math.floor(lw/.12);bi2++)bd2.push([-lw/2+.06+bi2*.12,.151,(lz+le)/2,.005,.002,le-lz]);lines(bd2,mc(T,0xbf965e));lines([[0,.152,le,lw,.004,.06]],mc(T,0x1a1a1a));
   var ar=[];for(var ai=0;ai<7;ai++){var ax=(ai-3)*lw/8;ar.push([ax,.153,le-(mini?5:15)+Math.abs(ai-3)*.4,.08,.003,.3])}inst('box',mc(T,0x6b3a1e),ar);
   [-1,1].forEach(function(s){var gt=new T.Mesh(new T.CylinderGeometry(.4,.4,le-lz,10,1,true,0,Math.PI),mc(T,0x2a2b2e,{r:.4,side:T.DoubleSide}));gt.rotation.x=Math.PI/2;gt.rotation.y=0;gt.rotation.z=Math.PI;gt.position.set(s*(lw/2+.4),.4,(lz+le)/2);g.add(gt);k.box(s*(w/2-.15),0,(lz+le)/2,.3,.6,le-lz,mc(T,0x3a2a20,{r:.6}))});
   var pins=[],stripes=[],ps=mini?.6:1;[[0,0],[-.5,1],[.5,1],[-1,2],[0,2],[1,2],[-1.5,3],[-.5,3],[.5,3],[1.5,3]].forEach(function(p){pins.push([p[0]*.5*ps,.15+.6*ps,lz+1.5-p[1]*.45*ps,.32*ps,1.2*ps,.32*ps]);stripes.push([p[0]*.5*ps,.15+.95*ps,lz+1.5-p[1]*.45*ps,.27*ps,.08*ps,.27*ps])});inst('cyl',mc(T,0xf6f4ee,{r:.3}),pins);inst('cyl',mc(T,0xd92b2b,{r:.4}),stripes);
   k.box(0,mini?1.6:2.4,lz-1,w,mini?1.2:1.6,2.4,mc(T,0x111114,{r:.5}));k.box(0,mini?1.7:2.5,lz+.21,w-.6,mini?.9:1.3,.02,scrMat(T,'marquee2',1.1));k.box(0,0,lz-1.8,w,mini?1.6:2.4,.8,mc(T,0x111114));
   var rz2=le+appr-3;k.box(w/2-.6,0,rz2,1,1.4,2.2,mc(T,0x2b2f6a,{r:.4}));var bl=[];for(var bj=0;bj<5;bj++)bl.push([w/2-.6,1.55,rz2-.85+bj*.42,mini?.5:.72,mini?.5:.72,mini?.5:.72]);inst('sph',mc(T,0xffffff,{r:.15,m:.1}),bl,[0x2b6fd9,0xd92b2b,0x8a2bd9,0x1a1a1a,0x2bb07a]);
   if(!mini){var dots=[];for(var di=0;di<5;di++)dots.push([(di-2)*.6,.152,le+3,.08,.003,.08]);inst('cyl',mc(T,0x6b3a1e),dots)}return true}
  case 'c-pickle':{floorM(w,d,mc(T,0x2d7a4f,{r:.85}));var cw=Math.min(20,w-4),cl=Math.min(44,d-4);k.box(0,.032,0,cw,.004,cl,mc(T,0x2b5fa8,{r:.8}));k.box(0,.033,0,cw,.004,14,mc(T,0x3d8a5a,{r:.8}));
   lines([[-cw/2,.037,0,.17,.004,cl],[cw/2,.037,0,.17,.004,cl],[0,.037,-cl/2,cw,.004,.17],[0,.037,cl/2,cw,.004,.17],[0,.037,-7,cw,.004,.17],[0,.037,7,cw,.004,.17],[0,.037,-(cl/2+7)/2,.17,.004,cl/2-7],[0,.037,(cl/2+7)/2,.17,.004,cl/2-7]]);
   [-1,1].forEach(function(s){k.cyl(s*(cw/2+1),0,0,.1,.1,3,steel);k.cyl(s*(cw/2+1),0,0,.5,.6,.12,blk)});plane(0,1.5+.0,0,cw+2,2.8,net(cw*2,6,0x111111,.75));k.box(0,2.9,0,cw+2,.12,.04,white);k.box(0,0,0,cw+2,.08,.06,blk);
   inst('cyl',mc(T,0x2b6fd9,{r:.4}),[[-2,.04,5,.6,.03,.8],[3,.04,-6,.6,.03,.8]]);sph(1,.13,3,.12,mc(T,0xf0e040,{r:.6}));return true}
  case 'c-climb':{var ply=mc(T,0xd9c49a,{r:.8}),pz=-d/2+.6,ov=Math.min(4,d*.35);k.box(-w/4,0,pz,w/2,h,1.2,ply);var ow=k.box(w/4,0,0,w/2,h*.65,1,ply);ow.rotation.x=-.42;ow.position.set(w/4,h*.33,pz+1.4);k.box(w/4,h*.65,pz+2.3,w/2,h*.35,1,ply);k.box(w/4,0,pz-.3,w/2,h,.5,mc(T,0x8a7a5a,{r:.8}));
   var holds=[],tn=[],HC=[0xe2442a,0x2b6fd9,0xf0c53a,0x2bb07a,0xd92bb0,0xff8a1a,0x1a1a1a,0xffffff],seed=7,rnd=function(){seed=(seed*9301+49297)%233280;return seed/233280};
   for(var hi=0;hi<70;hi++){var hx=-w/2+.4+rnd()*(w/2-.8),hy=.6+rnd()*(h-1.2),s2=.18+rnd()*.25;holds.push([hx,hy,pz+.65,s2*1.4,s2,s2*.8])}for(var hj=0;hj<50;hj++){var t=rnd(),hx2=.4+rnd()*(w/2-.8),hy2=t*h*.6,zz=pz+.95+hy2*Math.tan(.42)*.0+ (t)*1.6,s3=.2+rnd()*.25;holds.push([hx2,hy2+.5,pz+.95+t*2.2,s3*1.4,s3,s3*.8])}
   inst('sph',mc(T,0xffffff,{r:.6}),holds,HC);for(var ti2=0;ti2<120;ti2++)tn.push([-w/2+.25+(ti2%16)*(w/2-.5)/15,.4+Math.floor(ti2/16)*1.6,pz+.61,.04,.04,.01]);inst('box',mc(T,0x6b5a3a),tn);
   var pads=[];[[-w/4,w/2],[w/4,w/2]].forEach(function(p){pads.push([p[0],.5,pz+2.6,p[1]-.1,1,3.8])});inst('box',mc(T,0x1d4d8c,{r:.9}),pads);lines([[0,1.005,pz+2.6,.03,.01,3.8],[-w/4,1.005,pz+2.6,w/2-.1,.01,.03]],mc(T,0x163a6a));return true}
  case 'c-ninja':{var fr3=[],cols2=[[-w/2+.3,-d/2+.3],[w/2-.3,-d/2+.3],[-w/2+.3,d/2-.3],[w/2-.3,d/2-.3],[0,-d/2+.3],[0,d/2-.3]];cols2.forEach(function(p){fr3.push([p[0],h/2,p[1],.35,h,.35])});[-d/2+.3,d/2-.3].forEach(function(z){fr3.push([0,h-.2,z,w,.35,.35])});[-w/2+.3,0,w/2-.3].forEach(function(x){fr3.push([x,h-.2,0,.35,.35,d])});inst('box',mc(T,0x1d1d20,{m:.5,r:.4}),fr3);
   var mb=[];for(var mi=0;mi<8;mi++)mb.push([-w/4,h-.5,-d/2+1+mi*(d-2)/7,.12,w/2-.6,.12,0,0,Math.PI/2]);inst('cyl',yel,mb);var rings=[];for(var ri=0;ri<4;ri++){var rzz=-d/2+1.5+ri*2.6;tube(w/4-.5,h-.4,rzz,w/4-.5,h-2.6,rzz,.02,blk);tube(w/4+.5,h-.4,rzz,w/4+.5,h-2.6,rzz,.02,blk);rings.push([w/4-.5,h-2.85,rzz,.9,.9,.9,0,Math.PI/2,0],[w/4+.5,h-2.85,rzz,.9,.9,.9,0,Math.PI/2,0])}inst('tor',mc(T,0x1a1a1a,{r:.5}),rings);
   k.cyl(w/2-1.2,1,d/2-1.2,.08,.08,h-1.3,mc(T,0xc9a26a,{r:.9}));var cn=[];for(var cx=0;cx<6;cx++)cn.push([-w/2+.6,h/2+.3,-d/2+.8+cx*.5,.03,h-1.2,.03]);for(var cy=0;cy<8;cy++)cn.push([-w/2+.6,1.5+cy*(h-3)/7,-d/2+2.05,.03,.03,2.6]);inst('box',mc(T,0x1a1a1a),cn);
   var lr=[];for(var lri=0;lri<6;lri++)lr.push([.0,2.2+lri*1.3,d/2-.4,.1,w/2-.7,.1,0,0,Math.PI/2]);inst('cyl',chrome,lr);k.box(0,0,0,w-.8,.8,d-.8,mc(T,0x1d4d8c,{r:.9}));return true}
  /* ---------- Creator / Maker ---------- */
  case 'm-laser1':case 'm-print1':case 'm-resin':case 'm-emb1':{var bh=3,top2=mc(T,0xd4cfc4,{r:.6});bench(w,bh,d,top2);
   if(r==='m-laser1'){var fx=-w/2+.4,fw2=w*.6,fd2=d-.5;lines([[fx+fw2/2,bh+.08,-fd2/2,fw2,.1,.1],[fx+fw2/2,bh+.08,fd2/2,fw2,.1,.1],[fx,bh+.08,0,.1,.1,fd2],[fx+fw2,bh+.08,0,.1,.1,fd2]],alu);var gx=fx+fw2*.55;k.box(gx,bh+.13,0,.12,.12,fd2,alu);k.box(gx,bh+.15,.2,.25,.4,.22,blk);k.box(gx,bh+.17,.33,.06,.06,.01,lit(0x3a6aff,2));
    var hc=[];for(var a=0;a<12;a++)for(var b=0;b<8;b++)hc.push([fx+.15+a*(fw2-.3)/11,bh+.005,-fd2/2+.15+b*(fd2-.3)/7,.12,.01,.12]);inst('box',mc(T,0x6a6e72,{m:.5}),hc);k.box(w/2-.6,bh,.1,.8,.03,.55,blk);var lid=k.box(w/2-.6,bh+.03,-.15,.78,.5,.02,blk);lid.rotation.x=-.25;k.box(w/2-.6,bh+.1,-.13,.7,.4,.01,scrMat(T,'desktop',1));return true}
   if(r==='m-print1'){var n2=Math.max(1,Math.floor((w-.4)/1.4)),pr=[];for(var p2=0;p2<n2;p2++){var px2=-w/2+.4+(p2+.5)*(w-.8)/n2,kk=sub2(px2,0,0,bh);kk.box(0,0,0,1.1,.15,1.1,blk);kk.box(0,.15,0,.95,.03,.95,mc(T,0x2a2a2a,{m:.4}));kk.box(-.5,.15,-.4,.08,1.3,.08,alu);kk.box(.5,.15,-.4,.08,1.3,.08,alu);kk.box(0,1.45,-.4,1.08,.08,.08,alu);kk.box(0,.9,-.4,1.05,.08,.1,alu);kk.box(.1,.75,-.3,.22,.25,.18,blk);kk.box(0,1.53,-.45,.06,.4,.06,alu);
    pr.push([px2,bh+1.95,-.5,.65,.65,1.2,0,Math.PI/2,0]);kk.box(-.35,.18,.15,.25,.12,.25,mc(T,[0xe2442a,0x2b6fd9,0xf0c53a][p2%3]))}inst('tor',mc(T,0xffffff,{r:.5}),pr,[0xe2442a,0x2b6fd9,0x6aa84f,0xf0f0f0]);return true}
   if(r==='m-resin'){k.box(-w/4,bh,0,.9,.6,.8,mc(T,0x2a2a2a));k.box(-w/4,bh+.6,0,.85,.75,.75,mc(T,0xff8a1a,{op:.55,r:.1}));k.box(-w/4,bh+.1,.41,.3,.2,.01,lit(0x38d0ff,1.3));[[w/8,.55],[w/3,.5]].forEach(function(q,i){k.cyl(q[0],bh,0,.38,.4,q[1],mc(T,0x2a2a2a),16);k.cyl(q[0],bh+q[1],0,.36,.36,.5,mc(T,i?0x8a5cd9:0xff8a1a,{op:.5,r:.1}),16)});
    inst('cyl',mc(T,0xffffff,{r:.4}),[[w/2-.3,bh+.25,-.25,.25,.5,.25],[w/2-.55,bh+.25,-.25,.25,.5,.25]],[0x3a3a3a,0x9a5cd9]);k.box(0,bh,.5,.5,.02,.3,mc(T,0x2b6fd9));k.box(0,bh+1.2,-d/2+.1,w,.6,.15,mc(T,0x9aa0a6));return true}
   var em=sub2(-.1,0,0,bh);em.box(-.5,0,0,1.6,.35,.7,body);em.box(.6,.35,0,.35,.75,.65,body);em.box(-.1,1.1,0,1.75,.3,.6,body);em.box(-.85,.9,0,.25,.25,.5,body);em.box(-.85,.65,.1,.03,.3,.03,chrome);em.box(.62,.7,.33,.25,.2,.01,scrMat(T,'desktop',1.1));em.box(-.5,.35,.05,.9,.03,.7,mc(T,0x3a3d44));
   inst('cyl',mc(T,0xffffff,{r:.5}),[[w/2-.7,bh+.15,-.3,.15,.3,.15],[w/2-.5,bh+.15,-.3,.15,.3,.15],[w/2-.3,bh+.15,-.3,.15,.3,.15],[w/2-.6,bh+.15,-.1,.15,.3,.15],[w/2-.4,bh+.15,-.1,.15,.3,.15]],[0xe2442a,0x2b6fd9,0xf0c53a,0x6aa84f,0xd92bb0]);return true}
  case 'm-laser2':case 'm-laser3':{var big=r==='m-laser3',sh2=2,bw=w-(big?0:.4),bd=d;k.legs(bw,bd,sh2,.2,steel,.1);inst('cyl',rub,[[-bw/2+.3,.1,-bd/2+.3,.2,.2,.2],[bw/2-.3,.1,-bd/2+.3,.2,.2,.2],[-bw/2+.3,.1,bd/2-.3,.2,.2,.2],[bw/2-.3,.1,bd/2-.3,.2,.2,.2]]);
   var lc=mc(T,big?0x2b4a7a:0xeeeeec,{r:.45}),cw2=bw*.82;k.box(-bw/2+cw2/2,sh2,0,cw2,h-sh2-.5,bd,lc);var ld=k.box(-bw/2+cw2/2,h-.5,.1,cw2,.5,bd-.2,lc);k.box(-bw/2+cw2/2,h-.25,0,cw2*.8,.27,bd*.55,mc(T,0xff6a1a,{op:.5,r:.1}));handle(-bw/2+cw2/2,h-.4,bd/2,cw2*.5,false);
   var pnx=-bw/2+cw2+(bw-cw2)/2;k.box(pnx,sh2,0,bw-cw2,h-sh2,bd,mc(T,0x2a2b2e,{r:.5}));k.box(pnx,h-1,bd/2+.01,(bw-cw2)*.7,.45,.01,scrMat(T,'desktop',1.2));tbtn(pnx-.2,h-1.3,bd/2+.03,4);k.box(pnx,h-1.6,bd/2+.03,.15,.15,.03,red);
   k.box(-bw/2+cw2/2,sh2+.2,bd/2+.01,cw2*.6,.8,.02,lc);handle(-bw/2+cw2/2,sh2+.85,bd/2+.04,cw2*.3,false);k.cyl(-bw/2+.5,h-.6,-bd/2-.1,.25,.25,.6,alu,14);tube(-bw/2+.5,h,-bd/2-.1,-bw/2+.5,h+1.5,-bd/2-.1,.25,alu);
   if(big){k.box(-bw/2+cw2/2,sh2+1,bd/2+.02,cw2-.2,.15,.03,blk);k.box(-bw/2+cw2/2,sh2+1,-bd/2-.02,cw2-.2,.15,.03,blk)}return true}
  case 'm-fiber':{var sh3=2.8;k.box(0,0,0,w,sh3,d,mc(T,0x2a2b2e,{r:.5}));k.box(0,.3,d/2+.01,w*.8,1.4,.02,mc(T,0x3a3d44));handle(0,1.2,d/2+.04,w*.4,false);k.box(0,sh3,0,w+.1,.08,d+.1,steelL);
   var hc2=[];for(var a2=0;a2<8;a2++)for(var b2=0;b2<8;b2++)hc2.push([-w/2+.2+a2*(w-.4)/7,sh3+.085,-d/2+.2+b2*(d-.4)/7,.06,.005,.06]);inst('box',blk,hc2);k.box(0,sh3+.09,.1,.7,.03,.5,steelL);
   k.box(0,sh3,-d/2+.25,.25,1.9,.25,mc(T,0x1d1d20));k.box(0,sh3+1.3,-d/2+.45,.5,.5,.55,mc(T,0xe2442a,{r:.4}));k.cyl(0,sh3+1.05,-d/2+.55,.12,.12,.25,blk);k.box(0,sh3+.95,-d/2+.55,.18,.01,.18,lit(0xff2a10,1.2));k.box(0,sh3+1.8,-d/2+.45,.4,.2,.4,mc(T,0x1d1d20));
   var lg=k.box(-w/2+.4,sh3+.08,.1,.7,.03,.5,blk);var sc=k.box(-w/2+.4,sh3+.11,-.15,.68,.45,.02,blk);sc.rotation.x=-.25;k.box(-w/2+.4,sh3+.15,-.13,.6,.38,.01,scrMat(T,'desktop',1));return true}
  case 'm-weld1':case 'm-weld3':{var ind=r==='m-weld3',wc=mc(T,ind?0x2b5fa8:0xeeeeec,{r:.45}),bh2=h-(ind?.6:.4);k.box(0,.25,0,w,bh2-.25,d,wc);inst('cyl',rub,[[-w/2+.25,.12,-d/2+.25,.25,.2,.25],[w/2-.25,.12,-d/2+.25,.25,.2,.25],[-w/2+.25,.12,d/2-.25,.25,.2,.25],[w/2-.25,.12,d/2-.25,.25,.2,.25]]);
   k.box(0,bh2-.7,d/2+.01,w*.6,.45,.01,scrMat(T,'desktop',1.1));tbtn(-w*.2,bh2-1,d/2+.03,4);var lv=[];for(var l3=0;l3<6;l3++)lv.push([w/2+.005,.6+l3*.15,0,.01,.05,d*.6]);lines(lv,blk);
   if(ind){k.box(0,bh2,0,w*.6,.5,d*.5,mc(T,0x3a3d44,{r:.5}));k.box(0,bh2+.5,0,w*.65,.08,d*.55,steelL)}hcyl(-w/2-.05,bh2-.1,0,.05,.4,chrome,'z');[-1,1].forEach(function(s){k.box(-w/2+.15,bh2,s*(d/2-.15),.08,.5,.08,chrome)});
   var coil=new T.Mesh(new T.TorusGeometry(.45,.05,6,24),blk);coil.position.set(w/2+.05,bh2*.5,0);coil.rotation.y=Math.PI/2;g.add(coil);var gn=k.box(w/2+.1,bh2*.5+.1,.4,.08,.4,.1,mc(T,0xe2442a,{r:.4}));gn.rotation.x=.4;return true}
  case 'm-weld2':{var tw2=w*.7,tx2=-w/2+tw2/2,th2=2.8;k.box(tx2,0,0,tw2,th2-.2,d,mc(T,0x2a2b2e,{r:.5}));var sl2=[];for(var si=0;si<Math.floor(tw2/.3);si++)sl2.push([tx2-tw2/2+.2+si*.3,th2-.05,0,.03,.3,d-.3]);inst('box',mc(T,0x6a6e72,{m:.5}),sl2);
   [-1,1].forEach(function(s){k.box(tx2+s*(tw2/2-.1),th2-.2,0,.2,.35,d,yel)});k.box(tx2,th2+.15,.3,tw2,.25,.3,yel);[-1,1].forEach(function(s){k.box(tx2+s*(tw2/2-.1),th2-.2,.3,.25,.6,.35,yel)});k.box(tx2+.3,th2-.1,.45,.3,.6,.3,mc(T,0x1d1d20));k.cyl(tx2+.3,th2-.3,.55,.05,.03,.25,chrome);
   var ux=w/2-(w-tw2)/2;k.box(ux,.2,0,w-tw2-.1,h-.4,d*.6,mc(T,0xeeeeec,{r:.45}));k.box(ux,h-1.3,d*.3+.01,(w-tw2)*.7,.45,.01,scrMat(T,'desktop',1.1));inst('cyl',rub,[[ux-.3,.1,-d*.25,.2,.2,.2],[ux+.3,.1,-d*.25,.2,.2,.2],[ux-.3,.1,d*.25,.2,.2,.2],[ux+.3,.1,d*.25,.2,.2,.2]]);return true}
  case 'm-comp':{k.box(0,0,0,w,.1,d,steel);k.cyl(0,.1,0,w*.38,w*.38,h-.9,mc(T,0xc8202a,{m:.3,r:.4}),20);sph(0,h-.8,0,w*.38,mc(T,0xc8202a,{m:.3,r:.4}));k.box(0,h-.55,0,w*.6,.3,d*.55,mc(T,0x2a2b2e,{m:.4}));k.cyl(-.25,h-.25,0,.18,.18,.25,mc(T,0x2a2b2e,{m:.4}),12);
   k.cyl(.3,h-.25,0,.25,.25,.15,mc(T,0x2a2b2e,{m:.4}),16);hcyl(w*.38,1.6,0,.15,.06,white,'x');k.cyl(w*.38+.05,1.6,0,.13,.13,.01,mc(T,0xffffff,{r:.4})).rotation.z=Math.PI/2;tube(.4,1,.3,.4,h-.6,.3,.04,chrome);return true}
  case 'm-dryer':case 'm-fume':case 'm-expose':{var fume=r==='m-fume',exp=r==='m-expose';
   if(exp){k.legs(w,d,2.4,.12,steel,.05);k.box(0,2.4,0,w,h-2.6,d,mc(T,0x2a2b2e,{r:.5}));k.box(0,h-.2,0,w-.3,.03,d-.3,mc(T,0xdfeeff,{op:.4,r:.05}));k.box(0,h-.25,0,w-.4,.01,d-.4,lit(0x7a4aff,1.3));var lid2=k.box(0,h-.15,-d/2+.1,w,.08,d,mc(T,0x1a1a1a,{r:.8}));lid2.rotation.x=-1.1;lid2.position.set(0,h+1.1,-d/2+.25);k.box(0,2.6,d/2+.01,w*.5,.4,.01,scrMat(T,'desktop',1));return true}
   k.box(0,.2,0,w,h-.2,d,mc(T,fume?0x2b5fa8:0x7d8288,{r:.45}));inst('cyl',rub,[[-w/2+.2,.1,-d/2+.2,.18,.18,.18],[w/2-.2,.1,-d/2+.2,.18,.18,.18],[-w/2+.2,.1,d/2-.2,.18,.18,.18],[w/2-.2,.1,d/2-.2,.18,.18,.18]]);var lv2=[];for(var l4=0;l4<8;l4++)lv2.push([0,.5+l4*.14,d/2+.01,w*.7,.04,.02]);lines(lv2,blk);
   k.box(0,h-.6,d/2+.01,w*.5,.25,.01,lit(fume?0x33ff77:0x38d0ff,1.4));if(fume){k.cyl(0,h,0,.3,.3,.2,alu,16);tube(0,h+.2,0,0,h+1.2,-d/2-.3,.25,alu);handle(w/2-.2,h*.5,d/2+.03,1,true)}else{[-1,1].forEach(function(s){hcyl(s*w*.25,h-.3,-d/2-.1,.06,.3,chrome,'z')});inst('cyl',white,[[-.25,h-.9,d/2+.03,.25,.04,.25,Math.PI/2],[.25,h-.9,d/2+.03,.25,.04,.25,Math.PI/2]])}return true}
  case 'm-dtf':{var pw=w*.62;k.legs(pw,d*.6,2.6,.12,steel,.05);k.box(-w/2+pw/2,2.6,-d*.15,pw,.9,1.2,mc(T,0x2a2b2e,{r:.5}));k.box(-w/2+pw/2,3.1,-d*.15+.6,pw-.4,.2,.02,mc(T,0x8a5cd9,{op:.5}));hcyl(-w/2+pw/2,2.2,-d*.15+.8,.25,pw-.5,mc(T,0xdfeeff,{op:.6}),'x');
   k.box(-w/2+pw/2,2.3,-d*.15-.8,pw-.2,.7,.5,mc(T,0x3a3d44));inst('box',mc(T,0xffffff,{r:.4}),[[-w/2+.4,3.4,-d*.15-.5,.15,.25,.15],[-w/2+.6,3.4,-d*.15-.5,.15,.25,.15],[-w/2+.8,3.4,-d*.15-.5,.15,.25,.15],[-w/2+1,3.4,-d*.15-.5,.15,.25,.15]],[0x2bc6e8,0xd92bb0,0xf0e040,0x1a1a1a]);
   var hx3=w/2-(w-pw)/2;var hb=sub2(hx3,0,0);hb.legs(w-pw-.1,d*.9,2.68,.12,steelL,.08);hb.box(0,2.68,0,w-pw-.1,.12,d*.9,mc(T,0xd4cfc4,{r:.6}));var hp=sub2(hx3,0,0,2.8);hp.box(0,0,.1,1.2,.15,1.2,blk);hp.box(0,.15,.1,1.1,.05,1.1,mc(T,0x8a8a8a));hp.box(0,0,-.55,.25,1,.25,steel);var pl3=hp.box(0,.75,.1,1.2,.15,1.2,steel);pl3.rotation.x=-.4;pl3.position.set(0,1,.0);hp.box(0,1.15,.4,.6,.06,.06,blk);return true}
  case 'm-emb2':case 'm-emb3':{var heads=r==='m-emb3'?Math.max(2,Math.floor(w/1.6)):1,hw=w/heads,th3=r==='m-emb3'?2.9:2.6;if(r==='m-emb3'){k.box(0,0,0,w,.3,d,steel);k.legs(w,d,th3,.2,steel,.15);k.box(0,th3-.1,.2,w,.1,d-.8,mc(T,0x3a3d44))}else{k.legs(w*.8,d*.8,th3,.15,steel,.05);k.box(0,th3-.1,0,w,.1,d,mc(T,0xd4cfc4,{r:.6}))}
   var sp=[];for(var hi2=0;hi2<heads;hi2++){var hx4=-w/2+hw*(hi2+.5),em2=sub2(hx4,-d/2+.6,0,th3);em2.box(0,0,0,hw*.75,1.5,.7,body);em2.box(0,1.1,.35,hw*.65,.4,1.3,body);em2.box(0,.55,1,.25,.7,.25,body);em2.box(0,.3,1.12,.4,.03,.6,mc(T,0x3a3d44));
    for(var s4=0;s4<(r==='m-emb3'?12:15);s4++)sp.push([hx4-hw*.3+(s4%8)*hw*.6/7,th3+1.6+Math.floor(s4/8)*.22,-d/2+.5+(s4%2)*.12,.12,.22,.12])}
   inst('cyl',mc(T,0xffffff,{r:.5}),sp,[0xe2442a,0x2b6fd9,0xf0c53a,0x6aa84f,0xd92bb0,0xff8a1a,0xffffff,0x1a1a1a,0x8a5cd9]);if(r==='m-emb3')panelScr(w/2-.6,th3+.2,d/2-.1,.7,.45,'desktop');else panelScr(w/2-.4,th3+.8,-d/2+.97,.4,.3,'desktop');return true}
  case 'm-print2':case 'm-print3':{var farm=r==='m-print3';if(!farm){k.box(0,0,0,w,2.4,d,mc(T,0x2a2b2e,{r:.5}));doors(-w/2,w/2,.1,2.3,d/2+.01,2,mc(T,0x3a3d44),true)}
   var unit=function(x,y,z,uw){var kk2=sub2(x,z,0,y);kk2.box(0,0,0,uw,uw*.95,uw*.92,mc(T,0x1d1d20,{r:.4}));kk2.box(0,.1,uw*.46+.01,uw-.15,uw*.8,.02,mc(T,0xdfeeff,{op:.25,r:.05}));kk2.box(0,.1,uw*.46-.012,uw-.2,uw*.8,.01,mc(T,0x111111,{e:0xfff0d0,ei:.3}));kk2.box(0,uw*.42,uw*.46-.005,uw*.22,.15,.01,blk);kk2.box(0,.18,uw*.46-.005,uw*.7,.04,.01,mc(T,0x3a3a3a,{m:.4}));kk2.box(.05,.22,uw*.46-.004,uw*.25,uw*.18,.01,mc(T,[0xe2442a,0x2b6fd9,0xf0c53a][(Math.round(x*7)%3+3)%3],{r:.5}))};
   if(!farm){unit(0,2.4,0,Math.min(w,1.6));k.box(0,2.4+Math.min(w,1.6)*.95,0,Math.min(w,1.6),.4,1.1,mc(T,0x1d1d20,{r:.4}));var sp2=[];for(var a3=0;a3<4;a3++)sp2.push([-.45+a3*.3,2.4+Math.min(w,1.6)*.95+.22,0,.45,.45,.9,0,Math.PI/2,0]);inst('tor',mc(T,0xffffff,{r:.5}),sp2,[0xe2442a,0x2b6fd9,0xf0f0f0,0x1a1a1a]);return true}
   [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){k.box(q[0]*(w/2-.06),0,q[1]*(d/2-.06),.12,h,.12,steelL)});var lvls=3,lh=(h-.3)/lvls;for(var lv3=0;lv3<lvls;lv3++){var y3=.15+lv3*lh;k.box(0,y3,0,w,.06,d,steelL);var nu=Math.max(1,Math.floor(w/1.45));for(var u2=0;u2<nu;u2++)unit(-w/2+(u2+.5)*w/nu,y3+.06,0,Math.min(1.3,lh-.2))}k.box(0,h-.06,0,w,.06,d,steelL);return true}
  case 'm-vinyl':{var vh=2.9;[-1,1].forEach(function(s){k.box(s*(w/2-.3),0,0,.12,vh,.12,steel);k.box(s*(w/2-.3),0,0,.15,.08,d-.2,steel)});k.box(0,.6,0,w-.6,.08,.08,steel);hcyl(0,2.2,-.35,.18,w-.8,mc(T,0xd92b2b,{r:.5}),'x');[-1,1].forEach(function(s){k.box(s*(w/2-.3),1.9,-.35,.1,.4,.1,steel)});
   k.box(0,vh,0,w,.5,.8,mc(T,0xeeeeec,{r:.45}));k.box(0,vh+.5,-.1,w-.4,.25,.5,mc(T,0x3a3d44));k.box(w/2-.4,vh+.25,.41,.35,.18,.01,scrMat(T,'desktop',1.1));var vf=k.box(0,vh+.1,.6,w-.8,.01,.5,mc(T,0xd92b2b,{r:.5}));vf.rotation.x=.5;return true}
  case 'm-mill':{var mh=2.6;k.box(0,0,0,w,mh,d,mc(T,0x2a2b2e,{r:.5}));doors(-w/2,w/2,.1,mh-.1,d/2+.01,2,mc(T,0x3a3d44),true);var enc=mc(T,0xdfeeff,{op:.22,r:.05});lines([[-w/2+.05,mh+1.1,-d/2+.05,.08,2.2,.08],[w/2-.05,mh+1.1,-d/2+.05,.08,2.2,.08],[-w/2+.05,mh+1.1,d/2-.05,.08,2.2,.08],[w/2-.05,mh+1.1,d/2-.05,.08,2.2,.08],[0,mh+2.2,d/2-.05,w,.08,.08],[0,mh+2.2,-d/2+.05,w,.08,.08]],alu);
   var eb=new T.Mesh(new T.BoxGeometry(w-.1,2.2,d-.1),enc);eb.position.set(0,mh+1.1,0);g.add(eb);k.box(0,mh,0,w-.4,.15,d-.5,mc(T,0x6a6e72,{m:.5}));k.box(.2,mh+.15,.2,1,.15,.7,oak);[-1,1].forEach(function(s){k.box(s*(w/2-.35),mh+.15,0,.2,1.3,.25,alu)});k.box(0,mh+1.3,0,w-.6,.25,.25,alu);
   k.box(0,mh+.9,.12,.3,.55,.3,alu);k.cyl(0,mh+.45,.27,.12,.12,.45,mc(T,0x2a2b2e));k.cyl(0,mh+.35,.27,.02,.01,.12,chrome);return true}
  case 'm-uvflat':case 'm-large':{var lg2=r==='m-large';if(lg2){[-1,1].forEach(function(s){k.box(s*(w/2-.4),0,0,.15,2.8,.15,steel);k.box(s*(w/2-.4),0,0,.2,.08,d-.3,steel)});k.box(0,.8,0,w-.8,.08,.08,steel);var bk3=new T.Mesh(new T.CylinderGeometry(.6,.6,w-1,14,1,true,0,Math.PI),mc(T,0x2a2b2e,{op:.5,side:T.DoubleSide}));bk3.rotation.z=Math.PI/2;bk3.position.set(0,1.6,.6);g.add(bk3);
    k.box(0,2.8,0,w,.9,1.4,mc(T,0x2a2b2e,{r:.45}));k.box(0,3.7,-.2,w-.3,.4,.8,mc(T,0x3a3d44));hcyl(0,3.3,-.85,.22,w-.6,mc(T,0xf6f4ee,{r:.6}),'x');var po=k.box(0,2.6,.75,w-.8,.01,.8,mc(T,0xf6f4ee,{r:.6}));po.rotation.x=.6;k.box(w/2-.5,3.4,.71,.4,.25,.01,scrMat(T,'desktop',1.1));
    inst('box',mc(T,0xffffff,{r:.4}),[[-w/2+.3,3.1,.71,.12,.3,.02],[-w/2+.45,3.1,.71,.12,.3,.02],[-w/2+.6,3.1,.71,.12,.3,.02],[-w/2+.75,3.1,.71,.12,.3,.02]],[0x2bc6e8,0xd92bb0,0xf0e040,0x1a1a1a]);return true}
   k.box(0,0,0,w,2.8,d,mc(T,0xeeeeec,{r:.45}));k.box(0,2.8,0,w-.5,.04,d-.6,mc(T,0x2a2a2a,{r:.7}));k.box(0,2.84,.2,1.4,.02,1,mc(T,0xffffff,{r:.5}));[-1,1].forEach(function(s){k.box(s*(w/2-.15),2.8,0,.3,.5,d,mc(T,0x2a2b2e))});
   k.box(0,3.3,-.2,w,.5,.7,mc(T,0x2a2b2e,{r:.45}));k.box(.6,2.95,-.2,.8,.35,.6,mc(T,0x3a3d44));k.box(.6,2.9,-.2,.6,.03,.4,lit(0x7a4aff,1.5));k.box(w/2-.15,3.4,d/2-.4,.32,.35,.6,mc(T,0x3a3d44));k.box(w/2+.02,3.5,d/2-.4,.01,.2,.45,scrMat(T,'desktop',1.1));
   inst('box',mc(T,0xffffff,{r:.4}),[[-w/2+.4,1.6,d/2+.01,.25,.6,.02],[-w/2+.7,1.6,d/2+.01,.25,.6,.02],[-w/2+1,1.6,d/2+.01,.25,.6,.02],[-w/2+1.3,1.6,d/2+.01,.25,.6,.02],[-w/2+1.6,1.6,d/2+.01,.25,.6,.02]],[0x2bc6e8,0xd92bb0,0xf0e040,0x1a1a1a,0xffffff]);return true}
  case 'm-screen':{k.cyl(0,0,0,.6,.7,.15,steel,16);k.cyl(0,0,0,.15,.15,h-.3,steel);k.cyl(0,h-.3,0,.35,.35,.3,steel,16);var pc2=[0xe2442a,0x2b6fd9,0xf0c53a,0x1a1a1a];for(var ai2=0;ai2<4;ai2++){var ang=ai2*Math.PI/2+Math.PI/4,kk3=sub2(0,0,ang);kk3.box(0,3.1,0,.15,.12,Math.min(w,d)/2-.3,steel);kk3.box(0,3.0,Math.min(w,d)/2-.8,.9,.04,1.2,mc(T,0x2a2b2e));kk3.box(0,3.05,Math.min(w,d)/2-.8,.75,.02,1,mc(T,pc2[ai2],{op:.6,r:.6}));
    kk3.box(0,2.5,0,.12,.1,Math.min(w,d)/2-.6,steel);kk3.box(0,2.45,Math.min(w,d)/2-.9,1,.08,1.3,mc(T,0x3a3a3a));kk3.box(0,2.53,Math.min(w,d)/2-.9,.8,.04,.9,mc(T,0xf6f4ee,{r:.8}));kk3.box(0,3.2,Math.min(w,d)/2-1.3,.5,.06,.12,steel)}return true}
  case 'm-tunnel':{k.legs(w,d,2.3,.15,steel,.05);k.box(0,2.3,0,w,.12,d,steel);k.box(0,2.42,0,w-.3,.02,d-.2,mc(T,0x2a2a2a,{r:.9}));var sh4=[];for(var ti3=0;ti3<4;ti3++)sh4.push([0,2.46,d/2-.8-ti3*1.2+(ti3>1?-3:0),1.4,.02,1.1]);inst('box',mc(T,0xffffff,{r:.9}),sh4,[0x2b6fd9,0x1a1a1a,0xd92b2b,0xf6f4ee]);
   k.box(0,2.45,0,w,1.4,3.4,mc(T,0x9aa0a6,{m:.4,r:.4}));k.box(0,2.45,1.71,w-.4,.5,.02,mc(T,0x111111,{e:0xff5a10,ei:.8}));k.box(0,2.45,-1.71,w-.4,.5,.02,mc(T,0x111111,{e:0xff5a10,ei:.8}));k.box(w/2+.05,2.6,1,.3,.8,.6,mc(T,0x2a2b2e));k.box(w/2+.21,2.9,1,.01,.25,.4,lit(0xff5533,1.3));k.cyl(0,3.85,-.5,.3,.3,.3,alu,14);return true}
  }}
 /* ---------------- Woodworking, Indoor Garden, Home Theater & Music ---------------- */
 case 'w-tsaw':case 'w-tsawj':case 'w-band':case 'w-router':case 'w-miter':case 'w-jointer':case 'w-planer':case 'w-drill':case 'w-sander':case 'w-dust':case 'w-cnc':case 'w-comp':case 'w-lathe':case 'w-scroll':case 'w-panel':case 'w-cyclone':
 case 'h-rack':case 'h-micro':case 'h-sink':case 'h-soak':case 'h-sproutr':case 'h-drum':case 'h-germ':case 'h-flood':case 'h-tent':case 'h-tower':case 'h-tank':case 'h-ro':case 'h-dehu':case 'h-humid':case 'h-wash':
 case 'ht-row3':case 'ht-riser':case 'ht-screen':case 'ht-sub':case 'ht-speaker':case 'ht-rack':case 'mu-drums':case 'mu-edrums':case 'mu-upright':case 'mu-grand':case 'mu-keys':case 'mu-guitar':case 'mu-desk':case 'mu-booth':case 'mu-dj':case 'mu-karaoke':{
  var iron=mc(T,0x9aa0a6,{m:.55,r:.35}),mg=mc(T,0x3d4a44,{r:.45,m:.2}),mgy=mc(T,0x2d3036,{r:.45,m:.2}),yel2=mc(T,0xe0b31b,{r:.45}),red2=mc(T,0xc8202a,{r:.45}),leaf=mc(T,0x5aa84a,{r:.9}),leaf2=mc(T,0x7ac85a,{r:.9}),
   S=function(x,z,ry,y){var gg=new T.Group();gg.position.set(x,y||0,z);gg.rotation.y=ry||0;g.add(gg);return Kit(T,gg)},
   TB=function(x0,y0,z0,x1,y1,z1,rad,mat){var a=new T.Vector3(x0,y0,z0),b=new T.Vector3(x1,y1,z1),m=new T.Mesh(exGeo(T,'cyl'),mat);m.scale.set(rad*2,a.distanceTo(b),rad*2);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());m.castShadow=true;g.add(m);return m},
   SCR=function(x,y,z,sw,sh,kind){k.box(x,y,z-.02,sw+.06,sh+.06,.04,blk);k.box(x,y+.03,z,sw,sh,.01,scrMat(T,kind||'desktop',1.2))},
   disc=function(x,y,z,rad,th,mat,ax){var m=k.cyl(x,y,z,rad,rad,th,mat,24);if(ax==='x')m.rotation.z=Math.PI/2;if(ax==='z')m.rotation.x=Math.PI/2;m.position.y=y;return m},
   blade=function(x,y,z,rad,ax){return disc(x,y,z,rad,.02,mc(T,0xd8dde2,{m:.8,r:.2}),ax||'x')},
   wheel=function(x,y,z,rad){disc(x,y,z,rad,.06,blk,'z');[0,1,2].forEach(function(i){var a=i*2.09;TB(x,y,z+.04,x+Math.cos(a)*rad*1.6,y+Math.sin(a)*rad*1.6,z+.04,.02,chrome)})},
   standK=function(sw,sd,sh,mat){k.legs(sw,sd,sh,.12,mat||mgy,.05);k.box(0,.5,0,sw-.2,.04,sd-.2,mat||mgy)},
   plants=function(x0,x1,y,z0,z1,step,mat,sz){var a=[];for(var x=x0;x<=x1;x+=step)for(var z=z0;z<=z1;z+=step)a.push([x,y+sz*.4,z,sz,sz*.8,sz]);inst('sph',mat||leaf,a)},
   ledbar=function(x,y,z,lw,ld,hex){k.box(x,y,z,lw,.05,ld,mc(T,0x2a2a2a));k.box(x,y-.01,z,lw-.1,.01,ld-.1,lit(hex||0xf0c8ff,1.8))},
   tray=function(x,y,z,tw,td,hex){k.box(x,y,z,tw,.15,td,mc(T,hex||0x1a1a1a,{r:.6}))},
   keys=function(x,y,z,kw,n){var wk=[],bk=[],kwid=kw/n;for(var i=0;i<n;i++){wk.push([x-kw/2+kwid*(i+.5),y,z,kwid-.01,.06,.5]);if([0,1,3,4,5].indexOf(i%7)>=0&&i<n-1)bk.push([x-kw/2+kwid*(i+1),y+.06,z-.08,kwid*.55,.06,.3])}inst('box',mc(T,0xf6f4ee,{r:.3}),wk);inst('box',mc(T,0x111111,{r:.3}),bk)},
   stand=function(x,z,ht){k.cyl(x,0,z,.3,.3,.04,blk,12);k.cyl(x,0,z,.03,.03,ht,chrome)},
   cymbal=function(x,y,z,rad,tilt){stand(x,z,y);var m=k.cyl(x,y,z,rad,rad*.25,.04,mc(T,0xc9a24a,{m:.8,r:.25}),20);m.rotation.x=tilt||.2;m.position.y=y},
   sLegsH=function(lw,ld,lh){k.legs(lw,ld,lh,.12,ss,.1);k.box(0,.55,0,lw-.2,.04,ld-.2,ss)},
   drum=function(x,y,z,rad,dh,col,tilt){var m=k.cyl(x,y,z,rad,rad,dh,col,20);m.rotation.x=tilt||0;var hd=k.cyl(x,y+dh,z,rad,rad,.01,mc(T,0xf3efe6,{r:.6}),20);hd.rotation.x=tilt||0;return m};
  switch(r){
  /* ---------- Woodworking ---------- */
  case 'w-tsaw':case 'w-tsawj':{var job=r==='w-tsawj',th=job?3:3.1,sz=job?0:d/2-2.4,tw=job?2.2:Math.min(w,4.5),td=job?2:2.6;
   if(job){k.legs(2.2,2,2.1,.1,mgy,.15);[-1,1].forEach(function(s){TB(s*.9,0,-.8,s*.9,2.1,.8,.05,mgy)});k.box(0,2.1,0,1.9,.75,1.7,yel2)}else{k.box(0,0,sz,2.2,th-.2,2.2,mgy);k.box(0,0,sz,2.4,.15,2.4,blk);wheel(0,2.2,sz+1.12,.25);wheel(.8,2.2,sz+1.12,.2);k.box(-.7,2.5,sz+1.12,.35,.25,.08,red2);
    k.box(0,th-.2,-d/2+(d-4.8)/2,w-.6,.12,d-4.8,oak);k.legs(w-.8,d-5,th-.3,.15,mgy,.1);k.box(0,th-.3,-d/2+(d-4.8)/2,.01,.01,.01,blk)}
   var top=k.box(0,th-.12,sz,tw,.12,td,iron);var sl=[];for(var i=0;i<3;i++)sl.push([-.9+i*.15,th+.002,sz,.04,.004,td]);inst('box',mc(T,0x6a6e72,{m:.5}),sl);
   blade(-.1,th+.1,sz-.1,.45);k.box(-.1,th,sz-.7,.03,.5,.5,mc(T,0xd92b2b,{op:.6}));k.box(.9,th,sz,.18,.25,td+.1,iron);k.box(.9,th,sz+td/2+.08,.4,.25,.15,red2);hcyl(0,th-.25,sz+td/2+.05,.05,tw+(job?0:1.5),chrome,'x');
   if(!job){k.box(-tw/2-.8,th-.12,sz,1.6,.12,td,oak);k.box(tw/2+.8,th-.12,sz,1.6,.12,td,oak)}return true}
  case 'w-band':{k.box(0,0,0,w*.7,2.8,d*.6,mg);k.box(0,2.8,0,w*.8,.12,d*.7,iron);k.box(0,3.6,0,1.3,.08,1.3,iron);k.box(-.55,3.7,-.1,.25,h-3.8,.4,mg);k.box(-.2,h-1.1,-.1,1.1,1.1,.45,mg);k.box(-.2,3.6-.9,-.1,1.1,.8,.45,mg);
   k.box(.15,3.7,-.1,.015,h-4.8,.04,mc(T,0xd8dde2,{m:.8}));k.box(.15,h-1.9,-.1,.15,.8,.15,mg);k.box(.15,4.5,-.1,.1,.3,.12,blk);wheel(-.2,4.6,.15,.15);k.box(.4,2.6,.36,.2,.15,.05,lit(0x33cc55,.8));return true}
  case 'w-router':{k.box(0,0,0,w*.85,h-.15,d*.85,mg);drawers(-w*.4,w*.1,.3,h-.3,d*.425+.01,3,mc(T,0x4a5a52,{r:.5}));doors(w*.12,w*.42,.3,h-.3,d*.425+.01,1,mc(T,0x4a5a52,{r:.5}));
   k.box(0,h-.15,0,w,.15,d,mc(T,0xe6e1d0,{r:.4}));k.box(0,h,0,.8,.01,.8,mc(T,0x2a2a2a,{r:.3}));k.cyl(0,h,0,.06,.06,.15,chrome);k.box(0,h,-.35,w*.9,.35,.15,oak);k.box(0,h+.05,-.25,.4,.25,.2,yel2);return true}
  case 'w-miter':{var ch=3;k.box(0,0,0,w,ch-.15,d,oak);for(var di=0;di<Math.floor(w/1.5);di++)drawers(-w/2+di*1.5+.05,-w/2+(di+1)*1.5-.05,.3,ch-.3,d/2+.01,3,mc(T,0xc49a6c,{r:.55}));k.box(0,ch-.15,0,w,.15,d,mc(T,0xd9c49a,{r:.6}));
   k.box(0,ch-.3,0,2,.3,1.5,oak);k.box(0,ch,-d/2+.3,w,.35,.1,oak);var ms=S(0,0,0,ch-.2);ms.cyl(0,0,.1,.8,.8,.18,mgy,20);ms.box(0,.18,-.55,.3,.9,.3,mgy);var arm=ms.box(0,.9,-.3,.35,.3,1.1,mgy);arm.rotation.x=-.3;arm.position.set(0,1.05,-.15);
   ms.cyl(0,.65,.15,.62,.62,.25,mc(T,0xd92b2b,{op:.55}),20).rotation.z=Math.PI/2;ms.box(0,1.25,.35,.12,.3,.25,blk);ms.box(0,.18,-.62,1.9,.25,.08,iron);return true}
  case 'w-jointer':{k.box(0,0,0,w*.7,2.5,d*.45,mg);k.box(0,0,0,w*.85,.12,d*.5,blk);k.box(0,2.5,-d/4,w*.8,.25,d/2-.1,iron);k.box(0,2.5,d/4,w*.8,.25,d/2-.1,iron);k.box(0,2.6,0,w*.8,.1,.3,mgy);
   k.box(-w*.38,2.75,0,.06,.6,d*.6,iron);var pc=k.box(.2,2.78,0,.55,.05,.9,yel2);wheel(0,1.8,d*.23,.2);k.box(.6,2,d*.23,.25,.25,.06,red2);return true}
  case 'w-planer':{standK(w,d,2.6,mg);k.box(0,2.6,0,w-.2,.08,d-.6,iron);k.box(0,2.68,0,w*.85,1,1,mgy);[-1,1].forEach(function(s){k.box(0,2.68,s*(d/2-.25),w*.7,.05,.5,iron)});k.box(0,3.68,0,w*.6,.2,.7,mgy);k.box(w*.25,3.88,0,.08,.2,.08,chrome);hcyl(w*.25,4.0,.15,.04,.35,blk,'z');k.cyl(0,3.88,-.2,.2,.2,.15,mgy,12);k.box(-w*.3,3,.52,.3,.15,.03,lit(0x33cc55,.8));return true}
  case 'w-drill':{k.box(0,0,-.2,w*.7,.15,d*.6,iron);k.cyl(0,.15,-.6,.12,.12,h-1,chrome);k.box(0,2.8,-.25,.25,.3,.7,iron);k.cyl(0,2.9,.05,.5,.5,.1,iron,18);k.box(0,h-1.6,-.4,.9,.9,1.1,mg);k.box(0,h-.65,-.5,1.3,.45,.9,mg);hcyl(0,h-.95,-1.1,.35,.6,mgy,'z');
   k.cyl(0,h-2.2,0,.08,.08,.6,chrome);k.cyl(0,h-2.35,0,.06,.03,.15,blk);[0,1,2].forEach(function(i){var a=i*2.09;TB(.5,h-1.2,-.1,.5+Math.cos(a)*.6,h-1.2+Math.sin(a)*.6,-.1,.025,chrome)});return true}
  case 'w-sander':{k.box(0,0,0,w*.8,2.7,d*.8,mg);k.box(0,2.7,0,w,.1,d,iron);k.cyl(0,2.8,.2,.12,.12,.6,mc(T,0xb08a5a,{r:.9}),12);k.box(0,2.8,-.55,w*.9,.45,.25,mgy);k.box(0,2.85,-.42,w*.85,.35,.02,mc(T,0x8a6a4a,{r:.95}));k.box(w*.3,2,d*.4+.01,.2,.15,.05,red2);return true}
  case 'w-dust':{k.box(0,0,0,w,.15,d,mgy);k.box(0,.15,-d/2+.4,.2,h-.2,.2,mgy);k.cyl(0,3.8,-d/2+.5,.55,.55,.6,mgy,18).rotation.x=Math.PI/2;k.box(0,4.2,-d/2+.2,.5,.5,.5,mg);disc(0,3.8,-d/2+1,.5,.25,mgy,'z');
   [-1,1].forEach(function(s){k.cyl(s*.8,4.1,.6,.75,.75,h-4.2,mc(T,0xf3efe6,{r:.95}),16);k.cyl(s*.8,.15,.6,.75,.7,2.6,mc(T,0xe8eef0,{op:.45,r:.2}),16);k.box(s*.8,2.75,.6,1.6,.2,1.6,iron)});k.cyl(0,3.4,.6,.15,.15,.6,mc(T,0x2a2a2a));TB(0,3.8,-d/2+1.2,0,3.8,d/2,.2,mc(T,0xcfd3d6,{op:.7}));return true}
  case 'w-cnc':{k.legs(w,d,2.6,.25,mgy,.1);k.box(0,2.6,0,w,.25,d,mgy);k.box(0,2.85,0,w-.4,.08,d-.4,mc(T,0xc8a878,{r:.85}));var lines2=[];for(var gx=0;gx<12;gx++)lines2.push([-w/2+.4+gx*(w-.8)/11,2.935,0,.01,.002,d-.5]);inst('box',mc(T,0xa8885a),lines2);
   [-1,1].forEach(function(s){k.box(s*(w/2-.1),2.85,0,.15,.12,d,iron)});var gz=-.5;[-1,1].forEach(function(s){k.box(s*(w/2-.1),2.9,gz,.3,1.1,.5,mgy)});k.box(0,3.9,gz,w,.35,.4,mgy);k.box(.4,3.3,gz+.3,.45,.9,.25,iron);k.cyl(.4,3.05,gz+.42,.12,.12,.45,mc(T,0xd9d9d9,{m:.5}));k.cyl(.4,2.95,gz+.42,.02,.01,.12,chrome);
   k.box(0,4.25,gz,w*.8,.12,.25,blk);k.box(w/2+.05,0,d/2-.8,.6,4,.6,mc(T,0x2a2b2e));SCR(w/2+.05,3.2,d/2-.49,.5,.4,'desktop');return true}
  case 'w-comp':{k.box(0,0,0,w*.9,.1,d*.9,mgy);k.cyl(0,.1,0,w*.38,w*.38,h-1.1,red2,20);sph(0,h-1,0,w*.38,red2);k.box(0,h-.7,0,w*.6,.35,d*.5,mgy);k.cyl(-.3,h-.35,0,.22,.22,.3,mgy,12);k.cyl(.35,h-.35,0,.3,.3,.15,mgy,16);hcyl(w*.38,1.8,0,.15,.06,white,'x');TB(.5,1.2,.4,.5,h-.7,.4,.05,chrome);return true}
  case 'w-lathe':{var bh=2.8;k.box(-w/2+.8,0,0,1.2,bh,d*.8,mgy);k.box(w/2-.8,0,0,1.2,bh,d*.8,mgy);k.box(0,bh,0,w-.6,.2,.5,iron);k.box(-w/2+.9,bh+.2,0,1.2,.9,.8,mg);k.box(w/2-1,bh+.2,0,.7,.55,.5,mg);
   hcyl(-.2,bh+.75,0,.35,w-3.4,mc(T,0xd9b27a,{r:.8}),'x');k.box(0,bh+.2,.35,.4,.35,.25,iron);k.box(0,bh+.55,.15,.6,.08,.08,iron);k.box(-w/2+.9,bh+.5,.42,.25,.2,.05,lit(0x33cc55,.9));k.box(0,.6,0,w-2.2,.05,d*.6,mgy);return true}
  case 'w-scroll':{standK(w*.7,d*.8,2.6,mgy);k.box(0,2.6,0,w*.8,.25,d*.6,mg);k.box(0,2.85,0,w*.7,.06,d*.55,iron);k.box(-w*.35,2.9,0,.2,.9,.2,mg);k.box(0,3.8,0,w*.75,.18,.18,mg);k.box(w*.35-.1,3.3,0,.08,.5,.08,iron);k.box(w*.35-.1,2.9,0,.01,.4,.01,mc(T,0xd8dde2,{m:.8}));k.box(-w*.35,3.4,.12,.1,.1,.05,red2);return true}
  case 'w-panel':{var fr=S(0,-d/2+.6,0);var tilt=-.12;[-1,1].forEach(function(s){var p=fr.box(s*(w/2-.15),0,0,.2,h,.2,mgy);p.rotation.x=tilt});var tb=fr.box(0,h-.3,-.4,w,.2,.2,mgy);fr.box(0,.4,0,w,.2,.2,mgy);fr.box(0,.6,.35,w,.08,.25,iron);
   var sheet=fr.box(-.5,.7,.25,8,4,.06,mc(T,0xd9c49a,{r:.8}));sheet.rotation.x=tilt;[-.2,.2].forEach(function(o){var tt=fr.box(.8+o,.6,-.1,.08,h-.9,.08,chrome);tt.rotation.x=tilt});var car=fr.box(1,3.2,.1,.8,.8,.35,yel2);car.rotation.x=tilt;var bb=fr.cyl(1,3.4,.4,.35,.35,.03,mc(T,0xd8dde2,{m:.8}),20);bb.rotation.x=Math.PI/2+tilt;bb.position.set(1,3.6,.35);return true}
  case 'w-cyclone':{k.box(0,0,0,w*.9,.12,d*.9,mgy);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){k.box(q[0]*(w/2-.15),0,q[1]*(d/2-.15),.15,h-1.5,.15,mgy)});var cx=-.4;k.cyl(cx,h-3.6,0,1.1,1.1,1.8,mgy,20);k.cyl(cx,h-6.4,0,.3,1.1,2.8,mgy,20);k.cyl(cx,h-1.8,0,.9,.9,1,mg,20);k.cyl(cx,h-.8,0,.35,.35,.8,mg,14);
   k.cyl(cx,.12,0,.9,.9,2.4,mc(T,0x3a3d44),18);k.cyl(cx,2.52,0,.4,.25,.9,mc(T,0xe8eef0,{op:.5}),12);[-1,1].forEach(function(s){k.cyl(1.1,1,s*.8,.45,.45,h-4,mc(T,0xf3efe6,{r:.9}),14)});TB(cx+1.1,h-2.8,0,cx+2.4,h-.2,0,.25,mc(T,0xcfd3d6,{m:.4}));return true}
  /* ---------- Indoor Garden ---------- */
  case 'h-rack':case 'h-micro':case 'h-sproutr':{var post=mc(T,0xe6e6e2,{m:.3,r:.5});[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){k.box(q[0]*(w/2-.06),0,q[1]*(d/2-.06),.12,h,.12,post)});var nt=Math.max(3,Math.round(h/1.6)),tg=(h-.6)/nt;
   for(var t=0;t<nt;t++){var y=.3+t*tg;k.box(0,y,0,w,.06,d,post);tray(0,y+.06,0,w-.2,d-.2,r==='h-rack'?0x1a1a1a:0x2a2a2a);if(r==='h-rack'){var a=[];for(var px=-w/2+.35;px<w/2-.2;px+=.5)for(var pz=-d/2+.35;pz<d/2-.2;pz+=.5)a.push([px,y+.21+.18,pz,.36,.36,.36]);inst('sph',t%2?leaf:leaf2,a)}
    else{k.box(0,y+.21,0,w-.3,.06+(t%2)*.04,d-.3,t%3===2?mc(T,0xe8e0b0,{r:.9}):leaf2)}ledbar(0,y+tg-.08,0,w-.3,.5,r==='h-rack'?0xf0b8ff:0xffffff);if(r==='h-sproutr')hcyl(0,y+tg-.25,-d/2+.2,.03,w-.2,mc(T,0x2b6fd9),'x')}
   if(r==='h-rack'){k.box(0,0,0,w-.4,.28,d-.4,mc(T,0x1d1d20))}return true}
  case 'h-sink':{k.legs(w,d,2.2,.1,mc(T,0xe8e8e4),.05);k.box(0,2.2,0,w,.8,d,mc(T,0xe8e8e4,{r:.4}));k.box(0,2.35,0,w-.25,.66,d-.25,mc(T,0x9aa0a6,{r:.4}));k.box(0,3,-d/2+.08,w,.15,.16,mc(T,0xe8e8e4));k.cyl(0,3,-d/2+.1,.04,.04,.9,chrome);hcyl(0,3.9,-d/2+.3,.035,.4,chrome,'z');return true}
  case 'h-soak':case 'h-wash':{var wash=r==='h-wash';sLegsH(w,d,2.85);k.box(0,2.85,0,w,.08,d,ss);k.box(0,2.93,-d/2+.05,w,.4,.1,ss);
   if(wash){[-1.5,0].forEach(function(o,i){k.box(o,2.15,0,1.8,.7,d-.4,ss);k.box(o,2.85,0,1.6,.02,d-.6,mc(T,0x6aaacc,{op:.7,r:.05}));k.cyl(o,2.93,-d/2+.15,.04,.04,1,chrome);hcyl(o,3.9,-d/2+.35,.035,.4,chrome,'z')});k.cyl(w/2-1,2.93,0,.6,.6,1.1,mc(T,0xd8dde2,{m:.5}),18);
    var cr=[];for(var ci=0;ci<4;ci++)cr.push([-w/2+.7+(ci%2)*1.1,2.93+.35+Math.floor(ci/2)*.7,0,1,.65,1.4]);inst('box',mc(T,0xffffff,{r:.6}),cr,[0x2b6fd9,0x6aa84f,0xff8a1a,0x2b6fd9]);k.box(1.2,2.93,0,.8,.12,.8,blk);k.box(1.2,3.05,.35,.3,.12,.01,lit(0x33ff77,1.3))}
   else{var b=[],jr=[];for(var bi=0;bi<4;bi++)b.push([-w/2+.6+bi*.7,2.93+.45,0,.55,.9,.55]);inst('cyl',mc(T,0xf3efe6,{op:.7,r:.2}),b);for(var ji=0;ji<5;ji++)jr.push([w/2-1.8+ji*.35,2.93+.3,-.3,.28,.6,.28]);inst('cyl',mc(T,0xdfeeff,{op:.5}),jr);k.box(w/2-1.2,2.93,.4,1.8,.1,.9,mc(T,0x1a1a1a));plants(w/2-1.9,w/2-.5,3.03,.1,.7,.25,mc(T,0xe8e0b0,{r:.9}),.12)}return true}
  case 'h-drum':{k.box(0,0,0,w,.15,d,mgy);[-1,1].forEach(function(s){k.box(s*(w/2-.2),0,0,.2,3,.25,iron)});disc(0,3,0,1.25,w-.6,mc(T,0xd8dde2,{m:.5,r:.3}),'x');[-1,1].forEach(function(s){disc(s*(w/2-.35),3,0,1.3,.06,iron,'x')});
   k.box(-w/2+.2,0,d/2-.6,.6,.8,.6,mgy);k.box(-w/2+.2,.8,d/2-.6,.5,.5,.5,mg);k.box(0,3,1.25,1,.6,.02,mc(T,0xdfeeff,{op:.4}));k.box(w/2-.3,1.5,d/2-.3,.4,.6,.3,mgy);k.box(w/2-.3,1.8,d/2-.14,.25,.15,.01,lit(0x38d0ff,1.4));return true}
  case 'h-germ':{var gw=mc(T,0xeeeeec,{r:.45});k.box(0,0,0,w,.3,d,gw);k.box(0,h-.5,0,w,.5,d,gw);[-1,1].forEach(function(q){k.box(q*(w/2-.05),.3,0,.1,h-.8,d,gw)});k.box(0,.3,-d/2+.05,w,h-.8,.1,mc(T,0x111111,{e:0xffe8c8,ei:.45}));var tr=[];for(var y2=.6;y2<h-.6;y2+=.6)tr.push([0,y2,0,w-.4,.08,d-.6]);inst('box',mc(T,0x1a1a1a),tr);plants(-w/2+.4,w/2-.4,.68,-d/2+.6,d/2-.6,.5,mc(T,0xd8e8a0,{r:.9}),.1);
   var gd=new T.Mesh(new T.BoxGeometry(w-.1,h-.6,.04),mc(T,0x9fc0d8,{op:.25,r:.03}));gd.position.set(0,.3+(h-.6)/2,d/2+.01);g.add(gd);handle(w/2-.2,h*.5,d/2+.05,1,true);k.box(0,h-.4,d/2+.01,.5,.15,.01,lit(0x33ff77,1.3));return true}
  case 'h-flood':{k.legs(w,d,2.2,.15,mc(T,0xd9d6ce,{m:.3}),.2);k.box(0,2.2,0,w,.35,d,mc(T,0x2f3a33));k.box(0,2.55,0,w-.3,.02,d-.3,mc(T,0x3a2a1a,{r:.95}));var pl=[];for(var px2=-w/2+.4;px2<w/2-.2;px2+=.55)for(var pz2=-d/2+.4;pz2<d/2-.2;pz2+=.55)pl.push([px2,2.85,pz2,.5,.55,.5]);inst('sph',leaf,pl);
   k.box(0,.0,0,w*.6,.9,d*.6,mc(T,0x1d1d20));k.box(w*.25,.9,0,.4,.25,.4,mc(T,0x2b2b2b));TB(w*.25,1.15,0,w*.25,2.3,.2,.04,mc(T,0x1a1a1a));return true}
  case 'h-tent':{var fab=mc(T,0x1d1d20,{r:.95});k.box(0,0,-d/2+.03,w,h,.06,fab);[-1,1].forEach(function(s){k.box(s*(w/2-.03),0,0,.06,h,d,fab)});k.box(0,h-.06,0,w,.06,d,fab);k.box(0,0,0,w-.1,.05,d-.1,mc(T,0xd8dde2,{m:.6,r:.3}));
   k.box(-w/4,0,d/2-.03,w/2,h,.06,fab);var flap=k.box(w/4,h*.55,d/2+.2,w/2,h*.45,.05,fab);flap.rotation.x=-.5;k.box(w/4,0,d/2-.03,w/2,h*.4,.06,fab);[-1,1].forEach(function(s){k.box(s*(w/2-.07),0,0,.01,h-.1,d-.1,mc(T,0xd8dde2,{m:.7,r:.2}))});
   var pts=[];[[-.8,-.8],[.8,-.8],[-.8,.8],[.8,.8]].forEach(function(p){k.cyl(p[0],0,p[1],.35,.3,.7,mc(T,0x2a2a2a),12);pts.push([p[0],1.1,p[1],.9,.9,.9])});inst('sph',leaf,pts);k.box(0,h-.5,0,w*.6,.12,w*.5,lit(0xff7ad0,1.8));k.cyl(w/3,h,-d/3,.35,.35,.4,mc(T,0x2a2a2a),14);return true}
  case 'h-tower':{k.cyl(0,0,0,w*.45,w*.45,1.4,mc(T,0x2a2a2a),18);k.cyl(0,1.4,0,w*.25,w*.25,h-1.4,mc(T,0xeeeeea,{r:.4}),16);var cups=[],lv=[];for(var t2=0;t2<20;t2++){var a2=t2*1.37,yy=1.7+(t2%10)*(h-2.2)/10;cups.push([Math.cos(a2)*w*.28,yy,Math.sin(a2)*w*.28,.22,.18,.22]);lv.push([Math.cos(a2)*w*.36,yy+.2,Math.sin(a2)*w*.36,.42,.36,.42])}
   inst('cyl',mc(T,0x1a1a1a),cups);inst('sph',leaf2,lv);return true}
  case 'h-tank':{k.cyl(0,0,0,Math.min(w,d)*.42,Math.min(w,d)*.4,h-.6,mc(T,0x2b5fa8,{r:.5}),24);k.cyl(0,h-.6,0,Math.min(w,d)*.43,Math.min(w,d)*.43,.1,mc(T,0x1d1d20),24);k.box(0,h-.5,0,.5,.45,.4,mgy);k.cyl(0,h-.5,0,.05,.05,.4,chrome);
   k.box(w/2-.3,0,d/2-.3,.5,.4,.4,mc(T,0x1d1d20));TB(w/2-.3,.4,d/2-.3,.3,h-.6,.3,.04,mc(T,0x1a1a1a));k.cyl(-w/2+.4,0,d/2-.4,.15,.15,.4,mc(T,0xdfeeff,{op:.6}));return true}
  case 'h-ro':{k.box(0,1,-d/2+.1,w,2.5,.1,mc(T,0xe8e8e4));var cans=[];[-1,-.4,.2].forEach(function(x){cans.push([x,2.3,-d/2+.4,.4,1.1,.4])});inst('cyl',mc(T,0xffffff,{op:.75,r:.2}),cans,[0xdfeeff,0x8ab8e8,0xdfeeff]);inst('cyl',mc(T,0x2b6fd9),cans.map(function(c){return [c[0],c[1]+.6,c[2],.45,.15,.45]}));
   hcyl(.3,3.1,-d/2+.4,.18,1.3,mc(T,0xeeeeea),'x');k.cyl(w/2-.45,0,0,.4,.4,1.6,mc(T,0x2b5fa8,{r:.5}),16);sph(w/2-.45,1.6,0,.4,mc(T,0x2b5fa8,{r:.5}));TB(.9,2.3,-d/2+.4,w/2-.45,1.8,0,.03,mc(T,0x2b6fd9));return true}
  case 'h-dehu':case 'h-humid':{if(r==='h-dehu'){k.box(0,.2,0,w,h-.2,d,mc(T,0x2a6a9a,{r:.45}));inst('cyl',rub,[[-w/2+.2,.1,-d/2+.2,.2,.2,.2],[w/2-.2,.1,-d/2+.2,.2,.2,.2],[-w/2+.2,.1,d/2-.2,.2,.2,.2],[w/2-.2,.1,d/2-.2,.2,.2,.2]]);var lv2=[];for(var l=0;l<8;l++)lv2.push([0,.5+l*.15,d/2+.01,w*.8,.04,.02]);inst('box',blk,lv2);
    k.box(0,h-.5,d/2+.01,w*.5,.2,.01,lit(0x38d0ff,1.3));hcyl(0,h+.15,-d/2+.3,.04,w*.7,blk,'x');[-1,1].forEach(function(s){k.box(s*w*.35,h,-d/2+.3,.05,.15,.05,blk)});return true}
   k.cyl(0,0,0,w*.42,w*.45,h-.6,white,20);k.cyl(0,h-.6,0,w*.3,w*.42,.3,white,20);k.box(0,h*.5,w*.42,.35,.12,.05,lit(0x38d0ff,1.3));var mist=new T.Mesh(exGeo(T,'sph'),mc(T,0xffffff,{op:.25,r:1}));mist.scale.set(.8,1.4,.8);mist.position.set(0,h+.3,0);g.add(mist);return true}
  /* ---------- Home Theater & Music ---------- */
  case 'ht-row3':{var ns=Math.max(1,Math.round(w/3)),sw=w/ns,lea=mc(T,0x1a1a1c,{r:.55});for(var si=0;si<ns;si++){var sx=-w/2+sw*(si+.5);k.box(sx,.4,0,sw-.6,.6,d-.6,lea);k.box(sx,.4,-d/2+.45,sw-.6,h-.4,.6,lea);k.box(sx,1.05,.25,sw-.8,.25,d-1.1,mc(T,0x2a2a2e,{r:.55}));k.box(sx,2.5,-d/2+.6,sw-1,.6,.25,mc(T,0x2a2a2e,{r:.55}));k.box(sx,.25,d/2-.35,sw-.7,.35,.5,lea)}
   for(var ai=0;ai<=ns;ai++){var ax=-w/2+ai*sw;k.box(ax+(ai===0?.25:ai===ns?-.25:0),0,0,.5,1.9,d-.4,lea);k.cyl(ax+(ai===0?.25:ai===ns?-.25:0),1.85,d/2-.6,.12,.12,.08,mc(T,0x111111,{e:0x38d0ff,ei:.8}),12)}k.box(0,0,0,w,.4,d-.6,blk);return true}
  case 'ht-riser':{k.box(0,0,0,w,h,d,mc(T,0x5a1a24,{r:.95}));k.box(0,h-.02,d/2-.02,w,.04,.04,lit(0xffc27a,1.6));var st=S(w/2-1.5,d/2+.0,0);st.box(0,0,-.5,2.4,h/2,1,mc(T,0x5a1a24,{r:.95}));return true}
  case 'ht-screen':{var sw2=w*.95,sh2=Math.min(h-1.6,sw2*.5);k.box(0,h-sh2-.8,-d/2+.1,sw2+.5,sh2+.5,.12,mc(T,0x0a0a0a,{r:.95}));k.box(0,h-sh2-.55,-d/2+.17,sw2,sh2,.01,scrMat(T,'movie',1.25));k.box(0,0,0,w,.9,d,mc(T,0x1a1a1c,{r:.9}));
   [-1,0,1].forEach(function(s){k.box(s*w*.33,.9,-d/2+.4,s?.8:1.6,s?2.2:.7,.6,blk);[.5,1.3].forEach(function(y,i){if(!s&&i)return;k.cyl(s*w*.33+(s?0:-.4),.9+y,-d/2+.71,.22,.22,.02,mc(T,0x3a3d44,{r:.6})).rotation.x=Math.PI/2})});return true}
  case 'ht-sub':{k.box(0,.08,0,w,h-.08,d,blk);var cone=k.cyl(0,h/2,d/2+.01,w*.36,w*.36,.03,mc(T,0x2a2a2e,{r:.5}),24);cone.rotation.x=Math.PI/2;cone.position.y=h/2;k.cyl(0,h/2,d/2+.03,.15,.15,.03,mc(T,0x111111)).rotation.x=Math.PI/2;inst('cyl',chrome,[[-w/2+.2,.04,-d/2+.2,.1,.08,.1],[w/2-.2,.04,-d/2+.2,.1,.08,.1],[-w/2+.2,.04,d/2-.2,.1,.08,.1],[w/2-.2,.04,d/2-.2,.1,.08,.1]]);return true}
  case 'ht-speaker':{k.box(0,.1,0,w*.8,h-.1,d*.85,mc(T,0x2a1a10,{r:.4}));k.box(0,0,0,w,.1,d,blk);var dr=[];[[.55,.38],[1.25,.38],[1.95,.38],[2.7,.22],[3.2,.12]].forEach(function(p){if(p[0]<h-.2)dr.push([0,p[0],d*.425+.01,p[1]*2,.03,p[1]*2,Math.PI/2])});inst('cyl',mc(T,0x1a1a1c,{r:.5}),dr);return true}
  case 'ht-rack':{k.box(0,0,0,w,h,d,mc(T,0x2a1a10,{r:.5}));var comps=[[.4,0x1a1a1a,'r'],[.3,0x2a2a2a],[.5,0x111111,'a'],[.25,0x1a1a1a]],yy=.3;comps.forEach(function(cp){k.box(0,yy,.05,w-.3,cp[0]-.05,d-.3,mc(T,cp[1],{r:.4,m:.3}));if(cp[2]==='r'){k.box(0,yy+.15,d/2-.14,.6,.1,.01,lit(0x38d0ff,1.4));disc(.6,yy+.17,d/2-.13,.1,.04,chrome,'z')}if(cp[2]==='a')k.box(.5,yy+.2,d/2-.14,.08,.08,.01,lit(0x33ff77,1.6));yy+=cp[0]+.25});
   var gd2=new T.Mesh(new T.BoxGeometry(w-.1,h-.3,.03),mc(T,0x8fb0c8,{op:.18,r:.05}));gd2.position.set(0,h/2,d/2+.01);g.add(gd2);return true}
  case 'mu-drums':case 'mu-edrums':{var el=r==='mu-edrums',shell=mc(T,el?0x1a1a1a:0x8a1a24,{r:.25,m:.1});k.box(0,0,0,w,.02,d,mc(T,0x3a3040,{r:1}));
   if(!el){var kd=hcyl(0,.85,-.2,.85,1.2,shell,'z');k.cyl(0,.85,.42,.85,.85,.01,mc(T,0xf3efe6,{r:.6}),20).rotation.x=Math.PI/2;drum(-1,2.2,.6,.45,.45,shell);drum(-.45,2.7,-.2,.4,.55,shell,.3);drum(.45,2.7,-.2,.45,.6,shell,.3);drum(1.2,1.3,.5,.6,.9,shell);stand(-1,.6,2.2);
    [-1.7,1.7,-.9,1].forEach(function(x,i){cymbal(x,[3.6,3.8,3.9,4.1][i],i<2?.1:-.6,[.65,.75,.7,.9][i])});k.cyl(-1.75,2.9,.7,.5,.5,.03,mc(T,0xc9a24a,{m:.8,r:.25}),20);stand(-1.75,.7,2.9);k.cyl(-1.75,2.95,.7,.5,.5,.03,mc(T,0xc9a24a,{m:.8,r:.25}),20)}
   else{var rk=[];[[-1.6,-1.6],[1.6,-1.6],[-1.6,0],[1.6,0]].forEach(function(p){rk.push([p[0],1.5,p[1]-.3,.12,3,.12])});rk.push([0,2.6,-1.9,3.3,.12,.12],[-1.6,2.4,-.95,.12,.12,1.4],[1.6,2.4,-.95,.12,.12,1.4]);inst('box',chrome,rk);
    var pd=[[-.9,2.3,.4,.5],[-.4,2.8,-.3,.4],[.4,2.8,-.3,.4],[1.2,2.1,.2,.5]];pd.forEach(function(p){var m=k.cyl(p[0],p[1],p[2],p[3],p[3],.15,mc(T,0x2a2a2e,{r:.9}),18);m.rotation.x=.25;m.position.y=p[1]});[-1.5,1.5,-.9,1].forEach(function(x,i){cymbal(x,[3.4,3.6,3.7,3.8][i],i<2?.0:-.8,.55)});k.box(0,0,-.1,.9,1.4,.4,blk);SCR(-1.1,3,-1.6,.6,.35,'desktop')}
   k.cyl(0,0,1.5,.3,.3,.04,blk,12);k.cyl(0,0,1.5,.05,.05,1.6,chrome);k.cyl(0,1.6,1.5,.55,.5,.25,mc(T,0x1a1a1a,{r:.7}),18);return true}
  case 'mu-upright':{var cs=mc(T,0x1a1414,{r:.15,m:.05});k.box(0,0,-d/2+.6,w,h,1.2,cs);k.box(0,2.15,.05,w,.25,.65,cs);keys(0,2.4,.1,w-.6,52);k.box(0,2.4,-.25,w,.6,.2,cs);[-1,1].forEach(function(s){k.box(s*(w/2-.1),0,.2,.2,2.4,.3,cs)});k.box(0,3.1,-.12,1.4,.6,.05,cs);
   inst('box',chrome,[[-.25,.2,-d/2+1.22,.08,.04,.2],[0,.2,-d/2+1.22,.08,.04,.2],[.25,.2,-d/2+1.22,.08,.04,.2]]);var bn=S(0,d/2+.8,0);bn.legs(2.6,1.1,1.6,.12,cs,.05);bn.box(0,1.6,0,2.6,.2,1.1,cs);return true}
  case 'mu-grand':{var gp=mc(T,0x111111,{r:.12,m:.05,side:T.DoubleSide}),sh=new T.Shape(),gw=w-.2,gl=d-1.2;sh.moveTo(-gw/2,0);sh.lineTo(gw/2,0);sh.lineTo(gw/2,gl*.35);sh.bezierCurveTo(gw/2,gl*.7,gw*.05,gl*.6,-gw*.05,gl);sh.lineTo(-gw/2,gl);sh.lineTo(-gw/2,0);
   var bod=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:1.1,bevelEnabled:false}),gp);bod.rotation.x=Math.PI/2;bod.position.set(0,3.2,d/2-1.6);bod.scale.set(1,-1,1);g.add(bod);var lid=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:false}),gp);lid.rotation.x=Math.PI/2+.6;lid.rotation.order='XYZ';lid.position.set(0,3.25,d/2-1.6);lid.scale.set(1,-1,1);
   var lg=new T.Group();lg.add(lid);g.add(lg);[[-gw/2+.3,d/2-1.8],[gw/2-.3,d/2-1.8],[-gw*.1,d/2-1.6-gl+.4]].forEach(function(p){k.box(p[0],0,p[1],.25,2.1,.25,gp)});k.box(0,2.1,d/2-1.45,gw,.3,.55,gp);keys(0,2.4,d/2-1.3,gw-.5,52);
   var bn2=S(0,d/2-.3,0);bn2.legs(2.4,1,1.6,.12,gp,.05);bn2.box(0,1.6,0,2.4,.2,1,gp);return true}
  case 'mu-keys':{[-1,1].forEach(function(s){TB(-w*.3,0,s*.4,w*.3,2.6,-s*.4,.05,blk);TB(w*.3,0,s*.4,-w*.3,2.6,-s*.4,.05,blk)});k.box(0,2.6,0,w-.4,.25,1.1,mc(T,0x2a2a2e,{r:.4}));keys(0,2.85,.15,w-1.2,49);k.box(-w/2+.6,2.85,-.3,.8,.06,.3,blk);TB(0,2.7,-.5,0,3.5,-.5,.04,blk);k.box(0,3.5,-.55,w-.6,.2,.8,mc(T,0x3a3a3e,{r:.4}));keys(0,3.7,-.45,w-1.4,37);
   [-1,1].forEach(function(s){k.box(s*(w/2-.3),3.7,-.6,.5,.75,.55,blk);k.cyl(s*(w/2-.3),3.95,-.32,.15,.15,.02,mc(T,0xd9a441)).rotation.x=Math.PI/2});return true}
  case 'mu-guitar':{k.box(-w/2+.9,0,-.4,1.6,1.4,1,blk);k.box(-w/2+.9,1.4,-.4,1.6,.7,.9,blk);k.box(-w/2+.9,1.6,.06,1.3,.2,.01,mc(T,0xc9a24a,{m:.6}));var gr=[];for(var gi=0;gi<6;gi++)gr.push([-w/2+.5+gi*.15,.7,.11,.04,1.1,.01]);inst('box',mc(T,0x3a3a3a),gr);
   k.box(.2,0,-.4,1.4,1.5,.9,mc(T,0x2a1a10,{r:.5}));k.box(.2,.4,.06,1.1,.9,.01,mc(T,0x8a7a5a,{r:.95}));k.box(.2,1.3,.06,1.2,.12,.01,mc(T,0xc9a24a,{m:.6}));
   [[w/2-1.2,0xd92b2b],[w/2-.5,0x1a1a1a]].forEach(function(gt,i){var gs=S(gt[0],.5,i?.2:-.2);gs.box(0,0,0,.6,.06,.6,blk);gs.box(0,0,.2,.08,.9,.08,blk);var bd=gs.cyl(0,1.2,0,.55,.6,.18,mc(T,gt[1],{r:.2}),18);bd.rotation.x=Math.PI/2+.15;bd.position.set(0,1.25,.05);bd.scale.set(1,1,1.4);gs.box(0,1.7,-.05,.12,1.6,.08,mc(T,0x8a5a2a,{r:.4}));gs.box(0,3.3,-.06,.18,.35,.06,blk)});
   k.box(0,0,d/2-.4,1.6,.12,.6,blk);inst('box',mc(T,0xffffff,{r:.4}),[[-.55,.18,d/2-.4,.25,.1,.35],[-.2,.18,d/2-.4,.25,.1,.35],[.15,.18,d/2-.4,.25,.1,.35],[.5,.18,d/2-.4,.25,.1,.35]],[0xe2442a,0x2b6fd9,0xf0c53a,0x6aa84f]);return true}
  case 'mu-desk':{var dk=mc(T,0x2a2a2e,{r:.5});k.legs(w,d,2.4,.15,dk,.1);k.box(0,2.4,0,w,.12,d,walnut);var mx=k.box(0,2.52,.2,w*.6,.3,1.6,dk);mx.rotation.x=-.12;var fd=[];for(var fi=0;fi<16;fi++)fd.push([-w*.27+fi*w*.54/15,2.85,.4,.05,.05,.25]);inst('box',mc(T,0xe8e8e8),fd);var kn=[];for(var ki=0;ki<16;ki++)for(var kj=0;kj<3;kj++)kn.push([-w*.27+ki*w*.54/15,2.8,-.25+kj*.18,.06,.05,.06]);inst('cyl',mc(T,0x111111),kn);
   k.box(0,2.52,-d/2+.4,w*.9,.35,.6,dk);[-.9,.9].forEach(function(x){SCR(x,3,-d/2+.6,1.6,.95,'desktop')});[-1,1].forEach(function(s){k.box(s*(w/2-.4),2.87,-d/2+.4,.55,.8,.6,blk);[.25,.6].forEach(function(y,i){k.cyl(s*(w/2-.4),2.87+y,-d/2+.71,i?.08:.18,i?.08:.18,.02,mc(T,0xd9a441,{r:.4})).rotation.x=Math.PI/2})});
   var ch2=S(0,d/2+.9,Math.PI);ch2.cyl(0,0,0,.8,.8,.06,blk,5);ch2.cyl(0,0,0,.08,.08,1.5,chrome);ch2.box(0,1.5,0,1.4,.25,1.4,blk);ch2.box(0,1.75,-.65,1.4,1.6,.2,blk);return true}
  case 'mu-booth':{var pn=mc(T,0x4a4d52,{r:.9});k.box(0,0,0,w,h,d,pn);var seam=[];for(var sx2=-w/2+2;sx2<w/2;sx2+=2)seam.push([sx2,h/2,d/2+.005,.04,h,.01]);for(var sz2=-d/2+2;sz2<d/2;sz2+=2)seam.push([w/2+.005,h/2,sz2,.01,h,.04]);inst('box',mc(T,0x2a2b2e),seam);
   k.box(-w/4,0,d/2+.03,2.6,6.7,.1,mc(T,0x3a3d44,{r:.6}));k.box(-w/4,3.5,d/2+.09,1.2,1.2,.02,mc(T,0x1a1a1a,{op:.6,r:.05}));k.box(-w/4,3.5,d/2+.08,1.15,1.15,.01,mc(T,0x111111,{e:0xffe0b0,ei:.5}));handle(-w/4+1,3.2,d/2+.12,.8,true);
   k.box(w/4,h-.5,d/2+.02,.9,.25,.02,mc(T,0x111111,{e:0xff2a2a,ei:1.5}));k.box(0,h,0,1,.25,1,mgy);return true}
  case 'mu-dj':{k.box(0,0,0,w,h-.3,d,blk);k.box(0,.3,d/2+.01,w-.3,h-.8,.02,mc(T,0x111111,{e:0x7a3aff,ei:1.1}));var lst=[];for(var li=0;li<6;li++)lst.push([-w/2+.5+li*(w-1)/5,.25+(h-.8)/2,d/2+.025,.08,h-.8,.01]);inst('box',mc(T,0x111111,{e:0x38d0ff,ei:1.6}),lst);k.box(0,h-.3,0,w+.1,.08,d+.1,walnut);
   [-1,1].forEach(function(s){var tx=s*1.6;k.box(tx,h-.22,0,1.5,.2,1.2,mc(T,0x2a2a2e,{r:.4}));disc(tx-.12,h-.02,0,.5,.03,mc(T,0x1a1a1a,{r:.3}),null);k.cyl(tx-.12,h,0,.15,.15,.01,mc(T,0xe2442a),12);var ta=k.box(tx+.45,h,-.2,.03,.03,.7,chrome);ta.rotation.y=.4});
   k.box(0,h-.22,0,1,.25,1.1,mc(T,0x1a1a1a,{r:.4}));var fds=[];for(var fx=0;fx<4;fx++)fds.push([-.3+fx*.2,h+.04,.2,.04,.04,.3]);inst('box',mc(T,0xe8e8e8),fds);k.box(0,h-.22,-d/2+.3,.7,.6,.4,blk);k.box(0,h+.2,-d/2+.42,.8,.5,.02,scrMat(T,'desktop',1));return true}
  case 'mu-karaoke':{[-1,1].forEach(function(s){var px=s*(w/2-.4);k.cyl(px,0,0,.5,.5,.06,blk,3);k.cyl(px,0,0,.05,.05,3.2,chrome);k.box(px,3.2,0,.8,1.4,.7,blk);k.cyl(px,3.6,.36,.25,.25,.02,mc(T,0x3a3d44)).rotation.x=Math.PI/2;k.cyl(px,4.2,.36,.1,.1,.02,mc(T,0x3a3d44)).rotation.x=Math.PI/2});
   k.box(0,0,-.3,1,2,.8,blk);k.box(0,2,-.4,.2,1.6,.2,blk);SCR(0,3.6,-.25,2.6,1.5,'movie');[-.4,.4].forEach(function(x){stand(x,.6,4.4);var mic=k.cyl(x,4.4,.6,.04,.05,.6,blk);mic.rotation.x=.5;sph(x,4.85,.85,.1,mc(T,0x9aa0a6,{m:.6}))});return true}
  }}
 /* ---------------- Auto & Garage, Crafts & Office, Storage & Utility, Metal & Fabrication ---------------- */
 case 'a-car':case 'a-pickup':case 'a-evbay':case 'a-moto':case 'a-lift2':case 'a-lift4':case 'a-scissor':case 'a-chest1':case 'a-chest2':case 'a-tire':case 'a-balance':case 'a-press':case 'a-mig1':case 'a-mig2':case 'a-blast':case 'a-parts':case 'a-hoist':
 case 'o-desk':case 'o-ldesk':case 'o-stand':case 'o-conf':case 'o-file':case 'o-copier':case 'o-books':case 'cr-sew':case 'cr-serger':case 'cr-quilt':case 'cr-cut':case 'cr-wheel':case 'cr-kiln1':case 'cr-kiln2':case 'cr-easel':
 case 's-shelf':case 's-heavy':case 's-pallet':case 's-cab':case 's-bins':case 's-safe':case 's-flam':case 's-laundry':case 's-heater':case 's-mini':case 's-recycle':case 's-pack':case 's-sheet':case 's-palletjack':case 's-gantry':case 's-lockers':
 case 'mf-water1':case 'mf-water2':case 'mf-wpump':case 'mf-plasma1':case 'mf-plasma2':case 'mf-fiber':case 'mf-brake':case 'mf-shear':case 'mf-finger':case 'mf-roll':case 'mf-lathe':case 'mf-mill':case 'mf-hband':case 'mf-grind':case 'mf-table':case 'mf-spray':case 'mf-pcbooth':case 'mf-pcoven':case 'mf-chiller':{
  var gry=mc(T,0x2d3036,{r:.45,m:.2}),gryL=mc(T,0x8d939a,{m:.45,r:.4}),iron2=mc(T,0x9aa0a6,{m:.55,r:.35}),redT=mc(T,0xc8202a,{r:.4,m:.1}),blu=mc(T,0x2b5fa8,{r:.45}),org=mc(T,0xe0701f,{r:.45}),ylw=mc(T,0xe0b31b,{r:.45}),tire=mc(T,0x1a1a1a,{r:.85}),
   glassD=mc(T,0x1a2026,{r:.08,m:.3}),light=mc(T,0xffffff,{e:0xfff6e0,ei:1.6}),tail=mc(T,0x330000,{e:0xff2010,ei:1.4}),
   disc=function(x,y,z,rad,th,mat,ax){var m=k.cyl(x,y,z,rad,rad,th,mat,24);if(ax==='x')m.rotation.z=Math.PI/2;if(ax==='z')m.rotation.x=Math.PI/2;m.position.y=y;return m},
   S2=function(x,z,ry,y){var gg=new T.Group();gg.position.set(x,y||0,z);gg.rotation.y=ry||0;g.add(gg);return Kit(T,gg)},
   TB2=function(x0,y0,z0,x1,y1,z1,rad,mat){var a=new T.Vector3(x0,y0,z0),b=new T.Vector3(x1,y1,z1),m=new T.Mesh(exGeo(T,'cyl'),mat);m.scale.set(rad*2,a.distanceTo(b),rad*2);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());m.castShadow=true;g.add(m);return m},
   SC=function(x,y,z,sw,sh,kind){k.box(x,y,z-.02,sw+.06,sh+.06,.04,blk);k.box(x,y+.03,z,sw,sh,.01,scrMat(T,kind||'desktop',1.2))},
   cast=function(x,z,y){k.cyl(x,0,z,.12,.12,.12,tire,10)},casters=function(cw,cd){[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){inst('cyl',tire,[[q[0]*(cw/2-.2),.1,q[1]*(cd/2-.2),.2,.18,.2,0,0,Math.PI/2]])})},
   wheelT=function(x,y,z,rad,wid){var t=k.cyl(x,y,z,rad,rad,wid,tire,20);t.rotation.z=Math.PI/2;t.position.y=y;var rm=k.cyl(x+(x>0?.01:-.01),y,z,rad*.62,rad*.62,wid+.02,mc(T,0xbfc4c8,{m:.6,r:.3}),14);rm.rotation.z=Math.PI/2;rm.position.y=y},
   car=function(cx,cy,cz,cl,cw,col,pick){var kk=S2(cx,cz,0,cy),body=mc(T,col,{r:.3,m:.4});kk.box(0,.55,0,cw,1.5,cl,body);kk.box(0,2.05,pick?cl*.12:-cl*.05,cw-.25,1.55,pick?cl*.3:cl*.5,glassD);kk.box(0,3.6,pick?cl*.12:-cl*.05,cw-.35,.08,pick?cl*.28:cl*.45,body);
    [-1,1].forEach(function(s){kk.box(s*(cw/2-.16),2.05,pick?cl*.12:-cl*.05,.12,1.55,(pick?cl*.3:cl*.5)-.6,body)});if(pick){kk.box(0,2.05,-cl*.3,cw,.8,cl*.38,body);kk.box(0,2.05,-cl*.3,cw-.3,.75,cl*.36,mc(T,0x1a1a1a,{r:.8}))}
    [[-1,1],[1,1]].forEach(function(q){kk.box(q[0]*(cw/2-.45),1.45,cl/2,.6,.25,.04,light)});[[-1,-1],[1,-1]].forEach(function(q){kk.box(q[0]*(cw/2-.35),1.5,-cl/2,.5,.25,.04,tail)});kk.box(0,.9,cl/2+.01,cw*.4,.35,.02,mc(T,0x111111,{r:.5}));
    [-1,1].forEach(function(s){kk.box(s*(cw/2+.15),2.2,cl*(pick?.28:.18),.3,.2,.12,body)});[[-1,1],[1,1],[-1,-1],[1,-1]].forEach(function(q){var t=kk.cyl(q[0]*(cw/2-.25),1.15,q[1]*(cl/2-cl*.17),1.15,1.15,.85,tire,20);t.rotation.z=Math.PI/2;t.position.y=1.15;var rm=kk.cyl(q[0]*(cw/2-.23),1.15,q[1]*(cl/2-cl*.17),.7,.7,.87,mc(T,0xbfc4c8,{m:.6,r:.3}),12);rm.rotation.z=Math.PI/2;rm.position.y=1.15})},
   bayLines=function(){inst('box',mc(T,0xf0c53a,{r:.6}),[[-w/2+.1,.015,0,.33,.01,d],[w/2-.1,.015,0,.33,.01,d]]);k.box(0,0,-d/2+.6,3,.4,.6,mc(T,0xe0b31b,{r:.6}))},
   drw=function(x0,x1,y0,y1,z,n,mat){var a=[],hh=[],dh=(y1-y0)/n;for(var i=0;i<n;i++){a.push([(x0+x1)/2,y0+dh*(i+.5),z,x1-x0-.06,dh-.04,.04]);hh.push([(x0+x1)/2,y0+dh*(i+.5)+dh*.25,z+.04,(x1-x0)*.6,.04,.04])}inst('box',mat,a);inst('box',chrome,hh)},
   rackFrame=function(rw,rd,rh,up,bm,lev){var a=[],b=[];[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){a.push([q[0]*(rw/2-.08),rh/2,q[1]*(rd/2-.08),.16,rh,.16])});inst('box',up,a);lev.forEach(function(y){b.push([0,y,-rd/2+.08,rw,.2,.1],[0,y,rd/2-.08,rw,.2,.1])});inst('box',bm,b)},
   ochair=function(x,z,ry){var kk=S2(x,z,ry);[0,1,2,3,4].forEach(function(i){var a=i*1.2566;kk.box(Math.cos(a)*.5,.05,Math.sin(a)*.5,.15,.08,.15,blk)});kk.cyl(0,0,0,.5,.5,.06,blk,5);kk.cyl(0,0,0,.06,.06,1.4,chrome);kk.box(0,1.4,0,1.5,.3,1.5,mc(T,0x2a2a2e,{r:.8}));kk.box(0,1.7,-.7,1.4,1.7,.2,mc(T,0x2a2a2e,{r:.8}));[-1,1].forEach(function(s){kk.box(s*.72,1.6,-.1,.1,.5,.8,blk)})},
   monitor=function(x,y,z,mw){k.box(x,y,z,.5,.05,.4,blk);k.box(x,y,z-.1,.1,.6,.1,blk);SC(x,y+.55,z-.02,mw,mw*.56,'desktop')},
   dskTop=function(x,z,dw,dd,dh,mat){S2(x,z,0).legs(dw,dd,dh-.1,.12,gry,.1);k.box(x,dh-.1,z,dw,.1,dd,mat||oak)};
  switch(r){
  /* ---------- Auto & Garage ---------- */
  case 'a-car':case 'a-pickup':case 'a-evbay':{bayLines();var pk=r==='a-pickup';car(0,0,.5,Math.min(d-2,pk?19:15.5),Math.min(w-2.5,pk?6.6:6.2),({'a-car':0xc8202a,'a-pickup':0x2b5fa8,'a-evbay':0xd8dde2})[r],pk);
   if(r==='a-evbay'){k.box(-w/2+1,3.5,-d/2+.15,.8,1.3,.3,white);k.box(-w/2+1,4.1,-d/2+.31,.25,.12,.01,lit(0x33ff77,1.6));var cb=new T.Mesh(new T.TorusGeometry(.35,.04,6,20),blk);cb.position.set(-w/2+1,3.2,-d/2+.4);g.add(cb)}return true}
  case 'a-moto':{var mc2=mc(T,0xc8202a,{r:.25,m:.4});[-1,1].forEach(function(s){var tr=new T.Mesh(new T.TorusGeometry(1,.3,10,24),tire);tr.rotation.y=Math.PI/2;tr.position.set(0,1.3,s*2.6);g.add(tr);disc(0,1.3,s*2.6,.75,.08,chrome,'x')});
   TB2(0,1.3,2.6,0,3.3,1.6,.08,chrome);TB2(0,1.3,-2.6,0,2.2,-.6,.08,gry);k.box(0,1.2,-.1,.9,1.1,1.6,gry);var tk=k.box(0,2.5,.6,1,.7,1.6,mc2);tk.rotation.x=-.15;k.box(0,2.4,-.9,.9,.3,1.8,blk);k.box(0,2.2,-2.3,.9,.3,1.2,mc2);hcyl(0,3.4,1.5,.05,2.3,chrome,'x');k.box(0,2.9,1.95,.6,.5,.3,light);TB2(.45,1,-.3,.6,1.6,-3,.12,chrome);TB2(-.2,.0,-.3,-.6,1.1,-.1,.04,chrome);return true}
  case 'a-lift2':{var pst=mc(T,0x2b5fa8,{r:.45,m:.2});[-1,1].forEach(function(s){k.box(s*(w/2-.6),0,0,1,h,1.2,pst);k.box(s*(w/2-.6),0,0,1.5,.12,1.6,pst);[-1,1].forEach(function(q){var arm=k.box(s*(w/2-2.2),4.3,q*1.6,3.2,.25,.3,ylw);arm.rotation.y=-s*q*.25;k.cyl(s*(w/2-3.6),4.55,q*2,.3,.3,.15,blk,12)})});
   k.box(0,h-.4,0,w,.4,.5,pst);k.box(-w/2+.6,4,.8,.7,1.1,.6,mc(T,0x3a3d44));k.cyl(-w/2+.6,5.1,.8,.25,.25,.6,mc(T,0x3a3d44),12);car(0,4.6,0,15,6,0xd8dde2,false);return true}
  case 'a-lift4':{var pst2=mc(T,0x2a2b2e,{r:.45,m:.3}),ry=5.2;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){k.box(q[0]*(w/2-.3),0,q[1]*(d/2-.4),.6,h,.6,pst2)});[-1,1].forEach(function(q){k.box(0,ry-.3,q*(d/2-.4),w,.4,.8,pst2)});
   [-1,1].forEach(function(s){k.box(s*2,ry-.2,0,1.8,.2,d-1.2,iron2);var rmp=k.box(s*2,.3,d/2+.6,1.7,.08,2.2,iron2);rmp.rotation.x=-.2});k.box(0,ry-.15,0,2.2,.05,d*.6,mc(T,0x1a1a1a,{r:.6}));car(0,ry,0,15,6,0xc8202a,false);return true}
  case 'a-scissor':{[-1,1].forEach(function(s){var px=s*(w/2-1);k.box(px,2.4,0,1.6,.3,d-.2,mc(T,0x2b5fa8,{r:.45}));k.box(px,0,0,1.6,.12,d-.4,gry);TB2(px,.12,-d/2+.6,px,2.4,d/2-.6,.12,iron2);TB2(px,.12,d/2-.6,px,2.4,-d/2+.6,.12,iron2);k.cyl(px,1.2,0,.25,.25,.5,mc(T,0x3a3d44),10)});k.box(w/2+.2,0,0,.6,1,.6,mc(T,0x3a3d44));return true}
  case 'a-chest1':case 'a-chest2':{var pro=r==='a-chest2',cc=mc(T,pro?0x1a1a1c:0xc8202a,{r:.3,m:.3});casters(w,d);k.box(0,.25,0,w,h*.55-.25,d,cc);drw(-w/2+.05,pro?w*.2:w/2-.05,.35,h*.55-.1,d/2+.01,pro?6:5,cc);if(pro){k.box(w*.35,.35,d/2+.01,w*.28,h*.55-.45,.04,cc);handle(w*.25,h*.35,d/2+.05,.9,true)}
   k.box(0,h*.55,0,w+.04,.06,d+.04,mc(T,0x2a2a2a,{r:.8}));k.box(0,h*.55+.06,0,w,h*.45-.3,d*.9,cc);drw(-w/2+.05,w/2-.05,h*.55+.1,h-.35,d*.45+.01,pro?7:5,cc);k.box(0,h-.3,0,w,.3,d*.9,cc);hcyl(0,h*.4,d/2+.25,.04,w*.5,chrome,'x');[-1,1].forEach(function(s){k.box(s*w*.25,h*.4,d/2+.1,.05,.05,.25,chrome)});return true}
  case 'a-tire':{k.box(0,0,0,w*.7,2.2,d*.7,redT);k.cyl(0,2.2,0,1,1,.15,iron2,24);inst('box',gry,[[.85,2.45,0,.25,.2,.15],[-.85,2.45,0,.25,.2,.15],[0,2.45,.85,.15,.2,.25],[0,2.45,-.85,.15,.2,.25]]);var tr2=new T.Mesh(new T.TorusGeometry(.9,.32,10,24),tire);tr2.rotation.x=Math.PI/2;tr2.position.set(0,2.65,0);g.add(tr2);
   k.box(0,0,-d/2+.3,.45,h,.45,redT);k.box(0,h-.4,-d/2+.3,.35,.3,1.5,redT);k.box(0,h-1.4,-d/2+1,.15,1.2,.15,iron2);inst('box',blk,[[-.3,.08,d*.35+.2,.2,.06,.5],[0,.08,d*.35+.2,.2,.06,.5],[.3,.08,d*.35+.2,.2,.06,.5]]);return true}
  case 'a-balance':{k.box(0,0,0,w*.6,2.6,d*.6,mc(T,0x2b5fa8,{r:.45}));hcyl(w*.3+.3,2.3,0,.08,.6,chrome,'x');var tr3=new T.Mesh(new T.TorusGeometry(.85,.32,10,24),tire);tr3.rotation.y=Math.PI/2;tr3.position.set(w*.3+.5,2.3,0);g.add(tr3);disc(w*.3+.5,2.3,0,.6,.3,mc(T,0xbfc4c8,{m:.6}),'x');
   var hd=new T.Mesh(new T.CylinderGeometry(1.3,1.3,.9,16,1,true,0,Math.PI),mc(T,0x2a2b2e,{side:T.DoubleSide}));hd.rotation.z=Math.PI/2;hd.position.set(w*.3+.5,2.5,0);hd.rotation.x=-.4;g.add(hd);k.box(-w*.15,2.6,0,.2,1.4,.2,gry);SC(-w*.15,3.6,.12,.8,.5,'desktop');return true}
  case 'a-press':{[-1,1].forEach(function(s){k.box(s*(w/2-.15),0,0,.25,h,.4,redT);k.box(s*(w/2-.15),0,0,.3,.12,d,redT)});k.box(0,h-.5,0,w,.5,.45,redT);k.box(0,2.6,0,w-.4,.35,.45,redT);var pn=[];for(var pi=0;pi<6;pi++)pn.push([-w/2+.15,1+pi*.5,.25,.05,.05,.12],[w/2-.15,1+pi*.5,.25,.05,.05,.12]);inst('cyl',chrome,pn);
   k.cyl(0,h-1.4,0,.25,.25,.9,mc(T,0xd92b2b,{r:.4}),12);k.cyl(0,h-1.8,0,.1,.1,.45,chrome);[-1,1].forEach(function(s){k.box(s*.4,2.95,0,.6,.1,.45,iron2)});TB2(.35,h-1,0,1.1,h-.4,.6,.03,chrome);return true}
  case 'a-mig1':case 'a-mig2':{var tig=r==='a-mig2',bx=mc(T,tig?0x2b5fa8:0xe0701f,{r:.4});casters(w,d);k.box(0,.25,0,w,.08,d,gry);k.box(0,.85,0,w,.08,d,gry);[-1,1].forEach(function(s){k.box(s*(w/2-.05),.25,-d/2+.1,.06,h-.4,.06,gry)});
   k.box(0,.93,.1,w-.1,tig?1.3:1,d-.6,bx);k.box(0,1.2,d/2-.29,w*.5,.3,.01,mc(T,0x1a1a1a));k.box(-.1,1.3,d/2-.28,.25,.12,.01,lit(0xff5533,1.4));k.cyl(-d*0,0.33,-d/2+.3,.35,.35,tig?3.6:2.5,mc(T,0x2e7d4f,{m:.3,r:.4}),14);sph(0,.33+(tig?3.6:2.5),-d/2+.3,.35,mc(T,0x2e7d4f,{m:.3,r:.4}));
   var cl=new T.Mesh(new T.TorusGeometry(.35,.05,6,18),blk);cl.position.set(w/2+.05,1.5,0);cl.rotation.y=Math.PI/2;g.add(cl);return true}
  case 'a-blast':{k.legs(w,d,2.3,.15,gry,.1);var cab=mc(T,0x2b5fa8,{r:.45}),top=k.box(0,2.3,0,w,2.2,d,cab);var lid2=k.box(0,4.3,-.2,w,.25,d-.4,cab);lid2.rotation.x=-.4;k.box(0,3.8,.55,w*.6,.6,.04,mc(T,0x9fc0d8,{op:.45,r:.05}));lid2.position.set(0,4.6,-.1);
   [-.6,.6].forEach(function(o){k.cyl(o,3.1,d/2+.01,.25,.25,.04,blk,16).rotation.x=Math.PI/2});k.box(w/2+.4,0,-.5,.8,3,.8,gry);k.box(0,.02,d/2+.3,.5,.12,.6,blk);return true}
  case 'a-parts':{k.cyl(0,0,0,Math.min(w,d)*.45,Math.min(w,d)*.45,2.3,mc(T,0x2b5fa8,{r:.45}),20);k.box(0,2.3,0,w,.8,d,mc(T,0xc8202a,{r:.4}));k.box(0,2.6,0,w-.25,.52,d-.25,mc(T,0x3a3d44,{r:.3}));k.box(0,3.07,0,w-.3,.02,d-.3,mc(T,0x6a6a2a,{op:.7,r:.05}));
   var ld=k.box(0,3.1,-d/2+.05,w,1.5,.06,mc(T,0xc8202a,{r:.4}));ld.rotation.x=-.2;TB2(w/2-.4,3.1,-d/2+.3,w/2-.6,3.9,-.2,.04,mc(T,0x1a1a1a));return true}
  case 'a-hoist':{var hg=mc(T,0xd92b2b,{r:.4});[-1,1].forEach(function(s){TB2(0,.2,-d/2+.8,s*1.6,.2,d/2-.3,.12,hg);k.cyl(s*1.6,0,d/2-.3,.18,.18,.2,tire,10)});k.box(0,0,-d/2+.6,.3,h-1.2,.3,hg);TB2(0,h-1.6,-d/2+.6,0,h-.2,d/2-1.6,.13,hg);TB2(0,.8,-d/2+.6,0,h-1.4,-d/2+2,.08,mc(T,0x2a2a2a));
   k.box(0,h-2.2,d/2-1.6,.06,1.8,.06,chrome);k.box(0,h-2.4,d/2-1.6,.15,.2,.15,chrome);var es=S2(w/2-.8,-d/2+1.8,0);es.box(0,0,0,.2,.12,1.6,hg);es.box(0,0,0,1.2,.12,.2,hg);es.box(0,0,0,.18,2.3,.18,hg);es.box(.35,1.7,0,1.3,1.1,1,mc(T,0x8a8f94,{m:.4,r:.5}));es.box(.35,2.8,0,1,.2,.8,mc(T,0x6a6f74,{m:.4}));return true}
  /* ---------- Crafts & Office ---------- */
  case 'o-desk':case 'o-stand':{var stnd=r==='o-stand',dh=stnd?3.5:2.5;if(stnd){[-1,1].forEach(function(s){k.box(s*(w/2-.4),0,0,.25,.1,d-.4,blk);k.box(s*(w/2-.4),.1,0,.25,dh-.2,.25,blk)});k.box(0,dh-.1,0,w,.1,d,oak);k.box(0,0,d/2+.9,2.5,.04,1.6,blk)}else{dskTop(0,-.2,w,d-.4,dh)}
   monitor(0,dh,-d/2+.5,2);k.box(0,dh,.2,1.4,.04,.45,blk);k.box(.95,dh,.2,.2,.04,.3,blk);k.cyl(-w/2+.4,dh,-d/2+.4,.15,.15,.1,blk);TB2(-w/2+.4,dh,-d/2+.4,-w/2+.6,dh+1.2,-d/2+.6,.03,blk);if(!stnd)ochair(0,d/2+.6,Math.PI);return true}
  case 'o-ldesk':{dskTop(0,-d/2+1.25,w,2.5,2.5);dskTop(-w/2+1.25,.8,2.5,d-2.5-.1,2.5);monitor(-.3,2.5,-d/2+.5,2);monitor(1.8,2.5,-d/2+.5,2);k.box(.7,2.5,-d/2+1.8,1.4,.04,.45,blk);ochair(.7,-d/2+3.4,Math.PI);k.box(-w/2+1.25,0,d/2-1.2,2,2.3,2,gry);drw(-w/2+.3,-w/2+2.2,.15,2.2,d/2-.2,3,gry);return true}
  case 'o-conf':{k.box(-w/4,0,0,.6,2.35,1.6,gry);k.box(w/4,0,0,.6,2.35,1.6,gry);k.box(0,2.35,0,w,.15,d,walnut);var ns=Math.max(2,Math.round(w/2.6));for(var ci=0;ci<ns;ci++){var cx=-w/2+(ci+.5)*w/ns;ochair(cx,-d/2-.3,0);ochair(cx,d/2+.3,Math.PI)}k.box(0,2.5,0,.6,.06,.4,blk);return true}
  case 'o-file':{var fc=mc(T,0x8d939a,{m:.4,r:.4});k.box(0,0,0,w,h,d,fc);drw(-w/2+.05,w/2-.05,.1,h-.1,d/2+.01,4,fc);inst('box',white,[[0,.1+(h-.2)*(.125+.25*0)+.25,d/2+.04,.4,.18,.01],[0,.1+(h-.2)*.375+.25,d/2+.04,.4,.18,.01],[0,.1+(h-.2)*.625+.25,d/2+.04,.4,.18,.01],[0,.1+(h-.2)*.875+.25,d/2+.04,.4,.18,.01]]);return true}
  case 'o-copier':{var cp=mc(T,0xe8e6e0,{r:.45});casters(w,d);k.box(0,.2,0,w,2,d,cp);drw(-w/2+.05,w/2-.05,.3,2.1,d/2+.01,3,cp);k.box(0,2.2,0,w*.8,.7,d*.8,mc(T,0x2a2b2e,{r:.5}));k.box(.2,2.3,d*.4+.1,w*.7,.04,.6,cp);k.box(0,2.9,0,w,.5,d,cp);k.box(0,3.4,-.05,w*.8,.25,d*.6,cp);var pn2=k.box(w/2-.4,3.2,d/2+.1,.6,.04,.4,blk);pn2.rotation.x=.6;k.box(w/2-.4,3.25,d/2+.12,.5,.01,.3,scrMat(T,'desktop',1));return true}
  case 'o-books':{var bw=mc(T,0x5a3a26,{r:.5});k.box(0,0,-d/2+.03,w,h,.06,bw);[-1,1].forEach(function(s){k.box(s*(w/2-.04),0,0,.08,h,d,bw)});var sh=5,bk=[],i2=0;for(var si=0;si<=sh;si++){var y=.1+si*(h-.2)/sh;k.box(0,y,0,w,.08,d,bw);if(si<sh){var xx=-w/2+.15;while(xx<w/2-.25){var bt=.6+((i2*7)%5)*.12,bw2=.08+((i2*3)%4)*.03;bk.push([xx+bw2/2,y+.08+bt/2,.05,bw2,bt,d*.75]);xx+=bw2+.01;i2++;if(i2%13===0)xx+=.35}}}
   inst('box',mc(T,0xffffff,{r:.7}),bk,[0x8a2a2a,0x2b4a7a,0x2e6a4a,0xd9a441,0x3a3a3a,0xb86a3a,0xe8e0cc,0x5a3a6a]);return true}
  case 'cr-sew':case 'cr-serger':{dskTop(0,0,w,d,2.5,mc(T,0xeeebe4,{r:.5}));var sm=S2(-.2,-.1,0,2.5);if(r==='cr-sew'){sm.box(-.5,0,0,1.6,.4,.65,white);sm.box(.5,.4,0,.4,.8,.6,white);sm.box(-.1,1.2,0,1.6,.35,.55,white);sm.box(-.8,.95,0,.25,.3,.45,white);sm.box(-.8,.75,.1,.03,.25,.03,chrome);sm.box(.52,.8,.31,.25,.18,.01,scrMat(T,'desktop',1));sm.cyl(.4,1.55,0,.07,.07,.25,mc(T,0xd92b2b),10)}
   else{sm.box(0,0,0,1.1,.75,.9,white);sm.box(0,.75,-.15,.9,.15,.5,white);inst('cyl',mc(T,0xffffff,{r:.5}),[[-.45,3.6,-.3,.14,.4,.14],[-.15,3.6,-.3,.14,.4,.14],[.15,3.6,-.3,.14,.4,.14],[.45,3.6,-.3,.14,.4,.14]].map(function(a){a[0]-=.2;a[2]-=.1;return a}),[0xd92b2b,0x2b6fd9,0xf0c53a,0x6aa84f]);TB2(-.2,3.4,-.6,-.2,4.2,-.6,.02,chrome)}
   k.cyl(w/2-.4,2.5,-.5,.15,.15,.06,blk);TB2(w/2-.4,2.5,-.5,w/2-.6,3.6,-.2,.03,blk);k.box(w/2-.75,3.5,-.1,.4,.15,.3,blk);ochair(0,d/2+.6,Math.PI);return true}
  case 'cr-quilt':{[-1,1].forEach(function(s){k.box(s*(w/2-.15),0,0,.25,2.8,d-.2,gry);k.box(s*(w/2-.15),0,0,.3,.1,d,gry)});var rl=[];[-1.2,-.4,.4,1.2].forEach(function(z){rl.push([0,2.6,z,.18,w-.3,.18,0,0,Math.PI/2])});inst('cyl',iron2,rl);
   if(!EXST.quilt){var cv=document.createElement('canvas');cv.width=cv.height=128;var x=cv.getContext('2d'),QC=['#d9534f','#f0ad4e','#5bc0de','#5cb85c','#f6f1e7','#8a5cd9','#e88aa8','#3a6ea5'];for(var a=0;a<8;a++)for(var b=0;b<8;b++){x.fillStyle=QC[(a*3+b*5)%8];x.fillRect(a*16,b*16,16,16)}x.strokeStyle='rgba(255,255,255,.5)';for(var c=0;c<=8;c++){x.beginPath();x.moveTo(c*16,0);x.lineTo(c*16,128);x.moveTo(0,c*16);x.lineTo(128,c*16);x.stroke()}var qt=new T.CanvasTexture(cv);qt.colorSpace=T.SRGBColorSpace;qt.wrapS=qt.wrapT=T.RepeatWrapping;qt.repeat.set(3,1);EXST.quilt=qt}
   k.box(0,2.72,0,w-.4,.02,2.6,mc(T,0xffffff,{r:.95,map:EXST.quilt}));var mq=S2(1,0,0,2.75);mq.box(0,0,.9,.8,.6,.6,white);mq.box(0,.6,.3,.8,.5,1.8,white);mq.box(0,0,-.9,.8,.6,.5,white);mq.box(0,.35,1.25,.5,.25,.06,scrMat(T,'desktop',1));[-1,1].forEach(function(s){hcyl(s*.5,.9,1.4,.04,.4,chrome,'z')});return true}
  case 'cr-cut':{var cc2=mc(T,0xeeebe4,{r:.5});k.box(0,0,0,w,h-.1,d,cc2);var cb=[];for(var a2=0;a2<4;a2++)for(var b2=0;b2<2;b2++)cb.push([-w/2+w/8+a2*w/4,.3+b2*1.2+.5,d/2-.6,w/4-.3,.9,1.1]);inst('box',mc(T,0xffffff,{r:.8}),cb,[0x8a5cd9,0x5bc0de,0xe88aa8,0xf0ad4e,0x5cb85c,0xd9534f]);
   k.box(0,h-.1,0,w+.1,.1,d+.1,oak);k.box(0,h,0,w-.4,.01,d-.4,mc(T,0x2e7d4f,{r:.8}));var gl=[];for(var gx=-w/2+.5;gx<w/2-.2;gx+=.5)gl.push([gx,h+.012,0,.01,.002,d-.4]);for(var gz=-d/2+.5;gz<d/2-.2;gz+=.5)gl.push([0,h+.012,gz,w-.4,.002,.01]);inst('box',mc(T,0xd8e8d0),gl);
   k.box(-.5,h+.01,.3,2,.02,.3,mc(T,0xdfeeff,{op:.6}));k.box(.8,h+.02,-.4,1.6,.08,1,mc(T,0xd9534f,{r:.9}));return true}
  case 'cr-wheel':{k.box(0,0,.2,w*.8,1.2,d*.6,mc(T,0x2a6a9a,{r:.4}));k.cyl(0,1.2,.2,.75,.65,.35,mc(T,0x9aa0a6,{m:.4}),24);k.cyl(0,1.4,.2,.55,.55,.05,iron2,24);k.cyl(0,1.45,.2,.25,.28,.35,mc(T,0x9a6a4a,{r:.9}),16);k.box(0,0,-d/2+.7,.3,.1,.6,blk);
   k.cyl(0,0,d/2-.4,.35,.35,.06,blk,12);k.cyl(0,0,d/2-.4,.05,.05,1.2,chrome);k.cyl(0,1.2,d/2-.4,.4,.4,.15,mc(T,0x2a2a2a),16);k.cyl(.8,0,-.5,.3,.25,.6,mc(T,0x2b6fd9,{r:.5}),14);return true}
  case 'cr-kiln1':case 'cr-kiln2':{var big=r==='cr-kiln2',kr=Math.min(w,d)*.42,kh=big?2.4:1.6;k.legs(w*.7,d*.7,h-kh-.15,.1,gry,.05);k.cyl(0,h-kh-.15,0,kr,kr,kh,mc(T,0xbfc4c8,{m:.55,r:.35}),8);var bnd=[];for(var bi=0;bi<3;bi++)bnd.push([0,h-kh-.15+.2+bi*(kh-.4)/2,0,kr*2.02,.05,kr*2.02]);inst('cyl',iron2,bnd);
   k.cyl(0,h-.15,0,kr+.02,kr+.02,.15,mc(T,0xbfc4c8,{m:.55,r:.35}),8);k.box(kr+.15,h-kh,0,.3,.9,.6,mc(T,0x2a2b2e));SC(kr+.31,h-kh+.4,0,.01,.01);k.box(kr+.31,h-kh+.55,0,.01,.18,.35,lit(0xff5533,1.4));inst('cyl',mc(T,0xf3efe6),[[0,h-kh*.5,kr+.02,.12,.08,.12,Math.PI/2],[0,h-kh*.75,kr+.02,.12,.08,.12,Math.PI/2]]);k.box(-kr-.05,h-.2,0,.1,.12,.5,chrome);return true}
  case 'cr-easel':{var ew=mc(T,0xc49a6c,{r:.6});TB2(-.6,0,.3,-.2,h,0,.08,ew);TB2(.6,0,.3,.2,h,0,.08,ew);TB2(0,0,-1.2,0,h-.4,0,.07,ew);k.box(0,2.6,.2,1.8,.1,.35,ew);if(!EXST.paint){var cv2=document.createElement('canvas');cv2.width=128;cv2.height=160;var p=cv2.getContext('2d'),gr=p.createLinearGradient(0,0,0,160);gr.addColorStop(0,'#f6c38a');gr.addColorStop(.5,'#e8846a');gr.addColorStop(1,'#3a5a8a');p.fillStyle=gr;p.fillRect(0,0,128,160);p.fillStyle='#2a3a5a';p.beginPath();p.moveTo(0,160);p.lineTo(0,110);p.lineTo(50,85);p.lineTo(90,105);p.lineTo(128,90);p.lineTo(128,160);p.fill();p.fillStyle='#fff3c0';p.beginPath();p.arc(84,60,14,0,7);p.fill();EXST.paint=new T.CanvasTexture(cv2);EXST.paint.colorSpace=T.SRGBColorSpace}
   var cnv=k.box(0,2.7,.28,1.6,2,.08,mc(T,0xffffff,{r:.9,map:EXST.paint}));cnv.rotation.x=-.08;k.legs(1.2,1,2.4,.08,ew,.05);var tb=S2(w/2-.7,d/2-.6,0);tb.legs(1.2,1,2.4,.08,ew,.05);tb.box(0,2.4,0,1.2,.08,1,ew);inst('cyl',mc(T,0xffffff,{r:.4}),[[w/2-1,2.55,d/2-.8,.12,.25,.12],[w/2-.8,2.55,d/2-.8,.12,.25,.12],[w/2-.6,2.55,d/2-.8,.12,.25,.12],[w/2-.4,2.55,d/2-.8,.12,.25,.12]],[0xd9534f,0x3a6ea5,0xf0ad4e,0x5cb85c]);return true}
  /* ---------- Storage & Utility ---------- */
  case 's-shelf':case 's-heavy':case 's-pallet':case 's-bins':{var pal=r==='s-pallet',hv=r==='s-heavy'||pal,bins=r==='s-bins',up=hv?blu:gryL,bm=hv?org:gryL,nl=pal?3:hv?4:5,lv=[];for(var li=0;li<nl;li++)lv.push(pal?.4+li*(h-1)/(nl-1)*.95:.3+li*(h-.4)/(nl-1));rackFrame(w,d,h,up,bm,lv);
   if(!pal&&!hv||bins)lv.forEach(function(y){k.box(0,y,0,w,.05,d,gryL)});if(hv&&!pal)lv.forEach(function(y){k.box(0,y+.08,0,w-.1,.05,d-.1,mc(T,0xc8a878,{r:.85}))});
   var it=[],ic=[],tc=[];lv.forEach(function(y,i){if(i===lv.length-1)return;var gap=(lv[i+1]||h)-y-.25;if(pal){[-1,1].forEach(function(s){var px=s*w/4;k.box(px,y+.1,0,w/2-.4,.45,d-.3,mc(T,0xc8a06a,{r:.85}));it.push([px,y+.55+Math.min(gap-.6,3)/2,0,w/2-.6,Math.min(gap-.6,3),d-.5]);ic.push([0xd9b47a,0x2b6fd9,0xe0e0dc][(i+s+3)%3])})}
    else if(bins){for(var bx=-w/2+.3;bx<w/2-.2;bx+=.55){it.push([bx+.25,y+.05+Math.min(.5,gap)/2,0,.48,Math.min(.5,gap),d-.2]);ic.push([0x2b6fd9,0xc8202a,0xe0b31b,0x2e7d4f][(Math.round(bx*2)+i+8)%4])}}
    else{var xx=-w/2+.4;while(xx<w/2-.8){var kd=((xx*10|0)+i)%3,bh=Math.min(gap,kd===2?1:.8);it.push([xx+.3,y+.05+bh/2,0,kd===1?.5:.7,bh,d-.3]);ic.push(kd===1?0x2a2a2a:kd===2?0x2b6fd9:0xc9a26a);xx+=.8}}});
   if(it.length){var im=new T.InstancedMesh(exGeo(T,'box'),mc(T,0xffffff,{r:.75}),it.length);it.forEach(function(a,i){D.position.set(a[0],a[1],a[2]);D.rotation.set(0,0,0);D.scale.set(a[3],a[4],a[5]);D.updateMatrix();im.setMatrixAt(i,D.matrix);im.setColorAt(i,tmpC.setHex(ic[i]))});im.castShadow=im.receiveShadow=true;g.add(im)}return true}
  case 's-cab':case 's-flam':case 's-safe':case 's-mini':case 's-lockers':{
   if(r==='s-safe'){var sf=mc(T,0x1d1f22,{r:.35,m:.4});k.box(0,0,0,w,h,d,sf);k.box(0,.15,d/2+.01,w-.3,h-.3,.08,sf);disc(-.2,h*.6,d/2+.1,.25,.08,chrome,'z');disc(-.2,h*.6,d/2+.15,.15,.05,blk,'z');[0,1,2,3,4].forEach(function(i){var a=i*1.2566;TB2(.6,h*.5,d/2+.1,.6+Math.cos(a)*.35,h*.5+Math.sin(a)*.35,d/2+.2,.025,chrome)});k.box(w/2-.25,.6,d/2+.06,.06,h-1.2,.06,chrome);return true}
   if(r==='s-mini'){k.box(0,.05,0,w,h-.05,d,blk);k.box(0,.1,d/2+.01,w-.05,h-.15,.05,blk);handle(w/2-.15,h*.6,d/2+.06,.7,true);k.box(0,h-.01,0,w,.02,d,mc(T,0x2a2a2a));return true}
   if(r==='s-lockers'){var lc=mc(T,0xd9cbb0,{r:.6});k.box(0,0,0,w,1.6,d,lc);k.box(0,1.6,0,w,.15,d,oak);var nc=Math.max(2,Math.round(w/1.2)),cw2=w/nc;k.box(0,1.75,-d/2+.05,w,h-1.75,.1,lc);var dv=[],hk=[],cub=[];for(var ci2=0;ci2<=nc;ci2++)dv.push([-w/2+ci2*cw2,(h+1.75)/2,0,.08,h-1.75,d]);for(var ci3=0;ci3<nc;ci3++){hk.push([-w/2+cw2*(ci3+.5),3.6,-d/2+.2,.06,.06,.25]);cub.push([-w/2+cw2*(ci3+.5),h-.7,0,cw2-.1,.06,d]);cub.push([-w/2+cw2*(ci3+.5),.8,0,cw2-.1,.06,d])}
    inst('box',lc,dv);inst('box',lc,cub);inst('box',chrome,hk);var bg=[];for(var bi2=0;bi2<nc;bi2+=2)bg.push([-w/2+cw2*(bi2+.5),3.1,-d/2+.4,.6,.9,.35]);inst('box',mc(T,0xffffff,{r:.8}),bg,[0x2b6fd9,0xc8202a,0x2e7d4f]);k.box(0,h,0,w,.1,d,lc);return true}
   var cm=r==='s-flam'?mc(T,0xe2b21b,{r:.45}):mc(T,0x7d8288,{m:.35,r:.45});k.box(0,0,0,w,h,d,cm);[-1,1].forEach(function(s){k.box(s*w/4,.1,d/2+.01,w/2-.04,h-.2,.04,cm)});k.box(0,h*.4,d/2+.04,.12,.5,.04,chrome);k.box(0,0,0,w,.1,d,blk);
   if(r==='s-flam'){[-1,1].forEach(function(s){k.box(s*w/4,h*.62,d/2+.035,w/2-.4,.5,.01,mc(T,0xc8202a,{r:.5}))});k.box(0,h*.75,d/2+.035,.6,.6,.01,mc(T,0xe2b21b,{e:0x6a3a00,ei:.1}))}return true}
  case 's-laundry':{var uw=w/2-.05;[-1,1].forEach(function(s){var ux=s*(uw/2+.02);k.box(ux,0,0,uw,h,d,white);k.box(ux,h-.45,d/2+.01,uw-.1,.35,.02,mc(T,0xe8e6e0));disc(ux+uw*.25,h-.27,d/2+.03,.12,.04,mc(T,0xbfc4c8,{m:.5}),'z');k.box(ux-uw*.2,h-.3,d/2+.025,.4,.15,.01,lit(0x38d0ff,1.2));
    var rg=new T.Mesh(new T.TorusGeometry(.75,.08,8,24),mc(T,0xcfd3d6,{m:.6,r:.3}));rg.position.set(ux,h*.42,d/2+.05);g.add(rg);disc(ux,h*.42,d/2+.03,.72,.03,mc(T,s<0?0x2a3a4a:0x1a1a1a,{op:.7,r:.05}),'z')});return true}
  case 's-heater':{var rr=Math.min(w,d)*.44;k.cyl(0,0,0,rr,rr,h-.4,white,20);k.cyl(0,h-.4,0,rr*.98,rr*.98,.15,mc(T,0xe8e8e4),20);[-.35,.35].forEach(function(o,i){k.cyl(o,h-.25,0,.06,.06,.6,mc(T,0xc8743a,{m:.7,r:.3}));k.cyl(o,h-.1,0,.08,.08,.1,mc(T,i?0xd92b2b:0x2b6fd9))});hcyl(rr,h-.8,0,.05,.3,chrome,'x');k.box(0,.3,rr-.02,.6,.3,.04,mc(T,0x3a3d44));k.box(0,1.6,rr-.01,.7,.9,.02,mc(T,0x2b6fd9,{r:.6}));return true}
  case 's-recycle':{var rc=mc(T,0x5a3a26,{r:.5});k.box(0,0,0,w,h-.1,d,rc);k.box(0,h-.1,0,w+.05,.1,d+.05,oak);[[-1,0x2b6fd9],[0,0x2e7d4f],[1,0x2a2a2a]].forEach(function(p){var x=p[0]*w/3;k.box(x,.1,d/2+.01,w/3-.06,h-.3,.04,rc);k.box(x,h-.6,d/2+.04,w/3-.4,.2,.01,mc(T,p[1],{r:.5}));k.box(x,h-.11,0,w/3-.5,.02,d*.5,blk)});return true}
  case 's-pack':{var pt=2.9;k.legs(w,d,pt,.15,gryL,.05);k.box(0,pt,0,w,.12,d,mc(T,0xd9c49a,{r:.6}));k.box(0,.6,0,w-.2,.05,d-.2,gryL);[-1,1].forEach(function(s){k.box(s*(w/2-.06),pt,-d/2+.1,.1,h-pt,.1,gryL)});k.box(0,h-.3,-d/2+.5,w,.06,1,gryL);hcyl(0,h-.1,-d/2+.4,.25,w-.6,mc(T,0xc8a878,{r:.85}),'x');
   var bx2=[];[[-1.8,.9,1.2,.8],[-.6,.7,.8,.6],[.4,.5,.6,.5],[-1.5,1.7,.9,.7]].forEach(function(b){bx2.push([b[0],pt+.12+b[2]/2+(b[1]>1.5?.8:0),-.2,b[1],b[2],b[3]])});inst('box',mc(T,0xc9a26a,{r:.85}),bx2);k.box(1.6,pt+.12,.2,.9,.08,.9,blk);k.box(1.6,pt+.2,.6,.3,.12,.01,lit(0x33ff77,1.2));k.box(.9,pt+.12,.3,.3,.3,.5,mc(T,0xd92b2b,{r:.4}));
   var bxs=[];for(var b3=0;b3<4;b3++)bxs.push([-w/2+.7+b3*.9,.65+.4,0,.8,.8,d-.6]);inst('box',mc(T,0xc9a26a,{r:.85}),bxs);return true}
  case 's-sheet':{casters(w,d);k.box(0,.25,0,w,.12,d,gry);k.box(0,.37,0,w-.2,h-.6,.12,gry);var sh2=[];for(var si2=0;si2<6;si2++){sh2.push([0,.37+(h-.8)/2,.15+si2*.07,w-.3,h-.8,.06])}inst('box',mc(T,0xffffff,{r:.85}),sh2,[0xd9c49a,0xcfb88a,0xe0d0a8,0xc4a878]);return true}
  case 's-palletjack':{var pj=mc(T,0xd92b2b,{r:.4});[-.6,.6].forEach(function(x){k.box(x,.1,.4,.55,.25,d-1.4,pj);k.cyl(x,0,d/2-.3,.15,.15,.15,tire,10)});k.box(0,0,-d/2+.6,1.8,.9,.6,pj);[-.4,.4].forEach(function(x){disc(x,.25,-d/2+.6,.25,.15,tire,'x')});k.cyl(0,.9,-d/2+.6,.15,.15,.5,pj);TB2(0,1.2,-d/2+.6,0,3.8,-d/2-.2,.06,pj);var hdl=new T.Mesh(new T.TorusGeometry(.35,.05,6,16),pj);hdl.position.set(0,3.95,-d/2-.25);g.add(hdl);return true}
  case 's-gantry':{var gc=mc(T,0xe0b31b,{r:.4});[-1,1].forEach(function(s){var lx=s*(w/2-.3);k.box(lx,0,0,.25,.2,d,gc);TB2(lx,.2,-d/2+.3,lx,h-.6,0,.12,gc);TB2(lx,.2,d/2-.3,lx,h-.6,0,.12,gc);[-1,1].forEach(function(q){k.cyl(lx,0,q*(d/2-.15),.15,.15,.15,tire,10)})});
   k.box(0,h-.6,0,w,.55,.3,gc);k.box(0,h-.65,0,w,.06,.55,gc);k.box(1,h-1.1,0,.6,.4,.6,gry);k.box(1,h-1.9,0,.5,.8,.5,mc(T,0xd92b2b,{r:.4}));k.box(1,h-4.5,0,.03,2.6,.03,chrome);var hk2=new T.Mesh(new T.TorusGeometry(.15,.05,6,14,Math.PI*1.4),chrome);hk2.position.set(1,h-4.7,0);g.add(hk2);return true}
  /* ---------- Metal & Fabrication ---------- */
  case 'mf-water1':case 'mf-water2':case 'mf-plasma1':case 'mf-plasma2':{var wj=r.indexOf('water')>0,big2=/2$/.test(r),tbh=big2?2.8:2.5,tw2=w-(big2?0:1.4),tx=big2?0:-.7;
   if(!big2&&!wj){k.legs(tw2,d-.4,tbh,.2,gry,.1)}else k.box(tx,0,0,tw2,tbh,d-.2,mc(T,0x3a3d44,{m:.3,r:.4}));k.box(tx,tbh,0,tw2,.35,d-.2,mc(T,0x3a3d44,{m:.3,r:.4}));k.box(tx,tbh+.2,0,tw2-.3,.02,d-.5,mc(T,wj?0x3a8ab0:0x2a3a3a,{op:.85,r:.05}));
   var sl=[];for(var sx=0;sx<Math.floor((d-.6)/.5);sx++)sl.push([tx,tbh+.27,-d/2+.5+sx*.5,tw2-.4,.15,.03]);inst('box',mc(T,0x6a6e72,{m:.5}),sl);k.box(tx+.5,tbh+.36,.3,2.4,.04,1.6,mc(T,0x9aa0a6,{m:.6,r:.3}));
   [-1,1].forEach(function(s){k.box(tx+s*(tw2/2-.1),tbh+.35,0,.2,.2,d-.2,iron2)});var gz=.6;[-1,1].forEach(function(s){k.box(tx+s*(tw2/2-.1),tbh+.55,gz,.35,.9,.6,wj?blu:mc(T,0xd92b2b,{r:.4}))});k.box(tx,tbh+1.2,gz,tw2,.4,.5,wj?blu:mc(T,0xd92b2b,{r:.4}));
   k.box(tx+.4,tbh+.55,gz+.35,.35,.8,.3,gryL);k.cyl(tx+.4,tbh+.4,gz+.45,.06,.04,.45,chrome);k.box(tx+.4,tbh+.38,gz+.45,.15,.01,.15,lit(wj?0x8ad8ff:0x9a7aff,2));
   if(!big2){k.box(w/2-.5,0,0,.7,4,.7,gry);SC(w/2-.5,3.4,.36,.55,.4,'desktop')}else{k.box(tw2/2-.6,0,d/2+.0,.8,.1,.8,gry);k.box(tw2/2-.6,.1,d/2,.12,3.6,.12,gry);SC(tw2/2-.6,3.4,d/2+.1,.7,.5,'desktop')}return true}
  case 'mf-wpump':case 'mf-chiller':{var ch=r==='mf-chiller';k.box(0,.15,0,w,h-.15,d,ch?white:blu);k.box(0,0,0,w-.2,.15,d-.2,blk);SC(-w*.2,h-.9,d/2+.02,.7,.45,'desktop');inst('cyl',mc(T,0xffffff,{r:.4}),[[w*.15,h-.9,d/2+.03,.08,.03,.08,Math.PI/2],[w*.15+.15,h-.9,d/2+.03,.08,.03,.08,Math.PI/2],[w*.15+.3,h-.9,d/2+.03,.08,.03,.08,Math.PI/2]],[0x33cc55,0xd92b2b,0xf0c53a]);var lv=[];for(var l=0;l<8;l++)lv.push([0,.5+l*.18,d/2+.01,w*.7,.05,.02]);inst('box',blk,lv);
   if(ch){disc(0,h+.02,0,Math.min(w,d)*.35,.05,blk,null)}else{TB2(w/2,h-1,0,w/2+.2,h+.6,-.5,.04,chrome);k.cyl(-w/4,h,0,.25,.25,.5,gryL,12)}return true}
  case 'mf-fiber':{var en=mc(T,0xeeeeec,{r:.45});k.box(0,0,-1.5,w,h,d-3,en);var win=[];for(var wi=0;wi<3;wi++)win.push([-w/2+w/6+wi*w/3,h*.55,d/2-3+.01,w/3-.8,h*.3,.02]);inst('box',mc(T,0xff7a1a,{op:.55,r:.1}),win);
   k.box(0,0,d/2-1.5,w-.4,2.8,3,mc(T,0x3a3d44,{m:.3}));var sl2=[];for(var sx2=0;sx2<12;sx2++)sl2.push([-w/2+.6+sx2*(w-1.2)/11,2.85,d/2-1.5,.04,.15,2.8]);inst('box',mc(T,0x6a6e72,{m:.5}),sl2);k.box(0,2.95,d/2-1.5,w-1.4,.03,2.4,mc(T,0x9aa0a6,{m:.6,r:.3}));
   k.box(w/2-1,0,d/2-3.6,.15,3.6,.15,gry);SC(w/2-1,3.7,d/2-3.5,.8,.55,'desktop');k.box(-w/2+1,h,-d/2+2,2,1.2,1.5,blu);return true}
  case 'mf-brake':{var bc=mc(T,0x2b5fa8,{r:.45});[-1,1].forEach(function(s){k.box(s*(w/2-.4),0,-.3,.6,h,2.4,bc)});k.box(0,0,.2,w-1.4,3,1,bc);k.box(0,3,.25,w-1.6,.25,.35,iron2);k.box(0,3.6,.25,w-1.4,2.2,.8,bc);k.box(0,3.3,.25,w-1.6,.3,.12,iron2);k.box(0,h-1.6,-.6,w-2,1.2,1,gry);
   k.box(w/2-.2,3,1.5,.12,1.8,.12,gry);SC(w/2-.2,4.8,1.6,.9,.6,'desktop');k.box(0,0,1.5,.8,.25,.6,mc(T,0xe0b31b,{r:.4}));k.box(0,3.25,-.8,w-2.2,.15,.15,iron2);return true}
  case 'mf-shear':case 'mf-finger':{var shr=r==='mf-shear',sc2=mc(T,shr?0x2b5fa8:0x2e6a4a,{r:.45});[-1,1].forEach(function(s){k.box(s*(w/2-.35),0,0,.6,h-.3,d*.7,sc2)});k.box(0,0,0,w-1.2,2.8,d*.55,sc2);k.box(0,2.8,.2,w-.6,.15,d*.7,iron2);
   if(shr){k.box(0,3,-.3,w-.8,.8,.6,sc2);k.box(0,2.95,.15,w-.9,.1,.04,mc(T,0xd8dde2,{m:.8}));k.box(0,0,d/2+.2,1,.25,.6,mc(T,0xe0b31b,{r:.4}));var fn=[];for(var f=0;f<10;f++)fn.push([-w/2+.8+f*(w-1.6)/9,3.1,.35,.05,.25,.05]);inst('box',mc(T,0xe0b31b),fn)}
   else{var fg=[];for(var f2=0;f2<14;f2++)fg.push([-w/2+.7+f2*(w-1.4)/13,3.05,-.1,(w-1.4)/14-.03,.3,.6]);inst('box',iron2,fg);[-1,1].forEach(function(s){TB2(s*(w/2-.35),3,.5,s*(w/2-.35),3.6,d/2+.6,.05,gry);sph(s*(w/2-.35),3.6,d/2+.7,.25,gry)})}return true}
  case 'mf-roll':{var rc2=mc(T,0x2e6a4a,{r:.45});k.legs(w*.8,d*.8,2,.12,gry,.05);[-1,1].forEach(function(s){k.box(s*(w/2-.25),2,0,.35,1.2,d*.7,rc2)});[[0,2.9,-.2],[0,2.9,.2],[0,2.5,0]].forEach(function(p){hcyl(p[0],p[1],p[2],.17,w-.6,iron2,'x')});TB2(-w/2,2.9,0,-w/2-.6,2.9,0,.04,chrome);TB2(-w/2-.6,2.9,0,-w/2-.6,3.4,.1,.03,chrome);return true}
  case 'mf-lathe':{var lc=mc(T,0x2e6a4a,{r:.45}),bh2=2.6;k.box(0,0,0,w,bh2,d*.6,lc);doors(-w/2,w/2,.1,bh2-.2,d*.3+.01,3,mc(T,0x3a6a52,{r:.5}),true);k.box(0,bh2,0,w,.08,d*.8,iron2);k.box(0,bh2+.08,-.1,w-.6,.35,.7,iron2);
   k.box(-w/2+.8,bh2+.08,0,1.6,1.4,1.2,lc);disc(-w/2+1.7,bh2+.9,0,.45,.35,iron2,'x');inst('box',gry,[[-w/2+1.95,bh2+1.25,0,.15,.25,.15],[-w/2+1.95,bh2+.7,.3,.15,.15,.25],[-w/2+1.95,bh2+.7,-.3,.15,.15,.25]]);k.box(0,bh2+.43,.1,.9,.35,.9,lc);k.box(0,bh2+.78,.1,.5,.3,.5,iron2);
   k.box(w/2-.8,bh2+.43,-.1,.9,.7,.6,lc);hcyl(w/2-1.4,bh2+.9,-.1,.07,.4,chrome,'x');k.box(-w/2+.8,bh2+1.6,.35,.6,.4,.3,mc(T,0x2a2b2e));SC(-w/2+.8,bh2+1.62,.51,.4,.25,'desktop');k.box(0,bh2+1,-.6,w-1.8,1.1,.04,mc(T,0xdfeeff,{op:.3}));return true}
  case 'mf-mill':{var mm=mc(T,0x6a7a8a,{r:.45,m:.2});k.box(0,0,-1,2.2,.3,2.6,mm);k.box(0,.3,-1.4,1.8,4.6,1.6,mm);k.box(0,2.6,.2,1.6,1.4,1.6,mm);k.box(0,4,.4,1.4,.4,1.2,mm);k.box(0,4.4,.4,w-.6,.4,1,iron2);var ts=[];for(var t=0;t<3;t++)ts.push([0,4.81,.2+t*.3,w-.8,.02,.06]);inst('box',blk,ts);
   k.box(0,4.9,-1.2,1.2,.8,2.8,mm);k.box(0,5.4,.6,1,1.4,1,mm);k.cyl(0,h-.8,.4,.4,.4,.8,mm,14);k.cyl(0,5.1,.75,.12,.12,.35,iron2);k.box(0,5.2,.4,.5,.3,.2,iron2);[-1,1].forEach(function(s){disc(s*(w/2-.1),4.6,.4,.25,.06,chrome,'x')});SC(w/2-.4,5.6,1.2,.6,.4,'desktop');return true}
  case 'mf-hband':{var hb=mc(T,0x2b5fa8,{r:.45});k.legs(w*.7,d*.8,2,.12,gry,.05);k.box(0,2,0,w*.8,.5,d*.8,hb);k.box(-.3,2.5,0,1,.3,.7,iron2);var hd2=k.box(.3,2.8,-.1,w*.75,.5,.4,hb);hd2.rotation.z=.15;disc(-w*.32,3,-.1,.45,.15,hb,'z');disc(w*.42,3.3,-.1,.45,.15,hb,'z');k.box(w*.2,2.5,0,.6,.4,.6,mc(T,0x3a3d44));[-1,1].forEach(function(s){k.cyl(s*w*.32,0,d/2-.2,.15,.15,.15,tire,10)});return true}
  case 'mf-grind':{k.box(0,0,0,w*.7,.15,d*.7,gry);k.cyl(0,.15,0,.15,.2,2.8,gry,12);k.box(0,2.95,0,.6,.6,.6,mc(T,0x2e6a4a,{r:.45}));[-1,1].forEach(function(s){disc(s*.6,3.25,0,.4,.15,mc(T,0x8a8a7a,{r:.95}),'x');var gd=new T.Mesh(new T.CylinderGeometry(.45,.45,.25,14,1,true,-Math.PI*.2,Math.PI*1.4),mc(T,0x2e6a4a,{side:T.DoubleSide}));gd.rotation.z=Math.PI/2;gd.position.set(s*.6,3.25,0);g.add(gd);k.box(s*.6,3.6,.3,.3,.2,.02,mc(T,0xdfeeff,{op:.5}))});k.box(0,3.6,-.2,.35,.2,.3,mc(T,0x3a3d44));return true}
  case 'mf-table':{var ft=mc(T,0x3a3d44,{m:.5,r:.4});k.legs(w,d,h-.4,.25,ft,.15);k.box(0,.6,0,w-.5,.1,d-.5,ft);k.box(0,h-.4,0,w,.4,d,ft);var hl=[];for(var hx=-w/2+.3;hx<w/2;hx+=.33)for(var hz=-d/2+.3;hz<d/2;hz+=.33)hl.push([hx,h+.001,hz,.09,.004,.09]);inst('cyl',mc(T,0x0a0a0a),hl);
   [[-w/4,.3],[w/5,-.4]].forEach(function(c){k.box(c[0],h,c[1],.1,.7,.1,mc(T,0xe0701f,{r:.4}));k.box(c[0],h+.65,c[1]+.2,.1,.1,.5,mc(T,0xe0701f,{r:.4}))});k.box(.6,h,.2,1.4,.15,.25,iron2);return true}
  case 'mf-spray':case 'mf-pcbooth':{var bw3=mc(T,0xe8e8e4,{r:.5}),pc=r==='mf-pcbooth';k.box(0,0,-d/2+.15,w,h,.3,mc(T,0x8a8f94,{r:.8}));[-1,1].forEach(function(s){k.box(s*(w/2-.05),0,0,.1,h,d,bw3)});k.box(0,h-.1,0,w,.1,d,bw3);var fl=[];for(var fx=-w/2+.6;fx<w/2;fx+=1.2)for(var fy=.6;fy<h;fy+=1.2)fl.push([fx,fy,-d/2+.31,1.1,1.1,.02]);inst('box',mc(T,0xd8d4c8,{r:.95}),fl);
   [-1,1].forEach(function(s){k.box(s*(w/2-.12),h*.5,0,.04,h*.6,.4,lit(0xffffff,1.4))});k.cyl(0,h,-d/2+1,pc?.6:.9,pc?.6:.9,2,gryL,16);if(pc){k.box(w/2+.4,0,-d/2+1,.8,h-1,1.6,mc(T,0x2b5fa8,{r:.45}));hcyl(0,h-.6,0,.04,w-.4,chrome,'x');k.box(.3,h-1.8,0,.6,1.1,.05,mc(T,0x9aa0a6,{m:.5}));k.box(w/2-.4,3,d/2-.4,.15,.35,.15,blk)}else{k.box(0,h*.55,d/2-.02,w*.6,.04,.04,mc(T,0x2a2b2e))}return true}
  case 'mf-pcoven':{var ov=mc(T,0xd8dde2,{m:.3,r:.45});k.box(0,0,0,w,h,d,ov);[-1,1].forEach(function(s){k.box(s*w/4,.15,d/2+.01,w/2-.06,h-.4,.08,ov);k.box(s*.15,h*.5,d/2+.08,.08,1.2,.08,chrome)});k.box(w/2+.3,h-2.6,d/2-.6,.5,1.2,.8,mc(T,0x2a2b2e));SC(w/2+.56,h-2.1,d/2-.6,.01,.01);k.box(w/2+.56,h-2.05,d/2-.6,.01,.25,.5,lit(0xff5533,1.4));k.cyl(0,h,-d/4,.3,.3,.8,gryL,12);var ins=[];for(var ii=1;ii<4;ii++)ins.push([-w/2-.005,h*ii/4,0,.01,.04,d]);inst('box',mc(T,0xaab0b6),ins);return true}
  }}
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

function exCeilShape(T,c,w,d,M){var g=new T.Group(),k=Kit(T,g),r=c.r,lamp=/^cl-/.test(r),drop=c.drop||0,
  blk=mc(T,0x1c1c1f,{r:.5}),dk=mc(T,0x2d3036,{m:.4,r:.45}),wht=mc(T,0xeeece6,{r:.5}),chr=mc(T,0xcfd3d6,{m:.85,r:.25}),alu=mc(T,0xb8bcc0,{m:.6,r:.35}),
  lc=r==='cl-growb'||r==='cl-growp'?0xd28cff:r==='cl-black'?0x9a5cff:r==='cl-stage'?0x8fe0ff:0xfff1cf,glow=mc(T,0xffffff,{e:lc,ei:2.2,r:.3}),
  D=new T.Object3D(),inst=function(geo,mat,arr){var m=new T.InstancedMesh(exGeo(T,geo),mat,arr.length);arr.forEach(function(a,i){D.position.set(a[0],a[1],a[2]);D.rotation.set(a[6]||0,a[7]||0,a[8]||0);D.scale.set(a[3],a[4],a[5]);D.updateMatrix();m.setMatrixAt(i,D.matrix)});m.castShadow=true;g.add(m);return m},
  disc=function(y,rad,mat,seg){var m=new T.Mesh(new T.CircleGeometry(rad,seg||24),mat);m.rotation.x=Math.PI/2;m.position.y=y;g.add(m);return m},
  cord=function(x,z,len,rad){var m=k.cyl(x,0,z,rad||.012,rad||.012,len,blk,6);return m},
  sph=function(x,y,z,rr,mat){var m=new T.Mesh(exGeo(T,'sph'),mat);m.scale.set(rr*2,rr*2,rr*2);m.position.set(x,y,z);g.add(m);return m},
  spin=null,res=function(){return {g:g,light:lamp?lc:null,spin:spin,cords:/^(cl-(pend|pool|task|shop|vapor|black|growb|growp|hbl|semi|drum|chand|sputnik|linear)|cs-sub|cc-unith|cc-irtube)$/.test(r)}};
 switch(r){
 /* ---------- Lighting ---------- */
 case 'cl-hbr':{var R=Math.min(w,d)/2;k.box(-.15,0,-.15,.3,.25,.3,dk);k.cyl(0,-.1,0,.05,.05,.1,chr);var fins=[];for(var i=0;i<16;i++){var a=i*Math.PI/8;fins.push([Math.cos(a)*R*.6,-.25,Math.sin(a)*R*.6,R*.75,.32,.03,0,-a,0])}inst('box',dk,fins);k.cyl(0,-.45,0,R*.45,R,.2,dk,28);disc(-.451,R*.92,glow,28);break}
 case 'cl-hbl':{k.box(0,-.25,0,w,.25,d,dk);var f2=[];for(var j=0;j<Math.floor(w/.12);j++)f2.push([-w/2+.06+j*.12,-.08,0,.03,.18,d*.9]);inst('box',dk,f2);[-1,1].forEach(function(s){cord(s*(w/2-.2),0,drop+.01)});var p=new T.Mesh(new T.PlaneGeometry(w*.94,d*.8),glow);p.rotation.x=Math.PI/2;p.position.y=-.26;g.add(p);break}
 case 'cl-shop':case 'cl-vapor':case 'cl-task':case 'cl-black':{var vap=r==='cl-vapor',hh=r==='cl-black'?.08:.18;k.box(0,-hh,0,w,hh,d,r==='cl-black'?blk:vap?mc(T,0x8d939a,{m:.3,r:.5}):wht);
  if(vap){var df=new T.Mesh(new T.CylinderGeometry(d*.45,d*.45,w-.1,14,1,false,0,Math.PI),mc(T,0xffffff,{e:lc,ei:1.6,op:.85,r:.3}));df.rotation.z=Math.PI/2;df.rotation.x=Math.PI;df.position.y=-hh;g.add(df);inst('box',mc(T,0x8d939a,{m:.4}),[[-w/3,-hh-.1,0,.06,.2,d+.04],[w/3,-hh-.1,0,.06,.2,d+.04]])}
  else{var nt=r==='cl-black'?1:2;for(var t=0;t<nt;t++){var tb=k.cyl(0,-hh-.06,(nt>1?(t-.5)*d*.45:0),.05,.05,w-.15,r==='cl-black'?mc(T,0x111111,{e:0x8a4aff,ei:2.4}):glow,10);tb.rotation.z=Math.PI/2;tb.position.y=-hh-.06}inst('box',r==='cl-black'?blk:wht,[[-w/2+.04,-hh-.08,0,.08,.16,d],[w/2-.04,-hh-.08,0,.08,.16,d]])}
  if(drop>.3)[-1,1].forEach(function(s){cord(s*(w/2-.4),0,drop+.01)});break}
 case 'cl-wafer':{var rw=Math.min(w,d)/2;k.cyl(0,-.03,0,rw,rw,.03,wht,24);disc(-.031,rw*.82,glow);break}
 case 'cl-flush':{var rf=Math.min(w,d)/2;k.cyl(0,drop-.06,0,rf*.8,rf*.8,.06,wht,24);var dm=sph(0,drop-.06,0,rf*.9,mc(T,0xffffff,{e:lc,ei:1.4,op:.95,r:.35}));dm.scale.y=.55;k.cyl(0,drop-.06-rf*.45,0,.05,.05,.04,mc(T,0xd9b86a,{m:.35,r:.35}),10);break}
 case 'cl-semi':{var rs=Math.min(w,d)/2,brass=mc(T,0xd9b86a,{m:.35,r:.35});k.cyl(0,drop-.06,0,.22,.22,.06,brass,18);k.cyl(0,.35,0,.025,.025,drop-.4,brass,8);[0,1,2].forEach(function(i){var a=i*2.094;k.box(Math.cos(a)*rs*.45,.25,Math.sin(a)*rs*.45,.03,.18,.03,brass)});
  var bw=new T.Mesh(new T.SphereGeometry(rs*.9,28,14,0,Math.PI*2,Math.PI/2,Math.PI/2),mc(T,0xffffff,{e:lc,ei:1.5,op:.92,r:.25}));bw.scale.y=.6;bw.position.y=.32;g.add(bw);var rim=new T.Mesh(new T.TorusGeometry(rs*.9,.025,6,32),brass);rim.rotation.x=Math.PI/2;rim.position.y=.32;g.add(rim);k.cyl(0,.32-rs*.54-.06,0,.04,.02,.08,brass,8);break}
 case 'cl-drum':{var rd2=Math.min(w,d)/2,fab=mc(T,0xe9e1d0,{r:.95,e:0xffd9a0,ei:.35});k.cyl(0,drop-.05,0,.2,.2,.05,wht,16);cord(0,0,drop);var dr=new T.Mesh(new T.CylinderGeometry(rd2,rd2,.8,36,1,true),fab);dr.material.side=T.DoubleSide;dr.position.y=.4;dr.castShadow=true;g.add(dr);
  [0,.8].forEach(function(y){var t=new T.Mesh(new T.TorusGeometry(rd2,.015,4,36),mc(T,0x8a7a5a,{m:.5}));t.rotation.x=Math.PI/2;t.position.y=y;g.add(t)});disc(.02,rd2*.97,mc(T,0xffffff,{e:lc,ei:1.6,op:.9,r:.3}),36);sph(0,.4,0,.12,mc(T,0xffffff,{e:0xffd9a0,ei:2.4}));break}
 case 'cl-chand':{var rc=Math.min(w,d)/2,br=mc(T,0xd9b86a,{m:.35,r:.35});k.cyl(0,drop-.06,0,.22,.22,.06,br,16);var ch=[];for(var y5=.9;y5<drop-.06;y5+=.12)ch.push([0,y5,0,.04,.08,.02,0,(Math.round(y5/.12)%2)*Math.PI/2,0]);inst('box',br,ch);
  k.cyl(0,0,0,.08,.14,.9,br,14);sph(0,-.05,0,.09,br);var cn=[],fl=[];for(var i6=0;i6<6;i6++){var a6=i6*Math.PI/3,ax=Math.cos(a6)*rc*.8,az=Math.sin(a6)*rc*.8,arm=k.box(ax/2,.25,az/2,rc*.8,.04,.04,br);arm.rotation.y=-a6;
   k.cyl(ax,.22,az,.1,.06,.06,br,12);cn.push([ax,.44,az,.06,.34,.06]);fl.push([ax,.66,az,.07,.12,.07])}inst('cyl',mc(T,0xf6f1e4,{r:.5}),cn);inst('sph',mc(T,0xffffff,{e:0xffc070,ei:2.6}),fl);break}
 case 'cl-sputnik':{var rp=Math.min(w,d)/2,br2=mc(T,0xd9b86a,{m:.35,r:.35});k.cyl(0,drop-.06,0,.2,.2,.06,br2,16);k.cyl(0,.15,0,.025,.025,drop-.2,br2,8);sph(0,0,0,.18,br2);var rodsS=[],bulbs=[];
  for(var i7=0;i7<12;i7++){var th=Math.acos(1-2*(i7+.5)/12),ph=i7*2.4,dx=Math.sin(th)*Math.cos(ph),dy=Math.cos(th)*.7,dz=Math.sin(th)*Math.sin(ph),L=rp*(i7%2?.75:.95);
   var rod=new T.Mesh(exGeo(T,'cyl'),br2);rod.scale.set(.025,L,.025);rod.position.set(dx*L/2,dy*L/2,dz*L/2);rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx,dy,dz).normalize());g.add(rod);bulbs.push([dx*L,dy*L,dz*L,.13,.13,.13])}
  inst('sph',mc(T,0xffffff,{e:0xffd9a0,ei:2.6}),bulbs);break}
 case 'cl-linear':{k.box(0,0,0,w,.18,d*.45,mc(T,0x1c1c1f,{r:.4}));var lp=new T.Mesh(new T.PlaneGeometry(w-.1,d*.35),glow);lp.rotation.x=Math.PI/2;lp.position.y=-.001;g.add(lp);[-1,1].forEach(function(s2){cord(s2*(w/2-.5),0,drop,.008);k.cyl(s2*(w/2-.5),drop-.04,0,.12,.12,.04,mc(T,0x1c1c1f),12)});break}
 case 'cl-panel':case 'cl-down':case 'cs-inceil':{var round=r!=='cl-panel',sp=r==='cs-inceil';if(round){var rr=Math.min(w,d)/2;var ring=new T.Mesh(new T.TorusGeometry(rr*.85,rr*.12,6,28),wht);ring.rotation.x=Math.PI/2;ring.position.y=-.03;g.add(ring);
   if(sp){disc(-.02,rr*.8,mc(T,0xd8d6d0,{r:.8}));var dots=[];for(var q=0;q<40;q++){var aa=q*2.4,rd=Math.sqrt(q/40)*rr*.7;dots.push([Math.cos(aa)*rd,-.025,Math.sin(aa)*rd,.04,.005,.04])}inst('cyl',mc(T,0x6a6a66),dots)}else{k.cyl(0,-.05,0,rr*.75,rr*.7,.05,wht,24);disc(-.051,rr*.62,glow)}}
  else{k.box(0,-.06,0,w,.06,d,wht);var pp=new T.Mesh(new T.PlaneGeometry(w-.12,d-.12),glow);pp.rotation.x=Math.PI/2;pp.position.y=-.061;g.add(pp)}break}
 case 'cl-cage':{k.cyl(0,-.15,0,.35,.35,.15,dk,16);sph(0,-.55,0,.32,mc(T,0xffffff,{e:lc,ei:1.8,op:.9,r:.2}));var rods=[];for(var i2=0;i2<6;i2++){var a2=i2*Math.PI/3;rods.push([Math.cos(a2)*.38,-.55,Math.sin(a2)*.38,.025,.75,.025])}inst('cyl',dk,rods);[-.3,-.6,-.88].forEach(function(y){var tr=new T.Mesh(new T.TorusGeometry(.38,.02,4,20),dk);tr.rotation.x=Math.PI/2;tr.position.y=y;g.add(tr)});break}
 case 'cl-pool':{var shade=mc(T,0x1f5a3a,{r:.4,m:.1});k.box(0,-.5,0,w,.5,d,shade);k.box(0,-.08,0,w*.9,.08,d*.8,mc(T,0x6b4027,{r:.4}));inst('box',mc(T,0xc9a24a,{m:.7,r:.3}),[[0,-.52,d/2,w,.06,.04],[0,-.52,-d/2,w,.06,.04]]);[-1,0,1].forEach(function(s){var dd=disc(-.51,.3,glow);dd.position.x=s*w*.33});[-1,1].forEach(function(s){cord(s*(w/2-.6),0,drop+.01,.015)});break}
 case 'cl-pend':{k.box(0,drop-.08,0,w,.08,.35,dk);var np=3;for(var i3=0;i3<np;i3++){var px=-w/2+w*(i3+.5)/np;cord(px,0,drop-.08);k.cyl(px,-.5,0,.1,.38,.5,mc(T,0x2a2a2a,{m:.6,r:.3}),18);sph(px,-.45,0,.13,mc(T,0xffffff,{e:0xffd9a0,ei:2.4}))}break}
 case 'cl-track':{k.box(0,-.08,0,w,.08,.12,blk);var nh=Math.max(3,Math.round(w/2));for(var i4=0;i4<nh;i4++){var hx=-w/2+w*(i4+.5)/nh,kk=new T.Group();kk.position.set(hx,-.08,0);kk.rotation.x=(i4%2?.5:-.5);g.add(kk);var k2=Kit(T,kk);k2.cyl(0,-.15,0,.03,.03,.15,blk);k2.cyl(0,-.55,0,.14,.12,.4,blk,14);var lf=new T.Mesh(new T.CircleGeometry(.11,14),glow);lf.rotation.x=Math.PI/2;lf.position.y=-.551;kk.add(lf)}break}
 case 'cl-wash':{k.box(-w*.3,-.1,0,.15,.1,.15,blk);var hd=new T.Group();hd.position.set(0,-.2,0);hd.rotation.x=-.8;g.add(hd);var k3=Kit(T,hd);k3.box(0,-.2,0,w,.4,d,blk);var wf=new T.Mesh(new T.PlaneGeometry(w-.1,d-.1),glow);wf.rotation.x=Math.PI/2;wf.position.y=-.201;hd.add(wf);break}
 case 'cl-growb':case 'cl-growp':{var bar=r==='cl-growb';if(bar){var nb=Math.max(4,Math.round(w/.55)),bs=[],bl=[];for(var b=0;b<nb;b++){var bx=-w/2+w*(b+.5)/nb;bs.push([bx,-.06,0,.3,.06,d]);bl.push([bx,-.095,0,.22,.01,d-.1])}inst('box',dk,bs);inst('box',mc(T,0x111111,{e:0xf0b0ff,ei:2.2}),bl);inst('box',dk,[[0,-.03,-d/2+.1,w,.06,.1],[0,-.03,d/2-.1,w,.06,.1]]);k.box(0,0,0,.8,.15,.4,dk)}
  else{k.box(0,-.12,0,w,.12,d,dk);var dots2=[];for(var a3=0;a3<10;a3++)for(var b3=0;b3<10;b3++)dots2.push([-w/2+.15+a3*(w-.3)/9,-.125,-d/2+.15+b3*(d-.3)/9,.05,.01,.05]);inst('box',mc(T,0x111111,{e:(a3+b3)%3?0xff5ad0:0xffffff,ei:2.4}),dots2);k.box(0,0,0,.5,.12,.3,dk)}
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){var cd=new T.Mesh(exGeo(T,'cyl'),mc(T,0x9aa0a6,{m:.6}));cd.scale.set(.015,drop,.015);cd.position.set(q[0]*(w/2-.1)*.6,drop/2,q[1]*(d/2-.1)*.6);cd.rotation.set(q[1]*.12,0,-q[0]*.12);g.add(cd)});break}
 case 'cl-stage':{k.box(0,-.15,0,.8,.15,.6,blk);var yk=new T.Group();yk.position.y=-.15;yk.rotation.y=.6;g.add(yk);var ky=Kit(T,yk);[-1,1].forEach(function(s){ky.box(s*.32,-.6,0,.08,.6,.2,blk)});var hd2=new T.Group();hd2.position.y=-.55;hd2.rotation.x=.7;yk.add(hd2);var kh=Kit(T,hd2);var hc=kh.cyl(0,-.3,0,.24,.2,.55,mc(T,0x111114,{r:.4}),16);var lz=new T.Mesh(new T.CircleGeometry(.17,16),mc(T,0x111111,{e:0x8fe0ff,ei:3}));lz.rotation.x=Math.PI/2;lz.position.y=-.31;hd2.add(lz);break}
 /* ---------- Sound ---------- */
 case 'cs-pend':{var bel=new T.Mesh(new T.CylinderGeometry(.2,w*.45,.9,20),wht);bel.position.y=-.45;g.add(bel);disc(-.901,w*.43,mc(T,0x6a6a66,{r:.8}),20);k.cyl(0,-.06,0,.15,.15,.06,wht);break}
 case 'cs-surf':case 'cs-impact':{var imp=r==='cs-impact';k.box(0,-.15,-d/2+.1,.4,.15,.2,dk);var sb=new T.Group();sb.position.set(0,-.25,0);sb.rotation.x=.45;g.add(sb);var ks=Kit(T,sb);ks.box(0,-.6,0,w,.75,d*.7,imp?mc(T,0x2a2b2e,{r:.6}):blk);var gr=new T.Mesh(new T.PlaneGeometry(w-.1,.65),mc(T,0x3a3d44,{r:.9,side:T.DoubleSide}));gr.position.set(0,-.22,d*.35+.01);sb.add(gr);
  if(imp){var bars=[];for(var gi=0;gi<6;gi++)bars.push([-w/2+.1+gi*(w-.2)/5,-.22,d*.35+.05,.03,.72,.03]);bars.forEach(function(bb){ks.box(bb[0],-.58,bb[2],bb[3],bb[4],bb[5],chr)})}break}
 case 'cs-sub':{k.box(0,-.9,0,w,.9,d,blk);var cn=k.cyl(0,-.92,0,w*.38,w*.38,.03,mc(T,0x2a2a2e,{r:.5}),24);[-1,1].forEach(function(s){cord(s*(w/2-.2),0,drop+.01,.015)});break}
 /* ---------- Comfort ---------- */
 case 'cc-hvls':case 'cc-fan':{var hv=r==='cc-hvls',R2=Math.min(w,d)/2,hub=new T.Group();g.add(hub);var kk2=Kit(T,hub);k.cyl(0,-.9,0,hv?.55:.3,hv?.55:.35,.9,hv?mc(T,0xd8dde2,{m:.4,r:.4}):mc(T,0x3a3d44,{m:.4}),18);
  var nbl=hv?8:5,bm=hv?mc(T,0xcfe0e4,{m:.5,r:.35}):mc(T,0x8a6a4a,{r:.6}),bw=hv?.6:.45;for(var bi=0;bi<nbl;bi++){var ba=bi*Math.PI*2/nbl,bg=new T.Group();bg.rotation.y=ba;hub.add(bg);var bl2=new T.Mesh(exGeo(T,'box'),bm);bl2.scale.set(R2*.9,hv?.06:.04,bw);bl2.position.set(R2*.5,-.95,0);bl2.rotation.x=hv?.08:.12;bl2.castShadow=true;bg.add(bl2);
   if(hv){var wl=new T.Mesh(exGeo(T,'box'),bm);wl.scale.set(.06,.35,bw);wl.position.set(R2*.95,-.85,0);bg.add(wl)}else{var br=new T.Mesh(exGeo(T,'box'),mc(T,0x3a3d44,{m:.4}));br.scale.set(.6,.04,.12);br.position.set(.45,-.9,0);bg.add(br)}}
  if(!hv){var bowl=new T.Mesh(new T.SphereGeometry(.35,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2),mc(T,0xffffff,{e:0xfff0d0,ei:1.4,op:.95}));bowl.position.y=-1;g.add(bowl)}else{[-1,1].forEach(function(s){var cb=new T.Mesh(exGeo(T,'cyl'),mc(T,0x9aa0a6,{m:.6}));cb.scale.set(.02,drop+1,.02);cb.position.set(s*.6,(drop-1)/2,0);cb.rotation.z=s*.25;g.add(cb)})}
  spin={o:hub,v:hv?1.1:4.5};break}
 case 'cc-unith':{var uh=mc(T,0xd8d4c8,{r:.5});k.box(0,-1.4,0,w,1.4,d,uh);var lv=[];for(var li=0;li<8;li++)lv.push([0,-1.3+li*.15,d/2+.02,w-.2,.02,.14,-.5]);inst('box',mc(T,0x9a958c),lv);var fg=new T.Mesh(new T.CircleGeometry(.55,20),mc(T,0x2a2a2a,{r:.8,side:T.DoubleSide}));fg.position.set(0,-.7,-d/2-.01);g.add(fg);
  [-1,1].forEach(function(s){cord(s*(w/2-.3),0,drop+.01,.03)});k.box(w/2+.05,-.6,-.2,.15,.15,.15,dk);break}
 case 'cc-irtube':{[-1,1].forEach(function(s){var rf=k.box(0,-.35,s*d*.22,w,.04,d*.55,alu);rf.rotation.x=s*.6;rf.position.set(0,-.25,s*d*.22)});var tb2=k.cyl(0,-.5,0,.12,.12,w-.8,mc(T,0x5a4a40,{m:.5,e:0xff4a1a,ei:.35}),12);tb2.rotation.z=Math.PI/2;tb2.position.y=-.45;k.box(-w/2+.4,-.9,0,.8,.9,.9,mc(T,0x9a958c,{m:.3}));
  for(var ci=-w/2+3;ci<w/2;ci+=5)cord(ci,0,drop+.01,.015);break}
 case 'cc-cassette':{k.box(0,-.9,0,w*.85,.9,d*.85,mc(T,0xd8d6d0,{r:.5}));k.box(0,-.95,0,w,.05,d,wht);var sl=[];[[0,-d/2+.25,w*.6,.18],[0,d/2-.25,w*.6,.18],[-w/2+.25,0,.18,d*.6],[w/2-.25,0,.18,d*.6]].forEach(function(s){sl.push([s[0],-.955,s[1],s[2],.01,s[3]])});inst('box',mc(T,0x6a6a66),sl);var gl2=[];for(var gx=0;gx<6;gx++)gl2.push([-w*.18+gx*w*.072,-.957,0,.02,.01,w*.36]);inst('box',mc(T,0xb0aea8),gl2);break}
 default:k.box(0,-.4,0,w,.4,d,blk)}
 return res()}

/* ---------- the scene ---------- */
function exBuild(){var T=EX.T,W=P.room.w,D=P.room.d,H=P.room.h||10,S=new T.Scene();S.background=new T.Color(0x1b1b1d);S.fog=new T.Fog(0x1b1b1d,Math.max(W,D)*1.2,Math.max(W,D)*3);
 var M={dark:exMat(T,0x26262a,{r:.5}),steel:exMat(T,0xaeb3b8,{m:.7,r:.35}),white:exMat(T,0xeeece6,{r:.5}),felt:exMat(T,0x1f6b4a,{r:.95}),
  wood:exMat(T,0x6b4027,{r:.45,map:exTex(T,function(g,s){g.fillStyle='#6b4027';g.fillRect(0,0,s,s);for(var i=0;i<70;i++){g.strokeStyle='rgba(30,15,5,'+(Math.random()*.25)+')';g.lineWidth=1+Math.random()*3;g.beginPath();var y=Math.random()*s;g.moveTo(0,y);g.bezierCurveTo(s/3,y+8,s*2/3,y-8,s,y);g.stroke()}},256,[1,1])})};
 var floor=new T.Mesh(new T.PlaneGeometry(W,D),exMat(T,0xb9b4ab,{r:.55,map:exTex(T,function(g,s){g.fillStyle='#aaa59c';g.fillRect(0,0,s,s);for(var i=0;i<s*s/8;i++){g.fillStyle='rgba('+(Math.random()<.5?'0,0,0':'255,255,255')+','+(Math.random()*.05)+')';g.fillRect(Math.random()*s,Math.random()*s,2,2)}g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=3;g.strokeRect(0,0,s,s);for(var k=0;k<12;k++){g.fillStyle='rgba(80,70,60,'+(Math.random()*.05)+')';g.beginPath();g.arc(Math.random()*s,Math.random()*s,20+Math.random()*70,0,7);g.fill()}},512,[W/10,D/10])}));
 floor.rotation.x=-Math.PI/2;floor.position.set(W/2,0,D/2);floor.receiveShadow=true;S.add(floor);
 var wallM=exMat(T,0xc4c8cc,{m:.25,r:.55,map:exTex(T,function(g,s){g.fillStyle='#c4c8cc';g.fillRect(0,0,s,s);for(var x=0;x<s;x+=16){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x,0,6,s);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x+6,0,3,s)}},256,[1,1])});
 var wall=function(x,z,w,d,len){var m=new T.Mesh(new T.BoxGeometry(w,H,d),wallM.clone());m.layers.enable(2);m.material.map=wallM.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(len/6,H/6);m.position.set(x,H/2,z);m.receiveShadow=true;S.add(m)};
 // outside walls, with openings for exterior doors and roll-up doors
 var EO=(P.edoors||[]).slice(),EWN=(P.ewins||[]).slice(),OUT=EO.length>0||EWN.length>0,rng=(function(){var x=7;return function(){x=(x*16807)%2147483647;return (x-1)/2147483646}})(),
  bas=function(hex,map){return new T.MeshBasicMaterial({color:hex,map:map||null})},
  skinM=OUT?bas(0xb9bec3,exTex(T,function(g,s){g.fillStyle='#c9cdd1';g.fillRect(0,0,s,s);for(var x=0;x<s;x+=16){g.fillStyle='rgba(0,0,0,.10)';g.fillRect(x,0,5,s);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+5,0,3,s)}},256,[1,1])):null,
  skin=function(sd,a,b,y0,y1){if(!OUT||b-a<.01||y1-y0<.01)return;var m=skinM.clone();m.map=skinM.map.clone();m.map.needsUpdate=true;m.map.repeat.set((b-a)/6,(y1-y0)/6);var pl=new T.Mesh(new T.PlaneGeometry(b-a,y1-y0),m),c=(a+b)/2,y=(y0+y1)/2;
   if(sd==='n'){pl.position.set(c,y,-.505);pl.rotation.y=Math.PI}else if(sd==='s'){pl.position.set(c,y,D+.505)}else if(sd==='w'){pl.position.set(-.505,y,c);pl.rotation.y=-Math.PI/2}else{pl.position.set(W+.505,y,c);pl.rotation.y=Math.PI/2}S.add(pl)},
  piece=function(sd,a,b,y0,y1){if(b-a<.01||y1-y0<.01)return;var len=b-a,hor=sd==='n'||sd==='s',m=new T.Mesh(new T.BoxGeometry(hor?len:.5,y1-y0,hor?.5:len),wallM.clone());m.layers.enable(2);m.material.map=wallM.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(len/6,(y1-y0)/6);
   var c=(a+b)/2,y=(y0+y1)/2;if(sd==='n')m.position.set(c,y,-.25);else if(sd==='s')m.position.set(c,y,D+.25);else if(sd==='w')m.position.set(-.25,y,c);else m.position.set(W+.25,y,c);m.receiveShadow=true;m.castShadow=OUT;S.add(m);skin(sd,a,b,y0,y1);
   if(y0<.01)EX.wallSolid.push(hor?{x:a,z:sd==='n'?-.5:D,w:len,d:.5}:{x:sd==='w'?-.5:W,z:a,w:.5,d:len})};
 EX.wallSolid=[];['n','s','w','e'].forEach(function(sd){var hor=sd==='n'||sd==='s',L=hor?W:D,lo=hor?-.5:0,hi=hor?L+.5:L,cur=lo;
  EO.filter(function(d){return d.s===sd}).map(function(d){return [d.t,d.t+d.len,0,d.k==='roll'?eH(d):(d.h||6.67)+.25]}).concat(ewinsOn(sd)).sort(function(a,b){return a[0]-b[0]}).forEach(function(o){piece(sd,cur,o[0],0,H);if(o[2]>0)piece(sd,o[0],o[1],0,o[2]);piece(sd,o[0],o[1],Math.min(o[3],H),H);cur=o[1]});piece(sd,cur,hi,0,H)});
 // a window in a wall: frame, sill and glass (clear and tinted glass let light through; frosted glows and holds it back)
 var winModel=function(cx,cz,hor,len,y0,y1,dep,w){var fm=exMat(T,0xf2f1ec,{r:.5}),fw=.16,gh=y1-y0,
   gm=w.gt==='frost'?exMat(T,0xf3f6f8,{op:.88,r:.6,e:0xfff6e6,ei:.18}):w.gt==='tint'?exMat(T,0x5f7686,{op:.5,r:.05,m:.3}):exMat(T,0xcfe6f2,{op:.22,r:.03,m:.2}),
   bx2=function(x,y,z,a,h,d2,m){var me=new T.Mesh(new T.BoxGeometry(hor?a:d2,h,hor?d2:a),m);me.position.set(x,y,z);S.add(me);return me};
  [-1,1].forEach(function(q){var o=q*(len/2-fw/2);bx2(cx+(hor?o:0),y0+gh/2,cz+(hor?0:o),fw,gh,dep+.04,fm)});bx2(cx,y1-fw/2,cz,len,fw,dep+.04,fm);bx2(cx,y0+.05,cz,len+.3,.1,dep+.3,fm);
  if(w.ty==='slider')bx2(cx,y0+gh/2,cz,.1,gh,dep*.6,fm);
  var gp=bx2(cx,y0+gh/2,cz,len-fw*2,gh-fw-.1,.05,gm);gp.castShadow=w.gt==='frost';if(w.gt==='frost')gp.layers.enable(2)};
 ['n','s','w','e'].forEach(function(sd){var hor=sd==='n'||sd==='s';EWN.filter(function(w){return w.s===sd}).forEach(function(w){var c=w.t+w.len/2;winModel(hor?c:(sd==='w'?-.25:W+.25),hor?(sd==='n'?-.25:D+.25):c,hor,w.len,w.sill,Math.min(wTop(w),H),.5,w)})});
 if(OUT){var roof=new T.Mesh(new T.BoxGeometry(W+1.2,.5,D+1.2),[bas(0x8e9296),bas(0x8e9296),bas(0x6f7377),bas(0x6f7377),bas(0x8e9296),bas(0x8e9296)]);roof.position.set(W/2,H+.32,D/2);S.add(roof)}
 var ceil=new T.Mesh(new T.PlaneGeometry(W,D),exMat(T,0xd9dbde,{r:.95}));ceil.rotation.x=Math.PI/2;ceil.position.set(W/2,H,D/2);ceil.receiveShadow=true;S.add(ceil);
 // objects
 EX.solid=[];EX.spin=[];var lights=[];
 // exterior doors and roll-up doors
 EO.forEach(function(d){var g=eGeo(d),hor=d.s==='n'||d.s==='s',n=g.n,L=d.len,mid={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2},wc=function(off){return {x:mid.x-n.x*off,y:mid.y-n.y*off}},
   bx=function(cx,cy,cz,along,h,thick,mat){var m=new T.Mesh(new T.BoxGeometry(hor?along:thick,h,hor?thick:along),mat);m.position.set(cx,cy,cz);m.castShadow=true;m.receiveShadow=true;S.add(m);return m};
  if(d.k==='roll'){var hh=Math.min(eH(d),H),c=wc(.25),outIdx={n:5,s:4,w:1,e:0}[d.s],
    slat=exTex(T,function(gg,sz){gg.fillStyle='#b7bcc1';gg.fillRect(0,0,sz,sz);for(var y=0;y<sz;y+=16){gg.fillStyle='rgba(0,0,0,.16)';gg.fillRect(0,y,sz,3);gg.fillStyle='rgba(255,255,255,.22)';gg.fillRect(0,y+3,sz,2)}},128,[1,1]);slat.repeat.set(L/4,hh/4);
    var inM=exMat(T,0xc3c8cd,{m:.35,r:.45,map:slat}),outM=new T.MeshBasicMaterial({color:0xc9cdd2,map:slat}),mats=[inM,inM,inM,inM,inM,inM];mats[outIdx]=outM;
   var cur=bx(c.x,hh/2,c.y,L,hh,.12,mats);cur.layers.enable(2);EX.solid.push({x:Math.min(g.a.x,g.b.x)-(hor?0:.3),z:Math.min(g.a.y,g.b.y)-(hor?.3:0),w:hor?L:.6,d:hor?.6:L});
   var ci=wc(-.15);bx(ci.x,.1,ci.y,L,.2,.2,M.dark);var hd2=wc(-.12);bx(hd2.x,1.2,hd2.y,.6,.1,.12,M.steel);
   [g.a,g.b].forEach(function(p,i){var sgn=i?-1:1,tx=p.x+(hor?sgn*.15:0)+n.x*.25,tz=p.y+(hor?0:sgn*.15)+n.y*.25;var m=new T.Mesh(new T.BoxGeometry(hor?.25:.3,Math.min(hh+.6,H),hor?.3:.25),M.steel);m.position.set(tx,Math.min(hh+.6,H)/2,tz);m.castShadow=true;S.add(m)});
   var cy=Math.min(hh+.95,H-.9),coil=new T.Mesh(new T.CylinderGeometry(.85,.85,L+.6,20),exMat(T,0x9aa0a6,{m:.5,r:.4}));coil.rotation[hor?'z':'x']=Math.PI/2;coil.position.set(mid.x+n.x*.95,cy,mid.y+n.y*.95);coil.castShadow=true;S.add(coil);
   if(d.op){var mo=new T.Mesh(new T.BoxGeometry(1.1,1,1.1),exMat(T,0x3d4148,{r:.4}));var e2=hor?{x:Math.max(g.a.x,g.b.x)+.9,y:mid.y}:{x:mid.x,y:Math.max(g.a.y,g.b.y)+.9};mo.position.set(e2.x+n.x*.9,cy,e2.y+n.y*.9);mo.castShadow=true;S.add(mo);
    var bt=new T.Mesh(new T.BoxGeometry(.25,.4,.1),exMat(T,0xeeece6,{r:.5}));var b2=hor?{x:Math.max(g.a.x,g.b.x)+.7,y:mid.y}:{x:mid.x,y:Math.max(g.a.y,g.b.y)+.7};bt.position.set(b2.x+n.x*.06,4.5,b2.y+n.y*.06);if(!hor)bt.rotation.y=Math.PI/2;S.add(bt)}
   return}
  // walk-in door: steel frame and leaf (shown open), lever handle, optional glass panel
  var fh=(d.h||6.67),frM=exMat(T,0x4a4f55,{m:.4,r:.45}),lfM=exMat(T,0x6d7378,{m:.35,r:.45}),f0=wc(.25);
  [g.a,g.b].forEach(function(p,i){var sgn=i?-1:1;var m=new T.Mesh(new T.BoxGeometry(hor?.18:.6,fh+.2,hor?.6:.18),frM);m.position.set(p.x+(hor?sgn*.09:0)-n.x*.25,(fh+.2)/2,p.y+(hor?0:sgn*.09)-n.y*.25);S.add(m)});
  bx(f0.x,fh+.1,f0.y,L+.36,.2,.6,frM);
  var leaf=function(h0,len,dir){var sn=g.sn,lm=new T.Mesh(new T.BoxGeometry(sn.x!==0?len-.05:.16,fh,sn.x!==0?.16:len-.05),lfM);lm.position.set(h0.x+sn.x*len/2,fh/2,h0.y+sn.y*len/2);lm.castShadow=true;S.add(lm);
    var tip={x:h0.x+sn.x*len,y:h0.y+sn.y*len},lv=new T.Mesh(new T.BoxGeometry(sn.x!==0?.08:.5,.08,sn.x!==0?.5:.08),M.steel);lv.position.set(tip.x-sn.x*.3+dir.x*.18,3.4,tip.y-sn.y*.3+dir.y*.18);S.add(lv);
    if(d.gl){var gp=new T.Mesh(new T.BoxGeometry(sn.x!==0?len*.45:.18,fh*.32,sn.x!==0?.18:len*.45),exMat(T,0xbfd6e4,{op:.45,r:.05,m:.2}));gp.position.set(h0.x+sn.x*len*.55,fh*.66,h0.y+sn.y*len*.55);gp.castShadow=false;S.add(gp)}
    EX.solid.push({x:Math.min(h0.x,tip.x)-.1,z:Math.min(h0.y,tip.y)-.1,w:Math.abs(tip.x-h0.x)+.2,d:Math.abs(tip.y-h0.y)+.2})};
  var side=hor?{x:1,y:0}:{x:0,y:1};if(L>=5){leaf(g.a,L/2,side);leaf(g.b,L/2,side)}else leaf(g.h,L,side)});
 // the outdoors, drawn unlit (it's daytime out there): ground, aprons and walks, a few neighbours, trees and sky
 if(OUT){S.background=new T.Color(0xdfe8ef);S.fog=new T.Fog(0xdfe8ef,Math.max(W,D)*1.6,520);
  var sky=new T.Mesh(new T.SphereGeometry(540,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{},vertexShader:'varying float vy;void main(){vy=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying float vy;void main(){vec3 hz=vec3(.875,.91,.937),zn=vec3(.47,.64,.84);gl_FragColor=vec4(mix(hz,zn,clamp(vy*1.6,0.,1.)),1.);}'}));sky.position.set(W/2,0,D/2);S.add(sky);
  var tx=function(base,dots,sz,rep){var t=exTex(T,function(gg,s2){gg.fillStyle=base;gg.fillRect(0,0,s2,s2);for(var i=0;i<s2*s2/14;i++){gg.fillStyle=dots[i%dots.length];gg.fillRect(Math.random()*s2,Math.random()*s2,sz,sz)}},256,[1,1]);t.repeat.set(rep[0],rep[1]);return t},
   flat=function(x,z,w,d,y,mat){var m=new T.Mesh(new T.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);S.add(m)};
  flat(W/2,D/2,1100,1100,-.5,bas(0xffffff,tx('#8b9a6c',['#7f8e60','#96a578','#86955f'],2,[140,140])));
  flat(W/2,D/2,W+8,D+8,-.25,bas(0xffffff,tx('#c2bfb7',['#b3b0a8','#cdcac2'],2,[(W+8)/8,(D+8)/8])));
  EO.forEach(function(d){var g=eGeo(d),n=g.n,mid={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2},hor=d.s==='n'||d.s==='s',len=d.k==='roll'?40:12,wid=d.k==='roll'?d.len+10:d.len+3,c={x:mid.x-n.x*(len/2+.5),y:mid.y-n.y*(len/2+.5)};
   if(d.k==='roll'){flat(c.x,c.y,hor?wid:len,hor?len:wid,-.12,bas(0xffffff,tx('#56595d',['#4b4e52','#616468','#5a5d61'],2,[wid/6,len/6])));
    [-1,1].forEach(function(q){var lx=c.x+(hor?q*(wid/2-.3):0),lz=c.y+(hor?0:q*(wid/2-.3));flat(lx,lz,hor?.3:len,hor?len:.3,-.08,bas(0xe8e2c9))})}
   else flat(c.x,c.y,hor?wid:len,hor?len:wid,-.12,bas(0xffffff,tx('#cbc8c0',['#bdbab2','#d6d3cb'],2,[wid/4,len/4])))});
  var R0=Math.max(W,D)/2,cx0=W/2,cz0=D/2;
  for(var bi=0;bi<12;bi++){var ang=bi/12*Math.PI*2+rng()*.3,dist=R0+140+rng()*160,bw2=30+rng()*60,bd2=30+rng()*50,bh=12+rng()*22,sh=[0xa9adb2,0xbfc3c7,0x9ea2a7,0x9ea2a7,0xb4b8bd,0xa4a8ad].map(function(v){return bas(v)}),
    bm=new T.Mesh(new T.BoxGeometry(bw2,bh,bd2),sh);bm.position.set(cx0+Math.cos(ang)*dist,bh/2,cz0+Math.sin(ang)*dist);bm.rotation.y=ang;S.add(bm)}
  var leafA=bas(0x5d7f45),leafB=bas(0x6f9452),trunk=bas(0x6b5440);
  for(var ti=0;ti<26;ti++){var a2=rng()*Math.PI*2,d2=R0+45+rng()*110,tx2=cx0+Math.cos(a2)*d2,tz2=cz0+Math.sin(a2)*d2,th=12+rng()*14;
   var tr=new T.Mesh(new T.CylinderGeometry(.5,.7,th*.35,8),trunk);tr.position.set(tx2,th*.175,tz2);S.add(tr);
   var f1=new T.Mesh(new T.ConeGeometry(th*.28,th*.55,10),leafA);f1.position.set(tx2,th*.55,tz2);S.add(f1);var f2=new T.Mesh(new T.ConeGeometry(th*.2,th*.4,10),leafB);f2.position.set(tx2,th*.82,tz2);S.add(f2)}}
 // floor surfaces: textured slabs a hair above the concrete, with painted lines for bays and rinks
 if(P.floors&&P.floors.length){var rnd=function(a){a=a||1;return Math.random()*a},speck=function(g,s,n,cols,sz){for(var i=0;i<n;i++){g.fillStyle=cols[i%cols.length];g.fillRect(rnd(s),rnd(s),sz,sz)}},
   FT={wood:[4,.6,function(g,s){var h=s/8;for(var r=0;r<8;r++){g.fillStyle=r%2?'#c4935c':'#cf9f68';g.fillRect(0,r*h,s,h);g.fillStyle='rgba(90,55,20,.08)';for(var q=0;q<30;q++)g.fillRect(rnd(s),r*h+rnd(h),rnd(s/3),1);g.fillStyle='#8e6232';g.fillRect(0,r*h,s,1.5);var j=(r*0.37%1)*s;g.fillRect(j,r*h,2,h);g.fillRect((j+s*.55)%s,r*h,2,h)}}],
    carpet:[2,.98,function(g,s){g.fillStyle='#8d93a3';g.fillRect(0,0,s,s);speck(g,s,9000,['#7d8394','#9ba1b0','#878d9d'],1.5);g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,0,s,1.5);g.fillRect(0,0,1.5,s)}],
    rubber:[2,.95,function(g,s){g.fillStyle='#34373b';g.fillRect(0,0,s,s);speck(g,s,1400,['#5d6168','#4a4e54','#6f7379'],2);g.fillStyle='#1f2124';g.fillRect(0,0,s,2);g.fillRect(0,0,2,s)}],
    epoxy:[2,.28,function(g,s){g.fillStyle='#a3abb2';g.fillRect(0,0,s,s);speck(g,s,2200,['#7f878e','#e6eaee','#5f676e','#c3cbd2'],2.5)}],
    sport:[2,.55,function(g,s){g.fillStyle='#3c7fc6';g.fillRect(0,0,s,s);g.fillStyle='#2f6fb3';for(var i=0;i<2;i++){g.fillRect(i*s/2,0,2,s);g.fillRect(0,i*s/2,s,2)}g.fillStyle='rgba(255,255,255,.12)';for(var x=0;x<s;x+=s/16)for(var y=0;y<s;y+=s/16)g.fillRect(x+4,y+4,3,3)}],
    turf:[6,1,function(g,s){g.fillStyle='#5fa94b';g.fillRect(0,0,s,s/2);g.fillStyle='#55a042';g.fillRect(0,s/2,s,s/2);speck(g,s,9000,['#4b9139','#6cb957','#5aa646'],1.5)}],
    rink:[3,.22,function(g,s){var h=s/12;for(var r=0;r<12;r++){g.fillStyle=['#e2c391','#d9b885','#e8cc9c'][r%3];g.fillRect(0,r*h,s,h);g.fillStyle='rgba(120,80,30,.07)';for(var q=0;q<20;q++)g.fillRect(rnd(s),r*h+rnd(h),rnd(s/3),1);g.fillStyle='#b8955f';g.fillRect(0,r*h,s,1);var j=((r*0.41)%1)*s;g.fillRect(j,r*h,1.5,h)}}],
    park:[4,.85,function(g,s){g.fillStyle='#bdbab2';g.fillRect(0,0,s,s);speck(g,s,5000,['#b0ada5','#c8c5bd','#a9a69e'],2)}],
    tile:[2,.3,function(g,s){g.fillStyle='#e6e7e2';g.fillRect(0,0,s,s);speck(g,s,500,['#dcddd8','#efefea'],2);g.fillStyle='#c4c6c0';g.fillRect(0,0,s,3);g.fillRect(0,0,3,s);g.fillRect(0,s/2,s,3);g.fillRect(s/2,0,3,s)}]};
  P.floors.forEach(function(f){var spec=FT[f.m]||FT.wood;EXFT[f.m]=EXFT[f.m]||exTex(T,spec[2],256,[1,1]);var tx=EXFT[f.m].clone();tx.needsUpdate=true;tx.repeat.set(f.w/spec[0],f.d/spec[0]);
   var mesh=new T.Mesh(new T.BoxGeometry(f.w,.015,f.d),exMat(T,0xb4b4b4,{r:spec[1],map:tx}));mesh.position.set(f.x+f.w/2,.0075,f.y+f.d/2);mesh.receiveShadow=true;S.add(mesh);
   var line=function(x,z,w,d,hex){var m=new T.Mesh(new T.BoxGeometry(w,.004,d),exMat(T,hex,{r:.6}));m.position.set(x,.017,z);m.receiveShadow=true;S.add(m)},cx=f.x+f.w/2,cz=f.y+f.d/2,lo=f.w>=f.d;
   if(f.m==='park'){if(lo){line(cx,f.y+.4,f.w,.25,0xf2c230);line(cx,f.y+f.d-.4,f.w,.25,0xf2c230)}else{line(f.x+.4,cz,.25,f.d,0xf2c230);line(f.x+f.w-.4,cz,.25,f.d,0xf2c230)}}
   if(f.m==='rink'){var ins=Math.min(2,Math.min(f.w,f.d)*.12),ow=f.w-2*ins,od=f.d-2*ins,rrS=function(w,d,r){var sh=new T.Shape(),x=-w/2,y=-d/2;r=Math.max(.01,Math.min(r,w/2,d/2));sh.moveTo(x+r,y);sh.lineTo(x+w-r,y);sh.absarc(x+w-r,y+r,r,-Math.PI/2,0);sh.lineTo(x+w,y+d-r);sh.absarc(x+w-r,y+d-r,r,0,Math.PI/2);sh.lineTo(x+r,y+d);sh.absarc(x+r,y+d-r,r,Math.PI/2,Math.PI);sh.lineTo(x,y+r);sh.absarc(x+r,y+r,r,Math.PI,Math.PI*1.5);return sh},
     band=function(w,d,t,hex,y){var o=rrS(w,d,Math.min(w,d)/2),hl=rrS(w-2*t,d-2*t,Math.min(w,d)/2-t);o.holes.push(new T.Path(hl.getPoints(48)));var m=new T.Mesh(new T.ShapeGeometry(o,48),exMat(T,hex,{r:.3}));m.rotation.x=-Math.PI/2;m.position.set(cx,y,cz);m.receiveShadow=true;S.add(m)};
    band(ow,od,.3,0x1f7f98,.017);band(ow-1.2,od-1.2,.15,0xc8413a,.0172);var R=Math.min(f.w,f.d)/6,ring=new T.Mesh(new T.RingGeometry(R-.12,R+.12,48),exMat(T,0x1f7f98,{r:.3}));ring.rotation.x=-Math.PI/2;ring.position.set(cx,.018,cz);S.add(ring)}})}
 // rooms: drywall partitions with door openings, a lower ceiling where the room has one
 if(P.rooms&&P.rooms.length){var dw=exMat(T,0xe7e3db,{r:.92,map:exTex(T,function(g,s){g.fillStyle='#e7e3db';g.fillRect(0,0,s,s);for(var i=0;i<s*s/6;i++){g.fillStyle='rgba('+(Math.random()<.5?'0,0,0':'255,255,255')+','+(Math.random()*.035)+')';g.fillRect(Math.random()*s,Math.random()*s,1.5,1.5)}g.fillStyle='rgba(0,0,0,.035)';g.fillRect(0,0,2,s)},256,[1,1])}),
   leafM=exMat(T,0x9c7a55,{r:.55}),frameM=exMat(T,0xf2f0ea,{r:.6}),lidM=exMat(T,0xeeece6,{r:.95}),lidTop=exMat(T,0x8a8a86,{r:.95}),TH=WT,
   seg=function(x,z,w,d,y0,y1,len){if(w<=.01||d<=.01||y1-y0<=.01)return;var m=new T.Mesh(new T.BoxGeometry(w,y1-y0,d),dw.clone());m.layers.enable(2);m.material.map=dw.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(Math.max(.3,len/8),Math.max(.3,(y1-y0)/8));m.position.set(x,(y0+y1)/2,z);m.castShadow=true;m.receiveShadow=true;S.add(m)};
  P.rooms.forEach(function(r){var wh=Math.min(r.h||H,H);
   ['n','e','s','w'].forEach(function(sd){var len=sd==='n'||sd==='s'?r.w:r.d,gaps=sideGaps(r,sd),cur=0,parts=[];
    gaps.forEach(function(g){var tp=g[2]||7;if(g[0]>cur)parts.push([cur,g[0],0,wh]);if(wh>tp+.05)parts.push([g[0],g[1],tp,wh]);cur=Math.max(cur,g[1])});if(cur<len)parts.push([cur,len,0,wh]);
    var sh=sideShared(r,sd);if(sh.length){var cut=[];parts.forEach(function(q){var segs=[[q[0],q[1]]];sh.forEach(function(x){var nx=[];segs.forEach(function(g){if(x[1]<=g[0]||x[0]>=g[1]){nx.push(g);return}if(x[0]>g[0])nx.push([g[0],x[0]]);if(x[1]<g[1])nx.push([x[1],g[1]])});segs=nx});segs.forEach(function(g){if(g[1]-g[0]>1e-3)cut.push([g[0],g[1],q[2],q[3]])})});parts=cut}
    // cut window holes in the parts of this wall the room builds
    winsOn(r,sd).forEach(function(wn){var nx=[];parts.forEach(function(q){if(wn[1]<=q[0]+1e-6||wn[0]>=q[1]-1e-6||wn[3]<=q[2]+1e-6||wn[2]>=q[3]-1e-6){nx.push(q);return}
      var xa=Math.max(q[0],wn[0]),xb=Math.min(q[1],wn[1]);if(wn[0]>q[0])nx.push([q[0],wn[0],q[2],q[3]]);if(wn[1]<q[1])nx.push([wn[1],q[1],q[2],q[3]]);if(wn[2]>q[2])nx.push([xa,xb,q[2],wn[2]]);if(wn[3]<q[3])nx.push([xa,xb,wn[3],q[3]])});parts=nx});
    parts.forEach(function(q){var a=q[0],b=q[1],hor=sd==='n'||sd==='s',fx=hor?r.x+(a+b)/2:(sd==='w'?r.x:r.x+r.w),fz=hor?(sd==='n'?r.y:r.y+r.d):r.y+(a+b)/2,w=hor?b-a:TH,d=hor?TH:b-a;
     seg(fx,fz,w,d,q[2],q[3],b-a);if(q[2]===0)EX.solid.push({x:fx-w/2,z:fz-d/2,w:w,d:d})})});
   (r.wins||[]).forEach(function(w){var g=dGeo(r,w),hor=w.s==='n'||w.s==='s';winModel((g.a.x+g.b.x)/2,(g.a.y+g.b.y)/2,hor,w.len,w.sill,Math.min(wTop(w),wh),TH,w)});
   (r.doors||[]).forEach(function(d){var g=dGeo(r,d),L=g.L,hx=g.h.x,hz=g.h.y,leaf=new T.Mesh(new T.BoxGeometry(.13,6.9,L-.1),leafM);
    leaf.position.set(hx+g.sn.x*(L/2),3.45,hz+g.sn.y*(L/2));
    if(g.sn.x!==0){leaf.geometry=new T.BoxGeometry(L-.1,6.9,.13)}leaf.castShadow=true;S.add(leaf);
    var kb=new T.Mesh(new T.SphereGeometry(.09,10,8),M.steel);kb.position.set(g.tip.x-g.sn.x*.3+(g.sn.x===0?.12:0),3.2,g.tip.y-g.sn.y*.3+(g.sn.y===0?.12:0));S.add(kb);
    EX.solid.push({x:Math.min(hx,g.tip.x)-.08,z:Math.min(hz,g.tip.y)-.08,w:Math.abs(g.tip.x-hx)+.16,d:Math.abs(g.tip.y-hz)+.16})});
   if(wh<H-.05){var lt=Math.min(.35,H-wh),lid=new T.Mesh(new T.BoxGeometry(r.w,lt,r.d),[lidTop,lidTop,lidTop,lidM,lidTop,lidTop]);lid.position.set(r.x+r.w/2,wh+lt/2,r.y+r.d/2);lid.castShadow=true;lid.receiveShadow=true;lid.layers.enable(2);S.add(lid)}})}
 P.items.forEach(function(it){var c=defOf(it);if(!c)return;var m=dims(it,it.rot),w0=it.w||c.w,d0=it.d||c.d,cx=it.x+m.w/2,cz=it.y+m.d/2;
  if(c.ceiling){var cs=exCeilShape(T,c,w0,d0,M),drop=fanDrop(it),H=hAt(cx,cz);cs.g.position.set(cx,H-drop,cz);cs.g.rotation.y=-(it.rot||0)*Math.PI/2;
   if(drop>.4&&!cs.cords){var rod=new T.Mesh(new T.CylinderGeometry(.03,.03,drop),M.dark);rod.position.set(cx,H-drop/2,cz);S.add(rod)}S.add(cs.g);if(cs.spin)EX.spin.push(cs.spin);if(cs.light){var ps=P.pw&&pstat(it),off=!!(ps&&ps.lv==='red');if(off)cs.g.traverse(function(o){if(o.material&&o.material.emissive&&o.material.emissiveIntensity>0&&o.material.emissive.getHex()){o.material=o.material.clone();o.material.emissive.setHex(0);o.material.emissiveIntensity=0}});lights.push({x:cx,z:cz,y:H-drop-.8,col:cs.light,c:c,off:off})}return}
  var h=c.h||Math.max(2,Math.min(6,Math.min(w0,d0)));var g=exShape(T,c,w0,d0,h,M);g.position.set(cx,0,cz);g.rotation.y=-(it.rot||0)*Math.PI/2;S.add(g);
  if(/^a-(car|pickup|evbay)$/.test(c.r)||NOWALK.test(c.r)){var ln=new T.Mesh(new T.PlaneGeometry(m.w,m.d),exMat(T,/^c-/.test(c.r)?0x3c6e9e:0xffffff,{op:/^c-/.test(c.r)?.55:.12,r:.8}));ln.rotation.x=-Math.PI/2;ln.position.set(cx,.02,cz);S.add(ln)}
  if(!NOWALK.test(c.r)&&h>.6)EX.solid.push({x:it.x,z:it.y,w:m.w,d:m.d})});
 // light-zone fixtures
 if(P.zones&&P.zones.length)zFixAll().forEach(function(f){var cs=exCeilShape(T,f.c,f.rot?f.d:f.w,f.rot?f.w:f.d,M),drop=f.c.drop||0,H=hAt(f.x,f.y);cs.g.position.set(f.x,H-drop,f.y);cs.g.rotation.y=-(f.rot||0)*Math.PI/2;
  if(drop>.4&&!cs.cords){var rod=new T.Mesh(new T.CylinderGeometry(.03,.03,drop),M.dark);rod.position.set(f.x,H-drop/2,f.y);S.add(rod)}S.add(cs.g);if(cs.light)lights.push({x:f.x,z:f.y,y:H-drop-.8,col:f.col||cs.light,c:f.c,off:false,zone:f.z})});
 // light: real fixtures. Brightness from lumens (LED ~130 lm/W) spread over each fixture's beam, in feet,
 // plus a fill light for what bounces off the floor and walls. Fixtures that aren't powered stay off.
 var LX=.1,on=lights.filter(function(L){return !L.off}),
  BEAM={'cl-track':.35,'cl-stage':.26,'cl-down':.6,'cl-pend':.75,'cl-pool':.85,'cl-wash':.7,'cl-task':.8,'cl-black':.9},
  lmOf=function(L){return ((L.c.p&&L.c.p[1])||60)*(L.c.r==='cl-black'?25:130)},
  tot=on.reduce(function(a,L){return a+lmOf(L)},0),litA=(function(){var seen={},a=0;on.forEach(function(L){var rm=roomAt(L.x,L.z),k=rm?'r'+rm.id:L.zone?'z'+L.zone.id:'s'+L.x+','+L.z;if(seen[k])return;seen[k]=1;a+=rm?rm.w*rm.d:L.zone?L.zone.w*L.zone.d:100});return Math.max(50,Math.min(W*D,a))})(),eAvg=tot*.6/(litA*.0929);
 EX.lux=Math.round(eAvg);var nOff=lights.length-on.length;if(nOff)setTimeout(function(){toast(nOff===1?'1 light isn\'t powered, so it\'s off. Plug it in on the Power view.':nOff+' lights aren\'t powered, so they\'re off. Plug them in on the Power view.')},400);
 var hemi=new T.HemisphereLight(0xd8dde6,0xb3a58f,lights.length?.3:1.1);S.add(hemi);
 if(!lights.length){var dl=new T.DirectionalLight(0xffffff,.7);dl.position.set(W*.3,H*3,D*.2);dl.target.position.set(W/2,0,D/2);dl.castShadow=true;dl.shadow.mapSize.set(1024,1024);var sc=dl.shadow.camera;sc.left=-W;sc.right=W;sc.top=D;sc.bottom=-D;sc.far=H*6;S.add(dl);S.add(dl.target);
  var nx=Math.max(1,Math.min(4,Math.round(W/15))),nz=Math.max(1,Math.min(3,Math.round(D/15)));for(var ix=0;ix<nx;ix++)for(var iz=0;iz<nz;iz++){var pl=new T.PointLight(0xfff4e0,Math.max(40,H*H*.9),Math.max(W,D),1.5);pl.position.set(W*(ix+.5)/nx,H-1,D*(iz+.5)/nz);S.add(pl)}}
 // One soft overhead light per room (and per light zone on the open floor), as bright as all its fixtures together,
 // with a shadow so the walls hold it in. Fixtures out on their own (a pool-table light, a bar pendant) keep their own beam.
 var grp={},solo=[];on.forEach(function(L){var rm=roomAt(L.x,L.z),key=rm?'r'+rm.id:L.zone?'z'+L.zone.id:null;if(!key){solo.push(L);return}
  var g=grp[key]||(grp[key]={lm:0,col:{r:0,g:0,b:0},n:0,b:rm?{x:rm.x,y:rm.y,w:rm.w,d:rm.d}:{x:L.zone.x,y:L.zone.y,w:L.zone.w,d:L.zone.d}});
  var lm=lmOf(L),cc=new T.Color(L.col);g.lm+=lm;g.col.r+=cc.r*lm;g.col.g+=cc.g*lm;g.col.b+=cc.b*lm;g.n++});
 Object.keys(grp).forEach(function(k){grp[k].room=k.charAt(0)==='r'});
 var groups=Object.keys(grp).map(function(k){return grp[k]}).sort(function(a,b){return b.lm-a.lm}),nSh=0,MAXSH=12,
  roomA=(P.rooms||[]).reduce(function(a,r){return a+r.w*r.d},0),openA=Math.max(50,W*D-roomA),openLm=groups.filter(function(g){return !g.room}).reduce(function(a,g){return a+g.lm},0)+solo.reduce(function(a,L){return a+lmOf(L)},0);
 // the fill everywhere is set by what actually lights the open floor; rooms get their own bounce light instead
 if(lights.length)hemi.intensity=Math.min(2.2,.5+openLm*.6/(openA*.0929)*.004);var bounce=[];
 groups.forEach(function(g){var b=g.b,cx=b.x+b.w/2,cz=b.y+b.d/2,Hc=hAt(cx,cz),y=Hc-.25,hd=Math.hypot(b.w,b.d)/2,ang=Math.min(1.45,Math.atan(hd*1.2/Math.max(1,y))),
   col=new T.Color(g.col.r/g.lm,g.col.g/g.lm,g.col.b/g.lm),A=b.w*b.d,
   // aim for the average floor brightness the fixtures would give (lumens x utilisation / area), decay 1 keeps it even edge to edge
   I=g.lm*.6/(A*.0929)*y*.014;
  var sp=new T.SpotLight(col,I,0,ang,.5,1);sp.position.set(cx,y,cz);sp.target.position.set(cx,0,cz);
  if(nSh<MAXSH){sp.castShadow=true;var ms=nSh<4?2048:1024;sp.shadow.mapSize.set(ms,ms);sp.shadow.bias=-.0004;sp.shadow.normalBias=.02;sp.shadow.radius=6;sp.shadow.camera.near=.5;sp.shadow.camera.far=y+2;nSh++}
  S.add(sp);S.add(sp.target);if(g.room)bounce.push({cx:cx,cz:cz,y:y,ang:ang,col:col,I:I,hd:hd})});
 // bounce: light coming back off a room's floor and walls. Only the walls and ceiling block it (shadow layer 2), so furniture doesn't cast odd shadows, and it stays in the room
 bounce.forEach(function(q){if(nSh>=MAXSH)return;var up=new T.PointLight(q.col,q.I*.4,q.hd*1.3,1);up.position.set(q.cx,q.y*.55,q.cz);
  up.castShadow=true;up.shadow.camera.layers.set(2);up.shadow.mapSize.set(512,512);up.shadow.bias=-.002;up.shadow.normalBias=.05;up.shadow.radius=3;up.shadow.camera.near=.3;up.shadow.camera.far=60;nSh++;S.add(up)});
 var maxL=Math.max(0,16-groups.length-bounce.length),lim=solo.length<=maxL?solo:Array.apply(null,Array(maxL)).map(function(_,i){return solo[Math.floor(i*solo.length/Math.max(1,maxL))]}),boost=solo.length/Math.max(1,lim.length),hasR=P.rooms&&P.rooms.length;
 var segD=function(px,pz,ax,az,bx,bz){var vx=bx-ax,vz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*vx+(pz-az)*vz)/(vx*vx+vz*vz||1)));return Math.hypot(px-ax-t*vx,pz-az-t*vz)},
  wallD=function(L){var m=1e9;(P.rooms||[]).forEach(function(r){var x0=r.x,z0=r.y,x1=r.x+r.w,z1=r.y+r.d;m=Math.min(m,segD(L.x,L.z,x0,z0,x1,z0),segD(L.x,L.z,x1,z0,x1,z1),segD(L.x,L.z,x0,z1,x1,z1),segD(L.x,L.z,x0,z0,x0,z1))});return m};
 lim.forEach(function(L){var th=BEAM[L.c.r]||1.05,ang=Math.min(1.45,th*1.25),cd=lmOf(L)*.85/(2*Math.PI*(1-Math.cos(th))),sh=nSh<MAXSH;
  if(hasR&&!sh){var dw=wallD(L);if(L.y*Math.tan(ang)>dw)ang=Math.max(.2,Math.atan(Math.max(0,dw-.2)/Math.max(1,L.y)))}
  var sp=new T.SpotLight(L.col,cd*LX*boost,0,ang,th>=1?1:.55,2);sp.position.set(L.x,L.y,L.z);sp.target.position.set(L.x,0,L.z);
  if(sh){sp.castShadow=true;sp.shadow.mapSize.set(1024,1024);sp.shadow.bias=-.0006;sp.shadow.radius=4;nSh++}S.add(sp);S.add(sp.target)});
 // glowing screens light their surroundings a little
 return S}
function exSpawn(){var W=P.room.w,D=P.room.d,best=null,bs=-1;for(var y=1.5;y<D-1;y+=1)for(var x=1.5;x<W-1;x+=1){if(exHit(x,y))continue;var sc=-Math.hypot(x-W/2,y-(D-2))+(exClear(x,y)*2);if(sc>bs){bs=sc;best={x:x,y:y}}}
 return best||{x:W/2,y:D/2}}
function exClear(x,z){var m=4;EX.solid.forEach(function(s){var dx=Math.max(s.x-x,0,x-(s.x+s.w)),dz=Math.max(s.z-z,0,z-(s.z+s.d));m=Math.min(m,Math.hypot(dx,dz))});return m}
function exHit(x,z){var W=P.room.w,D=P.room.d,out=(P.edoors||[]).some(function(d){return d.k==='door'});if(out){if(x<-120||z<-120||x>W+120||z>D+120)return true;var ws=EX.wallSolid||[];for(var j=0;j<ws.length;j++){var q=ws[j],ex=Math.max(q.x-x,0,x-(q.x+q.w)),ez=Math.max(q.z-z,0,z-(q.z+q.d));if(ex*ex+ez*ez<RAD*RAD)return true}}else if(x<RAD||z<RAD||x>W-RAD||z>D-RAD)return true;for(var i=0;i<EX.solid.length;i++){var s=EX.solid[i],dx=Math.max(s.x-x,0,x-(s.x+s.w)),dz=Math.max(s.z-z,0,z-(s.z+s.d));if(dx*dx+dz*dz<RAD*RAD)return true}return false}
function exStart(){var T=EX.T,host=$('#explore');host.innerHTML='<canvas id="excv"></canvas><div class="exhud">'+(TOUCH?'Left thumb: walk · drag anywhere else: look':'Move the mouse to look · WASD / arrows to walk · Shift to run · Esc to leave')+'</div><div class="exjoy" id="exjoy"><i></i></div>'+(P.items.some(function(i){var c=defOf(i);return c&&c.ceiling&&/^cl-/.test(c.r)})||(P.zones&&P.zones.length)?'':'<div class="exnote">No ceiling lights yet, so the room has soft work light. Add a light zone in Lights view to see them here.</div>');
 var cv=$('#excv'),r=EX.r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio||1,TOUCH?1.5:2));r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.toneMapping=T.ACESFilmicToneMapping;r.outputColorSpace=T.SRGBColorSpace;
 EX.S=exBuild();
 // nothing in the scene moves while you walk around, so work the shadows out once on entry and reuse them every frame
 r.shadowMap.autoUpdate=false;r.shadowMap.needsUpdate=true;EX.cam=new T.PerspectiveCamera(70,1,.1,600);var sp=exSpawn(),es=eSpawn();if(es&&!exHit(es.x,es.y))sp=es;EX.pos={x:sp.x,z:sp.y};EX.yaw=sp.yaw||0;EX.pitch=-.05;
 var size=function(){var b=host.getBoundingClientRect();r.setSize(b.width,b.height,false);EX.cam.aspect=b.width/Math.max(1,b.height);EX.cam.updateProjectionMatrix()};size();EX.size=size;
 // desktop: pointer lock look; touch: joystick + drag look
 cv.onclick=function(){if(!TOUCH&&host.requestPointerLock&&document.pointerLockElement!==host){try{var pr=host.requestPointerLock();if(pr&&pr.catch)pr.catch(function(){})}catch(_){}}};
 host.onmousemove=function(e){if(document.pointerLockElement===host){EX.yaw-=e.movementX*.0025;EX.pitch=Math.max(-1.3,Math.min(1.3,EX.pitch-e.movementY*.0025))}};
 var joy=$('#exjoy'),jk=joy.querySelector('i');EX.joy={x:0,y:0,id:null};EX.look=null;
 cv.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse')return;var b=joy.getBoundingClientRect();
  if(e.clientX<b.right+40&&e.clientY>b.top-40&&EX.joy.id==null){EX.joy.id=e.pointerId;EX.joy.cx=b.left+b.width/2;EX.joy.cy=b.top+b.height/2}else if(!EX.look)EX.look={id:e.pointerId,x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId)});
 cv.addEventListener('pointermove',function(e){if(e.pointerType==='mouse')return;
  if(EX.joy.id===e.pointerId){var dx=e.clientX-EX.joy.cx,dy=e.clientY-EX.joy.cy,L=Math.hypot(dx,dy),R=44;if(L>R){dx*=R/L;dy*=R/L}EX.joy.x=dx/R;EX.joy.y=dy/R;jk.style.transform='translate('+dx+'px,'+dy+'px)'}
  else if(EX.look&&EX.look.id===e.pointerId){EX.yaw-=(e.clientX-EX.look.x)*.005;EX.pitch=Math.max(-1.3,Math.min(1.3,EX.pitch-(e.clientY-EX.look.y)*.005));EX.look.x=e.clientX;EX.look.y=e.clientY}});
 var up=function(e){if(EX.joy.id===e.pointerId){EX.joy.id=null;EX.joy.x=EX.joy.y=0;jk.style.transform=''}if(EX.look&&EX.look.id===e.pointerId)EX.look=null};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 EX.last=performance.now();var loop=function(t){if(!EX.on||!EX.r)return;var dt=Math.min(.05,(t-EX.last)/1000);EX.last=t;exStep(dt);EX.raf=requestAnimationFrame(loop)};EX.raf=requestAnimationFrame(loop)}
function exStep(dt){var k=EX.keys,f=(k.w||k.arrowup?1:0)-(k.s||k.arrowdown?1:0)-EX.joy.y,s=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0)+EX.joy.x,L=Math.hypot(f,s);
 if(L>0){if(L>1){f/=L;s/=L}var sp=(k.shift?RUN:WALK)*dt,sy=Math.sin(EX.yaw),cy=Math.cos(EX.yaw),dx=(-sy*f+cy*s)*sp,dz=(-cy*f-sy*s)*sp,p=EX.pos;
  if(!exHit(p.x+dx,p.z))p.x+=dx;if(!exHit(p.x,p.z+dz))p.z+=dz}
 if(EX.spin)EX.spin.forEach(function(q){q.o.rotation.y+=q.v*dt});var c=EX.cam;c.position.set(EX.pos.x,EYE,EX.pos.z);c.rotation.order='YXZ';c.rotation.y=EX.yaw;c.rotation.x=EX.pitch;EX.r.render(EX.S,c)}
window.addEventListener('keydown',function(e){if(!EX.on||/INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||''))return;var k=e.key.toLowerCase();if(/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright|shift)$/.test(k)){EX.keys[k]=true;e.preventDefault()}});
window.addEventListener('keyup',function(e){EX.keys[e.key.toLowerCase()]=false});
window.addEventListener('blur',function(){EX.keys={}});
window.addEventListener('resize',function(){if(EX.on&&EX.size)EX.size()});

// Esc leaves Explore: the browser frees the mouse on Esc, so leaving the lock (while this window still has focus) means leave
document.addEventListener('pointerlockchange',function(){var h=$('#explore');if(document.pointerLockElement===h){EX.locked=true;return}
 if(EX.on&&EX.locked&&document.hasFocus()){EX.locked=false;exLeave()}else EX.locked=false});
// leaving Explore with Esc goes back to the tab it was opened from (Build or Design)
function exLeave(){var back=EX.back;setExplore(false);if(back==='b')setBuild(true)}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&EX.on&&!document.pointerLockElement){e.preventDefault();exLeave()}});
