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
function money(v){return v>=1000?'$'+(v>=10000?Math.round(v/1000):Math.round(v/100)/10)+'k':'$'+Math.round(v)}
function costTxt(c){if(!c||!c.cost)return '';var a=c.cost[0],b=c.cost[1];if(!a&&!b)return '';return a===b?money(a):money(a)+'–'+money(b)}
function fmtW(w){return w>=1000?(Math.round(w/100)/10).toLocaleString('en-US')+' kW':Math.round(w)+' W'}
var tt=null;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2600)}

/* ---------------- the object library: built-in catalog + shared edits + my own ---------------- */
var LIB={},MINE={},SHAREDROWS=0;
function baseLib(){LIB={};CATALOG.forEach(function(c){if(c.z||c.r==='b-wall'||c.c==='Rooms & Zones')return;LIB[c.r]=JSON.parse(JSON.stringify(c))})}
baseLib();
// The catalog is the source of truth for built-in objects. A shared row only replaces a built-in when the
// library owner actually edited it (rows copied in by the old one-time seed are ignored), and never for a retired id.
function loadLib(){if(!tok)return Promise.resolve();return api('GET','/api/objects').then(function(j){baseLib();MINE={};SHAREDROWS=0;
  var sh=j.objects.filter(function(o){return o.shared}),t0=sh.reduce(function(m,o){var t=Date.parse(o.updated_at+'Z')||0;return Math.min(m,t)},Infinity);
  j.objects.forEach(function(o){if(ALIAS[o.r])return;
   if(o.shared){SHAREDROWS++;var builtIn=!!BY[o.r],edited=(o.data&&o.data.ed)||(Date.parse(o.updated_at+'Z')||0)>t0+60000;
    if(o.deleted){delete LIB[o.r];return}
    if(builtIn&&!edited)return;LIB[o.r]=Object.assign({},o.data,{r:o.r})}
   else if(o.mine){LIB[o.r]=Object.assign({},o.data,{r:o.r});MINE[o.r]=1}});
 }).catch(function(e){if(e.status===401){tok=null;showWho()}})}
// rooms saved before an object was retired: move them onto its generic replacement
function migrate(x){(x.items||[]).forEach(function(it){var n=ALIAS[it.r];if(n&&BY[n]){if(x.defs){delete x.defs[it.r];x.defs[n]=JSON.parse(JSON.stringify(BY[n]))}it.r=n}});if(x.defs)Object.keys(x.defs).forEach(function(r){if(ALIAS[r])delete x.defs[r]});return x}
function defOf(it){return (P.defs&&P.defs[it.r])||LIB[it.r]||null}
// what a room needs because of what's in it
function needs(c){var a=c.a||[],q=c.req||{},o={};
 o.water=!!q.water||a.indexOf('plumbing')>=0||a.indexOf('garden')>=0||/sink|dishwasher|ice m|shower|toilet/i.test(c.n);
 o.vent=q.vent?'Ventilation':a.indexOf('fumes')>=0?'Fume extraction':a.indexOf('co2')>=0?'Fume exhaust to outside':a.indexOf('weld')>=0?'Ventilation for welding':a.indexOf('commercial')>=0?'Type I hood with fire suppression':a.indexOf('dust')>=0?'Dust collection':'';
 o.gas=!!q.gas||a.indexOf('gas')>=0;o.ceil=+q.ceil||(a.indexOf('ceiling')>=0?-1:0);o.cool=a.indexOf('hvac')>=0;o.other=a.filter(function(k){return ['truck','public','notyet','ev'].indexOf(k)>=0});return o}

/* ---------------- the room ---------------- */
var P,hist=[],fut=[],sel=null,lastFail=null;
function blank(){return {id:null,name:'Untitled room',room:{w:7,d:7},dyn:true,items:[],defs:{},uid:1}}
P=blank();try{var sv0=JSON.parse(localStorage.getItem('space-planner-cur')||'null');if(sv0&&sv0.room&&Array.isArray(sv0.items))P=migrate(Object.assign(blank(),sv0))}catch(_){}
function snapP(){return JSON.stringify(P)}
function push(){hist.push(snapP());if(hist.length>60)hist.shift();fut=[]}
function persist(){try{localStorage.setItem('space-planner-cur',JSON.stringify(P))}catch(_){}}

/* ---------------- geometry ---------------- */
function dims(it,rot){var c=defOf(it),w=it.w||c.w,d=it.d||c.d,sw=(rot==null?it.rot:rot)%2;return {w:sw?d:w,d:sw?w:d}}
function clr(c,b,rot){var k=c.cl||0;if(!k)return null;if(c.cf){switch(rot%4){case 1:return {x:b.x-k,y:b.y,w:k,d:b.d};case 2:return {x:b.x,y:b.y-k,w:b.w,d:k};case 3:return {x:b.x+b.w,y:b.y,w:k,d:b.d};default:return {x:b.x,y:b.y+b.d,w:b.w,d:k}}}return {x:b.x-k,y:b.y-k,w:b.w+2*k,d:b.d+2*k}}
function hit(a,b){return a.x<b.x+b.w-1e-6&&b.x<a.x+a.w-1e-6&&a.y<b.y+b.d-1e-6&&b.y<a.y+a.d-1e-6}
function inside(r,W,D){return r.x>=-1e-6&&r.y>=-1e-6&&r.x+r.w<=W+1e-6&&r.y+r.d<=D+1e-6}
function ok(b,c,placed,W,D){if(!inside(b,W,D)||(c&&!inside(c,W,D)))return false;for(var i=0;i<placed.length;i++){var p=placed[i];if(hit(b,p.b)||(p.c&&hit(b,p.c))||(c&&hit(c,p.b)))return false}return true}
function kind(c){return c.cf?'wall':(c.cl>0?'center':'flex')}
var WALLROT=[0,1,2,3]; // top wall faces down (0), right faces left (1), bottom faces up (2), left faces right (3)
function wallSpots(it,W,D){var o=[];for(var s=0;s<4;s++){var rot=WALLROT[s],m=dims(it,rot);
  if(s===0||s===2){var y=s===0?0:D-m.d;for(var x=0;x+m.w<=W+1e-6;x+=.5)o.push({x:x,y:y,rot:rot,t:s===0?x:W+D+(W-x-m.w)})}
  else{var x2=s===1?W-m.w:0;for(var y2=0;y2+m.d<=D+1e-6;y2+=.5)o.push({x:x2,y:y2,rot:rot,t:s===1?W+y2:2*W+D+(D-y2-m.d)})}}return o}
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
 var pr=function(it){var c=defOf(it),m=dims(it,0),k=c.cl||0;return (it.pin?1e9:0)+(stable&&it.placed?5e8:0)+({center:3e6,wall:2e6,flex:1e6})[kind(c)]+(m.w+2*k)*(m.d+2*k)};
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
function grow(items,W,D,maxTries){var body=0,need=items.map(function(it){var c=defOf(it),m=dims(it,0),k=c.cl||0;body+=m.w*m.d;return c.cf?{a:Math.min(m.w,m.d),b:Math.max(m.w,m.d)}:{a:Math.min(m.w,m.d)+2*k,b:Math.max(m.w,m.d)+2*k}});
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
 P.room.w=w;P.room.d=d;apply(r);if(how===2)P.items.forEach(function(it){it.pin=false});lastFail=null;persist();render();
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
 if(sel&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();remove(sel)}if(sel&&(e.key==='r'||e.key==='R'))rotate(sel,e.shiftKey?-1:1);if(e.key==='Escape'){sel=null;render()}});

/* ---------------- drawing ---------------- */
var sv=$('#sv'),NS='http://www.w3.org/2000/svg',G={},popU=null,drag=null;
function vb(){var M=Math.max(2,Math.max(P.room.w,P.room.d)*.12);return {x:-M,y:-M,w:P.room.w+2*M,h:P.room.d+2*M}}
function scale(){var r=sv.getBoundingClientRect(),v=vb();return Math.min(r.width/v.w,r.height/v.h)||10}
function drawRoom(){var v=vb(),W=P.room.w,D=P.room.d,k=1/scale(),g='';sv.setAttribute('viewBox',v.x+' '+v.y+' '+v.w+' '+v.h);
 g+='<rect x="0" y="0" width="'+W+'" height="'+D+'" fill="#fbfaf7"/>';for(var x=1;x<W;x++)g+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="'+D+'" stroke="'+(x%5?'#f0ede6':'#e4e0d6')+'" stroke-width="'+k+'"/>';for(var y=1;y<D;y++)g+='<line x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'" stroke="'+(y%5?'#f0ede6':'#e4e0d6')+'" stroke-width="'+k+'"/>';
 g+='<rect x="0" y="0" width="'+W+'" height="'+D+'" fill="none" stroke="#3a3936" stroke-width="'+(5*k)+'"/>';
 g+='<text x="'+(W/2)+'" y="'+(-10*k)+'" text-anchor="middle" font-size="'+(12*k)+'" fill="#6b6960">'+fmt(W)+' ft</text><text x="'+(-8*k)+'" y="'+(D/2)+'" text-anchor="middle" font-size="'+(12*k)+'" fill="#6b6960" transform="rotate(-90 '+(-8*k)+' '+(D/2)+')">'+fmt(D)+' ft</text>';
 return g}
function objInner(it,k){var c=defOf(it),m=dims(it,it.rot),b={x:0,y:0,w:m.w,d:m.d},cc=clr(c,b,it.rot),on=sel===it.u,h='';
 if(cc)h+='<rect x="'+cc.x+'" y="'+cc.y+'" width="'+cc.w+'" height="'+cc.d+'" fill="'+(c.cf?'rgba(150,140,120,.08)':'rgba(47,111,237,.035)')+'" stroke="#b9b4a8" stroke-width="'+k+'" stroke-dasharray="'+(5*k)+' '+(4*k)+'" pointer-events="none"/>';
 var art=ICONS[it.r];h+='<rect x="0" y="0" width="'+m.w+'" height="'+m.d+'" rx="0.2" fill="'+(art?'#fff':'#ece9e2')+'" stroke="'+(on?'#2f7de1':'#9d988c')+'" stroke-width="'+((on?2.4:1.2)*k)+'"/>';
 if(art)h+=iconFor({r:it.r,x:0,y:0,w:m.w,d:m.d,rot:it.rot});
 if(c.cf){var f=clr({cl:.001,cf:1},b,it.rot);var x1=f.x,y1=f.y,x2=f.x+(f.w>.01?f.w:0),y2=f.y+(f.d>.01?f.d:0);h+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#5f5b52" stroke-width="'+(2.5*k)+'"/>'}
 if(it.pin)h+='<circle cx="'+(m.w-.35)+'" cy=".35" r="'+(6*k)+'" fill="#e07b1f" stroke="#fff" stroke-width="'+(1.5*k)+'"/>';
 var fs=11*k;if(on||(!art&&m.w/k>50)){var t=c.n.length>20?c.n.slice(0,19)+'…':c.n;h+='<text x="'+(m.w/2)+'" y="'+(m.d/2+fs*.35)+'" text-anchor="middle" font-size="'+fs+'" font-weight="'+(on?700:500)+'" fill="'+(on?'#1d4f91':'#3a3936')+'" stroke="#fff" stroke-width="'+(3*k)+'" paint-order="stroke" pointer-events="none">'+esc(t)+'</text>'}
 return h}
function render(){var k=1/scale();if(!G.room){sv.innerHTML='<g id="g-room"></g><g id="g-obj"></g><g id="g-ghost"></g>';G.room=sv.querySelector('#g-room');G.obj=sv.querySelector('#g-obj');G.ghost=sv.querySelector('#g-ghost')}
 G.room.innerHTML=drawRoom();var seen={};
 P.items.forEach(function(it){var el=G.obj.querySelector('[data-u="'+it.u+'"]');if(!el){el=document.createElementNS(NS,'g');el.setAttribute('class','obj');el.dataset.u=it.u;el.style.cursor='grab';el.style.transform='translate('+it.x+'px,'+it.y+'px)';G.obj.appendChild(el)}
  var key=[it.r,it.rot,sel===it.u,!!it.pin,k.toFixed(4)].join('|');if(el.dataset.k!==key){el.dataset.k=key;el.innerHTML=objInner(it,k)}
  if(!(drag&&drag.u===it.u&&drag.moved)){var turned=el.dataset.rot!=null&&el.dataset.rot!==String(it.rot);el.dataset.rot=it.rot;if(turned){el.style.transition='none';el.style.transform='translate('+it.x+'px,'+it.y+'px)';el.getBoundingClientRect();el.style.transition='';pop(it.u)}else el.style.transform='translate('+it.x+'px,'+it.y+'px)'}seen[it.u]=1;el.classList.toggle('pop',popU===it.u)});
 Array.prototype.slice.call(G.obj.children).forEach(function(el){if(!seen[el.dataset.u])el.remove()});
 $('#rname').value=P.name;side();markLib();$('#b-undo').disabled=!hist.length;$('#b-redo').disabled=!fut.length;$('#hint').textContent=P.items.length?'Drag to move · push into a wall to turn it · R / Shift+R turn':'Click an object on the left to add it'}
function pop(u){popU=u;setTimeout(function(){popU=null},400)}
window.addEventListener('resize',function(){G.obj&&Array.prototype.forEach.call(G.obj.children,function(e){e.dataset.k=''});render()});

/* ---------------- dragging an object pins it ---------------- */
function toFt(e){var p=sv.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(sv.getScreenCTM().inverse())}
sv.addEventListener('pointerdown',function(e){var g=e.target.closest('g.obj');if(!g){sel=null;render();return}var it=byU(g.dataset.u),p=toFt(e);drag={u:it.u,el:g,dx:p.x-it.x,dy:p.y-it.y,sx:e.clientX,sy:e.clientY,moved:false};sv.setPointerCapture(e.pointerId);e.preventDefault()});
// the free spot closest to where it was dropped: nothing else has to move, nobody's clearance is blocked
function others(it){return P.items.filter(function(o){return o!==it}).map(function(o){var mo=dims(o,o.rot),bo={x:o.x,y:o.y,w:mo.w,d:mo.d};return {b:bo,c:clr(defOf(o),bo,o.rot)}})}
function nearestFree(it,x,y,obs,rot){var c=defOf(it),m=dims(it,rot),W=P.room.w,D=P.room.d,best=null,bd=1e9;
 for(var yy=0;yy+m.d<=D+1e-6;yy+=.5)for(var xx=0;xx+m.w<=W+1e-6;xx+=.5){var dd=Math.hypot(xx-x,yy-y);if(dd>=bd)continue;var b={x:xx,y:yy,w:m.w,d:m.d};if(ok(b,clr(c,b,rot),obs,W,D)){bd=dd;best={x:xx,y:yy}}}
 return best}
function ghost(sp,it,rot){var g=G.ghost;if(!sp){g.innerHTML='';return}var m=dims(it,rot),k=1/scale();g.innerHTML='<rect x="'+sp.x+'" y="'+sp.y+'" width="'+m.w+'" height="'+m.d+'" fill="rgba(47,125,225,.10)" stroke="#2f7de1" stroke-width="'+(1.6*k)+'" stroke-dasharray="'+(5*k)+' '+(3*k)+'" pointer-events="none"/>'}
// pushing past a wall turns the object to sit against that wall: front-facing pieces face into the room, others run their long side along it
function wallTurn(it,s){var c=defOf(it);if(c.cf)return s;var m=dims(it,0);return m.w>=m.d?s:(s+1)%4}
function drawAs(d,it,rot){if(d.shown===rot)return;d.shown=rot;var t=Object.assign({},it,{rot:rot});d.el.dataset.k='';d.el.innerHTML=objInner(t,1/scale())}
sv.addEventListener('pointermove',function(e){if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<4)return;var it=byU(drag.u);if(!drag.moved){drag.obs=others(it);drag.rot=drag.shown=it.rot}drag.moved=true;
 var p=toFt(e),W=P.room.w,D=P.room.d,thr=Math.max(.75,18/scale()),over=[-p.y,p.x-W,p.y-D,-p.x],side=-1,bo=thr;
 for(var q=0;q<4;q++)if(over[q]>bo){bo=over[q];side=q}
 var x,y,rot,m;
 if(side>=0){rot=wallTurn(it,side);m=dims(it,rot);x=side===3?0:side===1?W-m.w:Math.round((p.x-m.w/2)*2)/2;y=side===0?0:side===2?D-m.d:Math.round((p.y-m.d/2)*2)/2}
 else{rot=it.rot;m=dims(it,rot);if(drag.rot!==it.rot){var m0=dims(it,drag.rot);drag.dx=m.w/2;drag.dy=m.d/2}x=Math.round((p.x-drag.dx)*2)/2;y=Math.round((p.y-drag.dy)*2)/2}
 x=Math.max(0,Math.min(W-m.w,x));y=Math.max(0,Math.min(D-m.d,y));drag.x=x;drag.y=y;drag.rot=rot;drawAs(drag,it,rot);
 drag.el.classList.add('drag');drag.el.style.transform='translate('+x+'px,'+y+'px)';
 drag.spot=nearestFree(it,x,y,drag.obs,rot);var exact=drag.spot&&drag.spot.x===x&&drag.spot.y===y;drag.el.style.opacity=exact?1:.6;ghost(exact?null:drag.spot,it,rot)});
sv.addEventListener('pointerup',function(e){if(!drag)return;var d=drag;drag=null;d.el.classList.remove('drag');d.el.style.opacity='';ghost(null);var it=byU(d.u);
 if(!d.moved){sel=it.u;render();return}
 var before=snapP();sel=it.u;it.rot=d.rot;d.el.dataset.rot=it.rot;
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
 $('#lib').querySelectorAll('.lcard').forEach(function(b){b.onclick=function(){add(b.dataset.r)};b.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();add(b.dataset.r)}};b.oncontextmenu=function(e){e.preventDefault();editObj(b.dataset.r)}});markLib()}
function markLib(){var cnt={};P.items.forEach(function(i){cnt[i.r]=(cnt[i.r]||0)+1});document.querySelectorAll('#lib .lcard').forEach(function(b){b.classList.toggle('sel',!!cnt[b.dataset.r])})}
$('#q').oninput=function(){q=this.value;renderLib()};

/* ---------------- right: room, requirements, objects ---------------- */
var ICO={power:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',water:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',vent:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',gas:'<rect x="8" y="6" width="8" height="15" rx="3"/><path d="M10 3h4v3h-4z"/>',ceil:'<path d="M4 4h16M12 7v13M9 10l3-3 3 3M9 17l3 3 3-3"/>',cool:'<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/>',note:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'};
function ico(k){return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f5b52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO[k]+'</svg>'}
function power(list){var o={w:0,max:0,items:0,est:0,ded:{},sh:{}};list.forEach(function(it){var c=defOf(it);if(!c||!c.p)return;var V=c.p[0],W=c.p[1],A=c.p[2];o.items++;o.w+=W;o.max=Math.max(o.max,W);if(c.est)o.est++;if(c.p[3]){var k=V+'|'+A;(o.ded[k]=o.ded[k]||{V:V,A:A,n:0}).n++}else{(o.sh[V]=o.sh[V]||{V:V,w:0}).w+=W}});
 o.circ=[];Object.keys(o.ded).forEach(function(k){var d=o.ded[k];o.circ.push(d.n+' × '+d.V+'V '+d.A+'A dedicated')});Object.keys(o.sh).forEach(function(k){var g=o.sh[k],n=Math.max(1,Math.ceil(g.w/(g.V*20*.8)));o.circ.push(n+' × '+g.V+'V 20A shared')});o.peak=o.items?o.max+(o.w-o.max)*.5:0;return o}
function reqHtml(){var L=P.items.map(function(it){return {it:it,c:defOf(it)}}).filter(function(x){return x.c}),names=function(f){var s={};L.forEach(function(x){if(f(x))s[x.c.n]=(s[x.c.n]||0)+1});return Object.keys(s).map(function(n){return s[n]>1?n+' ×'+s[n]:n}).join(', ')};
 if(!L.length)return '<p class="muted">Add objects and the room\'s needs show up here: power, plumbing, ventilation and more.</p>';
 var h='',pw=power(P.items);
 h+='<div class="rq">'+ico('power')+'<div><b>Power</b> · '+(pw.items?(pw.est?'≈ ':'')+fmtW(pw.w)+' connected, ≈ '+fmtW(pw.peak)+' peak':'none')+'</div>'+(pw.circ.length?'<small>'+esc(pw.circ.join(' · '))+'</small>':'')+'</div>';
 var w=names(function(x){return needs(x.c).water});if(w)h+='<div class="rq">'+ico('water')+'<div><b>Plumbing</b> · water and drain</div><small>'+esc(w)+'</small></div>';
 var vv={};L.forEach(function(x){var n=needs(x.c);if(n.vent)(vv[n.vent]=vv[n.vent]||[]).push(x.c.n)});Object.keys(vv).forEach(function(k){h+='<div class="rq">'+ico('vent')+'<div><b>Ventilation</b> · '+esc(k)+'</div><small>'+esc(Array.from(new Set(vv[k])).join(', '))+'</small></div>'});
 var g=names(function(x){return needs(x.c).gas});if(g)h+='<div class="rq">'+ico('gas')+'<div><b>Compressed gas storage</b></div><small>'+esc(g)+'</small></div>';
 var ce=0,ceq=names(function(x){var n=needs(x.c);if(n.ceil>0)ce=Math.max(ce,n.ceil);return !!n.ceil});if(ceq)h+='<div class="rq">'+ico('ceil')+'<div><b>Ceiling height</b> · '+(ce?'at least '+fmt(ce)+' ft clear':'check clear height')+'</div><small>'+esc(ceq)+'</small></div>';
 var co=names(function(x){return needs(x.c).cool});if(co)h+='<div class="rq">'+ico('cool')+'<div><b>Cooling</b></div><small>'+esc(co)+'</small></div>';
 var ot={};L.forEach(function(x){needs(x.c).other.forEach(function(k){if(ALERTS[k])(ot[k]=ot[k]||[]).push(x.c.n)})});Object.keys(ot).forEach(function(k){h+='<div class="rq">'+ico('note')+'<div><b>'+esc(ALERTS[k][0])+'</b></div><small>'+esc(Array.from(new Set(ot[k])).join(', '))+'</small></div>'});
 return h}
function side(){var W=P.room.w,D=P.room.d,h='';
 h+='<div class="card"><span class="lab">Room</span><div class="big">'+Math.round(W*D).toLocaleString()+' sq ft</div><div class="dims"><input id="r-w" value="'+fmt(W)+'" inputmode="decimal" aria-label="Width in feet"><span>×</span><input id="r-d" value="'+fmt(D)+'" inputmode="decimal" aria-label="Depth in feet"><button class="btn" id="r-set">Set</button></div>';
 h+='<label class="sw"><input type="checkbox" id="r-dyn"'+(P.dyn?' checked':'')+'> Dynamic Expansion</label><p class="muted">'+(P.dyn?'The room grows to fit new objects. It never shrinks on its own.':'The room stays this size. Objects that don\'t fit are refused.')+'</p>';
 if(lastFail&&lastFail.msg)h+='<div class="err"><span>'+esc(lastFail.msg)+'.</span><button class="btn" id="r-grow">Make room bigger and add it</button></div>';
 h+='</div>';
 var it=byU(sel);if(it){var c=defOf(it),m=dims(it,it.rot);h+='<div class="card"><span class="lab">Selected</span><b style="font-size:15px">'+esc(c.n)+'</b>'+(it.pin?'<span class="pin" style="align-self:flex-start">Pinned here</span>':'')+
  '<div class="irow"><span>Size</span><b>'+fmt(m.w)+' × '+fmt(m.d)+' ft</b></div><div class="irow"><span>Clearance</span><b>'+(c.cl?fmt(c.cl)+' ft '+(c.cf?'in front':'all around'):'none')+'</b></div>'+(costTxt(c)?'<div class="irow"><span>Typical cost</span><b>'+costTxt(c)+'</b></div>':'')+(c.p?'<div class="irow"><span>Power</span><b>'+c.p[0]+'V · '+fmtW(c.p[1])+(c.p[3]?' · own circuit':'')+'</b></div>':'')+(c.no?'<p class="muted">'+esc(c.no)+'</p>':'')+
  '<div class="row"><button class="btn" id="o-rl" title="Turn left (Shift+R)">↺ Turn left</button><button class="btn" id="o-rr" title="Turn right (R)">↻ Turn right</button></div><div class="row"><button class="btn" id="o-pin">'+(it.pin?'Unpin':'Pin here')+'</button><button class="btn red" id="o-del">Remove</button></div></div>'}
 var lo=0,hi=0,nc=0;P.items.forEach(function(i){var c=defOf(i);if(c&&c.cost){lo+=c.cost[0];hi+=c.cost[1]}else nc++});if(P.items.length&&hi)h+='<div class="card"><span class="lab">Equipment cost</span><div class="big" style="font-size:20px">'+money(lo)+' – '+money(hi)+'</div><p class="muted">Typical prices for new equipment'+(nc?'; '+nc+' object'+(nc>1?'s have':' has')+' no price':'')+'. Install, wiring and plumbing not included.</p></div>';
 h+='<div class="card"><span class="lab">This room needs</span><div class="req">'+reqHtml()+'</div></div>';
 if(P.items.length){var cnt={};h+='<div class="card"><span class="lab">In this room · '+P.items.length+'</span><div class="ol">'+P.items.map(function(i){var c=defOf(i),m=dims(i,i.rot);return '<button class="oi'+(sel===i.u?' on':'')+'" data-u="'+i.u+'"><span class="nm">'+esc(c.n)+'</span>'+(i.pin?'<span class="pin">pinned</span>':'')+'<span class="sz">'+fmt(m.w)+'×'+fmt(m.d)+'</span></button>'}).join('')+'</div></div>'}
 var S=$('#side');S.innerHTML=h;
 $('#r-set').onclick=function(){setSize(parseFloat($('#r-w').value),parseFloat($('#r-d').value))};['#r-w','#r-d'].forEach(function(s){$(s).onkeydown=function(e){if(e.key==='Enter')$('#r-set').click()}});
 $('#r-dyn').onchange=function(){push();P.dyn=this.checked;persist();render()};
 var gb=$('#r-grow');if(gb)gb.onclick=function(){var r=lastFail.r,c=LIB[r],before=snapP(),nit={u:'o'+(P.uid++),r:r,x:0,y:0,rot:0,n:P.uid};P.defs[r]=JSON.parse(JSON.stringify(c));P.items.push(nit);if(!relayout({force:true})){P=JSON.parse(before);toast('Even a much bigger room can\'t fit that');render();return}hist.push(before);fut=[];sel=nit.u;lastFail=null;persist();render()};
 if(it){$('#o-rl').onclick=function(){rotate(it.u,-1)};$('#o-rr').onclick=function(){rotate(it.u,1)};$('#o-pin').onclick=function(){setPin(it.u,!it.pin)};$('#o-del').onclick=function(){remove(it.u)}}
 S.querySelectorAll('.oi').forEach(function(b){b.onclick=function(){sel=b.dataset.u;render()}})}

/* ---------------- objects: make your own; the admin edits the shared library ---------------- */
function editObj(r){var c=r?LIB[r]:null,mine=!!(r&&MINE[r]),admin=!!(me&&me.admin);if(!tok){toast('Sign in to the test app to make your own objects');return}
 var canEdit=!c||mine||admin,shared=c&&!mine,d=$('#d-obj'),cs=CATS.filter(function(x){return x[0]!=='Rooms & Zones'}).map(function(x){return x[0]});
 var n=c?needs(c):{},p=c&&c.p?c.p:[0,0,20,0],title=!c?'New object':shared?(admin?'Edit shared object':'Object details'):'Edit my object';
 d.innerHTML='<form method="dialog" class="dlg"><h2>'+title+'</h2>'+(shared&&!admin?'<p class="muted">Shared objects are managed by the library owner. Save a copy to make your own version.</p>':'')+
  '<div class="fg"><label class="fl" style="grid-column:1/-1">Name<input name="n" required value="'+esc(c?c.n:'')+'"></label>'+
  '<label class="fl">Category<select name="c">'+cs.map(function(x){return '<option'+(c&&c.c===x?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select></label><span></span>'+
  '<label class="fl">Width (ft)<input name="w" inputmode="decimal" required value="'+(c?c.w:'')+'"></label><label class="fl">Depth (ft)<input name="d" inputmode="decimal" required value="'+(c?c.d:'')+'"></label>'+
  '<label class="fl">Clearance (ft)<input name="cl" inputmode="decimal" value="'+(c&&c.cl?c.cl:0)+'"></label><label class="fl">Clearance is<select name="cf"><option value="0">all around</option><option value="1"'+(c&&c.cf?' selected':'')+'>in front only (backs to a wall)</option></select></label>'+
  '<label class="fl">Power<select name="pv"><option value="0">none</option><option value="120"'+(p[0]===120?' selected':'')+'>120V</option><option value="240"'+(p[0]>=208?' selected':'')+'>240V</option></select></label><label class="fl">Watts<input name="pw" inputmode="decimal" value="'+(p[1]||'')+'"></label>'+
  '<label class="ck"><input type="checkbox" name="pd"'+(p[3]?' checked':'')+'> Needs its own circuit</label><span></span>'+
  '<label class="ck"><input type="checkbox" name="water"'+(n.water?' checked':'')+'> Needs plumbing</label><label class="ck"><input type="checkbox" name="vent"'+(n.vent?' checked':'')+'> Needs ventilation</label>'+
  '<label class="ck"><input type="checkbox" name="gas"'+(n.gas?' checked':'')+'> Uses compressed gas</label><label class="fl">Min. ceiling height (ft)<input name="ceil" inputmode="decimal" value="'+(n.ceil>0?n.ceil:'')+'"></label>'+
  '<label class="fl">Typical cost, low ($)<input name="lo" inputmode="numeric" value="'+(c&&c.cost?c.cost[0]:'')+'"></label><label class="fl">Typical cost, high ($)<input name="hi" inputmode="numeric" value="'+(c&&c.cost?c.cost[1]:'')+'"></label>'+'<label class="fl" style="grid-column:1/-1">Notes<textarea name="no">'+esc(c&&c.no||'')+'</textarea></label></div>'+(!c&&admin?'<label class="ck" style="margin-top:10px"><input type="checkbox" name="sh" checked> Add to the shared library (everyone sees it)</label>':'')+
  '<div class="row" style="justify-content:space-between"><span class="row">'+(c&&canEdit?'<button class="btn red" value="del" formnovalidate>'+(shared?'Remove from library':'Delete')+'</button>':'')+'</span><span class="row"><button class="btn" value="cancel" formnovalidate>Cancel</button>'+(shared?'<button class="btn" value="copy">Save as my own copy</button>':'')+(canEdit?'<button class="btn pri" value="save">Save</button>':'')+'</span></div></form>';
 if(shared&&!admin)Array.prototype.forEach.call(d.querySelectorAll('input,select,textarea'),function(el){if(el.name)el.dataset.ro=1});
 d.onclose=function(){var v=d.returnValue,f=d.querySelector('form');if(v==='cancel'||!v)return;
  if(v==='del'){if(!confirm((shared?'Remove '+c.n+' from the shared library for everyone?':'Delete '+c.n+'?')))return;api('DELETE','/api/objects/'+r).then(function(){toast(c.n+' removed');return loadLib()}).then(renderLib).catch(function(e){toast(e.message)});return}
  var F=function(k){return f.elements[k]},num=function(k){return parseFloat(F(k).value)||0},nd={n:F('n').value.trim(),c:F('c').value,w:num('w'),d:num('d'),cl:num('cl')};if(F('cf').value==='1')nd.cf=1;
  var pv=+F('pv').value;if(pv)nd.p=[pv===240?240:120,num('pw'),pv===240?30:20,F('pd').checked?1:0];nd.req={water:F('water').checked,vent:F('vent').checked,gas:F('gas').checked,ceil:num('ceil')};if(F('no').value.trim())nd.no=F('no').value.trim();var lo=num('lo'),hi=num('hi');if(lo||hi)nd.cost=[Math.min(lo||hi,hi||lo),Math.max(lo,hi)];if(admin&&shared)nd.ed=1;
  if(c&&c.a)nd.a=c.a.slice();if(c&&c.ov)nd.ov=1;if(c&&c.est)nd.est=c.est;if(!nd.n||!(nd.w>0&&nd.d>0)){toast('An object needs a name, width and depth');return}
  var slug=nd.n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Date.now().toString(36).slice(-4),toShared=!c&&admin&&f.elements.sh&&f.elements.sh.checked;
  var key=toShared?'s-'+slug:(v==='copy'||!c)?'u'+me.id+'-'+slug:r;
  api('PUT','/api/objects/'+key,{data:nd}).then(function(){toast((toShared?'Added to the shared library':v==='copy'?'Copy saved to My objects':'Saved')+': '+nd.n);return loadLib()}).then(function(){P.items.forEach(function(i){if(i.r===key)P.defs[key]=JSON.parse(JSON.stringify(LIB[key]))});if(toShared)openCats[nd.c]=true;else if(!c||v==='copy')openCats['My objects']=true;renderLib();relayout();render()}).catch(function(e){toast(e.message)})};
 d.showModal()}
$('#b-newobj').onclick=function(){editObj(null)};
$('#b-undo').onclick=function(){undo()};$('#b-redo').onclick=function(){redo()};

/* ---------------- saving rooms ---------------- */
function pack(){var defs={};P.items.forEach(function(i){var c=defOf(i);if(c)defs[i.r]=c});return {room:P.room,dyn:P.dyn,uid:P.uid,items:P.items.map(function(i){return {u:i.u,r:i.r,x:i.x,y:i.y,rot:i.rot,pin:!!i.pin,n:i.n}}),defs:defs}}
$('#rname').onchange=function(){P.name=this.value.trim()||'Untitled room';persist()};
$('#b-save').onclick=function(){if(!tok){toast('Sign in to the test app first to save rooms to your account');return}P.name=$('#rname').value.trim()||'Untitled room';var b={name:P.name,data:pack()};
 (P.id?api('PUT','/api/spaces/'+P.id,b):api('POST','/api/spaces',b).then(function(j){P.id=j.id})).then(function(){persist();toast('Saved “'+P.name+'”')}).catch(function(e){toast(e.message)})};
$('#b-new').onclick=function(){push();P=blank();sel=null;lastFail=null;persist();render()};
$('#b-open').onclick=function(){if(!tok){toast('Sign in to the test app first to open saved rooms');return}api('GET','/api/spaces').then(function(j){var d=$('#d-open');
 d.innerHTML='<form method="dialog" class="dlg"><h2>Open a room</h2>'+(j.spaces.length?'<div class="spl">'+j.spaces.map(function(s){return '<button value="'+s.id+'"><span>'+esc(s.name)+'</span><small>'+esc(s.updated_at.slice(0,16))+'</small></button>'}).join('')+'</div>':'<p class="muted">No saved rooms yet.</p>')+'<div class="row" style="justify-content:flex-end"><button class="btn" value="">Close</button></div></form>';
 d.onclose=function(){var id=d.returnValue;if(!id)return;api('GET','/api/spaces/'+id).then(function(r){push();var x=migrate(r.space.data);P=Object.assign(blank(),{id:r.space.id,name:r.space.name,room:x.room,dyn:x.dyn!==false,uid:x.uid||1,items:x.items||[],defs:x.defs||{}});sel=null;lastFail=null;persist();render();toast('Opened “'+P.name+'”')}).catch(function(e){toast(e.message)})};d.showModal()}).catch(function(e){toast(e.message)})};
function showWho(){$('#who').innerHTML=me?'Signed in as <b>'+esc(me.username)+'</b>'+(me.admin?' · library owner':''):'Not signed in · <a href="index.html">sign in to the test app</a> to save'}
showWho();
if(tok)api('GET','/api/me').then(function(j){me=j.user;showWho();return loadLib()}).then(function(){renderLib();render()}).catch(function(){tok=null;me=null;showWho()});
renderLib();render();
window.__sp={P:function(){return P},layout:layout,add:add,setSize:setSize,lib:function(){return LIB},sel:function(){return sel},undo:undo};
})();
