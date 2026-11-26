/* ---------------- floor surfaces (Ground level) ----------------
   A floor is a flat rectangle of one material (wood, carpet, rubber, a rink, a parking bay...). It lies under
   everything: objects ignore it when they're placed, so a sofa sits on the carpet and a car parks in the bay.
   Floors can't overlap each other or cross a room wall. Drag the card at the top of the objects menu onto the plan,
   then size it and pick the material in the right panel. */
var FMAT=[
 ['wood','Wood planks','#cf9f68',6,12,'Engineered wood or luxury vinyl plank. Vinyl is the easy pick over a slab: waterproof and warm underfoot.'],
 ['carpet','Carpet tile','#8d93a3',3,8,'Commercial carpet tiles: quiet and soft, and a stained tile can be swapped out.'],
 ['rubber','Rubber gym tile','#3d4045',4,10,'3/8–3/4 in rubber tiles for a gym: protect the slab from dropped weights and soften footing.'],
 ['epoxy','Epoxy coating','#a3abb2',4,9,'Two-part epoxy with flakes over the concrete. Tough and easy to clean; good in a garage or shop.'],
 ['sport','Sport court tile','#3c7fc6',5,9,'Snap-together polypropylene tiles for basketball, pickleball and the like. Lay straight on the slab.'],
 ['turf','Turf','#5fa94b',3,7,'Indoor artificial turf over a pad: golf, sled pushes, kids play area.'],
 ['rink','Skate rink','#e9f0f5',6,14,'Roller-skating surface: sport tile or a coated, sealed slab with the rink markings painted on.'],
 ['park','Parking bay','#bdbab2',1,3,'Sealed concrete with painted bay lines. Cost is sealing and striping.'],
 ['tile','Tile','#e6e7e2',8,20,'Porcelain or ceramic tile: bathrooms, kitchens and bars.']];
function fMat(id){return FMAT.filter(function(m){return m[0]===id})[0]||FMAT[0]}
var selF=null,fd=null,fl=null;
function FL(){return P.floors||(P.floors=[])}
function fBy(id){return FL().filter(function(f){return f.id===id})[0]||null}
function fAt(p){var a=FL();for(var i=a.length-1;i>=0;i--){var f=a[i];if(p.x>=f.x&&p.x<=f.x+f.w&&p.y>=f.y&&p.y<=f.y+f.d)return f}return null}
function fOverlap(b,skip){return FL().some(function(f){return f.id!==skip&&hit(b,f)})||RM().some(function(r){return hit(b,r)&&!within(b,r)})}
function fOn(f){return P.items.filter(function(it){var c=defOf(it);if(!c||c.ceiling)return false;var b=ibox(it),cx=b.x+b.w/2,cy=b.y+b.d/2;return cx>f.x&&cx<f.x+f.w&&cy>f.y&&cy<f.y+f.d})}
function trimFloors(){var W=P.room.w,D=P.room.d;P.floors=FL().filter(function(f){if(f.x+f.w>W)f.w=Math.max(1,W-f.x);if(f.y+f.d>D)f.d=Math.max(1,D-f.y);return f.x<W&&f.y<D})}
// plan patterns, in feet (s = size of one foot in the drawing's units)
function fPat(id,s,pre){var c=fMat(id)[2],u=function(v){return +(v*s).toFixed(3)},P0='<pattern id="'+pre+id+'" patternUnits="userSpaceOnUse" ',R=function(w,h,f){return '<rect width="'+u(w)+'" height="'+u(h)+'" fill="'+f+'"/>'};
 if(id==='wood')return P0+'width="'+u(4)+'" height="'+u(1)+'">'+R(4,1,c)+'<rect y="'+u(.5)+'" width="'+u(4)+'" height="'+u(.5)+'" fill="#c4935c"/><g stroke="#a3743f" stroke-width="'+u(.04)+'"><line x1="0" y1="'+u(.5)+'" x2="'+u(4)+'" y2="'+u(.5)+'"/><line x1="0" y1="'+u(1)+'" x2="'+u(4)+'" y2="'+u(1)+'"/><line x1="'+u(1.2)+'" y1="0" x2="'+u(1.2)+'" y2="'+u(.5)+'"/><line x1="'+u(3.1)+'" y1="'+u(.5)+'" x2="'+u(3.1)+'" y2="'+u(1)+'"/></g></pattern>';
 if(id==='carpet')return P0+'width="'+u(.6)+'" height="'+u(.6)+'">'+R(.6,.6,c)+'<circle cx="'+u(.15)+'" cy="'+u(.2)+'" r="'+u(.05)+'" fill="#7d8394"/><circle cx="'+u(.45)+'" cy="'+u(.45)+'" r="'+u(.05)+'" fill="#9ba1b0"/></pattern>';
 if(id==='rubber')return P0+'width="'+u(2)+'" height="'+u(2)+'">'+R(2,2,c)+'<g fill="#5d6168"><circle cx="'+u(.3)+'" cy="'+u(.4)+'" r="'+u(.05)+'"/><circle cx="'+u(1.2)+'" cy="'+u(.9)+'" r="'+u(.05)+'"/><circle cx="'+u(.7)+'" cy="'+u(1.5)+'" r="'+u(.05)+'"/><circle cx="'+u(1.7)+'" cy="'+u(1.6)+'" r="'+u(.05)+'"/></g><rect width="'+u(2)+'" height="'+u(2)+'" fill="none" stroke="#2c2e32" stroke-width="'+u(.04)+'"/></pattern>';
 if(id==='epoxy')return P0+'width="'+u(1)+'" height="'+u(1)+'">'+R(1,1,c)+'<g fill="#7f878e"><circle cx="'+u(.2)+'" cy="'+u(.3)+'" r="'+u(.04)+'"/><circle cx="'+u(.7)+'" cy="'+u(.6)+'" r="'+u(.035)+'"/></g><circle cx="'+u(.5)+'" cy="'+u(.15)+'" r="'+u(.035)+'" fill="#e6eaee"/></pattern>';
 if(id==='sport')return P0+'width="'+u(1)+'" height="'+u(1)+'">'+R(1,1,c)+'<rect width="'+u(1)+'" height="'+u(1)+'" fill="none" stroke="#5c97d4" stroke-width="'+u(.05)+'"/></pattern>';
 if(id==='turf')return P0+'width="'+u(3)+'" height="'+u(3)+'">'+R(3,1.5,c)+'<rect y="'+u(1.5)+'" width="'+u(3)+'" height="'+u(1.5)+'" fill="#55a042"/></pattern>';
 if(id==='rink')return P0+'width="'+u(4)+'" height="'+u(4)+'">'+R(4,4,c)+'<line x1="0" y1="'+u(2)+'" x2="'+u(4)+'" y2="'+u(2)+'" stroke="#dde7ee" stroke-width="'+u(.05)+'"/></pattern>';
 if(id==='park')return P0+'width="'+u(5)+'" height="'+u(5)+'">'+R(5,5,c)+'<path d="M0 '+u(5)+'L'+u(5)+' 0" stroke="#b1aea6" stroke-width="'+u(.04)+'"/></pattern>';
 return P0+'width="'+u(1)+'" height="'+u(1)+'">'+R(1,1,c)+'<rect width="'+u(1)+'" height="'+u(1)+'" fill="none" stroke="#c7c9c3" stroke-width="'+u(.04)+'"/></pattern>'}
// markings that aren't a repeating pattern (bay lines, rink lines), in feet
function fMarks(f,k){var s='';if(f.m==='park'){var lo=f.w>=f.d;s+='<g stroke="#f2c230" stroke-width=".25">'+(lo?'<line x1="'+f.x+'" y1="'+(f.y+.4)+'" x2="'+(f.x+f.w)+'" y2="'+(f.y+.4)+'"/><line x1="'+f.x+'" y1="'+(f.y+f.d-.4)+'" x2="'+(f.x+f.w)+'" y2="'+(f.y+f.d-.4)+'"/>':'<line x1="'+(f.x+.4)+'" y1="'+f.y+'" x2="'+(f.x+.4)+'" y2="'+(f.y+f.d)+'"/><line x1="'+(f.x+f.w-.4)+'" y1="'+f.y+'" x2="'+(f.x+f.w-.4)+'" y2="'+(f.y+f.d)+'"/>')+'</g>'}
 if(f.m==='rink'){var cx=f.x+f.w/2,cy=f.y+f.d/2,lo2=f.w>=f.d;s+=(lo2?'<line x1="'+cx+'" y1="'+f.y+'" x2="'+cx+'" y2="'+(f.y+f.d)+'"':'<line x1="'+f.x+'" y1="'+cy+'" x2="'+(f.x+f.w)+'" y2="'+cy+'"')+' stroke="#d9534f" stroke-width=".3"/><circle cx="'+cx+'" cy="'+cy+'" r="'+Math.min(f.w,f.d)/5+'" fill="none" stroke="#4a7fd0" stroke-width=".2"/>'}return s}
function fSwatch(id,w,h,pre){var s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" aria-hidden="true" style="display:block;border-radius:6px"><defs>'+fPat(id,9,pre||'fs-')+'</defs><rect width="'+w+'" height="'+h+'" fill="url(#'+(pre||'fs-')+id+')"/>';
 if(id==='park')s+='<g stroke="#f2c230" stroke-width="2.5"><line x1="5" y1="0" x2="5" y2="'+h+'"/><line x1="'+(w-5)+'" y1="0" x2="'+(w-5)+'" y2="'+h+'"/></g>';
 if(id==='rink')s+='<line x1="'+w/2+'" y1="0" x2="'+w/2+'" y2="'+h+'" stroke="#d9534f" stroke-width="2"/><circle cx="'+w/2+'" cy="'+h/2+'" r="'+h/4+'" fill="none" stroke="#4a7fd0" stroke-width="1.6"/>';
 return s+'<rect x=".5" y=".5" width="'+(w-1)+'" height="'+(h-1)+'" rx="6" fill="none" stroke="rgba(0,0,0,.15)"/></svg>'}
function fOnLv(){return VW.lv==='g'&&VW.md!=='p'&&!BLD}
function drawFloors(k){var on=fOnLv(),lo='',hi='',used={};FL().forEach(function(f){used[f.m]=1});
 lo='<defs>'+Object.keys(used).map(function(m){return fPat(m,1,'fp-')}).join('')+'</defs>';
 FL().forEach(function(f){var s=on&&selF===f.id;lo+='<g class="floor'+(s?' on':'')+'" data-f="'+f.id+'"><rect x="'+f.x+'" y="'+f.y+'" width="'+f.w+'" height="'+f.d+'" fill="url(#fp-'+f.m+')" stroke="rgba(0,0,0,.18)" stroke-width="'+k+'"/>'+fMarks(f,k)+'</g>';
  if(s){var M=fMat(f.m),t=M[1]+' · '+Math.round(f.w*f.d)+' sq ft',lw=(t.length*6.4+18)*k;
   hi+='<rect x="'+f.x+'" y="'+f.y+'" width="'+f.w+'" height="'+f.d+'" fill="none" stroke="#2f7de1" stroke-width="'+(2.2*k)+'" stroke-dasharray="'+(7*k)+' '+(4*k)+'" pointer-events="none"/>';
   hi+='<g pointer-events="none"><rect x="'+(f.x+f.w/2-lw/2)+'" y="'+(f.y+6*k)+'" width="'+lw+'" height="'+(19*k)+'" rx="'+(9.5*k)+'" fill="#fff" stroke="#2f7de1" stroke-width="'+(1.2*k)+'"/><text x="'+(f.x+f.w/2)+'" y="'+(f.y+19.5*k)+'" text-anchor="middle" font-size="'+(11*k)+'" font-weight="700" fill="#1d4f91">'+esc(t)+'</text></g>';
   [['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]].forEach(function(q){var hx=f.x+f.w*q[1],hy=f.y+f.d*q[2],r=7*k;
    hi+='<rect class="fh" data-f="'+f.id+'" data-h="'+q[0]+'" x="'+(hx-r)+'" y="'+(hy-r)+'" width="'+(2*r)+'" height="'+(2*r)+'" rx="'+(2*k)+'" fill="#fff" stroke="#2f7de1" stroke-width="'+(2*k)+'" style="cursor:'+({n:'ns',s:'ns',e:'ew',w:'ew',nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw'})[q[0]]+'-resize"/>'})}});
 if(!on)lo='<g opacity="'+(BLD?.55:.4)+'" pointer-events="none">'+lo+'</g>';return {lo:lo,hi:hi}}
// default floor where it was dropped: up to 10 ft square, shrunk until it fits
function fFit(cx,cy){var W=P.room.w,D=P.room.d;for(var s=10;s>=2;s--){var w=Math.min(s,W),d=Math.min(s,D),x=Math.round(Math.max(0,Math.min(W-w,cx-w/2))),y=Math.round(Math.max(0,Math.min(D-d,cy-d/2))),b={x:x,y:y,w:w,d:d};if(!fOverlap(b))return b}return null}
function fAdd(b){var before=snapP();P.fid=(P.fid||0)+1;var f={id:'f'+P.fid,x:b.x,y:b.y,w:b.w,d:b.d,m:'wood'};FL().push(f);hist.push(before);fut=[];selF=f.id;sel=null;selO=null;selZ=null;libV=null;persist();render()}
// pointer: only a selected floor moves or resizes; a tap on an unselected floor selects it (see the pan tap)
function fDown(e){if(!fOnLv()||e.button>0)return;var h=e.target.closest('.fh'),g=e.target.closest('.floor');var f=fBy((h||g||{dataset:{}}).dataset.f);if(!f||(!h&&selF!==f.id))return;
 e.stopPropagation();e.preventDefault();fd={id:f.id,mode:h?'size':'move',h:h&&h.dataset.h,p0:toFt(e),b0:{x:f.x,y:f.y,w:f.w,d:f.d},sx:e.clientX,sy:e.clientY,moved:false,before:snapP()};
 window.addEventListener('pointermove',fMove);window.addEventListener('pointerup',fUp);window.addEventListener('pointercancel',fUp)}
function fMove(e){if(!fd)return;if(!fd.moved&&Math.hypot(e.clientX-fd.sx,e.clientY-fd.sy)<4)return;fd.moved=true;var f=fBy(fd.id),p=toFt(e),dx=p.x-fd.p0.x,dy=p.y-fd.p0.y,b0=fd.b0,W=P.room.w,D=P.room.d,R=function(v){return Math.round(v*2)/2},nb;
 if(fd.mode==='move')nb={x:R(Math.max(0,Math.min(W-b0.w,b0.x+dx))),y:R(Math.max(0,Math.min(D-b0.d,b0.y+dy))),w:b0.w,d:b0.d};
 else{var x1=b0.x,y1=b0.y,x2=b0.x+b0.w,y2=b0.y+b0.d,hh=fd.h;
  if(/w/.test(hh))x1=R(Math.max(0,Math.min(x2-1,b0.x+dx)));if(/e/.test(hh))x2=R(Math.min(W,Math.max(x1+1,x2+dx)));
  if(/n/.test(hh))y1=R(Math.max(0,Math.min(y2-1,b0.y+dy)));if(/s/.test(hh))y2=R(Math.min(D,Math.max(y1+1,y2+dy)));nb={x:x1,y:y1,w:x2-x1,d:y2-y1}}
 if(!fOverlap(nb,f.id)){f.x=nb.x;f.y=nb.y;f.w=nb.w;f.d=nb.d;fRedraw()}}
function fUp(){window.removeEventListener('pointermove',fMove);window.removeEventListener('pointerup',fUp);window.removeEventListener('pointercancel',fUp);var d=fd;fd=null;if(!d)return;
 if(d.moved&&d.before!==snapP()){hist.push(d.before);if(hist.length>60)hist.shift();fut=[];persist()}selF=d.id;sel=null;selO=null;selZ=null;libV=null;render()}
function fRedraw(){if(!G.floor)return;var d=drawFloors(1/scale());G.floor.innerHTML=d.lo;G.floorh.innerHTML=d.hi}
function fDel(id){var before=snapP();P.floors=FL().filter(function(f){return f.id!==id});if(selF===id)selF=null;hist.push(before);fut=[];persist();render()}
// right panel
function floorCard(){var f=fBy(selF);if(!f)return '';var M=fMat(f.m),a=Math.round(f.w*f.d),on=fOn(f),
  row=function(k,v){return '<div class="srw"><span>'+k+'</span><b>'+v+'</b></div>'};
 return '<div class="card sel fcardp"><div style="display:flex;align-items:center;justify-content:space-between"><span class="lab">Floor surface</span><button class="lnk red" id="f-del">Delete</button></div>'+
  '<div class="fmh">'+fSwatch(f.m,46,34,'fh-')+'<div><b>'+esc(M[1])+'</b><span>'+fmt(f.w)+' × '+fmt(f.d)+' ft · '+a.toLocaleString()+' sq ft</span></div></div>'+
  '<div class="fl">Material<div class="fmg">'+FMAT.map(function(m){return '<button class="fmb'+(m[0]===f.m?' on':'')+'" data-m="'+m[0]+'" title="'+esc(m[1])+'">'+fSwatch(m[0],52,34,'fg-')+'<span>'+esc(m[1].split(' ')[0])+'</span></button>'}).join('')+'</div></div>'+
  '<div class="srows">'+row('Cost',money(a*M[3])+'–'+money(a*M[4]))+row('Per sq ft',money(M[3])+'–'+money(M[4]))+row('Size',fmt(f.w)+' × '+fmt(f.d)+' ft')+'</div>'+
  '<p class="muted" style="margin-top:8px">'+esc(M[5])+'</p>'+
  (on.length?'<p class="fon">On this floor: <b>'+esc(on.slice(0,6).map(function(it){return defOf(it).n}).join(', '))+(on.length>6?' and '+(on.length-6)+' more':'')+'</b></p>':'')+
  '<p class="muted" style="margin-top:8px">Drag the floor to move it and the handles to resize it. Objects sit on top of it.</p></div>'}
function floorCardWire(){var f=fBy(selF);if(!f)return;var b=document.getElementById('f-del');if(b)b.onclick=function(){fDel(f.id)};
 document.querySelectorAll('.fmb').forEach(function(x){x.onclick=function(){if(f.m===x.dataset.m)return;var before=snapP();f.m=x.dataset.m;hist.push(before);fut=[];persist();render()}})}
// objects menu: the card at the top, dragged onto the plan
var FHAND='<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="#1c1c1f" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10V4a1.5 1.5 0 0 1 3 0v6V5.5a1.5 1.5 0 0 1 3 0V11v-3a1.5 1.5 0 0 1 3 0v6.5A6.5 6.5 0 0 1 13.5 21h-1.2a6 6 0 0 1-4.6-2.2L4.3 14.6a1.6 1.6 0 0 1 2.4-2.1L8 14Z"/></svg>';
function floorLibCard(){var st='<svg width="78" height="66" viewBox="0 0 78 66" aria-hidden="true"><defs>'+fPat('carpet',8,'fq-')+fPat('rubber',8,'fq-')+fPat('wood',8,'fq-')+'</defs>'+
  '<rect x="4" y="22" width="44" height="34" rx="6" fill="url(#fq-rubber)" stroke="rgba(0,0,0,.2)" transform="rotate(-8 26 39)"/><rect x="6" y="20" width="44" height="34" rx="6" fill="url(#fq-carpet)" stroke="rgba(0,0,0,.2)" transform="rotate(-3 28 37)"/>'+
  '<g transform="translate(26 4) rotate(10 22 17)"><rect x="2" y="5" width="44" height="34" rx="6" fill="rgba(0,0,0,.18)"/><rect width="44" height="34" rx="6" fill="url(#fq-wood)" stroke="rgba(0,0,0,.25)"/></g></svg>';
 return '<div class="flib" role="button" tabindex="0" title="Drag onto the plan"><div class="flart">'+st+'<i>'+FHAND+'</i></div><div><b>Floor surface</b><span>Wood, carpet, rubber, rink, parking bay…</span><em>Drag onto the plan <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></em></div></div>'}
function floorLibWire(){var c=document.querySelector('#lib .flib');if(!c)return;
 var tip=function(on,x,y){var t=document.getElementById('fltip');if(!on){if(t)t.remove();return}if(!t){t=document.createElement('div');t.id='fltip';t.className='fltip';t.textContent='Let go to place the floor';document.body.appendChild(t)}t.style.transform='translate('+(x-80)+'px,'+(y-58)+'px)'};
 c.onpointerdown=function(e){if(e.button>0)return;fl={sx:e.clientX,sy:e.clientY,on:false};c.setPointerCapture&&c.setPointerCapture(e.pointerId)};
 c.onpointermove=function(e){if(!fl)return;if(!fl.on){if(Math.hypot(e.clientX-fl.sx,e.clientY-fl.sy)<6)return;fl.on=true;c.classList.add('lifted');document.body.classList.add('ldragging');var ch=document.createElement('div');ch.className='ldchip';ch.innerHTML='<div class="lart">'+fSwatch('wood',40,40,'fc-')+'</div><span>Floor surface</span>';document.body.appendChild(ch);fl.chip=ch}
  fl.chip.style.transform='translate('+(e.clientX+14)+'px,'+(e.clientY+14)+'px)';var r=sv.getBoundingClientRect(),over=e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom,k=1/scale();fl.chip.classList.toggle('over',over);
  if(!over){G.ghost.innerHTML='';fl.b=null;tip(false);return}var p=toFt(e),b=fFit(p.x,p.y);fl.b=b;tip(!!b,e.clientX,e.clientY);
  G.ghost.innerHTML=b?'<defs>'+fPat('wood',1,'fgh-')+'</defs><rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.d+'" fill="url(#fgh-wood)" fill-opacity=".75" stroke="#2f7de1" stroke-width="'+(2*k)+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'" pointer-events="none"/><g pointer-events="none"><rect x="'+(b.x+b.w/2-28*k)+'" y="'+(b.y+b.d+5*k)+'" width="'+(56*k)+'" height="'+(19*k)+'" rx="'+(9.5*k)+'" fill="#2f7de1"/><text x="'+(b.x+b.w/2)+'" y="'+(b.y+b.d+18.5*k)+'" text-anchor="middle" font-size="'+(11*k)+'" font-weight="700" fill="#fff">'+fmt(b.w)+' × '+fmt(b.d)+' ft</text></g>':''};
 c.onpointerup=c.onpointercancel=function(e){var s=fl;fl=null;if(!s)return;G.ghost.innerHTML='';tip(false);c.classList.remove('lifted');document.body.classList.remove('ldragging');if(s.chip)s.chip.remove();
  if(!s.on){toast('Drag the floor card onto the plan to add a floor');return}if(e.type==='pointerup'){if(s.b)fAdd(s.b);else toast('No open floor there')}};
 c.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();var W=P.room.w,D=P.room.d,b=fFit(W/2,D/2);if(b)fAdd(b);else toast('No open floor left for a new floor')}}}
