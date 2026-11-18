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

/* ---- drawing (feet space inside one transformed group, so the app's drawings work unchanged) ---- */
function objsSvg(){var os=S.objs||[];if(!os.length&&!lGhost)return '';var live=step==='layout',h='<g transform="translate('+view.ox+' '+view.oy+') scale('+view.s+')"'+(live?'':' opacity=".45"')+' style="pointer-events:'+(live?'auto':'none')+'">',px=1/view.s;
 os.forEach(function(it){var bad=live&&!!oProblem(it),on=live&&lSel===it.u,c=oCat(it),art=c&&ICONS[it.r];
  if(it.cl>0){var q=oCr(it);h+='<rect x="'+q.x+'" y="'+q.y+'" width="'+q.w+'" height="'+q.d+'" fill="'+(bad?'rgba(214,69,69,.08)':it.cm==='front'?'rgba(150,140,120,.07)':'none')+'" stroke="'+(bad?'#d64545':'#b9b4a8')+'" stroke-width="'+px+'" stroke-dasharray="'+(5*px)+' '+(4*px)+'" pointer-events="none"/>'}
  h+='<g data-obj="'+it.u+'" style="cursor:'+(live?'move':'default')+'"><rect x="'+it.x+'" y="'+it.y+'" width="'+it.w+'" height="'+it.d+'" rx="0.25" fill="'+(art?'#fbfaf7':'#e8e5de')+'" stroke="'+(bad?'#d64545':on?'#2f7de1':'#9d988c')+'" stroke-width="'+((bad||on?2.2:1.2)*px)+'"/>';
  if(art)h+=iconFor(it);if(it.cm==='front'){var fe=oFront(it);h+='<line x1="'+fe[0]+'" y1="'+fe[1]+'" x2="'+fe[2]+'" y2="'+fe[3]+'" stroke="#5f5b52" stroke-width="'+(2.5*px)+'" pointer-events="none"/>'}
  var fs=11*px,show=on||(it.w*view.s>46&&it.d*view.s>18&&!art);if(show){var t=it.name.length>22?it.name.slice(0,21)+'…':it.name;h+='<text x="'+(it.x+it.w/2)+'" y="'+(it.y+it.d/2+fs*.35)+'" text-anchor="middle" font-size="'+fs+'" font-weight="'+(on?700:500)+'" fill="'+(on?'#1d4f91':'#3a3936')+'" stroke="#fff" stroke-width="'+(3*px)+'" paint-order="stroke" pointer-events="none">'+esc(t)+'</text>'}else h+='<title>'+esc(it.name)+'</title>';
  h+='</g>'});
 if(lGhost&&live){var g=lGhost;h+='<rect x="'+g.x+'" y="'+g.y+'" width="'+g.w+'" height="'+g.d+'" rx="0.25" fill="'+(g.ok?'rgba(63,138,79,.18)':'rgba(214,69,69,.16)')+'" stroke="'+(g.ok?'#3f8a4f':'#d64545')+'" stroke-width="'+(2*px)+'" stroke-dasharray="'+(6*px)+' '+(4*px)+'" pointer-events="none"/>';
  if(ICONS[g.r])h+='<g opacity=".6" pointer-events="none">'+iconFor({r:g.r,x:g.x,y:g.y,w:g.w,d:g.d,rot:0})+'</g>'}
 return h+'</g>'}

/* ---- pointer ---- */
function lDown(e,p,t){var og=t.closest&&t.closest('[data-obj]');
 if(e._tap){lTap(p,og);return true}
 if(e.pointerType==='mouse'&&e.button!==0)return true;
 if(og&&!lPlace){var it=oById(og.dataset.obj);if(it){lSel=it.u;drag={kind:'lmove',it:it,start:p,o:{x:it.x,y:it.y},snapshot:snap(),moved:false};render();return true}}
 drag={kind:'pan',ox:view.ox,oy:view.oy,sx:e.clientX,sy:e.clientY,moved:false,tapE:{clientX:e.clientX,clientY:e.clientY,target:e.target,shiftKey:e.shiftKey,altKey:e.altKey,pointerType:e.pointerType,button:0,pointerId:e.pointerId,_tap:true,preventDefault:function(){}}};return true}
function lTap(p,og){if(lPlace){lPlaceAt(p);return}var it=og&&oById(og.dataset.obj);lSel=it?it.u:null;render()}
function lGhostAt(p){if(!lPlace)return null;var c=BY[lPlace.r],r={r:lPlace.r,x:Math.round((p.x-c.w/2)*2)/2,y:Math.round((p.y-c.d/2)*2)/2,w:c.w,d:c.d},z=zoneAt(p);r.zone=z&&zFits(z,c)?z:null;r.ok=!!r.zone&&oFitsAt(r,r.zone,null);return r}
function lPlaceAt(p){var g=lGhostAt(p),c=BY[lPlace.r];if(!g||!g.zone){toast('Click inside '+(lPlace.zone?zById(lPlace.zone).name:'a zone it fits in'));return}if(!g.ok){toast('Not enough room there');return}push();var it=oNew(lPlace.r,g.zone,g);lSel=it.u;lPlace=null;lGhost=null;render();toast(it.name+' added to '+g.zone.name)}
function lHover(p){if(lPlace){lGhost=lGhostAt(p);render()}}
function lMove(p){var dg=drag,it=dg.it,z=zById(it.zone);var nx=Math.round((dg.o.x+p.x-dg.start.x)*2)/2,ny=Math.round((dg.o.y+p.y-dg.start.y)*2)/2;dg.moved=dg.moved||nx!==dg.o.x||ny!==dg.o.y;
 // slide: try the full move, then each axis on its own, so objects glide along walls and neighbours
 [[nx,ny],[nx,it.y],[it.x,ny]].some(function(c){var r={x:c[0],y:c[1],w:it.w,d:it.d};if(oFitsAt(r,z,it)){it.x=c[0];it.y=c[1];return true}return false});render()}
function lUp(dg){if(dg.moved){hist.push(dg.snapshot);fut=[];btns()}lSel=dg.it.u;render()}
document.addEventListener('keydown',function(e){if(step!=='layout'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.key==='Escape'){if(lPlace){lPlace=null;lGhost=null}else lSel=null;render();return}
 if((e.key==='r'||e.key==='R')&&lSel){oRotate(oById(lSel));return}
 if((e.key==='Delete'||e.key==='Backspace')&&lSel){e.preventDefault();oDelete(lSel)}});
function oRotate(it){if(!it)return;var z=zById(it.zone),cx=it.x+it.w/2,cy=it.y+it.d/2,r={x:Math.round((cx-it.d/2)*2)/2,y:Math.round((cy-it.w/2)*2)/2,w:it.d,d:it.w};
 if(!oFitsAt(r,z,it)){var sp2=oFindSpot(z,r.w,r.d,it,{x:cx,y:cy},{cl:it.cl,cm:it.cm,rot:((it.rot||0)+1)%4});if(!sp2){toast('No room to turn it in '+(z?z.name:'its zone'));return}r.x=sp2.x;r.y=sp2.y}push();it.x=r.x;it.y=r.y;it.w=r.w;it.d=r.d;it.rot=((it.rot||0)+1)%4;render()}
function oDelete(u){var it=oById(u);if(!it)return;push();S.objs.splice(S.objs.indexOf(it),1);if(lSel===u)lSel=null;toast(it.name+' removed');render()}
function startPlace(r){var c=BY[r],zs=fitZones(c);lSel=null;if(!zs.length){lPlace={r:r,none:true};render();return}lPlace={r:r,zone:zs.length===1?zs[0].id:null,choose:zs.length>1};lGhost=null;render()}
function placeAuto(zid){var z=zById(zid),c=BY[lPlace.r],at=oFindSpot(z,c.w,c.d,null,null,{cl:c.cl||0,cm:c.cf?'front':'all',rot:0});if(!at){toast('No free spot big enough in '+z.name);return}push();var it=oNew(lPlace.r,z,at);lSel=it.u;lPlace=null;lGhost=null;render();toast(it.name+' added to '+z.name)}

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

/* ---- panels ---- */
var lPanelKey='',lLeftBuilt=false;
function lPanels(L,R){
 if(!lLeftBuilt||!L.querySelector('#l-q')){L.innerHTML='<h2>Add objects</h2><input id="l-q" type="search" placeholder="Search objects" autocomplete="off" value="'+zEsc(lQ)+'"><div id="l-cats"></div>';lLeftBuilt=true;var q=L.querySelector('#l-q');q.oninput=function(){lQ=q.value;lCats()};lCats()}
 var ae=document.activeElement;if(ae&&R.contains(ae)&&/INPUT|SELECT/.test(ae.tagName))return;
 var it=oById(lSel),key=JSON.stringify([lSel,lPlace,(S.objs||[]).map(function(o){return [o.u,o.x,o.y,o.w,o.d,o.zone]}),(S.zones||[]).map(function(z){return [z.id,z.name,z.type,z.plumb,Math.round(zArea(z))]})]);if(key===lPanelKey)return;lPanelKey=key;lCatsMark();
 var h='';
 if(lPlace){var c=BY[lPlace.r],need=oTypes(c).map(function(t){return ZTB[t].n}).join(' or ');
  h+='<div class="zcard"><div class="zlab">PLACING</div><div style="font-weight:600;font-size:15px">'+zEsc(c.n)+'</div><div class="zmuted">'+c.w+' × '+c.d+' ft'+(c.cl?' · '+c.cl+' ft clear'+(c.cf?' in front':' all round'):'')+'</div>';
  if(lPlace.none)h+='<div class="zbanner"><span>This goes in a <b>'+zEsc(need)+'</b> zone'+(oNeedsWater(c)?' <b>with plumbing</b>':'')+', and there isn\'t one yet.</span><button class="btn" id="l-tospaces">Go to Spaces</button></div>';
  else if(lPlace.choose&&!lPlace.zone){h+='<div class="zmuted">Which zone?</div><div class="zlist">'+fitZones(c).map(function(z){var t=ZTB[z.type];return '<button data-lz="'+z.id+'"><span class="zsw" style="background:'+t.c+'"></span><span class="zn">'+zEsc(z.name)+'</span><span class="za">'+Math.round(zArea(z)).toLocaleString()+' sq ft</span></button>'}).join('')+'</div>'}
  else{var z=zById(lPlace.zone);h+='<div class="zmuted">Click a spot inside <b>'+zEsc(z.name)+'</b>, or:</div><button class="btn pri" id="l-auto">Place it for me</button>'}
  h+='<button class="btn" id="l-cancel">Cancel</button></div>'}
 else if(it){var c2=oCat(it),z2=zById(it.zone),pr=oProblem(it),fz=fitZones(c2);
  h+='<div class="zcard"><div class="zlab">SELECTED OBJECT</div><div style="font-weight:600;font-size:15px">'+zEsc(it.name)+'</div>';
  if(pr)h+='<div class="lwarn">'+zEsc(pr)+'</div>';
  h+='<label class="zfl">Zone<select id="l-zone">'+(z2&&fz.indexOf(z2)<0?'<option value="'+z2.id+'" selected>'+zEsc(z2.name)+'</option>':'')+(z2?'':'<option value="" selected>Choose…</option>')+fz.map(function(z){return '<option value="'+z.id+'"'+(z===z2?' selected':'')+'>'+zEsc(z.name)+'</option>'}).join('')+'</select></label>';
  h+='<div class="lsize"><label class="zfl">Width (ft)<input id="l-w" value="'+fmtL(it.w)+'" inputmode="decimal"></label><label class="zfl">Depth (ft)<input id="l-d" value="'+fmtL(it.d)+'" inputmode="decimal"></label><button class="btn" id="l-setsz">Set</button></div>';
  h+='<div class="lrow"><button class="btn" id="l-rot">Rotate 90°</button><button class="btn zdel" id="l-del">Remove</button></div>';
  if(c2&&c2.p)h+='<div class="zstats"><span>Power</span><b>'+(c2.est?'≈ ':'')+c2.p[0]+'V · '+fmtW(c2.p[1])+(c2.p[3]?' · own '+c2.p[2]+'A circuit':'')+'</b></div>';
  if(it.cl)h+='<div class="zstats"><span>Clear space</span><b>'+it.cl+' ft '+(it.cm==='front'?'in front':'all round')+'</b></div>';
  if(c2&&c2.no)h+='<p class="zmuted">'+zEsc(c2.no)+'</p>';
  (c2&&c2.a||[]).forEach(function(k){var al=ALERTS[k];if(al)h+='<details class="lalert"><summary>'+zEsc(al[0])+'</summary><p>'+zEsc(al[1])+'</p></details>'});
  h+='</div>'}
 var os=S.objs||[],zs=(S.zones||[]).filter(zPlaced);
 h+='<div class="zcard"><div class="zlab">BY ZONE</div>';
 if(!zs.length)h+='<p class="zmuted">No zones yet. Paint some in the Spaces step first.</p>';
 else h+='<div class="lz">'+zs.map(function(z){var t=ZTB[z.type],mine=os.filter(function(o){return o.zone===z.id}),pw=powerOf(mine);return '<div><span class="zsw" style="background:'+t.c+'"></span><span class="zn">'+zEsc(z.name)+'</span><span class="za">'+mine.length+' obj'+(pw.w?' · '+fmtW(pw.w):'')+'</span></div>'}).join('')+'</div>';
 h+='</div><div class="zcard"><div class="zlab">POWER · WHOLE BUILDING</div>'+powerHtml(powerOf(os))+'</div>';
 R.innerHTML=h;
 R.querySelectorAll('[data-lz]').forEach(function(b){b.onclick=function(){lPlace.zone=b.dataset.lz;lPanelKey='';render()}});
 var a=R.querySelector('#l-auto');if(a)a.onclick=function(){placeAuto(lPlace.zone)};var cn=R.querySelector('#l-cancel');if(cn)cn.onclick=function(){lPlace=null;lGhost=null;render()};
 var ts=R.querySelector('#l-tospaces');if(ts)ts.onclick=function(){var c3=BY[lPlace.r];lPlace=null;setStep('spaces');ztype=oTypes(c3)[0];zSetTool('zroom');zPanelKey='';zPanels()};
 if(it){var zsel=R.querySelector('#l-zone');zsel.onchange=function(){var nz=zById(zsel.value);if(!nz||nz.id===it.zone)return;var at=oFindSpot(nz,it.w,it.d,it,null,it);if(!at){toast('No free spot big enough in '+nz.name);lPanelKey='';render();return}push();it.zone=nz.id;it.x=at.x;it.y=at.y;render();toast('Moved to '+nz.name)};
  R.querySelector('#l-rot').onclick=function(){oRotate(it)};R.querySelector('#l-del').onclick=function(){oDelete(it.u)};
  var setsz=function(){var w=parseFloat(R.querySelector('#l-w').value),d=parseFloat(R.querySelector('#l-d').value);if(!(w>0&&d>0)){toast('Type a size in feet');return}var r={x:it.x,y:it.y,w:w,d:d};if(!oFitsAt(r,zById(it.zone),it)){var at=oFindSpot(zById(it.zone),w,d,it,{x:it.x+it.w/2,y:it.y+it.d/2},it);if(!at){toast('That size doesn\'t fit in '+(zById(it.zone)||{name:'its zone'}).name);return}r.x=at.x;r.y=at.y}push();it.x=r.x;it.y=r.y;it.w=w;it.d=d;lPanelKey='';document.activeElement&&document.activeElement.blur&&document.activeElement.blur();render()};
  R.querySelector('#l-setsz').onclick=setsz;['#l-w','#l-d'].forEach(function(s){R.querySelector(s).onkeydown=function(e){if(e.key==='Enter')setsz()}})}}
function lCats(){var box=document.getElementById('l-cats');if(!box)return;var q=lQ.toLowerCase().trim(),h='';
 CATS.forEach(function(cc){var cn=cc[0];if(cn==='Rooms & Zones')return;var list=CATALOG.filter(function(i){return i.c===cn&&!i.z&&i.r!=='b-wall'&&(!q||i.n.toLowerCase().indexOf(q)>=0)});if(!list.length)return;
  h+='<details class="lcat"'+(q||lOpen[cn]?' open':'')+' data-cat="'+zEsc(cn)+'"><summary><span class="zsw" style="background:'+cc[1]+'"></span>'+zEsc(cn)+'<span class="za">'+list.length+'</span></summary>'+list.map(function(i){return '<button class="lpi" data-r="'+i.r+'"><span>'+zEsc(i.n)+'</span><span class="za">'+i.w+'×'+i.d+'</span></button>'}).join('')+'</details>'});
 box.innerHTML=h||'<p class="zmuted">Nothing matches.</p>';
 box.querySelectorAll('details').forEach(function(dl){dl.ontoggle=function(){lOpen[dl.dataset.cat]=dl.open}});
 box.querySelectorAll('[data-r]').forEach(function(b){b.onclick=function(){startPlace(b.dataset.r)}});lCatsMark()}
function lCatsMark(){document.querySelectorAll('#l-cats [data-r]').forEach(function(b){var c=BY[b.dataset.r];b.classList.toggle('on',!!lPlace&&lPlace.r===b.dataset.r);b.classList.toggle('nofit',!fitZones(c).length)})}
