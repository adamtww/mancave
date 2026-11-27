/* ---------------- openings in the building's outside walls (Build) ----------------
   P.edoors = [{k:'door'|'roll', s:'n'|'e'|'s'|'w', t:<ft along the wall>, len:<width ft>, h:<height ft>, sw:1 in|-1 out, hg:0|1, gl:<glass panel>, op:<opener>}]
   Walk-in doors work like room doors (swing, hinge side, single or double). Roll-up doors keep a clear driveway inside
   and need about 2 ft of headroom above the opening for the coil. */
var selE=null,ed=null;
function ED(){return P.edoors||(P.edoors=[])}
function BLDG(){return {x:0,y:0,w:P.room.w,d:P.room.d}}
var EDEF={door:{len:3,h:6.67},roll:{len:12,h:12}};
function eH(d){return d.h||EDEF[d.k].h}
function eGeo(d){var g=dGeo(BLDG(),d);if(d.k==='roll'){var dep=Math.min(eH(d),d.s==='n'||d.s==='s'?P.room.d:P.room.w),a=g.a,b=g.b,n=g.n;
  g.zone={x:Math.min(a.x,b.x,a.x+n.x*dep),y:Math.min(a.y,b.y,a.y+n.y*dep),w:Math.abs(b.x-a.x)+Math.abs(n.x*dep),d:Math.abs(b.y-a.y)+Math.abs(n.y*dep)}}return g}
// floor that has to stay clear inside each opening
function eBoxes(){var o=[];ED().forEach(function(d){var g=eGeo(d);if(d.k==='roll'){o.push(g.zone);return}
  if(d.sw!==-1)o.push(g.swing);else{var n=g.n,L=g.L;o.push({x:Math.min(g.a.x,g.b.x,g.a.x+n.x*L),y:Math.min(g.a.y,g.b.y,g.a.y+n.y*L),w:Math.abs(g.b.x-g.a.x)+Math.abs(n.x*L),d:Math.abs(g.b.y-g.a.y)+Math.abs(n.y*L)})}});return o}
function eHeadroom(d){var H=P.room.h||10;return d.k!=='roll'||eH(d)+2<=H+1e-6}
function eFits(d,skip){var len=sideLen(BLDG(),d.s);if(d.t<.5-1e-6||d.t+d.len>len-.5+1e-6)return false;
 return !ED().some(function(q,i){return i!==skip&&q.s===d.s&&d.t<q.t+q.len+1-1e-6&&q.t<d.t+d.len+1-1e-6})}
// nearest spot on an outside wall for an opening of this kind
function eSpot(p,k,len,skip){var B=BLDG(),best=null;['n','e','s','w'].forEach(function(sd){var L=sideLen(B,sd);if(L<len+1)return;var along,dist;
  if(sd==='n'||sd==='s'){along=p.x;dist=Math.abs(p.y-(sd==='n'?0:B.d))}else{along=p.y;dist=Math.abs(p.x-(sd==='w'?0:B.w))}
  if(along<-2||along>L+2)return;if(best&&dist>=best.dist)return;var t=Math.round(Math.max(.5,Math.min(L-.5-len,along-len/2))*2)/2,d={k:k,s:sd,t:t,len:len,h:skip!=null?eH(ED()[skip]):EDEF[k].h,sw:-1,hg:0};
  if(skip!=null){var o=ED()[skip];d.sw=o.sw;d.hg=o.hg;d.gl=o.gl;d.op=o.op}else if(k==='roll')d.op=1;
  if(!eFits(d,skip))return;best={dist:dist,d:d}});return best&&best.dist<=(skip!=null?1e9:6)?best.d:null}
// openings on one side of a room that sits against the outside wall
function eGapsOn(r,sd){var B=BLDG(),hor=sd==='n'||sd==='s',out=[];if(!onEdge(r,sd))return out;var o0=hor?r.x:r.y,len=sideLen(r,sd);
 ED().forEach(function(d){if(d.s!==sd)return;var a=d.t-o0,b=a+d.len;if(b<=0||a>=len)return;out.push([Math.max(0,a),Math.min(len,b),d.k==='roll'?eH(d):7])});return out}
function drawExt(k){var a=ED();if(!a.length)return '';var on=BLD,o='';
 a.forEach(function(d,i){var g=eGeo(d),s=on&&selE===i,col=s?'#2f7de1':'#5f5b52',hor=d.s==='n'||d.s==='s',bad=!eHeadroom(d),
   gap='<rect x="'+(Math.min(g.a.x,g.b.x)-(hor?0:4*k))+'" y="'+(Math.min(g.a.y,g.b.y)-(hor?4*k:0))+'" width="'+(hor?d.len:8*k)+'" height="'+(hor?8*k:d.len)+'" fill="#fbfaf7"/>',
   jamb=function(p){return '<line x1="'+(p.x-(hor?0:5*k))+'" y1="'+(p.y-(hor?5*k:0))+'" x2="'+(p.x+(hor?0:5*k))+'" y2="'+(p.y+(hor?5*k:0))+'" stroke="#3a3936" stroke-width="'+(2*k)+'"/>'};
  o+='<g class="edoor" data-e="'+i+'">'+gap+jamb(g.a)+jamb(g.b)+'<line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="'+(s?'rgba(47,125,225,.35)':'transparent')+'" stroke-width="'+(16*k)+'"/>';
  if(d.k==='roll'){var z=g.zone,mx=(g.a.x+g.b.x)/2,my=(g.a.y+g.b.y)/2,lab=fmt(d.len)+' × '+fmt(eH(d))+' roll-up',lw=(lab.length*6.1+14)*k,lx=mx+g.n.x*(z.w>z.d?0:Math.min(eH(d),z.w)/2)*0,ly=my;
   o+='<rect x="'+z.x+'" y="'+z.y+'" width="'+z.w+'" height="'+z.d+'" fill="'+(bad?'rgba(214,48,49,.06)':'rgba(47,111,237,.035)')+'" stroke="'+(bad?'#d63031':s?'#2f7de1':'#b9b4a8')+'" stroke-width="'+k+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'"/>';
   o+='<line x1="'+(g.a.x+g.n.x*.25)+'" y1="'+(g.a.y+g.n.y*.25)+'" x2="'+(g.b.x+g.n.x*.25)+'" y2="'+(g.b.y+g.n.y*.25)+'" stroke="'+col+'" stroke-width="'+(2.2*k)+'"/><line x1="'+(g.a.x+g.n.x*.55)+'" y1="'+(g.a.y+g.n.y*.55)+'" x2="'+(g.b.x+g.n.x*.55)+'" y2="'+(g.b.y+g.n.y*.55)+'" stroke="'+col+'" stroke-width="'+(1.2*k)+'" stroke-dasharray="'+(3*k)+' '+(2*k)+'"/>';
   var tx=mx+g.n.x*(1.2+10*k),ty=my+g.n.y*(1.2+10*k);o+='<g pointer-events="none"><rect x="'+(tx-lw/2)+'" y="'+(ty-9*k)+'" width="'+lw+'" height="'+(18*k)+'" rx="'+(9*k)+'" fill="'+(bad?'#d63031':s?'#2f7de1':'#fff')+'" stroke="'+(bad?'#d63031':s?'#2f7de1':'#b9b4a8')+'" stroke-width="'+k+'"/><text x="'+tx+'" y="'+(ty+4*k)+'" text-anchor="middle" font-size="'+(10.5*k)+'" font-weight="700" fill="'+(bad||s?'#fff':'#5f5b52')+'">'+lab+'</text></g>'}
  else{var arc=function(h0,o0,L,sn){var tip={x:h0.x+sn.x*L,y:h0.y+sn.y*L},sw=((o0.x-h0.x)*(tip.y-h0.y)-(o0.y-h0.y)*(tip.x-h0.x))>0?1:0;
     return '<path d="M'+o0.x+' '+o0.y+' A'+L+' '+L+' 0 0 '+sw+' '+tip.x+' '+tip.y+'" fill="none" stroke="'+(s?'#2f7de1':'#8a867c')+'" stroke-width="'+(1.2*k)+'" stroke-dasharray="'+(4*k)+' '+(3*k)+'"/><line x1="'+h0.x+'" y1="'+h0.y+'" x2="'+tip.x+'" y2="'+tip.y+'" stroke="'+col+'" stroke-width="'+(2.4*k)+'"/>'};
   if(d.len>=5){var m={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2};o+=arc(g.a,m,d.len/2,g.sn)+arc(g.b,m,d.len/2,g.sn)}else o+=arc(g.h,g.o,g.L,g.sn)}
  o+='</g>'});
 return o}
function eRedraw(){if(G.ext)G.ext.innerHTML=drawExt(1/scale())+drawWins(1/scale())}
function eDown(e){if(!BLD||e.button>0)return;var g=e.target.closest('.edoor');if(!g)return;var i=+g.dataset.e,d=ED()[i];if(!d)return;e.stopPropagation();e.preventDefault();
 ed={i:i,sx:e.clientX,sy:e.clientY,moved:false,before:snapP(),mem:memberOf(),d0:JSON.parse(JSON.stringify(d))};
 window.addEventListener('pointermove',eMove);window.addEventListener('pointerup',eUp);window.addEventListener('pointercancel',eUp)}
function eMove(e){if(!ed)return;if(!ed.moved&&Math.hypot(e.clientX-ed.sx,e.clientY-ed.sy)<4)return;ed.moved=true;var d=ED()[ed.i],sp=eSpot(toFt(e),d.k,d.len,ed.i);if(sp){d.s=sp.s;d.t=sp.t;eRedraw()}}
function eUp(){window.removeEventListener('pointermove',eMove);window.removeEventListener('pointerup',eUp);window.removeEventListener('pointercancel',eUp);var s=ed;ed=null;if(!s)return;
 selE=s.i;selW=null;selR=null;selD=null;if(s.moved)bCommit(s.before,s.mem);else render()}
function eAdd(d){var before=snapP(),mem=memberOf();ED().push(d);selE=ED().length-1;selW=null;selR=null;selD=null;bCommit(before,mem)}
// right panel for the selected opening
function eCard(){var d=ED()[selE];if(!d)return '';var H=P.room.h||10,SN={n:'Top',s:'Bottom',w:'Left',e:'Right'},roll=d.k==='roll',hh=eH(d),
  opt=function(v,cur,lab){return '<option value="'+v+'"'+(Math.abs(v-cur)<1e-6?' selected':'')+'>'+(lab||fmt(v)+' ft')+'</option>'},
  ws=roll?[8,9,10,12,14,16,18,20]:[3,6],hs=roll?[8,9,10,12,14,16]:[6.67,8];
 if(ws.indexOf(d.len)<0)ws.push(d.len);if(hs.indexOf(hh)<0)hs.push(hh);
 var h='<div class="card sel"><span class="lab">'+(roll?'Roll-up door':'Exterior door')+' · '+SN[d.s]+' wall</span>'+
  '<div class="bgrid"><label class="fl">Width<select id="e-w">'+ws.sort(function(a,b){return a-b}).map(function(v){return opt(v,d.len,roll?null:(v>=5?'6 ft (double)':'3 ft (single)'))}).join('')+'</select></label>'+
  '<label class="fl">Height<select id="e-h">'+hs.sort(function(a,b){return a-b}).map(function(v){return opt(v,hh,v===6.67?"6' 8\"":null)}).join('')+'</select></label></div>';
 if(roll){h+='<label class="sw" style="margin-top:10px"><input type="checkbox" id="e-op"'+(d.op?' checked':'')+'> Electric opener</label>'+
   (eHeadroom(d)?'<p class="muted" style="margin-top:8px">The coil needs about 2 ft above the opening: '+fmt(hh+2)+' ft of the building\'s '+fmt(H)+' ft. The dashed area inside stays clear for driving in.</p>':
    '<div class="warn" style="margin-top:9px">Not enough headroom. A '+fmt(hh)+' ft door needs about '+fmt(hh+2)+' ft for the coil above it; the building is '+fmt(H)+' ft. Pick a door '+fmt(Math.max(7,H-2))+' ft tall or less, or make the building taller.</div>')}
 else{h+='<div class="fl">Swings<div class="seg2 dseg"><label><input type="radio" name="esw" value="-1"'+(d.sw===-1?' checked':'')+'><span>Out</span></label><label><input type="radio" name="esw" value="1"'+(d.sw!==-1?' checked':'')+'><span>In</span></label></div></div>'+
   (d.len<5?'<button class="sb" id="e-flip" style="width:100%;margin-top:8px">Hinge on the other side</button>':'')+
   '<label class="sw" style="margin-top:10px"><input type="checkbox" id="e-gl"'+(d.gl?' checked':'')+'> Glass panel</label>'+
   '<p class="muted" style="margin-top:8px">Exterior doors usually swing out. Explore starts you at the first one.</p>'}
 return h+'<div class="sbtns">'+dupBtn('e-dup')+'<button class="sb red" id="e-del">Delete</button></div><p class="muted">Drag it along the outside walls to move it.</p></div>'}
function eCardWire(){var d=ED()[selE];if(!d)return;var upd=function(fn){var before=snapP(),mem=memberOf();fn();bCommit(before,mem)},L=function(){return sideLen(BLDG(),d.s)};
 $('#e-w').onchange=function(){var v=parseFloat(this.value),o={k:d.k,s:d.s,t:Math.max(.5,Math.min(L()-.5-v,d.t)),len:v};if(!eFits(o,selE)){toast('Not enough wall there for '+fmt(v)+' ft');render();return}upd(function(){d.len=v;d.t=o.t})};
 $('#e-h').onchange=function(){var v=parseFloat(this.value);upd(function(){d.h=v})};
 var op=$('#e-op');if(op)op.onchange=function(){var v=this.checked;upd(function(){d.op=v?1:0})};
 var gl=$('#e-gl');if(gl)gl.onchange=function(){var v=this.checked;upd(function(){d.gl=v?1:0})};
 document.querySelectorAll('input[name=esw]').forEach(function(x){x.onchange=function(){var v=+x.value;upd(function(){d.sw=v})}});
 var fl=$('#e-flip');if(fl)fl.onclick=function(){upd(function(){d.hg=d.hg?0:1})};
 $('#e-del').onclick=function(){upd(function(){ED().splice(selE,1);selE=null})};$('#e-dup').onclick=dupEdoor}
// Build menu drag: preview on the nearest outside wall
function eGhost(d,k){var g=eGeo(d),o='<line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="#2f7de1" stroke-width="'+(8*k)+'" pointer-events="none"/>';
 if(d.k==='roll'){var z=g.zone;o+='<rect x="'+z.x+'" y="'+z.y+'" width="'+z.w+'" height="'+z.d+'" fill="rgba(47,125,225,.08)" stroke="#2f7de1" stroke-width="'+k+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'" pointer-events="none"/>'}
 else o+='<line x1="'+g.h.x+'" y1="'+g.h.y+'" x2="'+g.tip.x+'" y2="'+g.tip.y+'" stroke="#2f7de1" stroke-width="'+(2.4*k)+'" pointer-events="none"/>';return o}
// Explore: start just inside the first walk-in door, facing in
function eSpawn(){var d=ED().filter(function(q){return q.k==='door'})[0];if(!d)return null;var g=eGeo(d),m={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2},n=g.n,p={x:m.x+n.x*(d.sw!==-1?d.len+1.5:3),y:m.y+n.y*(d.sw!==-1?d.len+1.5:3)};
 return {x:p.x,y:p.y,yaw:Math.atan2(-n.x,-n.y)}}
function trimEdoors(){var B=BLDG();P.edoors=ED().filter(function(d){var L=sideLen(B,d.s);if(d.len>L-1)return false;d.t=Math.max(.5,Math.min(L-.5-d.len,d.t));return true})}
/* ---------------- windows ----------------
   On the building's outside walls: P.ewins = [{s,t,len,h,sill,ty:'fixed'|'slider',gt:'clear'|'tint'|'frost'}].
   On a room's walls: room.wins (same fields, t measured along that room's side). A window in a wall two rooms share shows in both. */
var selW=null,wd=null;
function EW(){return P.ewins||(P.ewins=[])}
function wHost(h){return h==='B'?BLDG():rBy(h)}
function wList(h){if(h==='B')return EW();var r=rBy(h);return r?(r.wins||(r.wins=[])):[]}
function wTop(w){return (w.sill||0)+(w.h||4)}
// window spans along one side of the building: [a,b,y0,y1]
function ewinsOn(sd){return EW().filter(function(w){return w.s===sd}).map(function(w){return [w.t,w.t+w.len,w.sill,wTop(w)]})}
// window spans in one side of a room: its own, a neighbour's in a shared wall, and the building's if the side is on the outside wall
function winsOn(r,sd){var len=sideLen(r,sd),hor=sd==='n'||sd==='s',line=sd==='n'?r.y:sd==='s'?r.y+r.d:sd==='w'?r.x:r.x+r.w,o0=hor?r.x:r.y,out=[];
 RM().forEach(function(q){(q.wins||[]).forEach(function(w){var g=dGeo(q,w),wh2=w.s==='n'||w.s==='s';if(wh2!==hor)return;if(Math.abs((hor?g.a.y:g.a.x)-line)>1e-6)return;
  var a=(hor?Math.min(g.a.x,g.b.x):Math.min(g.a.y,g.b.y))-o0,b=a+w.len;if(b<=0||a>=len)return;out.push([Math.max(0,a),Math.min(len,b),w.sill,wTop(w)])})});
 if(onEdge(r,sd))EW().forEach(function(w){if(w.s!==sd)return;var a=w.t-o0,b=a+w.len;if(b<=0||a>=len)return;out.push([Math.max(0,a),Math.min(len,b),w.sill,wTop(w)])});return out}
// is this stretch of wall free of doors and other windows?
function wFree(host,sd,t,len,skip){var hr=wHost(host),L=sideLen(hr,sd);if(t<.5-1e-6||t+len>L-.5+1e-6)return false;
 var busy=host==='B'?ED().filter(function(d){return d.s===sd}).map(function(d){return [d.t,d.t+d.len]}).concat(EW().filter(function(w,i){return w.s===sd&&!(skip&&skip.h==='B'&&skip.i===i)}).map(function(w){return [w.t,w.t+w.len]}))
  :sideGaps(hr,sd).map(function(g){return [g[0],g[1]]}).concat(winsOn(hr,sd).filter(function(g,i){var own=(hr.wins||[]).filter(function(w){return w.s===sd});return true}).map(function(g){return [g[0],g[1]]}));
 if(skip&&skip.h!=='B'&&skip.h===host){var me=wList(host)[skip.i];if(me&&me.s===sd)busy=busy.filter(function(g){return !(Math.abs(g[0]-me.t)<1e-6&&Math.abs(g[1]-me.t-me.len)<1e-6)})}
 return !busy.some(function(g){return t<g[1]+.5-1e-6&&g[0]<t+len+.5-1e-6})}
function wDefault(host){return host==='B'?{len:3,h:4,sill:3,ty:'slider',gt:'clear'}:{len:6,h:3.5,sill:3.5,ty:'fixed',gt:'clear'}}
// nearest wall for a window: an outside wall, or a room wall that isn't on the outside
function wSpot(p,only,size,skip){var best=null,consider=function(host,r,sd){var L=sideLen(r,sd),hor=sd==='n'||sd==='s',along,dist;if(host!=='B'&&onEdge(r,sd))return;
   if(hor){along=p.x-r.x;dist=Math.abs(p.y-(sd==='n'?r.y:r.y+r.d))}else{along=p.y-r.y;dist=Math.abs(p.x-(sd==='w'?r.x:r.x+r.w))}if(along<-1.5||along>L+1.5)return;
   var sz=size||wDefault(host);if(L<sz.len+1)return;if(best&&dist>=best.dist)return;var t=Math.round(Math.max(.5,Math.min(L-.5-sz.len,along-sz.len/2))*2)/2;
   var H2=host==='B'?(P.room.h||10):Math.min(r.h||P.room.h||10,P.room.h||10);if(sz.sill+sz.h>H2-.4)return;if(!wFree(host,sd,t,sz.len,skip))return;
   best={dist:dist,h:host,w:{s:sd,t:t,len:sz.len,h:sz.h,sill:sz.sill,ty:sz.ty,gt:sz.gt}}};
 if(!only||only==='B')['n','e','s','w'].forEach(function(sd){consider('B',BLDG(),sd)});
 RM().forEach(function(r){if(only&&only!==r.id)return;['n','e','s','w'].forEach(function(sd){consider(r.id,r,sd)})});
 return best&&best.dist<=(skip?1e9:4)?best:null}
function wGeoOf(host,w){return dGeo(wHost(host),w)}
function drawWins(k){var o='',one=function(host,w,i){var g=wGeoOf(host,w),hor=w.s==='n'||w.s==='s',s=BLD&&selW&&selW.h===host&&selW.i===i,th=(host==='B'?8:6)*k,col=s?'#2f7de1':'#3a3936',
   x0=Math.min(g.a.x,g.b.x),y0=Math.min(g.a.y,g.b.y),gl=w.gt==='frost'?'#e9eef2':w.gt==='tint'?'#7f97a8':'#bfe0f2';
  o+='<g class="ewin" data-wh="'+host+'" data-wi="'+i+'"><rect x="'+(x0-(hor?0:th/2))+'" y="'+(y0-(hor?th/2:0))+'" width="'+(hor?w.len:th)+'" height="'+(hor?th:w.len)+'" fill="#fff" stroke="'+col+'" stroke-width="'+(1.3*k)+'"/>'+
   '<line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="'+gl+'" stroke-width="'+(2.6*k)+'"/>'+
   (w.ty==='slider'?'<line x1="'+((g.a.x+g.b.x)/2-(hor?0:th/2))+'" y1="'+((g.a.y+g.b.y)/2-(hor?th/2:0))+'" x2="'+((g.a.x+g.b.x)/2+(hor?0:th/2))+'" y2="'+((g.a.y+g.b.y)/2+(hor?th/2:0))+'" stroke="'+col+'" stroke-width="'+(1.3*k)+'"/>':'')+
   '<line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="'+(s?'rgba(47,125,225,.3)':'transparent')+'" stroke-width="'+(16*k)+'"/></g>'};
 EW().forEach(function(w,i){one('B',w,i)});RM().forEach(function(r){(r.wins||[]).forEach(function(w,i){one(r.id,w,i)})});return o}
function wDown(e){if(!BLD||e.button>0)return;var g=e.target.closest('.ewin');if(!g)return;var h=g.dataset.wh==='B'?'B':g.dataset.wh,i=+g.dataset.wi;if(!wList(h)[i])return;e.stopPropagation();e.preventDefault();
 wd={h:h,i:i,sx:e.clientX,sy:e.clientY,moved:false,before:snapP(),mem:memberOf()};window.addEventListener('pointermove',wMove);window.addEventListener('pointerup',wUp);window.addEventListener('pointercancel',wUp)}
function wMove(e){if(!wd)return;if(!wd.moved&&Math.hypot(e.clientX-wd.sx,e.clientY-wd.sy)<4)return;wd.moved=true;var w=wList(wd.h)[wd.i],sp=wSpot(toFt(e),wd.h,w,{h:wd.h,i:wd.i});if(sp){w.s=sp.w.s;w.t=sp.w.t;eRedraw()}}
function wUp(){window.removeEventListener('pointermove',wMove);window.removeEventListener('pointerup',wUp);window.removeEventListener('pointercancel',wUp);var s=wd;wd=null;if(!s)return;
 selW={h:s.h,i:s.i};selE=null;selR=null;selD=null;if(s.moved)bCommit(s.before,s.mem);else render()}
function wAdd(sp){var before=snapP(),mem=memberOf(),L=wList(sp.h);L.push(sp.w);selW={h:sp.h,i:L.length-1};selE=null;selR=null;selD=null;bCommit(before,mem)}
// tall things standing against a window (soft note only)
function wBlocked(host,w){var g=wGeoOf(host,w),hor=w.s==='n'||w.s==='s',band={x:Math.min(g.a.x,g.b.x)-(hor?0:1.2),y:Math.min(g.a.y,g.b.y)-(hor?1.2:0),w:hor?w.len:2.4,d:hor?2.4:w.len};
 return P.items.filter(function(it){var c=defOf(it);if(!c||c.ceiling||!(c.h>w.sill+.3))return false;return hit(ibox(it),band)}).map(function(it){return defOf(it).n})}
function wCard(){var w=selW&&wList(selW.h)[selW.i];if(!w)return '';var host=selW.h,r=host==='B'?null:rBy(host),SN={n:'Top',s:'Bottom',w:'Left',e:'Right'},H2=host==='B'?(P.room.h||10):Math.min(r.h||P.room.h||10,P.room.h||10),
  opt=function(v,cur,lab){return '<option value="'+v+'"'+(Math.abs(v-cur)<1e-6?' selected':'')+'>'+(lab||fmt(v)+' ft')+'</option>'},list=function(a,cur){if(a.indexOf(cur)<0)a.push(cur);return a.sort(function(x,y){return x-y})},
  seg=function(name,cur,opts){return '<div class="seg2 dseg">'+opts.map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'"'+(cur===o[0]?' checked':'')+'><span>'+o[1]+'</span></label>'}).join('')+'</div>'},bl=wBlocked(host,w);
 return '<div class="card sel"><span class="lab">Window · '+(r?esc(r.n)+' · ':'Outside wall · ')+SN[w.s]+'</span>'+
  '<div class="bgrid"><label class="fl">Width<select id="w-w">'+list([2,3,4,5,6,8,10,12],w.len).map(function(v){return opt(v,w.len)}).join('')+'</select></label><label class="fl">Height<select id="w-h">'+list([2,3,3.5,4,5,6],w.h).map(function(v){return opt(v,w.h)}).join('')+'</select></label></div>'+
  '<label class="fl">Sill height<select id="w-s">'+list([1,1.5,2,2.5,3,3.5,4,5,6,8],w.sill).map(function(v){return opt(v,w.sill,fmt(v)+' ft above the floor')}).join('')+'</select></label>'+
  '<div class="fl">Type'+seg('wty',w.ty||'fixed',[['fixed','Fixed'],['slider','Slider']])+'</div>'+
  '<div class="fl">Glass'+seg('wgt',w.gt||'clear',[['clear','Clear'],['tint','Tinted'],['frost','Frosted']])+'</div>'+
  '<p class="muted" style="margin-top:8px">Top of the glass at '+fmt(wTop(w))+' ft; the wall is '+fmt(H2)+' ft.'+(w.gt==='frost'?' Frosted glass glows but you can\'t see through it.':'')+'</p>'+
  (bl.length?'<div class="warn" style="margin-top:9px">Blocked by '+esc(bl.slice(0,3).join(', '))+(bl.length>3?' and more':'')+'. Fine if you don\'t mind losing the view.</div>':'')+
  '<div class="sbtns">'+dupBtn('w-dup')+'<button class="sb red" id="w-del">Delete</button></div><p class="muted">Drag it along the walls to move it.</p></div>'}
function wCardWire(){var w=selW&&wList(selW.h)[selW.i];if(!w)return;var host=selW.h,r=host==='B'?null:rBy(host),H2=host==='B'?(P.room.h||10):Math.min(r.h||P.room.h||10,P.room.h||10),
  upd=function(fn){var before=snapP(),mem=memberOf();fn();bCommit(before,mem)},L=sideLen(wHost(host),w.s);
 $('#w-w').onchange=function(){var v=parseFloat(this.value),t=Math.max(.5,Math.min(L-.5-v,w.t));if(!wFree(host,w.s,t,v,{h:host,i:selW.i})){toast('Not enough clear wall there for '+fmt(v)+' ft');render();return}upd(function(){w.len=v;w.t=t})};
 var hv=function(sill,h){if(sill+h>H2-.4){toast('That reaches above the '+fmt(H2)+' ft wall');render();return false}return true};
 $('#w-h').onchange=function(){var v=parseFloat(this.value);if(hv(w.sill,v))upd(function(){w.h=v})};
 $('#w-s').onchange=function(){var v=parseFloat(this.value);if(hv(v,w.h))upd(function(){w.sill=v})};
 document.querySelectorAll('input[name=wty]').forEach(function(x){x.onchange=function(){var v=x.value;upd(function(){w.ty=v})}});
 document.querySelectorAll('input[name=wgt]').forEach(function(x){x.onchange=function(){var v=x.value;upd(function(){w.gt=v})}});
 $('#w-del').onclick=function(){upd(function(){wList(host).splice(selW.i,1);selW=null})};$('#w-dup').onclick=dupWin}
function trimWins(){var B=BLDG();P.ewins=EW().filter(function(w){var L=sideLen(B,w.s);if(w.len>L-1)return false;w.t=Math.max(.5,Math.min(L-.5-w.len,w.t));return true})}
/* ---------------- duplicate ---------------- */
var DUPI='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
function dupBtn(id){return '<button class="sb" id="'+id+'" title="Duplicate ('+(/Mac|iPhone|iPad/.test(navigator.platform)?'⌘':'Ctrl+')+'D)">'+DUPI+'Duplicate</button>'}
// try spots along a wall: first to the right of the original, then from the start, then the other sides
function slotScan(sides,first,len,t0,ok){for(var si=0;si<sides.length;si++){var sd=sides[si],L=sides.L(sd),start=sd===first?t0:.5,tries=[];
  for(var t=start;t+len<=L-.5+1e-6;t+=.5)tries.push(t);if(sd===first)for(var t2=.5;t2<t0;t2+=.5)tries.push(t2);
  for(var i=0;i<tries.length;i++){var tt=Math.round(tries[i]*2)/2;if(ok(sd,tt))return {s:sd,t:tt}}}return null}
function sideOrder(first,allowed){var o=[first].concat(['s','e','n','w'].filter(function(s){return s!==first})).filter(function(s){return allowed(s)});return o}
function dupWin(){var w=selW&&wList(selW.h)[selW.i];if(!w)return;var host=selW.h,hr=wHost(host),sides=sideOrder(w.s,function(s){return host==='B'||!onEdge(hr,s)});sides.L=function(s){return sideLen(hr,s)};
 var spot=slotScan(sides,w.s,w.len,w.t+w.len+1,function(sd,t){return wFree(host,sd,t,w.len,null)});if(!spot){toast('No clear wall left for another '+fmt(w.len)+' ft window');return}
 var before=snapP(),mem=memberOf(),c=JSON.parse(JSON.stringify(w));c.s=spot.s;c.t=spot.t;wList(host).push(c);selW={h:host,i:wList(host).length-1};bCommit(before,mem)}
function dupEdoor(){var d=ED()[selE];if(!d)return;var sides=sideOrder(d.s,function(){return true});sides.L=function(s){return sideLen(BLDG(),s)};
 var spot=slotScan(sides,d.s,d.len,d.t+d.len+1,function(sd,t){var c={k:d.k,s:sd,t:t,len:d.len};return eFits(c,null)&&!EW().some(function(w){return w.s===sd&&t<w.t+w.len+.5&&w.t<t+d.len+.5})});
 if(!spot){toast('No clear outside wall left for another '+(d.k==='roll'?'roll-up door':'door'));return}
 var before=snapP(),mem=memberOf(),c=JSON.parse(JSON.stringify(d));c.s=spot.s;c.t=spot.t;ED().push(c);selE=ED().length-1;bCommit(before,mem)}
function dupRoomDoor(){var r=rBy(selR),d=r&&r.doors[selD];if(!d)return;var len=d.len||3,sides=sideOrder(d.s,function(s){return !onEdge(r,s)});sides.L=function(s){return sideLen(r,s)};
 var spot=slotScan(sides,d.s,len,d.t+len+1,function(sd,t){if(t+len>sideLen(r,sd)+1e-6)return false;return !sideGaps(r,sd).concat(winsOn(r,sd)).some(function(g){return t<g[1]+.5&&g[0]<t+len+.5})});
 if(!spot){toast('No clear wall left in '+(r.n||'this room')+' for another door');return}
 var before=snapP(),mem=memberOf(),c=JSON.parse(JSON.stringify(d));c.s=spot.s;c.t=spot.t;r.doors.push(c);selD=r.doors.length-1;bCommit(before,mem)}
