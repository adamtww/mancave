/* ---------------- Summary tab ----------------
   Read-only pages about the layout. Power: the plan with every outlet the app worked out, and the circuits beside it
   (tap one to see where it runs). Plumbing, Ventilation, Space and Costs come later. */
var SUM=false,SUMC=null,SUMP='power',sumVW=null;
var SVC=[100,125,150,200,225,300,400,600,800,1000,1200,1600,2000];
function setSummary(on,quiet){if(SUM===on)return;if(on){if(EX.on)setExplore(false);if(BLD){BLD=false;document.body.classList.remove('building');selR=null;selD=null;selE=null;selW=null}
  sumVW={lv:VW.lv,md:VW.md};VW.lv='g';VW.md='p';sel=null;selO=null;selZ=null;selF=null;libV=null;SUMC=null}
 else{if(sumVW){VW.lv=sumVW.lv;VW.md='o'}else VW.md='o';SUMC=null;selO=null}
 SUM=on;document.body.classList.toggle('summary',on);sumTabs();if(!quiet){renderLib();render()}
 setTimeout(function(){window.dispatchEvent(new Event('resize'))},0)}
// the sub-tabs and legend sit over the plan
function sumTabs(){var st=document.querySelector('.stage');if(!st)return;var t=$('#sumtabs');if(!SUM){if(t)t.remove();var lg=$('#sumleg');if(lg)lg.remove();return}
 if(!t){t=document.createElement('div');t.id='sumtabs';t.className='sumtabs';st.appendChild(t)}
 var P0=[['power','Power',1],['plumb','Plumbing',0],['vent','Ventilation',0],['space','Space',0],['cost','Costs',0]];
 t.innerHTML=P0.map(function(q){return '<button class="'+(q[0]===SUMP?'on':'')+(q[2]?'':' soon')+'"'+(q[2]?'':' disabled')+'>'+q[1]+(q[2]?'':'<i>soon</i>')+'</button>'}).join('');
 var lg=$('#sumleg');if(!lg){lg=document.createElement('div');lg.id='sumleg';lg.className='sumleg';st.appendChild(lg)}
 lg.innerHTML='<span><i style="background:#2f7de1"></i>120V</span><span><i style="background:#e07b1f"></i>240V</span><span><i style="background:#b42336"></i>3-phase</span><span><i style="background:#5f5b52"></i>Wired in</span><span class="ro">Read only · tap a circuit or outlet</span>'}
function cLoad(c){var w=0;c.out.forEach(function(id){var o=outBy(id);if(o)w+=o.w||o.zw||0});return w}
function cCap(c){return c.V*c.A*(c.ph===3?1.732:1)}
function cWhat(c){if(c.zone){var o=outBy(c.out[0]);return o?[(o.zn||'')+' × '+(o.zf||'light')+' · light zone '+(o.zi||'')]:['Light zone']}
 var n={},order=[];P.items.forEach(function(it){if(c.out.indexOf(P.pw.links[it.u])<0)return;var nm=defOf(it).n;if(!n[nm]){n[nm]=0;order.push(nm)}n[nm]++});
 return order.length?order.map(function(k){return k+(n[k]>1?' ×'+n[k]:'')}):[c.gp?'Spare outlets':'Nothing plugged in yet']}
function cType(c){var o=outBy(c.out[0])||{};return c.ty==='hw'?{t:'Wired',col:'#5f5b52',bg:'#ece9e2'}:c.ph===3||(c.ty||'').slice(0,2)==='3p'?{t:'3-phase',col:'#b42336',bg:'#fbe3e3'}:c.V===240?{t:'240V',col:'#b3561a',bg:'#fdebdc'}:c.zone||c.feed?{t:'Ceiling',col:'#8a6510',bg:'#fff4d6'}:{t:'120V',col:'#1d5fb8',bg:'#e3eefc'}}
function svcCalc(){var tot=0,big=null,three=false;(P.pw?P.pw.circ:[]).forEach(function(c){var w=cLoad(c);tot+=w;if(c.ph===3)three=true;var a=w/(c.ph===3?1.732*208:c.V===240?240:240);if(!big||a>big.a)big={c:c,a:w/(c.V||120)}});
 var amps=tot/240,need=amps*1.25,svc=SVC.filter(function(v){return v>=need})[0]||Math.ceil(need/100)*100;return {w:tot,amps:amps,need:need,svc:svc,big:big,three:three}}
function sumSide(){if(!P.pw||!P.pw.circ.length)return '<div class="card"><span class="lab">Power</span><p class="muted" style="margin-top:8px">Nothing that uses power yet. Place objects in Design and the outlets and circuits they need are worked out here automatically.</p></div>';
 var s=svcCalc(),C=P.pw.circ,nOut=P.pw.outlets.length,ded=C.filter(function(c){return c.ded}).length,
  h='<div class="sumtiles"><div class="tile hi"><span>Service needed</span><b>'+s.svc+' A</b><small>'+Math.round(s.amps)+' A at 240 V + 25% growth</small></div><div class="tile"><span>Connected</span><b>'+(s.w>=1000?fmt(Math.round(s.w/100)/10)+' kW':Math.round(s.w)+' W')+'</b><small>'+C.length+' circuit'+(C.length>1?'s':'')+' · '+nOut+' outlet'+(nOut>1?'s':'')+'</small></div></div>'+
  '<p class="lab" style="margin:14px 2px 8px">Circuits</p>';
 C.forEach(function(c){var ty=cType(c),pc=Math.round(cLoad(c)/cCap(c)*100),on=SUMC===c.id,wh=cWhat(c);
  h+='<button class="scirc'+(on?' on':'')+'" data-c="'+c.id+'"><div class="sch"><b>C'+c.id+'</b><span class="v" style="color:'+ty.col+';background:'+ty.bg+'">'+ty.t+'</span><span class="sbr">'+(c.ty==='hw'?c.A+' A wired':c.A+' A'+(c.ded?' · own circuit':''))+'</span>'+(c.ty==='hw'?'<span class="sld">'+fmt(Math.round(cLoad(c)/100)/10)+' kW</span>':'<span class="sld"><span class="bar"><i style="width:'+Math.min(100,pc)+'%;background:'+(pc>80?'#e0a21b':'#2f9e6a')+'"></i></span>'+pc+'%</span>')+'</div>'+
   (on?'<div class="schips">'+wh.map(function(x){return '<span class="schp">'+esc(x)+'</span>'}).join('')+'</div>':'<div class="swh">'+esc(wh.join(', '))+'</div>')+'</button>'});
 var notes='';if(s.big&&s.big.a>50&&cLoad(s.big.c)/s.w>.35)notes+='<div class="snote r"><b>!</b><div><b>'+esc(cWhat(s.big.c)[0])+' needs '+Math.round(s.big.a)+' A on its own.</b> That one load is '+Math.round(cLoad(s.big.c)/s.w*100)+'% of the service.</div></div>';
 if(s.three)notes+='<div class="snote y"><b>i</b><div><b>3-phase equipment.</b> The building needs a 3-phase service, or a phase converter for those machines.</div></div>';
 var gf=P.items.filter(function(it){var c=defOf(it);return c&&pspec(c)&&((c.a||[]).indexOf('plumbing')>=0||/sink|vanity|toilet|bidet|shower|tub/i.test(c.n))}).length;if(gf)notes+='<div class="snote b"><b>i</b><div>'+gf+' load'+(gf>1?'s':'')+' near water need GFCI protection.</div></div>';
 notes+='<div class="snote b"><b>✓</b><div>Worked out automatically from what\'s placed. It updates every time something moves.</div></div>';
 return '<div class="card sumcard">'+h+'<div style="margin-top:12px">'+notes+'</div></div>'}
function sumWire(){document.querySelectorAll('#side .scirc').forEach(function(b){b.onclick=function(){var id=+b.dataset.c;SUMC=SUMC===id?null:id;render()}})}
