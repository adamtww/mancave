/* ---- top-down symbols: drawn in local space, centered, front = +y (bottom) ---- */
var INK='#3d3b36',SW=0.07;
function _a(o){var s='';for(var k in o)s+=' '+k+'="'+o[k]+'"';return s}
function iR(x,y,w,h,o){o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"'+_a(Object.assign({fill:'none',stroke:INK,'stroke-width':SW},o))+'/>'}
function iC(cx,cy,r,o){o=o||{};return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'"'+_a(Object.assign({fill:'none',stroke:INK,'stroke-width':SW},o))+'/>'}
function iL(x1,y1,x2,y2,o){o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"'+_a(Object.assign({stroke:INK,'stroke-width':SW,'stroke-linecap':'round'},o))+'/>'}
function iP(d,o){o=o||{};return '<path d="'+d+'"'+_a(Object.assign({fill:'none',stroke:INK,'stroke-width':SW,'stroke-linecap':'round','stroke-linejoin':'round'},o))+'/>'}
var STEEL='#e6e4df',WHITE='#fbfaf7',WATER='#dbe5ea',DARK='#cfccc4';
function body(W,D,f){return iR(-W/2,-D/2,W,D,{fill:f||WHITE,rx:Math.min(W,D)*0.06})}
function knobs(W,y,n,r){var s='';for(var i=0;i<n;i++){var x=-W/2+W*(i+1)/(n+1);s+=iC(x,y,r,{fill:DARK})}return s}
function burnerE(cx,cy,r){return iC(cx,cy,r)+iC(cx,cy,r*0.62)+iC(cx,cy,r*0.25)}
function burnerG(cx,cy,s){return iR(cx-s/2,cy-s/2,s,s,{fill:STEEL})+iL(cx-s/2,cy,cx+s/2,cy)+iL(cx,cy-s/2,cx,cy+s/2)+iC(cx,cy,s*0.18,{fill:DARK})}
function basin(x,y,w,h){var r=Math.min(w,h)*0.18;return iR(x,y,w,h,{fill:WATER,rx:r})+iC(x+w/2,y+h/2,Math.min(w,h)*0.07,{fill:INK,stroke:'none'})}
function faucet(cx,y){return iC(cx,y,0.14,{fill:DARK})+iL(cx,y,cx,y+0.45,{'stroke-width':0.11})}
var ICONS={
 'kr-range':function(W,D){var t=-D/2+D*0.08,b=D/2-D*0.24,cw=W/4,ch=(b-t)/4;
  return body(W,D,STEEL)+burnerE(-cw,t+ch,Math.min(cw,ch)*0.8)+burnerE(cw,t+ch,Math.min(cw,ch)*0.65)+burnerE(-cw,t+ch*3,Math.min(cw,ch)*0.65)+burnerE(cw,t+ch*3,Math.min(cw,ch)*0.8)
   +iL(-W/2,D/2-D*0.18,W/2,D/2-D*0.18)+knobs(W,D/2-D*0.09,5,Math.min(W,D)*0.035)},
 'kr-fridge':function(W,D){var y=D/2-D*0.1;return body(W,D,WHITE)+iL(0,-D/2+D*0.12,0,D/2)+iL(-W/2,y,W/2,y,{'stroke-dasharray':'0.15 0.1'})
   +iL(-W*0.08,D/2-0.02,-W*0.08,D/2-D*0.28,{'stroke-width':0.12})+iL(W*0.08,D/2-0.02,W*0.08,D/2-D*0.28,{'stroke-width':0.12})
   +iL(-W/2+W*0.1,-D/2+D*0.12,W/2-W*0.1,-D/2+D*0.12,{stroke:DARK})},
 'kr-dw':function(W,D){var s='',n=5;for(var i=1;i<n;i++){var x=-W/2+W*i/n;s+=iL(x,-D/2+D*0.1,x,D/2-D*0.22,{stroke:DARK})}
  return body(W,D,STEEL)+s+iC(0,-0.05*D,Math.min(W,D)*0.18)+iL(-W*0.2,-0.05*D,W*0.2,-0.05*D)+iL(-W/2,D/2-D*0.14,W/2,D/2-D*0.14)+iL(-W*0.3,D/2-D*0.07,W*0.3,D/2-D*0.07,{'stroke-width':0.11})},
 'kr-micro':function(W,D){return body(W,D,STEEL)+iR(-W/2+W*0.07,-D/2+D*0.12,W*0.6,D*0.72,{fill:'#d9d6cf',rx:0.06})+iC(-W/2+W*0.07+W*0.3,0,Math.min(W,D)*0.2,{stroke:DARK})
   +iL(W/2-W*0.27,-D/2+D*0.12,W/2-W*0.27,D/2-D*0.16)+(function(){var s='';for(var r=0;r<3;r++)for(var c=0;c<2;c++)s+=iC(W/2-W*0.19+c*W*0.09,-D/2+D*0.3+r*D*0.18,0.05,{fill:INK,stroke:'none'});return s})()},
 'kr-counter':function(W,D){var bw=Math.min(W*0.16,1.4),bh=D*0.55,g=0.15,cx=0,y=-D/2+D*0.28;
  return body(W,D,'#f1eee8')+iL(-W/2,-D/2+0.12,W/2,-D/2+0.12,{stroke:DARK})+basin(cx-bw-g/2,y,bw,bh)+basin(cx+g/2,y,bw,bh)+faucet(cx,-D/2+0.28)
   +iL(-W/2,D/2-0.06,W/2,D/2-0.06,{stroke:DARK})},
 'kc-range':function(W,D){var s=body(W,D,STEEL),t=-D/2+D*0.08,u=(D*0.72)/2,cw=W/3,sz=Math.min(cw,u)*0.82;
  for(var r=0;r<2;r++)for(var c=0;c<3;c++)s+=burnerG(-W/2+cw*(c+0.5),t+u*(r+0.5),sz);
  return s+iR(-W/2,D/2-D*0.2,W,D*0.2,{fill:DARK})+knobs(W,D/2-D*0.1,6,Math.min(W,D)*0.03)},
 'kc-hood':function(W,D){var s=iR(-W/2,-D/2,W,D,{fill:'rgba(230,228,223,.55)','stroke-dasharray':'0.35 0.2'}),n=Math.max(3,Math.round(W/1.6)),pw=(W-0.6)/n;
  for(var i=0;i<n;i++){var x=-W/2+0.3+i*pw;s+=iR(x+0.05,-D/2+0.4,pw-0.1,D*0.55,{fill:STEEL});for(var k=1;k<5;k++){var yy=-D/2+0.4+k*D*0.11;s+=iL(x+0.15,yy,x+pw-0.15,yy,{stroke:DARK,'stroke-width':0.05})}}
  return s+iC(W/2-0.4,D/2-0.4,0.18,{fill:'#e9b9a8'})+iL(-W/2+0.3,D/2-0.4,W/2-0.8,D/2-0.4,{stroke:'#c98d78','stroke-dasharray':'0.12 0.12'})},
 'kc-fridge':function(W,D){return body(W,D,STEEL)+iL(0,-D/2+D*0.1,0,D/2)+iL(-W/2,D/2-D*0.08,W/2,D/2-D*0.08,{stroke:DARK})
   +iL(-W*0.1,D/2-0.02,-W*0.1,D/2-D*0.3,{'stroke-width':0.12})+iL(W*0.1,D/2-0.02,W*0.1,D/2-D*0.3,{'stroke-width':0.12})},
 'kc-dw':function(W,D){var s=body(W,D,STEEL),q=Math.min(W,D)*0.36;s+=iR(-q,-q-D*0.06,2*q,2*q,{fill:'#eceae5'});
  for(var i=1;i<4;i++){s+=iL(-q+2*q*i/4,-q-D*0.06,-q+2*q*i/4,q-D*0.06,{stroke:DARK,'stroke-width':0.04});s+=iL(-q,-q-D*0.06+2*q*i/4,q,-q-D*0.06+2*q*i/4,{stroke:DARK,'stroke-width':0.04})}
  return s+iL(-q*0.9,-D*0.06,q*0.9,-D*0.06,{'stroke-width':0.1})+iC(0,-D*0.06,0.1,{fill:INK})+iR(-W/2,D/2-D*0.12,W,D*0.12,{fill:DARK})},
 'kc-3sink':function(W,D){var s=body(W,D,STEEL),dbw=W*0.18,bw=(W-2*dbw-0.4)/3,y=-D/2+D*0.22,h=D*0.62;
  for(var i=0;i<3;i++){var x=-W/2+dbw+0.1+i*(bw+0.1);s+=basin(x,y,bw,h);s+=faucet(x+bw/2,-D/2+0.18)}
  [-1,1].forEach(function(sd){var x0=sd<0?-W/2+0.1:W/2-dbw+0.1;for(var k=0;k<5;k++){var xx=x0+(dbw-0.3)*(k+0.5)/5;s+=iL(xx,y+0.1,xx,y+h-0.1,{stroke:DARK,'stroke-width':0.05})}});
  return s+iL(-W/2,-D/2+0.1,W/2,-D/2+0.1,{stroke:DARK})},
 'kc-hand':function(W,D){return body(W,D,STEEL)+basin(-W*0.36,-D*0.2,W*0.72,D*0.6)+faucet(0,-D/2+0.15)},
 'kc-grease':function(W,D){var r=Math.min(W,D)*0.38,s=iR(-W/2,-D/2,W,D,{fill:'rgba(230,228,223,.5)','stroke-dasharray':'0.3 0.18'})+iC(0,0,r,{fill:STEEL})+iC(0,0,r*0.78);
  for(var i=0;i<6;i++){var a=i*Math.PI/3;s+=iC(Math.cos(a)*r*0.9,Math.sin(a)*r*0.9,0.06,{fill:INK,stroke:'none'})}return s+iL(-r*0.5,0,r*0.5,0,{stroke:DARK})+iL(-r*0.5,-r*0.2,r*0.5,-r*0.2,{stroke:DARK})+iL(-r*0.5,r*0.2,r*0.5,r*0.2,{stroke:DARK})}
};
/* place a symbol on an item: rotate so the drawing's front matches the item's front */
function iconFor(it){var f=ICONS[it.r];if(!f)return '';var rot=(it.rot||0)%4,W=rot%2?it.d:it.w,D=rot%2?it.w:it.d,cx=it.x+it.w/2,cy=it.y+it.d/2;
 return '<g transform="translate('+cx+','+cy+') rotate('+(rot*90)+')" pointer-events="none">'+f(W,D)+'</g>'}
