import sys
p=sys.argv[1];s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1,(p,a[:70],s.count(a));s=s.replace(a,b)
helpers=r"""/* ---------- rule: interior walls stay inside the building ---------- */
function outlineFlat(){return S.outline?flat(S.outline.pts):null}
function distToOutline(q,f){var best=Infinity;for(var i=0;i<f.length;i++){var a=f[i],b=f[(i+1)%f.length],ab=sub(b,a),L2=ab.x*ab.x+ab.y*ab.y||1,t=Math.max(0,Math.min(1,((q.x-a.x)*ab.x+(q.y-a.y)*ab.y)/L2)),d=Math.hypot(q.x-a.x-ab.x*t,q.y-a.y-ab.y*t);if(d<best)best=d}return best}
function insideOK(q,f){f=f||outlineFlat();return !f||inPoly(f,q.x,q.y)||distToOutline(q,f)<.2}
function segInside(a,b,f){f=f||outlineFlat();if(!f)return true;var L=len(sub(b,a)),m=Math.max(1,Math.ceil(L/.5));for(var j=0;j<=m;j++)if(!insideOK({x:a.x+(b.x-a.x)*j/m,y:a.y+(b.y-a.y)*j/m},f))return false;return true}
function wallsInside(){var f=outlineFlat();if(!f)return true;return S.walls.every(function(w){for(var k=1;k<w.pts.length;k++)if(!segInside(w.pts[k-1],w.pts[k],f))return false;return true})}
function onOutline(q){var f=outlineFlat(),best=null;for(var i=0;i<f.length;i++){var a=f[i],b=f[(i+1)%f.length],ab=sub(b,a),L2=ab.x*ab.x+ab.y*ab.y||1,t=Math.max(0,Math.min(1,((q.x-a.x)*ab.x+(q.y-a.y)*ab.y)/L2)),c={x:a.x+ab.x*t,y:a.y+ab.y*t},d=len(sub(c,q));if(!best||d<best.d)best={d:d,pt:c}}return best?best.pt:q}
var outWarnT=0;function warnOut(){var n=Date.now();if(n-outWarnT>2500){outWarnT=n;toast('Interior walls have to stay inside the building.')}}
"""
rep("function render(){",helpers+"function render(){")
# after joints are worked out, undo a move that would put an interior wall outside
rep("function render(){resolveJoints(drag&&drag.sh&&drag.sh.open&&(drag.kind==='vertex'||drag.kind==='wall')?drag.sh:null);",
    "function render(){resolveJoints(drag&&drag.sh&&drag.sh.open&&(drag.kind==='vertex'||drag.kind==='wall')?drag.sh:null);\n if(drag&&drag._keep){var kp=drag._keep;drag._keep=null;if(!wallsInside()){if(drag.sh)drag.sh.pts=kp.sh;S.walls.forEach(function(w,i){if(kp.w[i])w.pts=kp.w[i]});if(S.outline&&kp.o)S.outline.pts=kp.o;resolveJoints(drag.sh&&drag.sh.open?drag.sh:null);warnOut()}}")
# remember the last good layout before each drag step
rep(" if(drag.kind==='pan'){view.ox=drag.ox+e.clientX-drag.sx;",
    " if(drag.kind==='vertex'||drag.kind==='wall'||drag.kind==='edge'){drag._keep={sh:drag.sh?cp(drag.sh.pts):null,o:S.outline?cp(S.outline.pts):null,w:S.walls.map(function(w){return cp(w.pts)})}}\n if(drag.kind==='pan'){view.ox=drag.ox+e.clientX-drag.sx;")
# drawing a new interior wall: points outside snap onto the building's edge; a stretch that leaves the building isn't allowed
rep(" if(tool==='iwall'){if(!draft)draft={type:'wall',pts:[]};var wl=draft.pts[draft.pts.length-1],hh=nearestHost(p,null,12/view.s),wq=hh?hh.pt:snapFrom(wl,p);",
    " if(tool==='iwall'){if(!draft)draft={type:'wall',pts:[]};var wl=draft.pts[draft.pts.length-1],hh=nearestHost(p,null,12/view.s),wq=hh?hh.pt:snapFrom(wl,p);\n  if(S.outline&&!insideOK(wq)){wq=onOutline(wq);hh={pt:wq}}\n  if(wl&&!segInside(wl,wq)){warnOut();return}")
# imported walls: anything Claude put outside the building is pulled back onto its edge
rep(" for(var pass=0;pass<2;pass++)S.walls.forEach(function(w){attachRay(w,3,2.5)});",
    " for(var pass=0;pass<2;pass++)S.walls.forEach(function(w){attachRay(w,3,2.5)});\n (function(){var f=outlineFlat();S.walls.forEach(function(w){w.pts.forEach(function(q){if(!insideOK(q,f)){var c=onOutline(q);q.x=c.x;q.y=c.y}})});S.walls=S.walls.filter(function(w){var L=0;for(var k=1;k<w.pts.length;k++)L+=len(sub(w.pts[k],w.pts[k-1]));return L>.5})})();")
open(p,'w').write(s);print('ok',p)
