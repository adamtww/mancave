/* ---------- objects: the Layout step ---------- */
/* Objects come from the app's own catalog (catalog.js) and drawings (icons.js), unchanged.
   Each placed object belongs to one named zone (it.zone) and stays inside it. Positions are in feet,
   same convention as the app: x,y = top-left, w,d = as placed (already swapped when rotated), rot = 0..3. */
var CATZ={'Arcade & Gaming':['games','lounge'],'Bar & Lounge':['bar','lounge'],'Kitchen – Residential':['bar'],'Kitchen – Commercial':['bar'],'Fitness':['games'],'Court & Rink':['games'],
 'Creator / Maker':['shop','office'],'Woodworking':['shop'],'Indoor Garden':['lounge','store','shop'],'Building & Support':['store','shop','office'],'Wishlist':['games','lounge','shop']};
var lPlace=null,lSel=null,lGhost=null,lQ='',lOpen={};
function oCat(it){return BY[it.r]||null}
function oTypes(c){var t=c&&CATZ[c.c];return t||ZT.map(function(z){return z.id})}
function oNeedsWater(c){return !!c&&((c.a||[]).indexOf('plumbing')>=0||/sink|dishwasher|ice m/i.test(c.n))}
function zWater(z){var t=ZTB[z.type];return !!t&&(t.pl==='on'||(t.pl==='opt'&&!!z.plumb))}
function zFits(z,c){return zPlaced(z)&&oTypes(c).indexOf(z.type)>=0&&(!oNeedsWater(c)||zWater(z))}
function fitZones(c){return (S.zones||[]).filter(function(z){return zFits(z,c)})}
function oById(u){for(var i=0;i<(S.objs||[]).length;i++)if(S.objs[i].u===u)return S.objs[i];return null}
function oCr(it){var c=it.cl||0;if(it.cm!=='front')return {x:it.x-c,y:it.y-c,w:it.w+2*c,d:it.d+2*c};switch((it.rot||0)%4){case 1:return {x:it.x-c,y:it.y,w:c,d:it.d};case 2:return {x:it.x,y:it.y-c,w:it.w,d:c};case 3:return {x:it.x+it.w,y:it.y,w:c,d:it.d};default:return {x:it.x,y:it.y+it.d,w:it.w,d:c}}}
function oFront(it){switch((it.rot||0)%4){case 1:return [it.x,it.y,it.x,it.y+it.d];case 2:return [it.x,it.y,it.x+it.w,it.y];case 3:return [it.x+it.w,it.y,it.x+it.w,it.y+it.d];default:return [it.x,it.y+it.d,it.x+it.w,it.y+it.d]}}
function oHit(a,b){return a.x<b.x+b.w-1e-6&&b.x<a.x+a.w-1e-6&&a.y<b.y+b.d-1e-6&&b.y<a.y+a.d-1e-6}
function segHitsRect(a,b,r){var e=1e-6;if(Math.max(a.x,b.x)<=r.x+e||Math.min(a.x,b.x)>=r.x+r.w-e||Math.max(a.y,b.y)<=r.y+e||Math.min(a.y,b.y)>=r.y+r.d-e)return false;
 function inR(p){return p.x>r.x+e&&p.x<r.x+r.w-e&&p.y>r.y+e&&p.y<r.y+r.d-e}if(inR(a)||inR(b))return true;
 var cs=[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.d],[r.x,r.y+r.d]];for(var i=0;i<4;i++){var c=cs[i],d=cs[(i+1)%4];if(crossSeg(a,b,{x:c[0],y:c[1]},{x:d[0],y:d[1]}))return true}return false}
function crossSeg(p1,p2,p3,p4){function o(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}var d1=o(p3,p4,p1),d2=o(p3,p4,p2),d3=o(p1,p2,p3),d4=o(p1,p2,p4);return ((d1>1e-9&&d2<-1e-9)||(d1<-1e-9&&d2>1e-9))&&((d3>1e-9&&d4<-1e-9)||(d3<-1e-9&&d4>1e-9))}
// is this rectangle a legal spot in zone z (inside it, off walls, off other objects)?
function oFitsAt(r,z,skip){if(!z||!zPlaced(z))return false;var cs=[{x:r.x+.01,y:r.y+.01},{x:r.x+r.w-.01,y:r.y+.01},{x:r.x+r.w-.01,y:r.y+r.d-.01},{x:r.x+.01,y:r.y+r.d-.01}];if(!cs.every(function(p){return inMP(p,z.mp)}))return false;
 var e=.01,inner=false;z.mp.forEach(function(pg){pg.forEach(function(rg){rg.forEach(function(q){if(q[0]>r.x+e&&q[0]<r.x+r.w-e&&q[1]>r.y+e&&q[1]<r.y+r.d-e)inner=true})})});if(inner)return false;
 if(S.walls.some(function(w){for(var k=0;k<w.pts.length-1;k++)if(segHitsRect(w.pts[k],w.pts[k+1],r))return true;return false}))return false;
 if(S.blk.some(function(b){var f=flat(b.pts),bb=bbox(f);return oHit(r,{x:bb.x0,y:bb.y0,w:bb.x1-bb.x0,d:bb.y1-bb.y0})&&cs.concat([{x:r.x+r.w/2,y:r.y+r.d/2}]).some(function(p){return inRing(p,f.map(function(q){return [q.x,q.y]}))})}))return false;
 return !(S.objs||[]).some(function(o){return o!==skip&&oHit(r,o)})}
// clearance trouble: another object's body inside this one's clear space
function oBad(it){var c=oCr(it);return (S.objs||[]).some(function(o){return o!==it&&(oHit(c,o)||oHit(oCr(o),it))})}
function oClrWall(it){if(!it.cl)return false;var c=oCr(it);return fillSegs().some(function(sg){return segHitsRect(sg[0],sg[1],c)})}
function oProblem(it){var z=zById(it.zone),c=oCat(it);if(!z)return 'Its zone was deleted. Pick a zone for it.';if(!zPlaced(z))return z.name+' isn\'t on the plan.';
 if(oTypes(c).indexOf(z.type)<0)return 'Doesn\'t belong in a '+ZTB[z.type].n+' zone.';if(oNeedsWater(c)&&!zWater(z))return 'Needs plumbing, and '+z.name+' doesn\'t have it.';
 if(!oFitsAt(it,z,it))return 'Sits outside '+z.name+' or over a wall.';if(oBad(it))return 'Its clear space overlaps another object.';if(oClrWall(it))return 'Its clear space runs into a wall.';return ''}
// first free spot in a zone: scan the zone in half-foot steps, walls first
function oFindSpot(z,w,d,skip,near,proto){if(!zPlaced(z))return null;var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;z.mp.forEach(function(pg){pg[0].forEach(function(q){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])})});
 var best=null,bestClean=null,pr=proto||{cl:0,cm:'all',rot:0};
 for(var y=Math.ceil(y0*2)/2;y+d<=y1+1e-6;y+=.5)for(var x=Math.ceil(x0*2)/2;x+w<=x1+1e-6;x+=.5){var r={x:x,y:y,w:w,d:d};if(!oFitsAt(r,z,skip))continue;var sc=near?Math.hypot(x+w/2-near.x,y+d/2-near.y):(y-y0)*1e4+(x-x0);
  if(!best||sc<best.sc)best={sc:sc,r:r};var t={x:x,y:y,w:w,d:d,cl:pr.cl,cm:pr.cm,rot:pr.rot};if((!bestClean||sc<bestClean.sc)&&!(S.objs||[]).some(function(o){return o!==skip&&(oHit(oCr(t),o)||oHit(oCr(o),t))})&&!oClrWall(t))bestClean={sc:sc,r:r}}
 return bestClean?bestClean.r:best?best.r:null}
function oNew(r,z,at){var c=BY[r],it={u:'o'+(S.oid=(S.oid||1)+1),r:r,name:c.n.replace(/ \(\$[^)]*\)/,''),x:at.x,y:at.y,w:c.w,d:c.d,cl:c.cl||0,cm:c.cf?'front':'all',rot:0,zone:z.id};S.objs.push(it);return it}

/* ---- power, as the app works it out: p = [volts, watts, breaker amps, dedicated?] ---- */
function fmtW(w){return w>=1000?(Math.round(w/100)/10).toLocaleString('en-US')+' kW':Math.round(w)+' W'}
function powerOf(list){var o={items:0,w:0,max:0,est:0,ded:{},sh:{}};list.forEach(function(i){var c=oCat(i);if(!c||!c.p)return;var V=c.p[0],W=c.p[1],A=c.p[2];o.items++;o.w+=W;o.max=Math.max(o.max,W);if(c.est)o.est++;
  if(c.p[3]){var k=V+'|'+A;(o.ded[k]=o.ded[k]||{V:V,A:A,names:[]}).names.push(i.name)}else{(o.sh[V]=o.sh[V]||{V:V,w:0,n:0});o.sh[V].w+=W;o.sh[V].n++}});
 o.peak=o.items?o.max+(o.w-o.max)*0.5:0;o.circ=[];o.slots=0;
 Object.keys(o.ded).map(function(k){return o.ded[k]}).sort(function(a,b){return b.V-a.V||b.A-a.A}).forEach(function(d){o.circ.push({V:d.V,A:d.A,kind:'dedicated',n:d.names.length,note:d.names.join(', ')});o.slots+=d.names.length*(d.V>=208?2:1)});
 Object.keys(o.sh).map(function(k){return o.sh[k]}).forEach(function(g){var cap=g.V*20*0.8,n=Math.max(1,Math.ceil(g.w/cap));o.circ.push({V:g.V,A:20,kind:'shared',n:n,note:g.n+' item'+(g.n>1?'s':'')+' · '+fmtW(g.w)});o.slots+=n*(g.V>=208?2:1)});
 return o}
function powerHtml(o){if(!o.items)return '<p class="zmuted">No powered objects yet.</p>';var ap=o.est?'≈ ':'';
 var h='<div class="zstats"><span>Connected load</span><b>'+ap+fmtW(o.w)+'</b><span>Likely peak</span><b>≈ '+fmtW(o.peak)+'</b><span>Breaker slots</span><b>'+o.slots+'</b></div><div class="lcirc">';
 o.circ.forEach(function(c){h+='<div><span>'+c.V+'V · '+c.A+'A <em>'+c.kind+'</em></span><b>×'+c.n+'</b><small>'+zEsc(c.note)+'</small></div>'});return h+'</div>'}

/* ---- the app's library + drag-in, adapted from rooms to zones ---- */
var ghost=null,cdrag=null,libPick=null,libOpen={},popU=null;
function fmtN(n){return (Math.round(n*10)/10).toLocaleString('en-US')}
function snapH(v){return Math.round(v*2)/2}
function svR(){return sv.getBoundingClientRect()}
function w2s(x,y){var r=svR();return {x:r.left+X(x),y:r.top+Y(y)}}
// half-foot offsets out to 12 ft, nearest first: used to find the closest free spot under the pointer
var OFFS=(function(){var o=[];for(var i=-24;i<=24;i++)for(var j=-24;j<=24;j++)o.push([i/2,j/2,Math.hypot(i,j)]);o.sort(function(a,b){return a[2]-b[2]});return o})();
function baseWD(r){if(cdrag&&cdrag.mv&&cdrag.mv.it.r===r){var it=cdrag.mv.it,sw=(it.rot||0)%2;return {W:sw?it.d:it.w,D:sw?it.w:it.d}}var c=BY[r];return {W:c.w,D:c.d}}
function mkGhost(r,rot){var c=BY[r],b=baseWD(r);rot=(rot||0)%4;var sw=rot%2;return {r:r,name:cdrag&&cdrag.mv?cdrag.mv.it.name:c.n.replace(/ \(\$[^)]*\)/,''),x:0,y:0,w:sw?b.D:b.W,d:sw?b.W:b.D,cl:c.cl||0,cm:c.cf?'front':'all',rot:rot}}
// nearest spot in zone z: prefer one where both clear spaces stay free, else the nearest the body fits
function clrClash(t){return (S.objs||[]).some(function(o){return (o.cl>0&&oHit(t,oCr(o)))||(t.cl>0&&oHit(o,oCr(t)))})}
function spotNear(z,rot,px,py){var g=mkGhost(cdrag.r,rot),x0=snapH(px-g.w/2),y0=snapH(py-g.d/2),first=null;
 for(var k=0;k<OFFS.length;k++){var t={x:x0+OFFS[k][0],y:y0+OFFS[k][1],w:g.w,d:g.d,cl:g.cl,cm:g.cm,rot:g.rot};if(!oFitsAt(t,z,null))continue;if(!first)first=t;if(!clrClash(t)){first=t;break}}
 if(!first)return null;g.x=first.x;g.y=first.y;g.dist=Math.hypot(g.x+g.w/2-px,g.y+g.d/2-py);return g}
function fitGhost(){if(!cdrag)return;var px=cdrag.wx,py=cdrag.wy,c=BY[cdrag.r],z=zoneAt({x:px,y:py});
 if(!z||!zFits(z,c)){ghost=mkGhost(cdrag.r,cdrag.rot);ghost.x=snapH(px-ghost.w/2);ghost.y=snapH(py-ghost.d/2);ghost.noRoom=true;ghost.zone=z;ghost.why=!z?'none':oTypes(c).indexOf(z.type)<0?'type':'water';return}
 var a=spotNear(z,cdrag.rot,px,py),b=spotNear(z,(cdrag.rot+1)%4,px,py),pick=a&&(!b||a.dist<=b.dist+3)?a:b;
 if(!pick){ghost=mkGhost(cdrag.r,cdrag.rot);ghost.x=snapH(px-ghost.w/2);ghost.y=snapH(py-ghost.d/2);ghost.noRoom=true;ghost.zone=z;ghost.why='big';return}
 ghost=pick;ghost.zone=z;ghost.noRoom=false}
function ghostBad(){if(!ghost)return false;if(ghost.noRoom)return true;var g=ghost;if(!oFitsAt(g,g.zone,null))return true;
 return (S.objs||[]).some(function(o){return (o.cl>0&&oHit(g,oCr(o)))||(g.cl>0&&oHit(o,oCr(g)))})}
function whyText(g){var c=BY[g.r],need=oTypes(c).map(function(t){return ZTB[t].n}).join(' or ');
 if(g.why==='none')return 'Objects go inside a zone. This one fits a '+need+' zone'+(oNeedsWater(c)?' with plumbing':'')+'.';
 if(g.why==='type')return g.zone.name+' is a '+ZTB[g.zone.type].n+' zone. This goes in a '+need+' zone.';
 if(g.why==='water')return 'This needs plumbing, and '+g.zone.name+' doesn\'t have it.';
 return 'Too big for '+g.zone.name+', even turned sideways.'}
function overStage(e){var r=svR();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom}
function blockScroll(ev){ev.preventDefault()}
// moving a placed object: pick it up off the floor and carry it exactly like a card from the library
function objLift(e,d){var it=d.it,ix=S.objs.indexOf(it);if(ix<0)return;push();S.objs.splice(ix,1);lSel=null;
 cdrag={r:it.r,sx:d.cx,sy:d.cy,lx:e.clientX,ly:e.clientY,on:true,rot:it.rot||0,chip:null,pid:d.pid,touch:d.touch,hold:false,src:null,mv:{it:it,ix:ix}};
 document.body.classList.add('dragging');document.addEventListener('touchmove',blockScroll,{passive:false});
 var ch=document.createElement('div');ch.className='chip cardchip onc';ch.style.width='0';ch.style.height='0';var hg=document.createElement('div');hg.className='hang';
 if(cdrag.touch){ch.classList.add('tch');ch.dataset.k='70';var rp=document.createElement('div');rp.className='rope';hg.appendChild(rp)}
 var hb=document.createElement('div');hb.className='hbox';hb.innerHTML='<span></span>';hg.appendChild(hb);ch.appendChild(hg);if(cdrag.touch){var hk=document.createElement('div');hk.className='hook';ch.appendChild(hk)}
 document.body.appendChild(ch);cdrag.chip=ch;cdrag.card={ox:0,oy:0,rc:null,hb:hb};ch.style.left=e.clientX+'px';ch.style.top=e.clientY+'px';dangle(ch,hg);moveGhost(e)}
function objRestore(mv){if(S.objs.indexOf(mv.it)<0)S.objs.splice(Math.min(mv.ix,S.objs.length),0,mv.it);hist.pop();btns();lSel=mv.it.u;render()}
function liftOff(){if(!cdrag||cdrag.on)return;cdrag.on=true;document.body.classList.add('dragging');document.addEventListener('touchmove',blockScroll,{passive:false});
 var ch=document.createElement('div'),rc=cdrag.src.getBoundingClientRect();ch.className='chip cardchip';var cc=cdrag.src.cloneNode(true);cc.classList.remove('lift','sel');cc.style.setProperty('--c',cdrag.src.style.getPropertyValue('--c'));
 var ox=Math.max(8,Math.min(rc.width-8,(cdrag.lx||cdrag.sx)-rc.left)),oy=Math.max(8,Math.min(rc.height-8,(cdrag.ly||cdrag.sy)-rc.top));ch.style.width='0';ch.style.height='0';
 var hg=document.createElement('div');hg.className='hang';cc.style.cssText+=';position:absolute;left:'+(-ox)+'px;top:'+(-oy)+'px;width:'+rc.width+'px;height:'+rc.height+'px;transform-origin:'+ox+'px '+oy+'px';
 var hb=document.createElement('div');hb.className='hbox';hb.innerHTML='<span></span>';hg.appendChild(cc);if(cdrag.touch){ch.classList.add('tch');ch.dataset.k='70';var rp=document.createElement('div');rp.className='rope';hg.appendChild(rp)}hg.appendChild(hb);ch.appendChild(hg);
 if(cdrag.touch){var hk=document.createElement('div');hk.className='hook';ch.appendChild(hk)}cdrag.card={ox:ox,oy:oy,rc:rc,hb:hb};dangle(ch,hg);
 document.body.appendChild(ch);cdrag.chip=ch;ch.style.left=(cdrag.lx||cdrag.sx)+'px';ch.style.top=(cdrag.ly||cdrag.sy)+'px';cdrag.src.classList.add('lift')}
// the lifted card swings from the grab point like it's hanging there: a damped pendulum pushed by sideways motion
function dangle(ch,cc){var th=0,om=0,lx=null,vx=0,t0=performance.now();
 function stepf(t){if(!ch.isConnected||ch.dataset.done)return;var dt=Math.min(0.05,(t-t0)/1000)||0.016;t0=t;var x=parseFloat(ch.style.left)||0;if(lx===null)lx=x;var v=(x-lx)/dt;lx=x;vx+=(v-vx)*Math.min(1,dt*18);
  var K=+(ch.dataset.k||170),acc=-K*(th-Math.max(-38,Math.min(38,vx*0.035)))-(K<170?3.6:5.5)*om;om+=acc*dt;th+=om*dt;th=Math.max(-55,Math.min(55,th));
  if(ch.style.display!=='none')cc.style.transform='rotate('+th.toFixed(2)+'deg)';requestAnimationFrame(stepf)}requestAnimationFrame(stepf)}
function startDrag(e,r){if(e.button!==undefined&&e.button!==0)return;if(step!=='layout')return;if(cdrag&&cdrag.on&&e.pointerType==='touch')return;
 var src=e.target.closest('.lcard');cdrag={r:r,sx:e.clientX,sy:e.clientY,on:false,rot:0,chip:null,pid:e.pointerId,touch:e.pointerType==='touch',hold:e.pointerType==='touch',src:src};
 if(cdrag.hold){cdrag.timer=setTimeout(liftOff,320)}else e.preventDefault()}
window.addEventListener('pointerdown',function(e){if(cdrag&&cdrag.on&&e.pointerType==='touch'&&e.pointerId!==cdrag.pid){rotateGhost();e.preventDefault();e.stopPropagation()}},true);
function rotateGhost(){cdrag.rot=(cdrag.rot+1)%4;if(ghost){fitGhost();if(cdrag.card)heldSync(true);render()}}
document.addEventListener('pointerdown',function(e){var b=e.target.closest&&e.target.closest('#l-cats .lcard');if(b)startDrag(e,b.dataset.r)});
document.addEventListener('contextmenu',function(e){if(e.target.closest&&e.target.closest('.lcard'))e.preventDefault()});
window.addEventListener('pointermove',function(e){if(!cdrag||e.pointerId!==cdrag.pid)return;
 if(!cdrag.on){var dist=Math.hypot(e.clientX-cdrag.sx,e.clientY-cdrag.sy);
  if(cdrag.hold){var adx=Math.abs(e.clientX-cdrag.sx),ady=Math.abs(e.clientY-cdrag.sy);
   // a sideways swipe (toward the plan) picks the card up straight away; an up/down swipe scrolls the list
   if(adx>7&&adx>ady*1.15){clearTimeout(cdrag.timer);liftOff()}else{if(dist>8){clearTimeout(cdrag.timer);cdrag=null}return}}
  else{if(dist<5)return;liftOff()}}
 cdrag.lx=e.clientX;cdrag.ly=e.clientY;moveGhost(e)});
window.addEventListener('pointerup',function(e){endCDrag(e,false)});window.addEventListener('pointercancel',function(e){endCDrag(e,true)});
document.addEventListener('keydown',function(e){if(!cdrag||!cdrag.on)return;if(e.key==='Escape'){endCDrag(null,true);e.stopPropagation()}else if(e.key==='r'||e.key==='R'){rotateGhost();e.stopPropagation()}},true);
function moveGhost(e){var over=overStage(e);
 if(cdrag.card){cdrag.chip.style.display='block';cdrag.chip.style.left=e.clientX+'px';cdrag.chip.style.top=e.clientY+'px'}
 if(over){if(!ghost||ghost.r!==cdrag.r)ghost=mkGhost(cdrag.r,cdrag.rot);var p=toFt(e),gap=(cdrag.touch?30:16)/view.s,g0=mkGhost(cdrag.r,cdrag.rot);
  // the landing preview sits up-left of the finger so it's never hidden under it
  cdrag.wx=p.x-g0.w/2-gap;cdrag.wy=p.y-g0.d/2-gap;fitGhost();heldSync(true)}
 else{ghost=null;heldSync(false)}
 render()}
// the held box: the object at true size (with its drawing), hanging off the pointer while the snapped preview sits on the floor
var ROPE=72;
function heldSync(on){var cd=cdrag.card;if(!cd)return;cdrag.chip.classList.toggle('onc',!!on);if(!on||!ghost)return;var k=view.s,hb=cd.hb,k2=Math.min(2.2,Math.max(1,26/Math.min(ghost.w*k,ghost.d*k))),w=ghost.w*k*k2,d=ghost.d*k*k2,bad=ghostBad();
 hb.style.width=w+'px';hb.style.height=d+'px';if(!cdrag.chip.classList.contains('drop')){hb.style.left=(-w/2)+'px';hb.style.top=(cdrag.touch?ROPE:10)+'px'}hb.style.borderRadius=Math.max(3,0.25*k)+'px';hb.classList.toggle('bad',bad);
 var b=baseWD(ghost.r),key=ghost.r+':'+ghost.rot+':'+b.W+'x'+b.D;if(hb.dataset.k!==key){hb.dataset.k=key;var f=ICONS[ghost.r];hb.classList.toggle('art',!!f);
  hb.innerHTML=f?'<svg viewBox="'+(-ghost.w/2)+' '+(-ghost.d/2)+' '+ghost.w+' '+ghost.d+'" preserveAspectRatio="none" style="overflow:visible"><g transform="rotate('+(ghost.rot*90)+')">'+f(b.W,b.D)+'</g></svg>':'<span>'+esc(ghost.name)+'</span>'}
 var sp=hb.querySelector('span');if(sp)sp.style.fontSize=Math.max(9,Math.min(13,Math.min(w,d)/4))+'px'}
function placeG(g){var it=oNew(g.r,g.zone,g);it.w=g.w;it.d=g.d;it.rot=g.rot;return it}
function endCDrag(e,cancel){if(!cdrag)return;if(e&&e.pointerId!==undefined&&e.pointerId!==cdrag.pid)return;var d=cdrag;cdrag=null;clearTimeout(d.timer);document.removeEventListener('touchmove',blockScroll);document.body.classList.remove('dragging');
 var keepChip=!!(d.card&&d.on&&!cancel);if(d.mv&&!keepChip){if(d.chip)d.chip.remove();ghost=null;objRestore(d.mv);return}if(d.chip&&!keepChip)d.chip.remove();if(d.src&&!keepChip)d.src.classList.remove('lift');
 if(!d.on){if(!cancel&&d.src){libPick=d.r;lSel=null;lPanelKey='';render()}return}
 var g=ghost,okDrop=!!g&&!ghostBad();ghost=null;var ok=!cancel&&g&&e&&overStage(e)&&okDrop;
 if(keepChip){if(ok)heldDrop(d,g);else{heldReturn(d);if(!cancel&&g)toast(g.noRoom?whyText(g):'No room there with its clear space')}}else render()}
// drop: the held box swings level and slides into the preview spot, then the object lands with a puff of dust
function heldDrop(d,g){var ch=d.chip,hg=ch.firstChild,hb=d.card.hb,P=w2s(g.x,g.y),Q=w2s(g.x+g.w,g.y+g.d),cx=parseFloat(ch.style.left),cy=parseFloat(ch.style.top);
 ch.classList.add('drop');ch.dataset.done='1';hg.style.transform='rotate(0deg)';hb.style.left=(P.x-cx)+'px';hb.style.top=(P.y-cy)+'px';
 var sh=document.createElement('div');sh.className='dshadow';sh.style.left=P.x+'px';sh.style.top=P.y+'px';sh.style.width=(Q.x-P.x)+'px';sh.style.height=(Q.y-P.y)+'px';document.body.appendChild(sh);void sh.offsetWidth;sh.classList.add('on');setTimeout(function(){sh.classList.add('off');setTimeout(function(){sh.remove()},180)},160);
 setTimeout(function(){ch.remove();if(d.src)d.src.classList.remove('lift');
  if(d.mv){var mi=d.mv.it;mi.x=g.x;mi.y=g.y;mi.w=g.w;mi.d=g.d;mi.rot=g.rot;mi.zone=g.zone.id;if(S.objs.indexOf(mi)<0)S.objs.splice(Math.min(d.mv.ix,S.objs.length),0,mi);lSel=mi.u;popU=mi.u;render();poof(g);setTimeout(function(){if(popU===mi.u)popU=null},320);return}
  push();var it=placeG(g);lSel=it.u;libPick=null;popU=it.u;render();poof(g);toast(it.name+' added to '+g.zone.name);setTimeout(function(){if(popU===it.u)popU=null},320)},155)}
// can't place: turn back into the card and float home to its slot (or put the object back where it was)
function heldReturn(d){if(d.mv){var ch0=d.chip,hb0=d.card.hb,it0=d.mv.it,q=w2s(it0.x,it0.y),cx0=parseFloat(ch0.style.left),cy0=parseFloat(ch0.style.top);ch0.classList.add('drop');ch0.dataset.done='1';ch0.firstChild.style.transform='rotate(0deg)';hb0.style.left=(q.x-cx0)+'px';hb0.style.top=(q.y-cy0)+'px';setTimeout(function(){ch0.remove();objRestore(d.mv)},160);return}
 var ch=d.chip,cd=d.card,src=d.src,r=src&&src.isConnected?src.getBoundingClientRect():cd.rc;ch.classList.remove('onc');ch.classList.add('home');ch.dataset.done='1';ch.firstChild.style.transform='rotate(0deg)';
 ch.style.left=(r.left+cd.ox)+'px';ch.style.top=(r.top+cd.oy)+'px';setTimeout(function(){ch.remove();if(src)src.classList.remove('lift')},300);render()}
// landing: soft blurred smoke rolls out from the footprint edges (plus a tiny buzz where the device supports it)
function poof(g){try{if(navigator.vibrate)navigator.vibrate(12)}catch(e){}var a=w2s(g.x,g.y),b=w2s(g.x+g.w,g.y+g.d);
 var w=b.x-a.x,h=b.y-a.y,sz=Math.max(10,Math.min(26,Math.min(w,h)*0.32+6)),M=sz*5,NS='http://www.w3.org/2000/svg',R=function(x,y){return x+Math.random()*(y-x)};
 var box=document.createElement('div');box.className='poof';box.style.left=(a.x-M)+'px';box.style.top=(a.y-M)+'px';box.style.width=(w+2*M)+'px';box.style.height=(h+2*M)+'px';
 var s2=document.createElementNS(NS,'svg');s2.setAttribute('width',w+2*M);s2.setAttribute('height',h+2*M);s2.setAttribute('viewBox',(-M)+' '+(-M)+' '+(w+2*M)+' '+(h+2*M));
 var bl=sz*0.28;s2.innerHTML='<defs><filter id="smk" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="'+bl.toFixed(1)+'"/></filter><filter id="smk2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="'+(bl*0.45).toFixed(1)+'"/></filter></defs>';
 function edgePts(n){var o=[];for(var i=0;i<n;i++){var t=((i+R(-.3,.3))/n+1)%1,px,py,nx,ny;if(t<.25){px=t*4*w;py=0;nx=0;ny=-1}else if(t<.5){px=w;py=(t-.25)*4*h;nx=1;ny=0}else if(t<.75){px=w-(t-.5)*4*w;py=h;nx=0;ny=1}else{px=0;py=h-(t-.75)*4*h;nx=-1;ny=0}o.push([px,py,nx,ny])}return o}
 function cloud(cx,cy,r,fill,f,o){var gg=document.createElementNS(NS,'g'),n=4+Math.floor(R(0,3)),hh='';for(var i=0;i<n;i++){var an=i/n*6.28+R(-.4,.4),dd=r*R(.25,.55);hh+='<circle cx="'+(cx+Math.cos(an)*dd)+'" cy="'+(cy+Math.sin(an)*dd*0.8)+'" r="'+(r*R(.45,.7))+'" fill="'+fill+'"/>'}
  gg.innerHTML=hh+'<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*.6)+'" fill="'+fill+'"/>';gg.setAttribute('filter','url(#'+f+')');gg.setAttribute('class','sp');for(var k in o)gg.style.setProperty(k,o[k]);gg.style.animationDelay=R(0,60)+'ms';s2.appendChild(gg)}
 var per=Math.max(7,Math.min(16,Math.round((w+h)/(sz*1.6))));
 edgePts(per).forEach(function(q){cloud(q[0],q[1],sz*R(1,1.4),'#d6cfbf','smk',{'--x':(q[2]*sz*R(1.3,2.3))+'px','--y':(q[3]*sz*R(1.3,2.3)-sz*0.4)+'px','--s1':R(1.4,1.9),'--r':R(-20,20)+'deg','--o':.72})});
 edgePts(Math.round(per*0.8)).forEach(function(q){cloud(q[0],q[1],sz*R(.65,.9),'#eeeae2','smk2',{'--x':(q[2]*sz*R(.7,1.5))+'px','--y':(q[3]*sz*R(.7,1.5)-sz*0.5)+'px','--s1':1.5,'--o':.85})});
 box.appendChild(s2);document.body.appendChild(box);setTimeout(function(){box.remove()},650)}

/* ---- drawing on the plan (feet space inside one transformed group, so the app's drawings work unchanged) ---- */
function objsSvg(){var os=S.objs||[];if(!os.length&&!ghost)return '';var live=step==='layout',h='<g transform="translate('+view.ox+' '+view.oy+') scale('+view.s+')"'+(live?'':' opacity=".45"')+' style="pointer-events:'+(live?'auto':'none')+'">',px=1/view.s;
 os.forEach(function(it){var bad=live&&!!oProblem(it),on=live&&lSel===it.u,c=oCat(it),art=c&&ICONS[it.r];
  if(it.cl>0){var q=oCr(it);h+='<rect x="'+q.x+'" y="'+q.y+'" width="'+q.w+'" height="'+q.d+'" fill="'+(bad?'rgba(214,69,69,.08)':it.cm==='front'?'rgba(150,140,120,.07)':'none')+'" stroke="'+(bad?'#d64545':'#b9b4a8')+'" stroke-width="'+px+'" stroke-dasharray="'+(5*px)+' '+(4*px)+'" pointer-events="none"/>'}
  h+='<g data-obj="'+it.u+'"'+(popU===it.u?' class="opop"':'')+' style="cursor:'+(live?'grab':'default')+';transform-box:fill-box;transform-origin:center"><rect x="'+it.x+'" y="'+it.y+'" width="'+it.w+'" height="'+it.d+'" rx="0.25" fill="'+(art?'#fbfaf7':'#e8e5de')+'" stroke="'+(bad?'#d64545':on?'#2f7de1':'#9d988c')+'" stroke-width="'+((bad||on?2.2:1.2)*px)+'"/>';
  if(art)h+=iconFor(it);if(it.cm==='front'){var fe=oFront(it);h+='<line x1="'+fe[0]+'" y1="'+fe[1]+'" x2="'+fe[2]+'" y2="'+fe[3]+'" stroke="#5f5b52" stroke-width="'+(2.5*px)+'" pointer-events="none"/>'}
  var fs=11*px,show=on||(it.w*view.s>46&&it.d*view.s>18&&!art);if(show){var t=it.name.length>22?it.name.slice(0,21)+'…':it.name;h+='<text x="'+(it.x+it.w/2)+'" y="'+(it.y+it.d/2+fs*.35)+'" text-anchor="middle" font-size="'+fs+'" font-weight="'+(on?700:500)+'" fill="'+(on?'#1d4f91':'#3a3936')+'" stroke="#fff" stroke-width="'+(3*px)+'" paint-order="stroke" pointer-events="none">'+esc(t)+'</text>'}else h+='<title>'+esc(it.name)+'</title>';
  h+='</g>'});
 if(ghost&&live&&cdrag){var gb=ghostBad(),g=ghost;
  if(g.cl>0){var gq=oCr(g);h+='<rect x="'+gq.x+'" y="'+gq.y+'" width="'+gq.w+'" height="'+gq.d+'" fill="'+(gb?'rgba(214,69,69,.06)':'rgba(47,111,237,.05)')+'" stroke="'+(gb?'#d64545':'#2f7de1')+'" stroke-width="'+px+'" stroke-dasharray="'+(4*px)+' '+(3*px)+'" pointer-events="none"/>'}
  // landing preview: marching ants; the phase follows the clock so re-renders while dragging don't restart it
  var adl=6*px,agp=4.5*px,aper=adl+agp,aph=-((performance.now()%600)/600)*aper,ac=gb?'#d64545':'#3f8a4f',gr=' x="'+g.x+'" y="'+g.y+'" width="'+g.w+'" height="'+g.d+'" rx="0.25" pointer-events="none"';
  h+='<rect'+gr+' fill="'+(gb?'rgba(214,69,69,.16)':'rgba(63,138,79,.16)')+'" stroke="#fff" stroke-width="'+(2.2*px)+'"/><rect'+gr+' fill="none" stroke="'+ac+'" stroke-width="'+(2.2*px)+'" stroke-dasharray="'+adl+' '+agp+'" stroke-dashoffset="'+aph+'"><animate attributeName="stroke-dashoffset" from="'+aph+'" to="'+(aph-aper)+'" dur="0.6s" repeatCount="indefinite"/></rect>';
  if(g.noRoom&&g.zone===null){}}
 return h+'</g>'}

/* ---- pointer on the plan in Layout ---- */
function lDown(e,p,t){var og=t.closest&&t.closest('[data-obj]');
 if(e._tap){var it0=og&&oById(og.dataset.obj);lSel=it0?it0.u:null;if(it0)libPick=null;render();return true}
 if(e.pointerType==='mouse'&&e.button!==0)return true;
 if(og){var it=oById(og.dataset.obj);if(it){drag={kind:'lobj',it:it,cx:e.clientX,cy:e.clientY,pid:e.pointerId,touch:e.pointerType==='touch',moved:false};return true}}
 drag={kind:'pan',ox:view.ox,oy:view.oy,sx:e.clientX,sy:e.clientY,moved:false,tapE:{clientX:e.clientX,clientY:e.clientY,target:e.target,shiftKey:e.shiftKey,altKey:e.altKey,pointerType:e.pointerType,button:0,pointerId:e.pointerId,_tap:true,preventDefault:function(){}}};return true}
function lObjMove(e){var d=drag;if(Math.hypot(e.clientX-d.cx,e.clientY-d.cy)<5)return;drag=null;objLift(e,d)}
function lObjUp(d){lSel=d.it.u;libPick=null;render()}
function lHover(p){}
document.addEventListener('keydown',function(e){if(step!=='layout'||cdrag||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.key==='Escape'){libPick=null;lSel=null;render();return}
 if((e.key==='r'||e.key==='R')&&lSel){oRotate(oById(lSel));return}
 if((e.key==='Delete'||e.key==='Backspace')&&lSel){e.preventDefault();oDelete(lSel)}});
function oRotate(it){if(!it)return;var z=zById(it.zone),cx=it.x+it.w/2,cy=it.y+it.d/2,r={x:snapH(cx-it.d/2),y:snapH(cy-it.w/2),w:it.d,d:it.w};
 if(!oFitsAt(r,z,it)){var sp2=oFindSpot(z,r.w,r.d,it,{x:cx,y:cy},{cl:it.cl,cm:it.cm,rot:((it.rot||0)+1)%4});if(!sp2){toast('No room to turn it in '+(z?z.name:'its zone'));return}r.x=sp2.x;r.y=sp2.y}push();it.x=r.x;it.y=r.y;it.w=r.w;it.d=r.d;it.rot=((it.rot||0)+1)%4;render()}
function oDelete(u){var it=oById(u);if(!it)return;push();S.objs.splice(S.objs.indexOf(it),1);if(lSel===u)lSel=null;toast(it.name+' removed');render()}
function placeAuto(r,zid){var z=zById(zid),c=BY[r],at=oFindSpot(z,c.w,c.d,null,null,{cl:c.cl||0,cm:c.cf?'front':'all',rot:0});if(!at){toast('No free spot big enough in '+z.name);return}push();var it=oNew(r,z,at);lSel=it.u;libPick=null;popU=it.u;render();var g={x:at.x,y:at.y,w:at.w,d:at.d};setTimeout(function(){poof(g)},0);setTimeout(function(){if(popU===it.u)popU=null},320);toast(it.name+' added to '+z.name)}

/* ---- library cards (the app's look) ---- */
function libArt(i,col){var W=i.w,D=i.d,m=Math.max(W,D)*1.22,g=ICONS[i.r]?ICONS[i.r](W,D):'<rect x="'+(-W/2)+'" y="'+(-D/2)+'" width="'+W+'" height="'+D+'" rx="'+(Math.min(W,D)*0.08)+'" fill="'+col+'2e" stroke="'+col+'" stroke-width="'+(m*0.02)+'"/>';
 return '<svg viewBox="'+(-m/2)+' '+(-m/2)+' '+m+' '+m+'" preserveAspectRatio="xMidYMid meet" pointer-events="none">'+g+'</svg>'}
function libCard(i,col){var fits=fitZones(i).length>0;return '<div class="lcard'+(libPick===i.r?' sel':'')+(fits?'':' nofit')+'" data-r="'+zEsc(i.r)+'" style="--c:'+col+'" title="'+zEsc(i.n)+'"><span class="lgrip" aria-hidden="true"></span><div class="lart">'+libArt(i,col)+'</div><div class="lnm">'+zEsc(i.n)+'</div><div class="lbdg"><span>'+fmtN(i.w)+'×'+fmtN(i.d)+'</span>'+(i.p?'<span class="p">⚡'+i.p[0]+'V</span>':'')+(oNeedsWater(i)?'<span class="wt">water</span>':'')+'</div></div>'}
function lCats(){var box=document.getElementById('l-cats');if(!box)return;var q=lQ.toLowerCase().trim(),h='';
 CATS.forEach(function(ct){if(ct[0]==='Rooms & Zones')return;var list=CATALOG.filter(function(i){return i.c===ct[0]&&!i.z&&i.r!=='b-wall'&&(!q||i.n.toLowerCase().indexOf(q)>=0)});if(!list.length)return;var open=q?true:!!libOpen[ct[0]];
  h+='<div class="lsec'+(open?' open':'')+'"><button class="lsh" data-c="'+zEsc(ct[0])+'"><i style="background:'+ct[1]+'"></i><span class="lsn">'+zEsc(ct[0])+'</span><span class="lct">'+list.length+'</span><svg class="lchev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>';
  if(open)h+='<div class="lgrid">'+list.map(function(i){return libCard(i,ct[1])}).join('')+'</div>';h+='</div>'});
 box.innerHTML=h||'<p class="zmuted" style="padding:10px 4px">No objects match.</p>';
 box.querySelectorAll('.lsh').forEach(function(b){b.onclick=function(){libOpen[b.dataset.c]=!libOpen[b.dataset.c];lCats()}})}
function lCatsMark(){document.querySelectorAll('#l-cats .lcard').forEach(function(b){b.classList.toggle('sel',libPick===b.dataset.r);b.classList.toggle('nofit',!fitZones(BY[b.dataset.r]).length)})}

/* ---- right panel: object details (the app's card), zone + size controls, totals ---- */
function objRows(c,w,d,rot,showFront){var ap=c&&c.est?'≈ ':'',dirs=['down','left','up','right'],h='<div class="irow"><span>Size</span><b>'+ap+fmtN(w)+' × '+fmtN(d)+' ft</b></div><div class="irow"><span>Footprint</span><b>'+ap+Math.round(w*d).toLocaleString()+' sq ft</b></div>';
 h+='<div class="irow"><span>Clearance</span><b>'+(c&&c.cl?fmtN(c.cl)+' ft '+(c.cf?'in front':'all around'):'none')+'</b></div>';if(showFront)h+='<div class="irow"><span>Front faces</span><b>'+dirs[(rot||0)%4]+'</b></div>';
 h+='<div class="isec">Power</div>';if(c&&c.p){var V=c.p[0],W=c.p[1],A=c.p[2],dd=c.p[3];h+='<div class="irow"><span>Voltage</span><b>'+V+'V</b></div><div class="irow"><span>Wattage</span><b>'+ap+fmtW(W)+'</b></div><div class="irow"><span>Current draw</span><b>'+ap+(Math.round(W/V*10)/10)+' A</b></div>';
  h+='<div class="icirc"><div class="ic1"><span class="ict">'+V+'V · '+A+'A <em>'+(dd?'dedicated':'shared')+'</em></span></div><div class="ic2">'+(dd?'Needs its own circuit · '+(V>=208?'2 breaker slots (2-pole)':'1 breaker slot'):'Plugs into a shared '+V+'V outlet circuit with other small items')+'</div></div>'}else h+='<p class="zmuted">No power needed.</p>';
 if(c&&c.no)h+='<div class="inote">'+zEsc(c.no)+'</div>';(c&&c.a||[]).forEach(function(k){if(ALERTS[k])h+='<div class="iwarn"><b>'+zEsc(ALERTS[k][0])+'.</b> '+zEsc(ALERTS[k][1])+'</div>'});
 if(c&&c.est&&!(c.a||[]).length)h+='<div class="iwarn">Size and power are estimates (≈)</div>';return h}
var lPanelKey='',lLeftBuilt=false,lQ='';
function lPanels(L,R){
 if(!lLeftBuilt||!L.querySelector('#l-q')){L.innerHTML='<h2>Add objects</h2><input id="l-q" type="search" placeholder="Search objects…" autocomplete="off" value="'+zEsc(lQ)+'"><div class="dhint" aria-hidden="true"><span class="cd"></span><span class="ar">→ →</span><span class="rm"></span><span class="tx">Drag onto a zone</span></div><div id="l-cats"></div>';lLeftBuilt=true;var q=L.querySelector('#l-q');q.oninput=function(){lQ=q.value;lCats()};lCats()}
 var ae=document.activeElement;if(ae&&R.contains(ae)&&/INPUT|SELECT/.test(ae.tagName))return;
 var it=oById(lSel),key=JSON.stringify([lSel,libPick,(S.objs||[]).map(function(o){return [o.u,o.x,o.y,o.w,o.d,o.zone]}),(S.zones||[]).map(function(z){return [z.id,z.name,z.type,z.plumb,Math.round(zArea(z))]})]);if(key===lPanelKey)return;lPanelKey=key;lCatsMark();
 var h='';
 if(libPick&&BY[libPick]){var c=BY[libPick],need=oTypes(c).map(function(t){return ZTB[t].n}).join(' or '),fz=fitZones(c),n=(S.objs||[]).filter(function(o){return o.r===libPick}).length;
  h+='<div class="zcard"><div class="zlab">'+zEsc(c.c.toUpperCase())+'</div><div class="lbig"><div class="lart">'+libArt(c,CATCOLOR[c.c]||'#888')+'</div><div style="font-weight:700;font-size:16px">'+zEsc(c.n)+'</div></div>';
  h+='<div class="irow"><span>Goes in</span><b class="wrap">'+zEsc(need)+(oNeedsWater(c)?' · with plumbing':'')+'</b></div><div class="irow"><span>On the plan</span><b>'+(n?n+' placed':'none yet')+'</b></div>';
  if(!fz.length)h+='<div class="zbanner"><span>You don\'t have a zone this fits yet.</span><button class="btn" id="l-tospaces">Paint one in Spaces</button></div>';
  else h+='<div class="zmuted">Drag the card onto a zone, or drop it into:</div><div class="zlist">'+fz.map(function(z){var t=ZTB[z.type];return '<button data-lz="'+z.id+'"><span class="zsw" style="background:'+t.c+'"></span><span class="zn">'+zEsc(z.name)+'</span><span class="za">Place it</span></button>'}).join('')+'</div>';
  h+=objRows(c,c.w,c.d,0,false)+'</div>'}
 else if(it){var c2=oCat(it),z2=zById(it.zone),pr=oProblem(it),fz2=fitZones(c2);
  h+='<div class="zcard"><div class="zlab">SELECTED OBJECT</div><div style="font-weight:700;font-size:16px">'+zEsc(it.name)+'</div>';
  if(pr)h+='<div class="lwarn">'+zEsc(pr)+'</div>';
  h+='<label class="zfl">Zone<select id="l-zone">'+(z2&&fz2.indexOf(z2)<0?'<option value="'+z2.id+'" selected>'+zEsc(z2.name)+'</option>':'')+(z2?'':'<option value="" selected>Choose…</option>')+fz2.map(function(z){return '<option value="'+z.id+'"'+(z===z2?' selected':'')+'>'+zEsc(z.name)+'</option>'}).join('')+'</select></label>';
  h+='<div class="lsize"><label class="zfl">Width (ft)<input id="l-w" value="'+fmtL(it.w)+'" inputmode="decimal"></label><label class="zfl">Depth (ft)<input id="l-d" value="'+fmtL(it.d)+'" inputmode="decimal"></label><button class="btn" id="l-setsz">Set</button></div>';
  h+='<div class="lrow"><button class="btn" id="l-rot">Rotate 90°</button><button class="btn zdel" id="l-del">Remove</button></div>'+objRows(c2,it.w,it.d,it.rot,true)+'</div>'}
 var os=S.objs||[],zs=(S.zones||[]).filter(zPlaced);
 if(!libPick){h+='<div class="zcard"><div class="zlab">BY ZONE</div>';
  if(!zs.length)h+='<p class="zmuted">No zones yet. Paint some in the Spaces step first.</p>';
  else h+='<div class="lz">'+zs.map(function(z){var t=ZTB[z.type],mine=os.filter(function(o){return o.zone===z.id}),pw=powerOf(mine);return '<div><span class="zsw" style="background:'+t.c+'"></span><span class="zn">'+zEsc(z.name)+'</span><span class="za">'+mine.length+' obj'+(pw.w?' · '+fmtW(pw.w):'')+'</span></div>'}).join('')+'</div>';
  h+='</div><div class="zcard"><div class="zlab">POWER · WHOLE BUILDING</div>'+powerHtml(powerOf(os))+'</div>'}
 R.innerHTML=h;
 R.querySelectorAll('[data-lz]').forEach(function(b){b.onclick=function(){placeAuto(libPick,b.dataset.lz)}});
 var ts=R.querySelector('#l-tospaces');if(ts)ts.onclick=function(){var c3=BY[libPick];libPick=null;setStep('spaces');ztype=oTypes(c3)[0];zSetTool('zroom');zPanelKey='';zPanels()};
 if(it&&!libPick){var zsel=R.querySelector('#l-zone');zsel.onchange=function(){var nz=zById(zsel.value);if(!nz||nz.id===it.zone)return;var at=oFindSpot(nz,it.w,it.d,it,null,it);if(!at){toast('No free spot big enough in '+nz.name);lPanelKey='';render();return}push();it.zone=nz.id;it.x=at.x;it.y=at.y;render();toast('Moved to '+nz.name)};
  R.querySelector('#l-rot').onclick=function(){oRotate(it)};R.querySelector('#l-del').onclick=function(){oDelete(it.u)};
  var setsz=function(){var w=parseFloat(R.querySelector('#l-w').value),d=parseFloat(R.querySelector('#l-d').value);if(!(w>0&&d>0)){toast('Type a size in feet');return}var r={x:it.x,y:it.y,w:w,d:d};if(!oFitsAt(r,zById(it.zone),it)){var at=oFindSpot(zById(it.zone),w,d,it,{x:it.x+it.w/2,y:it.y+it.d/2},it);if(!at){toast('That size doesn\'t fit in '+(zById(it.zone)||{name:'its zone'}).name);return}r.x=at.x;r.y=at.y}push();it.x=r.x;it.y=r.y;it.w=w;it.d=d;lPanelKey='';if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();render()};
  R.querySelector('#l-setsz').onclick=setsz;['#l-w','#l-d'].forEach(function(s){R.querySelector(s).onkeydown=function(e){if(e.key==='Enter')setsz()}})}}
