/* ---------------- light zones (Lights level) ----------------
   A zone is a rectangle on the ceiling that needs light. The app picks how many fixtures it takes to reach the
   target brightness and lays them out in an even grid, spaced for the mounting height. Single fixtures can be dragged
   to line things up; changing the zone's size, fixture or target redraws the pattern, and Reset puts it back. */
var ZK=[[2700,'Warm white',0xffc58f,'#ffc58f'],[3000,'Soft white',0xffd2a1,'#ffd2a1'],[4000,'Neutral white',0xffe7cf,'#ffe7cf'],[5000,'Cool white',0xfff3ea,'#fff3ea'],[6500,'Daylight',0xeef0ff,'#e3e8ff']];
function zK(z){return ZK.filter(function(q){return q[0]===(z.k||5000)})[0]||ZK[3]}
var selZ=null,zd=null,ZEFF=130,ZCU=.7,ZLLF=.85;
function ZN(){return P.zones||(P.zones=[])}
function zBy(id){return ZN().filter(function(z){return z.id===id})[0]||null}
function zAutoF(z){return (z?hAt(z.x+z.w/2,z.y+z.d/2):(P.room.h||10))>=15?'cl-hbr':'cl-shop'}
function zDef(z){var r=z.f||zAutoF(z);return {r:r,c:(P.defs&&P.defs[r])||LIB[r]}}
function zLm(c){return ((c&&c.p&&c.p[1])||60)*ZEFF}
function zOverlap(b,skip){return ZN().some(function(z){return z.id!==skip&&hit(b,z)})||RM().some(function(r){return hit(b,r)&&!within(b,r)})}
function zObst(){var o=[];P.items.forEach(function(it){var c=defOf(it);if(!c||!c.ceiling)return;var b=ibox(it);o.push(isFan(c)?rodBox(b):b)});return o}
function zLayout(z){var d=zDef(z),c=d.c,H=hAt(z.x+z.w/2,z.y+z.d/2),A=Math.max(1,z.w*z.d),lm=zLm(c),hm=Math.max(2,H-(c.drop||0)-.5-2.5),S=Math.max(4,1.3*hm),
  N=Math.max(1,Math.ceil((z.fc||50)*A/(lm*ZCU*ZLLF))),cols,rows;
 if(z.rc){cols=z.rc[0];rows=z.rc[1]}else{var mc=Math.max(1,Math.ceil(z.w/S)),mr=Math.max(1,Math.ceil(z.d/S)),best=null;
  for(var cc=mc;cc<=mc+40;cc++){var rr=Math.max(mr,Math.ceil(N/cc)),sx0=z.w/cc,sy0=z.d/rr,sc=(cc*rr-N)*2+Math.abs(sx0-sy0)/S*3;if(!best||sc<best.s)best={s:sc,c:cc,r:rr};if(cc*mr>N*1.6+4)break}cols=best.c;rows=best.r}
 var sx=z.w/cols,sy=z.d/rows,lin=c.w>c.d*2,rot=lin&&sy>sx?1:0,fw=rot?c.d:c.w,fd=rot?c.w:c.d,obs=zObst(),pts=[],adj=z.adj||{},
  clear=function(x,y){var b={x:x-fw/2,y:y-fd/2,w:fw,d:fd};return !obs.some(function(o){return hit(b,o)})};
 for(var j=0;j<rows;j++)for(var i=0;i<cols;i++){var k=j*cols+i,x=z.x+sx*(i+.5),y=z.y+sy*(j+.5),mv=!!adj[k],bl=false;
  if(mv){x=adj[k][0];y=adj[k][1]}else if(!clear(x,y)){var f=null,lim=Math.min(sx,sy)/2;for(var r=.5;r<=lim&&!f;r+=.5)for(var a=0;a<16&&!f;a++){var xx=Math.round((x+Math.cos(a*Math.PI/8)*r)*2)/2,yy=Math.round((y+Math.sin(a*Math.PI/8)*r)*2)/2;
    if(xx-fw/2>=z.x&&xx+fw/2<=z.x+z.w&&yy-fd/2>=z.y&&yy+fd/2<=z.y+z.d&&clear(xx,yy))f=[xx,yy]}if(f){x=f[0];y=f[1]}else bl=true}
  pts.push({i:k,x:x,y:y,w:fw,d:fd,rot:rot,mv:mv,bl:bl})}
 var n=pts.filter(function(p){return !p.bl}).length;
 return {r:d.r,c:c,cols:cols,rows:rows,sx:sx,sy:sy,S:S,N:N,n:n,lm:lm,fc:n*lm*ZCU*ZLLF/A,W:n*((c.p&&c.p[1])||60),pts:pts,auto:!z.rc}}
function zFixAll(){var o=[];ZN().forEach(function(z){var L=zLayout(z);L.pts.forEach(function(p){if(!p.bl)o.push({z:z,c:L.c,r:L.r,x:p.x,y:p.y,w:p.w,d:p.d,rot:p.rot,col:zK(z)[2]})})});return o}
function trimZones(){var W=P.room.w,D=P.room.d;ZN().forEach(function(z){var ch=false;
 if(z.x+z.w>W){z.w=Math.max(2,W-z.x);if(z.x+z.w>W){z.x=Math.max(0,W-z.w)}ch=true}if(z.y+z.d>D){z.d=Math.max(2,D-z.y);if(z.y+z.d>D){z.y=Math.max(0,D-z.d)}ch=true}
 if(z.w>W){z.w=W;z.x=0}if(z.d>D){z.d=D;z.y=0}if(ch)z.adj={}})}
function zIcon(p,c,k,mv){var cx=p.x,cy=p.y,st=mv?'#2f7de1':'#854F0B',sw=(mv?2:1.3)*k;
 return (c.w===c.d&&/round|caged/i.test(c.n)?'<circle cx="'+cx+'" cy="'+cy+'" r="'+(p.w/2)+'" fill="#FAC775" stroke="'+st+'" stroke-width="'+sw+'"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(p.w/5)+'" fill="#fff6d6"/>'
  :'<rect x="'+(cx-p.w/2)+'" y="'+(cy-p.d/2)+'" width="'+p.w+'" height="'+p.d+'" rx="'+(Math.min(p.w,p.d)*.2)+'" fill="#FAC775" stroke="'+st+'" stroke-width="'+sw+'"/>')+
  (mv?'<circle cx="'+(cx+p.w/2)+'" cy="'+(cy-p.d/2)+'" r="'+(3.2*k)+'" fill="#2f7de1" stroke="#fff" stroke-width="'+k+'"/>':'')}
function drawZones(k){var hi='';if(VW.lv==='g')return {lo:'',hi:''};var on=VW.lv==='l'&&VW.md!=='p',h='';
 ZN().forEach(function(z){var L=zLayout(z),s=on&&selZ===z.id;
  h+='<g class="zone'+(on?'':' zoff')+'" data-z="'+z.id+'"><rect class="zb" x="'+z.x+'" y="'+z.y+'" width="'+z.w+'" height="'+z.d+'" fill="#EF9F27" fill-opacity="'+(s?.2:.13)+'" stroke="'+(s?'#2f7de1':'#BA7517')+'" stroke-width="'+((s?2.4:1.6)*k)+'"'+(s?'':' stroke-dasharray="'+(6*k)+' '+(4*k)+'"')+'/>';
  L.pts.forEach(function(p){if(p.bl)return;h+='<g class="zfx" data-z="'+z.id+'" data-i="'+p.i+'">'+zIcon(p,L.c,k,p.mv)+'</g>'});
  var lab='Light zone · '+L.n,lw=(lab.length*6.4+16)*k;
  h+='</g>';hi+='<g pointer-events="none"'+(on?'':' opacity=".3"')+'><rect x="'+(z.x+6*k)+'" y="'+(z.y+6*k)+'" width="'+lw+'" height="'+(18*k)+'" rx="'+(9*k)+'" fill="'+(s?'#1d4f91':'#854F0B')+'"/><text x="'+(z.x+14*k)+'" y="'+(z.y+19*k)+'" font-size="'+(11*k)+'" font-weight="700" fill="#fff">'+lab+'</text></g>';if(s)hi+='<g class="zone" data-z="'+z.id+'">';
  if(s){[['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]].forEach(function(q){var hx=z.x+z.w*q[1],hy=z.y+z.d*q[2],r=7*k;
   hi+='<rect class="zh" data-z="'+z.id+'" data-h="'+q[0]+'" x="'+(hx-r)+'" y="'+(hy-r)+'" width="'+(2*r)+'" height="'+(2*r)+'" rx="'+(2*k)+'" fill="#fff" stroke="#2f7de1" stroke-width="'+(2*k)+'" style="cursor:'+({n:'ns',s:'ns',e:'ew',w:'ew',nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw'})[q[0]]+'-resize"/>'});hi+='</g>'}});return {lo:h,hi:hi}}
function zRedraw(){if(!G.zone)return;var d=drawZones(1/scale());G.zone.innerHTML=d.lo;G.zoneh.innerHTML=d.hi}
// default zone where it was dropped: up to 16 ft square, inside the room, shrunk until it clears other zones
function zFit(cx,cy){var W=P.room.w,D=P.room.d;for(var s=16;s>=4;s--){var w=Math.min(s,W),d=Math.min(s,D),x=Math.round(Math.max(0,Math.min(W-w,cx-w/2))),y=Math.round(Math.max(0,Math.min(D-d,cy-d/2))),b={x:x,y:y,w:w,d:d};if(!zOverlap(b))return b}return null}
function zAdd(cx,cy){var b=zFit(cx,cy);if(!b){toast('No open ceiling there for a light zone');return}var before=snapP();P.zid=(P.zid||0)+1;var z={id:'z'+P.zid,x:b.x,y:b.y,w:b.w,d:b.d,f:null,fc:50,rc:null,adj:{}};ZN().push(z);
 hist.push(before);fut=[];selZ=z.id;sel=null;selO=null;selF=null;libV=null;persist();render()}
// pointer: move, resize, drag one fixture
function zDown(e){if(VW.lv!=='l'||VW.md==='p'||e.button>0)return;var t=e.target,h=t.closest('.zh'),f=t.closest('.zfx'),g=t.closest('.zone');if(!g)return;var z=zBy(g.dataset.z);if(!z)return;
 e.stopPropagation();e.preventDefault();zd={id:z.id,mode:h?'size':f?'fix':'move',h:h&&h.dataset.h,i:f&&+f.dataset.i,p0:toFt(e),b0:{x:z.x,y:z.y,w:z.w,d:z.d},sx:e.clientX,sy:e.clientY,moved:false,before:snapP()};
 if(zd.mode==='fix'){var L=zLayout(z),pt=L.pts.filter(function(p){return p.i===zd.i})[0];zd.f0=[pt.x,pt.y];zd.fw=pt.w;zd.fd=pt.d}
 window.addEventListener('pointermove',zMove);window.addEventListener('pointerup',zUp);window.addEventListener('pointercancel',zUp)}
function zMove(e){if(!zd)return;if(!zd.moved&&Math.hypot(e.clientX-zd.sx,e.clientY-zd.sy)<4)return;zd.moved=true;var z=zBy(zd.id),p=toFt(e),dx=p.x-zd.p0.x,dy=p.y-zd.p0.y,b0=zd.b0,W=P.room.w,D=P.room.d,nb;
 if(zd.mode==='move'){nb={x:Math.round(Math.max(0,Math.min(W-b0.w,b0.x+dx))),y:Math.round(Math.max(0,Math.min(D-b0.d,b0.y+dy))),w:b0.w,d:b0.d}}
 else if(zd.mode==='size'){var x1=b0.x,y1=b0.y,x2=b0.x+b0.w,y2=b0.y+b0.d,hh=zd.h;
  if(/w/.test(hh))x1=Math.round(Math.max(0,Math.min(x2-4,b0.x+dx)));if(/e/.test(hh))x2=Math.round(Math.min(W,Math.max(x1+4,x2+dx)));
  if(/n/.test(hh))y1=Math.round(Math.max(0,Math.min(y2-4,b0.y+dy)));if(/s/.test(hh))y2=Math.round(Math.min(D,Math.max(y1+4,y2+dy)));nb={x:x1,y:y1,w:x2-x1,d:y2-y1}}
 else{var fx=Math.round((zd.f0[0]+dx)*2)/2,fy=Math.round((zd.f0[1]+dy)*2)/2;fx=Math.max(z.x+zd.fw/2,Math.min(z.x+z.w-zd.fw/2,fx));fy=Math.max(z.y+zd.fd/2,Math.min(z.y+z.d-zd.fd/2,fy));z.adj=z.adj||{};z.adj[zd.i]=[fx,fy];zRedraw();return}
 if(!zOverlap(nb,z.id)){var shift=nb.x-z.x,shy=nb.y-z.y,resized=nb.w!==z.w||nb.d!==z.d;
  if(resized)z.adj={};else if(z.adj)Object.keys(z.adj).forEach(function(k2){z.adj[k2]=[z.adj[k2][0]+shift,z.adj[k2][1]+shy]});
  z.x=nb.x;z.y=nb.y;z.w=nb.w;z.d=nb.d;zRedraw()}}
function zUp(){window.removeEventListener('pointermove',zMove);window.removeEventListener('pointerup',zUp);window.removeEventListener('pointercancel',zUp);var d=zd;zd=null;if(!d)return;
 if(d.moved){if(d.before!==snapP()){hist.push(d.before);if(hist.length>60)hist.shift();fut=[];persist()}selZ=d.id;sel=null;selO=null;libV=null;render();return}
 selZ=d.id;sel=null;selO=null;libV=null;render()}
// right panel
function zSet(z,fn,keepAdj){var before=snapP();fn(z);if(!keepAdj)z.adj={};if(before!==snapP()){hist.push(before);fut=[];persist()}render()}
function zoneCard(){var z=zBy(selZ);if(!z)return '';var L=zLayout(z),ok=L.fc>=(z.fc||50)*.95,even=L.sx<=L.S+.01&&L.sy<=L.S+.01,moved=z.adj&&Object.keys(z.adj).length,
  opts=Object.keys(LIB).filter(function(r){return isLt(LIB[r])}).map(function(r){return '<option value="'+r+'"'+(z.f===r?' selected':'')+'>'+esc(LIB[r].n)+'</option>'}).join(''),
  row=function(k,v){return '<div class="srw"><span>'+k+'</span><b>'+v+'</b></div>'},stp=function(id,t){return '<button class="zst" data-a="'+id+'" aria-label="'+t+'">'+(id[0]==='-'?'−':'+')+'</button>'};
 return '<div class="card sel zcardp"><div style="display:flex;align-items:center;justify-content:space-between"><span class="lab">Light zone</span><button class="lnk red" id="z-del">Delete</button></div>'+
  '<label class="fl">Fixture<select id="z-f"><option value="">Auto · '+esc(LIB[zAutoF(z)].n)+'</option>'+opts+'</select></label>'+
  '<div class="fl">Light color<div class="zk">'+ZK.map(function(q){return '<button class="zkb'+(zK(z)[0]===q[0]?' on':'')+'" data-k="'+q[0]+'" title="'+q[1]+' · '+q[0]+'K"><i style="background:'+q[3]+'"></i><span>'+q[0]/1000+'K</span></button>'}).join('')+'</div><span class="muted" style="font-size:12px">'+zK(z)[1]+' · '+zK(z)[0]+'K</span></div>'+
  '<label class="fl">Target brightness<span class="zin"><input id="z-fc" type="number" min="5" max="300" step="5" value="'+(z.fc||50)+'" inputmode="numeric"><i>fc</i></span></label>'+
  '<div class="fl">Layout<div class="zlay"><span>'+stp('-c','Fewer columns')+'<b>'+L.cols+'</b>'+stp('+c','More columns')+'<em>across</em></span><span>'+stp('-r','Fewer rows')+'<b>'+L.rows+'</b>'+stp('+r','More rows')+'<em>down</em></span></div>'+(L.auto?'':'<button class="lnk" id="z-auto">Back to automatic count</button>')+'</div>'+
  '<div class="srows">'+row('Fixtures',L.n+(L.n<L.pts.length?' <span class="muted">('+(L.pts.length-L.n)+' blocked)</span>':''))+
  row('Brightness','<span style="color:'+(ok?'#2f7a3a':'#a35a00')+'">'+Math.round(L.fc)+' fc '+(ok?'✓':'· below target')+'</span>')+
  row('Spacing',fmt(Math.round(L.sx*2)/2)+' × '+fmt(Math.round(L.sy*2)/2)+' ft'+(even?'':' <span style="color:#a35a00">· patchy</span>'))+
  row('Power',fmtW(L.W))+row('Size',fmt(z.w)+' × '+fmt(z.d)+' ft')+'</div>'+
  (moved||!L.auto?'<button class="sb" id="z-reset" style="width:100%;margin-top:8px">Reset layout</button>':'')+
  '<p class="muted" style="margin-top:8px">Drag the zone to move it and its edges to resize. Drag a single light to line it up.</p></div>'}
function zoneCardWire(){var z=zBy(selZ);if(!z)return;var g=function(id){return document.getElementById(id)};
 if(g('z-del'))g('z-del').onclick=function(){var before=snapP();P.zones=ZN().filter(function(q){return q.id!==z.id});selZ=null;hist.push(before);fut=[];persist();render()};
 if(g('z-f'))g('z-f').onchange=function(){var v=this.value||null;zSet(z,function(q){q.f=v;q.rc=null})};
 if(g('z-fc'))g('z-fc').onchange=function(){var v=Math.max(5,Math.min(300,+this.value||50));zSet(z,function(q){q.fc=v;q.rc=null})};
 document.querySelectorAll('.zkb').forEach(function(b){b.onclick=function(){var v=+b.dataset.k;zSet(z,function(q){q.k=v},true)}});
 if(g('z-auto'))g('z-auto').onclick=function(){zSet(z,function(q){q.rc=null})};
 if(g('z-reset'))g('z-reset').onclick=function(){zSet(z,function(q){q.rc=null;q.adj={}})};
 document.querySelectorAll('.zst').forEach(function(b){b.onclick=function(){var L=zLayout(z),a=b.dataset.a,c=L.cols,r=L.rows;if(a==='-c')c=Math.max(1,c-1);if(a==='+c')c=Math.min(30,c+1);if(a==='-r')r=Math.max(1,r-1);if(a==='+r')r=Math.min(30,r+1);zSet(z,function(q){q.rc=[c,r]})}})}
// library card: drag it onto the plan
function zoneLibCard(){var dots='';for(var jj=0;jj<2;jj++)for(var ii=0;ii<3;ii++){var cx=2+50*(ii+.5)/3,cy=1+22*(jj+.5)/2;dots+='<circle cx="'+cx+'" cy="'+cy+'" r="5.3" fill="url(#zlg)"/><circle cx="'+cx+'" cy="'+cy+'" r="2.4" fill="#FFE7A3" stroke="#B07A1A" stroke-width=".8"/>'}
 var art='<svg width="78" height="66" viewBox="0 0 78 66" aria-hidden="true"><defs><radialGradient id="zlg"><stop offset="0" stop-color="#FFD66B" stop-opacity=".85"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient></defs><path d="M14 26 L4 62 H74 L64 26 Z" fill="#FFE29A" opacity=".35"/><ellipse cx="39" cy="61" rx="34" ry="4" fill="#FFD66B" opacity=".45"/><g transform="translate(12 4) rotate(-4 27 12)"><rect x="2" y="4" width="54" height="24" rx="5" fill="rgba(0,0,0,.18)"/><rect width="54" height="24" rx="5" fill="#2b2e35" stroke="#B07A1A" stroke-width="1.2" stroke-dasharray="3 2"/>'+dots+'</g></svg>';
 return '<div class="flib zlib" role="button" tabindex="0" title="Drag onto the plan"><div class="flart">'+art+'<i style="left:46px;top:14px">'+FHAND+'</i></div><div><b>Light zone</b><span>Paint an area; the lights are laid out for you.</span><em>Drag onto the plan <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></em></div></div>'}
var zl=null;
function zTip(on,x,y){var t=document.getElementById('zltip');if(!on){if(t)t.remove();return}if(!t){t=document.createElement('div');t.id='zltip';t.className='fltip';t.textContent='Let go to place the light zone';document.body.appendChild(t)}t.style.transform='translate('+(x-95)+'px,'+(y-58)+'px)'}
function zoneLibWire(){var c=document.querySelector('#lib .zlib');if(!c)return;
 c.onpointerdown=function(e){if(e.button>0)return;zl={sx:e.clientX,sy:e.clientY,on:false};c.setPointerCapture&&c.setPointerCapture(e.pointerId)};
 c.onpointermove=function(e){if(!zl)return;if(!zl.on){if(Math.hypot(e.clientX-zl.sx,e.clientY-zl.sy)<6)return;zl.on=true;c.classList.add('lifted');document.body.classList.add('ldragging');var ch=document.createElement('div');ch.className='ldchip';ch.innerHTML='<div class="lart">'+c.querySelector('svg').outerHTML+'</div><span>Light zone</span>';document.body.appendChild(ch);zl.chip=ch}
  zl.chip.style.transform='translate('+(e.clientX+14)+'px,'+(e.clientY+14)+'px)';var r=sv.getBoundingClientRect(),over=e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom,k=1/scale();zl.chip.classList.toggle('over',over);
  if(!over){G.ghost.innerHTML='';zl.b=null;zTip(false);return}var p=toFt(e),b=zFit(p.x,p.y);zl.b=b;zTip(!!b,e.clientX,e.clientY);G.ghost.innerHTML=b?'<rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.d+'" fill="rgba(239,159,39,.16)" stroke="#BA7517" stroke-width="'+(1.8*k)+'" stroke-dasharray="'+(6*k)+' '+(4*k)+'" pointer-events="none"/>':''};
 c.onpointerup=c.onpointercancel=function(e){var s=zl;zl=null;if(!s)return;G.ghost.innerHTML='';zTip(false);c.classList.remove('lifted');document.body.classList.remove('ldragging');if(s.chip)s.chip.remove();
  if(!s.on){viewLib({zone:1});return}if(e.type==='pointerup'&&s.b)zAdd(s.b.x+s.b.w/2,s.b.y+s.b.d/2)};
 c.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();viewLib({zone:1})}}}
