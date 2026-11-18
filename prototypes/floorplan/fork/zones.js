/* ---------- zones: the Spaces step ---------- */
/* A zone is a named instance of one of 8 types. Its shape is a multipolygon in feet
   (polygon-clipping format: [[ring, hole, ...], ...], ring = [[x,y], ...]).
   Zones never overlap, stay inside the outer walls and are cut around unusable space. */
var ZT=[
 {id:'lounge',n:'Lounge',c:'#3b6fd8',k:'#234b9e',pl:'off'},
 {id:'games',n:'Games & Fitness',c:'#e07b1f',k:'#8a4a0e',pl:'off'},
 {id:'bar',n:'Kitchen & Bar',c:'#c8455a',k:'#9a2f42',pl:'on'},
 {id:'shop',n:'Workshop & Garage',c:'#8a6d2e',k:'#6a531f',pl:'off'},
 {id:'office',n:'Office',c:'#1f8a84',k:'#156a65',pl:'off'},
 {id:'bed',n:'Bedroom',c:'#7b5bc6',k:'#5a3fa0',pl:'off'},
 {id:'bath',n:'Bathroom',c:'#2aa3c9',k:'#17708c',pl:'on'},
 {id:'store',n:'Storage & Utility',c:'#6b7280',k:'#474c56',pl:'opt'}];
var ZTB={};ZT.forEach(function(t){ZTB[t.id]=t});
var step='structure',ztype='lounge',zSel=null,zAdd=null,zdraft=null,zhover=null,zcur=null,brushR=2.5,zErase=false;
var PC=window.polygonClipping;
function zById(id){for(var i=0;i<(S.zones||[]).length;i++)if(S.zones[i].id===id)return S.zones[i];return null}
function zPlaced(z){return !!(z&&z.mp&&z.mp.length)}
function ringArea(r){var a=0;for(var i=0;i<r.length;i++){var p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1]}return a/2}
function mpArea(mp){var a=0;(mp||[]).forEach(function(pg){pg.forEach(function(r,i){a+=(i?-1:1)*Math.abs(ringArea(r))})});return a}
function zArea(z){return zPlaced(z)?mpArea(z.mp):0}
function inRing(p,r){var c=false;for(var i=0,j=r.length-1;i<r.length;j=i++){var a=r[i],b=r[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function inMP(p,mp){return (mp||[]).some(function(pg){return inRing(p,pg[0])&&!pg.slice(1).some(function(h){return inRing(p,h)})})}
function zoneAt(p){var zs=S.zones||[];for(var i=zs.length-1;i>=0;i--)if(inMP(p,zs[i].mp))return zs[i];return null}
function tidy(mp){return (mp||[]).map(function(pg){return pg.map(function(r){return r.map(function(q){return [Math.round(q[0]*100)/100,Math.round(q[1]*100)/100]})})}).filter(function(pg){return Math.abs(ringArea(pg[0]))>=.5})}
function outlineMP(){return S.outline?[[flat(S.outline.pts).map(function(q){return [q.x,q.y]})]]:[]}
function blkMP(){return S.blk.map(function(b){return [flat(b.pts).map(function(q){return [q.x,q.y]})]})}
// where a zone may sit: inside the building, off unusable space, and (unless stealing) off every other zone
function allowedFor(id,steal){var base=outlineMP();if(!base.length)return [];var cut=blkMP();if(!steal)(S.zones||[]).forEach(function(o){if(o.id!==id&&zPlaced(o))cut=cut.concat(o.mp)});
 try{return cut.length?PC.difference.apply(null,[base].concat(cut)):base}catch(_){return base}}
function addTo(z,cand,steal){var u;try{u=zPlaced(z)?PC.union(z.mp,cand):cand;z.mp=tidy(PC.intersection(u,allowedFor(z.id,steal)))}catch(_){return}
 if(steal)(S.zones||[]).forEach(function(o){if(o!==z&&zPlaced(o)){try{o.mp=tidy(PC.difference(o.mp,z.mp))}catch(_){}}})}
function eraseZones(cand){(S.zones||[]).forEach(function(o){if(zPlaced(o)){try{o.mp=tidy(PC.difference(o.mp,cand))}catch(_){}}})}
function zDefaultName(t){var base=ZTB[t].n,names={};(S.zones||[]).forEach(function(z){names[z.name]=1});if(!names[base])return base;for(var k=2;;k++)if(!names[base+' '+k])return base+' '+k}
function zNew(t,mp){var z={id:'z'+(S.zid=(S.zid||1)+1),type:t,name:zDefaultName(t),mp:mp||[],plumb:ZTB[t].pl==='on'};S.zones.push(z);return z}
function zTarget(){var z=zById(zSel);if(!z)return null;if(!zPlaced(z)||zAdd===z.id)return z;return null}
// paint a candidate shape: into the zone being added to, or as a new named zone
function applyPaint(cand,steal){if(!cand||!cand.length)return;push();
 if(zErase){var before=S.zones.reduce(function(a,z){return a+zArea(z)},0);eraseZones(cand);var after=S.zones.reduce(function(a,z){return a+zArea(z)},0);if(before-after<.5){hist.pop();toast('Nothing to erase there');return}render();return}
 var tg=zTarget(),fresh=!tg;if(fresh)tg=zNew(ztype);var a0=zArea(tg);addTo(tg,cand,steal);var gain=zArea(tg)-a0;
 if(gain<1){if(fresh)S.zones.splice(S.zones.indexOf(tg),1);hist.pop();toast(S.outline?'That space already belongs to another zone (hold Alt to take it over)':'Set up the outer walls first');render();return}
 zSel=tg.id;zAdd=tg.id;render();if(fresh)setTimeout(function(){var n=document.getElementById('z-name');if(n){n.focus();n.select()}},30);
 toast((fresh?tg.name+' added':'Added to '+tg.name)+' · '+Math.round(zArea(tg)).toLocaleString()+' sq ft')}

/* ---- the walls on a fine grid: used by "click a room" and the brush ---- */
function zGrid(){if(!S.outline)return null;var ob=bbox(flat(S.outline.pts)),r=.25,pad=1,x0=ob.x0-pad,y0=ob.y0-pad,W=Math.ceil((ob.x1-ob.x0+2*pad)/r),H=Math.ceil((ob.y1-ob.y0+2*pad)/r),wall=new Uint8Array(W*H),rad=.3;
 fillSegs().forEach(function(sg){var a=sg[0],b=sg[1],L=len(sub(b,a)),n=Math.max(1,Math.ceil(L/(r/2)));for(var k=0;k<=n;k++){var x=a.x+(b.x-a.x)*k/n,y=a.y+(b.y-a.y)*k/n,i0=Math.floor((x-rad-x0)/r),i1=Math.floor((x+rad-x0)/r),j0=Math.floor((y-rad-y0)/r),j1=Math.floor((y+rad-y0)/r);
  for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++){if(i<0||j<0||i>=W||j>=H)continue;if(Math.hypot(x0+(i+.5)*r-x,y0+(j+.5)*r-y)<=rad+r*.5)wall[j*W+i]=1}}});
 return {x0:x0,y0:y0,r:r,W:W,H:H,N:W*H,wall:wall}}
function zCell(g,p){var i=Math.floor((p.x-g.x0)/g.r),j=Math.floor((p.y-g.y0)/g.r);return (i<0||j<0||i>=g.W||j>=g.H)?-1:j*g.W+i}
function zFlood(g,c){var m=new Uint8Array(g.N),st=[c],W=g.W,H=g.H;m[c]=1;while(st.length){var k=st.pop(),i=k%W,j=(k-i)/W;if(i>0&&!m[k-1]&&!g.wall[k-1]){m[k-1]=1;st.push(k-1)}if(i<W-1&&!m[k+1]&&!g.wall[k+1]){m[k+1]=1;st.push(k+1)}if(j>0&&!m[k-W]&&!g.wall[k-W]){m[k-W]=1;st.push(k-W)}if(j<H-1&&!m[k+W]&&!g.wall[k+W]){m[k+W]=1;st.push(k+W)}}return m}
// grow a filled area into the walls up to their middle, so neighbouring zones meet at the wall line
function zGrow(g,m){var W=g.W,H=g.H;for(var it=0;it<2;it++){var m2=new Uint8Array(m);for(var c=0;c<g.N;c++){if(m[c]||!g.wall[c])continue;var i=c%W,j=(c-i)/W,hit=false;for(var di=-1;di<=1&&!hit;di++)for(var dj=-1;dj<=1;dj++){var ii=i+di,jj=j+dj;if(ii>=0&&jj>=0&&ii<W&&jj<H&&m[jj*W+ii]){hit=true;break}}if(hit)m2[c]=1}m=m2}return m}
function zDist(q,a,b){var ab=sub(b,a),L2=ab.x*ab.x+ab.y*ab.y;if(L2<1e-12)return len(sub(q,a));var t=Math.max(0,Math.min(1,((q.x-a.x)*ab.x+(q.y-a.y)*ab.y)/L2));return len(sub(q,{x:a.x+ab.x*t,y:a.y+ab.y*t}))}
function zSimp(P0,tol){if(P0.length<3)return P0;var a=P0[0],b=P0[P0.length-1],mi=-1,md=0;for(var k=1;k<P0.length-1;k++){var d=zDist(P0[k],a,b);if(d>md){md=d;mi=k}}if(md<=tol)return [a,b];return zSimp(P0.slice(0,mi+1),tol).slice(0,-1).concat(zSimp(P0.slice(mi),tol))}
function zSimpRing(pts,tol){if(pts.length<4)return pts;var far=0,fi=0;pts.forEach(function(q,k){var d=len(sub(q,pts[0]));if(d>far){far=d;fi=k}});var s1=zSimp(pts.slice(0,fi+1),tol),s2=zSimp(pts.slice(fi).concat([pts[0]]),tol);return s1.slice(0,-1).concat(s2.slice(0,-1))}
// trace filled cells into a multipolygon (outer edges and holes), with stair-steps straightened
function zTrace(g,m){var W=g.W,H=g.H,nx={};function key(i,j){return i+','+j}function add(a,b){(nx[key(a[0],a[1])]=nx[key(a[0],a[1])]||[]).push(b)}function on(i,j){return i>=0&&j>=0&&i<W&&j<H&&m[j*W+i]}
 for(var j=0;j<H;j++)for(var i=0;i<W;i++){if(!m[j*W+i])continue;if(!on(i,j-1))add([i,j],[i+1,j]);if(!on(i+1,j))add([i+1,j],[i+1,j+1]);if(!on(i,j+1))add([i+1,j+1],[i,j+1]);if(!on(i-1,j))add([i,j+1],[i,j])}
 var loops=[];Object.keys(nx).forEach(function(k0){while(nx[k0]&&nx[k0].length){var loop=[],cur=k0.split(',').map(Number),guard=0;while(guard++<400000){loop.push(cur);var l=nx[key(cur[0],cur[1])];if(!l||!l.length)break;cur=l.pop();if(key(cur[0],cur[1])===k0)break}if(loop.length>=4)loops.push(loop)}});
 var rings=loops.map(function(l){var pts=zSimpRing(l.map(function(c){return {x:g.x0+c[0]*g.r,y:g.y0+c[1]*g.r}}),.35);return pts.map(function(q){return [q.x,q.y]})}).filter(function(r){return r.length>=3&&Math.abs(ringArea(r))>=.5});
 if(!rings.length)return [];var big=rings.reduce(function(a,r){return Math.abs(ringArea(r))>Math.abs(ringArea(a))?r:a}),sg=Math.sign(ringArea(big));
 var outs=rings.filter(function(r){return Math.sign(ringArea(r))===sg}).map(function(r){return [r]}),holes=rings.filter(function(r){return Math.sign(ringArea(r))!==sg}).map(function(r){return [r]});
 try{var u=outs.length>1?PC.union.apply(null,outs):[outs[0]];return holes.length?PC.difference.apply(null,[u].concat(holes)):u}catch(_){return [outs[0]]}}
function roomShape(p){var g=zGrid();if(!g)return null;var c=zCell(g,p);if(c<0||g.wall[c])return null;return zTrace(g,zGrow(g,zFlood(g,c)))}
function brushShape(path,cross){var g=zGrid();if(!g)return null;var m=new Uint8Array(g.N),R=brushR,W=g.W;
 for(var s=0;s<path.length;s++){var a=path[s],b=path[Math.min(s+1,path.length-1)],i0=Math.floor((Math.min(a.x,b.x)-R-g.x0)/g.r),i1=Math.floor((Math.max(a.x,b.x)+R-g.x0)/g.r),j0=Math.floor((Math.min(a.y,b.y)-R-g.y0)/g.r),j1=Math.floor((Math.max(a.y,b.y)+R-g.y0)/g.r);
  for(var i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)for(var j=Math.max(0,j0);j<=Math.min(g.H-1,j1);j++){if(zDist({x:g.x0+(i+.5)*g.r,y:g.y0+(j+.5)*g.r},a,b)<=R)m[j*W+i]=1}}
 if(!cross){var c=zCell(g,path[0]);if(c>=0&&!g.wall[c]){var reg=zGrow(g,zFlood(g,c));for(var k=0;k<g.N;k++)if(!reg[k])m[k]=0}}
 return zTrace(g,m)}

/* ---- drawing ---- */
function mpPath(mp){var d='';(mp||[]).forEach(function(pg){pg.forEach(function(r){r.forEach(function(q,i){d+=(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)});d+='Z'})});return d}
function zLabelAt(z){var best=null;z.mp.forEach(function(pg){var a=Math.abs(ringArea(pg[0]));if(!best||a>best.a)best={a:a,pg:pg}});var pg=best.pg,r=pg[0],x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;r.forEach(function(q){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])});
 var bp=null,bd=-1;for(var i=1;i<12;i++)for(var j=1;j<12;j++){var p={x:x0+(x1-x0)*i/12,y:y0+(y1-y0)*j/12};if(!inMP(p,[pg]))continue;var dmin=1e9;pg.forEach(function(rr){for(var k=0;k<rr.length;k++){var a=rr[k],b=rr[(k+1)%rr.length];dmin=Math.min(dmin,zDist(p,{x:a[0],y:a[1]},{x:b[0],y:b[1]}))}});if(dmin>bd){bd=dmin;bp=p}}
 return bp?{p:bp,room:bd,w:x1-x0}:null}
function zonesSvg(){var zs=S.zones||[];if(!zs.length)return '';var h='',full=step!=='structure';
 zs.forEach(function(z){if(!zPlaced(z))return;var t=ZTB[z.type]||ZT[0],on=full&&zSel===z.id;h+='<path d="'+mpPath(z.mp)+'" fill="'+t.c+'" fill-opacity="'+(full?(on?.28:.2):.08)+'" fill-rule="evenodd" stroke="'+(on?'#2f7de1':t.c)+'" stroke-width="'+(full?(on?3:2):1)+'" stroke-opacity="'+(full?1:.4)+'" style="pointer-events:none"/>'});
 if(full)zs.forEach(function(z){if(!zPlaced(z))return;var t=ZTB[z.type]||ZT[0],L=zLabelAt(z);if(!L||L.room*view.s<16)return;var fs=Math.max(11,Math.min(15,L.room*view.s/3));
  h+='<text x="'+X(L.p.x)+'" y="'+(Y(L.p.y)-2)+'" text-anchor="middle" font-size="'+fs.toFixed(1)+'" font-weight="600" fill="'+t.k+'" style="pointer-events:none">'+esc(z.name)+'</text><text x="'+X(L.p.x)+'" y="'+(Y(L.p.y)+fs-1)+'" text-anchor="middle" font-size="'+Math.max(10,fs-3).toFixed(1)+'" fill="'+t.k+'" fill-opacity=".85" style="pointer-events:none">'+Math.round(zArea(z)).toLocaleString()+' sq ft</text>'});
 return h}
function zOverlaySvg(){if(step!=='spaces')return '';var h='',t=ZTB[ztype],col=zErase?'#b42336':(zTarget()?(ZTB[zTarget().type]||t).c:t.c);
 var z=zById(zSel);if(z&&zPlaced(z)&&tool==='zsel')z.mp.forEach(function(pg,pi){pg.forEach(function(r,ri){r.forEach(function(q,vi){if(vi===r.length-1&&q[0]===r[0][0]&&q[1]===r[0][1])return;var n=r[(vi+1)%r.length];
  h+='<rect data-zh="e" data-pi="'+pi+'" data-ri="'+ri+'" data-vi="'+vi+'" x="'+((X(q[0])+X(n[0]))/2-5)+'" y="'+((Y(q[1])+Y(n[1]))/2-5)+'" width="10" height="10" transform="rotate(45 '+((X(q[0])+X(n[0]))/2)+' '+((Y(q[1])+Y(n[1]))/2)+')" fill="#fff" stroke="#2f7de1" stroke-width="2" style="cursor:move"/>';
  h+='<circle data-zh="v" data-pi="'+pi+'" data-ri="'+ri+'" data-vi="'+vi+'" cx="'+X(q[0])+'" cy="'+Y(q[1])+'" r="6" fill="#fff" stroke="#2f7de1" stroke-width="2" style="cursor:grab"/>'})})});
 if(zdraft&&zdraft.type==='rect'){var a=zdraft.a,b=zdraft.b||a;h+='<rect x="'+X(Math.min(a.x,b.x))+'" y="'+Y(Math.min(a.y,b.y))+'" width="'+Math.abs(b.x-a.x)*view.s+'" height="'+Math.abs(b.y-a.y)*view.s+'" fill="'+col+'" fill-opacity=".18" stroke="'+col+'" stroke-width="2" stroke-dasharray="6 4" style="pointer-events:none"/>';
  h+='<text x="'+X((a.x+b.x)/2)+'" y="'+(Y(Math.min(a.y,b.y))-8)+'" text-anchor="middle" font-size="12" font-weight="600" fill="#26251f" style="pointer-events:none">'+fmtL(Math.abs(b.x-a.x))+' × '+fmtL(Math.abs(b.y-a.y))+' ft</text>'}
 if(zdraft&&zdraft.type==='poly'){var al=zdraft.pts.concat(zcur?[zcur]:[]),ws='';al.forEach(function(q,i){ws+=(i?'L':'M')+X(q.x)+' '+Y(q.y)});h+='<path d="'+ws+'" fill="'+col+'" fill-opacity=".14" stroke="'+col+'" stroke-width="2" stroke-dasharray="6 4" style="pointer-events:none"/>';
  zdraft.pts.forEach(function(q,i){h+='<circle cx="'+X(q.x)+'" cy="'+Y(q.y)+'" r="'+(i?4:6)+'" fill="'+(i?col:'#fff')+'" stroke="'+col+'" stroke-width="2" style="pointer-events:none"/>'})}
 if(drag&&drag.kind==='zbrush'){var ps='';drag.pts.forEach(function(q,i){ps+=(i?'L':'M')+X(q.x)+' '+Y(q.y)});if(drag.pts.length===1)ps+='L'+(X(drag.pts[0].x)+.1)+' '+Y(drag.pts[0].y);h+='<path d="'+ps+'" fill="none" stroke="'+col+'" stroke-opacity=".35" stroke-width="'+(brushR*2*view.s)+'" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"/>'}
 else if(tool==='zbrush'&&zhover)h+='<circle cx="'+X(zhover.x)+'" cy="'+Y(zhover.y)+'" r="'+brushR*view.s+'" fill="'+col+'" fill-opacity=".12" stroke="'+col+'" stroke-width="1.5" style="pointer-events:none"/>';
 return h}

/* ---- pointer handling while in the Spaces step ---- */
function zSetTool(t){tool=t;zdraft=null;zcur=null;draft=null;cursor=null;render()}
function zDown(e,p,t){if(step==='layout'){if(!e._tap)drag={kind:'pan',ox:view.ox,oy:view.oy,sx:e.clientX,sy:e.clientY,moved:false};return true}
 if(e._tap){zTap(p,e);return true}
 if(e.pointerType==='mouse'&&e.button!==0)return true;
 var z=zById(zSel);if(t.dataset&&t.dataset.zh&&z){var pi=+t.dataset.pi,ri=+t.dataset.ri,vi=+t.dataset.vi,ring=z.mp[pi][ri];
  if(t.dataset.zh==='v'){drag={kind:'zv',z:z,ring:ring,vi:vi,snapshot:snap(),start:p,moved:false};return true}
  var a=ring[vi],b=ring[(vi+1)%ring.length],u=sub({x:b[0],y:b[1]},{x:a[0],y:a[1]}),L=len(u)||1;drag={kind:'ze',z:z,ring:ring,vi:vi,n:{x:-u.y/L,y:u.x/L},o:[a.slice(),b.slice()],snapshot:snap(),start:p,moved:false};return true}
 if(tool==='zbrush'){drag={kind:'zbrush',pts:[p],cross:e.shiftKey,steal:e.altKey,moved:true};render();return true}
 drag={kind:'pan',ox:view.ox,oy:view.oy,sx:e.clientX,sy:e.clientY,moved:false,tapE:{clientX:e.clientX,clientY:e.clientY,target:e.target,shiftKey:e.shiftKey,altKey:e.altKey,pointerType:e.pointerType,button:0,pointerId:e.pointerId,_tap:true,preventDefault:function(){}}};return true}
function zSamePt(a,b){return Math.abs(a[0]-b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9}
function zMoveVert(ring,vi,x,y){var last=ring.length-1,closed=zSamePt(ring[0],ring[last]);ring[vi]=[x,y];if(closed&&(vi===0||vi===last)){ring[0]=[x,y];ring[last]=[x,y]}}
function zMove(p){var dg=drag;if(dg.kind==='zbrush'){var l=dg.pts[dg.pts.length-1];if(len(sub(p,l))>.15)dg.pts.push(p);render();return true}
 if(dg.kind==='zv'){var q=sp(p);dg.moved=dg.moved||len(sub(p,dg.start))>.1;zMoveVert(dg.ring,dg.vi,q.x,q.y);render();return true}
 if(dg.kind==='ze'){var off=Math.round(((p.x-dg.start.x)*dg.n.x+(p.y-dg.start.y)*dg.n.y)*10)/10;dg.moved=dg.moved||Math.abs(off)>0;var a=dg.o[0],b=dg.o[1],j=(dg.vi+1)%dg.ring.length;
  zMoveVert(dg.ring,dg.vi,a[0]+dg.n.x*off,a[1]+dg.n.y*off);zMoveVert(dg.ring,j,b[0]+dg.n.x*off,b[1]+dg.n.y*off);render();return true}
 return false}
function zUp(dg){if(dg.kind==='zbrush'){var cand=brushShape(dg.pts,dg.cross);if(cand&&cand.length)applyPaint(cand,dg.steal);else render();return}
 if(dg.kind==='zv'||dg.kind==='ze'){if(!dg.moved){render();return}var z=dg.z,ok=true;try{z.mp=tidy(PC.intersection(PC.union(z.mp),allowedFor(z.id,false)))}catch(_){ok=false}
  if(!ok||!zPlaced(z)){restore(dg.snapshot);zSel=z.id;toast('That shape folds over itself, so it was put back');return}hist.push(dg.snapshot);fut=[];btns();zSel=z.id;render();return}}
function zTap(p,e){var steal=!!e.altKey;
 if(tool==='zsel'){var z=zoneAt(p);zSel=z?z.id:null;if(!z)zAdd=null;render();return}
 if(tool==='zroom'){var c=roomShape(p);if(!c||!c.length){toast('Click inside the building, not on a wall');return}applyPaint(c,steal);return}
 if(tool==='zrect'){var q=sp(p);if(!zdraft){zdraft={type:'rect',a:q,b:q};render();return}var a=zdraft.a;zdraft=null;if(Math.abs(q.x-a.x)<.5||Math.abs(q.y-a.y)<.5){render();return}
  applyPaint([[[[a.x,a.y],[q.x,a.y],[q.x,q.y],[a.x,q.y],[a.x,a.y]]]],steal);return}
 if(tool==='zpoly'){var q2=zdraft&&zdraft.pts.length?snapFrom(zdraft.pts[zdraft.pts.length-1],p):sp(p);if(!zdraft){zdraft={type:'poly',pts:[q2]};render();return}
  var f=zdraft.pts[0],l=zdraft.pts[zdraft.pts.length-1];if(zdraft.pts.length>=3&&Math.hypot(X(p.x)-X(f.x),Y(p.y)-Y(f.y))<=14){zFinishPoly(steal);return}
  if(len(sub(q2,l))<.3){if(zdraft.pts.length>=3)zFinishPoly(steal);return}zdraft.pts.push(q2);render();return}}
function zFinishPoly(steal){var pts=zdraft.pts;zdraft=null;zcur=null;if(pts.length<3){render();return}var r=pts.map(function(q){return [q.x,q.y]});r.push(r[0].slice());var cand;try{cand=PC.union([r])}catch(_){cand=null}if(!cand||!cand.length){toast('That outline crosses itself');render();return}applyPaint(cand,steal)}
function zHover(p){zhover=p;if(zdraft&&zdraft.type==='rect')zdraft.b=sp(p);if(zdraft&&zdraft.type==='poly')zcur=zdraft.pts.length?snapFrom(zdraft.pts[zdraft.pts.length-1],p):sp(p);if(tool==='zbrush'||zdraft)render()}
document.addEventListener('keydown',function(e){if(step!=='spaces'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.key==='Enter'&&zdraft&&zdraft.type==='poly'){zFinishPoly(e.altKey);return}
 if(e.key==='Escape'){if(zdraft){zdraft=null;zcur=null}else if(zAdd){zAdd=null}else zSel=null;render();return}
 if((e.key==='Delete'||e.key==='Backspace')&&zSel){e.preventDefault();zDelete(zSel)}});
function zDelete(id){var z=zById(id);if(!z)return;push();S.zones.splice(S.zones.indexOf(z),1);if(zSel===id)zSel=null;if(zAdd===id)zAdd=null;toast(z.name+' deleted');render()}

/* ---- steps and panels ---- */
function zReclip(){var base=outlineMP();if(!base.length)return;var cut=blkMP(),al;try{al=cut.length?PC.difference.apply(null,[base].concat(cut)):base}catch(_){return}(S.zones||[]).forEach(function(z){if(zPlaced(z)){try{z.mp=tidy(PC.intersection(z.mp,al))}catch(_){}}})}
function setStep(s){if(s!=='structure'&&step==='structure')zReclip();step=s;document.body.classList.toggle('st-spaces',s==='spaces');document.body.classList.toggle('st-layout',s==='layout');document.body.classList.toggle('st-structure',s==='structure');
 document.querySelectorAll('#steps button').forEach(function(b){b.setAttribute('aria-current',b.dataset.s===s?'page':'false')});
 sel=null;draft=null;cursor=null;zdraft=null;closeMenu&&closeMenu();if(s==='structure'){zSel=null;zAdd=null;setTool('select')}else{tool=s==='spaces'?'zsel':'zview';render()}zPanelKey='';zPanels()}
var zPanelKey='';
function zEsc(s){return esc(String(s))}
function zPanels(){var L=document.getElementById('zleft'),R=document.getElementById('zright');if(!L||!R)return; var key=JSON.stringify([step,tool,ztype,zSel,zAdd,zErase,brushR,(S.zones||[]).map(function(z){return [z.id,z.type,z.plumb,Math.round(zArea(z))]}),Math.round(usableArea())]);if(key===zPanelKey)return;zPanelKey=key;
 if(step==='layout'){L.innerHTML='<h2>Layout</h2><p class="zmuted">Coming next: placing objects into your named zones.</p>';R.innerHTML='<div class="zcard"><div class="zlab">LAYOUT</div><p class="zmuted">This step will hold the object catalog. Each object is placed into one of your zones, and Arrange lays a zone out by its type.</p></div>';return}
 var paintT=[['zroom','Room'],['zrect','Rectangle'],['zpoly','Outline'],['zbrush','Brush']],tg=zTarget();
 var h='<h2>Select</h2><button class="btn zsel'+(tool==='zsel'?' on':'')+'" data-zt="zsel">Select / edit</button>';
 h+='<h2>Paint a zone</h2><div class="zseg" role="group" aria-label="How to paint">'+paintT.map(function(o){return '<button data-zt="'+o[0]+'" aria-pressed="'+(tool===o[0])+'">'+o[1]+'</button>'}).join('')+'</div>';
 if(tool==='zbrush')h+='<div class="zrow"><label class="zsm">Size <select id="z-bsize"><option value="1"'+(brushR===1?' selected':'')+'>2 ft</option><option value="2.5"'+(brushR===2.5?' selected':'')+'>5 ft</option><option value="5"'+(brushR===5?' selected':'')+'>10 ft</option></select></label><label class="zsm"><input type="checkbox" id="z-erase"'+(zErase?' checked':'')+'> Erase</label></div>';
 h+='<div class="zhelp">'+({zsel:'Click a zone to select it. Drag its corners or ◆ to reshape it.',zroom:'Click inside a room to fill all of it.',zrect:'Click one corner, then the opposite corner.',zpoly:'Click each corner; click the first point or press Enter to finish.',zbrush:'Drag to paint. It stops at walls; hold Shift to paint through.'})[tool]+'</div>';
 h+='<h2>Zone type</h2><div class="ztypes">'+ZT.map(function(t){var cur=tg?tg.type===t.id:ztype===t.id;return '<button data-ztype="'+t.id+'" aria-pressed="'+cur+'"><span class="zsw" style="background:'+t.c+'"></span>'+zEsc(t.n)+'</button>'}).join('')+'</div>';
 L.innerHTML=h;
 var zs=S.zones||[],use=usableArea(),zoned=zs.reduce(function(a,z){return a+zArea(z)},0),gen=Math.max(0,use-zoned);
 var r='<div class="zcard"><div class="zlab">THIS SPACE</div><div class="zbig">'+Math.round(use).toLocaleString()+' sq ft</div><div class="zmuted" style="margin-top:-4px">usable floor</div>';
 r+='<div class="zstats"><span>In zones</span><b>'+Math.round(zoned).toLocaleString()+' sq ft</b><span>General floor</span><b>'+Math.round(gen).toLocaleString()+' sq ft</b></div>';
 if(use>0){r+='<div class="zbar" aria-hidden="true">'+zs.filter(zPlaced).map(function(z){return '<span style="flex:'+zArea(z)+';background:'+(ZTB[z.type]||ZT[0]).c+'"></span>'}).join('')+'<span style="flex:'+gen+';background:#ece9e2"></span></div>'}
 if(zs.length)r+='<div class="zlist">'+zs.map(function(z){var t=ZTB[z.type]||ZT[0];return '<button data-zsel="'+z.id+'" aria-pressed="'+(zSel===z.id)+'"><span class="zsw" style="background:'+t.c+'"></span><span class="zn">'+zEsc(z.name)+'</span><span class="za">'+(zPlaced(z)?Math.round(zArea(z)).toLocaleString()+' sq ft':'not placed')+'</span></button>'}).join('')+'</div>';
 r+='<button class="btn" id="z-new" style="margin-top:8px">+ New zone</button></div>';
 var z=zById(zSel);if(z){var t=ZTB[z.type]||ZT[0];r+='<div class="zcard"><div class="zlab">SELECTED ZONE</div><label class="zfl">Name<input id="z-name" value="'+zEsc(z.name)+'" autocomplete="off"></label>';
  r+='<label class="zfl">Type<select id="z-type">'+ZT.map(function(o){return '<option value="'+o.id+'"'+(o.id===z.type?' selected':'')+'>'+zEsc(o.n)+'</option>'}).join('')+'</select></label>';
  r+='<div class="zstats"><span>Area</span><b>'+(zPlaced(z)?Math.round(zArea(z)).toLocaleString()+' sq ft':'not placed yet')+'</b></div>';
  if(t.pl!=='off')r+='<label class="zchk"><input type="checkbox" id="z-plumb"'+((t.pl==='on'||z.plumb)?' checked':'')+(t.pl==='on'?' disabled':'')+'> Has plumbing'+(t.pl==='on'?'<span>always on for this type</span>':'')+'</label>';
  if(!zPlaced(z))r+='<div class="zbanner">Not placed yet: pick a paint tool and paint it onto the plan.</div>';
  else if(zAdd===z.id)r+='<div class="zbanner"><span>Painting adds to <b>'+zEsc(z.name)+'</b>.</span><button class="btn" id="z-done">Start a new zone</button></div>';
  else r+='<button class="btn" id="z-more">Paint more of this zone</button>';
  r+='<button class="btn zdel" id="z-del">Delete zone</button></div>'}
 R.innerHTML=r;
 L.querySelectorAll('[data-zt]').forEach(function(b){b.onclick=function(){zErase=zErase&&b.dataset.zt==='zbrush';zSetTool(b.dataset.zt);zPanels()}});
 L.querySelectorAll('[data-ztype]').forEach(function(b){b.onclick=function(){var tg2=zTarget();if(tg2&&tg2.type!==b.dataset.ztype)zAdd=null;if(zById(zSel)&&zPlaced(zById(zSel))&&zAdd!==zSel)zSel=null;ztype=b.dataset.ztype;zErase=false;if(tool==='zsel')zSetTool('zroom');else render()}});
 var bs=document.getElementById('z-bsize');if(bs)bs.onchange=function(){brushR=+bs.value;render()};var er=document.getElementById('z-erase');if(er)er.onchange=function(){zErase=er.checked;render()};
 R.querySelectorAll('[data-zsel]').forEach(function(b){b.onclick=function(){zSel=b.dataset.zsel;var zz=zById(zSel);zAdd=null;if(zz&&zPlaced(zz))zSetTool('zsel');else render()}});
 var nb=document.getElementById('z-new');if(nb)nb.onclick=function(){push();var nz=zNew(ztype,[]);zSel=nz.id;zAdd=nz.id;if(tool==='zsel')tool='zroom';render();setTimeout(function(){var n=document.getElementById('z-name');if(n){n.focus();n.select()}},30)};
 var zn=document.getElementById('z-name');if(zn&&z){zn.onfocus=function(){zn._snap=snap()};zn.oninput=function(){z.name=zn.value;var li=R.querySelector('[data-zsel="'+z.id+'"] .zn');if(li)li.textContent=zn.value;render()};zn.onchange=zn.onblur=function(){var v=zn.value.trim()||ZTB[z.type].n;if(zn._snap&&v!==JSON.parse(zn._snap).z.filter(function(q){return q.id===z.id}).map(function(q){return q.name})[0]){hist.push(zn._snap);fut=[];btns()}zn._snap=null;z.name=v;zn.value=v;var li2=R.querySelector('[data-zsel="'+z.id+'"] .zn');if(li2)li2.textContent=v;render()};zn.onkeydown=function(e){if(e.key==='Enter'||e.key==='Escape')zn.blur()}}
 var zt=document.getElementById('z-type');if(zt&&z)zt.onchange=function(){push();z.type=zt.value;z.plumb=ZTB[z.type].pl==='on';ztype=z.type;render()};
 var zp=document.getElementById('z-plumb');if(zp&&z)zp.onchange=function(){push();z.plumb=zp.checked;render()};
 var zm=document.getElementById('z-more');if(zm&&z)zm.onclick=function(){zAdd=z.id;if(tool==='zsel')tool='zroom';render()};
 var zd=document.getElementById('z-done');if(zd)zd.onclick=function(){zAdd=null;zSel=null;render()};
 var zx=document.getElementById('z-del');if(zx&&z)zx.onclick=function(){zDelete(z.id)}}
function zInitUI(){if(document.getElementById('steps'))return;var top=document.querySelector('.app .top'),h1=top&&top.querySelector('h1');if(!top)return;
 if(h1)h1.textContent='Floor Plan';var nav=document.createElement('nav');nav.id='steps';nav.setAttribute('aria-label','Floor plan steps');nav.innerHTML='<button data-s="structure" aria-current="page">1 · Structure</button><button data-s="spaces">2 · Spaces</button><button data-s="layout">3 · Layout</button>';
 if(h1&&h1.nextSibling)top.insertBefore(nav,h1.nextSibling);else top.appendChild(nav);nav.querySelectorAll('button').forEach(function(b){b.onclick=function(){if(b.dataset.s!=='structure'&&!S.outline){toast('Set up the outer walls first');return}setStep(b.dataset.s)}});
 var panes=document.querySelectorAll('.app .pane');if(panes.length<2)return;panes[0].classList.add('zpL');panes[1].classList.add('zpR');var L=document.createElement('div');L.id='zleft';panes[0].appendChild(L);var R=document.createElement('div');R.id='zright';panes[1].appendChild(R);document.body.classList.add('st-structure');zPanels()}
window.addEventListener('load',function(){setTimeout(zInitUI,0)});
window.__cave=Object.assign(window.__cave||{},{zones:{get:function(){return S.zones},step:function(s){if(s)setStep(s);return step},sel:function(){return zSel},area:zArea,brush:function(pts,c){return brushShape(pts,c)},grid:function(){var g=zGrid();return g&&{W:g.W,H:g.H,walls:g.wall.reduce(function(a,b){return a+b},0)}},at:function(x,y){var z=zoneAt({x:x,y:y});return z&&z.id}}});
