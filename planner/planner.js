(function(){
"use strict";
/* ================= Space Planner =================
   Rooms start at 7 x 7 ft. Objects are added from the library and the room lays itself out:
   anchors (all-round clearance) in the middle, wall pieces (front clearance) along the walls,
   everything else fitted around them. Bodies never sit in anyone's clearance; clearances may share space.
   Dynamic Expansion grows the room (never shrinks it) when something won't fit. */
var $=function(s){return document.querySelector(s)};
var TEST=/^test\./.test(location.hostname),LOCAL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
var API=LOCAL?'http://127.0.0.1:8799':TEST?'https://mancave-api-test.adamtww.workers.dev':'https://mancave-api.adamtww.workers.dev';
if(!TEST&&!LOCAL)$('#tag').style.display='none';
var tok=null;try{tok=localStorage.getItem('cave-token')}catch(_){}
var me=null;
function api(m,p,b){return fetch(API+p,{method:m,headers:Object.assign({'content-type':'application/json'},tok?{authorization:'Bearer '+tok}:{}),body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){var e=new Error(j.error||('Error '+r.status));e.status=r.status;throw e}return j})})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(n){return (Math.round(n*10)/10).toLocaleString('en-US')}
function clrTxt(c){var k=kOf(c);if(!(k[0]||k[1]||k[2]||k[3]))return 'none';if(k[0]===k[1]&&k[1]===k[2]&&k[2]===k[3])return fmt(k[0])+' ft all around';var n=['front','back','left','right'],o=[];k.forEach(function(v,i){if(v)o.push(fmt(v)+' '+n[i])});return o.join(' · ')+' ft'}
function money(v){return v>=1000?'$'+(v>=10000?Math.round(v/1000):Math.round(v/100)/10)+'k':'$'+Math.round(v)}
function costTxt(c){if(!c||!c.cost)return '';var a=c.cost[0],b=c.cost[1];if(!a&&!b)return '';return a===b?money(a):money(a)+'–'+money(b)}
function fmtW(w){return w>=1000?(Math.round(w/100)/10).toLocaleString('en-US')+' kW':Math.round(w)+' W'}
var tt=null;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2600)}

/* ---------------- the object library: built-in catalog + shared edits + my own ---------------- */
var LIB={},MINE={},SHAREDROWS=0;
function baseLib(){LIB={};CATALOG.forEach(function(c){if(c.z||c.hide||c.r==='b-wall'||c.c==='Rooms & Zones')return;LIB[c.r]=JSON.parse(JSON.stringify(c))})}
baseLib();
// The catalog is the source of truth for built-in objects. A shared row only replaces a built-in when the
// library owner actually edited it (rows copied in by the old one-time seed are ignored), and never for a retired id.
function loadLib(){if(!tok)return Promise.resolve();return api('GET','/api/objects').then(function(j){baseLib();MINE={};SHAREDROWS=0;
  var sh=j.objects.filter(function(o){return o.shared}),t0=sh.reduce(function(m,o){var t=Date.parse(o.updated_at+'Z')||0;return Math.min(m,t)},Infinity);
  j.objects.forEach(function(o){if(ALIAS[o.r])return;
   if(o.shared){SHAREDROWS++;var builtIn=!!BY[o.r],edited=(o.data&&o.data.ed)||(Date.parse(o.updated_at+'Z')||0)>t0+60000;
    if(o.deleted){delete LIB[o.r];return}
    if(builtIn&&!edited)return;LIB[o.r]=normObj(Object.assign({},o.data,{r:o.r}))}
   else if(o.mine){LIB[o.r]=normObj(Object.assign({},o.data,{r:o.r}));MINE[o.r]=1}});
 }).catch(function(e){if(e.status===401){tok=null;showWho()}})}
// rooms saved before an object was retired: move them onto its generic replacement
function migrate(x){(x.items||[]).forEach(function(it){var n=ALIAS[it.r];if(n&&BY[n]){if(x.defs){delete x.defs[it.r];x.defs[n]=JSON.parse(JSON.stringify(BY[n]))}it.r=n}});if(x.defs)Object.keys(x.defs).forEach(function(r){if(ALIAS[r])delete x.defs[r]});return x}
function defOf(it){return (P.defs&&P.defs[it.r])||LIB[it.r]||null}
// what a room needs because of what's in it
function needs(c){var a=c.a||[],q=c.req||{},o={};
 o.water=!!q.water||a.indexOf('plumbing')>=0||a.indexOf('garden')>=0||/sink|dishwasher|ice m|shower|toilet/i.test(c.n);
 o.vent=q.vent?'Ventilation':a.indexOf('fumes')>=0?'Fume extraction':a.indexOf('co2')>=0?'Fume exhaust to outside':a.indexOf('weld')>=0?'Ventilation for welding':a.indexOf('commercial')>=0?'Type I hood with fire suppression':a.indexOf('dust')>=0?'Dust collection':'';
 o.gas=!!q.gas||a.indexOf('gas')>=0;o.ceil=+q.ceil||(a.indexOf('ceiling')>=0?-1:0);o.cool=a.indexOf('hvac')>=0;o.other=a.filter(function(k){return ['plumbing','garden','co2','weld','commercial','dust','gas','ceiling','hvac','fumes'].indexOf(k)<0});return o}

/* ---------------- the room ---------------- */
var P,hist=[],fut=[],sel=null,selO=null,lastFail=null;
function blank(){return {id:null,name:'Untitled room',room:{w:7,d:7},dyn:true,items:[],defs:{},uid:1,pw:null,pwo:{gp:true}}}
P=blank();try{var sv0=JSON.parse(localStorage.getItem('space-planner-cur')||'null');if(sv0&&sv0.room&&Array.isArray(sv0.items))P=migrate(Object.assign(blank(),sv0))}catch(_){}
function snapP(){return JSON.stringify(P)}
function push(){hist.push(snapP());if(hist.length>60)hist.shift();fut=[]}
function persist(){try{localStorage.setItem('space-planner-cur',JSON.stringify(P))}catch(_){}}

/* ---------------- geometry ---------------- */
function dims(it,rot){var c=defOf(it),w=it.w||c.w,d=it.d||c.d,sw=(rot==null?it.rot:rot)%2;return {w:sw?d:w,d:sw?w:d}}
function kOf(c){return (c&&Array.isArray(c.k))?c.k:kFrom(c||{})}
function clr(c,b,rot){var k=kOf(c);if(!(k[0]||k[1]||k[2]||k[3]))return null;return clrBox(b.x,b.y,b.w,b.d,k,rot%4)}
function hit(a,b){return a.x<b.x+b.w-1e-6&&b.x<a.x+a.w-1e-6&&a.y<b.y+b.d-1e-6&&b.y<a.y+a.d-1e-6}
function inside(r,W,D){return r.x>=-1e-6&&r.y>=-1e-6&&r.x+r.w<=W+1e-6&&r.y+r.d<=D+1e-6}
function ok(b,c,placed,W,D){if(!inside(b,W,D)||(c&&!inside(c,W,D)))return false;for(var i=0;i<placed.length;i++){var p=placed[i];if(hit(b,p.b)||(p.c&&hit(b,p.c))||(c&&hit(c,p.b)))return false}return true}
// back 0: it can stand against a wall; no clearance at all: it goes anywhere
function kind(c){var k=kOf(c);if(!(k[0]||k[1]||k[2]||k[3]))return 'flex';return (k[1]<=1&&k[0]>=k[1])?'wall':'center'}
var WALLROT=[0,1,2,3]; // top wall faces down (0), right faces left (1), bottom faces up (2), left faces right (3)
// spots with the object's back to a wall; its own clear zone (including any small gap behind it) stays inside the room
function wallSpots(it,W,D){var o=[],k=kOf(defOf(it));for(var s=0;s<4;s++){var rot=WALLROT[s],m=dims(it,rot),b=clrBox(0,0,m.w,m.d,k,rot),L=-b.x,T=-b.y,R=b.w-m.w-L,B=b.d-m.d-T;
  if(s===0||s===2){var y=s===0?T:D-m.d-B;for(var x=L;x+m.w+R<=W+1e-6;x+=.5)o.push({x:x,y:y,rot:rot,t:s===0?x:W+D+(W-x-m.w)})}
  else{var x2=s===1?W-m.w-R:L;for(var y2=T;y2+m.d+B<=D+1e-6;y2+=.5)o.push({x:x2,y:y2,rot:rot,t:s===1?W+y2:2*W+D+(D-y2-m.d)})}}return o}
function gridSpots(it,W,D){var o=[];[0,1].forEach(function(rot){var m=dims(it,rot);for(var y=0;y+m.d<=D+1e-6;y+=.5)for(var x=0;x+m.w<=W+1e-6;x+=.5)o.push({x:x,y:y,rot:rot})});return o}
function center(b){return {x:b.x+b.w/2,y:b.y+b.d/2}}
// lay the whole room out; returns placements or the first object that didn't fit
// Lay the room out. stable: objects already in the room stay put unless they now clash; only those move, to the nearest free spot.
function spotFor(it,c,placed,W,D,near){var k=kind(c),same=placed.filter(function(p){return p.cat===c.c}),best=null,
  cands=k==='center'?gridSpots(it,W,D):wallSpots(it,W,D);if(k==='flex'||(near&&k==='wall'))cands=cands.concat(gridSpots(it,W,D).map(function(s){s.t=1e4;return s}));
 for(var j=0;j<cands.length;j++){var s=cands[j],mm=dims(it,s.rot),bb={x:s.x,y:s.y,w:mm.w,d:mm.d},c2=clr(c,bb,s.rot);if(!ok(bb,c2,placed,W,D))continue;
  var ce=center(bb),sc;
  if(near){sc=Math.hypot(ce.x-near.x,ce.y-near.y)+(s.rot===near.rot?0:1.5)+(k==='wall'&&s.t>=1e4?12:0)}
  else{var cl=0;if(same.length){cl=1e9;same.forEach(function(p){var q=center(p.b);cl=Math.min(cl,Math.hypot(q.x-ce.x,q.y-ce.y))})}
   sc=k==='center'?Math.hypot(ce.x-W/2,ce.y-D/2)+cl*.5:cl*2+s.t*.05+(s.t>=1e4?Math.min(bb.x,bb.y,W-bb.x-bb.w,D-bb.y-bb.d)*2:0)}
  if(!best||sc<best.sc-1e-9)best={x:s.x,y:s.y,rot:s.rot,b:bb,c:c2,sc:sc}}
 return best}
function layout(items,W,D,stable){var placed=[],out={},order=items.slice(),moved=[];
 var pr=function(it){var c=defOf(it),m=dims(it,0),k=kOf(c);return (it.pin?1e9:0)+(stable&&it.placed?5e8:0)+({center:3e6,wall:2e6,flex:1e6})[kind(c)]+(m.w+k[2]+k[3])*(m.d+k[0]+k[1])};
 order.sort(function(a,b){return pr(b)-pr(a)||a.n-b.n});
 var put=function(it,c,best){placed.push({u:it.u,b:best.b,c:best.c,cat:c.c});out[it.u]={x:best.x,y:best.y,rot:best.rot}};
 var at=function(it,c){var m=dims(it,it.rot),b={x:it.x,y:it.y,w:m.w,d:m.d},cc=clr(c,b,it.rot);return ok(b,cc,placed,W,D)?{x:it.x,y:it.y,rot:it.rot,b:b,c:cc}:null};
 for(var i=0;i<order.length;i++){var it=order[i],c=defOf(it),best;
  if(it.pin){best=at(it,c);if(!best)return {fail:it,pinned:true};put(it,c,best)}
  else if(stable&&it.placed){best=stable===2?null:at(it,c);if(best)put(it,c,best);else moved.push(it)}
  else{best=spotFor(it,c,placed,W,D);if(!best)return {fail:it};put(it,c,best)}}
 // the ones that got bumped go to the closest free spot to where they were
 moved.sort(function(a,b){return pr(b)-pr(a)});
 for(var q=0;q<moved.length;q++){var mv=moved[q],mc=defOf(mv),m0=dims(mv,mv.rot),best2=spotFor(mv,mc,placed,W,D,{x:mv.x+m0.w/2,y:mv.y+m0.d/2,rot:mv.rot});if(!best2)return {fail:mv};put(mv,mc,best2)}
 return {pos:out}}
function apply(res){P.items.forEach(function(it){var q=res.pos[it.u];if(q){it.x=q.x;it.y=q.y;it.rot=q.rot;it.placed=1}})}
// when the room grows, things against the far walls move out with them and the rest shift by half
function shifted(items,W,D,W2,D2){var dw=W2-W,dd=D2-D,h=function(v){return Math.round(v*2)/2};return items.map(function(it){if(it.pin||!it.placed)return it;var m=dims(it,it.rot),o=Object.assign({},it);
 o.x=it.x+m.w>=W-1e-6?it.x+dw:it.x<=1e-6?it.x:it.x+h(dw/2);o.y=it.y+m.d>=D-1e-6?it.y+dd:it.y<=1e-6?it.y:it.y+h(dd/2);return o})}
// smallest bigger room (never smaller) that fits everything; prefers squarish growth over corridors
function grow(items,W,D,maxTries){var body=0,need=items.map(function(it){var c=defOf(it),m=dims(it,0),k=kOf(c),bw=m.w+k[2]+k[3],bd=m.d+k[0]+k[1];body+=m.w*m.d;return {a:Math.min(bw,bd),b:Math.max(bw,bd)}});
 var C=[];for(var w=W;w<=W+60;w+=.5)for(var d=D;d<=D+60;d+=.5){if(w===W&&d===D)continue;if(w*d<body)continue;var lo=Math.min(w,d),hi=Math.max(w,d);if(!need.every(function(n){return n.a<=lo+1e-6&&n.b<=hi+1e-6}))continue;C.push({w:w,d:d,k:w*d*(1+.25*Math.max(0,hi/lo-1.3))})}
 C.sort(function(a,b){return a.k-b.k});var t0=Date.now();
 for(var i=0;i<C.length&&i<(maxTries||4000)&&Date.now()-t0<2500;i++){var sh=shifted(items,W,D,C[i].w,C[i].d),r=layout(sh,C[i].w,C[i].d,true);if(!r.pos)r=layout(items,C[i].w,C[i].d);if(r.pos)return {w:C[i].w,d:C[i].d,res:r}}return null}
function why(f){var c=defOf(f.fail);return f.pinned?c.n+' is pinned where nothing else can fit around it':'No room for '+c.n+' with its clearance'}
// re-lay out after a change; with Dynamic Expansion the room grows when it has to
function relayout(opts){opts=opts||{};var r=layout(P.items,P.room.w,P.room.d,true);if(!r.pos&&!opts.nogrow){var r2=layout(P.items,P.room.w,P.room.d);if(r2.pos)r=r2}
 if(r.pos){apply(r);lastFail=null;return true}
 if((P.dyn&&!opts.nogrow)||opts.force){var g=grow(P.items,P.room.w,P.room.d);if(g){var gw=g.w-P.room.w,gd=g.d-P.room.d;P.room.w=g.w;P.room.d=g.d;apply(g.res);lastFail=null;toast('Room grew to '+fmt(g.w)+' × '+fmt(g.d)+' ft to fit it');return true}}
 lastFail=why(r);return false}

/* ---------------- actions ---------------- */
function add(r){var c=LIB[r];if(!c)return;var before=snapP(),it={u:'o'+(P.uid++),r:r,x:0,y:0,rot:0,n:P.uid};P.defs[r]=JSON.parse(JSON.stringify(c));P.items.push(it);
 if(!relayout()){var msg=lastFail;P=JSON.parse(before);lastFail={msg:msg,r:r};render();return}
 hist.push(before);fut=[];sel=it.u;lastFail=null;persist();render();pop(it.u)}
function remove(u){push();P.items=P.items.filter(function(i){return i.u!==u});if(sel===u)sel=null;relayout();persist();render()}
// Resizing pushes things to fit, in steps: keep everything where it is (walls carry their pieces with them),
// then nudge only what clashes, then re-place everything near where it was, and only then rearrange from scratch.
function scaled(items,W,D,W2,D2){var h=function(v){return Math.round(v*2)/2};return items.map(function(it){var m=dims(it,it.rot),o=Object.assign({},it,{pin:false});if(!it.placed)return o;
 o.x=it.x+m.w>=W-1e-6?W2-m.w:it.x<=1e-6?0:h((it.x+m.w/2)*W2/W-m.w/2);o.y=it.y+m.d>=D-1e-6?D2-m.d:it.y<=1e-6?0:h((it.y+m.d/2)*D2/D-m.d/2);
 o.x=Math.max(0,Math.min(W2-m.w,o.x));o.y=Math.max(0,Math.min(D2-m.d,o.y));return o})}
function setSize(w,d){if(!(w>=2&&d>=2&&w<=300&&d<=300)){toast('Use a size between 2 and 300 ft');return}
 var W=P.room.w,D=P.room.d,base=scaled(P.items,W,D,w,d),free=P.items.map(function(it){return Object.assign({},it,{pin:false})}),r,how;
 r=layout(base,w,d,true);how=0;
 if(!r.pos){r=layout(base,w,d,2);how=1}
 if(!r.pos){r=layout(free,w,d);how=2}
 if(!r.pos){toast((w*d<W*D?'Too small: ':'')+why(r).replace('No room for','no room for'));render();return}
 push();var moved=0;P.items.forEach(function(it){var q=r.pos[it.u];if(q&&(q.x!==it.x||q.y!==it.y||q.rot!==it.rot))moved++});
 P.room.w=w;P.room.d=d;apply(r);if(P.pw)P.pw.outlets.forEach(function(o){if(o.s===0||o.s===2)o.a=Math.max(.5,Math.min(w-.5,h2(o.a*w/W)));else if(o.s===1||o.s===3)o.a=Math.max(.5,Math.min(d-.5,h2(o.a*d/D)));else{o.x=h2(o.x*w/W);o.y=h2(o.y*d/D)}});if(how===2)P.items.forEach(function(it){it.pin=false});lastFail=null;persist();render();
 if(w*d<W*D||how)toast(how===2?'Everything was rearranged to fit, and pins were released':how===1?'Things were pushed around to fit':'Resized to '+fmt(w)+' × '+fmt(d)+' ft')}
function setPin(u,on){var it=byU(u);if(!it)return;push();it.pin=on;relayout();persist();render()}
// turn a quarter left (-1) or right (+1) about its centre; if that spot is blocked, nudge it into the nearest free space close by
function rotate(u,dir){var it=byU(u);if(!it)return;dir=dir||1;var nr=(it.rot+dir+4)%4,m0=dims(it,it.rot),m=dims(it,nr),cx=it.x+m0.w/2,cy=it.y+m0.d/2,
  x=Math.round((cx-m.w/2)*2)/2,y=Math.round((cy-m.d/2)*2)/2,sp=nearestFree(it,x,y,others(it),nr),give=Math.max(3,Math.max(m.w,m.d)*.75);
 if(!sp||Math.hypot(sp.x-x,sp.y-y)>give){toast('No room nearby to turn it');return}
 var before=snapP();it.rot=nr;it.x=sp.x;it.y=sp.y;
 if(!relayout({nogrow:true})){P=JSON.parse(before);lastFail=null;toast('No room nearby to turn it');render();return}hist.push(before);fut=[];persist();render()}
function byU(u){for(var i=0;i<P.items.length;i++)if(P.items[i].u===u)return P.items[i];return null}
function undo(){if(!hist.length)return;fut.push(snapP());P=JSON.parse(hist.pop());if(sel&&!byU(sel))sel=null;persist();render()}
function redo(){if(!fut.length)return;hist.push(snapP());P=JSON.parse(fut.pop());persist();render()}
document.addEventListener('keydown',function(e){if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
 if(sel&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();remove(sel)}if(sel&&(e.key==='r'||e.key==='R'))rotate(sel,e.shiftKey?-1:1);if(e.key==='Escape'){sel=null;selO=null;render()}});

/* ---------------- power: "Build out power" works out the outlets and circuits for what's in the room ----------------
   Each powered object gets a matching outlet within reach (cord ~6 ft): on the wall behind it when that wall is close,
   else the nearest wall, else a floor/ceiling drop beside it. Objects that need their own circuit get one; everyday
   120V loads share duplex outlets (2 sockets) and 20A circuits up to 80% (1,920 W). Big or built-in loads are wired in. */
var REACH=6,CAP80=.8;
function pspec(c){if(!c||!c.p)return null;var V=c.p[0]>=208?240:120,W=+c.p[1]||0,A=+c.p[2]||20,a=c.a||[],ded=!!c.p[3]||V===240||W>1920;
 var ph=c.ph?+c.ph:(a.indexOf('threephase')>=0?3:1);
 var hw=c.hw!=null?!!c.hw:(A>50||/\bEV\b/.test(c.n)||/water heater|air handler|sauna|walk-in cooler|spray booth|curing oven|high-temp/i.test(c.n));
 var t=hw?'hw':ph===3?'3p'+(A<=30?30:60):V===240?'240-'+(A<=20?20:A<=30?30:50):'120-'+(A<=15?15:20);
 var CA=hw?A:ph===3?(A<=30?30:60):V===240?(A<=20?20:A<=30?30:50):(A<=15?15:20);
 return {V:V,W:W,A:CA,ph:ph,ded:ded||hw||ph===3,hw:hw,t:t}}
function tName(t,o){if(t==='hw')return (o.ph===3?'3-phase ':o.V+'V ')+o.A+'A wired connection';if(t.slice(0,2)==='3p')return '3-phase '+t.slice(2)+'A outlet';var s=t.split('-');return s[0]+'V '+s[1]+'A outlet'}
function tShort(t,o){if(t==='hw')return 'wired';if(t.slice(0,2)==='3p')return '3φ·'+t.slice(2);var s=t.split('-');return s[0]==='120'?'120':'240·'+s[1]}
function tCol(o){return o.gp?'#7aa7e8':o.ty==='hw'?'#5f5b52':o.ty.slice(0,2)==='3p'?'#b42336':o.ty.slice(0,3)==='240'?'#e07b1f':'#2f7de1'}
function opos(o){var W=P.room.w,D=P.room.d;return o.s===0?{x:o.a,y:0}:o.s===1?{x:W,y:o.a}:o.s===2?{x:o.a,y:D}:o.s===3?{x:0,y:o.a}:{x:o.x,y:o.y}}
function perim(o){var W=P.room.w,D=P.room.d,p=opos(o),s=o.s;if(s<0){var d=[p.y,W-p.x,D-p.y,p.x];s=d.indexOf(Math.min.apply(null,d))}
 return s===0?p.x:s===1?W+p.y:s===2?W+D+(W-p.x):2*W+D+(D-p.y)}
function ibox(it){var m=dims(it,it.rot);return {x:it.x,y:it.y,w:m.w,d:m.d}}
function rdist(p,b){var dx=Math.max(b.x-p.x,0,p.x-(b.x+b.w)),dy=Math.max(b.y-p.y,0,p.y-(b.y+b.d));return Math.hypot(dx,dy)}
function h2(v){return Math.round(v*2)/2}
// where an object's outlet wants to be: the wall behind it if it's close, else the nearest wall in reach, else a drop beside it
function homeFor(it){var b=ibox(it),W=P.room.w,D=P.room.d,dist=[b.y,W-b.x-b.w,D-b.y-b.d,b.x],back=WALLROT.indexOf(it.rot%4),
  order=[0,1,2,3].sort(function(a,z){return (dist[a]-(a===back?.5:0))-(dist[z]-(z===back?.5:0))});
 for(var i=0;i<order.length;i++){var s=order[i];if(dist[s]>REACH-.5)continue;
  var a=s%2===0?h2(b.x+b.w/2):h2(b.y+b.d/2),L=s%2===0?W:D;return {s:s,a:Math.max(.5,Math.min(L-.5,a))}}
 var e=[[b.x+b.w/2,b.y],[b.x+b.w,b.y+b.d/2],[b.x+b.w/2,b.y+b.d],[b.x,b.y+b.d/2]][back<0?0:back];return {s:-1,x:h2(e[0]),y:h2(e[1])}}
// don't stack two outlets on the same spot: slide along the wall while the object can still reach it
function nudge(sp,list,b){var same=function(q){return list.some(function(o){var p=opos(o),r=opos(q);return o.s===q.s&&Math.hypot(p.x-r.x,p.y-r.y)<.9})};if(!same(sp))return sp;
 var L=sp.s%2===0?P.room.w:P.room.d;for(var k=1;k<=12;k++)for(var sg=1;sg>=-1;sg-=2){var q=Object.assign({},sp);if(q.s>=0){q.a=sp.a+sg*k;if(q.a<.5||q.a>L-.5)continue}else{q.x=sp.x+sg*k}if(!same(q)&&rdist(opos(q),b)<=REACH)return q}return sp}
function sigOf(it){return [it.r,it.x,it.y,it.rot].join('|')}
function buildPower(){var prev=P.pw,out=[],circ=[],links={},sig={},nid=1,W=P.room.w,D=P.room.d;
 var mk=function(sp,f){var o=Object.assign({id:'q'+(nid++),s:sp.s},sp.s>=0?{a:sp.a}:{x:sp.x,y:sp.y},f);out.push(o);return o};
 var prevSpot=function(it,t){if(!prev||!prev.links)return null;var o=(prev.outlets||[]).filter(function(x){return x.id===prev.links[it.u]})[0];if(!o||o.ty!==t)return null;var sp=o.s>=0?{s:o.s,a:o.a}:{s:-1,x:o.x,y:o.y};
  if(sp.s>=0&&(sp.a<.5||sp.a>(sp.s%2===0?W:D)-.5))return null;return rdist(opos(sp),ibox(it))<=REACH?sp:null};
 var L=P.items.map(function(it){return {it:it,sp:pspec(defOf(it))}}).filter(function(x){return x.sp});
 L.forEach(function(x){x.home=prevSpot(x.it,x.sp.t)||homeFor(x.it);x.k=perim(x.home)});L.sort(function(a,b){return a.k-b.k});
 // own circuits first
 L.filter(function(x){return x.sp.ded}).forEach(function(x){var s=x.sp,o=mk(nudge(x.home,out,ibox(x.it)),{ty:s.t,V:s.V,A:s.A,ph:s.ph,sk:1,w:s.W});circ.push({id:0,ty:s.t,V:s.V,A:s.A,ph:s.ph,ded:1,out:[o.id]});links[x.it.u]=o.id});
 // everyday 120V loads share duplex outlets
 var shared=[];L.filter(function(x){return !x.sp.ded}).forEach(function(x){var b=ibox(x.it),s=x.sp,best=null,bd=1e9;
  shared.forEach(function(o){if(o.ty!==s.t||o.sk>=2||o.w+s.W>s.V*s.A*CAP80)return;var d=rdist(opos(o),b);if(d<=REACH&&d<bd){bd=d;best=o}});
  if(!best){best=mk(nudge(x.home,out,b),{ty:s.t,V:s.V,A:s.A,ph:1,sk:0,w:0});shared.push(best)}best.sk++;best.w+=s.W;links[x.it.u]=best.id});
 // ...and shared outlets along a run share a circuit, up to 80% and 10 outlets
 var group=function(list,gp){list.sort(function(a,b){return perim(a)-perim(b)});var cur=null,last=null;list.forEach(function(o){var cap=o.V*o.A*CAP80,p=opos(o);
  if(!cur||cur.ty!==o.ty||cur.w+o.w>cap||cur.out.length>=10||Math.hypot(p.x-last.x,p.y-last.y)>30){cur={id:0,ty:o.ty,V:o.V,A:o.A,ph:1,gp:gp?1:0,out:[],w:0};circ.push(cur)}cur.out.push(o.id);cur.w+=o.w;last=p})};
 group(shared,false);
 // general-purpose outlets every ~12 ft of wall (chargers, hand tools, vacuums), on their own circuits
 if(!P.pwo||P.pwo.gp!==false){var gps=[];for(var s=0;s<4;s++){var Ln=s%2===0?W:D,n=Ln<6?0:Math.max(1,Math.round(Ln/12));
   for(var i=0;i<n;i++){var a=h2((i+.5)*Ln/n),q={s:s,a:a},pq=opos(q);if(out.some(function(o){var p=opos(o);return o.s===s&&!o.gp&&o.ty==='120-20'&&Math.hypot(p.x-pq.x,p.y-pq.y)<3}))continue;
    gps.push(mk(nudge(q,out,{x:pq.x-REACH,y:pq.y-REACH,w:2*REACH,d:2*REACH}),{ty:'120-20',V:120,A:20,ph:1,sk:0,w:0,gp:1}))}}group(gps,true)}
 circ.forEach(function(c){c.k=Math.min.apply(null,c.out.map(function(id){return perim(out.filter(function(o){return o.id===id})[0])}))});
 circ.sort(function(a,b){return a.k-b.k});circ.forEach(function(c,i){c.id=i+1;delete c.k;c.out.forEach(function(id){out.filter(function(o){return o.id===id})[0].c=c.id})});
 P.items.forEach(function(it){sig[it.u]=sigOf(it)});
 P.pw={outlets:out,circ:circ,links:links,sig:sig,show:prev?prev.show!==false:true}}
function outBy(id){var a=P.pw?P.pw.outlets:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
function circBy(id){var a=P.pw?P.pw.circ:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
// is this object powered by what was built out?
function pstat(it){var sp=pspec(defOf(it));if(!sp||!P.pw)return null;var o=outBy(P.pw.links[it.u]);
 if(!o)return {lv:'red',why:'Added after power was built out. Needs a '+tName(sp.t,sp)+'.'};
 if(o.ty!==sp.t)return {lv:'red',why:'Needs a '+tName(sp.t,sp)+'.'};
 var d=rdist(opos(o),ibox(it));if(d>REACH+.01)return {lv:'red',o:o,why:'Moved out of reach of its outlet ('+fmt(d)+' ft away).'};
 if(sp.ph===3)return {lv:'amber',o:o,why:'Needs 3-phase power. If the building is single-phase, it needs a phase converter.'};
 return {lv:'ok',o:o}}
function pwLoad(o){var w=0,names=[];P.items.forEach(function(it){if(P.pw.links[it.u]===o.id){var c=defOf(it),s=pspec(c);if(s){w+=s.W;names.push(c.n)}}});return {w:w,names:names}}
function circLoad(c){var w=0;c.out.forEach(function(id){var o=outBy(id);if(o)w+=pwLoad(o).w});return w}
function pwChanges(){if(!P.pw)return 0;var n=0,used={};P.items.forEach(function(it){var s=pstat(it);if(s&&s.lv==='red')n++;if(P.pw.links[it.u])used[P.pw.links[it.u]]=1});
 P.pw.outlets.forEach(function(o){if(!o.gp&&!used[o.id])n++});return n}
var HPS=[3,5,7.5,10,15,20,25,30,40,50,60,75,100,125,150];
function converter(){var hp=P.items.map(function(it){var s=pspec(defOf(it));return s&&s.ph===3?s.W/746:0}).filter(function(v){return v>0});if(!hp.length)return null;
 var big=Math.max.apply(null,hp),tot=hp.reduce(function(a,b){return a+b},0),need=Math.max(big*1.5,tot),size=HPS.filter(function(v){return v>=need})[0]||Math.ceil(need/25)*25;
 return {n:hp.length,hp:size,lo:Math.round((500+100*size)/100)*100,hi:Math.round((1000+200*size)/100)*100}}
var BOLT='M13 2 4 14h7l-1 8 9-12h-7z';
function drawPower(k){var grp=pwGroup();if(!P.pw||(P.pw.show===false&&!grp))return '';var g='',W=P.room.w,D=P.room.d,big=scale()>=16,selIt=byU(sel),hiO={},lines='';
 if(grp){P.items.forEach(function(it){var oid=grp.items[it.u];if(!oid)return;var b=ibox(it),col=grp.out[oid],p=opos(outBy(oid)),pd=3*k;
   g+='<rect x="'+(b.x-pd)+'" y="'+(b.y-pd)+'" width="'+(b.w+2*pd)+'" height="'+(b.d+2*pd)+'" rx="'+(2*k)+'" fill="none" stroke="'+col+'" stroke-width="'+(2.2*k)+'" pointer-events="none"/>';
   lines+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+(b.x+b.w/2)+'" y2="'+(b.y+b.d/2)+'" stroke="#fff" stroke-width="'+(4*k)+'" stroke-linecap="round" pointer-events="none"/><line x1="'+p.x+'" y1="'+p.y+'" x2="'+(b.x+b.w/2)+'" y2="'+(b.y+b.d/2)+'" stroke="'+col+'" stroke-width="'+(2*k)+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'" stroke-linecap="round" pointer-events="none"/><circle cx="'+(b.x+b.w/2)+'" cy="'+(b.y+b.d/2)+'" r="'+(3*k)+'" fill="'+col+'" stroke="#fff" stroke-width="'+k+'" pointer-events="none"/>'})}
 if(selIt){var st=pstat(selIt);if(st&&st.o)hiO[st.o.id]=1}if(selO)hiO[selO]=1;
 // lines from the selected outlet (or the selected object's outlet) to what it powers
 Object.keys(hiO).forEach(function(id){var o=outBy(id);if(!o)return;var p=opos(o);
  if(id===selO)g+='<circle cx="'+p.x+'" cy="'+p.y+'" r="'+REACH+'" fill="rgba(47,125,225,.05)" stroke="#2f7de1" stroke-width="'+k+'" stroke-dasharray="'+(4*k)+' '+(4*k)+'" pointer-events="none"/>';
  P.items.forEach(function(it){if(P.pw.links[it.u]!==id)return;var b=ibox(it);lines+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+(b.x+b.w/2)+'" y2="'+(b.y+b.d/2)+'" stroke="#1d4f91" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>'})});
 g+=lines;
 P.pw.outlets.forEach(function(o){var inG=grp&&grp.out[o.id];if(grp&&!inG&&P.pw.show===false)return;var p=opos(o),n=[[0,1],[-1,0],[0,-1],[1,0]][o.s]||[0,0],off=o.s>=0?-8.5*k:0,cx=p.x+n[0]*off,cy=p.y+n[1]*off,col=inG||tCol(o),r=6*k,on=!!hiO[o.id]||!!inG;
  g+='<g class="out" data-o="'+o.id+'" style="cursor:pointer'+(grp&&!inG?';opacity:.25':'')+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+(11*k)+'" fill="transparent"/>';
  if(on)g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+3.5*k)+'" fill="none" stroke="#1d4f91" stroke-width="'+(2*k)+'"/>';
  if(o.ty==='hw')g+='<rect x="'+(cx-r)+'" y="'+(cy-r)+'" width="'+2*r+'" height="'+2*r+'" rx="'+(1.5*k)+'" fill="'+col+'" stroke="#fff" stroke-width="'+(1.3*k)+'"/><path d="'+BOLT+'" transform="translate('+(cx-4.5*k)+' '+(cy-4.5*k)+') scale('+(9*k/24)+')" fill="#fff"/>';
  else{g+=(o.s<0?'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'"':'<rect x="'+(cx-r)+'" y="'+(cy-r)+'" width="'+2*r+'" height="'+2*r+'" rx="'+(2.5*k)+'"')+' fill="'+(o.gp?'#fff':col)+'" stroke="'+(o.gp?col:'#fff')+'" stroke-width="'+(1.4*k)+'"/>';
   var dot=o.gp?col:'#fff';if(o.ty.slice(0,3)==='120'){g+='<rect x="'+(cx-2.6*k)+'" y="'+(cy-2.6*k)+'" width="'+(1.3*k)+'" height="'+(2.4*k)+'" fill="'+dot+'"/><rect x="'+(cx+1.3*k)+'" y="'+(cy-2.6*k)+'" width="'+(1.3*k)+'" height="'+(2.4*k)+'" fill="'+dot+'"/><circle cx="'+cx+'" cy="'+(cy+2*k)+'" r="'+(.9*k)+'" fill="'+dot+'"/>'}
   else if(o.ty.slice(0,2)==='3p'){[[-2.4,-1.6],[2.4,-1.6],[0,2.4]].forEach(function(d){g+='<circle cx="'+(cx+d[0]*k)+'" cy="'+(cy+d[1]*k)+'" r="'+(1.1*k)+'" fill="'+dot+'"/>'})}
   else g+='<rect x="'+(cx-3*k)+'" y="'+(cy-.8*k)+'" width="'+(6*k)+'" height="'+(1.6*k)+'" fill="'+dot+'"/>'}
  if(big||on){var m=[-n[0],-n[1]],lx=cx,ly=cy,anc=m[0]>0?'start':m[0]<0?'end':'middle';if(!m[0]&&!m[1]){ly=cy+r+11*k}else if(!m[0]){ly=m[1]>0?cy+r+11*k:cy-r-5*k}else{lx=cx+m[0]*(r+4*k);ly=cy+3.5*k}
   g+='<text x="'+lx+'" y="'+ly+'" text-anchor="'+anc+'" font-size="'+(9.5*k)+'" font-weight="600" fill="'+(o.gp?'#4a76b8':col)+'" stroke="#fff" stroke-width="'+(2.6*k)+'" paint-order="stroke" pointer-events="none">'+(o.gp?'':tShort(o.ty,o)+' ')+'C'+o.c+'</text>'}
  g+='</g>'});
 // objects that aren't powered (red) or need attention (amber)
 P.items.forEach(function(it){var s=pstat(it);if(!s||s.lv==='ok')return;var b=ibox(it),cx=b.x+Math.min(.45,b.w/3),cy=b.y+Math.min(.45,b.d/3),r=7*k;
  g+='<g pointer-events="none"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+(s.lv==='red'?'#d6453d':'#e0a21f')+'" stroke="#fff" stroke-width="'+(1.5*k)+'"/><path d="'+BOLT+'" transform="translate('+(cx-4.8*k)+' '+(cy-4.8*k)+') scale('+(9.6*k/24)+')" fill="#fff"/></g>'});
 return g}
// an object's load as watts and amps; ≈ marks catalog estimates
function ldTxt(c){var sp=pspec(c);if(!sp)return '';var a=sp.W/((sp.ph===3?1.732:1)*sp.V);return (c.est?'≈ ':'')+Math.round(sp.W).toLocaleString()+' W · '+(a<10?fmt(a):Math.round(a))+' A'}
var pwOpenK=null,CCOL=['#185FA5','#0F6E56','#993C1D','#534AB7','#993556','#854F0B','#3B6D11','#A32D2D'];
function gkey(c){var o=outBy(c.out[0]);return c.gp?'gp':c.ty==='hw'?'hw|'+(o.ph===3?'3-phase':o.V+'V')+' '+o.A+'A':c.ty+'|'+(c.ded?'own':'shared')}
// the opened group: its circuits (each with a colour), their outlets and the objects on them
function pwGroup(){if(!P.pw||!pwOpenK)return null;var g={col:{},out:{},items:{}},i=0;P.pw.circ.forEach(function(c){if(gkey(c)!==pwOpenK)return;var col=CCOL[i++%CCOL.length];g.col[c.id]=col;c.out.forEach(function(id){g.out[id]=col})});
 if(!i)return null;P.items.forEach(function(it){var oid=P.pw.links[it.u];if(oid&&g.out[oid])g.items[it.u]=oid});return g}
// circuits grouped by type; each group opens to show its circuits and what's plugged into them
function pwSummary(){var by={},order=[],grp=pwGroup();P.pw.circ.forEach(function(c){var o=outBy(c.out[0]),key=gkey(c);
  if(!by[key]){by[key]={t:c.ty,o:o,ded:c.ded,gp:c.gp,list:[],n:0};order.push(key)}by[key].list.push(c);by[key].n+=c.out.length});
 order.sort(function(a,b){return (a==='gp')-(b==='gp')||(a<b?-1:1)});
 return order.map(function(k){var g=by[k],nc=g.list.length,nm=g.gp?'General-purpose 120V 20A':g.t==='hw'?'Wired in · '+tName('hw',g.o).replace(' wired connection',''):tName(g.t,g.o).replace(' outlet','')+(g.ded?' · own circuit':' · shared');
  var h='<details class="pg" data-k="'+esc(k)+'"'+(pwOpenK===k?' open':'')+'><summary><span>'+esc(nm)+'</span><b>'+nc+' circuit'+(nc>1?'s':'')+(g.n>nc?' · '+g.n+' outlets':'')+'</b></summary><div class="pgl">';
  g.list.forEach(function(c){var o0=outBy(c.out[0]),cap=(o0.ph===3?1.732:1)*o0.V*o0.A*CAP80,w=circLoad(c),its=[];
   P.items.forEach(function(it){var oid=P.pw.links[it.u];if(oid&&c.out.indexOf(oid)>=0)its.push(it)});
   var cc=grp&&grp.col[c.id];h+='<div class="pc"'+(cc?' style="border-left-color:'+cc+'"':'')+'><button class="pch" data-o="'+c.out[0]+'"><span>'+(cc?'<i class="sw2" style="background:'+cc+'"></i>':'')+'C'+c.id+(c.out.length>1?' · '+c.out.length+' outlets':'')+'</span>'+(w?'<small class="'+(w>cap?'bad':'')+'">'+Math.round(w).toLocaleString()+' / '+Math.round(cap).toLocaleString()+' W · '+fmt(w/((o0.ph===3?1.732:1)*o0.V))+' / '+fmt(o0.A*CAP80)+' A</small>':'')+'</button>';
   h+=its.length?its.map(function(it){var st=pstat(it);return '<button class="pci'+(sel===it.u?' on':'')+'" data-u="'+it.u+'">'+(st&&st.lv!=='ok'?'<i class="'+st.lv+'"></i>':'')+'<span class="pcn">'+esc(defOf(it).n)+'</span><small>'+ldTxt(defOf(it))+'</small></button>'}).join(''):'<div class="pce">'+(c.gp?'For chargers, hand tools and vacuums':'Nothing plugged in any more')+'</div>';
   h+='</div>'});
  return h+'</div></details>'}).join('')}
function powerCard(){var pw=power(P.items),h='<div class="card"><span class="lab">Power</span>',gpOn=!P.pwo||P.pwo.gp!==false;
 if(!P.pw){if(!pw.items&&!P.items.length)return h+'<p class="muted">Add objects, then build out power to see the outlets and circuits they need.</p></div>';
  h+='<div><b>'+(pw.items?(pw.est?'≈ ':'')+fmtW(pw.w)+'</b> connected · ≈ '+fmtW(pw.peak)+' peak':'No powered objects yet</b>')+'</div>'+(pw.circ.length?'<p class="muted">Roughly '+esc(pw.circ.join(' · '))+'</p>':'');
  h+='<label class="ck"><input type="checkbox" id="pw-gp"'+(gpOn?' checked':'')+'> General-purpose outlets every ~12 ft of wall</label><button class="btn pri" id="pw-build">Build out power</button></div>';return h}
 var ch=pwChanges(),cv=converter(),red=P.items.filter(function(it){var s=pstat(it);return s&&s.lv==='red'}).length;
 h+='<label class="sw"><input type="checkbox" id="pw-show"'+(P.pw.show!==false?' checked':'')+'> Show outlets</label>';
 h+='<div><b>'+P.pw.circ.length+' circuit'+(P.pw.circ.length===1?'':'s')+'</b> · '+P.pw.outlets.length+' outlet'+(P.pw.outlets.length===1?'':'s')+' and connections · '+(pw.est?'≈ ':'')+fmtW(pw.w)+' connected</div>';
 h+='<div>'+pwSummary()+'</div>';
 if(cv)h+='<div class="warn"><b>3-phase:</b> '+cv.n+' machine'+(cv.n>1?'s need':' needs')+' 3-phase power. If the building only has single-phase, plan on a rotary phase converter of about '+cv.hp+' HP (roughly '+money(cv.lo)+'–'+money(cv.hi)+').</div>';
 if(ch)h+='<div class="warn">'+(red?red+' object'+(red>1?'s aren\'t':' isn\'t')+' powered by the current build-out. ':'')+'Rebuild to update the outlets.</div>';
 h+='<label class="ck"><input type="checkbox" id="pw-gp"'+(gpOn?' checked':'')+'> General-purpose outlets every ~12 ft of wall</label>';
 h+='<div class="row"><button class="btn'+(ch?' pri':'')+'" id="pw-build">Rebuild power'+(ch?' · '+ch+' change'+(ch>1?'s':''):'')+'</button><button class="btn" id="pw-clear">Clear power</button></div>';
 h+='<p class="muted">Click an outlet to see its circuit. A plan for the electrician to price, not a wiring design.</p></div>';return h}
function outletCard(){var o=outBy(selO);if(!o)return '';var c=circBy(o.c),l=pwLoad(o),cw=c?circLoad(c):l.w,cap=(o.ph===3?1.732:1)*o.V*o.A*CAP80,pct=Math.min(100,cw/cap*100),many=c&&c.out.length>1;
 var h='<div class="card"><span class="lab">Selected</span><b style="font-size:15px">'+(o.gp?'General-purpose 120V 20A outlet':esc(tName(o.ty,o)))+'</b>';
 h+='<div class="irow"><span>Circuit</span><b>C'+o.c+(o.ty==='hw'||!many?' · own circuit':' · '+c.out.length+' outlets')+'</b></div>';
 h+='<div class="irow"><span>Where</span><b>'+(o.s<0?'Floor box or ceiling drop':'On the wall')+'</b></div>';
 if(!o.gp||cw){h+='<div><div class="irow" style="border:0;padding-bottom:2px"><span>Circuit load</span><b>'+Math.round(cw).toLocaleString()+' / '+Math.round(cap).toLocaleString()+' W</b></div><div class="bar"><i style="width:'+pct+'%;background:'+(cw>cap?'#d6453d':cw>cap*.9?'#e0a21f':'#3ba776')+'"></i></div><p class="muted" style="margin-top:4px">80% of '+o.A+'A, the limit for loads that run for hours.</p></div>'}
 h+=l.names.length?'<div class="irow"><span>Powers</span><b>'+esc(l.names.join(', '))+'</b></div>':o.gp?'<p class="muted">For chargers, hand tools, vacuums and lamps.</p>':'<div class="warn">Nothing uses this any more. Rebuild power to remove it.</div>';
 return h+'</div>'}

/* ---------------- drawing ---------------- */
var sv=$('#sv'),NS='http://www.w3.org/2000/svg',G={},popU=null,drag=null;
// view: z = zoom (1 = whole room fits), cx/cy = centre in feet (null = room centre)
var V={z:1,cx:null,cy:null};
function dimOff(){var o={t:0,l:0};if(!P.pw||P.pw.show===false)return o;var big=scale()>=16;P.pw.outlets.forEach(function(q){if(q.s===0)o.t=Math.max(o.t,big?30:16);if(q.s===3)o.l=Math.max(o.l,big?14+((q.gp?0:tShort(q.ty,q).length+1)+String(q.c).length+1)*5.8:16)});return o}
function fitVb(){var M=Math.max(2,Math.max(P.room.w,P.room.d)*.12)+(P.pw&&P.pw.show!==false?Math.max(3.5,Math.max(P.room.w,P.room.d)*.08):0);return {x:-M,y:-M,w:P.room.w+2*M,h:P.room.d+2*M}}
function zoomed(){return Math.abs(V.z-1)>1e-3||V.cx!=null}
function vb(){var b=fitVb();if(!zoomed())return b;var w=b.w/V.z,h=b.h/V.z,cx=V.cx==null?b.x+b.w/2:V.cx,cy=V.cy==null?b.y+b.h/2:V.cy;return {x:cx-w/2,y:cy-h/2,w:w,h:h}}
function setVb(){var v=vb();sv.setAttribute('viewBox',v.x+' '+v.y+' '+v.w+' '+v.h)}
function clampView(){var b=fitVb();if(V.cx==null){V.cx=b.x+b.w/2;V.cy=b.y+b.h/2}V.cx=Math.max(0,Math.min(P.room.w,V.cx));V.cy=Math.max(0,Math.min(P.room.d,V.cy))}
function zoomAt(x,y,f){var p0=toFt({clientX:x,clientY:y});clampView();V.z=Math.max(.6,Math.min(12,V.z*f));setVb();var p1=toFt({clientX:x,clientY:y});V.cx+=p0.x-p1.x;V.cy+=p0.y-p1.y;clampView();if(Math.abs(V.z-1)<.02&&Math.abs(V.cx-P.room.w/2)<.3&&Math.abs(V.cy-P.room.d/2)<.3)fitView(true);render()}
function panBy(dx,dy){clampView();var k=scale();V.cx-=dx/k;V.cy-=dy/k;clampView();render()}
function fitView(quiet){V.z=1;V.cx=null;V.cy=null;if(!quiet)render()}
function scale(){var r=sv.getBoundingClientRect(),v=vb();return Math.min(r.width/v.w,r.height/v.h)||10}
function drawRoom(){var v=vb(),W=P.room.w,D=P.room.d,k=1/scale(),g='',dOff=dimOff();sv.setAttribute('viewBox',v.x+' '+v.y+' '+v.w+' '+v.h);
 g+='<rect x="0" y="0" width="'+W+'" height="'+D+'" fill="#fbfaf7"/>';for(var x=1;x<W;x++)g+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="'+D+'" stroke="'+(x%5?'#f0ede6':'#e4e0d6')+'" stroke-width="'+k+'"/>';for(var y=1;y<D;y++)g+='<line x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'" stroke="'+(y%5?'#f0ede6':'#e4e0d6')+'" stroke-width="'+k+'"/>';
 g+='<rect x="0" y="0" width="'+W+'" height="'+D+'" fill="none" stroke="#3a3936" stroke-width="'+(5*k)+'"/>';
 g+='<text x="'+(W/2)+'" y="'+(-(10+dOff.t)*k)+'" text-anchor="middle" font-size="'+(12*k)+'" fill="#6b6960">'+fmt(W)+' ft</text><text x="'+(-(8+dOff.l)*k)+'" y="'+(D/2)+'" text-anchor="middle" font-size="'+(12*k)+'" fill="#6b6960" transform="rotate(-90 '+(-(8+dOff.l)*k)+' '+(D/2)+')">'+fmt(D)+' ft</text>';
 return g}
function objInner(it,k){var c=defOf(it),m=dims(it,it.rot),b={x:0,y:0,w:m.w,d:m.d},cc=clr(c,b,it.rot),on=sel===it.u,h='';
 if(cc)h+='<rect x="'+cc.x+'" y="'+cc.y+'" width="'+cc.w+'" height="'+cc.d+'" fill="'+(kind(c)==='wall'?'rgba(150,140,120,.08)':'rgba(47,111,237,.035)')+'" stroke="#b9b4a8" stroke-width="'+k+'" stroke-dasharray="'+(5*k)+' '+(4*k)+'" pointer-events="none"/>';
 var art=ICONS[it.r];h+='<rect x="0" y="0" width="'+m.w+'" height="'+m.d+'" rx="0.2" fill="'+(art?'#fff':'#ece9e2')+'" stroke="'+(on?'#2f7de1':'#9d988c')+'" stroke-width="'+((on?2.4:1.2)*k)+'"/>';
 if(art)h+=iconFor({r:it.r,x:0,y:0,w:m.w,d:m.d,rot:it.rot});
 if(kind(c)==='wall'){var R=it.rot%4,x1=R===3?b.w:0,y1=R===0?b.d:0,x2=R===1?0:b.w,y2=R===2?0:b.d;if(R===0)y2=b.d;if(R===3)x2=b.w;h+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#5f5b52" stroke-width="'+(2.5*k)+'"/>'}
 if(on){var pd=4*k,dl=6*k,att='x="'+(-pd)+'" y="'+(-pd)+'" width="'+(m.w+2*pd)+'" height="'+(m.d+2*pd)+'" rx="'+(2*k)+'" fill="none" pointer-events="none"';
  h+='<rect '+att+' stroke="#fff" stroke-width="'+(2.6*k)+'"/><rect '+att+' stroke="#1d4f91" stroke-width="'+(1.8*k)+'" stroke-dasharray="'+dl+' '+dl+'"><animate attributeName="stroke-dashoffset" from="0" to="'+(-2*dl)+'" dur="0.6s" repeatCount="indefinite"/></rect>'}
 if(it.pin)h+='<circle cx="'+(m.w-.35)+'" cy=".35" r="'+(6*k)+'" fill="#e07b1f" stroke="#fff" stroke-width="'+(1.5*k)+'"/>';
 var fs=11*k;if(on||(!art&&m.w/k>50)){var t=c.n.length>20?c.n.slice(0,19)+'…':c.n;h+='<text x="'+(m.w/2)+'" y="'+(m.d/2+fs*.35)+'" text-anchor="middle" font-size="'+fs+'" font-weight="'+(on?700:500)+'" fill="'+(on?'#1d4f91':'#3a3936')+'" stroke="#fff" stroke-width="'+(3*k)+'" paint-order="stroke" pointer-events="none">'+esc(t)+'</text>'}
 return h}
function render(){var k=1/scale();if(!G.room){sv.innerHTML='<g id="g-room"></g><g id="g-obj"></g><g id="g-pw"></g><g id="g-ghost"></g>';G.room=sv.querySelector('#g-room');G.obj=sv.querySelector('#g-obj');G.pw=sv.querySelector('#g-pw');G.ghost=sv.querySelector('#g-ghost')}
 G.room.innerHTML=drawRoom();var seen={};
 P.items.forEach(function(it){var el=G.obj.querySelector('[data-u="'+it.u+'"]');if(!el){el=document.createElementNS(NS,'g');el.setAttribute('class','obj');el.dataset.u=it.u;el.style.cursor='grab';el.style.transform='translate('+it.x+'px,'+it.y+'px)';G.obj.appendChild(el)}
  var key=[it.r,it.rot,sel===it.u,!!it.pin,k.toFixed(4)].join('|');if(el.dataset.k!==key){el.dataset.k=key;el.innerHTML=objInner(it,k)}
  if(!(drag&&drag.u===it.u&&drag.moved)){var turned=el.dataset.rot!=null&&el.dataset.rot!==String(it.rot);el.dataset.rot=it.rot;if(turned){el.style.transition='none';el.style.transform='translate('+it.x+'px,'+it.y+'px)';el.getBoundingClientRect();el.style.transition='';pop(it.u)}else el.style.transform='translate('+it.x+'px,'+it.y+'px)'}seen[it.u]=1;el.classList.toggle('pop',popU===it.u)});
 Array.prototype.slice.call(G.obj.children).forEach(function(el){if(!seen[el.dataset.u])el.remove()});var grp0=pwGroup();Array.prototype.forEach.call(G.obj.children,function(el){el.classList.toggle('dim',!!grp0&&!grp0.items[el.dataset.u])});if(selO&&!outBy(selO))selO=null;G.pw.innerHTML=drawPower(k);
 $('#rname').value=P.name;side();markLib();$('#b-fit').style.display=zoomed()?'':'none';$('#b-undo').disabled=!hist.length;$('#b-redo').disabled=!fut.length}
var howOpen=false;try{howOpen=localStorage.getItem('sp-howto')==='1'}catch(_){}
// touch screens get touch words; switches if someone picks up a mouse (or a pen/finger) mid-session
var TOUCH=false;try{TOUCH=matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&!matchMedia('(pointer: fine)').matches)}catch(_){}
document.addEventListener('pointerdown',function(e){var t=e.pointerType!=='mouse';if(t===TOUCH)return;TOUCH=t;var k=document.querySelector('#howto .hkeys');if(k)k.innerHTML=howRows();libTip()},true);
function libTip(){var l=document.getElementById('libtip');if(l)l.textContent=TOUCH?'Tap an object to add it. It finds its own spot. Or hold and drag it onto the plan to place it yourself.':'Click an object to add it. It finds its own spot. Or drag it onto the plan to place it yourself.'}
function howRows(){var kb=function(t){return '<span class="kb">'+t+'</span>'},row=function(k,t){return '<span class="hk">'+k+'</span><span>'+t+'</span>'},pw=!!P.pw;
 if(TOUCH)return row(kb('Tap'),'Add an object; it finds its own spot')+row(kb('Hold')+kb('Drag'),'Place it yourself on the plan')+row(kb('Drag'),'Move an object on the plan')+row(kb('Push into wall'),'Turn it to face the room')+row(kb('↺')+kb('↻'),'Turn the selected one')+row(kb('Remove'),'Remove the selected one')+row(kb('Pinch'),'Zoom')+row(kb('Drag floor'),'Move around when zoomed in')+row(kb('Fit'),'See the whole room again')+(pw?row(kb('Tap outlet'),'See its circuit and what it powers'):'')+row(kb('Tap floor'),'Deselect');
 return row(kb('Click'),'Add an object; it finds its own spot')+row(kb('Drag'),'Place it yourself on the plan')+row(kb('Drag'),'Move an object on the plan')+row(kb('Push into wall'),'Turn it to face the room')+row(kb('R')+kb('Shift R'),'Turn right / left')+row(kb('Del'),'Remove the selected one')+row(kb('Scroll'),'Zoom (pinch on a trackpad)')+row(kb('Drag floor'),'Move around when zoomed in')+row(kb('Double-click'),'Fit the whole room')+(pw?row(kb('Click outlet'),'See its circuit and what it powers'):'')+row(kb('Esc'),'Deselect')}
// "How to use the plan": one line, opens to the controls
function howTo(){return '<details class="howto" id="howto"'+(howOpen?' open':'')+'><summary><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5f5b52" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/></svg><span>How to Use</span><svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a867c" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="hkeys">'+howRows()+'</div></details>'}
function hintTxt(){return P.items.length?'Drag to move · push into a wall to turn it · R / Shift+R turn · scroll or pinch to zoom'+(P.pw&&P.pw.show!==false?' · click an outlet to see its circuit':''):'Click an object on the left to add it'}
function pop(u){popU=u;setTimeout(function(){popU=null},400)}
window.addEventListener('resize',function(){G.obj&&Array.prototype.forEach.call(G.obj.children,function(e){e.dataset.k=''});render()});

/* ---------------- dragging an object pins it ---------------- */
function toFt(e){var p=sv.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(sv.getScreenCTM().inverse())}
// zoom: mouse wheel / trackpad pinch, two-finger pinch on touch; drag empty floor to pan
sv.addEventListener('wheel',function(e){e.preventDefault();var dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?400:1);zoomAt(e.clientX,e.clientY,Math.exp(-dy*(e.ctrlKey?0.01:0.0018)))},{passive:false});
var touches={},pinch=null,pan=null;
function tpts(){return Object.keys(touches).map(function(k){return touches[k]})}
sv.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'){touches[e.pointerId]={x:e.clientX,y:e.clientY};var t=tpts();if(t.length===2){if(drag){drag.el.classList.remove('drag');drag.el.style.opacity='';drag.el.dataset.k='';ghost(null);drag=null;render()}pan=null;pinch={d:Math.hypot(t[0].x-t[1].x,t[0].y-t[1].y),mx:(t[0].x+t[1].x)/2,my:(t[0].y+t[1].y)/2};return}}
 if(pinch)return;var go=e.target.closest('g.out');if(go){selO=go.dataset.o;sel=null;render();e.preventDefault();return}var g=e.target.closest('g.obj');if(!g){pan={sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};try{sv.setPointerCapture(e.pointerId)}catch(_){}return}var it=byU(g.dataset.u),p=toFt(e);drag={u:it.u,el:g,dx:p.x-it.x,dy:p.y-it.y,sx:e.clientX,sy:e.clientY,moved:false};try{sv.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
// the free spot closest to where it was dropped: nothing else has to move, nobody's clearance is blocked
function others(it){return P.items.filter(function(o){return o!==it}).map(function(o){var mo=dims(o,o.rot),bo={x:o.x,y:o.y,w:mo.w,d:mo.d};return {b:bo,c:clr(defOf(o),bo,o.rot)}})}
function nearestFree(it,x,y,obs,rot){var c=defOf(it),m=dims(it,rot),W=P.room.w,D=P.room.d,best=null,bd=1e9;
 for(var yy=0;yy+m.d<=D+1e-6;yy+=.5)for(var xx=0;xx+m.w<=W+1e-6;xx+=.5){var dd=Math.hypot(xx-x,yy-y);if(dd>=bd)continue;var b={x:xx,y:yy,w:m.w,d:m.d};if(ok(b,clr(c,b,rot),obs,W,D)){bd=dd;best={x:xx,y:yy}}}
 return best}
function ghost(sp,it,rot){var g=G.ghost;if(!sp){g.innerHTML='';return}var m=dims(it,rot),k=1/scale();g.innerHTML='<rect x="'+sp.x+'" y="'+sp.y+'" width="'+m.w+'" height="'+m.d+'" fill="rgba(47,125,225,.10)" stroke="#2f7de1" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>'}
// pushing past a wall turns the object to sit against that wall: front-facing pieces face into the room, others run their long side along it
function wallTurn(it,s){var c=defOf(it);if(kind(c)==='wall')return s;var m=dims(it,0);return m.w>=m.d?s:(s+1)%4}
function drawAs(d,it,rot){if(d.shown===rot)return;d.shown=rot;var t=Object.assign({},it,{rot:rot});d.el.dataset.k='';d.el.innerHTML=objInner(t,1/scale())}
sv.addEventListener('pointermove',function(e){if(touches[e.pointerId]){touches[e.pointerId]={x:e.clientX,y:e.clientY}}
 if(pinch){var t=tpts();if(t.length<2)return;var d=Math.hypot(t[0].x-t[1].x,t[0].y-t[1].y),mx=(t[0].x+t[1].x)/2,my=(t[0].y+t[1].y)/2;if(pinch.d>0)zoomAt(mx,my,d/pinch.d);panBy(mx-pinch.mx,my-pinch.my);pinch.d=d;pinch.mx=mx;pinch.my=my;return}
 if(pan){if(!pan.moved&&Math.hypot(e.clientX-pan.sx,e.clientY-pan.sy)<4)return;pan.moved=true;sv.style.cursor='grabbing';panBy(e.clientX-pan.lx,e.clientY-pan.ly);pan.lx=e.clientX;pan.ly=e.clientY;return}
 if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<4)return;var it=byU(drag.u);if(!drag.moved){drag.obs=others(it);drag.rot=drag.shown=it.rot}drag.moved=true;
 var p=toFt(e),W=P.room.w,D=P.room.d,thr=Math.max(.75,18/scale()),over=[-p.y,p.x-W,p.y-D,-p.x],side=-1,bo=thr;
 for(var q=0;q<4;q++)if(over[q]>bo){bo=over[q];side=q}
 var x,y,rot,m;
 if(side>=0){rot=wallTurn(it,side);m=dims(it,rot);x=side===3?0:side===1?W-m.w:Math.round((p.x-m.w/2)*2)/2;y=side===0?0:side===2?D-m.d:Math.round((p.y-m.d/2)*2)/2}
 else{rot=it.rot;m=dims(it,rot);if(drag.rot!==it.rot){var m0=dims(it,drag.rot);drag.dx=m.w/2;drag.dy=m.d/2}x=Math.round((p.x-drag.dx)*2)/2;y=Math.round((p.y-drag.dy)*2)/2}
 x=Math.max(0,Math.min(W-m.w,x));y=Math.max(0,Math.min(D-m.d,y));drag.x=x;drag.y=y;drag.rot=rot;drawAs(drag,it,rot);
 drag.el.classList.add('drag');drag.el.style.transform='translate('+x+'px,'+y+'px)';
 drag.spot=nearestFree(it,x,y,drag.obs,rot);var exact=drag.spot&&drag.spot.x===x&&drag.spot.y===y;drag.el.style.opacity=exact?1:.6;ghost(exact?null:drag.spot,it,rot)});
function tEnd(e){delete touches[e.pointerId];if(tpts().length<2)pinch=null}
sv.addEventListener('pointercancel',function(e){tEnd(e);pan=null;sv.style.cursor=''});
sv.addEventListener('dblclick',function(e){if(!e.target.closest('g.obj')&&zoomed())fitView()});
sv.addEventListener('pointerup',function(e){var wasPinch=!!pinch||(e.pointerType==='touch'&&tpts().length>1);tEnd(e);if(wasPinch)return;
 if(pan){var pp=pan;pan=null;sv.style.cursor='';if(!pp.moved){sel=null;selO=null;render()}return}
 if(!drag)return;var d=drag;drag=null;d.el.classList.remove('drag');d.el.style.opacity='';ghost(null);var it=byU(d.u);
 if(!d.moved){sel=it.u;selO=null;render();return}
 var before=snapP();sel=it.u;selO=null;it.rot=d.rot;d.el.dataset.rot=it.rot;
 if(d.spot){it.x=d.spot.x;it.y=d.spot.y}else{it.x=d.x;it.y=d.y}
 if(!relayout({nogrow:true})){P=JSON.parse(before);lastFail=null;toast('No free spot for it, so it went back');d.el.dataset.k='';render();return}hist.push(before);fut=[];persist();render()});

/* ---------------- left: library ---------------- */
var openCats={},q='';
function libArt(i,col){var W=i.w,D=i.d,m=Math.max(W,D)*1.22,g=ICONS[i.r]?ICONS[i.r](W,D):'<rect x="'+(-W/2)+'" y="'+(-D/2)+'" width="'+W+'" height="'+D+'" rx="'+(Math.min(W,D)*0.08)+'" fill="'+col+'2e" stroke="'+col+'" stroke-width="'+(m*0.02)+'"/>';return '<svg viewBox="'+(-m/2)+' '+(-m/2)+' '+m+' '+m+'" preserveAspectRatio="xMidYMid meet" pointer-events="none">'+g+'</svg>'}
function card(i,col){var n=needs(i);return '<div class="lcard'+(MINE[i.r]?' mine':'')+'" data-r="'+esc(i.r)+'" style="--c:'+col+'" title="'+esc(i.n)+'" role="button" tabindex="0"><div class="lart">'+libArt(i,col)+'</div><div class="lnm">'+esc(i.n)+'</div><div class="lbdg"><span>'+fmt(i.w)+'×'+fmt(i.d)+'</span>'+(i.p?'<span class="p">⚡'+i.p[0]+'V</span>':'')+(n.water?'<span>water</span>':'')+(costTxt(i)?'<span>'+costTxt(i)+'</span>':'')+'</div></div>'}
function cats(){var by={},order=[];CATS.forEach(function(c){if(c[0]!=='Rooms & Zones'){order.push(c[0]);by[c[0]]={col:c[1],list:[]}}});by['My objects']={col:'#2f7de1',list:[]};order.unshift('My objects');
 Object.keys(LIB).forEach(function(r){var i=LIB[r],cat=MINE[r]?'My objects':i.c;if(!by[cat]){by[cat]={col:'#888',list:[]};order.push(cat)}by[cat].list.push(i)});return {by:by,order:order}}
function renderLib(){var c=cats(),s=q.toLowerCase().trim(),h='';
 c.order.forEach(function(name){var g=c.by[name],list=g.list.filter(function(i){return !s||i.n.toLowerCase().indexOf(s)>=0});if(!list.length)return;var open=s?true:!!openCats[name];
  h+='<div class="lsec'+(open?' open':'')+'"><button class="lsh" data-c="'+esc(name)+'"><i style="background:'+g.col+'"></i><span class="lsn">'+esc(name)+'</span><span class="lct">'+list.length+'</span><svg class="lchev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>';
  if(open)h+='<div class="lgrid">'+list.map(function(i){return card(i,g.col)}).join('')+'</div>';h+='</div>'});
 $('#lib').innerHTML=h||'<p class="muted">No objects match.</p>';
 $('#lib').querySelectorAll('.lsh').forEach(function(b){b.onclick=function(){openCats[b.dataset.c]=!openCats[b.dataset.c];renderLib()}});
 $('#lib').querySelectorAll('.lcard').forEach(function(b){b.onclick=function(){if(ldCard===b&&Date.now()-ldClick<400)return;add(b.dataset.r)};b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();add(b.dataset.r)}};b.oncontextmenu=function(e){e.preventDefault();if(ldrag||Date.now()-ldClick<800||e.pointerType==='touch'||(e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents))return;editObj(b.dataset.r)}});markLib()}
function markLib(){var cnt={};P.items.forEach(function(i){cnt[i.r]=(cnt[i.r]||0)+1});document.querySelectorAll('#lib .lcard').forEach(function(b){b.classList.toggle('sel',!!cnt[b.dataset.r])})}
$('#q').oninput=function(){q=this.value;renderLib()};libTip();
/* ---------------- drag from the library: hold and drag a card onto the plan to place it by hand ----------------
   Mouse: press and drag. Touch: hold for a moment, then drag (a quick swipe still scrolls the list).
   It lands where it's dropped (or the nearest free spot), skipping auto-placement. Push past a wall to turn it. */
var ldrag=null,ldClick=0,ldCard=null;
function ldCancel(){if(!ldrag)return;clearTimeout(ldrag.timer);if(ldrag.chip)ldrag.chip.remove();if(ldrag.card)ldrag.card.classList.remove('lifting');ghost(null);document.body.classList.remove('ldragging');ldrag=null}
function ldStart(){var d=ldrag;d.started=true;d.timer=null;var c=LIB[d.r];d.it={u:'__new',r:d.r,x:0,y:0,rot:0};d.obs=others(d.it);
 d.card.classList.add('lifting');document.body.classList.add('ldragging');try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
 var ch=document.createElement('div');ch.className='ldchip';ch.innerHTML='<div class="lart">'+libArt(c,getComputedStyle(d.card).getPropertyValue('--c')||'#888')+'</div><span>'+esc(c.n)+'</span>';document.body.appendChild(ch);d.chip=ch}
function ldOver(e){var r=sv.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom}
function ldMove(e){var d=ldrag;d.chip.style.transform='translate('+(e.clientX+14)+'px,'+(e.clientY+14)+'px)';
 if(!ldOver(e)){d.spot=null;d.chip.classList.remove('over');ghost(null);return}d.chip.classList.add('over');
 var p=toFt(e),W=P.room.w,D=P.room.d,it=d.it,thr=Math.max(.75,18/scale()),over=[-p.y,p.x-W,p.y-D,-p.x],side=-1,bo=thr,rot=0,m,x,y;
 for(var q=0;q<4;q++)if(over[q]>bo){bo=over[q];side=q}
 if(side>=0){rot=wallTurn(it,side);m=dims(it,rot);x=side===3?0:side===1?W-m.w:Math.round((p.x-m.w/2)*2)/2;y=side===0?0:side===2?D-m.d:Math.round((p.y-m.d/2)*2)/2}
 else{m=dims(it,0);x=Math.round((p.x-m.w/2)*2)/2;y=Math.round((p.y-m.d/2)*2)/2}
 x=Math.max(0,Math.min(W-m.w,x));y=Math.max(0,Math.min(D-m.d,y));
 if(m.w>W+1e-6||m.d>D+1e-6){d.spot=null;ghost(null);return}
 d.rot=rot;d.spot=nearestFree(it,x,y,d.obs,rot);var k=1/scale(),t=Object.assign({},it,{rot:rot}),exact=d.spot&&d.spot.x===x&&d.spot.y===y;
 G.ghost.innerHTML='<g transform="translate('+x+' '+y+')" opacity="'+(exact?.92:.45)+'" pointer-events="none">'+objInner(t,k)+'</g>'+(d.spot&&!exact?'<rect x="'+d.spot.x+'" y="'+d.spot.y+'" width="'+m.w+'" height="'+m.d+'" fill="rgba(47,125,225,.10)" stroke="#2f7de1" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>':'')}
function ldDrop(e){var d=ldrag;ldCancel();ldClick=Date.now();ldCard=d.card;if(!ldOver(e))return;
 if(!d.spot){toast(dims(d.it,0).w>P.room.w||dims(d.it,0).d>P.room.d?'It\'s bigger than the room. Make the room bigger first.':'No free spot for it there');return}
 var before=snapP(),it={u:'o'+(P.uid++),r:d.r,x:d.spot.x,y:d.spot.y,rot:d.rot,n:P.uid,placed:1};P.defs[d.r]=JSON.parse(JSON.stringify(LIB[d.r]));P.items.push(it);
 if(!relayout({nogrow:true})){P=JSON.parse(before);toast('No free spot for it there');render();return}
 hist.push(before);fut=[];sel=it.u;selO=null;lastFail=null;persist();render();pop(it.u)}
$('#lib').addEventListener('pointerdown',function(e){var b=e.target.closest('.lcard');if(!b||e.button>0||ldrag)return;
 ldrag={r:b.dataset.r,card:b,sx:e.clientX,sy:e.clientY,touch:e.pointerType!=='mouse',started:false};
 if(ldrag.touch)ldrag.timer=setTimeout(function(){if(ldrag&&!ldrag.started){ldStart();ldMove({clientX:ldrag.sx,clientY:ldrag.sy})}},320)});
window.addEventListener('pointermove',function(e){var d=ldrag;if(!d)return;var dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);
 if(!d.started){if(d.touch){if(dist>10)ldCancel()}else if(dist>6)ldStart();if(!ldrag||!ldrag.started)return}
 e.preventDefault();ldMove(e)},{passive:false});
window.addEventListener('pointerup',function(e){if(!ldrag)return;if(!ldrag.started){ldCancel();return}ldDrop(e)});
window.addEventListener('pointercancel',function(){if(ldrag&&!ldrag.started)ldCancel()});
// once a held card is lifted, stop the list from scrolling under the finger
window.addEventListener('touchmove',function(e){if(ldrag&&ldrag.started)e.preventDefault()},{passive:false});
window.addEventListener('keydown',function(e){if(e.key==='Escape'&&ldrag)ldCancel()});


/* ---------------- right: room, requirements, objects ---------------- */
var ICO={power:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',water:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',vent:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',gas:'<rect x="8" y="6" width="8" height="15" rx="3"/><path d="M10 3h4v3h-4z"/>',ceil:'<path d="M4 4h16M12 7v13M9 10l3-3 3 3M9 17l3 3 3-3"/>',cool:'<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/>',note:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'};
function ico(k){return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f5b52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO[k]+'</svg>'}
function power(list){var o={w:0,max:0,items:0,est:0,ded:{},sh:{}};list.forEach(function(it){var c=defOf(it);if(!c||!c.p)return;var V=c.p[0],W=c.p[1],A=c.p[2];o.items++;o.w+=W;o.max=Math.max(o.max,W);if(c.est)o.est++;if(c.p[3]){var k=V+'|'+A;(o.ded[k]=o.ded[k]||{V:V,A:A,n:0}).n++}else{(o.sh[V]=o.sh[V]||{V:V,w:0}).w+=W}});
 o.circ=[];Object.keys(o.ded).forEach(function(k){var d=o.ded[k];o.circ.push(d.n+' × '+d.V+'V '+d.A+'A dedicated')});Object.keys(o.sh).forEach(function(k){var g=o.sh[k],n=Math.max(1,Math.ceil(g.w/(g.V*20*.8)));o.circ.push(n+' × '+g.V+'V 20A shared')});o.peak=o.items?o.max+(o.w-o.max)*.5:0;return o}
function reqHtml(){var L=P.items.map(function(it){return {it:it,c:defOf(it)}}).filter(function(x){return x.c}),names=function(f){var s={};L.forEach(function(x){if(f(x))s[x.c.n]=(s[x.c.n]||0)+1});return Object.keys(s).map(function(n){return s[n]>1?n+' ×'+s[n]:n}).join(', ')};
 if(!L.length)return '<p class="muted">Add objects and the room\'s needs show up here: power, plumbing, ventilation and more.</p>';
 var h='',pw=power(P.items);
 var w=names(function(x){return needs(x.c).water});if(w)h+='<div class="rq">'+ico('water')+'<div><b>Plumbing</b> · water and drain</div><small>'+esc(w)+'</small></div>';
 var vv={};L.forEach(function(x){var n=needs(x.c);if(n.vent)(vv[n.vent]=vv[n.vent]||[]).push(x.c.n)});Object.keys(vv).forEach(function(k){h+='<div class="rq">'+ico('vent')+'<div><b>Ventilation</b> · '+esc(k)+'</div><small>'+esc(Array.from(new Set(vv[k])).join(', '))+'</small></div>'});
 var g=names(function(x){return needs(x.c).gas});if(g)h+='<div class="rq">'+ico('gas')+'<div><b>Compressed gas storage</b></div><small>'+esc(g)+'</small></div>';
 var ce=0,ceq=names(function(x){var n=needs(x.c);if(n.ceil>0)ce=Math.max(ce,n.ceil);return !!n.ceil});if(ceq)h+='<div class="rq">'+ico('ceil')+'<div><b>Ceiling height</b> · '+(ce?'at least '+fmt(ce)+' ft clear':'check clear height')+'</div><small>'+esc(ceq)+'</small></div>';
 var co=names(function(x){return needs(x.c).cool});if(co)h+='<div class="rq">'+ico('cool')+'<div><b>Cooling</b></div><small>'+esc(co)+'</small></div>';
 var ot={};L.forEach(function(x){needs(x.c).other.forEach(function(k){if(ALERTS[k])(ot[k]=ot[k]||[]).push(x.c.n)})});Object.keys(ot).forEach(function(k){h+='<div class="rq">'+ico('note')+'<div><b>'+esc(ALERTS[k][0])+'</b></div><small>'+esc(Array.from(new Set(ot[k])).join(', '))+'</small></div>'});
 return h||'<p class="muted">Nothing beyond power.</p>'}
// room strip under the top bar: size (edit in place), Dynamic Expansion, area, equipment cost, power
function strip(){var el=$('#strip');if(!el)return;var W=P.room.w,D=P.room.d,lo=0,hi=0,nc=0,pw=power(P.items);P.items.forEach(function(i){var c=defOf(i);if(c&&c.cost){lo+=c.cost[0];hi+=c.cost[1]}else nc++});
 var act=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#strip')?document.activeElement.id:null;
 el.innerHTML='<span class="slab">Room</span><span class="sdim"><input id="r-w" value="'+fmt(W)+'" inputmode="decimal" aria-label="Width in feet"><span>×</span><input id="r-d" value="'+fmt(D)+'" inputmode="decimal" aria-label="Depth in feet"><span class="mu">ft</span></span>'+
  '<label class="sw" title="'+(P.dyn?'The room grows to fit new objects. It never shrinks on its own.':'The room stays this size. Objects that don\'t fit are refused.')+'"><input type="checkbox" id="r-dyn"'+(P.dyn?' checked':'')+'> Dynamic Expansion</label>'+
  '<i class="ssep"></i><b>'+Math.round(W*D).toLocaleString()+' sq ft</b>'+
  '<i class="ssep"></i><span class="slab">Equipment</span><b title="Typical prices for new equipment'+(nc?'; '+nc+' object'+(nc>1?'s have':' has')+' no price':'')+'. Install, wiring and plumbing not included.">'+(hi?money(lo)+' – '+money(hi):'—')+'</b>'+
  '<i class="ssep"></i><span class="slab">Power</span><b>'+(pw.items?(pw.est?'≈ ':'')+fmtW(pw.w):'—')+'</b>'+(P.pw?'<span class="mu">· '+P.pw.circ.length+' circuit'+(P.pw.circ.length===1?'':'s')+'</span>':'');
 var apply=function(){var w=parseFloat($('#r-w').value),d=parseFloat($('#r-d').value);if(w===P.room.w&&d===P.room.d)return;setSize(w,d)};
 ['#r-w','#r-d'].forEach(function(q){var i=$(q);i.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();apply();i.blur()}else if(e.key==='Escape'){i.value=fmt(q==='#r-w'?P.room.w:P.room.d);i.blur()}};i.onchange=apply});
 $('#r-dyn').onchange=function(){push();P.dyn=this.checked;persist();render()};if(act&&$('#'+act))$('#'+act).focus()}
function side(){var W=P.room.w,D=P.room.d,h=howTo();
 if(lastFail&&lastFail.msg)h+='<div class="card"><div class="err"><span>'+esc(lastFail.msg)+'.</span><button class="btn" id="r-grow">Make room bigger and add it</button></div></div>';
 if(selO)h+=outletCard();var it=byU(sel);if(it){var c=defOf(it),m=dims(it,it.rot),ps=pstat(it);h+='<div class="card"><span class="lab">Selected</span><b style="font-size:15px">'+esc(c.n)+'</b>'+(it.pin?'<span class="pin" style="align-self:flex-start">Pinned here</span>':'')+
  '<div class="irow"><span>Size</span><b>'+fmt(m.w)+' × '+fmt(m.d)+' ft</b></div><div class="irow"><span>Clearance</span><b>'+clrTxt(c)+'</b></div>'+(costTxt(c)?'<div class="irow"><span>Typical cost</span><b>'+costTxt(c)+'</b></div>':'')+(c.p?'<div class="irow"><span>Power</span><b>'+c.p[0]+'V · '+fmtW(c.p[1])+(c.p[3]?' · own circuit':'')+'</b></div>':'')+(ps?(ps.o?'<div class="irow"><span>Plugged into</span><b>'+esc(tName(ps.o.ty,ps.o))+' · C'+ps.o.c+'</b></div>':'')+(ps.lv!=='ok'?'<div class="'+(ps.lv==='red'?'err':'warn')+'">'+esc(ps.why)+'</div>':''):'')+(c.no?'<p class="muted">'+esc(c.no)+'</p>':'')+
  '<div class="row"><button class="btn" id="o-rl" title="Turn left (Shift+R)">↺ Turn left</button><button class="btn" id="o-rr" title="Turn right (R)">↻ Turn right</button></div><div class="row"><button class="btn" id="o-pin">'+(it.pin?'Unpin':'Pin here')+'</button><button class="btn red" id="o-del">Remove</button></div></div>'}
 h+=powerCard();h+='<div class="card"><span class="lab">This room needs</span><div class="req">'+reqHtml()+'</div></div>';
 if(P.items.length){var cnt={};h+='<div class="card"><span class="lab">In this room · '+P.items.length+'</span><div class="ol">'+P.items.map(function(i){var c=defOf(i),m=dims(i,i.rot);return '<button class="oi'+(sel===i.u?' on':'')+'" data-u="'+i.u+'"><span class="nm">'+esc(c.n)+'</span>'+(i.pin?'<span class="pin">pinned</span>':'')+'<span class="sz">'+fmt(m.w)+'×'+fmt(m.d)+'</span></button>'}).join('')+'</div></div>'}
 var S=$('#side');S.innerHTML=h;strip();
 var gb=$('#r-grow');if(gb)gb.onclick=function(){var r=lastFail.r,c=LIB[r],before=snapP(),nit={u:'o'+(P.uid++),r:r,x:0,y:0,rot:0,n:P.uid};P.defs[r]=JSON.parse(JSON.stringify(c));P.items.push(nit);if(!relayout({force:true})){P=JSON.parse(before);toast('Even a much bigger room can\'t fit that');render();return}hist.push(before);fut=[];sel=nit.u;lastFail=null;persist();render()};
 var pb=$('#pw-build');if(pb)pb.onclick=function(){push();buildPower();selO=null;persist();render();toast('Power built out: '+P.pw.circ.length+' circuits')};
 var pg=$('#pw-gp');if(pg)pg.onchange=function(){push();P.pwo=Object.assign({},P.pwo,{gp:this.checked});if(P.pw)buildPower();persist();render()};
 var pc=$('#pw-clear');if(pc)pc.onclick=function(){push();P.pw=null;selO=null;persist();render()};
 var ht=$('#howto');if(ht)ht.ontoggle=function(){howOpen=ht.open;try{localStorage.setItem('sp-howto',howOpen?'1':'0')}catch(_){}};
 S.querySelectorAll('details.pg').forEach(function(d){d.ontoggle=function(){var k=d.dataset.k;if(d.open===(pwOpenK===k))return;pwOpenK=d.open?k:null;render()}});S.querySelectorAll('.pci').forEach(function(b){b.onclick=function(){sel=b.dataset.u;selO=null;render()}});S.querySelectorAll('.pch').forEach(function(b){b.onclick=function(){selO=b.dataset.o;sel=null;render()}});
 var ps2=$('#pw-show');if(ps2)ps2.onchange=function(){P.pw.show=this.checked;if(!this.checked)selO=null;persist();render()};
 if(it){$('#o-rl').onclick=function(){rotate(it.u,-1)};$('#o-rr').onclick=function(){rotate(it.u,1)};$('#o-pin').onclick=function(){setPin(it.u,!it.pin)};$('#o-del').onclick=function(){remove(it.u)}}
 S.querySelectorAll('.oi').forEach(function(b){b.onclick=function(){sel=b.dataset.u;render()}})}

/* ---------------- objects: make your own; the admin edits the shared library ---------------- */
function editObj(r){var c=r?LIB[r]:null,mine=!!(r&&MINE[r]),admin=!!(me&&me.admin);if(!tok){toast('Sign in to the test app to make your own objects');return}
 var canEdit=!c||mine||admin,shared=c&&!mine,d=$('#d-obj'),cs=CATS.filter(function(x){return x[0]!=='Rooms & Zones'}).map(function(x){return x[0]});
 var n=c?needs(c):{},p=c&&c.p?c.p:[0,0,20,0],title=!c?'New object':shared?(admin?'Edit shared object':'Object details'):'Edit my object';
 d.innerHTML='<form method="dialog" class="dlg"><h2>'+title+'</h2>'+(shared&&!admin?'<p class="muted">Shared objects are managed by the library owner. Save a copy to make your own version.</p>':'')+
  '<div class="fg"><label class="fl s2">Name<input name="n" required value="'+esc(c?c.n:'')+'"></label>'+
  '<label class="fl s2">Category<select name="c">'+cs.map(function(x){return '<option'+(c&&c.c===x?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select></label>'+
  '<label class="fl">Width (ft)<input name="w" inputmode="decimal" required value="'+(c?c.w:'')+'"></label><label class="fl">Depth (ft)<input name="d" inputmode="decimal" required value="'+(c?c.d:'')+'"></label>'+
  '<label class="fl">Typical cost, low ($)<input name="lo" inputmode="numeric" value="'+(c&&c.cost?c.cost[0]:'')+'"></label><label class="fl">Typical cost, high ($)<input name="hi" inputmode="numeric" value="'+(c&&c.cost?c.cost[1]:'')+'"></label>'+
  '<span class="muted s4">Clearance (ft): space that must stay empty to use it. Left and right as you face its front. Back 0 lets it stand against a wall.</span>'+['front','back','left','right'].map(function(n,i){var K=c?kOf(c):[0,0,0,0];return '<label class="fl">'+n.charAt(0).toUpperCase()+n.slice(1)+'<input name="k'+i+'" inputmode="decimal" value="'+fmt(K[i])+'"></label>'}).join('')+
  '<label class="fl">Power<select name="pv"><option value="0">none</option><option value="120"'+(p[0]===120?' selected':'')+'>120V</option><option value="240"'+(p[0]>=208?' selected':'')+'>240V</option></select></label><label class="fl">Watts<input name="pw" inputmode="decimal" value="'+(p[1]||'')+'"></label>'+
  '<label class="fl s2">Min. ceiling height (ft)<input name="ceil" inputmode="decimal" value="'+(n.ceil>0?n.ceil:'')+'"></label>'+
  '<div class="cks s4"><label class="ck"><input type="checkbox" name="pd"'+(p[3]?' checked':'')+'> Needs its own circuit</label><label class="ck"><input type="checkbox" name="water"'+(n.water?' checked':'')+'> Needs plumbing</label><label class="ck"><input type="checkbox" name="vent"'+(n.vent?' checked':'')+'> Needs ventilation</label><label class="ck"><input type="checkbox" name="gas"'+(n.gas?' checked':'')+'> Uses compressed gas</label></div>'+
  '<label class="fl s4">Notes<textarea name="no" rows="2">'+esc(c&&c.no||'')+'</textarea></label></div>'+(!c&&admin?'<label class="ck" style="margin-top:10px"><input type="checkbox" name="sh" checked> Add to the shared library (everyone sees it)</label>':'')+
  '<div class="row" style="justify-content:space-between"><span class="row">'+(c&&canEdit?'<button class="btn red" value="del" formnovalidate>'+(shared?'Remove from library':'Delete')+'</button>':'')+'</span><span class="row"><button class="btn" value="cancel" formnovalidate>Cancel</button>'+(shared?'<button class="btn" value="copy">Save as my own copy</button>':'')+(canEdit?'<button class="btn pri" value="save">Save</button>':'')+'</span></div></form>';
 if(shared&&!admin)Array.prototype.forEach.call(d.querySelectorAll('input,select,textarea'),function(el){if(el.name)el.dataset.ro=1});
 d.onclose=function(){var v=d.returnValue,f=d.querySelector('form');if(v==='cancel'||!v)return;
  if(v==='del'){if(!confirm((shared?'Remove '+c.n+' from the shared library for everyone?':'Delete '+c.n+'?')))return;api('DELETE','/api/objects/'+r).then(function(){toast(c.n+' removed');return loadLib()}).then(renderLib).catch(function(e){toast(e.message)});return}
  var F=function(k){return f.elements[k]},num=function(k){return parseFloat(F(k).value)||0},nd={n:F('n').value.trim(),c:F('c').value,w:num('w'),d:num('d'),k:[num('k0'),num('k1'),num('k2'),num('k3')]};normObj(nd);
  var pv=+F('pv').value;if(pv)nd.p=[pv===240?240:120,num('pw'),pv===240?30:20,F('pd').checked?1:0];nd.req={water:F('water').checked,vent:F('vent').checked,gas:F('gas').checked,ceil:num('ceil')};if(F('no').value.trim())nd.no=F('no').value.trim();var lo=num('lo'),hi=num('hi');if(lo||hi)nd.cost=[Math.min(lo||hi,hi||lo),Math.max(lo,hi)];if(admin&&shared)nd.ed=1;
  if(c&&c.a)nd.a=c.a.slice();if(c&&c.ov)nd.ov=1;if(c&&c.est)nd.est=c.est;if(!nd.n||!(nd.w>0&&nd.d>0)){toast('An object needs a name, width and depth');return}
  var slug=nd.n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Date.now().toString(36).slice(-4),toShared=!c&&admin&&f.elements.sh&&f.elements.sh.checked;
  var key=toShared?'s-'+slug:(v==='copy'||!c)?'u'+me.id+'-'+slug:r;
  api('PUT','/api/objects/'+key,{data:nd}).then(function(){toast((toShared?'Added to the shared library':v==='copy'?'Copy saved to My objects':'Saved')+': '+nd.n);return loadLib()}).then(function(){P.items.forEach(function(i){if(i.r===key)P.defs[key]=JSON.parse(JSON.stringify(LIB[key]))});if(toShared)openCats[nd.c]=true;else if(!c||v==='copy')openCats['My objects']=true;renderLib();relayout();render()}).catch(function(e){toast(e.message)})};
 d.showModal()}
$('#b-newobj').onclick=function(){editObj(null)};
$('#b-undo').onclick=function(){undo()};$('#b-fit').onclick=function(){fitView()};$('#b-redo').onclick=function(){redo()};

/* ---------------- saving rooms ---------------- */
function pack(){var defs={};P.items.forEach(function(i){var c=defOf(i);if(c)defs[i.r]=c});return {room:P.room,dyn:P.dyn,uid:P.uid,pw:P.pw,pwo:P.pwo,items:P.items.map(function(i){return {u:i.u,r:i.r,x:i.x,y:i.y,rot:i.rot,pin:!!i.pin,n:i.n}}),defs:defs}}
$('#rname').onchange=function(){P.name=this.value.trim()||'Untitled room';persist()};
$('#b-save').onclick=function(){if(!tok){toast('Sign in to the test app first to save rooms to your account');return}P.name=$('#rname').value.trim()||'Untitled room';var b={name:P.name,data:pack()};
 (P.id?api('PUT','/api/spaces/'+P.id,b):api('POST','/api/spaces',b).then(function(j){P.id=j.id})).then(function(){persist();toast('Saved “'+P.name+'”')}).catch(function(e){toast(e.message)})};
$('#b-new').onclick=function(){push();P=blank();V={z:1,cx:null,cy:null};sel=null;selO=null;lastFail=null;persist();render()};
$('#b-open').onclick=function(){if(!tok){toast('Sign in to the test app first to open saved rooms');return}api('GET','/api/spaces').then(function(j){var d=$('#d-open');
 d.innerHTML='<form method="dialog" class="dlg"><h2>Open a room</h2>'+(j.spaces.length?'<div class="spl">'+j.spaces.map(function(s){return '<button value="'+s.id+'"><span>'+esc(s.name)+'</span><small>'+esc(s.updated_at.slice(0,16))+'</small></button>'}).join('')+'</div>':'<p class="muted">No saved rooms yet.</p>')+'<div class="row" style="justify-content:flex-end"><button class="btn" value="">Close</button></div></form>';
 d.onclose=function(){var id=d.returnValue;if(!id)return;api('GET','/api/spaces/'+id).then(function(r){push();var x=migrate(r.space.data);P=Object.assign(blank(),{id:r.space.id,name:r.space.name,room:x.room,dyn:x.dyn!==false,uid:x.uid||1,items:x.items||[],defs:x.defs||{},pw:x.pw||null,pwo:x.pwo||{gp:true}});sel=null;selO=null;lastFail=null;persist();render();toast('Opened “'+P.name+'”')}).catch(function(e){toast(e.message)})};d.showModal()}).catch(function(e){toast(e.message)})};
function showWho(){$('#who').innerHTML=me?'Signed in as <b>'+esc(me.username)+'</b>'+(me.admin?' · library owner':''):'Not signed in · <a href="index.html">sign in to the test app</a> to save'}
showWho();
if(tok)api('GET','/api/me').then(function(j){me=j.user;showWho();return loadLib()}).then(function(){renderLib();render()}).catch(function(){tok=null;me=null;showWho()});
renderLib();render();
window.__sp={P:function(){return P},build:function(){buildPower();render()},pstat:function(u){return pstat(byU(u))},changes:pwChanges,conv:converter,layout:layout,add:add,setSize:setSize,lib:function(){return LIB},sel:function(){return sel},undo:undo};
})();
