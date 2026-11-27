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
function eRedraw(){if(G.ext)G.ext.innerHTML=drawExt(1/scale())}
function eDown(e){if(!BLD||e.button>0)return;var g=e.target.closest('.edoor');if(!g)return;var i=+g.dataset.e,d=ED()[i];if(!d)return;e.stopPropagation();e.preventDefault();
 ed={i:i,sx:e.clientX,sy:e.clientY,moved:false,before:snapP(),mem:memberOf(),d0:JSON.parse(JSON.stringify(d))};
 window.addEventListener('pointermove',eMove);window.addEventListener('pointerup',eUp);window.addEventListener('pointercancel',eUp)}
function eMove(e){if(!ed)return;if(!ed.moved&&Math.hypot(e.clientX-ed.sx,e.clientY-ed.sy)<4)return;ed.moved=true;var d=ED()[ed.i],sp=eSpot(toFt(e),d.k,d.len,ed.i);if(sp){d.s=sp.s;d.t=sp.t;eRedraw()}}
function eUp(){window.removeEventListener('pointermove',eMove);window.removeEventListener('pointerup',eUp);window.removeEventListener('pointercancel',eUp);var s=ed;ed=null;if(!s)return;
 selE=s.i;selR=null;selD=null;if(s.moved)bCommit(s.before,s.mem);else render()}
function eAdd(d){var before=snapP(),mem=memberOf();ED().push(d);selE=ED().length-1;selR=null;selD=null;bCommit(before,mem)}
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
 return h+'<div class="sbtns"><button class="sb red" id="e-del">Delete</button></div><p class="muted">Drag it along the outside walls to move it.</p></div>'}
function eCardWire(){var d=ED()[selE];if(!d)return;var upd=function(fn){var before=snapP(),mem=memberOf();fn();bCommit(before,mem)},L=function(){return sideLen(BLDG(),d.s)};
 $('#e-w').onchange=function(){var v=parseFloat(this.value),o={k:d.k,s:d.s,t:Math.max(.5,Math.min(L()-.5-v,d.t)),len:v};if(!eFits(o,selE)){toast('Not enough wall there for '+fmt(v)+' ft');render();return}upd(function(){d.len=v;d.t=o.t})};
 $('#e-h').onchange=function(){var v=parseFloat(this.value);upd(function(){d.h=v})};
 var op=$('#e-op');if(op)op.onchange=function(){var v=this.checked;upd(function(){d.op=v?1:0})};
 var gl=$('#e-gl');if(gl)gl.onchange=function(){var v=this.checked;upd(function(){d.gl=v?1:0})};
 document.querySelectorAll('input[name=esw]').forEach(function(x){x.onchange=function(){var v=+x.value;upd(function(){d.sw=v})}});
 var fl=$('#e-flip');if(fl)fl.onclick=function(){upd(function(){d.hg=d.hg?0:1})};
 $('#e-del').onclick=function(){upd(function(){ED().splice(selE,1);selE=null})}}
// Build menu drag: preview on the nearest outside wall
function eGhost(d,k){var g=eGeo(d),o='<line x1="'+g.a.x+'" y1="'+g.a.y+'" x2="'+g.b.x+'" y2="'+g.b.y+'" stroke="#2f7de1" stroke-width="'+(8*k)+'" pointer-events="none"/>';
 if(d.k==='roll'){var z=g.zone;o+='<rect x="'+z.x+'" y="'+z.y+'" width="'+z.w+'" height="'+z.d+'" fill="rgba(47,125,225,.08)" stroke="#2f7de1" stroke-width="'+k+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'" pointer-events="none"/>'}
 else o+='<line x1="'+g.h.x+'" y1="'+g.h.y+'" x2="'+g.tip.x+'" y2="'+g.tip.y+'" stroke="#2f7de1" stroke-width="'+(2.4*k)+'" pointer-events="none"/>';return o}
// Explore: start just inside the first walk-in door, facing in
function eSpawn(){var d=ED().filter(function(q){return q.k==='door'})[0];if(!d)return null;var g=eGeo(d),m={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2},n=g.n,p={x:m.x+n.x*(d.sw!==-1?d.len+1.5:3),y:m.y+n.y*(d.sw!==-1?d.len+1.5:3)};
 return {x:p.x,y:p.y,yaw:Math.atan2(-n.x,-n.y)}}
function trimEdoors(){var B=BLDG();P.edoors=ED().filter(function(d){var L=sideLen(B,d.s);if(d.len>L-1)return false;d.t=Math.max(.5,Math.min(L-.5-d.len,d.t));return true})}
