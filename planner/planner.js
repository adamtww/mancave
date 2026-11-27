(function(){
"use strict";
/*EXPLORE*/
/*ZONES*/
/*ROOMS*/
/*FLOORS*/
/*OPENINGS*/
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
// short form for tight spots: "1.5 ft around, back 0" / "3 ft front"
function clrShort(c){var k=kOf(c),n=['front','back','left','right'];if(!(k[0]||k[1]||k[2]||k[3]))return 'none';var cnt={};k.forEach(function(v){cnt[v]=(cnt[v]||0)+1});
 var top=+Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]||b-a})[0];if(cnt[top]===4)return fmt(top)+' ft all around';
 var ex=[];k.forEach(function(v,i){if(v!==top)ex.push(n[i]+' '+fmt(v))});return top?fmt(top)+' ft around, '+ex.join(', '):k.map(function(v,i){return v?fmt(v)+' ft '+n[i]:''}).filter(Boolean).join(', ')}
function clrTxt(c){var k=kOf(c);if(!(k[0]||k[1]||k[2]||k[3]))return 'none';if(k[0]===k[1]&&k[1]===k[2]&&k[2]===k[3])return fmt(k[0])+' ft all around';var n=['front','back','left','right'],o=[];k.forEach(function(v,i){if(v)o.push(fmt(v)+' ft '+n[i])});return o.join(' · ')}
function money(v){return v>=1000?'$'+(v>=10000?Math.round(v/1000):Math.round(v/100)/10)+'k':'$'+Math.round(v)}
function costTxt(c){if(!c||!c.cost)return '';var a=c.cost[0],b=c.cost[1];if(!a&&!b)return '';return a===b?money(a):money(a)+'–'+money(b)}
function fmtW(w){return w>=1000?(Math.round(w/100)/10).toLocaleString('en-US')+' kW':Math.round(w)+' W'}
var tt=null;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2600)}

/* ---------------- the object library: built-in catalog + shared edits + my own ---------------- */
var LIB={},MINE={},EDITED={},SHAREDROWS=0;
function baseLib(){LIB={};CATALOG.forEach(function(c){if(c.z||c.hide||c.r==='b-wall'||c.c==='Rooms & Zones')return;LIB[c.r]=JSON.parse(JSON.stringify(c))})}
baseLib();
// The catalog is the source of truth for built-in objects. A shared row only replaces a built-in when the
// library owner actually edited it (rows copied in by the old one-time seed are ignored), and never for a retired id.
function loadLib(){if(!tok)return Promise.resolve();return api('GET','/api/objects').then(function(j){baseLib();MINE={};EDITED={};SHAREDROWS=0;
  var sh=j.objects.filter(function(o){return o.shared}),t0=sh.reduce(function(m,o){var t=Date.parse(o.updated_at+'Z')||0;return Math.min(m,t)},Infinity);
  j.objects.forEach(function(o){if(ALIAS[o.r])return;
   if(o.shared){SHAREDROWS++;var builtIn=!!BY[o.r],edited=(o.data&&o.data.ed)||(Date.parse(o.updated_at+'Z')||0)>t0+60000;
    if(o.deleted){delete LIB[o.r];return}
    if(builtIn&&!edited)return;LIB[o.r]=normObj(Object.assign({},o.data,{r:o.r}))}
   else if(o.mine&&!(o.data&&o.data.base)){LIB[o.r]=normObj(Object.assign({},o.data,{r:o.r}));MINE[o.r]=1}});
  // your own versions of library objects: they replace the original for you only, and can be reverted
  j.objects.forEach(function(o){var b=o.mine&&o.data&&o.data.base;if(!b||!LIB[b]||MINE[b])return;var d=Object.assign({},o.data,{r:b,uv:o.updated_at||1});delete d.base;LIB[b]=normObj(d);EDITED[b]=o.r});
 }).catch(function(e){if(e.status===401){tok=null;showWho()}})}
// rooms saved before an object was retired: move them onto its generic replacement
function migrate(x){(x.items||[]).forEach(function(it){var n=ALIAS[it.r];if(n&&BY[n]){if(x.defs){delete x.defs[it.r];x.defs[n]=JSON.parse(JSON.stringify(BY[n]))}it.r=n}});if(x.defs)Object.keys(x.defs).forEach(function(r){if(ALIAS[r])delete x.defs[r]});return x}
// Rooms keep a copy of each object they use. When you edit (or revert) a library object, every copy of it on the
// floor plan switches to the new version: right away in the open room, and when you open any other saved room.
// Only your own objects and your edited versions are synced, so built-in objects in old rooms are left as they were.
function syncDefs(say){if(!P||!P.items)return 0;P.defs=P.defs||{};var seen={},n=0;P.items.forEach(function(i){var r=i.r;if(seen[r])return;seen[r]=1;var L=LIB[r],D=P.defs[r];
  if(!L||!(MINE[r]||EDITED[r]||(D&&D.uv)))return;var j=JSON.stringify(L);if(D&&JSON.stringify(D)===j)return;P.defs[r]=JSON.parse(j);n+=P.items.filter(function(x){return x.r===r}).length});
 if(n){relayout();persist();render();if(say)toast('Updated '+n+' object'+(n>1?'s':'')+' on the floor plan')}else if(say)render();return n}
function defOf0(it){return (P.defs&&P.defs[it.r])||LIB[it.r]||(BY[it.r]&&BY[it.r].hide?BY[it.r]:null)}
// A placed object can have its own clearance (it.k) or reach (it.reach); its own size lives in it.w / it.d (see dims).
var DEFX=typeof WeakMap!=='undefined'?new WeakMap():null;
function defOf(it){var c=defOf0(it);if(!c||!(it.k||it.reach!=null))return c;var e=DEFX&&DEFX.get(it);if(e&&e.c===c&&e.k===it.k&&e.re===it.reach)return e.v;
 var v=Object.assign({},c);if(it.k)v.k=it.k.slice();if(it.reach!=null)v.reach=it.reach;if(DEFX)DEFX.set(it,{c:c,k:it.k,re:it.reach,v:v});return v}
function itEdited(it,f){var c=defOf0(it);if(!c)return false;if(f==='size')return !!((it.w&&it.w!==c.w)||(it.d&&it.d!==c.d));if(f==='k')return !!it.k&&JSON.stringify(it.k)!==JSON.stringify(kOf(c));if(f==='reach')return it.reach!=null&&it.reach!==(c.reach||0);return false}
// what a room needs because of what's in it
function needs(c){var a=c.a||[],q=c.req||{},o={};
 o.water=!!q.water||a.indexOf('plumbing')>=0||a.indexOf('garden')>=0||/sink|dishwasher|ice m|shower|toilet/i.test(c.n);
 o.vent=q.vent?'Ventilation':a.indexOf('fumes')>=0?'Fume extraction':a.indexOf('co2')>=0?'Fume exhaust to outside':a.indexOf('weld')>=0?'Ventilation for welding':a.indexOf('commercial')>=0?'Type I hood with fire suppression':a.indexOf('dust')>=0?'Dust collection':'';
 o.gas=!!q.gas||a.indexOf('gas')>=0;o.humid=a.indexOf('garden')>=0;o.ceil=+q.ceil||(a.indexOf('ceiling')>=0?-1:0);o.cool=a.indexOf('hvac')>=0;o.other=a.filter(function(k){return ['plumbing','garden','co2','weld','commercial','dust','gas','ceiling','hvac','fumes'].indexOf(k)<0});return o}

/* ---------------- the room ---------------- */
var P,hist=[],fut=[],sel=null,selO=null,lastFail=null;
function blank(){return {id:null,name:'Untitled room',room:{w:10,d:10,h:15},dyn:true,items:[],defs:{},uid:1,pw:null,pwo:{gp:true}}}
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
function ok(b,c,placed,W,D){if(!inside(b,W,D)||(c&&!inside(c,W,D)))return false;if((P.rooms&&P.rooms.length||PREF)&&!wallOK(b,c,false))return false;for(var i=0;i<placed.length;i++){var p=placed[i];if(hit(b,p.b)||(p.c&&hit(b,p.c))||(c&&hit(c,p.b)))return false}return true}
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
// floor and ceiling are separate layers: they never collide with each other and are placed independently
function isC(it){var c=defOf(it);return !!(c&&c.ceiling)}
// Lights level: general ceiling fixtures and light zones. Task/accent and specialty lights stay on Ceiling (hidden from the catalog for now)
function isLt(c){return !!(c&&c.ceiling&&c.c==='Lighting – General')}
function cv(){return VW.lv!=='g'}
var HIDECATS=['Lighting – Task & Accent','Lighting – Specialty'];
function layout(items,W,D,stable){var cl=items.filter(isC);if(!cl.length)return layout1(items,W,D,stable);if(cl.length===items.length)return layoutCeil(cl,[],{},W,D,stable);
 var fl=items.filter(function(i){return !isC(i)}),a=layout1(fl,W,D,stable);if(!a.pos)return a;var b=layoutCeil(cl,fl,a.pos,W,D,stable);if(!b.pos)return b;return {pos:Object.assign({},a.pos,b.pos)}}
// Ceiling objects: lights over the thing they're for (pool table light over the pool table, bar pendants over the bar,
// task light over a bench, grow lights over grow racks); everything else spreads out evenly, each new one going to the
// spot farthest from its own kind and from the walls. Ceiling objects only avoid each other.
var OVER={'cl-pool':/pool table|billiard|snooker/i,'cl-pend':/bar counter|island|high-top|drink rail|bar top/i,'cl-task':/bench|desk|station|table saw|assembly/i,'cl-growb':/grow|hydro|sprout|seed|plant|germin|flood|microgreen/i,'cl-growp':/grow|hydro|sprout|seed|plant|germin|flood|microgreen/i};
function cgroup(c){return /Lighting – General/.test(c.c)?'L':/Lighting/.test(c.c)?'T':c.c==='Sound'?'S':'C'}
function layoutCeil(items,floor,fpos,W,D,stable){var placed=[],out={},order=items.slice().sort(function(a,b){return (stable&&b.placed?1:0)-(stable&&a.placed?1:0)||a.n-b.n}),used={};
 var free=function(b,c){if(b.x<-1e-6||b.y<-1e-6||b.x+b.w>W+1e-6||b.y+b.d>D+1e-6)return false;if(P.rooms&&P.rooms.length&&!wallOK(b,null,true))return false;for(var i=0;i<placed.length;i++)if(hit(b,placed[i].b)&&!(c&&stackOK(c,b,placed[i].c,placed[i].b)))return false;return true};
 var fbox=function(f){var q=fpos[f.u]||f,m=dims(f,q.rot);return {x:q.x,y:q.y,w:m.w,d:m.d}};
 var near=function(m,cx,cy){var best=null,bd=1e9,st=.5;for(var y=0;y+m.d<=D+1e-6;y+=st)for(var x=0;x+m.w<=W+1e-6;x+=st){var b={x:x,y:y,w:m.w,d:m.d},dd=Math.hypot(x+m.w/2-cx,y+m.d/2-cy);if(dd<bd&&free(b)){bd=dd;best=b}}return best};
 for(var i=0;i<order.length;i++){var it=order[i],c=defOf(it),rot=it.rot||0,m=dims(it,rot),b=null;
  if(stable&&it.placed){var b0={x:it.x,y:it.y,w:m.w,d:m.d};if(free(b0,c))b=b0}
  if(!b&&OVER[it.r]){var tg=floor.filter(function(f){var fc=defOf(f);return fc&&OVER[it.r].test(fc.n)&&!used[it.r+f.u]});
   if(tg.length){var f=tg[0],fb=fbox(f);used[it.r+f.u]=1;var r2=(fb.w>=fb.d)!==(m.w>=m.d)?(rot+1)%4:rot;m=dims(it,r2);rot=r2;b=near(m,fb.x+fb.w/2,fb.y+fb.d/2)}}
  if(!b){var g=cgroup(c),mine=placed.filter(function(p){return p.g===g}),st=Math.max(.5,Math.round(Math.min(W,D)/20*2)/2),best=null,bs=-1e9;
   for(var y=0;y+m.d<=D+1e-6;y+=st)for(var x=0;x+m.w<=W+1e-6;x+=st){var bb={x:x,y:y,w:m.w,d:m.d};if(!free(bb))continue;var cx=x+m.w/2,cy=y+m.d/2,
     sc=Math.min(cx,W-cx,cy,D-cy)*2;mine.forEach(function(p){sc=Math.min(sc,Math.hypot(cx-p.cx,cy-p.cy))});if(!mine.length)sc=-Math.hypot(cx-W/2,cy-D/2);if(sc>bs){bs=sc;best=bb}}
   b=best}
  if(!b)return {fail:it};placed.push({b:b,g:cgroup(c),c:c,cx:b.x+b.w/2,cy:b.y+b.d/2});out[it.u]={x:b.x,y:b.y,rot:rot}}
 return {pos:out}}
function layout1(items,W,D,stable){var placed=[],out={},order=items.slice(),moved=[];
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
// a copy of a placed object, with its edits and rotation, in the nearest free spot beside it
function dupItem(u){var it=byU(u);if(!it)return;var before=snapP(),n=JSON.parse(JSON.stringify(it)),m=dims(it,it.rot);n.u='o'+(P.uid++);n.n=P.uid;delete n.pin;n.placed=1;
 var obs=others(n),sp=nearestFree(n,it.x+m.w+.5,it.y,obs,it.rot)||nearestFree(n,it.x,it.y+m.d+.5,obs,it.rot);if(!sp){P.uid--;toast('No free spot nearby for a copy');return}
 n.x=sp.x;n.y=sp.y;P.items.push(n);hist.push(before);if(hist.length>60)hist.shift();fut=[];sel=n.u;persist();render()}
function add(r){var c=LIB[r];if(!c)return;var before=snapP(),it={u:'o'+(P.uid++),r:r,x:0,y:0,rot:0,n:P.uid};P.defs[r]=JSON.parse(JSON.stringify(c));P.items.push(it);
 if(!relayout()){var msg=lastFail;P=JSON.parse(before);lastFail={msg:msg,r:r};render();return}
 hist.push(before);fut=[];sel=it.u;lastFail=null;persist();render();pop(it.u)}
function remove(u){push();P.items=P.items.filter(function(i){return i.u!==u});if(sel===u)sel=null;relayout();persist();render()}
// Resizing pushes things to fit, in steps: keep everything where it is (walls carry their pieces with them),
// then nudge only what clashes, then re-place everything near where it was, and only then rearrange from scratch.
function scaled(items,W,D,W2,D2){var h=function(v){return Math.round(v*2)/2};return items.map(function(it){var m=dims(it,it.rot),o=Object.assign({},it,{pin:false});if(!it.placed)return o;
 o.x=it.x+m.w>=W-1e-6?W2-m.w:it.x<=1e-6?0:h((it.x+m.w/2)*W2/W-m.w/2);o.y=it.y+m.d>=D-1e-6?D2-m.d:it.y<=1e-6?0:h((it.y+m.d/2)*D2/D-m.d/2);
 o.x=Math.max(0,Math.min(W2-m.w,o.x));o.y=Math.max(0,Math.min(D2-m.d,o.y));return o})}
// Resizing without breaking up arrangements: shrinking removes empty strips of floor (the widest gaps first,
// keeping a little breathing room where it can); growing adds the new space in the widest gap. Groups keep
// their shape and pieces against a moving wall go with it. Returns maps for both axes, or null if it can't.
function squeezeAxis(spans,L,L2){var S=.5,n=Math.round(L/S),cov=new Array(n).fill(false);
 spans.forEach(function(s){for(var i=Math.max(0,Math.floor(s[0]/S+1e-6));i<Math.min(n,Math.ceil(s[1]/S-1e-6));i++)cov[i]=true});
 var gaps=[],i=0;while(i<n){if(cov[i]){i++;continue}var j=i;while(j<n&&!cov[j])j++;gaps.push({a:i,b:j,edge:i===0||j===n});i=j}
 var cut=new Array(n).fill(0),ins=null,need=Math.round((L-L2)/S);
 if(need<0){var g=gaps.filter(function(g){return !g.edge}).sort(function(a,b){return (b.b-b.a)-(a.b-a.a)})[0]||gaps.filter(function(g){return g.b===n})[0];ins={at:g?(g.a+g.b)/2*S:L,len:L2-L}}
 else if(need>0){var order=gaps.slice().sort(function(a,b){return (b.edge-a.edge)||((b.b-b.a)-(a.b-a.a))}),
   take=function(keep){order.forEach(function(g){if(need<=0)return;var free=[];for(var q=g.a;q<g.b;q++)if(!cut[q])free.push(q);var res=g.edge?0:Math.min(free.length,Math.round(keep/S)),c=Math.min(need,free.length-res);if(c<=0)return;
    var st=Math.floor((free.length-c)/2);for(var t=st;t<st+c;t++)cut[free[t]]=1;need-=c})};
  take(3);take(1);take(0);if(need>0)return null}
 var pre=[0];for(var q=0;q<n;q++)pre.push(pre[q]+cut[q]);
 return function(v){if(ins)return v>=ins.at-1e-6?v+ins.len:v;var c=Math.max(0,Math.min(n,Math.round(v/S)));return v-pre[c]*S}}
function squeezed(items,W,D,w,d){var sx=[],sy=[];items.forEach(function(it){if(!it.placed||isC(it))return;var m=dims(it,it.rot),b={x:it.x,y:it.y,w:m.w,d:m.d},c=clr(defOf(it),b,it.rot)||b;
  sx.push([Math.min(b.x,c.x),Math.max(b.x+b.w,c.x+c.w)]);sy.push([Math.min(b.y,c.y),Math.max(b.y+b.d,c.y+c.d)])});
 var fx=w===W?function(v){return v}:squeezeAxis(sx,W,w),fy=d===D?function(v){return v}:squeezeAxis(sy,D,d);if(!fx||!fy)return null;
 return {fx:fx,fy:fy,items:items.map(function(it){var o=Object.assign({},it);if(!it.placed)return o;var m=dims(it,it.rot);
  o.x=it.x+m.w>=W-1e-6?w-m.w:fx(it.x);o.y=it.y+m.d>=D-1e-6?d-m.d:fy(it.y);o.x=Math.max(0,Math.min(w-m.w,o.x));o.y=Math.max(0,Math.min(d-m.d,o.y));return o})}}
function setSize(w,d){if(!(w>=2&&d>=2&&w<=300&&d<=300)){toast('Use a size between 2 and 300 ft');return}
 var W=P.room.w,D=P.room.d,sq=squeezed(P.items,W,D,w,d),base=scaled(P.items,W,D,w,d),free=P.items.map(function(it){return Object.assign({},it,{pin:false})}),r,how,mapO=null;
 if(sq){r=layout(sq.items,w,d,true);if(r.pos&&sq.items.every(function(it){var q=r.pos[it.u];return !it.placed||(q&&q.x===it.x&&q.y===it.y)}))mapO=sq;else r={}}
 if(!r||!r.pos)r=layout(base,w,d,true);how=0;
 if(!r.pos){r=layout(base,w,d,2);how=1}
 if(!r.pos){r=layout(free,w,d);how=2}
 if(!r.pos){toast((w*d<W*D?'Too small: ':'')+why(r).replace('No room for','no room for'));render();return}
 push();var moved=0;P.items.forEach(function(it){var q=r.pos[it.u];if(q&&(q.x!==it.x||q.y!==it.y||q.rot!==it.rot))moved++});
 P.room.w=w;P.room.d=d;apply(r);if(P.pw)P.pw.outlets.forEach(function(o){var fx=mapO?mapO.fx:function(v){return v*w/W},fy=mapO?mapO.fy:function(v){return v*d/D};if(o.s===0||o.s===2)o.a=Math.max(.5,Math.min(w-.5,h2(fx(o.a))));else if(o.s===1||o.s===3)o.a=Math.max(.5,Math.min(d-.5,h2(fy(o.a))));else{o.x=h2(fx(o.x));o.y=h2(fy(o.y))}});if(how===2)P.items.forEach(function(it){it.pin=false});lastFail=null;persist();render();
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
document.addEventListener('keydown',function(e){if(EX.on||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){var db=BLD?$('#w-dup')||$('#e-dup')||$('#d-dup'):$('#o-dup');if(db){e.preventDefault();db.click()}return}
 if(BLD&&(selW||selE!=null)&&(e.key==='Delete'||e.key==='Backspace')){var xb=$('#w-del')||$('#e-del');if(xb){e.preventDefault();xb.click();return}}
 if(sel&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();remove(sel)}if(BLD&&selR&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();var bd=$(selD!=null?'#d-del':'#rm-del');if(bd)bd.click();return}if(!sel&&selF&&fOnLv()&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();fDel(selF);return}if(!sel&&selZ&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();var zdl=document.getElementById('z-del');if(zdl)zdl.click()}if(!sel&&selO&&(e.key==='Delete'||e.key==='Backspace')){var oo=outBy(selO);if(oo&&oo.man){e.preventDefault();pkDel(selO)}}if(sel&&(e.key==='r'||e.key==='R'))rotate(sel,e.shiftKey?-1:1);if(e.key==='Escape'){sel=null;selO=null;selZ=null;selR=null;selD=null;render()}});

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
function buildPower(opt){opt=opt||{};var prev=P.pw,auto=opt.auto!=null?!!opt.auto:!!(prev&&prev.auto),out=[],circ=[],links={},sig={},nid=1,W=P.room.w,D=P.room.d;
 // outlets you placed stay where they are; everything plugs into them first
 var man=(prev&&prev.outlets||[]).filter(function(o){return o.man&&o.s!==-3}).map(function(o){var q=Object.assign({},o,pkBase(o.k),{sk:0,w:0});q.k=pkK(o.k);delete q.c;delete q.feed;delete q.ld;delete q.ldd;
  if(q.s>=0)q.a=Math.max(.5,Math.min((q.s%2===0?W:D)-.5,q.a));else{q.x=Math.max(.5,Math.min(W-.5,q.x));q.y=Math.max(.5,Math.min(D-.5,q.y))}return q});out=man.slice();
 var mk=function(sp,f){while(out.some(function(x){return x.id==='q'+nid}))nid++;var o=Object.assign({id:'q'+(nid++),s:sp.s},sp.s>=0?{a:sp.a}:{x:sp.x,y:sp.y},f);out.push(o);return o};
 var prevSpot=function(it,t){if(!prev||!prev.links)return null;var o=(prev.outlets||[]).filter(function(x){return x.id===prev.links[it.u]})[0];if(!o||o.man||opt.fresh||o.ty!==t)return null;var sp=o.s>=0?{s:o.s,a:o.a}:{s:-1,x:o.x,y:o.y};
  if(sp.s>=0&&(sp.a<.5||sp.a>(sp.s%2===0?W:D)-.5))return null;return rdist(opos(sp),ibox(it))<=REACH?sp:null};
 var L=P.items.map(function(it){return {it:it,sp:pspec(defOf(it))}}).filter(function(x){return x.sp});
 L.forEach(function(x){x.home=prevSpot(x.it,x.sp.t)||homeFor(x.it);x.k=perim(x.home)});L.sort(function(a,b){return a.k-b.k});
 var mlink=function(x){var ceil=isC(x.it),b=ibox(x.it),s=x.sp,best=null,bd=1e9;man.forEach(function(o){if(o.sk>=o.cap||!pfits(o,s,ceil)||o.ldd)return;if(s.ded&&!o.ded&&!o.any&&o.sk>0)return;if(!o.any&&!o.ded&&o.ty!=='hw'&&o.w+s.W>o.V*o.A*CAP80)return;var d=rdist(opos(o),b);if(d<=(o.reach||REACH)&&d<bd){bd=d;best=o}});
  if(!best)return;best.sk++;best.w+=s.W;if(s.ded&&!best.ded&&!best.any)best.ldd=1;if(best.any&&best.sk===1){best.V=s.V;best.A=s.A;best.ph=s.ph;best.ty=s.hw?'hw':s.t;best.ld=s.ded?1:0;if(ceil)best.feed=1}links[x.it.u]=best.id};
 L.filter(function(x){return x.sp.ded}).forEach(mlink);L.filter(function(x){return !x.sp.ded}).forEach(mlink);L=L.filter(function(x){return !links[x.it.u]});
 var CL=L.filter(function(x){return isC(x.it)});L=L.filter(function(x){return !isC(x.it)});if(!auto){L=[]}else if(opt.keep){var pa=function(x){var o=prev&&prev.links&&(prev.outlets||[]).filter(function(q){return q.id===prev.links[x.it.u]})[0];return !!(o&&!o.man)};L=L.filter(pa)}
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
 // ceiling objects: a wired feed at each fixture; big ones get their own circuit, the rest share 20A circuits
 var feeds=[];CL.forEach(function(x){var b=ibox(x.it),s=x.sp,o=mk({s:-3,x:h2(b.x+b.w/2),y:h2(b.y+b.d/2)},{ty:s.t,V:s.V,A:s.A,ph:s.ph,sk:1,w:s.W,feed:1});links[x.it.u]=o.id;
  if(s.ded)circ.push({id:0,ty:s.t,V:s.V,A:s.A,ph:s.ph,ded:1,feed:1,out:[o.id]});else feeds.push(o)});
 // light zones: wired by the electrician, split into 20A circuits at 80%
 ZN().forEach(function(z){var Lz=zLayout(z),pts=Lz.pts.filter(function(q){return !q.bl}),fw=(Lz.c.p&&Lz.c.p[1])||60;if(!pts.length)return;var per=Math.max(1,Math.floor(1920/fw)),gi=0;
  while(gi<pts.length){var grp=pts.slice(gi,gi+per),gw=grp.length*fw,o=mk({s:-3,x:h2(grp[0].x),y:h2(grp[0].y)},{ty:'120-20',V:120,A:20,ph:1,sk:grp.length,w:gw,zw:gw,feed:1,zone:z.id,zn:grp.length,zf:Lz.c.n,zfw:fw,zi:ZN().indexOf(z)+1});circ.push({id:0,ty:'120-20',V:120,A:20,ph:1,feed:1,zone:z.id,out:[o.id]});gi+=per}});
 // placed outlets get circuits too: big ones their own, the rest share like everything else
 var mshared=[];man.forEach(function(o){var dd=o.ded||o.ldd||o.ty==='hw'||(o.any&&o.ld);if(o.any&&!o.sk&&o.s===-3)o.feed=1;
  if(dd)circ.push({id:0,ty:o.ty,V:o.V,A:o.A,ph:o.ph,ded:1,feed:o.s===-3?1:0,out:[o.id]});else if(o.s===-3){o.feed=1;feeds.push(o)}else mshared.push(o)});
 group(mshared,false);
 var n0=circ.length;group(feeds,false);for(var ci=n0;ci<circ.length;ci++)circ[ci].feed=1;
 // (general-purpose wall outlets are no longer built: place your own from the Power panel)
 if(false){var gps=[];for(var s=0;s<4;s++){var Ln=s%2===0?W:D,n=Ln<6?0:Math.max(1,Math.round(Ln/12));
   for(var i=0;i<n;i++){var a=h2((i+.5)*Ln/n),q={s:s,a:a},pq=opos(q);if(out.some(function(o){var p=opos(o);return o.s===s&&!o.gp&&o.ty==='120-20'&&Math.hypot(p.x-pq.x,p.y-pq.y)<3}))continue;
    gps.push(mk(nudge(q,out,{x:pq.x-REACH,y:pq.y-REACH,w:2*REACH,d:2*REACH}),{ty:'120-20',V:120,A:20,ph:1,sk:0,w:0,gp:1}))}}group(gps,true)}
 circ.forEach(function(c){c.k=Math.min.apply(null,c.out.map(function(id){return perim(out.filter(function(o){return o.id===id})[0])}))});
 circ.sort(function(a,b){return a.k-b.k});circ.forEach(function(c,i){c.id=i+1;delete c.k;c.out.forEach(function(id){out.filter(function(o){return o.id===id})[0].c=c.id})});
 P.items.forEach(function(it){sig[it.u]=sigOf(it)});
 P.pw={outlets:out,circ:circ,links:links,sig:sig,show:prev?prev.show!==false:true,auto:auto,csig:ceilSig()}}
// ceiling power is automatic: rebuilt quietly whenever ceiling objects or light zones change
function ceilSig(){return JSON.stringify([P.items.filter(isC).map(function(it){return [it.u,it.r,it.x,it.y,it.rot]}),ZN(),P.room.h||10])}
function outBy(id){var a=P.pw?P.pw.outlets:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
function circBy(id){var a=P.pw?P.pw.circ:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
// is this object powered by what was built out?
function pstat(it){var sp=pspec(defOf(it));if(!sp)return null;if(isC(it))return {lv:'ok',auto:1};if(!P.pw)return null;var o=outBy(P.pw.links[it.u]);
 if(!o)return {lv:'red',why:(P.pw.auto?'Added after power was built out. ':'')+'Needs a '+tName(sp.t,sp)+'.'+(P.pw.auto?'':' Drag one from the Power panel, or build out power.')};
 if(o.man?!pfits(o,sp,isC(it)):o.ty!==sp.t)return {lv:'red',why:'Needs a '+tName(sp.t,sp)+'.'};
 var d=rdist(opos(o),ibox(it));if(d>(o.reach||REACH)+.01)return {lv:'red',o:o,why:'Moved out of reach of its outlet ('+fmt(d)+' ft away).'};
 if(sp.ph===3)return {lv:'amber',o:o,why:'Needs 3-phase power. If the building is single-phase, it needs a phase converter.'};
 return {lv:'ok',o:o}}
function pwLoad(o){var w=o.zw||0,names=o.zone?[o.zn+' × '+o.zf]:[];P.items.forEach(function(it){if(P.pw.links[it.u]===o.id){var c=defOf(it),s=pspec(c);if(s){w+=s.W;names.push(c.n)}}});return {w:w,names:names}}
function circLoad(c){var w=0;c.out.forEach(function(id){var o=outBy(id);if(o)w+=pwLoad(o).w});return w}
function pwChanges(){if(!P.pw)return 0;var n=0,used={};P.items.forEach(function(it){var s=pstat(it);if(s&&s.lv==='red')n++;if(P.pw.links[it.u])used[P.pw.links[it.u]]=1});
 P.pw.outlets.forEach(function(o){if(!o.gp&&!o.man&&!o.feed&&!used[o.id])n++});return n}
var HPS=[3,5,7.5,10,15,20,25,30,40,50,60,75,100,125,150];
function converter(){var hp=P.items.map(function(it){var s=pspec(defOf(it));return s&&s.ph===3?s.W/746:0}).filter(function(v){return v>0});if(!hp.length)return null;
 var big=Math.max.apply(null,hp),tot=hp.reduce(function(a,b){return a+b},0),need=Math.max(big*1.5,tot),size=HPS.filter(function(v){return v>=need})[0]||Math.ceil(need/25)*25;
 return {n:hp.length,hp:size,lo:Math.round((500+100*size)/100)*100,hi:Math.round((1000+200*size)/100)*100}}
// ceiling view: each ceiling object's reach (light pool, speaker coverage, fan sweep)
function drawReach(k){var g='<clipPath id="rclip"><rect x="0" y="0" width="'+P.room.w+'" height="'+P.room.d+'"/></clipPath><g clip-path="url(#rclip)"'+(VW.md==='p'?' opacity=".3"':'')+'>';P.items.forEach(function(it){var c=defOf(it);if(!c||!c.ceiling||!(c.reach>0))return;var b=ibox(it),cx=b.x+b.w/2,cy=b.y+b.d/2,H=P.room.h||10,r=Math.max(/Lighting/.test(c.c)?Math.min(c.reach,Math.max(2,H*.7)):c.reach,Math.max(b.w,b.d)/2),
  col=/Lighting/.test(c.c)?(c.c==='Lighting – Specialty'?['rgba(155,106,222,.12)','rgba(125,90,190,.45)']:['rgba(255,196,60,.16)','rgba(214,150,20,.5)']):c.c==='Sound'?['rgba(91,110,225,.08)','rgba(91,110,225,.45)']:['rgba(63,167,181,.08)','rgba(63,167,181,.5)'];
  g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col[0]+'" stroke="'+col[1]+'" stroke-width="'+(1.2*k)+'" stroke-dasharray="'+(5*k)+' '+(4*k)+'" pointer-events="none"/>'});return g+'</g>'}
var CEILP='M4 4h16M12 7v13M9 10l3-3 3 3M9 17l3 3 3-3';
function drawCeil(k){var g='';lowCeil().forEach(function(x){var b=ibox(x.it),cx=b.x+Math.max(b.w-Math.min(.45,b.w/3),b.w/2),cy=b.y+b.d-Math.min(.45,b.d/3),r=7*k;
 g+='<g pointer-events="none"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#d6453d" stroke="#fff" stroke-width="'+(1.5*k)+'"/><path d="'+CEILP+'" transform="translate('+(cx-4.8*k)+' '+(cy-4.8*k)+') scale('+(9.6*k/24)+')" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>'});return g}
var BOLT='M13 2 4 14h7l-1 8 9-12h-7z';
// before power is built out every powered object gets a grey bolt; after, only red (unpowered) or amber (needs attention)
function drawPlugs(k){var g='';
 P.items.forEach(function(it){if(isC(it)!==(cv()))return;var s=(P.pw||isC(it))?pstat(it):(pspec(defOf(it))?{lv:'need'}:null);if(!s||s.lv==='ok'||s.lv==='amber')return;var b=ibox(it),cx=b.x+Math.min(.45,b.w/3),cy=b.y+Math.min(.45,b.d/3),r=7*k;
  g+='<g pointer-events="none"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#d6453d" stroke="#fff" stroke-width="'+(1.5*k)+'"/><path d="'+BOLT+'" transform="translate('+(cx-4.8*k)+' '+(cy-4.8*k)+') scale('+(9.6*k/24)+')" fill="#fff"/></g>'});
 return g}
function drawPower(k){var grp=pwGroup();if(!P.pw||(VW.md!=='p'&&!grp))return '';var g='',W=P.room.w,D=P.room.d,big=scale()>=16,selIt=byU(sel),hiO={},lines='';
 if(grp){P.items.forEach(function(it){var oid=grp.items[it.u];if(!oid)return;var b=ibox(it),col=grp.out[oid],p=opos(outBy(oid)),pd=3*k;
   g+='<rect x="'+(b.x-pd)+'" y="'+(b.y-pd)+'" width="'+(b.w+2*pd)+'" height="'+(b.d+2*pd)+'" rx="'+(2*k)+'" fill="none" stroke="'+col+'" stroke-width="'+(2.2*k)+'" pointer-events="none"/>';
   lines+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+(b.x+b.w/2)+'" y2="'+(b.y+b.d/2)+'" stroke="#fff" stroke-width="'+(4*k)+'" stroke-linecap="round" pointer-events="none"/><line x1="'+p.x+'" y1="'+p.y+'" x2="'+(b.x+b.w/2)+'" y2="'+(b.y+b.d/2)+'" stroke="'+col+'" stroke-width="'+(2*k)+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'" stroke-linecap="round" pointer-events="none"/><circle cx="'+(b.x+b.w/2)+'" cy="'+(b.y+b.d/2)+'" r="'+(3*k)+'" fill="'+col+'" stroke="#fff" stroke-width="'+k+'" pointer-events="none"/>'})}
 if(selIt){var st=pstat(selIt);if(st&&st.o)hiO[st.o.id]=1}if(selO)hiO[selO]=1;if(odrag&&odrag.moved)hiO[odrag.id]=1;
 // lines from the selected outlet (or the selected object's outlet) to what it powers
 Object.keys(hiO).forEach(function(id){var o=outBy(id);if(!o)return;var p=opos(o);
  if(id===selO)g+='<circle cx="'+p.x+'" cy="'+p.y+'" r="'+(o.reach||REACH)+'" fill="rgba(47,125,225,.05)" stroke="#2f7de1" stroke-width="'+k+'" stroke-dasharray="'+(4*k)+' '+(4*k)+'" pointer-events="none"/>';
  var LK=odrag&&odrag.moved&&odrag.id===id&&odrag.links||P.pw.links;P.items.forEach(function(it){if(LK[it.u]!==id)return;if(drag&&drag.moved&&drag.u===it.u)return;var b=ibox(it);if(!inReach(o,b))return;lines+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+(b.x+b.w/2)+'" y2="'+(b.y+b.d/2)+'" stroke="#1d4f91" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>'})});
 g+=lines+'<defs><filter id="osh" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="'+(1.1*k)+'" stdDeviation="'+(1.4*k)+'" flood-color="#000" flood-opacity=".32"/></filter></defs>';
 P.pw.outlets.forEach(function(o){if(o.s===-3||cv())return;if(odrag&&odrag.id===o.id&&odrag.moved)hiO[o.id]=1;var inG=grp&&grp.out[o.id];if(grp&&!inG&&VW.md!=='p')return;var fIt=drag&&drag.moved?byU(drag.u):selIt,noFit=fIt&&VW.md==='p'&&pspec(defOf(fIt))&&!canPower(o,fIt);var p=opos(o),n=[[0,1],[-1,0],[0,-1],[1,0]][o.s]||[0,0],off=o.s>=0?-11*k:0,cx=p.x+n[0]*off,cy=p.y+n[1]*off,col=inG||tCol(o),r=6*k,on=!!hiO[o.id]||!!inG;
  g+='<g class="out" data-o="'+o.id+'" style="cursor:pointer'+(grp&&!inG?';opacity:.25':noFit?';opacity:.3;filter:grayscale(1)':'')+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+(14*k)+'" fill="transparent"/><g transform="translate('+cx+' '+cy+') scale(1.45) translate('+(-cx)+' '+(-cy)+')" filter="url(#osh)">';
  if(on)g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+3.5*k)+'" fill="none" stroke="#1d4f91" stroke-width="'+(2*k)+'"/>';
  if(o.man)g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+1.8*k)+'" fill="none" stroke="#2b2a27" stroke-width="'+(1.1*k)+'"/>'+(o.s===-2?'<path d="M'+cx+' '+(cy-r-1.8*k)+'v'+(-5*k)+'" stroke="#2b2a27" stroke-width="'+(1.2*k)+'"/>':'');
  if(o.ty==='hw')g+='<rect x="'+(cx-r)+'" y="'+(cy-r)+'" width="'+2*r+'" height="'+2*r+'" rx="'+(1.5*k)+'" fill="'+col+'" stroke="#fff" stroke-width="'+(1.3*k)+'"/><path d="'+BOLT+'" transform="translate('+(cx-4.5*k)+' '+(cy-4.5*k)+') scale('+(9*k/24)+')" fill="#fff"/>';
  else{g+=(o.s<0?'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'"':'<rect x="'+(cx-r)+'" y="'+(cy-r)+'" width="'+2*r+'" height="'+2*r+'" rx="'+(2.5*k)+'"')+' fill="'+(o.gp?'#fff':col)+'" stroke="'+(o.gp?col:'#fff')+'" stroke-width="'+(1.4*k)+'"/>';
   var dot=o.gp?col:'#fff';if(o.ty.slice(0,3)==='120'){g+='<rect x="'+(cx-2.6*k)+'" y="'+(cy-2.6*k)+'" width="'+(1.3*k)+'" height="'+(2.4*k)+'" fill="'+dot+'"/><rect x="'+(cx+1.3*k)+'" y="'+(cy-2.6*k)+'" width="'+(1.3*k)+'" height="'+(2.4*k)+'" fill="'+dot+'"/><circle cx="'+cx+'" cy="'+(cy+2*k)+'" r="'+(.9*k)+'" fill="'+dot+'"/>'}
   else if(o.ty.slice(0,2)==='3p'){[[-2.4,-1.6],[2.4,-1.6],[0,2.4]].forEach(function(d){g+='<circle cx="'+(cx+d[0]*k)+'" cy="'+(cy+d[1]*k)+'" r="'+(1.1*k)+'" fill="'+dot+'"/>'})}
   else g+='<rect x="'+(cx-3*k)+'" y="'+(cy-.8*k)+'" width="'+(6*k)+'" height="'+(1.6*k)+'" fill="'+dot+'"/>'}
  g+='</g>';r*=1.45;
  if(big||on){var m=[-n[0],-n[1]],lx=cx,ly=cy,anc=m[0]>0?'start':m[0]<0?'end':'middle';if(!m[0]&&!m[1]){ly=cy+r+11*k}else if(!m[0]){ly=m[1]>0?cy+r+11*k:cy-r-5*k}else{lx=cx+m[0]*(r+4*k);ly=cy+3.5*k}
   g+='<text x="'+lx+'" y="'+ly+'" text-anchor="'+anc+'" font-size="'+(9.5*k)+'" font-weight="600" fill="'+(o.gp?'#4a76b8':col)+'" stroke="#fff" stroke-width="'+(2.6*k)+'" paint-order="stroke" pointer-events="none">'+(o.gp?'':tShort(o.ty,o)+' ')+'C'+o.c+'</text>'}
  g+='</g>'});
 g+=drawPlugs(k);
 return g}
// an object's load as watts and amps; ≈ marks catalog estimates
function ldTxt(c){var sp=pspec(c);if(!sp)return '';var a=sp.W/((sp.ph===3?1.732:1)*sp.V);return (c.est?'≈ ':'')+Math.round(sp.W).toLocaleString()+' W · '+(a<10?fmt(a):Math.round(a))+' A'}
// what the plan shows: level g(round)/c(eiling), mode o(bjects)/p(ower)
var VW={lv:'g',md:'o'},ceilSeen=0;try{var vw0=JSON.parse(localStorage.getItem('sp-view')||'{}');if(vw0.lv==='c'||vw0.lv==='l')VW.lv=vw0.lv;if(vw0.md==='p')VW.md='p'}catch(_){}
function setView(k,v){if(VW[k]===v)return;if(k==='lv'){if(v==='l'){openCats['Lighting – General']=true}setTimeout(renderLib,0)}if(k==='md')setTimeout(renderLib,0);VW[k]=v;try{localStorage.setItem('sp-view',JSON.stringify(VW))}catch(_){}if(VW.md!=='p'||k==='lv'){selO=null;if(VW.md!=='p')pwOpenK=null}sel=k==='lv'?null:sel;if(k==='lv'&&typeof selZ!=='undefined')selZ=null;render()}
function vbar(){var el=$('#vbar');if(!el)return;var I={g:'<path d="M3 17l9 4 9-4M3 12l9 4 9-4M12 3l9 4-9 4-9-4z"/>',c:'<path d="M3 4h18M8 4v4M16 4v4"/><circle cx="8" cy="11" r="3"/><circle cx="16" cy="11" r="3"/>',o:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',p:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',l:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'},
  b=function(k,v,t){return '<button class="vb'+(VW[k]===v?' on':'')+'" data-k="'+k+'" data-v="'+v+'" aria-pressed="'+(VW[k]===v)+'" title="'+t+'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+I[v]+'</svg><span class="lbl">'+t+'</span></button>'};
 el.innerHTML='<div class="vseg" role="group" aria-label="Level">'+b('lv','g','Ground')+b('lv','c','Ceiling')+b('lv','l','Lights')+'</div><i class="vsep"></i><div class="vseg" role="group" aria-label="Show">'+b('md','o','Objects')+b('md','p','Power')+'</div>';
 el.querySelectorAll('.vb').forEach(function(x){x.onclick=function(){setView(x.dataset.k,x.dataset.v)}})}
var pwOpenK=null,CCOL=['#185FA5','#0F6E56','#993C1D','#534AB7','#993556','#854F0B','#3B6D11','#A32D2D'];
function gkey(c){var o=outBy(c.out[0]);return c.zone?'zone':c.feed?'feed|'+c.ty+(c.ded?'|own':''):c.gp?'gp':c.ty==='hw'?'hw|'+(o.ph===3?'3-phase':o.V+'V')+' '+o.A+'A':c.ty+'|'+(c.ded?'own':'shared')}
// the opened group: its circuits (each with a colour), their outlets and the objects on them
function pwGroup(){if(!P.pw||!pwOpenK)return null;var g={col:{},out:{},items:{}},i=0;P.pw.circ.forEach(function(c){if(gkey(c)!==pwOpenK)return;var col=CCOL[i++%CCOL.length];g.col[c.id]=col;c.out.forEach(function(id){g.out[id]=col})});
 if(!i)return null;P.items.forEach(function(it){var oid=P.pw.links[it.u];if(oid&&g.out[oid])g.items[it.u]=oid});return g}
// circuits grouped by type; each group opens to show its circuits and what's plugged into them
function pwSummary(){var by={},order=[],grp=pwGroup();P.pw.circ.forEach(function(c){var o=outBy(c.out[0]),key=gkey(c);
  if(!by[key]){by[key]={t:c.ty,o:o,ded:c.ded,gp:c.gp,list:[],n:0};order.push(key)}by[key].list.push(c);by[key].n+=c.out.length});
 order.sort(function(a,b){return (a==='gp')-(b==='gp')||(a<b?-1:1)});
 return order.map(function(k){var g=by[k],nc=g.list.length,nm=g.list[0].zone?'Lighting · light zones':g.list[0].feed?'Ceiling · '+tName(g.t,g.o).replace(' outlet','').replace(' wired connection','')+(g.ded?' · own circuit':''):g.gp?'General-purpose 120V 20A':g.t==='hw'?'Wired in · '+tName('hw',g.o).replace(' wired connection',''):tName(g.t,g.o).replace(' outlet','')+(g.ded?' · own circuit':' · shared');
  var h='<details class="pg" data-k="'+esc(k)+'"'+(pwOpenK===k?' open':'')+'><summary><span>'+esc(nm)+'</span><b>'+nc+' circuit'+(nc>1?'s':'')+(g.n>nc&&!g.list[0].feed?' · '+g.n+' outlets':'')+'</b></summary><div class="pgl">';
  g.list.forEach(function(c){var o0=outBy(c.out[0]),cap=(o0.ph===3?1.732:1)*o0.V*o0.A*CAP80,w=circLoad(c),its=[];
   P.items.forEach(function(it){var oid=P.pw.links[it.u];if(oid&&c.out.indexOf(oid)>=0)its.push(it)});
   var cc=grp&&grp.col[c.id];h+='<div class="pc"'+(cc?' style="border-left-color:'+cc+'"':'')+'><button class="pch" data-o="'+c.out[0]+'"><span>'+(cc?'<i class="sw2" style="background:'+cc+'"></i>':'')+'C'+c.id+(c.out.length>1?' · '+c.out.length+' outlets':'')+'</span>'+(w?'<small class="'+(w>cap?'bad':'')+'">'+Math.round(w).toLocaleString()+' / '+Math.round(cap).toLocaleString()+' W · '+fmt(w/((o0.ph===3?1.732:1)*o0.V))+' / '+fmt(o0.A*CAP80)+' A</small>':'')+'</button>';
   h+=its.length?its.map(function(it){var st=pstat(it);return '<button class="pci'+(sel===it.u?' on':'')+'" data-u="'+it.u+'">'+(st&&st.lv!=='ok'?'<i class="'+st.lv+'"></i>':'')+'<span class="pcn">'+esc(defOf(it).n)+'</span><small>'+ldTxt(defOf(it))+'</small></button>'}).join(''):c.zone?(function(){var zo=outBy(c.out[0]);return '<div class="pci zli"><span class="pcn">'+zo.zn+' × '+esc(zo.zf)+'</span><small>Light zone '+zo.zi+' · '+fmtW(zo.zfw)+' each</small></div>'})():'<div class="pce">'+(c.gp?'For chargers, hand tools and vacuums':'Nothing plugged in any more')+'</div>';
   h+='</div>'});
  return h+'</div></details>'}).join('')}
function powerCard(){var pw=power(P.items),h='<div class="card"><span class="lab">Power</span>',gpOn=!P.pwo||P.pwo.gp!==false;
 if(!P.pw){if(!pw.items&&!P.items.length)return h+'<p class="muted">Add objects, then build out power to see the outlets and circuits they need.</p></div>';
  h+='<div><b>'+(pw.items?(pw.est?'≈ ':'')+fmtW(pw.w)+'</b> connected · ≈ '+fmtW(pw.peak)+' peak':'No powered objects yet</b>')+'</div>'+(pw.circ.length?'<p class="muted">Roughly '+esc(pw.circ.join(' · '))+'</p>':'');
  h+='<p class="muted">Build out power on the left, or drag outlets onto the plan.</p></div>';return h}
 var ch=pwChanges(),cv=converter(),red=P.items.filter(function(it){var s=pstat(it);return s&&s.lv==='red'}).length;
 
 h+='<div><b>'+P.pw.circ.length+' circuit'+(P.pw.circ.length===1?'':'s')+'</b> · '+P.pw.outlets.length+' outlet'+(P.pw.outlets.length===1?'':'s')+' and connections · '+(pw.est?'≈ ':'')+fmtW(pw.w)+' connected</div>';
 h+='<div>'+pwSummary()+'</div>';
 if(cv)h+='<div class="warn"><b>3-phase:</b> '+cv.n+' machine'+(cv.n>1?'s need':' needs')+' 3-phase power. If the building only has single-phase, plan on a rotary phase converter of about '+cv.hp+' HP (roughly '+money(cv.lo)+'–'+money(cv.hi)+').</div>';
 if(ch)h+='<div class="warn">'+(red?red+' object'+(red>1?'s aren\'t':' isn\'t')+' powered yet. ':'')+(P.pw.auto?'Rebuild to update the outlets.':'Place outlets for them, or build out power.')+'</div>';
 h+='<p class="muted">Click an outlet to see its circuit. A plan for the electrician to price, not a wiring design.</p></div>';return h}
function outletCard(){var o=outBy(selO);if(!o)return '';var c=circBy(o.c),l=pwLoad(o),cw=c?circLoad(c):l.w,cap=(o.ph===3?1.732:1)*o.V*o.A*CAP80,pct=Math.min(100,cw/cap*100),many=c&&c.out.length>1;
 var h='<div class="card"><span class="lab">Selected</span><b style="font-size:15px">'+(o.man?esc(PK[pkK(o.k)].n):o.gp?'General-purpose 120V 20A outlet':esc(tName(o.ty,o)))+'</b>'+'<p class="muted" style="margin:0">'+(o.man?'Placed by you. Drag it on the plan to move it.':'Placed by build out. Drag it on the plan to move it, and it stays where you put it.')+'</p>';
 h+='<div class="irow"><span>Circuit</span><b>C'+o.c+(o.ty==='hw'||!many?' · own circuit':' · '+c.out.length+' outlets')+'</b></div>';
 h+='<div class="irow"><span>Where</span><b>'+(o.man?pkWhere(o):o.s===-3?'Wired at the fixture (ceiling)':o.s<0?'Floor box or ceiling drop':'On the wall')+'</b></div>';
 if(!o.gp||cw){h+='<div><div class="irow" style="border:0;padding-bottom:2px"><span>Circuit load</span><b>'+Math.round(cw).toLocaleString()+' / '+Math.round(cap).toLocaleString()+' W</b></div><div class="bar"><i style="width:'+pct+'%;background:'+(cw>cap?'#d6453d':cw>cap*.9?'#e0a21f':'#3ba776')+'"></i></div><p class="muted" style="margin-top:4px">80% of '+o.A+'A, the limit for loads that run for hours.</p></div>'}
 h+=l.names.length?'<div class="irow"><span>Powers</span><b>'+esc(l.names.join(', '))+'</b></div>':o.gp?'<p class="muted">For chargers, hand tools, vacuums and lamps.</p>':o.man?'<p class="muted">Nothing in reach needs it yet'+(o.reach?' (its cord reaches '+o.reach+' ft)':'')+'.</p>':'<div class="warn">Nothing uses this any more. Rebuild power to remove it.</div>';
 if(o.man)h+='<div class="sbtns"><button class="sb red" id="o-odel">Delete outlet</button></div>';
 return h+'</div>'}

/* ---------------- power: outlets you place yourself ----------------
   Drag an outlet from the Power panel onto the plan (or tap it to put it by the next thing that needs it).
   Wall outlets snap to the nearest wall; floor boxes sit on the floor; drops and reels hang from the ceiling
   and power floor objects; ceiling boxes feed lights, fans and heaters. Objects plug into the nearest outlet
   that fits. Placed outlets stay put when power is rebuilt; build-out only fills in what's still missing. */
var PK={
 o15:{n:'120V 15A outlet',g:'120V',ty:'120-15',cap:2,at:'wall'},
 o20:{n:'120V 20A outlet',g:'120V',ty:'120-20',cap:2,at:'wall'},
 d20:{n:'120V 20A dedicated',g:'120V',ty:'120-20',cap:1,ded:1,at:'wall'},
 v20:{n:'240V 20A outlet',g:'240V',ty:'240-20',cap:1,ded:1,at:'wall'},
 v30:{n:'240V 30A outlet',g:'240V',ty:'240-30',cap:1,ded:1,at:'wall'},
 v50:{n:'240V 50A outlet',g:'240V',ty:'240-50',cap:1,ded:1,at:'wall'},
 p30:{n:'3-phase 30A outlet',g:'3-phase',ty:'3p30',cap:1,ded:1,at:'wall'},
 p60:{n:'3-phase 60A outlet',g:'3-phase',ty:'3p60',cap:1,ded:1,at:'wall'},
 drop:{n:'Ceiling drop 120V 20A',g:'Drops to the floor',ty:'120-20',cap:2,at:'drop'},
 reel:{n:'Cord reel 120V 20A',g:'Drops to the floor',ty:'120-20',cap:2,at:'drop',reach:15},
 hw:{n:'Hardwired, any voltage',g:'Hardwired',ty:'any',cap:1,ded:1,at:'wallfloor'},
 chw:{n:'Hardwired fixture, any voltage',g:'Ceiling fixtures',ty:'any',cap:1,at:'ceil'},
 c20:{n:'Ceiling 120V 20A outlet',g:'Ceiling fixtures',ty:'120-20',cap:2,at:'ceil'},
 c30:{n:'Ceiling 240V 30A outlet',g:'Ceiling fixtures',ty:'240-30',cap:1,ded:1,at:'ceil'}};
// earlier outlet types, folded into the generic ones
var PKA={floor:'o20',duplex:'o15',usb:'o15',gfci:'o20',quad:'o20',ded:'d20',r30:'v30',r50:'v50',p3:'p60',jbox:'hw',disc:'hw',cjb:'chw',cdisc:'chw',crec:'c20',c240:'c30'};
function pkK(k){return PK[k]?k:PKA[k]||'o20'}
var PKG={g:[['120V','#2f7de1'],['240V','#e0701f'],['3-phase','#b42336'],['Hardwired','#6b7380'],['Drops to the floor','#b8862e']],c:[]};
var PKO={};
function pkBase(k){k=pkK(k);var K=PK[k],t=K.ty,o={k:k,cap:K.cap,ded:K.ded?1:0,any:t==='any'?1:0,reach:K.reach||0};
 if(t==='any')return Object.assign(o,{ty:'hw',V:240,A:60,ph:1});if(t.slice(0,2)==='3p')return Object.assign(o,{ty:t,V:240,A:+t.slice(2),ph:3});var s=t.split('-');return Object.assign(o,{ty:t,V:+s[0],A:+s[1],ph:1})}
function pkBadge(k){var K=PK[pkK(k)];return K.ty==='any'?'Matches what it powers':K.reach?K.reach+' ft cord':K.ded?'Own circuit':'Shared circuit'}
// can this outlet power this load at all (not counting how full it already is)?
function pfits(o,sp,ceil){var lv=o.s===-3?'c':'g';if(ceil!==(lv==='c'))return false;
 if(o.any)return ceil||sp.hw;if(sp.hw)return o.ty==='hw'&&(o.A>=sp.A||!!o.any);if(o.ty==='hw')return false;
 return (o.ph===3)===(sp.ph===3)&&o.V===sp.V&&(o.V===120&&!sp.ded||o.A>=sp.A)}
function pkSpot(k,p){var K=PK[pkK(k)],W=P.room.w,D=P.room.d,cl=function(v,L){return Math.max(.5,Math.min(L-.5,h2(v)))},dist=[p.y,W-p.x,D-p.y,p.x],s=dist.indexOf(Math.min.apply(null,dist)),inside=p.x>0&&p.x<W&&p.y>0&&p.y<D;
 if((K.at==='wall'||K.at==='wallfloor')&&(!inside||dist[s]<2.5))return {s:s,a:s%2===0?cl(p.x,W):cl(p.y,D)};
 if(K.at==='wall'||K.at==='wallfloor')return {s:-1,x:cl(p.x,W),y:cl(p.y,D)};
 return {s:K.at==='ceil'?-3:K.at==='drop'?-2:-1,x:cl(p.x,W),y:cl(p.y,D)}}
function pkWhere(o){return o.s===-3?'On the ceiling':o.s===-2?'Hangs from the ceiling':o.s===-1?'On the floor':'On the wall'}
function pwEnsure(){if(!P.pw)P.pw={outlets:[],circ:[],links:{},sig:{},show:true,auto:false};return P.pw}
// put an outlet down; anything stacked on the same spot slides along a little
function pkPlace(k,sp){var o=Object.assign({id:'m'+Date.now().toString(36)+Math.floor(Math.random()*1e3),man:1,s:sp.s},sp.s>=0?{a:sp.a}:{x:sp.x,y:sp.y},pkBase(k),{sk:0,w:0});
 o=Object.assign(o,nudge(sp,pwEnsure().outlets,{x:-1e3,y:-1e3,w:3e3,d:3e3}));pwEnsure().outlets.push(o);return o}
function pkAfter(o,before,pick){buildPower({keep:1});hist.push(before);if(hist.length>60)hist.shift();fut=[];if(pick){sel=null;selO=o.id}persist();render();
 var n=pwLoad(outBy(o.id)).names;toast(n.length?'Plugged in: '+n.join(', '):'Nothing in reach needs this outlet yet')}
// tap a card: put it by the next thing that needs one, or mid-wall
function pkTap(k){var K=PK[k],ceil=K.at==='ceil',probe=Object.assign({s:ceil?-3:0,man:1},pkBase(k)),hit=null;
 P.items.forEach(function(it){if(hit||isC(it)!==ceil)return;var sp=pspec(defOf(it));if(!sp||!pfits(probe,sp,ceil))return;var st=P.pw?pstat(it):{lv:'red'};if(st&&st.lv==='red')hit=it});
 var W=P.room.w,D=P.room.d,spot;
 if(hit){var b=ibox(hit),c={x:b.x+b.w/2,y:b.y+b.d/2};if(K.at==='wall'||K.at==='wallfloor'){var h=homeFor(hit);spot=h.s>=0?h:pkSpot(k,K.at==='wall'?c:{x:c.x,y:b.y-.5})}else spot=pkSpot(k,K.at==='floor'?{x:b.x+b.w/2,y:b.y-.6}:c)}
 else spot=pkSpot(k,K.at==='wall'||K.at==='wallfloor'?{x:W/2,y:-1}:{x:W/2,y:D/2});
 var before=snapP(),o=pkPlace(k,spot);pkAfter(o,before,1);if(!pwLoad(outBy(o.id)).names.length)toast('Placed. Nothing nearby needs it yet, so drag it where you want it.')}
function pkDel(id){var o=outBy(id);if(!o||!o.man)return;push();P.pw.outlets=P.pw.outlets.filter(function(x){return x.id!==id});selO=null;if(!P.pw.auto&&!P.pw.outlets.length)P.pw=null;else buildPower({keep:1});persist();render()}
// drawn icons for the Power catalog
var PICON=(function(){var S=function(i){return '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="#3a3936" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+i+'</svg>'},PL='<rect x="9" y="3" width="22" height="34" rx="3" fill="#f6f4ee"/>',F=function(y){return '<rect x="13" y="'+y+'" width="14" height="12" rx="5" fill="#fff"/><path d="M17.5 '+(y+3)+' v4 M22.5 '+(y+3)+' v4" stroke-width="1.8"/><circle cx="20" cy="'+(y+9.2)+'" r="1.2" fill="#3a3936" stroke="none"/>'},
  R='<rect x="4" y="4" width="32" height="32" rx="4" fill="#f6f4ee"/>',q='';for(var x=6;x<=22;x+=16)for(var y=8;y<=22;y+=14)q+='<rect x="'+x+'" y="'+y+'" width="12" height="10" rx="4" fill="#fff"/><path d="M'+(x+3.5)+' '+(y+3)+'v3 M'+(x+8.5)+' '+(y+3)+'v3" stroke-width="1.6"/>';
 var JB='<rect x="6" y="6" width="28" height="28" rx="3" fill="#b8bcc0"/><circle cx="12" cy="12" r="1.4" fill="#3a3936" stroke="none"/><circle cx="28" cy="12" r="1.4" fill="#3a3936" stroke="none"/><circle cx="12" cy="28" r="1.4" fill="#3a3936" stroke="none"/><circle cx="28" cy="28" r="1.4" fill="#3a3936" stroke="none"/><path d="M15 20h10 M20 15v10" stroke="#d92b2b"/>',
  DS='<rect x="8" y="3" width="24" height="34" rx="3" fill="#8d939a"/><rect x="24" y="12" width="4" height="12" rx="1" fill="#d92b2b" stroke="none"/><rect x="12" y="8" width="9" height="5" rx="1" fill="#f6f4ee"/>';
 var I0={duplex:S(PL+F(6)+F(22)),usb:S(PL+F(5)+'<rect x="14" y="21" width="5" height="2.6" rx=".6" fill="#3a3936" stroke="none"/><rect x="21" y="21" width="5" height="2.6" rx=".6" fill="#3a3936" stroke="none"/>'+F(25)),
  gfci:S(PL+'<rect x="13" y="5" width="14" height="10" rx="4" fill="#fff"/><path d="M17.5 8v3.5M22.5 8v3.5" stroke-width="1.8"/><rect x="15" y="17.5" width="4.5" height="4" rx="1" fill="#d92b2b" stroke="none"/><rect x="20.5" y="17.5" width="4.5" height="4" rx="1" fill="#2b2b2b" stroke="none"/><rect x="13" y="24" width="14" height="10" rx="4" fill="#fff"/><path d="M17.5 27v3.5M22.5 27v3.5" stroke-width="1.8"/>'),
  quad:S('<rect x="3" y="5" width="34" height="30" rx="3" fill="#f6f4ee"/>'+q),
  ded:S(PL+'<rect x="13" y="6" width="14" height="12" rx="5" fill="#fff"/><path d="M17.5 9v4 M22.5 9v4 M22.5 11h2" stroke-width="1.8"/><circle cx="20" cy="15.2" r="1.2" fill="#3a3936" stroke="none"/><rect x="11.5" y="24" width="17" height="8" rx="2" fill="#e0701f" stroke="none"/><text x="20" y="30.3" font-size="6.2" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle" stroke="none">20A</text>'),
  r30:S(R+'<circle cx="20" cy="20" r="12" fill="#fff"/><path d="M14 16v6 M26 16v6 M18 26h4 M20 12.5v3" stroke-width="2.2"/>'),
  r50:S(R+'<circle cx="20" cy="20" r="12.5" fill="#fff"/><path d="M14 15v8 M26 15v8 M20 25v4 M18 12.5h4" stroke-width="2.6"/>'),
  p3:S(R+'<circle cx="20" cy="20" r="12.5" fill="#fff"/><path d="M15 13.5a8 8 0 0 1 4-1.5 M27 16a8 8 0 0 1 1 4 M25 27a8 8 0 0 1-4 1 M13 24a8 8 0 0 1-1-4" stroke-width="2.4"/><circle cx="20" cy="20" r="1.3" fill="#3a3936" stroke="none"/>'),
  floor:S('<rect x="5" y="5" width="30" height="30" rx="3" fill="#d9b56a" stroke="#8a6a2a"/><rect x="10" y="10" width="20" height="20" rx="2" fill="#e8cc8a" stroke="#8a6a2a"/><path d="M15 15v4 M25 15v4 M15 23v3 M25 23v3" stroke="#6a5020" stroke-width="1.8"/>'),
  reel:S('<circle cx="20" cy="14" r="10" fill="#e0b31b"/><circle cx="20" cy="14" r="4" fill="#fff"/><path d="M20 24c0 4 3 5 3 9"/><rect x="18" y="32" width="10" height="5" rx="1.5" fill="#f6f4ee"/>'),
  drop:S('<path d="M20 3v14"/><rect x="11" y="17" width="18" height="18" rx="3" fill="#f6f4ee"/><rect x="14" y="20" width="12" height="5" rx="2" fill="#fff"/><rect x="14" y="27" width="12" height="5" rx="2" fill="#fff"/>'),
  jbox:S(JB),disc:S(DS),cdisc:S(DS),
  cjb:S('<circle cx="20" cy="20" r="15" fill="#b8bcc0"/><circle cx="20" cy="20" r="6" fill="#fff6d0"/><path d="M20 5v4M20 31v4M5 20h4M31 20h4"/>'),
  crec:S('<circle cx="20" cy="20" r="15" fill="#f6f4ee"/><rect x="13" y="14" width="14" height="12" rx="5" fill="#fff"/><path d="M17.5 17v4 M22.5 17v4" stroke-width="1.8"/>'),
  c240:S('<circle cx="20" cy="20" r="15" fill="#f6f4ee"/><circle cx="20" cy="20" r="9" fill="#fff"/><path d="M15 17v5 M25 17v5 M18 25h4" stroke-width="2.2"/>')};
 return {o15:I0.duplex,o20:I0.duplex,d20:I0.ded,v20:I0.r30,v30:I0.r30,v50:I0.r50,p30:I0.p3,p60:I0.p3,floor:I0.floor,drop:I0.drop,reel:I0.reel,hw:I0.jbox,chw:I0.cjb,c20:I0.crec,c30:I0.c240}})();
// could this outlet power this object (right voltage/phase/amps, a free plug, spare capacity), wherever it is?
function canPower(o,it,sp){sp=sp||pspec(defOf(it));if(!sp||!pfits(o,sp,isC(it)))return false;if(P.pw.links[it.u]===o.id)return true;var c=circBy(o.c),ownC=o.man?!!o.ded||o.ty==='hw':!!(c&&c.ded);var on=P.items.filter(function(x){return x!==it&&P.pw.links[x.u]===o.id}),cap=o.cap||(ownC?1:2);if(on.length>=cap)return false;
 if(on.some(function(x){var q=pspec(defOf(x));return q&&q.ded}))return false;
 if(sp.ded&&!ownC&&!o.any){if(on.length)return false;var cur0=outBy(P.pw.links[it.u]),selfW=cur0&&cur0.c===o.c?sp.W:0;if(c&&circLoad(c)-selfW>0)return false;return true}
 if(!ownC&&!o.any){var w=on.reduce(function(a,x){var q=pspec(defOf(x));return a+(q?q.W:0)},0);if(w+sp.W>o.V*o.A*CAP80)return false;var cur=outBy(P.pw.links[it.u]),self=cur&&cur.c===o.c?sp.W:0;if(c&&circLoad(c)-self+sp.W>(o.ph===3?1.732:1)*o.V*o.A*CAP80)return false}
 return true}
// after an object is moved or dropped: plug it into the nearest outlet in reach that fits and whose circuit can take it,
// even if that means leaving the outlet it was on
function inReach(o,b){return rdist(opos(o),b)<=(o.reach||REACH)}
function plugFor(it,sp,b){var best=null,bd=1e9;P.pw.outlets.forEach(function(o){if(!canPower(o,it,sp))return;var d=rdist(opos(o),b);if(d<=(o.reach||REACH)&&d<bd){bd=d;best=o}});return best}
function dragTether(d,it){var t=G.teth;if(!t)return;if(!d||VW.md!=='p'||!P.pw||isC(it)){t.innerHTML='';return}var sp=pspec(defOf(it));if(!sp){t.innerHTML='';return}
 var m=dims(it,d.rot),b={x:d.x,y:d.y,w:m.w,d:m.d},o=plugFor(it,sp,b);if(!o){t.innerHTML='';return}var k=1/scale(),p=opos(o),cx=b.x+b.w/2,cy=b.y+b.d/2;
 t.innerHTML='<g pointer-events="none"><line x1="'+p.x+'" y1="'+p.y+'" x2="'+cx+'" y2="'+cy+'" stroke="#fff" stroke-width="'+(3.6*k)+'" stroke-linecap="round"/><line x1="'+p.x+'" y1="'+p.y+'" x2="'+cx+'" y2="'+cy+'" stroke="#1d4f91" stroke-width="'+(1.8*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(3*k)+'" fill="#1d4f91" stroke="#fff" stroke-width="'+k+'"/></g>'}
function autoPlug(u){if(!P.pw)return null;var it=byU(u);if(!it||isC(it))return null;var sp=pspec(defOf(it));if(!sp)return null;var old=outBy(P.pw.links[u]);
 var best=plugFor(it,sp,ibox(it));
 if(!best||best===old)return null;P.pw.links[u]=best.id;P.pw.sig[u]=sigOf(it);if(old){old.sk=P.items.filter(function(x){return P.pw.links[x.u]===old.id}).length;old.w=pwLoad(old).w;if(!old.sk)delete old.ldd}
 if(best.any&&!P.items.some(function(x){return x!==it&&P.pw.links[x.u]===best.id})){best.V=sp.V;best.A=sp.A;best.ph=sp.ph;best.ty=sp.hw?'hw':sp.t}
 if(sp.ded&&!best.ded&&!best.any){best.ldd=1;var bc=circBy(best.c);if(bc&&bc.out.length>1){bc.out=bc.out.filter(function(id){return id!==best.id});var nid=Math.max.apply(null,P.pw.circ.map(function(c){return c.id}))+1;P.pw.circ.push({id:nid,ty:best.ty,V:best.V,A:best.A,ph:best.ph,ded:1,out:[best.id]});best.c=nid}else if(bc)bc.ded=1}
 best.sk=P.items.filter(function(x){return P.pw.links[x.u]===best.id}).length;best.w=pwLoad(best).w;return best}
function plugToast(o){if(o)toast('Plugged into '+(o.man?PK[pkK(o.k)].n:tName(o.ty,o))+' on C'+o.c)}
function pkCard(k,col){return '<div class="lcard pk" data-pk="'+k+'" style="--c:'+col+'" title="'+esc(PK[k].n)+'" role="button" tabindex="0"><div class="lart pw">'+PICON[k]+'</div><div class="lnm">'+esc(PK[k].n)+'</div><div class="lbdg"><span>'+pkBadge(k)+'</span></div></div>'}
function pwTip(){var ceil=cv();return ceil?'Drag a box onto a light, fan or heater to power it. Drops and reels hang down to power things on the floor.':'Drag an outlet near a wall to put it on the wall, or anywhere else to put it in the floor. Objects plug into the nearest one that fits. Ceiling drops and reels are in Ceiling view.'}
function renderPwLib(){pwHead();renderPwCat()}
// ceiling and Lights levels: nothing to place; the app wires lights, fans and heaters and reports the circuits
function ceilRows(){var rows=[];ZN().forEach(function(z,i){var L=zLayout(z),fw=(L.c.p&&L.c.p[1])||60;if(!L.n)return;var per=Math.max(1,Math.floor(1920/fw));rows.push({n:'Light zone '+(i+1)+' · '+L.n+' × '+L.c.n,w:L.W,c:Math.ceil(L.n/per),t:'120V 20A'})});
 var sh=0,shn=[];P.items.forEach(function(it){var c=defOf(it),sp=pspec(c);if(!sp||!isC(it))return;if(sp.ded)rows.push({n:c.n,w:sp.W,c:1,t:(sp.V===240?'240V ':'120V ')+sp.A+'A · own circuit'});else{sh+=sp.W;shn.push(c.n)}});
 if(sh)rows.push({n:shn.length+' other ceiling object'+(shn.length>1?'s':'')+' ('+shn.slice(0,3).join(', ')+(shn.length>3?'…':'')+')',w:sh,c:Math.ceil(sh/1920),t:'120V 20A shared'});return rows}
function ceilPwPanel(){var rows=ceilRows(),tw=rows.reduce(function(a,r){return a+r.w},0),tc=rows.reduce(function(a,r){return a+r.c},0);
 return '<div class="cpw"><b>Ceiling power is automatic</b><p class="muted">Lights, fans and heaters are wired in by the electrician, so there\'s nothing to place here. The app works out the circuits they need and keeps them up to date.</p>'+
  (rows.length?'<div class="cpt"><span>'+tc+' circuit'+(tc===1?'':'s')+'</span><b>'+fmtW(tw)+'</b></div>'+rows.map(function(r){return '<div class="cpr"><span>'+esc(r.n)+'<em>'+r.t+(r.c>1?' · '+r.c+' circuits':'')+'</em></span><b>'+fmtW(r.w)+'</b></div>'}).join(''):'<p class="muted">Nothing on the ceiling needs power yet.</p>')+'<p class="muted" style="margin-top:10px">Outlets and drops for things on the floor are placed in Ground view.</p></div>'}
function pwHead(){var hd=$('#pwhd');if(!hd||VW.md!=='p')return;if(cv()){hd.innerHTML='<div class="row" style="align-items:center;justify-content:space-between"><span class="lab">Power</span><span class="muted" style="margin:0;font-size:12px">'+(VW.lv==='l'?'Lights':'Ceiling')+'</span></div>';return}var ch=pwChanges(),has=!!P.pw,gpOn=!P.pwo||P.pwo.gp!==false,I=function(p){return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'};
 hd.innerHTML='<div class="row" style="align-items:center;justify-content:space-between"><span class="lab">Power</span><span class="muted" style="margin:0;font-size:12px">'+(cv()?'Ceiling':'Outlets &amp; circuits')+'</span></div>'+
  '<div class="pwa"><button id="pa-build" class="'+(has&&P.pw.auto?'':'pri')+'">'+I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>')+'Build out</button>'+
  '<button id="pa-re" class="'+(ch?'pri':'')+'"'+(has?'':' disabled')+'>'+I('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>')+'Rebuild'+(ch?'<i class="pab">'+ch+'</i>':'')+'</button>'+
  '<button id="pa-clear" class="del"'+(has?'':' disabled')+'>'+I('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>')+'Clear</button></div>'+
  '<p class="muted">'+pwTip()+'</p>';
 $('#pa-build').onclick=function(){push();buildPower({auto:true,fresh:true});selO=null;persist();render();toast('Power built out: '+P.pw.circ.length+' circuits')};
 $('#pa-re').onclick=function(){if(!P.pw)return;push();buildPower();selO=null;persist();render();toast('Power rebuilt'+(P.pw.outlets.some(function(o){return o.man})?'. Your placed outlets stayed put.':''))};
 $('#pa-clear').onclick=function(){if(!P.pw)return;push();P.pw=null;selO=null;persist();render();toast('Power cleared. Undo brings it back.')};
 var gp=$('#pa-gp');if(gp)gp.onchange=function(){push();P.pwo=Object.assign({},P.pwo,{gp:this.checked});if(P.pw&&P.pw.auto)buildPower();persist();render()}}
function renderPwCat(){if(cv()){$('#lib').innerHTML=ceilPwPanel();return}var h='';PKG.g.forEach(function(gg){var name=gg[0],ks=Object.keys(PK).filter(function(k){return PK[k].g===name}),open=PKO[name]!==false;
  h+='<div class="lsec'+(open?' open':'')+'"><button class="lsh" data-pc="'+esc(name)+'"><i style="background:'+gg[1]+'"></i><span class="lsn">'+esc(name)+'</span><span class="lct">'+ks.length+'</span><svg class="lchev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>';
  if(open)h+='<div class="lgrid">'+ks.map(function(k){return pkCard(k,gg[1])}).join('')+'</div>';h+='</div>'});
 $('#lib').innerHTML=h;
 $('#lib').querySelectorAll('.lsh').forEach(function(b){b.onclick=function(){PKO[b.dataset.pc]=PKO[b.dataset.pc]===false;renderLib()}});
 $('#lib').querySelectorAll('.lcard.pk').forEach(function(b){b.onclick=function(){if(ldCard===b&&Date.now()-ldClick<400)return;viewLib({pk:b.dataset.pk})};b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();viewLib({pk:b.dataset.pk})}}});
}
// dragging from the Power panel
function pkGhost(k,sp){var kk=1/scale(),o=Object.assign({s:sp.s},sp.s>=0?{a:sp.a}:{x:sp.x,y:sp.y}),p=opos(o),n=[[0,1],[-1,0],[0,-1],[1,0]][o.s]||[0,0],off=o.s>=0?-8.5*kk:0,cx=p.x+n[0]*off,cy=p.y+n[1]*off,col=tCol(Object.assign({gp:0},pkBase(k))),r=7*kk;
 G.ghost.innerHTML='<g pointer-events="none"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+(PK[pkK(k)].reach||REACH)+'" fill="rgba(47,125,225,.06)" stroke="#2f7de1" stroke-width="'+kk+'" stroke-dasharray="'+(4*kk)+' '+(4*kk)+'"/>'+
  (o.s<0?'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'"':'<rect x="'+(cx-r)+'" y="'+(cy-r)+'" width="'+2*r+'" height="'+2*r+'" rx="'+(2.5*kk)+'"')+' fill="'+col+'" stroke="#fff" stroke-width="'+(1.5*kk)+'"/>'+
  '<rect x="'+(cx-r-4*kk)+'" y="'+(cy-r-4*kk)+'" width="'+(2*r+8*kk)+'" height="'+(2*r+8*kk)+'" rx="'+(4*kk)+'" fill="none" stroke="#2f7de1" stroke-width="'+(1.6*kk)+'" stroke-dasharray="'+(4*kk)+' '+(3*kk)+'"/></g>'}
function pkMove(e){var d=ldrag;d.chip.style.transform='translate('+(e.clientX+14)+'px,'+(e.clientY+14)+'px)';if(!ldOver(e)){d.spot=null;d.chip.classList.remove('over');ghost(null);return}d.chip.classList.add('over');
 d.spot=pkSpot(d.pk,toFt(e));pkGhost(d.pk,d.spot);var w=d.spot.s>=0?'Snaps to wall':d.spot.s===-3?'Ceiling':d.spot.s===-2?'Hangs from ceiling':'Floor';d.chip.querySelector('span').textContent=w+' · '+PK[d.pk].n}
function pkDrop(e){var d=ldrag;ldCancel();ldClick=Date.now();ldCard=d.card;if(!ldOver(e)||!d.spot)return;var before=snapP(),o=pkPlace(d.pk,d.spot);pkAfter(o,before)}
// moving a placed outlet on the plan
var odrag=null;
function pkOf(o){if(o.k)return pkK(o.k);if(o.s===-3)return o.ty==='120-20'&&!o.ded?'c20':o.ty==='240-30'?'c30':'chw';if(o.ty==='hw')return 'hw';var c=circBy(o.c),m={'120-15':'o15','120-20':c&&c.ded?'d20':'o20','240-20':'v20','240-30':'v30','240-50':'v50','3p30':'p30','3p60':'p60'};return m[o.ty]||'o20'}
function odMove(e){var d=odrag;if(!d.moved&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<4)return;var o=outBy(d.id);if(!o)return;if(!d.moved){d.before=snapP();d.moved=true;if(!o.man){var kk=pkOf(o);o.man=1;o.k=kk;Object.assign(o,pkBase(kk))}}
 var sp=pkSpot(o.k,toFt(e));delete o.a;delete o.x;delete o.y;Object.assign(o,sp);var keep=P.pw;try{buildPower({keep:1});d.links=P.pw.links}catch(_){d.links=null}P.pw=keep;render()}
function odUp(){var d=odrag;odrag=null;if(!d.moved){selO=d.id;sel=null;render();return}var o=outBy(d.id);if(!o)return;Object.assign(o,nudge(Object.assign({s:o.s},o.s>=0?{a:o.a}:{x:o.x,y:o.y}),P.pw.outlets.filter(function(x){return x!==o}),{x:-1e3,y:-1e3,w:3e3,d:3e3}));pkAfter(o,d.before)}

/* ---------------- drawing ---------------- */
var sv=$('#sv'),NS='http://www.w3.org/2000/svg',G={},popU=null,drag=null;
// view: z = zoom (1 = whole room fits), cx/cy = centre in feet (null = room centre)
var V={z:1,cx:null,cy:null};
function dimOff(){var o={t:0,l:0};if(!P.pw||VW.md!=='p')return o;var big=scale()>=16;P.pw.outlets.forEach(function(q){if(q.s===0)o.t=Math.max(o.t,big?30:16);if(q.s===3)o.l=Math.max(o.l,big?14+((q.gp?0:tShort(q.ty,q).length+1)+String(q.c).length+1)*5.8:16)});return o}
function fitVb(){var M=Math.max(2,Math.max(P.room.w,P.room.d)*.12)+Math.max(3.5,Math.max(P.room.w,P.room.d)*.08);return {x:-M,y:-M,w:P.room.w+2*M,h:P.room.d+2*M}}
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
var libV=null;
function render(){if(sel||selO){libV=null;selZ=null;selF=null}if(selF&&!fBy(selF))selF=null;if(selZ&&!zBy(selZ))selZ=null;if(selR&&!rBy(selR)){selR=null;selD=null}trimRooms();trimZones();trimFloors();trimEdoors();trimWins();if(P.pw&&P.pw.csig!==ceilSig())buildPower({keep:1});if(P.pw&&P.pw.outlets.some(function(o){return o.gp}))buildPower();var k=1/scale();if(!G.room){sv.innerHTML='<g id="g-room"></g><g id="g-floor"></g><g id="g-reach"></g><g id="g-rooms"></g><g id="g-ext"></g><g id="g-zone"></g><g id="g-obj"></g><g id="g-floorh"></g><g id="g-zoneh"></g><g id="g-pw"></g><g id="g-teth"></g><g id="g-ghost"></g>';G.rooms=sv.querySelector('#g-rooms');G.rooms.addEventListener('pointerdown',rDown);G.ext=sv.querySelector('#g-ext');G.ext.addEventListener('pointerdown',eDown);G.ext.addEventListener('pointerdown',wDown);G.floor=sv.querySelector('#g-floor');G.floorh=sv.querySelector('#g-floorh');G.floor.addEventListener('pointerdown',fDown);G.floorh.addEventListener('pointerdown',fDown);G.zone=sv.querySelector('#g-zone');G.zoneh=sv.querySelector('#g-zoneh');G.zone.addEventListener('pointerdown',zDown);G.zoneh.addEventListener('pointerdown',zDown);G.room=sv.querySelector('#g-room');G.obj=sv.querySelector('#g-obj');G.reach=sv.querySelector('#g-reach');G.pw=sv.querySelector('#g-pw');G.ghost=sv.querySelector('#g-ghost');G.teth=sv.querySelector('#g-teth')}if(!(drag&&drag.moved))G.teth.innerHTML='';
 G.room.innerHTML=drawRoom();var seen={};
 P.items.forEach(function(it){var el=G.obj.querySelector('[data-u="'+it.u+'"]');if(!el){el=document.createElementNS(NS,'g');el.setAttribute('class','obj'+(isC(it)?' ceil':'')+(isLt(defOf(it))?' lt':''));el.dataset.u=it.u;el.style.cursor='grab';el.style.transform='translate('+it.x+'px,'+it.y+'px)';G.obj.appendChild(el)}
  var key=[it.r,it.rot,sel===it.u,!!it.pin,k.toFixed(4)].join('|');if(el.dataset.k!==key){el.dataset.k=key;el.innerHTML=objInner(it,k)}
  if(!(drag&&drag.u===it.u&&drag.moved)){var turned=el.dataset.rot!=null&&el.dataset.rot!==String(it.rot);el.dataset.rot=it.rot;if(turned){el.style.transition='none';el.style.transform='translate('+it.x+'px,'+it.y+'px)';el.getBoundingClientRect();el.style.transition='';pop(it.u)}else el.style.transform='translate('+it.x+'px,'+it.y+'px)'}seen[it.u]=1;el.classList.toggle('pop',popU===it.u)});
 Array.prototype.slice.call(G.obj.children).forEach(function(el){if(!seen[el.dataset.u])el.remove()});var lowF=[];P.items.forEach(function(it){if(!isFan(defOf(it)))return;var el=G.obj.querySelector('[data-u="'+it.u+'"]'),dd=fanDrop(it),lo=dd>(defOf(it).drop||0)+.01;if(el){G.obj.appendChild(el);el.classList.toggle('flow',lo)}if(lo)lowF.push([it,dd])});var grp0=pwGroup();Array.prototype.forEach.call(G.obj.children,function(el){el.classList.toggle('dim',!!grp0&&!grp0.items[el.dataset.u])});if(selO&&!outBy(selO))selO=null;G.reach.innerHTML=cv()?drawReach(k):'';G.ext.innerHTML=drawExt(k)+drawWins(k);var fdr=drawFloors(k);G.floor.innerHTML=fdr.lo;G.floorh.innerHTML=fdr.hi;var zdr=drawZones(k);G.zone.innerHTML=zdr.lo;G.zoneh.innerHTML=zdr.hi;G.rooms.innerHTML=drawRooms(k);G.pw.innerHTML=(VW.md==='p'&&P.pw?drawPower(k):drawPlugs(k))+(VW.lv==='g'?drawCeil(k):'')+(cv()&&VW.md!=='p'?lowF.map(function(q){var b=ibox(q[0]);return '<g pointer-events="none"><rect x="'+(b.x+b.w/2-30*k)+'" y="'+(b.y+b.d+4*k)+'" width="'+(60*k)+'" height="'+(16*k)+'" rx="'+(8*k)+'" fill="#1d4f91" opacity=".9"/><text x="'+(b.x+b.w/2)+'" y="'+(b.y+b.d+15.5*k)+'" text-anchor="middle" font-size="'+(10.5*k)+'" font-weight="700" fill="#fff">hangs '+fmt(q[1]+(defOf(q[0]).th||1))+' ft</text></g>'}).join(''):'');G.obj.setAttribute('class',(cv()?'v-ceil ':'')+(VW.lv==='l'?'v-lt ':'')+(VW.md==='p'?'v-pow':''));var cn=$('#cnote');if(cn)cn.hidden=!cv();var stg=document.querySelector('.stage');if(stg)stg.classList.toggle('ceil',cv());vbar();if(EX.on&&EX.r){EX.S=exBuild();if(exHit(EX.pos.x,EX.pos.z)){var sp2=exSpawn();EX.pos={x:sp2.x,z:sp2.y}}}
 $('#rname').value=P.name;side();markLib();$('#b-undo').disabled=!hist.length;$('#b-redo').disabled=!fut.length}
var howOpen=false;try{howOpen=localStorage.getItem('sp-howto')==='1'}catch(_){}
// touch screens get touch words; switches if someone picks up a mouse (or a pen/finger) mid-session
var TOUCH=false;try{TOUCH=matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&!matchMedia('(pointer: fine)').matches)}catch(_){}
document.body.classList.toggle('touch',TOUCH);document.addEventListener('pointerdown',function(e){var t=e.pointerType!=='mouse';if(t===TOUCH)return;TOUCH=t;document.body.classList.toggle('touch',TOUCH);var k=document.querySelector('#howto .hkeys');if(k)k.innerHTML=howRows();libTip()},true);
function libTip(){var l=document.getElementById('libtip');if(l)l.textContent=TOUCH?'Tap an object to see its details. Drag it onto the plan to place it.':'Click an object to see its details. Drag it onto the plan to place it.'}
function howRows(){var kb=function(t){return '<span class="kb">'+t+'</span>'},row=function(k,t){return '<span class="hk">'+k+'</span><span>'+t+'</span>'},pw=!!P.pw;
 if(TOUCH)return row(kb('Tap'),'See an object\'s details')+row(kb('Hold')+kb('Drag'),'Place it on the plan')+row(kb('✎'),'Edit an object\'s details')+row(kb('Drag'),'Move an object on the plan')+row(kb('Push into wall'),'Turn it to face the room')+row(kb('↺')+kb('↻'),'Turn the selected one')+row(kb('Remove'),'Remove the selected one')+row(kb('Pinch'),'Zoom')+row(kb('Drag floor'),'Move around when zoomed in')+row(kb('Double-tap floor'),'See the whole room again')+(pw?row(kb('Tap outlet'),'See its circuit and what it powers'):'')+row(kb('Tap floor'),'Deselect');
 return row(kb('Click'),'See an object\'s details')+row(kb('Drag'),'Place it on the plan')+row(kb('Right-click')+kb('✎'),'Edit an object\'s details')+row(kb('Drag'),'Move an object on the plan')+row(kb('Push into wall'),'Turn it to face the room')+row(kb('R')+kb('Shift R'),'Turn right / left')+row(kb('Del'),'Remove the selected one')+row(kb('Scroll'),'Zoom (pinch on a trackpad)')+row(kb('Drag floor'),'Move around when zoomed in')+row(kb('Double-click'),'Fit the whole room')+(pw?row(kb('Click outlet'),'See its circuit and what it powers'):'')+row(kb('Esc'),'Deselect')}
// "How to use the plan": one line, opens to the controls
function howTo(){return '<details class="howto" id="howto"'+(howOpen?' open':'')+'><summary><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5f5b52" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/></svg><span>How to Use</span><svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a867c" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="hkeys">'+howRows()+'</div></details>'}
function hintTxt(){return P.items.length?'Drag to move · push into a wall to turn it · R / Shift+R turn · scroll or pinch to zoom'+(P.pw&&VW.md==='p'?' · click an outlet to see its circuit':''):'Click an object on the left to add it'}
function pop(u){popU=u;setTimeout(function(){popU=null},400)}
window.addEventListener('resize',function(){G.obj&&Array.prototype.forEach.call(G.obj.children,function(e){e.dataset.k=''});render()});

/* ---------------- dragging an object pins it ---------------- */
function toFt(e){var p=sv.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(sv.getScreenCTM().inverse())}
// zoom: mouse wheel / trackpad pinch, two-finger pinch on touch; drag empty floor to pan
sv.addEventListener('wheel',function(e){e.preventDefault();var dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?400:1);zoomAt(e.clientX,e.clientY,Math.exp(-dy*(e.ctrlKey?0.01:0.0018)))},{passive:false});
var touches={},pinch=null,pan=null;
function tpts(){return Object.keys(touches).map(function(k){return touches[k]})}
sv.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'){touches[e.pointerId]={x:e.clientX,y:e.clientY};var t=tpts();if(t.length===2){if(drag){drag.el.classList.remove('drag');drag.el.style.opacity='';drag.el.dataset.k='';ghost(null);drag=null;render()}pan=null;pinch={d:Math.hypot(t[0].x-t[1].x,t[0].y-t[1].y),mx:(t[0].x+t[1].x)/2,my:(t[0].y+t[1].y)/2};return}}
 if(pinch)return;var go=e.target.closest('g.out');if(go){var oo=outBy(go.dataset.o);if(oo&&VW.md==='p'){odrag={id:oo.id,sx:e.clientX,sy:e.clientY,moved:false};try{sv.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault();return}selO=go.dataset.o;sel=null;render();e.preventDefault();return}var g=e.target.closest('g.obj');if(!g){pan={sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};try{sv.setPointerCapture(e.pointerId)}catch(_){}return}var it=byU(g.dataset.u),p=toFt(e);drag={u:it.u,el:g,dx:p.x-it.x,dy:p.y-it.y,sx:e.clientX,sy:e.clientY,moved:false};try{sv.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
// the free spot closest to where it was dropped: nothing else has to move, nobody's clearance is blocked
// Fans may hang below other ceiling things: the downrod (centre) needs open ceiling, the blades drop under the rest
function isFan(c){return !!c&&/^cc-(fan|hvls)$/.test(c.r)}
function cBot(c){return (c.drop||0)+(c.th||1)}
function rodBox(b){return {x:b.x+b.w/2-.5,y:b.y+b.d/2-.5,w:1,d:1}}
function fanMin(c){return c.r==='cc-hvls'?10:7}
function stackOK(c1,b1,c2,b2){var f1=isFan(c1);if(f1===isFan(c2))return false;var fc=f1?c1:c2,fb=f1?b1:b2,oc=f1?c2:c1,ob=f1?b2:b1;
 if(hit(rodBox(fb),ob))return false;return hAt(fb.x+fb.w/2,fb.y+fb.d/2)-(cBot(oc)+1)-(fc.th||1)>=fanMin(fc)-1e-6}
function fanDrop(it){var c=defOf(it),d=c&&c.drop||0;if(!isFan(c))return d;var b=ibox(it);if(P.zones&&P.zones.length)zFixAll().forEach(function(f){if(hit(b,{x:f.x-f.w/2,y:f.y-f.d/2,w:f.w,d:f.d}))d=Math.max(d,cBot(f.c)+1)});P.items.forEach(function(o){if(o===it||!isC(o)||isFan(defOf(o)))return;if(hit(b,ibox(o)))d=Math.max(d,cBot(defOf(o))+1)});return d}
function okC(c,b,obs,W,D){if(!inside(b,W,D))return false;if((P.rooms&&P.rooms.length||PREF)&&!wallOK(b,null,true))return false;for(var i=0;i<obs.length;i++){var p=obs[i];if(hit(b,p.b)&&!stackOK(c,b,p.d,p.b))return false}return true}
function others(it){var lv=isC(it);return P.items.filter(function(o){return o!==it&&isC(o)===lv}).map(function(o){var mo=dims(o,o.rot),bo={x:o.x,y:o.y,w:mo.w,d:mo.d};return {b:bo,c:clr(defOf(o),bo,o.rot),d:defOf(o)}})}
function nearestFree(it,x,y,obs,rot){var c=defOf(it),m=dims(it,rot),W=P.room.w,D=P.room.d,best=null,bd=1e9;
 var gx=[],gy=[];for(var g0=0;g0+m.w<=W+1e-6;g0+=.5)gx.push(g0);for(var g1=0;g1+m.d<=D+1e-6;g1+=.5)gy.push(g1);
 if(!c.ceiling&&RM().length){gx=gx.concat(faceStops(m.w,0).filter(function(v){return v>=-1e-6&&v+m.w<=W+1e-6}));gy=gy.concat(faceStops(m.d,1).filter(function(v){return v>=-1e-6&&v+m.d<=D+1e-6}))}
 for(var iy=0;iy<gy.length;iy++)for(var ix=0;ix<gx.length;ix++){var xx=gx[ix],yy=gy[iy],dd=Math.hypot(xx-x,yy-y);if(dd>=bd)continue;var b={x:xx,y:yy,w:m.w,d:m.d};if(c.ceiling?okC(c,b,obs,W,D):ok(b,clr(c,b,rot),obs,W,D)){bd=dd;best={x:xx,y:yy}}}
 return best}
function ghost(sp,it,rot){var g=G.ghost;if(!sp){g.innerHTML='';return}var m=dims(it,rot),k=1/scale();g.innerHTML='<rect x="'+sp.x+'" y="'+sp.y+'" width="'+m.w+'" height="'+m.d+'" fill="rgba(47,125,225,.10)" stroke="#2f7de1" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>'}
// pushing past a wall turns the object to sit against that wall: front-facing pieces face into the room, others run their long side along it
function wallTurn(it,s){var c=defOf(it);if(kind(c)==='wall')return s;var m=dims(it,0);return m.w>=m.d?s:(s+1)%4}
function drawAs(d,it,rot){if(d.shown===rot)return;d.shown=rot;var t=Object.assign({},it,{rot:rot});d.el.dataset.k='';d.el.innerHTML=objInner(t,1/scale())}
sv.addEventListener('pointermove',function(e){if(touches[e.pointerId]){touches[e.pointerId]={x:e.clientX,y:e.clientY}}
 if(pinch){var t=tpts();if(t.length<2)return;var d=Math.hypot(t[0].x-t[1].x,t[0].y-t[1].y),mx=(t[0].x+t[1].x)/2,my=(t[0].y+t[1].y)/2;if(pinch.d>0)zoomAt(mx,my,d/pinch.d);panBy(mx-pinch.mx,my-pinch.my);pinch.d=d;pinch.mx=mx;pinch.my=my;return}
 if(pan){if(!pan.moved&&Math.hypot(e.clientX-pan.sx,e.clientY-pan.sy)<4)return;pan.moved=true;sv.style.cursor='grabbing';panBy(e.clientX-pan.lx,e.clientY-pan.ly);pan.lx=e.clientX;pan.ly=e.clientY;return}
 if(odrag){odMove(e);return}
 if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<4)return;var it=byU(drag.u);if(!drag.moved){drag.obs=others(it);drag.rot=drag.shown=it.rot;if(VW.md==='p'&&P.pw){drag.moved=true;var kk=1/scale();G.pw.innerHTML=drawPower(kk)+(VW.lv==='g'?drawCeil(kk):'')}}drag.moved=true;
 var p=toFt(e),W=P.room.w,D=P.room.d,thr=Math.max(.75,18/scale()),over=[-p.y,p.x-W,p.y-D,-p.x],side=-1,bo=thr;
 for(var q=0;q<4;q++)if(over[q]>bo){bo=over[q];side=q}
 var x,y,rot,m;
 if(side>=0){rot=wallTurn(it,side);m=dims(it,rot);x=side===3?0:side===1?W-m.w:Math.round((p.x-m.w/2)*2)/2;y=side===0?0:side===2?D-m.d:Math.round((p.y-m.d/2)*2)/2}
 else{rot=it.rot;m=dims(it,rot);if(drag.rot!==it.rot){var m0=dims(it,drag.rot);drag.dx=m.w/2;drag.dy=m.d/2}x=Math.round((p.x-drag.dx)*2)/2;y=Math.round((p.y-drag.dy)*2)/2}
 x=Math.max(0,Math.min(W-m.w,x));y=Math.max(0,Math.min(D-m.d,y));drag.x=x;drag.y=y;drag.rot=rot;drawAs(drag,it,rot);dragTether(drag,it);
 drag.el.classList.add('drag');drag.el.style.transform='translate('+x+'px,'+y+'px)';
 drag.spot=nearestFree(it,x,y,drag.obs,rot);var exact=drag.spot&&Math.abs(drag.spot.x-x)<=WH+1e-6&&Math.abs(drag.spot.y-y)<=WH+1e-6;if(exact&&(drag.spot.x!==x||drag.spot.y!==y)){x=drag.x=drag.spot.x;y=drag.y=drag.spot.y;drag.el.style.transform='translate('+x+'px,'+y+'px)'}drag.el.style.opacity=exact?1:.6;ghost(exact?null:drag.spot,it,rot)});
function tEnd(e){delete touches[e.pointerId];if(tpts().length<2)pinch=null}
sv.addEventListener('pointercancel',function(e){tEnd(e);pan=null;sv.style.cursor='';if(odrag){var d=odrag;odrag=null;if(d.moved){P=JSON.parse(d.before);render()}}});
sv.addEventListener('dblclick',function(e){if(!e.target.closest('g.obj')&&zoomed())fitView()});
sv.addEventListener('pointerup',function(e){var wasPinch=!!pinch||(e.pointerType==='touch'&&tpts().length>1);tEnd(e);if(wasPinch)return;
 if(pan){var pp=pan;pan=null;sv.style.cursor='';if(!pp.moved){var now=Date.now();if(now-(window.__lastTap||0)<320){window.__lastTap=0;fitView();return}window.__lastTap=now;sel=null;selO=null;selZ=null;selR=null;selD=null;selE=null;selW=null;var tf=fOnLv()?fAt(toFt(e)):null;selF=tf?tf.id:null;if(tf)libV=null;render()}return}
 if(odrag){odUp();return}
 if(!drag)return;var d=drag;drag=null;if(G.teth)G.teth.innerHTML='';d.el.classList.remove('drag');d.el.style.opacity='';ghost(null);var it=byU(d.u);
 if(!d.moved){sel=it.u;selO=null;render();return}
 var before=snapP();it.rot=d.rot;d.el.dataset.rot=it.rot;
 if(d.spot){it.x=d.spot.x;it.y=d.spot.y}else{it.x=d.x;it.y=d.y}
 if(!relayout({nogrow:true})){P=JSON.parse(before);lastFail=null;toast('No free spot for it, so it went back');d.el.dataset.k='';render();return}var po=autoPlug(it.u);hist.push(before);fut=[];persist();render();plugToast(po)});

/* ---------------- left: library ---------------- */
var openCats={},q='';if(VW.lv==='l'){openCats['Lighting – General']=true}
function libArt(i,col){var W=i.w,D=i.d,m=Math.max(W,D)*1.22,g=ICONS[i.r]?ICONS[i.r](W,D):'<rect x="'+(-W/2)+'" y="'+(-D/2)+'" width="'+W+'" height="'+D+'" rx="'+(Math.min(W,D)*0.08)+'" fill="'+col+'2e" stroke="'+col+'" stroke-width="'+(m*0.02)+'"/>';return '<svg viewBox="'+(-m/2)+' '+(-m/2)+' '+m+' '+m+'" preserveAspectRatio="xMidYMid meet" pointer-events="none">'+g+'</svg>'}
function card(i,col){var n=needs(i);return '<div class="lcard'+(MINE[i.r]?' mine':'')+(EDITED[i.r]?' edited':'')+'" data-r="'+esc(i.r)+'" style="--c:'+col+'" title="'+esc(i.n)+'" role="button" tabindex="0">'+(EDITED[i.r]?'<span class="led" title="Edited: your version of this object" aria-label="Edited"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>Edited</span>':'')+'<div class="lart">'+libArt(i,col)+'</div><div class="lnm">'+esc(i.n)+'</div><div class="lft"><div class="lbdg"><span class="lmeta">'+fmt(i.w)+'×'+fmt(i.d)+(i.p?'<i>⚡'+(pspec(i).ph===3?'3φ':i.p[0]+'<b>V</b>')+'</i>':'')+'</span></div><button class="ledit" aria-label="Edit '+esc(i.n)+'" title="Edit"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/></svg></button></div></div>'}
function cats(){var by={},order=[],up=cv(),lt=VW.lv==='l',inLv=function(cat,i){if(HIDECATS.indexOf(cat)>=0)return false;if(!up)return true;return lt?cat==='Lighting – General'||(i&&isLt(i)):cat!=='Lighting – General'&&!(i&&isLt(i))};CATS.forEach(function(c){if(c[0]!=='Rooms & Zones'&&(CEILCATS.indexOf(c[0])>=0)===up&&inLv(c[0])){order.push(c[0]);by[c[0]]={col:c[1],list:[]}}});by['My objects']={col:'#2f7de1',list:[]};order.unshift('My objects');
 Object.keys(LIB).forEach(function(r){var i=LIB[r];if(!!i.ceiling!==up||!inLv(i.c,i))return;var cat=MINE[r]?'My objects':i.c;if(!by[cat]){by[cat]={col:'#888',list:[]};order.push(cat)}by[cat].list.push(i)});return {by:by,order:order}}
function renderLib(){if(BLD){$('#libhd').hidden=true;$('#pwhd').hidden=true;$('#lib').innerHTML=buildLib();buildLibWire();return}var pm=VW.md==='p';$('#libhd').hidden=pm;$('#pwhd').hidden=!pm;if(pm)return renderPwLib();var c=cats(),s=q.toLowerCase().trim(),h='';
 var lastGrp='';c.order.forEach(function(name){var g=c.by[name],list=g.list.filter(function(i){return !s||i.n.toLowerCase().indexOf(s)>=0});if(!list.length)return;if(VW.lv==='c'){var grp=/^Lighting/.test(name)?'Lighting':name==='My objects'?'':'Sound & comfort';if(grp&&grp!==lastGrp){h+='<div class="lgrp'+(grp==='Lighting'?' hot':'')+'">'+grp+'</div>';lastGrp=grp}}var open=s?true:!!openCats[name];
  h+='<div class="lsec'+(open?' open':'')+'"><button class="lsh" data-c="'+esc(name)+'"><i style="background:'+g.col+'"></i><span class="lsn">'+esc(name)+'</span><span class="lct">'+list.length+'</span><svg class="lchev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>';
  if(open)h+='<div class="lgrid">'+list.map(function(i){return card(i,g.col)}).join('')+'</div>';h+='</div>'});
 $('#lib').innerHTML=(VW.lv==='l'&&!s?zoneLibCard():'')+(VW.lv==='g'&&!s?floorLibCard():'')+(h||'<p class="muted">No objects match.</p>');if(VW.lv==='l')zoneLibWire();if(VW.lv==='g')floorLibWire();
 $('#lib').querySelectorAll('.lsh').forEach(function(b){b.onclick=function(){openCats[b.dataset.c]=!openCats[b.dataset.c];renderLib()}});
 $('#lib').querySelectorAll('.ledit').forEach(function(e){e.onpointerdown=function(ev){ev.stopPropagation()};e.onclick=function(ev){ev.stopPropagation();editObj(e.closest('.lcard').dataset.r)}});$('#lib').querySelectorAll('.lcard').forEach(function(b){b.onclick=function(){if(ldCard===b&&Date.now()-ldClick<400)return;viewLib({r:b.dataset.r})};b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();viewLib({r:b.dataset.r})}};b.oncontextmenu=function(e){e.preventDefault();if(ldrag||Date.now()-ldClick<800||e.pointerType==='touch'||(e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents))return;editObj(b.dataset.r)}});markLib();fitMeta()}
function fitMeta(){document.querySelectorAll('#lib .lmeta').forEach(function(m){var b=m.parentNode,av=function(){return b.clientWidth-(parseFloat(getComputedStyle(b).paddingLeft)||0)-5};b.classList.remove('t1','t2','t3');['t1','t2','t3'].some(function(k){if(m.scrollWidth<=av())return true;b.classList.add(k)})})}
if(window.ResizeObserver){var fmT=0;new ResizeObserver(function(){cancelAnimationFrame(fmT);fmT=requestAnimationFrame(fitMeta)}).observe($('#lib'))}
function markLib(){if(VW.md==='p')return;var cnt={};P.items.forEach(function(i){cnt[i.r]=(cnt[i.r]||0)+1});document.querySelectorAll('#lib .lcard').forEach(function(b){b.classList.toggle('sel',!!cnt[b.dataset.r])})}
$('#q').oninput=function(){q=this.value;renderLib()};libTip();
// open a dialog without popping the on-screen keyboard: on touch screens nothing is focused until a field is tapped
function modal(d){d.showModal();if(TOUCH){var a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))a.blur()}}
/* ---------------- no page zoom: pinch/zoom only works on the plan itself (which handles it), not the rest of the page ---------------- */
['gesturestart','gesturechange','gestureend'].forEach(function(t){document.addEventListener(t,function(e){e.preventDefault()},{passive:false})});
document.addEventListener('touchmove',function(e){if(e.touches&&e.touches.length>1&&!(e.target.closest&&e.target.closest('#sv')))e.preventDefault()},{passive:false});
// iPad Safari can still double-tap-zoom on plain text; swallow a quick second tap there (buttons, fields and the plan are left alone)
var lastTE=0;document.addEventListener('touchend',function(e){var n=Date.now(),t=e.target;if(n-lastTE<350&&e.changedTouches&&e.changedTouches.length===1&&t.closest&&!t.closest('#sv,button,input,select,textarea,label,a,summary,[role=button],.lcard'))e.preventDefault();lastTE=n},{passive:false});
window.addEventListener('wheel',function(e){if(e.ctrlKey&&!(e.target.closest&&e.target.closest('#sv')))e.preventDefault()},{passive:false});
/* ---------------- drag from the library: hold and drag a card onto the plan to place it by hand ----------------
   Mouse: press and drag. Touch: drag sideways toward the plan, or hold briefly then drag; an up/down swipe still scrolls the list.
   It lands where it's dropped (or the nearest free spot), skipping auto-placement. Push past a wall to turn it. */
var ldrag=null,ldClick=0,ldCard=null;
function ldCancel(){if(!ldrag)return;clearTimeout(ldrag.timer);if(ldrag.chip)ldrag.chip.remove();if(ldrag.card)ldrag.card.classList.remove('lifting');ghost(null);document.body.classList.remove('ldragging');ldrag=null}
function ldStart(){var d=ldrag;d.started=true;d.timer=null;if(d.pk){d.card.classList.add('lifting');document.body.classList.add('ldragging');try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}var c0=document.createElement('div');c0.className='ldchip';c0.innerHTML='<div class="lart">'+PICON[pkK(d.pk)]+'</div><span>'+esc(PK[d.pk].n)+'</span>';document.body.appendChild(c0);d.chip=c0;return}var c=LIB[d.r];d.it={u:'__new',r:d.r,x:0,y:0,rot:0};d.obs=others(d.it);
 d.card.classList.add('lifting');document.body.classList.add('ldragging');try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
 var ch=document.createElement('div');ch.className='ldchip';ch.innerHTML='<div class="lart">'+libArt(c,getComputedStyle(d.card).getPropertyValue('--c')||'#888')+'</div><span>'+esc(c.n)+'</span>';document.body.appendChild(ch);d.chip=ch}
function ldOver(e){var r=sv.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom}
function ldMove(e){var d=ldrag;if(d.pk)return pkMove(e);d.chip.style.transform='translate('+(e.clientX+14)+'px,'+(e.clientY+14)+'px)';
 if(!ldOver(e)){d.spot=null;d.chip.classList.remove('over');ghost(null);return}d.chip.classList.add('over');
 var p=toFt(e),W=P.room.w,D=P.room.d,it=d.it,thr=Math.max(.75,18/scale()),over=[-p.y,p.x-W,p.y-D,-p.x],side=-1,bo=thr,rot=0,m,x,y;
 for(var q=0;q<4;q++)if(over[q]>bo){bo=over[q];side=q}
 if(side>=0){rot=wallTurn(it,side);m=dims(it,rot);x=side===3?0:side===1?W-m.w:Math.round((p.x-m.w/2)*2)/2;y=side===0?0:side===2?D-m.d:Math.round((p.y-m.d/2)*2)/2}
 else{m=dims(it,0);x=Math.round((p.x-m.w/2)*2)/2;y=Math.round((p.y-m.d/2)*2)/2}
 x=Math.max(0,Math.min(W-m.w,x));y=Math.max(0,Math.min(D-m.d,y));
 if(m.w>W+1e-6||m.d>D+1e-6){d.spot=null;ghost(null);return}
 d.rot=rot;d.spot=nearestFree(it,x,y,d.obs,rot);var k=1/scale(),t=Object.assign({},it,{rot:rot}),exact=d.spot&&d.spot.x===x&&d.spot.y===y;
 G.ghost.innerHTML='<g transform="translate('+x+' '+y+')" opacity="'+(exact?.92:.45)+'" pointer-events="none">'+objInner(t,k)+'</g>'+(d.spot&&!exact?'<rect x="'+d.spot.x+'" y="'+d.spot.y+'" width="'+m.w+'" height="'+m.d+'" fill="rgba(47,125,225,.10)" stroke="#2f7de1" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>':'')}
function ldDrop(e){var d=ldrag;if(d.pk)return pkDrop(e);ldCancel();ldClick=Date.now();ldCard=d.card;if(!ldOver(e))return;
 if(!d.spot){toast(dims(d.it,0).w>P.room.w||dims(d.it,0).d>P.room.d?'It\'s bigger than the room. Make the room bigger first.':'No free spot for it there');return}
 var before=snapP(),it={u:'o'+(P.uid++),r:d.r,x:d.spot.x,y:d.spot.y,rot:d.rot,n:P.uid,placed:1};P.defs[d.r]=JSON.parse(JSON.stringify(LIB[d.r]));P.items.push(it);
 if(!relayout({nogrow:true})){P=JSON.parse(before);toast('No free spot for it there');render();return}
 var po=autoPlug(it.u);hist.push(before);fut=[];lastFail=null;persist();render();pop(it.u);plugToast(po)}
$('#lib').addEventListener('pointerdown',function(e){var b=e.target.closest('.lcard');if(!b||e.button>0)return;if(ldrag)ldCancel();
 ldrag={r:b.dataset.r,pk:b.dataset.pk,card:b,sx:e.clientX,sy:e.clientY,touch:e.pointerType!=='mouse',started:false};
 if(ldrag.touch)ldrag.timer=setTimeout(function(){if(ldrag&&!ldrag.started){ldStart();ldMove({clientX:ldrag.sx,clientY:ldrag.sy})}},150)});
window.addEventListener('pointermove',function(e){var d=ldrag;if(!d)return;var dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);
 // touch: a sideways move (toward the plan) picks the card up straight away; an up/down swipe scrolls the list
 if(!d.started){if(d.touch){if(dist>8){if(Math.abs(e.clientX-d.sx)>Math.abs(e.clientY-d.sy)*.8)ldStart();else ldCancel()}}else if(dist>6)ldStart();if(!ldrag||!ldrag.started)return}
 e.preventDefault();ldMove(e)},{passive:false});
window.addEventListener('pointerup',function(e){if(!ldrag)return;if(!ldrag.started){ldCancel();return}ldDrop(e)});
// the browser can take a touch back (system gesture, scroll); never leave a half-finished drag stuck, or no card can be dragged again
window.addEventListener('pointercancel',function(){if(ldrag)ldCancel()});
// once a held card is lifted, stop the list from scrolling under the finger
window.addEventListener('touchmove',function(e){if(ldrag&&ldrag.started)e.preventDefault()},{passive:false});
window.addEventListener('keydown',function(e){if(e.key==='Escape'&&ldrag)ldCancel()});


/* ---------------- right: room, requirements, objects ---------------- */
var ICO={power:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',water:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',vent:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',gas:'<rect x="8" y="6" width="8" height="15" rx="3"/><path d="M10 3h4v3h-4z"/>',ceil:'<path d="M4 4h16M12 7v13M9 10l3-3 3 3M9 17l3 3 3-3"/>',cool:'<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/>',note:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'};
function ico(k){return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f5b52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO[k]+'</svg>'}
function power(list){var o={w:0,max:0,items:0,est:0,ded:{},sh:{}};list.forEach(function(it){var c=defOf(it);if(!c||!c.p)return;var V=c.p[0],W=c.p[1],A=c.p[2];o.items++;o.w+=W;o.max=Math.max(o.max,W);if(c.est)o.est++;if(c.p[3]){var k=V+'|'+A;(o.ded[k]=o.ded[k]||{V:V,A:A,n:0}).n++}else{(o.sh[V]=o.sh[V]||{V:V,w:0}).w+=W}});
 if(list===P.items)ZN().forEach(function(z){var L=zLayout(z);if(!L.W)return;o.items+=L.n;o.w+=L.W;o.max=Math.max(o.max,L.W);(o.sh[120]=o.sh[120]||{V:120,w:0}).w+=L.W});
 o.circ=[];Object.keys(o.ded).forEach(function(k){var d=o.ded[k];o.circ.push(d.n+' × '+d.V+'V '+d.A+'A dedicated')});Object.keys(o.sh).forEach(function(k){var g=o.sh[k],n=Math.max(1,Math.ceil(g.w/(g.V*20*.8)));o.circ.push(n+' × '+g.V+'V 20A shared')});o.peak=o.items?o.max+(o.w-o.max)*.5:0;return o}
// "Power · N objects not powered": one line, opens to a list of names (shortened with … if long);
// the Power view has the details.
var unpOpen=false;try{unpOpen=localStorage.getItem('sp-unp')==='1'}catch(_){}
function unpList(){var by={},order=[];P.items.forEach(function(it){var c=defOf(it),sp=pspec(c);if(!sp||isC(it))return;if(P.pw){var st=pstat(it);if(!st||st.lv!=='red')return}
  if(!by[it.r]){by[it.r]={c:c,sp:sp,n:0,u:it.u};order.push(it.r)}by[it.r].n++});return order.map(function(r){return by[r]})}
function unpTag(sp){return (sp.ph===3?'3φ '+sp.A+'A':sp.V===240?'240V '+sp.A+'A':'120V')+' · '+fmtW(sp.W)}
function unpRow(){var L=unpList();if(!L.length)return '';var n=L.reduce(function(a,x){return a+x.n},0);
 var h='<details class="unp" id="unp"'+(unpOpen?' open':'')+'><summary><span class="ui">'+'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d6453d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></span><span class="ut"><b>Power</b> · <span class="bad">'+n+' object'+(n>1?'s':'')+' not powered</span></span><svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a867c" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="ul">';
 L.forEach(function(x){h+='<button class="uli" data-u="'+x.u+'" title="'+esc(x.c.n)+'"><span class="un">'+esc(x.c.n)+'</span>'+(x.n>1?'<span class="ux">×'+x.n+'</span>':'')+'</button>'});
 return h+'<button class="ulink" id="unp-go">'+(P.pw?'Rebuild power in Power view →':'Build out power in Power view →')+'</button></div></details>'}
function reqHtml(list,Hr0,inner){var L=(list||P.items).map(function(it){return {it:it,c:defOf(it)}}).filter(function(x){return x.c}),names=function(f){var s={};L.forEach(function(x){if(f(x))s[x.c.n]=(s[x.c.n]||0)+1});return Object.keys(s).map(function(n){return s[n]>1?n+' ×'+s[n]:n}).join(', ')};
 if(!L.length)return inner?'<p class="muted">Nothing in here yet.</p>':'<p class="muted">Add objects and the room\'s needs show up here: power, plumbing, ventilation and more.</p>';
 var h=inner?'':unpRow(),pw=power(list||P.items);if(inner&&pw.w)h+='<div class="rq">'+ico('power')+'<div><b>Power</b> · '+fmtW(pw.w)+'</div><small>'+esc(Object.keys(pw.sh).map(function(v){return v+'V shared '+fmtW(pw.sh[v].w)}).concat(Object.keys(pw.ded).map(function(k){var q=pw.ded[k];return q.n+' × '+q.V+'V '+q.A+'A own circuit'})).join(' · '))+'</small></div>';
 var w=names(function(x){return needs(x.c).water});if(w)h+='<div class="rq">'+ico('water')+'<div><b>Plumbing</b> · water and drain</div><small>'+esc(w)+'</small></div>';
 var hu=names(function(x){return needs(x.c).humid});if(hu){var dh=P.items.some(function(i){return i.r==='h-dehu'});h+='<div class="rq">'+ico('water')+'<div><b>Humidity</b> · '+(dh?'<span class="good">dehumidifier in the room ✓</span>':'growing adds moisture: plan a dehumidifier and keep it apart from electronics')+'</div><small>'+esc(hu)+'</small></div>'}
 var vv={};L.forEach(function(x){var n=needs(x.c);if(n.vent)(vv[n.vent]=vv[n.vent]||[]).push(x.c.n)});Object.keys(vv).forEach(function(k){h+='<div class="rq">'+ico('vent')+'<div><b>Ventilation</b> · '+esc(k)+'</div><small>'+esc(Array.from(new Set(vv[k])).join(', '))+'</small></div>'});
 var g=names(function(x){return needs(x.c).gas});if(g)h+='<div class="rq">'+ico('gas')+'<div><b>Compressed gas storage</b></div><small>'+esc(g)+'</small></div>';
 var ce=0,ceq=names(function(x){var n=needs(x.c);if(n.ceil>0)ce=Math.max(ce,n.ceil);return !!n.ceil});if(ceq){var Hr=Hr0||P.room.h,lc=L.filter(function(x){var n=needs(x.c);return Hr&&n.ceil>Hr+1e-6}).map(function(x){return {it:x.it,need:needs(x.c).ceil}});h+='<div class="rq">'+ico('ceil')+'<div><b>Ceiling height</b> · '+(ce?'at least '+fmt(ce)+' ft clear':'check clear height')+(Hr?(lc.length?' · <span class="bad">room is '+fmt(Hr)+' ft</span>':' · <span class="good">room is '+fmt(Hr)+' ft ✓</span>'):'')+'</div><small>'+(lc.length?esc(lc.map(function(x){return defOf(x.it).n+' needs '+fmt(x.need)+' ft'}).join(', ')):esc(ceq)+(Hr?'':'. Set the ceiling height above to check.'))+'</small></div>'}
 var co=names(function(x){return needs(x.c).cool});if(co)h+='<div class="rq">'+ico('cool')+'<div><b>Cooling</b></div><small>'+esc(co)+'</small></div>';
 var ot={};L.forEach(function(x){needs(x.c).other.forEach(function(k){if(ALERTS[k])(ot[k]=ot[k]||[]).push(x.c.n)})});Object.keys(ot).forEach(function(k){h+='<div class="rq">'+ico('note')+'<div><b>'+esc(ALERTS[k][0])+'</b></div><small>'+esc(Array.from(new Set(ot[k])).join(', '))+'</small></div>'});
 return h||'<p class="muted">Nothing beyond power.</p>'}
// room sides in 5 ft steps; a size the room grew to on its own stays selectable
function dimOpts(V){var v=[],h='';for(var i=5;i<=300;i+=5)v.push(i);if(v.indexOf(V)<0){v.push(V);v.sort(function(a,b){return a-b})}v.forEach(function(x){h+='<option value="'+x+'"'+(x===V?' selected':'')+'>'+fmt(x)+'</option>'});return h}
// 10–30 ft; an older room's unset or odd value stays selectable
function ceilOpts(){var H=P.room.h||null,v=[],h='';for(var i=10;i<=30;i++)v.push(i);if(H&&v.indexOf(H)<0){v.push(H);v.sort(function(a,b){return a-b})}
 if(!H)h+='<option value="" selected>—</option>';v.forEach(function(x){h+='<option value="'+x+'"'+(x===H?' selected':'')+'>'+fmt(x)+'</option>'});return h}
function lowCeil(){var out=[];if(!P.room.h)return out;P.items.forEach(function(it){var c=defOf(it),n=c&&needs(c),H=hOfIt(it);if(n&&n.ceil>H+1e-6)out.push({it:it,need:n.ceil})});return out}
function ceilOf(it){var H=P.room.h?hOfIt(it):0,c=defOf(it),n=c&&needs(c);return H&&n&&n.ceil>H+1e-6?n.ceil:0}
// room strip under the top bar: size (edit in place), Dynamic Expansion, area, equipment cost, power
function strip(){var el=$('#strip');if(!el)return;var W=P.room.w,D=P.room.d,lo=0,hi=0,nc=0,pw=power(P.items);P.items.forEach(function(i){var c=defOf(i);if(c&&c.cost){lo+=c.cost[0];hi+=c.cost[1]}else nc++});
 var act=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#strip')?document.activeElement.id:null;
 el.innerHTML='<span class="slab">Building</span><b>'+fmt(W)+' × '+fmt(D)+' ft</b><i class="ssep"></i><span>'+Math.round(W*D).toLocaleString()+' sq ft</span><i class="ssep"></i><span>'+fmt(P.room.h||10)+' ft high</span>'+(RM().length?'<i class="ssep"></i><span>'+RM().length+' room'+(RM().length>1?'s':'')+'</span>':'')+(lowCeil().length?'<span class="sbad" title="'+esc(lowCeil().map(function(x){return defOf(x.it).n+' needs '+fmt(x.need)+' ft'}).join('\n'))+'">'+lowCeil().length+' too low</span>':'')+
  '<i class="ssep"></i><div class="vseg mseg2" role="group" aria-label="Mode"><button class="vb'+(BLD&&!EX.on?' on':'')+'" id="m-build"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16"/><path d="M3 10h18M3 15h18M9 4v6M15 10v5M9 15v5"/></svg><span class="lbl">Build</span></button><button class="vb'+(EX.on||BLD?'':' on')+'" id="m-design"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg><span class="lbl">Design</span></button><button class="vb'+(EX.on?' on':'')+'" id="m-explore"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="M10 22l1-7-2-3 3-4 3 4 2 3M9 12l-3 2M15 12l3 2"/></svg><span class="lbl">Explore</span></button></div>';
 $('#m-build').onclick=function(){setBuild(true)};$('#m-design').onclick=function(){if(EX.on)setExplore(false);if(BLD)setBuild(false)};$('#m-explore').onclick=function(){if(BLD){BLD=false;document.body.classList.remove('building');renderLib();render()}setExplore(true)};if(act&&$('#'+act)&&$('#'+act).tagName!=='SELECT')$('#'+act).focus()}
function side(){var W=P.room.w,D=P.room.d,h=howTo();if(BLD){var S0=$('#side');S0.innerHTML=h+buildSide();strip();buildSideWire();var ht0=$('#howto');if(ht0)ht0.ontoggle=function(){howOpen=ht0.open};return}
 if(lastFail&&lastFail.msg)h+='<div class="card"><div class="err"><span>'+esc(lastFail.msg)+'.</span><button class="btn" id="r-grow">Make room bigger and add it</button></div></div>';
 if(selO)h+=outletCard();if(libV&&!sel&&!selO)h+=libCard();if(selZ&&!sel&&!selO)h+=zoneCard();if(selF&&!sel&&!selO&&fOnLv())h+=floorCard();var it=byU(sel);if(it){var c=defOf(it),m=dims(it,it.rot),ps=pstat(it),col=((CATS.filter(function(x){return x[0]===c.c})[0])||[])[1]||'#8a867c';
  h+='<div class="card sel"><span class="lab">Selected</span><div class="hero">'+libArt(Object.assign({},c,{w:it.w||c.w,d:it.d||c.d}),col)+'</div><b class="snm">'+esc(c.n)+'</b>'+
  '<div class="sbtns"><span class="sgrp"><button class="sb" id="o-rl" title="Turn left (Shift+R)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Turn left</button><button class="sb" id="o-rr" title="Turn right (R)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>Turn right</button></span></div>'+
  '<div class="sbtns">'+dupBtn('o-dup')+'<button class="sb red" id="o-del"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Delete</button></div>'+
  (isFan(c)&&fanDrop(it)>(c.drop||0)+.01?'<div class="fnote"><b>Hangs '+fmt(fanDrop(it)+(c.th||1))+' ft down</b>, below the light it overlaps. Blades '+fmt(hOfIt(it)-fanDrop(it)-(c.th||1))+' ft above the floor.<span class="amb">Fan blades turning under a light cause flicker, which can be risky around saws and lathes.</span></div>':'')+
  (it.pin?'<div class="spin">Pinned here · <button class="lnk" id="o-pin">Unpin</button></div>':'')+
  '<button class="fbox" id="o-space" title="Change the size and '+(c.ceiling?'reach':'clearance')+' of this one"><span class="ln"><span class="rw"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4M3 15h4M9 3v4M15 3v4"/></svg>Size'+(itEdited(it,'size')?'<em class="etag">Edited</em>':'')+'</span><b>'+fmt(m.w)+' × '+fmt(m.d)+' ft</b></span><span class="rw"><span>'+(c.ceiling?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2.5"/></svg>Reach'+(itEdited(it,'reach')?'<em class="etag">Edited</em>':'')+'</span><b>about '+fmt(c.reach||0)+' ft around</b>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v16H4z" stroke-dasharray="3 3"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>Clearance'+(itEdited(it,'k')?'<em class="etag">Edited</em>':'')+'</span><b>'+clrShort(c)+'</b>')+'</span></span><span class="pe"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/></svg></span></button>'+'<div class="srows">'+(c.ceiling?'<div class="srw"><span>Hangs down</span><b>'+(fanDrop(it)?fmt(fanDrop(it))+' ft':'flush')+'</b></div>':'')+(c.p?'<div class="srw"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>Power</span><b>'+pvTxt(c)+' · '+fmtW(c.p[1])+(c.p[3]?' · own circuit':'')+'</b></div>':'')+(ps&&ps.o?'<div class="srw"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/></svg>Plugged into</span><b>'+esc(tName(ps.o.ty,ps.o))+' · C'+ps.o.c+'</b></div>':'')+'</div>'+
  (ps&&ps.lv!=='ok'?'<div class="'+(ps.lv==='red'?'err':'warn')+'">'+esc(ps.why)+'</div>':'')+(ceilOf(it)?'<div class="err">Needs about '+fmt(ceilOf(it))+' ft of clear height. '+(roomAt(ibox(it).x+ibox(it).w/2,ibox(it).y+ibox(it).d/2)?'This room':'The building')+' is '+fmt(hOfIt(it))+' ft.</div>':'')+(c.no?'<p class="muted">'+esc(c.no)+'</p>':'')+'</div>'}
 if(VW.md==='p')h+=powerCard();if(VW.md!=='p'&&!byU(sel)&&!libV&&!selZ&&!(selF&&fOnLv()))h+=RM().length?roomsSummary():'<div class="card"><span class="lab">This room needs</span><div class="req">'+reqHtml()+'</div></div>';

 var S=$('#side');S.innerHTML=h;strip();pwHead();
 var gb=$('#r-grow');if(gb)gb.onclick=function(){var r=lastFail.r,c=LIB[r],before=snapP(),nit={u:'o'+(P.uid++),r:r,x:0,y:0,rot:0,n:P.uid};P.defs[r]=JSON.parse(JSON.stringify(c));P.items.push(nit);if(!relayout({force:true})){P=JSON.parse(before);toast('Even a much bigger room can\'t fit that');render();return}hist.push(before);fut=[];sel=nit.u;lastFail=null;persist();render()};
 var pb=$('#pw-build');if(pb)pb.onclick=function(){push();buildPower();selO=null;persist();render();toast('Power built out: '+P.pw.circ.length+' circuits')};
 var pg=$('#pw-gp');if(pg)pg.onchange=function(){push();P.pwo=Object.assign({},P.pwo,{gp:this.checked});if(P.pw)buildPower();persist();render()};
 var od=$('#o-odel');if(od)od.onclick=function(){pkDel(selO)};
 var ht=$('#howto');if(ht)ht.ontoggle=function(){howOpen=ht.open;try{localStorage.setItem('sp-howto',howOpen?'1':'0')}catch(_){}};
 var un=$('#unp');if(un){un.ontoggle=function(){unpOpen=un.open;try{localStorage.setItem('sp-unp',unpOpen?'1':'0')}catch(_){}};S.querySelectorAll('.uli').forEach(function(b){b.onclick=function(){sel=b.dataset.u;selO=null;render()}});$('#unp-go').onclick=function(){setView('md','p')}}
 S.querySelectorAll('details.pg').forEach(function(d){d.ontoggle=function(){var k=d.dataset.k;if(d.open===(pwOpenK===k))return;pwOpenK=d.open?k:null;render()}});S.querySelectorAll('.pci').forEach(function(b){b.onclick=function(){sel=b.dataset.u;selO=null;render()}});S.querySelectorAll('.pch').forEach(function(b){b.onclick=function(){selO=b.dataset.o;sel=null;render()}});
 if(it){$('#o-rl').onclick=function(){rotate(it.u,-1)};$('#o-rr').onclick=function(){rotate(it.u,1)};if($('#o-pin'))$('#o-pin').onclick=function(){setPin(it.u,false)};$('#o-dup').onclick=function(){dupItem(it.u)};$('#o-del').onclick=function(){remove(it.u)};$('#o-space').onclick=function(){editIt(it.u)}}
 S.querySelectorAll('.oi').forEach(function(b){b.onclick=function(){sel=b.dataset.u;render()}});S.querySelectorAll('details.rcard').forEach(function(d){d.ontoggle=function(){openRm[d.dataset.k]=d.open}});
 document.querySelectorAll('#lib .lcard').forEach(function(b){b.classList.toggle('pick',!!libV&&(b.dataset.r?libV.r===b.dataset.r:libV.pk===b.dataset.pk))});var zc=document.querySelector('#lib .zlib');if(zc)zc.classList.toggle('pick',!!(libV&&libV.zone));zoneCardWire();floorCardWire()}
function viewLib(v){libV=v;sel=null;selO=null;selZ=null;selF=null;render()}
var SVI=function(p){return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'};
function pvTxt(c){var s=pspec(c);return s.ph===3?'240V 3-phase':c.p[0]+'V'}
function libCard(){var v=libV;if(v.zone)return '<div class="card sel lv"><span class="lab">Lights</span><div class="hero">'+zoneLibCard().match(/<svg[\s\S]*?<\/svg>/)[0]+'</div><b class="snm">Light zone</b><p class="muted lvh">'+(TOUCH?'Hold and drag':'Drag')+' it onto the plan, then drag its edges to cover the area that needs light.</p><p class="muted">The app works out how many fixtures it takes to light the zone evenly and spaces them for your '+fmt(P.room.h||10)+' ft ceiling. Change the fixture, brightness or layout from the zone\'s details.</p></div>';var row=function(ic,k,val){return '<div class="srw"><span>'+(ic?SVI(ic):'')+k+'</span><b>'+val+'</b></div>'},hint='<p class="muted lvh">'+(TOUCH?'Hold and drag':'Drag')+' it onto the plan to place it.</p>';
 if(v.pk){var K=PK[pkK(v.pk)];if(!K)return '';var at={wall:'On a wall, or in the floor',wallfloor:'On a wall, or in the floor',drop:'Hangs from the ceiling',ceil:'On the ceiling'}[K.at]||'',V=K.ty==='any'?'Any voltage, matched to the object':K.ty.indexOf('3p')===0?'3-phase '+K.ty.slice(2)+'A':K.ty.replace('-','V ')+'A';
  return '<div class="card sel lv"><span class="lab">Outlet type</span><div class="hero pw">'+PICON[pkK(v.pk)]+'</div><b class="snm">'+esc(K.n)+'</b>'+hint+'<div class="srows">'+row('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>','Supplies',V)+row('','Circuit',K.ded?'Own circuit, one object':'Shared, up to '+K.cap+' objects')+(K.reach?row('','Cord reach',K.reach+' ft'):'')+row('','Goes',at)+'</div></div>'}
 var c=LIB[v.r];if(!c)return '';var n=needs(c),col=((CATS.filter(function(x){return x[0]===c.c})[0])||[])[1]||'#8a867c',cnt=P.items.filter(function(x){return x.r===v.r}).length,ut=[n.water?'Water':'',n.vent||'',n.gas?'Compressed gas':''].filter(Boolean).join(', ');
 return '<div class="card sel lv"><span class="lab">Library'+(EDITED[v.r]?'<span class="led2">Edited</span>':MINE[v.r]?'<span class="led2 mine">Mine</span>':'')+'</span><div class="hero">'+libArt(c,col)+'</div><b class="snm">'+esc(c.n)+'</b>'+hint+
  '<div class="srows">'+row('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4M3 15h4M9 3v4M15 3v4"/>','Size',fmt(c.w)+' × '+fmt(c.d)+' ft'+(c.h?' · '+fmt(c.h)+' ft tall':''))+
  (c.ceiling?row('<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2.5"/>','Reach','about '+fmt(c.reach||0)+' ft around'):row('<path d="M4 4h16v16H4z" stroke-dasharray="3 3"/><rect x="8" y="8" width="8" height="8" rx="1"/>','Clearance',clrShort(c)))+
  row('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>','Power',c.p?pvTxt(c)+' · '+fmtW(c.p[1])+(c.p[3]?' · own circuit':''):'None')+row('<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>','Utilities',esc(ut||'None'))+
  (cnt?row('','On your plan',cnt):'')+'</div>'+(c.no?'<p class="muted">'+esc(c.no)+'</p>':'')+'</div>'}

/* ---------------- objects: make your own, or save your own version of a library object ---------------- */
function editObj(r){var c=r?LIB[r]:null,mine=!!(r&&MINE[r]),ov=r?EDITED[r]:null;if(!tok){toast('Sign in to the test app to make your own objects');return}
 // Editing never changes the shared library: a library object is saved as your own version of it, which you can revert.
 var lib=!!(c&&!mine),d=$('#d-obj'),cs=CATS.filter(function(x){return x[0]!=='Rooms & Zones'}).map(function(x){return x[0]});
 var n=c?needs(c):{},p=c&&c.p?c.p:[0,0,20,0],is3=!!(c&&c.p&&pspec(c).ph===3),title=!c?'New object':mine?'Edit my object':'Edit object';
 var IC=function(p){return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'};
 var num0=function(v){return v?fmt(v):''},K=c?kOf(c):[0,0,0,0],isC=c?!!c.ceiling:cv();
 var U=function(nm,lab,v,u,extra){return '<label class="fl">'+lab+'<span class="uin" data-u="'+(u||'ft')+'"><input name="'+nm+'" inputmode="decimal" autocomplete="off" value="'+v+'"'+(extra||'')+'></span></label>'};
 var TG=function(nm,lab,on){return '<label class="tg"><input type="checkbox" name="'+nm+'"'+(on?' checked':'')+'><span>'+lab+'</span></label>'};
 var cd=function(cls,col,ico,t,body,grow,aside){return '<section class="cd '+cls+'" style="--hc:'+col+(grow?';flex:1':'')+'"><h3>'+IC(ico)+t+(aside||'')+'</h3>'+body+'</section>'};
 var KB=function(i,lab){return '<div class="c'+'fblr'[i]+'"><input name="k'+i+'" inputmode="decimal" autocomplete="off" aria-label="'+lab+' clearance (ft)" value="'+fmt(K[i])+'"><em>'+lab+'</em></div>'};
 d.classList.add('wide');
 d.innerHTML='<form method="dialog" class="dlg oed"><h2>'+title+'</h2>'+(lib?'<p class="muted">'+(ov?'This is your edited version. Only you see these changes.':'Changes are saved as your own version. The original stays the same for everyone else.')+'</p>':'')+
  '<div class="g2"><label class="fl">Name<input name="n" required autocomplete="off" value="'+esc(c?c.n:'')+'"></label>'+
  '<label class="fl">Category<select name="c">'+cs.map(function(x){return '<option'+(c&&c.c===x?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select></label></div>'+
  '<section class="cd plc" style="--hc:#0e8a8a"><h3>'+IC('<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>')+'Placement</h3><div class="seg2" role="radiogroup" aria-label="Placement">'+
   '<label><input type="radio" name="place" value="f"'+(isC?'':' checked')+'>'+IC('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>')+'<span>Sits on the floor</span></label>'+
   '<label><input type="radio" name="place" value="c"'+(isC?' checked':'')+'>'+IC('<path d="M12 2v4"/><path d="M7 11a5 5 0 0 1 10 0z"/><path d="M10 15a2 2 0 0 0 4 0"/>')+'<span>Hangs from the ceiling</span></label></div></section>'+
  '<div class="cols"><div class="col">'+
   cd('','#2f7de1','<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4M3 15h4M9 3v4M15 3v4"/>','Size','<div class="g2">'+U('w','Width',c?fmt(c.w):'','ft',' required')+U('d','Depth',c?fmt(c.d):'','ft',' required')+U('h','Height',num0(c&&c.h))+U('ceil','Min. ceiling height',n.ceil>0?fmt(n.ceil):'')+'</div>')+
   cd('clrcd','#7a5af5','<path d="M4 4h16v16H4z" stroke-dasharray="3 3"/><rect x="8" y="8" width="8" height="8" rx="1"/>','Clearance','<p class="hnt">Space that must stay empty to use it, shown as on the plan with its front facing down. Back 0 lets it stand against a wall.</p><div class="cbox">'+KB(1,'back')+KB(2,'left')+'<div class="cobj"><span>'+esc(c?c.n:'Object')+'</span><i>front ▼</i></div>'+KB(3,'right')+KB(0,'front')+'</div>',true)+
   cd('reachcd','#7a5af5','<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2.5"/>','Reach','<p class="hnt">How far it covers around itself, like a light\'s pool or a fan\'s draft.</p><div class="rch"><div class="rdisk"><i></i></div><div class="g1">'+U('reach','Reach',num0(c&&c.reach))+U('drop','Hangs down',num0(c&&c.drop))+'</div></div>',true)+
  '</div><div class="col">'+
   cd('','#e0a400','<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>','Power','<div class="g2"><label class="fl">Voltage<select name="pv"><option value="0">none</option><option value="120"'+(p[0]===120?' selected':'')+'>120V</option><option value="240"'+(p[0]>=208&&!is3?' selected':'')+'>240V</option><option value="3"'+(is3?' selected':'')+'>240V 3-phase</option></select></label>'+U('pw','Watts',p[1]||'','W')+'</div><div class="fl">Circuit<div class="seg2 pdseg" role="radiogroup" aria-label="Circuit">'+
   '<label><input type="radio" name="pd" value="0"'+(p[3]?'':' checked')+'>'+IC('<path d="M8 3v6M16 3v6"/><path d="M5 9h14v3a7 7 0 0 1-14 0z"/><path d="M12 19v2"/>')+'<span>Can share a circuit</span></label>'+
   '<label><input type="radio" name="pd" value="1"'+(p[3]?' checked':'')+'>'+IC('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>')+'<span>Needs its own circuit</span></label></div></div>')+
   cd('','#1f9d6b','<path d="M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3z"/>','Utilities','<div class="tgs">'+TG('water','Plumbing',n.water)+TG('vent','Ventilation',n.vent)+TG('gas','Compressed gas',n.gas)+'</div>')+
   cd('','#8a867c','<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6"/>','Notes','<textarea name="no" placeholder="Anything worth remembering about it">'+esc(c&&c.no||'')+'</textarea>',true)+
  '</div></div>'+
  '<div class="row" style="justify-content:space-between"><span class="row">'+(mine?'<button class="btn red" value="del" formnovalidate>Delete</button>':'')+(ov?'<button class="btn" value="revert" formnovalidate>Revert to original</button>':'')+'</span><span class="row"><button class="btn" value="cancel" formnovalidate>Cancel</button><button class="btn pri" value="save">Save</button></span></div></form>';
 var fm=d.querySelector('form'),syncC=function(){fm.classList.toggle('isceil',fm.elements.place.value==='c')},syncP=function(){var on=+fm.elements.pv.value>0,t3=fm.elements.pv.value==='3';if(t3)fm.querySelector('input[name=pd][value="1"]').checked=true;fm.querySelector('.pdseg').classList.toggle('lock',t3);fm.elements.pw.disabled=!on;fm.querySelectorAll('input[name=pd]').forEach(function(x){x.disabled=!on});fm.querySelector('.pdseg').classList.toggle('off',!on)};
 fm.querySelectorAll('input[name=place]').forEach(function(x){x.onchange=syncC});fm.elements.pv.onchange=syncP;syncC();syncP();
 fm.elements.n.oninput=function(){fm.querySelector('.cobj span').textContent=this.value||'Object'};
 var after=function(){syncDefs(true);renderLib()};
 d.onclose=function(){var v=d.returnValue,f=d.querySelector('form');if(v==='cancel'||!v)return;
  if(v==='del'){if(!confirm('Delete '+c.n+'?'))return;api('DELETE','/api/objects/'+r).then(function(){toast(c.n+' removed');return loadLib()}).then(renderLib).catch(function(e){toast(e.message)});return}
  if(v==='revert'){if(!confirm('Revert '+c.n+' to the original? Your changes to it will be lost.'))return;api('DELETE','/api/objects/'+ov).then(function(){return loadLib()}).then(function(){toast('Reverted to the original: '+LIB[r].n);after(r)}).catch(function(e){toast(e.message)});return}
  var F=function(k){return f.elements[k]},num=function(k){return parseFloat(F(k).value)||0},nd={n:F('n').value.trim(),c:F('c').value,w:num('w'),d:num('d'),h:num('h')||undefined,k:[num('k0'),num('k1'),num('k2'),num('k3')]};normObj(nd);
  var pv=+F('pv').value,hi=pv===240||pv===3,sameV=c&&c.p&&(c.p[0]>=208)===hi,amp=sameV?c.p[2]:(hi?30:20);if(pv)nd.p=[hi?240:120,num('pw'),amp,pv===3||F('pd').value==='1'?1:0];nd.req={water:F('water').checked,vent:F('vent').checked,gas:F('gas').checked,ceil:num('ceil')};if(F('no').value.trim())nd.no=F('no').value.trim();if(c&&c.cost)nd.cost=c.cost.slice();
  if(F('place').value==='c'){nd.ceiling=true;nd.reach=num('reach');nd.drop=num('drop')}if(c&&c.a)nd.a=c.a.filter(function(x){return x!=='threephase'});if(pv===3){nd.a=(nd.a||[]).concat('threephase')}else if(c&&c.ph)delete nd.ph;if(c&&c.ov)nd.ov=1;if(c&&c.est)nd.est=c.est;if(!nd.n||!(nd.w>0&&nd.d>0)){toast('An object needs a name, width and depth');return}
  if(lib)nd.base=r;
  var key=mine?r:lib?(ov||('u'+me.id+'-ov-'+r).slice(0,80)):'u'+me.id+'-'+nd.n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Date.now().toString(36).slice(-4);
  api('PUT','/api/objects/'+key,{data:nd}).then(function(){toast((lib?'Saved your version':'Saved')+': '+nd.n);return loadLib()}).then(function(){if(!c)openCats['My objects']=true;after(lib?r:key)}).catch(function(e){toast(e.message)})};
 modal(d)}
/* ---------------- one placed object: its own size / clearance / reach (the library object stays as it is) ---------------- */
function editIt(u){var it=byU(u);if(!it)return;var c0=defOf0(it),c=defOf(it),d=$('#d-it'),ceil=!!c0.ceiling,K=kOf(c),K0=kOf(c0),rot=(it.rot||0)%4,sw=rot%2,m=dims(it,rot),
  num=function(v){v=parseFloat(v);return isFinite(v)&&v>=0?Math.round(v*4)/4:null},
  IC=function(p){return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'},
  ISZ='<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4M3 15h4M9 3v4M15 3v4"/>',ICL='<path d="M4 4h16v16H4z" stroke-dasharray="3 3"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  IRC='<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2.5"/>',IRS='<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  TAG='<em class="etag">Edited</em>',U=function(nm,lab,v){return '<label class="fl">'+lab+'<span class="uin" data-u="ft"><input name="'+nm+'" inputmode="decimal" autocomplete="off" value="'+fmt(v)+'"></span></label>'},
  w0=sw?c0.d:c0.w,d0=sw?c0.w:c0.d,libTxt=fmt(w0)+' × '+fmt(d0)+' ft, '+(ceil?'reach about '+fmt(c0.reach||0)+' ft':clrShort(c0)==='none'?'no clearance':'clearance '+clrShort(c0)),
  any=itEdited(it,'size')||itEdited(it,ceil?'reach':'k');
 // the clearance picture is drawn as the object sits on the plan right now (turned with it); each box still edits that side's own value
 var NM=['front','back','left','right'],LOC=[1,3,0,2],POS=['cb','cr','cf','cl'],AR=['▲','▶','▼','◀'],box='';
 for(var sd=0;sd<4;sd++){var ki=LOC[(sd-rot+4)%4];box+='<div class="'+POS[sd]+'"><input name="k'+ki+'" inputmode="decimal" autocomplete="off" aria-label="'+NM[ki]+' clearance (ft)" value="'+fmt(K[ki])+'"><em>'+NM[ki]+'</em></div>'}
 var fs=(2+rot)%4,oh=Math.max(46,Math.min(130,170*m.d/Math.max(m.w,.1)));
 var obj='<div class="cobj" style="height:'+oh+'px">'+(fs===0?'<i>▲ front</i>':'')+'<span>'+esc(c0.n)+'</span>'+(fs===2?'<i>front ▼</i>':'')+(fs===1?'<i>front ▶</i>':'')+(fs===3?'<i>◀ front</i>':'')+'</div>';
 var right=ceil?'<section class="cd" style="--hc:#7a5af5;flex:1"><h3>'+IC(IRC)+'Reach'+(itEdited(it,'reach')?TAG:'')+'</h3><p class="hnt">How far it covers around itself.</p><div class="rch"><div class="rdisk"><i></i></div><div class="g1">'+U('re','Reach',c.reach||0)+'</div></div></section>'
  :'<section class="cd" style="--hc:#7a5af5;flex:1"><h3>'+IC(ICL)+'Clearance'+(itEdited(it,'k')?TAG:'')+'</h3><p class="hnt">Space that must stay empty around it, shown as it sits on the plan.</p><div class="cbox">'+box.replace('<div class="cr">',obj+'<div class="cr">')+'</div></section>';
 d.className='wide it2';
 d.innerHTML='<form method="dialog" class="dlg oed"><div class="ph" style="--hc:#2f7de1">'+IC(ISZ)+'<div><h2>This '+esc(c0.n)+'</h2><p>Changes here apply only to this one on the plan. The library version stays '+esc(libTxt)+'.</p></div></div>'+
  '<div class="cols"><div class="col"><section class="cd" style="--hc:#2f7de1"><h3>'+IC(ISZ)+'Size'+(itEdited(it,'size')?TAG:'')+'</h3><div class="g2">'+U('w','Width',m.w)+U('d','Depth',m.d)+'</div><p class="hnt" style="margin:0">Width is left to right on the plan.</p></section>'+
  '<section class="cd" style="--hc:#8a867c;flex:1"><h3>'+IC(IRS)+'Library version</h3><p class="hnt" style="margin:0">'+esc(libTxt.charAt(0).toUpperCase()+libTxt.slice(1))+'.</p><button class="btn" value="reset" formnovalidate style="align-self:flex-start"'+(any?'':' disabled')+'>Reset this one to library</button></section></div>'+
  '<div class="col">'+right+'</div></div>'+
  '<div class="row" style="justify-content:flex-end;gap:8px"><button class="btn" value="cancel" formnovalidate>Cancel</button><button class="btn pri" value="ok">Done</button></div></form>';
 d.onclose=function(){var v=d.returnValue,F=d.querySelector('form').elements;if(!v||v==='cancel')return;var nw={};
  if(v==='reset'){nw.w=nw.d=nw.k=nw.reach=undefined}
  else{var w=num(F.w.value),dd=num(F.d.value);if(!(w>0&&dd>0)){toast('Width and depth need to be more than 0');return}if(sw){var t=w;w=dd;dd=t}nw.w=w===c0.w?undefined:w;nw.d=dd===c0.d?undefined:dd;
   if(ceil){var re=num(F.re.value);if(re==null){toast('Enter a reach in feet');return}nw.reach=re===(c0.reach||0)?undefined:re}
   else{var k=[0,1,2,3].map(function(i){return num(F['k'+i].value)||0});nw.k=JSON.stringify(k)===JSON.stringify(K0)?undefined:k}}
  var before=snapP();Object.keys(nw).forEach(function(x){if(nw[x]===undefined)delete it[x];else it[x]=nw[x]});
  if(before===snapP())return;
  if(!relayout()){P=JSON.parse(before);toast('That doesn\'t fit in the room');render();return}
  hist.push(before);if(hist.length>60)hist.shift();fut=[];if(P.pw)buildPower();persist();render();if(v==='reset')toast('Back to the library size and '+(ceil?'reach':'clearance'))};
 modal(d)}
$('#b-newobj').onclick=function(){editObj(null)};
$('#b-undo').onclick=function(){undo()};$('#b-redo').onclick=function(){redo()};

/* ---------------- saving rooms ---------------- */
// everything that makes up the layout; anything left out here is lost when the room is opened on another device
function pack(){var defs={};P.items.forEach(function(i){var c=defOf0(i);if(c)defs[i.r]=c});var cl=function(v){return v==null?v:JSON.parse(JSON.stringify(v))};
 return {room:P.room,dyn:P.dyn,uid:P.uid,pw:P.pw,pwo:P.pwo,items:cl(P.items),defs:defs,zones:cl(P.zones||[]),zid:P.zid||0,rooms:cl(P.rooms||[]),rid:P.rid||0,floors:cl(P.floors||[]),fid:P.fid||0,edoors:cl(P.edoors||[]),ewins:cl(P.ewins||[])}}
$('#rname').onchange=function(){P.name=this.value.trim()||'Untitled room';persist()};
$('#b-save').onclick=function(){if(!tok){toast('Sign in to the test app first to save rooms to your account');return}P.name=$('#rname').value.trim()||'Untitled room';var b={name:P.name,data:pack()};
 (P.id?api('PUT','/api/spaces/'+P.id,b):api('POST','/api/spaces',b).then(function(j){P.id=j.id})).then(function(){persist();toast('Saved “'+P.name+'”')}).catch(function(e){toast(e.message)})};
$('#b-new').onclick=function(){push();P=blank();V={z:1,cx:null,cy:null};sel=null;selO=null;lastFail=null;persist();render()};
$('#b-open').onclick=function(){if(!tok){toast('Sign in to the test app first to open saved rooms');return}api('GET','/api/spaces').then(function(j){var d=$('#d-open');
 d.innerHTML='<form method="dialog" class="dlg"><h2>Open a room</h2>'+(j.spaces.length?'<div class="spl">'+j.spaces.map(function(s){return '<button value="'+s.id+'"><span>'+esc(s.name)+'</span><small>'+esc(s.updated_at.slice(0,16))+'</small></button>'}).join('')+'</div>':'<p class="muted">No saved rooms yet.</p>')+'<div class="row" style="justify-content:flex-end"><button class="btn" value="">Close</button></div></form>';
 d.onclose=function(){var id=d.returnValue;if(!id)return;api('GET','/api/spaces/'+id).then(function(r){push();var x=migrate(r.space.data);P=Object.assign(blank(),{id:r.space.id,name:r.space.name,room:x.room,dyn:x.dyn!==false,uid:x.uid||1,items:x.items||[],defs:x.defs||{},pw:x.pw||null,pwo:x.pwo||{gp:true},zones:x.zones||[],zid:x.zid||0,rooms:x.rooms||[],rid:x.rid||0,floors:x.floors||[],fid:x.fid||0,edoors:x.edoors||[],ewins:x.ewins||[]});wallNudge();sel=null;selO=null;selZ=null;selR=null;selD=null;lastFail=null;persist();render();syncDefs(true);toast('Opened “'+P.name+'”')}).catch(function(e){toast(e.message)})};modal(d)}).catch(function(e){toast(e.message)})};
function showWho(){$('#who').innerHTML=me?'Signed in as <b>'+esc(me.username)+'</b>'+(me.admin?' · library owner':''):'Not signed in · <a href="index.html">sign in to the test app</a> to save'}
showWho();
if(tok)api('GET','/api/me').then(function(j){me=j.user;showWho();return loadLib()}).then(function(){renderLib();render();syncDefs(true)}).catch(function(){tok=null;me=null;showWho()});
if(wallNudge())persist();renderLib();render();
window.__sp={P:function(){return P},ev:function(s){return eval(s)},fd:function(u){return fanDrop(byU(u))},edit:function(r,t){if(t){tok=tok||t;me=me||{id:0}}editObj(r)},explore:function(on){setExplore(on)},ex:function(){return EX},build:function(){buildPower();render()},pstat:function(u){return pstat(byU(u))},changes:pwChanges,conv:converter,layout:layout,add:add,setSize:setSize,lib:function(){return LIB},sel:function(){return sel},undo:undo};
})();
