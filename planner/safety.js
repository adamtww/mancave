/* ================= Safety =================
   One table for every number the safety checks use, with where it comes from. Nothing else in the app
   should hard-code a safety distance: add a rule here and point items at it.
   Kinds of rule (see the plan in the project doc "Safety in Design mode"):
     clear  - space around an item that nothing may sit in; a fixed minimum under the editable clearance (phase 1)
     place  - where an item may go (exterior wall, floor surface, out of doorways)               (phase 2)
     apart  - item A not within n ft of item B unless a wall or barrier is between them        (phase 3)
     near   - item A needs a safety item B within n ft (placed automatically)                   (phase 4)
   Hard blocks: clear, place. Warnings with a fix: apart, near. */
var SAFE={
 spray:{k:'clear',n:3,t:'Spray booth clear space',why:'A spray or powder booth needs 3 ft clear on every side, free of storage and anything combustible, so it can be cleaned.',src:'Cal/OSHA 5446(h) · CFC 2404.3.3.5 · NFPA 33',note:'A booth may go against a wall only if that wall is 1-hour fire rated.'},
 elec:{k:'clear',n:3,t:'Electrical working space',why:'Electrical panels and disconnects need 36 in clear in front (at least 30 in wide, 6.5 ft high), with no storage in it.',src:'NEC 110.26 · OSHA 1910.303(g)'},
 appl:{k:'clear',n:2.5,t:'Appliance service space',why:'A water heater needs a level 30 × 30 in working space in front of its controls.',src:'CPC 508 · IMC 306.1'},
 oper:{k:'clear',n:3,t:'Operator space',why:'Someone stands here to run the machine and handle the work, out of the way of people walking past.',src:'Shop layout practice (OSHA 1910.22 / 1910.176 require clear working and walking space but set no number)'},
 feed:{k:'clear',n:3,t:'Stock feed space',why:'Boards come off this side of the machine; nobody should be walking or standing in their path.',src:'Shop layout practice'},
 kiln:{k:'clear',n:1.5,t:'Kiln heat clearance',why:'Kilns get hot on the outside. Makers ask for at least 12 in, ideally 18 in, to walls and anything combustible.',src:'Kiln manufacturer installation guides'},
 comp:{k:'clear',n:1,t:'Compressor cooling air',why:'Compressors need air moving around them to stay cool.',src:'Compressor manufacturer guides (12–18 in)'},
 cook:{k:'clear',n:3,t:'Cooking line aisle',why:'Room to work hot pots, fryers and oven doors safely.',src:'Commercial kitchen layout practice'},
 flam:{k:'clear',n:3,t:'Flammable storage access',why:'Keep 3 ft clear in front of flammable storage so the doors open fully and nothing piles up against it.',src:'OSHA 1910.106(d)(5)'},
 lift:{k:'clear',n:2,t:'Lift walk-around',why:'Room to walk all the way around a raised vehicle and reach the lift controls and arms.',src:'Lift manufacturer installation guides'},
 hotwork:{k:'apart',n:35,t:'Hot-work separation',why:'Welding and cutting sparks travel up to 35 ft. Keep anything combustible that far away, or put fire curtains or a wall between.',src:'OSHA 1910.252(a) · NFPA 51B'}
};
/* fixed minimum clearance for an item: [front, back, left, right] in ft, and the rule behind each side */
var KMIN={},KM=function(ids,k,r){ids.split(' ').forEach(function(id){KMIN[id]={k:k,r:Array.isArray(r)?r:[r,r,r,r]}})};
KM('mf-spray mf-pcbooth',[3,3,3,3],'spray');
KM('mf-water1 mf-water2 mf-plasma1 mf-plasma2 mf-fiber mf-brake mf-shear mf-finger mf-roll mf-lathe mf-mill mf-hband mf-grind mf-table mf-pcoven m-weld2 w-tsawj w-band w-router w-miter w-jointer w-cnc w-lathe w-panel a-press a-tire',[3,0,0,0],['oper','','','']);
KM('w-tsaw w-planer',[3,3,0,0],['oper','feed','','']);
KM('cr-kiln1 cr-kiln2',[1.5,1.5,1.5,1.5],'kiln');
KM('m-comp w-comp',[1,1,1,1],'comp');
KM('s-heater',[2.5,0,0,0],['appl','','','']);
KM('kc-range kc-griddle kc-broiler kc-fryer kc-pizza kc-conv',[3,0,0,0],['cook','','','']);
KM('s-flam',[3,0,0,0],['flam','','','']);
KM('a-lift2 a-lift4 a-scissor',[2,2,2,2],'lift');
/* hazard tags. e: what it gives off. s: what it's sensitive to.
   spark, flame (open burner), heat (hot surface), dust (combustible dust), vapor (flammable vapor), laser (open beam), fume, noise, water
   comb (combustible stock or material), flam (flammable liquid), veh (vehicle with fuel), elec (screens and electronics), quiet */
var HZ={},HT=function(ids,e,s){ids.split(' ').forEach(function(id){var h=HZ[id]=HZ[id]||{e:[],s:[]};(e?e.split(','):[]).forEach(function(x){if(h.e.indexOf(x)<0)h.e.push(x)});(s?s.split(','):[]).forEach(function(x){if(h.s.indexOf(x)<0)h.s.push(x)})})};
HT('a-mig1 a-mig2 m-weld1 m-weld2 m-weld3 mf-plasma1 mf-plasma2 mf-grind mf-table','spark');
HT('kc-range kc-griddle kc-broiler kc-pizza kr-gasrange','flame');
HT('cr-kiln1 cr-kiln2 mf-pcoven m-tunnel f-sauna kc-fryer kc-conv l-pizza m-dtf cc-irtube cc-unith','heat');
HT('w-tsaw w-tsawj w-band w-router w-miter w-jointer w-planer w-sander w-cnc w-lathe w-panel w-scroll w-drill w-dust w-cyclone m-mill mf-pcbooth','dust');
HT('mf-spray s-flam a-parts m-resin','vapor');
HT('m-weld1 m-weld2 m-weld3 m-fiber','laser');
HT('m-laser1 m-laser2 m-laser3 mf-fiber mf-plasma1 mf-plasma2 a-mig1 a-mig2 m-weld1 m-weld2 m-weld3 m-bench m-resin m-dtf m-uvflat a-parts cr-kiln1 cr-kiln2 mf-pcoven m-tunnel mf-spray m-print3 kc-range kc-griddle kc-broiler kc-fryer kc-pizza','fume');
HT('mf-wpump mf-water2 mf-shear mf-brake m-comp w-comp w-dust w-cyclone w-planer w-tsaw w-tsawj w-cnc w-miter w-router mf-plasma1 mf-plasma2 mf-grind a-blast','noise');
HT('mf-water1 mf-water2 mf-chiller cr-wheel f-plunge','water');
HT('w-lumber s-sheet w-dust w-cyclone z-wood mf-spray mf-pcbooth m-filament cr-quilt cr-sew cr-serger cr-cut s-pack s-pallet','','comb');
HT('s-flam mf-spray a-parts','','flam');
HT('a-car a-pickup a-evbay a-lift2 a-lift4 a-moto r-truck','','veh,flam');
HT('r-office ht-row3 mu-booth mu-desk','','quiet');
var HZCAT={'Arcade & Gaming':{s:['elec']},'Home Theater & Music':{s:['elec','quiet']},'Bedroom':{s:['quiet']}};
function hzOf(c){var r=c&&c.r,h=HZ[r]||{e:[],s:[]},x=c&&HZCAT[c.c];if(!x)return h;return {e:h.e,s:h.s.concat(x.s.filter(function(v){return h.s.indexOf(v)<0}))}}
/* library defaults never sit below the minimum */
Object.keys(KMIN).forEach(function(r){var o=BY[r];if(!o||o.z)return;var k=Array.isArray(o.k)?o.k:kFrom(o);o.k=k.map(function(v,i){return Math.max(v,KMIN[r].k[i])});normObj(o)});
function kMinOf(c){var m=c&&KMIN[c.r];return m?m.k:null}
function kMinRules(c){var m=c&&KMIN[c.r];if(!m)return [];var seen={},o=[];m.r.forEach(function(r){if(r&&!seen[r]&&SAFE[r]){seen[r]=1;o.push(SAFE[r])}});return o}
var KCLAMP=typeof WeakMap!=='undefined'?new WeakMap():null;
function kSafe(c,k){var m=kMinOf(c);if(!m)return k;if(!(k[0]<m[0]||k[1]<m[1]||k[2]<m[2]||k[3]<m[3]))return k;
 var e=KCLAMP&&KCLAMP.get(k);if(e)return e;var v=k.map(function(x,i){return Math.max(x,m[i])});if(KCLAMP)KCLAMP.set(k,v);return v}
// "front 3 ft", "3 ft all around"
function kMinTxt(c){var m=kMinOf(c);if(!m)return '';var n=['front','back','left','right'];if(m[0]&&m[0]===m[1]&&m[1]===m[2]&&m[2]===m[3])return fmt(m[0])+' ft all around';return m.map(function(v,i){return v?n[i]+' '+fmt(v)+' ft':''}).filter(Boolean).join(', ')}
// raw clearance of a placed object below its minimum (saved before the minimums existed)?
function belowMin(it){var c=defOf0(it),m=kMinOf(c);if(!m)return false;var k=it.k||(Array.isArray(c.k)?c.k:kFrom(c));return k.some(function(v,i){return v<m[i]-1e-9})}
// bring an opened layout up to the safety minimums: write the raised values and re-fit anything that now clashes
function safetyLift(say){if(!P||!P.items)return 0;var n=0;P.items.forEach(function(it){if(!belowMin(it))return;n++;var c=defOf0(it),m=kMinOf(c);if(it.k)it.k=it.k.map(function(v,i){return Math.max(v,m[i])});
  if(P.defs&&P.defs[it.r]&&Array.isArray(P.defs[it.r].k))P.defs[it.r].k=P.defs[it.r].k.map(function(v,i){return Math.max(v,m[i])})});
 if(!n)return 0;relayout({nogrow:true});persist();if(say)toast(n+' object'+(n>1?'s were':' was')+' given more clearance to meet safety minimums');return n}
var SHIELD='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>';
// the "why" under a clearance editor: which sides are locked and the rule behind them
function kMinNote(c){var R=kMinRules(c);if(!R.length)return '';return '<div class="kmnote">'+SHIELD+'<div><b>Safety minimum: '+esc(kMinTxt(c))+'</b>'+R.map(function(r){return '<small>'+esc(r.why)+(r.note?' '+esc(r.note):'')+' <i>'+esc(r.src)+'</i></small>'}).join('')+'</div></div>'}
// typing a value under the minimum snaps it back up and points at the reason
function kMinWire(d){d.querySelectorAll('input[data-min]').forEach(function(x){x.addEventListener('change',function(){var v=parseFloat(x.value),m=+x.dataset.min;if(!(v>=m-1e-9)){x.value=fmt(m);x.classList.add('kbump');var n=d.querySelector('.kmnote');if(n){n.classList.remove('kflash');void n.offsetWidth;n.classList.add('kflash')}setTimeout(function(){x.classList.remove('kbump')},900)}})})}
