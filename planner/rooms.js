/* ---------------- Build: rooms, walls and doors ----------------
   The space is a building. Rooms are rectangles inside it with their own ceiling height; their edges are walls.
   Everything outside the rooms is the open floor. Objects can't cross a wall or sit in a door's swing.
   Build is its own tab: Design keeps the walls fixed, Build keeps the objects fixed. */
var BLD=false,selR=null,selD=null,rd=null,RCOL=['#7F77DD','#1D9E75','#D85A30','#378ADD','#BA7517','#D4537E','#639922','#888780'];
function RM(){return P.rooms||(P.rooms=[])}
function rBy(id){return RM().filter(function(r){return r.id===id})[0]||null}
function rCol(r){return RCOL[(RM().indexOf(r))%RCOL.length]}
function roomAt(x,y){var a=RM();for(var i=0;i<a.length;i++){var r=a[i];if(x>r.x+1e-6&&x<r.x+r.w-1e-6&&y>r.y+1e-6&&y<r.y+r.d-1e-6)return r}return null}
function within(b,r){return b.x>=r.x-1e-6&&b.y>=r.y-1e-6&&b.x+b.w<=r.x+r.w+1e-6&&b.y+b.d<=r.y+r.d+1e-6}
// which room a box is in: a room, 'o' for the open floor, or null when it crosses a wall
function roomOfBox(b){var a=RM(),hitR=null;for(var i=0;i<a.length;i++){var r=a[i];if(hit(b,r)){if(!within(b,r))return null;hitR=r}}return hitR||'o'}
function rid(b){var r=roomOfBox(b);return r===null?null:r==='o'?'o':r.id}
function hAt(x,y){var r=roomAt(x,y);return (r&&r.h)||P.room.h||10}
function hOfIt(it){var b=ibox(it);return hAt(b.x+b.w/2,b.y+b.d/2)}
// door geometry: s side (n e s w), t offset along the side, len width, sw 1 swings into the room, hg 0 hinge at start / 1 at end
function dGeo(r,d){var L=d.len||3,t=d.t,s=d.s,a,b,n,hz;
 if(s==='n'){a={x:r.x+t,y:r.y};b={x:r.x+t+L,y:r.y};n={x:0,y:1}}else if(s==='s'){a={x:r.x+t,y:r.y+r.d};b={x:r.x+t+L,y:r.y+r.d};n={x:0,y:-1}}
 else if(s==='w'){a={x:r.x,y:r.y+t};b={x:r.x,y:r.y+t+L};n={x:1,y:0}}else{a={x:r.x+r.w,y:r.y+t};b={x:r.x+r.w,y:r.y+t+L};n={x:-1,y:0}}
 var sn=d.sw===-1?{x:-n.x,y:-n.y}:n,h=d.hg?b:a,o=d.hg?a:b,tip={x:h.x+sn.x*L,y:h.y+sn.y*L},
  box=function(v){return {x:Math.min(a.x,b.x,a.x+v.x*L),y:Math.min(a.y,b.y,a.y+v.y*L),w:Math.abs(b.x-a.x)+Math.abs(v.x*L),d:Math.abs(b.y-a.y)+Math.abs(v.y*L)}};
 return {a:a,b:b,n:n,sn:sn,h:h,o:o,tip:tip,swing:box(sn),land:box({x:-sn.x,y:-sn.y}),L:L}}
// door openings on one side of a room, its own and any a neighbour has in the shared wall
function sideGaps(r,sd){var len=sideLen(r,sd),hor=sd==='n'||sd==='s',line=sd==='n'?r.y:sd==='s'?r.y+r.d:sd==='w'?r.x:r.x+r.w,o0=hor?r.x:r.y,out=[];
 RM().forEach(function(q){(q.doors||[]).forEach(function(d){var g=dGeo(q,d),dh=d.s==='n'||d.s==='s';if(dh!==hor)return;var dl=hor?g.a.y:g.a.x;if(Math.abs(dl-line)>1e-6)return;var a=(hor?Math.min(g.a.x,g.b.x):Math.min(g.a.y,g.b.y))-o0,b=a+g.L;if(b<=0||a>=len)return;out.push([Math.max(0,a),Math.min(len,b)])})});
 return out.sort(function(p,q){return p[0]-q[0]})}
// parts of a side another room draws instead (shared wall): the taller room draws it, or the earlier one when level
function sideShared(r,sd){var hor=sd==='n'||sd==='s',line=sd==='n'?r.y:sd==='s'?r.y+r.d:sd==='w'?r.x:r.x+r.w,o0=hor?r.x:r.y,len=sideLen(r,sd),H=P.room.h||10,hr=Math.min(r.h||H,H),ir=RM().indexOf(r),out=[];
 RM().forEach(function(q,iq){if(q===r)return;var hq=Math.min(q.h||H,H);if(!(hq>hr+1e-6||(Math.abs(hq-hr)<1e-6&&iq<ir)))return;
  ['n','e','s','w'].forEach(function(s2){if((s2==='n'||s2==='s')!==hor)return;var l2=s2==='n'?q.y:s2==='s'?q.y+q.d:s2==='w'?q.x:q.x+q.w;if(Math.abs(l2-line)>1e-6)return;
   var a=(hor?q.x:q.y)-o0,b=a+(hor?q.w:q.d);a=Math.max(0,a);b=Math.min(len,b);if(b>a+1e-6)out.push([a,b])})});return out}
function doorCount(r){return ['n','e','s','w'].reduce(function(a,sd){return a+sideGaps(r,sd).length},0)}
function sideLen(r,s){return s==='n'||s==='s'?r.w:r.d}
function onEdge(r,s){var W=P.room.w,D=P.room.d;return (s==='n'&&r.y<=1e-6)||(s==='s'&&r.y+r.d>=D-1e-6)||(s==='w'&&r.x<=1e-6)||(s==='e'&&r.x+r.w>=W-1e-6)}
function doorBoxes(){var o=[];RM().forEach(function(r){(r.doors||[]).forEach(function(d){var g=dGeo(r,d);o.push(g.swing);if(inside(g.land,P.room.w,P.room.d))o.push(g.land)})});return o}
var PREF=null;
// walls: the footprint sits wholly in one room or wholly in the open floor; clearance stays on the same side; doors stay clear
// walls have thickness: 3D walls are WT thick, centred on the room's edge line, so floor objects keep WH clear of both faces
var WT=.4,WH=WT/2;
function wallOK(b,c,ceil){var a=RM();if(!a.length)return PREF?PREF.indexOf('o')>=0:true;var r=roomOfBox(ceil?b:{x:b.x-WH,y:b.y-WH,w:b.w+2*WH,d:b.d+2*WH});if(r===null)return false;var id=r==='o'?'o':r.id;if(PREF&&PREF.indexOf(id)<0)return false;
 if(c){if(r==='o'){for(var i=0;i<a.length;i++)if(hit(c,a[i]))return false}else if(!within(c,r))return false}
 if(!ceil){var db=doorBoxes();for(var j=0;j<db.length;j++)if(hit(b,db[j]))return false}return true}
// x (or y) positions that put an object of size m flush against a wall face
function faceStops(m,ax){var o=[];RM().forEach(function(r){var a=ax?r.y:r.x,L=ax?r.d:r.w;o.push(a+WH,a+L-WH-m,a-WH-m,a+L+WH)});return o}
// older layouts placed objects right on the wall line: slide them out of the wall (at most WH each way)
function wallNudge(){if(!RM().length)return 0;var n=0;P.items.forEach(function(it){var c=defOf(it);if(!c||c.ceiling)return;var b=ibox(it);if(wallOK(b,clr(c,b,it.rot),false))return;
  var obs=others(it),W=P.room.w,D=P.room.d,best=null;[0,-WH,WH].forEach(function(dx){[0,-WH,WH].forEach(function(dy){if(best)return;var nb={x:b.x+dx,y:b.y+dy,w:b.w,d:b.d};if(ok(nb,clr(c,nb,it.rot),obs,W,D))best=[dx,dy]})});
  if(best){it.x+=best[0];it.y+=best[1];n++}});return n}
function crossesWall(b){return RM().length&&roomOfBox(b)===null}
// rooms next to each other (sharing part of a wall); the open floor neighbours every room
function adjRooms(id){if(id==='o')return RM().map(function(r){return r.id});var r=rBy(id),out=['o'];if(!r)return out;
 RM().forEach(function(q){if(q===r)return;var tx=Math.min(r.x+r.w,q.x+q.w)-Math.max(r.x,q.x),ty=Math.min(r.y+r.d,q.y+q.d)-Math.max(r.y,q.y);if((tx>1e-6&&Math.abs(ty)<1e-6)||(ty>1e-6&&Math.abs(tx)<1e-6))out.push(q.id)});return out}
function memberOf(){var m={};P.items.forEach(function(it){var b=ibox(it);m[it.u]=rid({x:b.x+b.w/2-.01,y:b.y+b.d/2-.01,w:.02,d:.02})});return m}
// after a wall change: anything caught goes back into the room it was in, else the room next door, else it's flagged
function pushFix(mem){var flagged=[];P.items.forEach(function(it){var c=defOf(it);if(!c)return;var b=ibox(it),cl=c.ceiling?null:clr(c,b,it.rot);
  if(wallOK(b,cl,c.ceiling)&&rid(b)===mem[it.u])return;var tries=[mem[it.u]||'o'].concat(adjRooms(mem[it.u]||'o')),done=false;
  for(var i=0;i<tries.length&&!done;i++){PREF=[tries[i]];var q=nearestFree(it,it.x,it.y,others(it),it.rot);PREF=null;if(q){it.x=q.x;it.y=q.y;done=true}}
  if(!done)flagged.push(it.u)});
 fixZones();return flagged}
// light zones stay inside one room or wholly on the open floor; one caught by a wall shrinks to its biggest clear part
function fixZones(){ZN().forEach(function(z){for(var n=0;n<8;n++){var r=RM().filter(function(q){return hit(z,q)&&!within(z,q)})[0];if(!r)break;
  var cz={x:z.x+z.w/2,y:z.y+z.d/2},inR=cz.x>r.x&&cz.x<r.x+r.w&&cz.y>r.y&&cz.y<r.y+r.d,c;
  if(inR){var x1=Math.max(z.x,r.x),y1=Math.max(z.y,r.y),x2=Math.min(z.x+z.w,r.x+r.w),y2=Math.min(z.y+z.d,r.y+r.d);c=[{x:x1,y:y1,w:x2-x1,d:y2-y1}]}
  else c=[{x:z.x,y:z.y,w:r.x-z.x,d:z.d},{x:r.x+r.w,y:z.y,w:z.x+z.w-(r.x+r.w),d:z.d},{x:z.x,y:z.y,w:z.w,d:r.y-z.y},{x:z.x,y:r.y+r.d,w:z.w,d:z.y+z.d-(r.y+r.d)}];
  c=c.filter(function(q){return q.w>=2&&q.d>=2}).sort(function(p,q){return q.w*q.d-p.w*p.d});if(!c.length)break;z.x=c[0].x;z.y=c[0].y;z.w=c[0].w;z.d=c[0].d;z.adj={}}})}
function trimRooms(){var W=P.room.w,D=P.room.d;RM().forEach(function(r){if(r.w>W)r.w=W;if(r.d>D)r.d=D;if(r.x+r.w>W)r.x=Math.max(0,W-r.w);if(r.y+r.d>D)r.y=Math.max(0,D-r.d);
 (r.doors||[]).forEach(function(d){d.t=Math.max(0,Math.min(sideLen(r,d.s)-(d.len||3),d.t))})})}
function badWall(){if(!RM().length)return [];return P.items.filter(function(it){var c=defOf(it);if(!c)return false;var b=ibox(it);return !wallOK(b,c.ceiling?null:clr(c,b,it.rot),c.ceiling)})}
// first door: on the longest wall that opens onto the open floor, centred
function autoDoor(r){var best=null;['s','n','e','w'].forEach(function(s){if(onEdge(r,s))return;var len=sideLen(r,s);if(len<4)return;
  for(var k=0;k<=Math.floor(len-3);k++){var tt=[(len-3)/2+(k%2?1:-1)*Math.ceil(k/2)][0];if(tt<.5||tt>len-3.5)continue;var d={s:s,t:Math.round(tt*2)/2,len:3,sw:1,hg:0},g=dGeo(r,d);
   if(RM().some(function(q){return q!==r&&hit(g.land,q)}))continue;if(!best||len>best.len){best={len:len,d:d}}break}});
 return best?best.d:{s:'s',t:Math.max(0,(r.w-3)/2),len:3,sw:1,hg:0}}
function rFit(cx,cy){var W=P.room.w,D=P.room.d;for(var s=0;s<=8;s++){var w=Math.min(12-s,W),d=Math.min(10-s,D),x=Math.round(Math.max(0,Math.min(W-w,cx-w/2))),y=Math.round(Math.max(0,Math.min(D-d,cy-d/2))),b={x:x,y:y,w:w,d:d};
 if(!RM().some(function(r){return hit(b,r)}))return b}return null}
function rAdd(cx,cy){var b=rFit(cx,cy);if(!b){toast('No open floor there for a room');return}var before=snapP(),mem=memberOf();P.rid=(P.rid||0)+1;
 var r={id:'r'+P.rid,n:'Room '+P.rid,x:b.x,y:b.y,w:b.w,d:b.d,h:Math.min(9,P.room.h||15),doors:[],no:''};RM().push(r);r.doors.push(autoDoor(r));
 var fl=pushFix(mem);hist.push(before);fut=[];selR=r.id;selD=null;persist();render();if(fl.length)toast(fl.length+' object'+(fl.length>1?'s':'')+' couldn\'t be moved clear of the new walls')}
function bCommit(before,mem){var fl=pushFix(mem);if(before!==snapP()){hist.push(before);if(hist.length>60)hist.shift();fut=[];persist()}render();if(fl.length)toast(fl.length+' object'+(fl.length>1?'s':'')+' won\'t fit on either side of the wall. They\'re marked red.')}
/* ---- drawing ---- */
function drawRooms(k){var a=RM();if(!a.length)return '';var on=BLD,wl=5*k,body='',walls='',doors='',labs='',hand='';
 a.forEach(function(r){var col=rCol(r),s=on&&selR===r.id;
  body+='<rect class="room rb" data-r="'+r.id+'" x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.d+'" fill="'+col+'" fill-opacity="'+(on?(s?.16:.1):.05)+'"/>';
  ['n','e','s','w'].forEach(function(sd){var len=sideLen(r,sd),gaps=sideGaps(r,sd),cur=0,segs=[];
   gaps.forEach(function(g){if(g[0]>cur)segs.push([cur,g[0]]);cur=Math.max(cur,g[1])});if(cur<len)segs.push([cur,len]);
   segs.forEach(function(sg){var p1,p2;if(sd==='n'){p1=[r.x+sg[0],r.y];p2=[r.x+sg[1],r.y]}else if(sd==='s'){p1=[r.x+sg[0],r.y+r.d];p2=[r.x+sg[1],r.y+r.d]}else if(sd==='w'){p1=[r.x,r.y+sg[0]];p2=[r.x,r.y+sg[1]]}else{p1=[r.x+r.w,r.y+sg[0]];p2=[r.x+r.w,r.y+sg[1]]}
    walls+='<line x1="'+p1[0]+'" y1="'+p1[1]+'" x2="'+p2[0]+'" y2="'+p2[1]+'" stroke="'+(s?'#1d4f91':'#3a3936')+'" stroke-width="'+wl+'" stroke-linecap="square"/>'})});
  (r.doors||[]).forEach(function(d,i){var g=dGeo(r,d),sel2=on&&selR===r.id&&selD===i;
   doors+='<g class="rdoor" data-r="'+r.id+'" data-d="'+i+'"><line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="'+(sel2?'rgba(47,125,225,.35)':'transparent')+'" stroke-width="'+(14*k)+'"/>'+
    '<path d="M'+g.o.x+' '+g.o.y+' A'+g.L+' '+g.L+' 0 0 '+(((g.o.x-g.h.x)*(g.tip.y-g.h.y)-(g.o.y-g.h.y)*(g.tip.x-g.h.x))>0?1:0)+' '+g.tip.x+' '+g.tip.y+'" fill="none" stroke="'+(sel2?'#2f7de1':'#8a867c')+'" stroke-width="'+(1.2*k)+'" stroke-dasharray="'+(4*k)+' '+(3*k)+'"/>'+
    '<line x1="'+g.h.x+'" y1="'+g.h.y+'" x2="'+g.tip.x+'" y2="'+g.tip.y+'" stroke="'+(sel2?'#2f7de1':'#5f5b52')+'" stroke-width="'+(2.4*k)+'"/></g>'});
  labs+='<g opacity="'+(on?1:.55)+'"><text x="'+(r.x+r.w/2)+'" y="'+(r.y+r.d/2)+'" text-anchor="middle" font-size="'+(13*k)+'" font-weight="700" fill="'+shadeHex(col,-.35)+'">'+esc(r.n||'Room')+'</text><text x="'+(r.x+r.w/2)+'" y="'+(r.y+r.d/2+15*k)+'" text-anchor="middle" font-size="'+(11*k)+'" fill="'+shadeHex(col,-.2)+'">'+fmt(r.w)+' × '+fmt(r.d)+' · '+fmt(r.h||P.room.h||10)+' ft</text></g>';
  if(s&&selD==null){[['n',r.x,r.y,r.x+r.w,r.y],['s',r.x,r.y+r.d,r.x+r.w,r.y+r.d],['w',r.x,r.y,r.x,r.y+r.d],['e',r.x+r.w,r.y,r.x+r.w,r.y+r.d]].forEach(function(q){hand+='<line class="rh rwall" data-r="'+r.id+'" data-h="'+q[0]+'" x1="'+q[1]+'" y1="'+q[2]+'" x2="'+q[3]+'" y2="'+q[4]+'" stroke="rgba(47,125,225,0)" stroke-width="'+(16*k)+'" style="cursor:'+(q[0]==='n'||q[0]==='s'?'ns':'ew')+'-resize"/>'});
  [['nw',0,0],['ne',1,0],['se',1,1],['sw',0,1]].forEach(function(q){var hx=r.x+r.w*q[1],hy=r.y+r.d*q[2],rr=7*k;
   hand+='<rect class="rh" data-r="'+r.id+'" data-h="'+q[0]+'" x="'+(hx-rr)+'" y="'+(hy-rr)+'" width="'+(2*rr)+'" height="'+(2*rr)+'" rx="'+(2*k)+'" fill="#fff" stroke="#2f7de1" stroke-width="'+(2*k)+'" style="cursor:'+({n:'ns',s:'ns',e:'ew',w:'ew',nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw'})[q[0]]+'-resize"/>'})}});
 var bad='';if(BLD)badWall().forEach(function(it){var b=ibox(it);bad+='<rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.d+'" fill="rgba(214,48,49,.25)" stroke="#d63031" stroke-width="'+(2*k)+'"/>'});
 return body+'<g pointer-events="none">'+walls+'</g><g pointer-events="none">'+labs+bad+'</g>'+hand+doors}
function shadeHex(hex,f){var c=parseInt(hex.slice(1),16),r=c>>16,g=c>>8&255,b=c&255,m=function(v){return Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f)))};return '#'+((1<<24)+(m(r)<<16)+(m(g)<<8)+m(b)).toString(16).slice(1)}
function rRedraw(){if(G.rooms)G.rooms.innerHTML=drawRooms(1/scale())}
/* ---- pointer: move, resize, drag a door along its walls ---- */
function rDown(e){if(!BLD||e.button>0)return;var t=e.target,hd=t.closest('.rh'),dr=t.closest('.rdoor'),g=hd||dr||t.closest('.room');if(!g)return;var r=rBy(g.dataset.r);if(!r)return;
 e.stopPropagation();e.preventDefault();rd={id:r.id,mode:hd?'size':dr?'door':'move',h:hd&&hd.dataset.h,di:dr?+dr.dataset.d:null,p0:toFt(e),b0:{x:r.x,y:r.y,w:r.w,d:r.d},sx:e.clientX,sy:e.clientY,moved:false,before:snapP(),mem:memberOf(),
  doors0:JSON.parse(JSON.stringify(r.doors||[])),its:P.items.filter(function(it){var b=ibox(it);return within(b,r)}).map(function(it){return [it,it.x,it.y]}),zs:ZN().filter(function(z){return within(z,r)}).map(function(z){return [z,z.x,z.y,JSON.parse(JSON.stringify(z.adj||{}))]})};
 window.addEventListener('pointermove',rMove);window.addEventListener('pointerup',rUp);window.addEventListener('pointercancel',rUp)}
function rMove(e){if(!rd)return;if(!rd.moved&&Math.hypot(e.clientX-rd.sx,e.clientY-rd.sy)<4)return;rd.moved=true;var r=rBy(rd.id),p=toFt(e),dx=p.x-rd.p0.x,dy=p.y-rd.p0.y,b0=rd.b0,W=P.room.w,D=P.room.d,nb,others=RM().filter(function(q){return q!==r});
 if(rd.mode==='door'){var d=r.doors[rd.di],best=null;['n','e','s','w'].forEach(function(sd){var len=sideLen(r,sd);if(len<(d.len||3))return;var along,dist;
   if(sd==='n'||sd==='s'){along=p.x-r.x;dist=Math.abs(p.y-(sd==='n'?r.y:r.y+r.d))}else{along=p.y-r.y;dist=Math.abs(p.x-(sd==='w'?r.x:r.x+r.w))}
   if(!best||dist<best.dist)best={s:sd,dist:dist,t:Math.round(Math.max(0,Math.min(len-(d.len||3),along-(d.len||3)/2))*2)/2}});
  if(best){d.s=best.s;d.t=best.t}rRedraw();return}
 if(rd.mode==='move')nb={x:Math.round(Math.max(0,Math.min(W-b0.w,b0.x+dx))),y:Math.round(Math.max(0,Math.min(D-b0.d,b0.y+dy))),w:b0.w,d:b0.d};
 else{var x1=b0.x,y1=b0.y,x2=b0.x+b0.w,y2=b0.y+b0.d,hh=rd.h;
  if(/w/.test(hh))x1=Math.round(Math.max(0,Math.min(x2-4,b0.x+dx)));if(/e/.test(hh))x2=Math.round(Math.min(W,Math.max(x1+4,x2+dx)));
  if(/n/.test(hh))y1=Math.round(Math.max(0,Math.min(y2-4,b0.y+dy)));if(/s/.test(hh))y2=Math.round(Math.min(D,Math.max(y1+4,y2+dy)));nb={x:x1,y:y1,w:x2-x1,d:y2-y1}}
 // blocked by a neighbour: slide along it, getting as close as the drag asks for on each axis
 var clear=function(b){return !others.some(function(q){return hit(b,q)})};
 if(!clear(nb)){var cur={x:r.x,y:r.y,w:r.w,d:r.d},walk=function(from,to,key){var b=JSON.parse(JSON.stringify(from)),st=to[key]>b[key]?1:-1;
   while(Math.abs(to[key]-b[key])>1e-6){var n=JSON.parse(JSON.stringify(b));n[key]+=st;if(key==='x'&&rd.mode==='size'&&/w/.test(rd.h))n.w-=st;if(key==='y'&&rd.mode==='size'&&/n/.test(rd.h))n.d-=st;
    if(!clear(n)||n.w<4||n.d<4)break;b=n}return b};
  if(rd.mode==='move'){var a1=walk(walk(cur,nb,'x'),nb,'y'),a2=walk(walk(cur,nb,'y'),nb,'x');nb=(Math.abs(a1.x-cur.x)+Math.abs(a1.y-cur.y)>=Math.abs(a2.x-cur.x)+Math.abs(a2.y-cur.y))?a1:a2}
  else{var hh=rd.h,b=cur;if(/w/.test(hh))b=walk(b,{x:nb.x},'x');if(/e/.test(hh))b=walk(b,{w:nb.w},'w');if(/n/.test(hh))b=walk(b,{y:nb.y},'y');if(/s/.test(hh))b=walk(b,{d:nb.d},'d');nb=b}
  if(nb.x===r.x&&nb.y===r.y&&nb.w===r.w&&nb.d===r.d)return}
 var mx=nb.x-b0.x,my=nb.y-b0.y;r.x=nb.x;r.y=nb.y;r.w=nb.w;r.d=nb.d;
 if(rd.mode==='move'){rd.its.forEach(function(q){q[0].x=q[1]+mx;q[0].y=q[2]+my});rd.zs.forEach(function(q){q[0].x=q[1]+mx;q[0].y=q[2]+my;var a={};Object.keys(q[3]).forEach(function(k2){a[k2]=[q[3][k2][0]+mx,q[3][k2][1]+my]});q[0].adj=a})}
 else(r.doors||[]).forEach(function(d,i){var d0=rd.doors0[i],len=sideLen(r,d.s);d.t=Math.max(0,Math.min(len-(d.len||3),d0.t+((d.s==='n'||d.s==='s')?(b0.x-r.x):(b0.y-r.y))))});
 render()}
function rUp(){window.removeEventListener('pointermove',rMove);window.removeEventListener('pointerup',rUp);window.removeEventListener('pointercancel',rUp);var d=rd;rd=null;if(!d)return;
 selR=d.id;selD=d.mode==='door'?d.di:null;if(d.moved)bCommit(d.before,d.mem);else render()}
/* ---- Build panels ---- */
function buildLib(){var t=function(id,ic,n,sub){return '<div class="btool" data-t="'+id+'" role="button" tabindex="0"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ic+'</svg><div><b>'+n+'</b><span>'+sub+'</span></div></div>'};
 return '<p class="lab" style="margin:2px 0 8px">Add</p>'+t('room','<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 8v8M8 12h8"/>','Room',(TOUCH?'Hold and drag':'Drag')+' it onto the plan, then size it. It comes with a door.')+
  t('door','<path d="M4 21h16M6 21V3h10v18"/><circle cx="13" cy="12" r="1"/>','Door','Drop it on a room\'s wall. Drag it along the wall to move it.')+
  '<p class="muted" style="margin-top:14px">Objects are locked while you build. Switch to Design to move them.</p>'}
function buildLibWire(){document.querySelectorAll('#lib .btool').forEach(function(c){var st=null;
 c.onpointerdown=function(e){if(e.button>0)return;st={sx:e.clientX,sy:e.clientY,on:false};c.setPointerCapture&&c.setPointerCapture(e.pointerId)};
 c.onpointermove=function(e){if(!st)return;if(!st.on){if(Math.hypot(e.clientX-st.sx,e.clientY-st.sy)<6)return;st.on=true;document.body.classList.add('ldragging');var ch=document.createElement('div');ch.className='ldchip';ch.innerHTML='<div class="lart">'+c.querySelector('svg').outerHTML+'</div><span>'+c.querySelector('b').textContent+'</span>';document.body.appendChild(ch);st.chip=ch}
  st.chip.style.transform='translate('+(e.clientX+14)+'px,'+(e.clientY+14)+'px)';var R=sv.getBoundingClientRect(),over=e.clientX>R.left&&e.clientX<R.right&&e.clientY>R.top&&e.clientY<R.bottom,k=1/scale();st.chip.classList.toggle('over',over);
  if(!over){G.ghost.innerHTML='';st.b=null;return}var p=toFt(e);
  if(c.dataset.t==='room'){var b=rFit(p.x,p.y);st.b=b;G.ghost.innerHTML=b?'<rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.d+'" fill="rgba(47,125,225,.10)" stroke="#2f7de1" stroke-width="'+(4*k)+'" stroke-dasharray="'+(8*k)+' '+(5*k)+'" pointer-events="none"/>':''}
  else{var dd=doorSpot(p);st.b=dd;if(dd){var g=dGeo(rBy(dd.r),dd.d);G.ghost.innerHTML='<line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="#2f7de1" stroke-width="'+(8*k)+'" pointer-events="none"/><line x1="'+g.h.x+'" y1="'+g.h.y+'" x2="'+g.tip.x+'" y2="'+g.tip.y+'" stroke="#2f7de1" stroke-width="'+(2.4*k)+'" pointer-events="none"/>'}else G.ghost.innerHTML=''}};
 c.onpointerup=c.onpointercancel=function(e){var s=st;st=null;if(!s)return;G.ghost.innerHTML='';document.body.classList.remove('ldragging');if(s.chip)s.chip.remove();if(!s.on||e.type!=='pointerup'||!s.b)return;
  if(c.dataset.t==='room')rAdd(s.b.x+s.b.w/2,s.b.y+s.b.d/2);else{var before=snapP(),mem=memberOf(),r=rBy(s.b.r);r.doors.push(s.b.d);selR=r.id;selD=r.doors.length-1;bCommit(before,mem)}}})}
function doorSpot(p){var best=null;RM().forEach(function(r){['n','e','s','w'].forEach(function(sd){var len=sideLen(r,sd);if(len<3)return;var along,dist;
  if(sd==='n'||sd==='s'){along=p.x-r.x;dist=Math.abs(p.y-(sd==='n'?r.y:r.y+r.d));if(along<-1||along>len+1)return}else{along=p.y-r.y;dist=Math.abs(p.x-(sd==='w'?r.x:r.x+r.w));if(along<-1||along>len+1)return}
  if(dist>2.5||(best&&dist>=best.dist))return;var t=Math.round(Math.max(0,Math.min(len-3,along-1.5))*2)/2;
  if((r.doors||[]).some(function(d){return d.s===sd&&t<d.t+(d.len||3)&&d.t<t+3}))return;best={dist:dist,r:r.id,d:{s:sd,t:t,len:3,sw:1,hg:0}}})});return best}
function hOpts(v,max){var o='';for(var x=7;x<=max;x+=.5)o+='<option value="'+x+'"'+(Math.abs(x-v)<1e-6?' selected':'')+'>'+fmt(x)+'</option>';return o}
function buildSide(){var W=P.room.w,D=P.room.d,H=P.room.h||10,bc='<div class="card"><span class="lab">Building</span>'+
  '<div class="bgrid"><label class="fl">Width<span class="sdim"><select id="r-w" aria-label="Width in feet">'+dimOpts(W)+'</select><span class="mu">ft</span></span></label><label class="fl">Depth<span class="sdim"><select id="r-d" aria-label="Depth in feet">'+dimOpts(D)+'</select><span class="mu">ft</span></span></label></div>'+
  '<label class="fl">Building height<span class="sdim"><select id="r-h" aria-label="Clear building height in feet">'+ceilOpts()+'</select><span class="mu">ft</span></span></label>'+
  '<label class="sw" style="margin-top:10px" title="'+(P.dyn?'The building grows to fit new objects. Rooms stay where they are.':'The building stays this size.')+'"><input type="checkbox" id="r-dyn"'+(P.dyn?' checked':'')+'> Grow to fit what\'s inside</label>'+
  '<div class="srows" style="margin-top:10px"><div class="srw"><span>Floor area</span><b>'+Math.round(W*D).toLocaleString()+' sq ft</b></div><div class="srw"><span>Rooms</span><b>'+RM().length+'</b></div></div></div>';
 var r=rBy(selR),h=r?'':bc;
 if(r&&selD!=null&&r.doors[selD]){var d=r.doors[selD];h+='<div class="card sel"><span class="lab">Door · '+esc(r.n)+'</span>'+
  '<label class="fl">Width<select id="d-len">'+[2.5,3,3.5,4,5,6,8].map(function(v){return '<option value="'+v+'"'+((d.len||3)===v?' selected':'')+'>'+fmt(v)+' ft'+(v>=5?' (double)':'')+'</option>'}).join('')+'</select></label>'+
  '<div class="fl">Swings<div class="seg2 dseg"><label><input type="radio" name="dsw" value="1"'+(d.sw!==-1?' checked':'')+'><span>Into the room</span></label><label><input type="radio" name="dsw" value="-1"'+(d.sw===-1?' checked':'')+'><span>Out</span></label></div></div>'+
  '<button class="sb" id="d-flip" style="width:100%;margin-top:8px">Hinge on the other side</button>'+
  '<div class="sbtns"><button class="sb red" id="d-del">Delete door</button></div><p class="muted">Drag the door along the walls to move it.</p></div>'}
 else if(r){var its=P.items.filter(function(it){return within(ibox(it),r)}).length,col=rCol(r),rh=r.h||H,SN={n:'Top',s:'Bottom',w:'Left',e:'Right'},
   sc=Math.min(46/r.w,60/r.d),ic=function(bg,p){return '<span class="rci" style="background:'+bg+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg></span>'},
   drs=[];(r.doors||[]).forEach(function(d,i){drs.push('<button class="rdr" data-i="'+i+'"><b>'+SN[d.s]+' wall</b><span>'+fmt(d.len||3)+' ft · swings '+(d.sw===-1?'out':'in')+'</span></button>')});
  RM().forEach(function(q){if(q===r)return;(q.doors||[]).forEach(function(d){var g=dGeo(q,d),on=['n','e','s','w'].filter(function(sd){return sideGaps(r,sd).some(function(){return true})&&(function(){var hor=sd==='n'||sd==='s',line=sd==='n'?r.y:sd==='s'?r.y+r.d:sd==='w'?r.x:r.x+r.w;return (d.s==='n'||d.s==='s')===hor&&Math.abs((hor?g.a.y:g.a.x)-line)<1e-6&&(hor?Math.max(g.a.x,g.b.x)>r.x&&Math.min(g.a.x,g.b.x)<r.x+r.w:Math.max(g.a.y,g.b.y)>r.y&&Math.min(g.a.y,g.b.y)<r.y+r.d)})()})[0];
   if(on)drs.push('<div class="rdr sh"><b>'+SN[on]+' wall</b><span>'+fmt(d.len||3)+' ft · '+esc(q.n)+'\'s door</span></div>')})});
  h+='<div class="card sel rcard2"><div class="rnm"><i style="background:'+col+'"></i><input id="rm-n" value="'+esc(r.n||'')+'" maxlength="40" aria-label="Room name"></div>'+
  '<section class="rcd"><h4>'+ic('#378ADD','<path d="M3 7h18M3 7v4M21 7v4M7 7v2M11 7v3M15 7v2"/>')+'Size<span>'+Math.round(r.w*r.d).toLocaleString()+' sq ft</span></h4>'+
   '<div class="rsz"><svg width="54" height="66" viewBox="-4 -3 54 66" aria-hidden="true"><rect x="'+(23-r.w*sc/2)+'" y="'+(30-r.d*sc/2)+'" width="'+r.w*sc+'" height="'+r.d*sc+'" rx="2" fill="'+col+'" fill-opacity=".22" stroke="'+shadeHex(col,-.35)+'" stroke-width="2"/></svg><div><b>'+fmt(r.w)+' × '+fmt(r.d)+' ft</b><button class="sb" id="rm-rs"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Resize</button></div></div></section>'+
  '<section class="rcd"><h4>'+ic('#1D9E75','<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>')+'Ceiling height</h4>'+
   rhGauge(rh,H,col)+
   '<p class="muted">'+(rh<H-.01?fmt(H-rh)+' ft of space above the ceiling':'Full building height')+'</p></section>'+
  (doorCount(r)?'':'<div class="warn" style="margin-top:9px">No door yet. Drag one from the left onto a wall.</div>')+
  '<section class="rcd"><h4>'+ic('#888780','<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>')+'Notes</h4><textarea id="rm-no" rows="2" placeholder="Insulate the shop wall" aria-label="Notes">'+esc(r.no||'')+'</textarea></section>'+
  (its?'<p class="muted" style="margin:8px 2px 0">'+its+' object'+(its>1?'s':'')+' inside</p>':'')+
  '<button class="lnk red rdel" id="rm-del">Delete room</button></div>'}
 else h+='<div class="card"><span class="lab">Rooms</span>'+(RM().length?RM().map(function(q){return '<button class="rli" data-r="'+q.id+'"><i style="background:'+rCol(q)+'"></i><span>'+esc(q.n)+'</span><small>'+fmt(q.w)+' × '+fmt(q.d)+' · '+fmt(q.h||H)+' ft</small></button>'}).join(''):'<p class="muted">Drag a Room onto the plan to wall off an office, bathroom or storage room. Everything else stays open floor.</p>')+'</div>';
 var bw=badWall();if(bw.length)h+='<div class="card"><div class="warn">'+bw.length+' object'+(bw.length>1?'s cross':' crosses')+' a wall and couldn\'t be moved clear. They\'re marked red. Move them in Design.</div></div>';
 return h}
function buildSideWire(){['#r-w','#r-d'].forEach(function(q){var e=$(q);if(e)e.onchange=function(){this.blur();var w=parseFloat($('#r-w').value),d=parseFloat($('#r-d').value);if(w===P.room.w&&d===P.room.d)return;setSize(w,d)}});
 var hi2=$('#r-h');if(hi2)hi2.onchange=function(){var v=parseFloat(hi2.value)||null;if(v===(P.room.h||null))return;push();P.room.h=v;RM().forEach(function(r){if(v&&r.h>v)r.h=v});persist();render()};
 var dy=$('#r-dyn');if(dy)dy.onchange=function(){push();P.dyn=this.checked;persist();render()};
 document.querySelectorAll('#side .rli').forEach(function(b){b.onclick=function(){selR=b.dataset.r;selD=null;render()}});
 var r=rBy(selR);if(!r)return;var upd=function(fn){var before=snapP(),mem=memberOf();fn();bCommit(before,mem)};
 var n=$('#rm-n');if(n)n.onchange=function(){var v=n.value.trim()||r.n;push();r.n=v;persist();render()};
 var setH=function(v){var H=P.room.h||10;v=Math.max(7,Math.min(H,Math.round(v*2)/2));if(v===(r.h||H))return;push();r.h=v;persist();render()};
 rhWire(r,setH);
 document.querySelectorAll('#side .rdr[data-i]').forEach(function(b){b.onclick=function(){selD=+b.dataset.i;render()}});
 var rsb=$('#rm-rs');if(rsb)rsb.onclick=openResize;
 var no=$('#rm-no');if(no)no.onchange=function(){push();r.no=no.value;persist()};
 var del=$('#rm-del');if(del)del.onclick=function(){upd(function(){P.rooms=RM().filter(function(q){return q!==r});selR=null;selD=null})};
 if(selD!=null&&r.doors[selD]){var d=r.doors[selD];
  $('#d-len').onchange=function(){var v=parseFloat(this.value);upd(function(){d.len=Math.min(v,sideLen(r,d.s));d.t=Math.max(0,Math.min(sideLen(r,d.s)-d.len,d.t))})};
  document.querySelectorAll('input[name=dsw]').forEach(function(x){x.onchange=function(){var v=+x.value;upd(function(){d.sw=v})}});
  $('#d-flip').onclick=function(){upd(function(){d.hg=d.hg?0:1})};
  $('#d-del').onclick=function(){upd(function(){r.doors.splice(selD,1);selD=null})}}}
function setBuild(on){if(on&&EX.on)setExplore(false);if(!on&&EX.on)return;BLD=on;document.body.classList.toggle('building',on);selR=null;selD=null;if(on){sel=null;selO=null;selZ=null;selF=null;libV=null}renderLib();render()}
/* ---- per-room summary ---- */
var openRm={};
function roomItems(r){return P.items.filter(function(it){var b=ibox(it),id=rid(b);return r?id===r.id:id==='o'||id===null})}
function roomsSummary(){var H=P.room.h||10,W=P.room.w,D=P.room.d,pw=power(P.items),list=[{r:null,n:'Open floor',h:H,col:'#888780'}].concat(RM().map(function(r){return {r:r,n:r.n,h:r.h||H,col:rCol(r)}}));
 var area=W*D-RM().reduce(function(a,r){return a+r.w*r.d},0);
 var h='<div class="card"><span class="lab">Building</span><div class="btot"><div><span>Floor area</span><b>'+Math.round(W*D).toLocaleString()+' sq ft</b></div><div><span>Rooms</span><b>'+RM().length+'</b></div><div><span>Connected load</span><b>'+fmtW(pw.w)+'</b></div><div><span>Height</span><b>'+fmt(H)+' ft</b></div></div>'+unpRow()+'</div>';
 list.forEach(function(q){var its=roomItems(q.r),key=q.r?q.r.id:'o',low=its.filter(function(it){var c=defOf(it),n=c&&needs(c);return n&&n.ceil>q.h+1e-6}),bw=badWall().filter(function(it){return its.indexOf(it)>=0}),
   warn=[];if(q.r&&!doorCount(q.r))warn.push('No door');if(low.length)warn.push(low.length+' too tall for '+fmt(q.h)+' ft');if(bw.length)warn.push(bw.length+' crossing a wall');
  h+='<details class="card rcard" data-k="'+key+'"'+(openRm[key]?' open':'')+'><summary><i style="background:'+q.col+'"></i><b>'+esc(q.n)+'</b><small>'+fmt(q.h)+' ft · '+its.length+' object'+(its.length===1?'':'s')+'</small></summary>'+
   (warn.length?'<div class="warn">'+warn.join(' · ')+'</div>':'')+
   '<div class="req">'+reqHtml(its,q.h,true)+'</div>'+(q.r&&q.r.no?'<p class="muted"><b>Notes:</b> '+esc(q.r.no)+'</p>':'')+'</details>'});
 return h}
/* ---- Resize room popup: arrows move one wall a foot at a time; width × depth or an area fits it smartly ---- */
var RS=null;
function rsFits(b,skip){var W=P.room.w,D=P.room.d;if(b.w<4||b.d<4||b.x<0||b.y<0||b.x+b.w>W+1e-6||b.y+b.d>D+1e-6)return false;return !RM().some(function(q){return q.id!==skip&&hit(b,q)})}
function rsFree(s){var b=RS.b,o=RM().filter(function(q){return q.id!==RS.id}),W=P.room.w,D=P.room.d,lim,who='outer wall';
 if(s==='n'){lim=b.y;o.forEach(function(q){if(q.x<b.x+b.w&&q.x+q.w>b.x&&q.y+q.d<=b.y+1e-6&&b.y-(q.y+q.d)<lim){lim=b.y-(q.y+q.d);who=q.n}})}
 else if(s==='s'){lim=D-(b.y+b.d);o.forEach(function(q){if(q.x<b.x+b.w&&q.x+q.w>b.x&&q.y>=b.y+b.d-1e-6&&q.y-(b.y+b.d)<lim){lim=q.y-(b.y+b.d);who=q.n}})}
 else if(s==='w'){lim=b.x;o.forEach(function(q){if(q.y<b.y+b.d&&q.y+q.d>b.y&&q.x+q.w<=b.x+1e-6&&b.x-(q.x+q.w)<lim){lim=b.x-(q.x+q.w);who=q.n}})}
 else{lim=W-(b.x+b.w);o.forEach(function(q){if(q.y<b.y+b.d&&q.y+q.d>b.y&&q.x>=b.x+b.w-1e-6&&q.x-(b.x+b.w)<lim){lim=q.x-(b.x+b.w);who=q.n}})}
 return {n:Math.round(lim*2)/2,who:who}}
// nearest spot (fewest feet moved) where a w × d room fits
function rsPlace(w,d){var b=RS.b,W=P.room.w,D=P.room.d,best=null;for(var y=0;y<=D-d+1e-6;y++)for(var x=0;x<=W-w+1e-6;x++){var c={x:x,y:y,w:w,d:d},m=Math.abs(x-b.x)+Math.abs(y-b.y);if((!best||m<best.m)&&rsFits(c,RS.id))best={x:x,y:y,m:m}}return best}
// biggest room that still covers where this one is now (what "max" means)
function rsMax(){var b=RS.o,W=P.room.w,D=P.room.d,o=RM().filter(function(q){return q.id!==RS.id}),best={a:0};
 for(var y1=0;y1<=b.y;y1++)for(var y2=b.y+b.d;y2<=D;y2++){if(o.some(function(q){return hit({x:b.x,y:y1,w:b.w,d:y2-y1},q)}))continue;var l=0,r=W;
  o.forEach(function(q){if(q.y<y2&&q.y+q.d>y1){if(q.x+q.w<=b.x+1e-6)l=Math.max(l,q.x+q.w);if(q.x>=b.x+b.w-1e-6)r=Math.min(r,q.x)}});var a=(r-l)*(y2-y1);if(a>best.a)best={a:a,x:l,y:y1,w:r-l,d:y2-y1}}return best}
function rsNote(t){var n=$('#rs-note');if(!n)return;n.innerHTML=t||'';n.classList.toggle('on',!!t)}
function rsSize(w,d){w=Math.max(4,Math.round(w));d=Math.max(4,Math.round(d));var p=rsPlace(w,d);
 if(p){RS.b={x:p.x,y:p.y,w:w,d:d};rsNote(p.m?'Moved '+fmt(p.m)+' ft to make it fit.':'');return}
 // nothing that size fits: keep the corner and take what's there
 var b=RS.b,bw=0,bd=0;for(var dd=d;dd>=4&&!bw;dd--)for(var ww=w;ww>=4;ww--)if(rsFits({x:b.x,y:b.y,w:ww,d:dd},RS.id)){bw=ww;bd=dd;break}
 if(bw){RS.b={x:b.x,y:b.y,w:bw,d:bd};rsNote('<b>Not enough room.</b> Set to '+fmt(bw)+' × '+fmt(bd)+' ft.')}else rsNote('<b>Not enough room.</b> Size not changed.')}
function rsArea(A){var b=RS.b,r=b.w/b.d,W=P.room.w,D=P.room.d,c=[];if(!(A>=16))return;
 for(var ww=4;ww<=W;ww++){var dd=Math.ceil(A/ww);if(dd<4||dd>D)continue;c.push({w:ww,d:dd,s:Math.abs(Math.log((ww/dd)/r))+(ww*dd-A)/A*2})}c.sort(function(p,q){return p.s-q.s});
 for(var i=0;i<c.length&&i<60;i++){var p=rsPlace(c[i].w,c[i].d);if(p){RS.b={x:p.x,y:p.y,w:c[i].w,d:c[i].d};rsNote(p.m?'Moved '+fmt(p.m)+' ft to make it fit.':'');return}}
 var m=rsMax();if(m.a>=16){RS.b={x:m.x,y:m.y,w:m.w,d:m.d};rsNote('<b>Not enough room.</b> Set to '+fmt(m.w)+' × '+fmt(m.d)+' ft ('+Math.round(m.a).toLocaleString()+' sq ft).')}else rsNote('<b>Not enough room.</b> Size not changed.')}
function rsStep(s,d){var b=RS.b,f=rsFree(s);if(d>0&&f.n<1){rsNote('<b>Not enough room.</b>');return false}if(d<0&&((s==='n'||s==='s')?b.d<=4:b.w<=4))return false;rsNote('');
 if(s==='n'){b.y-=d;b.d+=d}else if(s==='s'){b.d+=d}else if(s==='w'){b.x-=d;b.w+=d}else b.w+=d;rsDraw();return true}
function rsArrow(s,out){var rot={n:0,e:90,s:180,w:270}[s]+(out?0:180),sz=out?44:38,col=out?'#2f7de1':'#7F77DD';
 return '<div class="rsa '+(out?'out':'in')+' '+s+'" data-s="'+s+'" data-d="'+(out?1:-1)+'" role="button" tabindex="0" aria-label="'+(out?'Push the ':'Pull the ')+({n:'top',s:'bottom',w:'left',e:'right'})[s]+' wall '+(out?'out':'in')+'"><svg width="'+sz+'" height="'+sz+'" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="'+col+'"/><g transform="rotate('+rot+' 20 20)" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M20 29V11M12 18l8-8 8 8"/></g></svg></div>'}
function rsDraw(){var b=RS.b,dl=$('#d-rs');if(!dl)return;$('#rs-w').value=fmt(b.w);$('#rs-d').value=fmt(b.d);$('#rs-a').value=Math.round(b.w*b.d);$('#rs-dim').textContent=fmt(b.w)+' × '+fmt(b.d)+' ft';
 var mx=rsMax();$('#rs-max').textContent='max '+Math.round(mx.a).toLocaleString();
 ['n','e','s','w'].forEach(function(s){var f=rsFree(s);dl.querySelector('.rsf.'+s).textContent=f.n>=1?fmt(f.n)+' ft free':f.who});
 dl.querySelectorAll('.rsa').forEach(function(a){var s=a.dataset.s,o=+a.dataset.d>0;a.classList.toggle('blk',o?rsFree(s).n<1:((s==='n'||s==='s')?b.d<=4:b.w<=4))});
 var W=P.room.w,D=P.room.d,sc=Math.min(260/W,190/D),h='<rect x="0" y="0" width="'+W*sc+'" height="'+D*sc+'" fill="none" stroke="#3a3936" stroke-width="3"/>';
 RM().forEach(function(q){if(q.id===RS.id)return;h+='<rect x="'+q.x*sc+'" y="'+q.y*sc+'" width="'+q.w*sc+'" height="'+q.d*sc+'" fill="'+rCol(q)+'" fill-opacity=".18" stroke="'+shadeHex(rCol(q),-.3)+'" stroke-width="1.5"/><text x="'+(q.x+q.w/2)*sc+'" y="'+((q.y+q.d/2)*sc+4)+'" text-anchor="middle" font-size="10" fill="'+shadeHex(rCol(q),-.4)+'">'+esc(q.n)+'</text>'});
 var o=RS.o,r=rBy(RS.id);h+='<rect x="'+o.x*sc+'" y="'+o.y*sc+'" width="'+o.w*sc+'" height="'+o.d*sc+'" fill="none" stroke="#8a867c" stroke-width="1.2" stroke-dasharray="4 3"/>'+
  '<rect x="'+b.x*sc+'" y="'+b.y*sc+'" width="'+b.w*sc+'" height="'+b.d*sc+'" fill="'+rCol(r)+'" fill-opacity=".25" stroke="#2f7de1" stroke-width="2"/><text x="'+(b.x+b.w/2)*sc+'" y="'+((b.y+b.d/2)*sc+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+shadeHex(rCol(r),-.4)+'">'+esc(r.n)+'</text>';
 var pv=$('#rs-plan');pv.setAttribute('viewBox','-4 -4 '+(W*sc+8)+' '+(D*sc+8));pv.innerHTML=h}
function openResize(){var r=rBy(selR);if(!r)return;var dl=$('#d-rs');if(!dl){dl=document.createElement('dialog');dl.id='d-rs';dl.className='rsd';document.body.appendChild(dl)}
 RS={id:r.id,o:{x:r.x,y:r.y,w:r.w,d:r.d},b:{x:r.x,y:r.y,w:r.w,d:r.d}};
 dl.innerHTML='<div class="rsw"><div class="rsh"><b>Resize '+esc(r.n)+'</b><button class="x" id="rs-x" aria-label="Close">×</button></div>'+
  '<div class="rsg"><div class="rsp"><div class="rsbox"><b id="rs-dim"></b></div>'+['n','e','s','w'].map(function(s){return rsArrow(s,true)+rsArrow(s,false)+'<span class="rsf '+s+'"></span>'}).join('')+'</div>'+
  '<svg id="rs-plan" class="rsplan" role="img" aria-label="Plan preview"></svg></div>'+
  '<div class="rsrow"><label>Width<span class="sdim"><input id="rs-w" type="number" min="4" step="1" inputmode="numeric"><i>ft</i></span></label><span class="rsx">×</span>'+
  '<label>Depth<span class="sdim"><input id="rs-d" type="number" min="4" step="1" inputmode="numeric"><i>ft</i></span></label><span class="rsx">or</span>'+
  '<label class="rsa2"><span class="lt">Area <em id="rs-max"></em></span><span class="sdim"><input id="rs-a" type="number" min="16" step="10" inputmode="numeric"><i>sq ft</i></span></label><button class="sb" id="rs-fit">Fit</button></div>'+
  '<div class="rsnote" id="rs-note" role="status"></div>'+
  '<div class="rsbtns"><button class="sb" id="rs-cancel">Cancel</button><button class="sb pri" id="rs-ok">Apply</button></div></div>';
 var t=null,stop=function(){clearInterval(t);t=null};
 dl.querySelectorAll('.rsa').forEach(function(a){a.addEventListener('pointerdown',function(e){e.preventDefault();var s=a.dataset.s,d=+a.dataset.d;rsStep(s,d);stop();var n=0;t=setInterval(function(){if(++n>3&&!rsStep(s,d))stop()},110)});
  ['pointerup','pointerleave','pointercancel'].forEach(function(ev){a.addEventListener(ev,stop)});a.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();rsStep(a.dataset.s,+a.dataset.d)}}});
 var wd=function(){rsSize(parseFloat($('#rs-w').value)||RS.b.w,parseFloat($('#rs-d').value)||RS.b.d);rsDraw()};
 $('#rs-w').onchange=wd;$('#rs-d').onchange=wd;
 var fit=function(){rsArea(parseFloat($('#rs-a').value));rsDraw()};$('#rs-fit').onclick=fit;$('#rs-a').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();fit()}};
 var close=function(){stop();dl.close();RS=null};$('#rs-x').onclick=close;$('#rs-cancel').onclick=close;
 $('#rs-ok').onclick=function(){var b=RS.b,o=RS.o;if(b.x===o.x&&b.y===o.y&&b.w===o.w&&b.d===o.d){close();return}var before=snapP(),mem=memberOf();
  (r.doors||[]).forEach(function(d){if(d.s==='n'||d.s==='s')d.t+=o.x-b.x;else d.t+=o.y-b.y});r.x=b.x;r.y=b.y;r.w=b.w;r.d=b.d;
  (r.doors||[]).forEach(function(d){var L=d.len||3,len=sideLen(r,d.s);d.t=Math.max(0,Math.min(len-L,d.t))});close();bCommit(before,mem)};
 dl.addEventListener('cancel',function(){stop();RS=null},{once:true});
 dl.showModal();rsDraw()}

/* ---- ceiling height: a side view you drag, with a box for an exact number ---- */
var RHV={w:260,h:120,fl:108,top:14};
function rhY(v,H){return RHV.fl-(v/H)*(RHV.fl-RHV.top)}
function rhGauge(v,H,col){var y=rhY(v,H),dk=shadeHex(col,-.35),py=rhY(6,H);
 return '<div class="rhg"><svg id="rh-svg" viewBox="0 0 '+RHV.w+' '+RHV.h+'" role="slider" aria-label="Ceiling height" aria-valuemin="7" aria-valuemax="'+H+'" aria-valuenow="'+v+'" tabindex="0">'+
  '<line x1="6" y1="'+RHV.top+'" x2="'+(RHV.w-6)+'" y2="'+RHV.top+'" stroke="#8a867c" stroke-dasharray="4 3"/><text x="'+(RHV.w-8)+'" y="'+(RHV.top-3)+'" text-anchor="end" font-size="10" fill="#8a867c">building '+fmt(H)+' ft</text>'+
  '<rect id="rh-fill" x="56" y="'+y+'" width="150" height="'+(RHV.fl-y)+'" fill="'+col+'" fill-opacity=".2"/>'+
  '<line x1="6" y1="'+RHV.fl+'" x2="'+(RHV.w-6)+'" y2="'+RHV.fl+'" stroke="#3a3936" stroke-width="2.5"/>'+
  '<g id="rh-line"><line x1="56" y1="'+y+'" x2="206" y2="'+y+'" stroke="'+dk+'" stroke-width="3.5"/><rect x="40" y="'+(y-16)+'" width="182" height="32" fill="transparent" style="cursor:ns-resize"/>'+
  '<circle cx="131" cy="'+y+'" r="10" fill="#fff" stroke="'+dk+'" stroke-width="2.5" style="cursor:ns-resize"/><path d="M127.5 '+(y-2.5)+'l3.5-3.5 3.5 3.5M127.5 '+(y+2.5)+'l3.5 3.5 3.5-3.5" stroke="'+dk+'" stroke-width="1.7" fill="none" pointer-events="none"/></g>'+
  '<g fill="#8a867c" pointer-events="none"><circle cx="24" cy="'+(py+3)+'" r="3.2"/><rect x="22.6" y="'+(py+6.5)+'" width="2.8" height="'+(RHV.fl-py-7)+'" rx="1.4"/></g><text x="31" y="'+(RHV.fl-3)+'" font-size="9" fill="#a4a097">6 ft</text></svg>'+
  '<label class="rhv" style="top:calc('+(y/RHV.h*100)+'% - 16px)"><select id="rh-in" aria-label="Ceiling height in feet">'+hOpts(v,H)+'</select><i>ft</i></label></div>'}
function rhWire(r,setH){var sv2=$('#rh-svg'),inp=$('#rh-in');if(!sv2)return;var H=P.room.h||10,dragging=false,cur=r.h||H;
 var show=function(v){var y=rhY(v,H),g=$('#rh-line');g.setAttribute('transform','translate(0,'+(y-rhY(r.h||H,H))+')');var f=$('#rh-fill');f.setAttribute('y',y);f.setAttribute('height',RHV.fl-y);inp.value=String(v);inp.parentNode.style.top='calc('+(y/RHV.h*100)+'% - 16px)'};
 var at=function(e){var b=sv2.getBoundingClientRect(),yy=(e.clientY-b.top)/b.height*RHV.h,v=(RHV.fl-yy)/(RHV.fl-RHV.top)*H;return Math.max(7,Math.min(H,Math.round(v*2)/2))};
 sv2.addEventListener('pointerdown',function(e){dragging=true;sv2.setPointerCapture(e.pointerId);cur=at(e);show(cur);e.preventDefault()});
 sv2.addEventListener('pointermove',function(e){if(!dragging)return;cur=at(e);show(cur)});
 sv2.addEventListener('pointerup',function(){if(!dragging)return;dragging=false;setH(cur)});sv2.addEventListener('pointercancel',function(){dragging=false;show(r.h||H)});
 sv2.onkeydown=function(e){if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();setH((r.h||H)+.5)}if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();setH((r.h||H)-.5)}};
 inp.onchange=function(){var v=parseFloat(inp.value);if(!isNaN(v))setH(v)}}
