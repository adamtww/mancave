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
/* ---- art for the rest of the catalog ---- */
var WOOD='#ead9b8',WOODD='#cdb388',FELT='#a9d5b5',MAT='#dcd8cf',SCR='#4a4842',GLASS='#dde9f2',RED='#e07a6a',BLUE='#8fb6e0',GREEN='#7fbf8e',YEL='#f2cf6b';
function bx(x,y,w,h,f,o){return iR(x,y,w,h,Object.assign({fill:f||WHITE},o||{}))}
function scr(x1,y1,x2,y2,w){return iL(x1,y1,x2,y2,{stroke:SCR,'stroke-width':w||0.22})}
function dot(cx,cy,r,f){return iC(cx,cy,r,{fill:f||INK,stroke:'none'})}
function rot(cx,cy,a,s){return '<g transform="translate('+cx+','+cy+') rotate('+a+')">'+s+'</g>'}
/* a chair seen from above, facing +y (back at -y), centred */
function seat(cx,cy,s,a){var h=s/2;return rot(cx,cy,a||0,bx(-h,-h,s,s,MAT,{rx:s*0.18})+bx(-h,-h,s,s*0.26,DARK,{rx:s*0.12}))}
function stool(cx,cy,r){return iC(cx,cy,r,{fill:MAT})+iC(cx,cy,r*0.45,{stroke:DARK})}
function hatch(x,y,w,h,n,o){var s='';for(var i=1;i<n;i++){var xx=x+w*i/n;s+=iL(xx,y,xx,y+h,Object.assign({stroke:DARK,'stroke-width':0.05},o||{}))}return s}
function hatchY(x,y,w,h,n,o){var s='';for(var i=1;i<n;i++){var yy=y+h*i/n;s+=iL(x,yy,x+w,yy,Object.assign({stroke:DARK,'stroke-width':0.05},o||{}))}return s}
function grid(x,y,w,h,nx,ny,o){return hatch(x,y,w,h,nx,o)+hatchY(x,y,w,h,ny,o)}
function fan(cx,cy,r){var s=iC(cx,cy,r,{fill:STEEL})+iC(cx,cy,r*0.72,{stroke:DARK})+iC(cx,cy,r*0.42,{stroke:DARK});for(var i=0;i<4;i++){var a=i*Math.PI/2+0.4;s+=iL(cx,cy,cx+Math.cos(a)*r*0.9,cy+Math.sin(a)*r*0.9)}return s+dot(cx,cy,r*0.12)}
function spool(cx,cy,r,f){return iC(cx,cy,r,{fill:f||'#f0b26b'})+iC(cx,cy,r*0.35,{fill:WHITE})}
function laserCab(W,D,tag){var s=body(W,D,STEEL)+bx(-W/2+0.25,-D/2+0.25,W*0.68,D-0.5,GLASS,{rx:0.1})+grid(-W/2+0.45,-D/2+0.45,W*0.68-0.4,D-0.9,8,6,{stroke:'#b9c9d6','stroke-width':0.03})
 +bx(W/2-W*0.24,-D/2+0.25,W*0.24-0.2,D-0.5,DARK,{rx:0.08})+iC(W/2-W*0.12-0.1,-D/2+0.7,0.18,{fill:RED});
 return s+(tag?dot(W/2-W*0.12-0.1,D/2-0.6,0.16,tag):'')}
Object.assign(ICONS,{
 'b-net':function(W,D){var s=body(W,D,'#e3e1dc')+bx(-W/2+0.25,-D/2+0.25,W-0.5,D-0.65,SCR,{rx:0.05});for(var i=0;i<6;i++){var y=-D/2+0.45+i*(D-1.05)/6;s+=iL(-W/2+0.4,y,W/2-0.4,y,{stroke:'#8a877f','stroke-width':0.05})+dot(W/2-0.55,y+0.08,0.05,GREEN)}return s+iL(-W/2,D/2-0.25,W/2,D/2-0.25,{'stroke-width':0.1})},
 'b-gas':function(W,D){var s=iR(-W/2,-D/2,W,D,{fill:'rgba(230,228,223,.5)'})+grid(-W/2,-D/2,W,D,8,6,{stroke:'#c9c4b8','stroke-width':0.03}),r=Math.min(W/6,D/3.2);
  [[-W/3,-D/5],[0,D/5],[W/3,-D/5],[-W/3,D/4.5],[W/3,D/4.5]].forEach(function(p,i){s+=iC(p[0],p[1],r,{fill:i%2?'#c8d8e6':'#d5e3d0'})+iC(p[0],p[1],r*0.38,{fill:DARK})});return s+iL(-W/2,D/2,W/2,D/2,{'stroke-width':0.14})},
 'b-hvac':function(W,D){return body(W,D,STEEL)+fan(0,-D*0.05,Math.min(W,D)*0.38)+bx(W/2-0.7,D/2-0.55,0.5,0.35,DARK)+iP('M'+(W/2-0.45)+' '+(D/2-0.55)+' v-0.4',{'stroke-width':0.1})},
 'g-sim':function(W,D){var s=iR(-W/2,-D/2,W,D,{fill:'rgba(220,216,207,.35)',rx:0.3}),y=-D/2+0.6,w3=W*0.3;
  s+=scr(-W*0.47,y+0.9,-W*0.17,y,0.25)+scr(-W*0.16,y-0.05,W*0.16,y-0.05,0.25)+scr(W*0.17,y,W*0.47,y+0.9,0.25);
  s+=bx(-0.9,-0.5,1.8,2.6,'#5d5a54',{rx:0.4})+bx(-0.75,1.5,1.5,0.7,'#6b6862',{rx:0.3});
  return s+iC(0,-0.9,0.55,{'stroke-width':0.14})+bx(-0.7,-2.0,1.4,0.5,DARK,{rx:0.1})+iL(-0.35,-1.95,-0.35,-1.6)+iL(0.35,-1.95,0.35,-1.6)+bx(-W/2+0.3,-0.3,0.9,1.2,MAT,{rx:0.1})},
 'g-cab':function(W,D){var s=body(W,D,'#5d5a54')+bx(-W/2+0.2,-D/2+0.2,W-0.4,D*0.42,'#7a7770',{rx:0.06})+bx(-W/2,D/2-D*0.36,W,D*0.36,'#3f3d38',{rx:0.06});
  return s+iC(-W*0.25,D/2-D*0.18,0.16,{fill:RED,stroke:'none'})+[0,1,2].map(function(i){return dot(-W*0.02+i*0.38,D/2-D*0.24+(i%2)*0.14,0.11,[YEL,BLUE,GREEN][i])}).join('')+iL(-W/2+0.3,-D/2+0.2+D*0.21,W/2-0.3,-D/2+0.2+D*0.21,{stroke:YEL,'stroke-width':0.08})},
 'g-pin':function(W,D){var s=bx(-W/2,-D/2,W,D*0.18,'#5d5a54',{rx:0.06})+bx(-W/2+0.05,-D/2+D*0.18,W-0.1,D*0.82,'#3f3d38',{rx:0.08})+bx(-W/2+0.25,-D/2+D*0.21,W-0.5,D*0.72,GLASS,{rx:0.06});
  s+=iC(-W*0.15,-D*0.1,0.25,{fill:RED,stroke:'none'})+iC(W*0.15,-D*0.15,0.25,{fill:BLUE,stroke:'none'})+iC(0,0.05*D,0.22,{fill:YEL,stroke:'none'});
  return s+iL(-W*0.28,D*0.32,-0.12,D*0.38,{'stroke-width':0.14})+iL(W*0.28,D*0.32,0.12,D*0.38,{'stroke-width':0.14})+dot(0.25,0.2*D,0.09,'#9a978f')},
 'g-gun':function(W,D){var s=body(W,D,'#5d5a54')+bx(-W/2+0.25,-D/2+0.25,W-0.5,D*0.55,'#3f3d38',{rx:0.08})+scr(-W/2+0.6,-D/2+0.6,W/2-0.6,-D/2+0.6,0.2)+bx(-W/2+0.25,D/2-D*0.32,W-0.5,D*0.25,'#7a7770',{rx:0.06});
  return s+rot(-W*0.22,D/2-D*0.2,-20,bx(-0.25,-0.12,0.5,0.24,RED,{rx:0.06,stroke:'none'})+bx(-0.25,0,0.12,0.28,RED,{stroke:'none'}))+rot(W*0.22,D/2-D*0.2,20,bx(-0.25,-0.12,0.5,0.24,BLUE,{rx:0.06,stroke:'none'})+bx(0.13,0,0.12,0.28,BLUE,{stroke:'none'}))},
 'g-airh':function(W,D){var s=body(W,D,'#5f8fc8')+bx(-W/2+0.25,-D/2+0.25,W-0.5,D-0.5,'#f7fafc',{rx:0.3});
  s+=iL(-W/2+0.25,0,W/2-0.25,0,{stroke:RED,'stroke-width':0.08})+iC(0,0,0.6,{stroke:RED,'stroke-width':0.06})+iC(0,-D/2+0.25,0.8,{stroke:BLUE,'stroke-width':0.06})+iC(0,D/2-0.25,0.8,{stroke:BLUE,'stroke-width':0.06});
  return s+bx(-0.6,-D/2+0.05,1.2,0.2,SCR,{stroke:'none'})+bx(-0.6,D/2-0.25,1.2,0.2,SCR,{stroke:'none'})+iC(0,-D*0.32,0.3,{fill:RED})+iC(0.6,D*0.3,0.3,{fill:BLUE})+dot(-0.4,D*0.08,0.15,SCR)},
 'g-foos':function(W,D){var s=body(W,D,WOODD)+bx(-W/2+0.2,-D/2+0.2,W-0.4,D-0.4,FELT),n=8;
  for(var i=0;i<n;i++){var y=-D/2+0.2+(D-0.4)*(i+0.5)/n;s+=iL(-W/2-0.15,y,W/2+0.15,y,{stroke:'#8a877f','stroke-width':0.06});var m=[1,2,3,5,5,3,2,1][i];for(var k=0;k<m;k++)s+=bx(-W/2+0.2+(W-0.4)*(k+0.5)/m-0.08,y-0.1,0.16,0.2,i%2?RED:BLUE,{stroke:'none'})}
  return s+bx(-0.35,-D/2+0.05,0.7,0.15,SCR,{stroke:'none'})+bx(-0.35,D/2-0.2,0.7,0.15,SCR,{stroke:'none'})},
 'g-skee':function(W,D){var s=body(W,D,'#5d5a54')+bx(-W/2+0.2,-D/2+0.2,W-0.4,D*0.3,'#3f3d38',{rx:0.06}),cx=0,cy=-D/2+0.2+D*0.15;
  [0.9,0.7,0.5,0.3,0.14].forEach(function(r,i){s+=iC(cx,cy,r*(W/2.5),{fill:i%2?'#f2e6c9':'#e8b46b','stroke-width':0.04})});
  s+=bx(-W/2+0.25,-D/2+D*0.33,W-0.5,D*0.55,WOOD,{rx:0.05})+hatchY(-W/2+0.25,-D/2+D*0.33,W-0.5,D*0.55,6,{stroke:WOODD});
  return s+bx(-W/2+0.2,D/2-D*0.1,W-0.4,D*0.08,DARK,{rx:0.05})+[0,1,2].map(function(i){return iC(-0.5+i*0.5,D/2-D*0.06,0.15,{fill:'#c9a26b'})}).join('')},
 'g-bball':function(W,D){var s=body(W,D,'#5d5a54')+bx(-W/2+0.25,-D/2+0.25,W-0.5,D-0.5,'#3f3d38',{rx:0.06})+iP('M'+(-W/2+0.25)+' '+(-D/2+D*0.25)+' L'+(W/2-0.25)+' '+(-D/2+D*0.25),{stroke:'#8a877f'});
  s+=bx(-W*0.32,-D/2+0.25,W*0.64,0.25,WHITE)+iC(0,-D/2+0.95,0.5,{stroke:'#e07a3a','stroke-width':0.12})+bx(-W/2+0.4,-D/2+D*0.3,W-0.8,D*0.55,'#4c4a45');
  return s+bx(-W/2+0.25,D/2-1.4,W-0.5,1.1,'#6b6862',{rx:0.06})+[0,1,2,3].map(function(i){return iC(-1.05+i*0.7,D/2-0.85,0.3,{fill:'#e8873e'})}).join('')},
 'g-darts':function(W,D){var s=iR(-W/2,-D/2,W,D,{fill:'rgba(220,216,207,.45)',rx:0.1})+bx(-W/2+0.4,-D/2,W-0.8,0.5,WOODD)+iC(0,-D/2+0.25,0.5,{fill:'#3f3d38'})+iC(0,-D/2+0.25,0.32,{fill:'#e8e0c8'})+dot(0,-D/2+0.25,0.08,RED);
  return s+bx(-W/2+0.6,-D/2+0.7,W-1.2,D-1.6,MAT,{rx:0.05})+iL(-W/2+0.3,D/2-0.9,W/2-0.3,D/2-0.9,{stroke:RED,'stroke-width':0.12})},
 'g-shuffle':function(W,D){var s=body(W,D,WOODD)+bx(-W/2+0.3,-D/2+0.3,W-0.6,D-0.6,WOOD),t=-D/2+0.3,b=D/2-0.3;
  [0.7,1.5,2.5].forEach(function(o){s+=iL(-W/2+0.3,t+o,W/2-0.3,t+o,{stroke:RED,'stroke-width':0.05})+iL(-W/2+0.3,b-o,W/2-0.3,b-o,{stroke:RED,'stroke-width':0.05})});
  s+=iL(-W/2+0.3,0,W/2-0.3,0,{stroke:'#b9a27c','stroke-dasharray':'0.3 0.2'});
  return s+iC(-0.3,t+1.1,0.18,{fill:RED})+iC(0.25,t+1.9,0.18,{fill:BLUE})+iC(0.1,b-1.2,0.18,{fill:RED})+iC(-0.2,b-0.5,0.18,{fill:BLUE})},
 'g-pool':function(W,D){var s=body(W,D,'#8b6a43')+bx(-W/2+0.3,-D/2+0.3,W-0.6,D-0.6,'#5fa877');
  [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]].forEach(function(p){s+=dot(p[0]*(W/2-0.3),p[1]*(D/2-0.3),0.22,'#2b2a27')});
  var y0=-D*0.22,r=0.12;for(var row=0;row<5;row++)for(var k=0;k<=row;k++)s+=iC((k-row/2)*r*2.05,y0-row*r*1.8,r,{fill:[YEL,BLUE,RED,'#8a5fb3','#e8873e','#3f8a4f','#7a3b2e',SCR][(row*3+k)%8],'stroke-width':0.02});
  return s+iC(0,D*0.25,r,{fill:WHITE,'stroke-width':0.03})+iL(-W/2+0.3,D*0.25,W/2-0.3,D*0.25,{stroke:'#4f9467','stroke-width':0.04})+iL(W*0.1,D*0.3,W*0.3,D/2+0.6,{stroke:'#b9915e','stroke-width':0.08})},
 'g-console':function(W,D){var s=bx(-W/2,-D/2,W,D*0.4,WOOD,{rx:0.08})+scr(-W*0.3,-D/2+0.25,W*0.3,-D/2+0.25,0.2)+bx(-W*0.18,-D/2+0.55,W*0.36,0.35,MAT,{rx:0.05});
  return s+bx(W/2-1.1,-D/2+0.4,0.7,0.5,SCR,{rx:0.05})+seat(0,D*0.18,1.9,0)+iC(-W*0.3,D*0.25,0.25,{fill:DARK})},
 'l-bar':function(W,D){var s=bx(-W/2,-D/2,W,1.8,WOODD,{rx:0.06})+hatch(-W/2,-D/2,W,1.8,10,{stroke:'#a88b5e'});
  for(var i=0;i<14;i++)s+=dot(-W/2+0.6+i*(W-1.2)/13,-D/2+0.9,0.13,['#7fae7f','#c88a4a','#e8c86a','#8fb6e0'][i%4]);
  s+=bx(-W/2+1,-D/2+3.4,W-2,2,WOOD,{rx:0.12})+iL(-W/2+1,-D/2+3.6,W/2-1,-D/2+3.6,{stroke:WOODD})+bx(-W/2+2,-D/2+3.6,1.4,0.9,WATER,{rx:0.1});
  for(var k=0;k<7;k++)s+=stool(-W/2+2+k*(W-4)/6,D/2-1.35,0.6);return s},
 'l-keg':function(W,D){return body(W,D,STEEL)+bx(-W/2+0.15,-D/2+0.15,W-0.3,D*0.55,'#eceae5',{rx:0.05})+iL(-W*0.3,-D*0.05,W*0.3,-D*0.05,{'stroke-width':0.12})+iC(-W*0.18,-D*0.05,0.14,{fill:'#c88a4a'})+iC(W*0.18,-D*0.05,0.14,{fill:'#7fae7f'})+bx(-W*0.3,D/2-0.55,W*0.6,0.3,DARK,{rx:0.05})+hatch(-W*0.3,D/2-0.55,W*0.6,0.3,6)},
 'l-ice':function(W,D){return body(W,D,STEEL)+bx(-W/2+0.15,-D/2+0.15,W-0.3,D*0.5,'#eceae5',{rx:0.05})+iC(0,-D*0.1,0.25,{fill:WATER})+bx(-W/2+0.1,D/2-0.35,W-0.2,0.25,DARK,{rx:0.05})+hatch(-W/2+0.1,D/2-0.35,W-0.2,0.25,6)},
 'l-icec':function(W,D){return body(W,D,STEEL)+bx(-W/2+0.15,-D/2+0.15,W-0.3,D*0.45,'#eceae5',{rx:0.05})+hatch(-W/2+0.15,-D/2+0.15,W-0.3,D*0.45,8)+bx(-W/2+0.25,D*0.08,W-0.5,D*0.3,WATER,{rx:0.08})+iL(-W*0.25,D/2-0.12,W*0.25,D/2-0.12,{'stroke-width':0.1})},
 'l-fridge':function(W,D){return body(W,D,'#5d5a54')+bx(-W/2+0.12,-D/2+0.12,W-0.24,D-0.4,'#6b6862',{rx:0.05})+bx(-W/2+0.12,D/2-0.3,W-0.24,0.2,GLASS,{rx:0.04})+iL(W/2-0.3,D/2-0.08,W/2-0.3,D/2-0.32,{stroke:'#e3e1dc','stroke-width':0.1})},
 'l-seat':function(W,D){var s=bx(-W/2+0.6,-D/2+0.6,W-1.2,D-1.2,'#efe7dc',{rx:0.4,stroke:'#d8ccb9'}),c='#b7c4d4';
  s+=bx(-W/2+0.8,-D/2+0.8,W*0.62,2.6,c,{rx:0.35})+bx(-W/2+0.8,-D/2+0.8,W*0.62,0.8,'#9aaabe',{rx:0.3})+bx(-W/2+0.8,-D/2+0.8,2.6,D*0.6,c,{rx:0.35})+bx(-W/2+0.8,-D/2+0.8,0.8,D*0.6,'#9aaabe',{rx:0.3});
  for(var i=1;i<3;i++)s+=iL(-W/2+0.8+W*0.62*i/3,-D/2+1.6,-W/2+0.8+W*0.62*i/3,-D/2+3.4,{stroke:'#8a99ad','stroke-width':0.05});
  s+=bx(-0.6,-0.4,3.2,2,WOOD,{rx:0.25});return s+seat(W/2-2,D/2-2.2,2.4,-130)+seat(W/2-2,-D/2+2.8,2.4,-60)},
 'l-tv':function(W,D){return scr(-W/2+0.3,-D/2+0.25,W/2-0.3,-D/2+0.25,0.3)+bx(-W*0.3,-D/2+0.55,W*0.6,0.9,WOOD,{rx:0.08})+bx(-W/2+0.2,-D/2+0.55,0.8,0.8,SCR,{rx:0.1})+bx(W/2-1,-D/2+0.55,0.8,0.8,SCR,{rx:0.1})+iC(-W/2+0.6,-D/2+0.95,0.22,{stroke:'#8a877f'})+iC(W/2-0.6,-D/2+0.95,0.22,{stroke:'#8a877f'})},
 'f-gym':function(W,D){var s=iR(-W/2,-D/2,W,D,{fill:'rgba(220,216,207,.35)',rx:0.2})+bx(-W/2+0.3,-D/2+0.3,W-0.6,0.5,'#5d5a54')+bx(-W/2+0.3,-D/2+0.3,0.5,D-0.6,'#5d5a54')+bx(W/2-0.8,-D/2+0.3,0.5,D*0.6,'#5d5a54');
  s+=bx(-1.2,-D/2+0.9,2.4,1.1,DARK)+hatchY(-1.2,-D/2+0.9,2.4,1.1,6);s+=bx(-0.55,-0.3,1.1,3.3,'#5d5a54',{rx:0.25})+bx(-0.5,-0.3,1,1,'#6b6862',{rx:0.2});
  return s+iL(-W/2+0.55,-D/2+0.55,-0.6,-D/2+1.4,{stroke:'#8a877f'})+iL(W/2-0.55,-D/2+0.55,0.6,-D/2+1.4,{stroke:'#8a877f'})+iL(-1.6,1.8,1.6,1.8,{'stroke-width':0.14})},
 'f-tread':function(W,D){return body(W,D,'#e3e1dc')+bx(-W/2+0.45,-D/2+0.4,W-0.9,D-1.5,'#4c4a45',{rx:0.15})+hatchY(-W/2+0.45,-D/2+0.4,W-0.9,D-1.5,8,{stroke:'#5f5c56'})+bx(-W/2+0.1,D/2-1.1,W-0.2,0.9,'#5d5a54',{rx:0.15})+scr(-0.5,D/2-0.65,0.5,D/2-0.65,0.25)+iL(-W/2+0.2,-D/2+0.4,-W/2+0.2,D/2-1.1,{'stroke-width':0.12})+iL(W/2-0.2,-D/2+0.4,W/2-0.2,D/2-1.1,{'stroke-width':0.12})},
 'f-row':function(W,D){return bx(-0.15,-D/2+0.4,0.3,D-1.6,'#8a877f',{rx:0.1})+iC(0,D/2-0.75,0.7,{fill:'#5d5a54'})+iC(0,D/2-0.75,0.45,{stroke:'#8a877f'})+bx(-0.35,-0.6,0.7,0.9,'#3f3d38',{rx:0.2})+bx(-0.8,D/2-2.2,0.6,0.9,MAT,{rx:0.1})+bx(0.2,D/2-2.2,0.6,0.9,MAT,{rx:0.1})+iL(-W/2+0.1,D/2-1.6,W/2-0.1,D/2-1.6,{'stroke-width':0.12})+iL(-W/2+0.3,-D/2+0.4,W/2-0.3,-D/2+0.4,{'stroke-width':0.12})},
 'f-bike':function(W,D){return iL(0,-D/2+0.5,0,D/2-0.6,{stroke:'#5d5a54','stroke-width':0.25})+iL(-W/2+0.1,-D/2+0.5,W/2-0.1,-D/2+0.5,{stroke:'#5d5a54','stroke-width':0.2})+iL(-W/2+0.1,D/2-0.4,W/2-0.1,D/2-0.4,{stroke:'#5d5a54','stroke-width':0.2})+bx(-0.2,D/2-1.6,0.4,1.1,'#6b6862',{rx:0.15})+bx(-0.35,-0.1,0.7,0.8,'#3f3d38',{rx:0.25})+iL(-W/2+0.2,-D/2+1.4,W/2-0.2,-D/2+1.4,{'stroke-width':0.12})+iP('M'+(-W/2+0.2)+' '+(-D/2+1.4)+' q0 -0.3 0.3 -0.4 M'+(W/2-0.2)+' '+(-D/2+1.4)+' q0 -0.3 -0.3 -0.4',{'stroke-width':0.1})+scr(-0.25,-D/2+1.2,0.25,-D/2+1.2,0.12)},
 'f-free':function(W,D){var s=bx(-W/2,-D/2,W,D,'#4f5a52',{rx:0.15})+grid(-W/2,-D/2,W,D,4,4,{stroke:'#5f6a62'})+bx(-W/2+0.3,-D/2+0.3,W-0.6,0.9,'#5d5a54',{rx:0.1});
  for(var i=0;i<6;i++){var x=-W/2+0.8+i*(W-1.6)/5;s+=iL(x,-D/2+0.5,x,-D/2+1,{stroke:'#8a877f','stroke-width':0.16})+dot(x,-D/2+0.5,0.13,'#2b2a27')+dot(x,-D/2+1,0.13,'#2b2a27')}
  s+=bx(-0.4,-0.5,0.8,3,'#3f3d38',{rx:0.15});[[W/2-1.2,D/2-1.2,0.7],[W/2-1.2,D/2-2.8,0.55],[-W/2+1.3,D/2-1.2,0.45]].forEach(function(p){s+=iC(p[0],p[1],p[2],{fill:'#2b2a27',stroke:'#8a877f'})+iC(p[0],p[1],p[2]*0.25,{fill:'#8a877f',stroke:'none'})});
  return s+iC(-W/2+1.3,D/2-2.6,0.35,{fill:'#5d5a54'})+iC(-W/2+2.3,D/2-2.6,0.3,{fill:'#5d5a54'})},
 'c-pp':function(W,D){return body(W,D,'#2f5e8f')+iL(0,-D/2+0.1,0,D/2-0.1,{stroke:'#fff','stroke-width':0.04})+iR(-W/2+0.08,-D/2+0.08,W-0.16,D-0.16,{stroke:'#fff','stroke-width':0.07})+iL(-W/2-0.25,0,W/2+0.25,0,{stroke:SCR,'stroke-width':0.18})+dot(-W/2-0.25,0,0.12,SCR)+dot(W/2+0.25,0,0.12,SCR)+iC(W*0.2,D*0.22,0.06,{fill:'#f6a04d',stroke:'none'})},
 'c-robot':function(W,D){var s='';[0,120,240].forEach(function(a){var r=a*Math.PI/180;s+=iL(0,0,Math.sin(r)*W*0.45,Math.cos(r)*D*0.45,{stroke:'#8a877f','stroke-width':0.1})});
  s+=iC(0,0,Math.min(W,D)*0.32,{fill:'#5d5a54'});for(var i=0;i<7;i++){var a2=i*0.9;s+=iC(Math.cos(a2)*0.28*(i%2+0.3),Math.sin(a2)*0.28*(i%2+0.3),0.08,{fill:'#f6a04d',stroke:'none'})}return s+bx(-0.2,D*0.25,0.4,0.3,SCR,{rx:0.06})},
 'c-hoop':function(W,D){return iR(-W/2,-D/2,W,D,{fill:'rgba(232,135,62,.08)','stroke-dasharray':'0.3 0.2',stroke:'#c98d78'})+bx(-W*0.3,-D/2,W*0.6,0.25,WHITE)+iL(-W*0.1,-D/2+0.12,W*0.1,-D/2+0.12,{stroke:RED,'stroke-width':0.06})+iC(0,-D/2+1.0,0.75,{stroke:'#e07a3a','stroke-width':0.14})+iC(0,-D/2+1.0,0.5,{stroke:'#c9c4b8','stroke-dasharray':'0.1 0.1'})},
 'c-net':function(W,D){var s=iL(-W/2+0.3,0,W/2-0.3,0,{stroke:'#8a877f','stroke-width':0.12,'stroke-dasharray':'0.4 0.15'});for(var i=0;i<=5;i++)s+=dot(-W/2+0.3+i*(W-0.6)/5,0,0.25,SCR);return s},
 'm-mf1200':function(W,D){var s=body(W,D,STEEL)+bx(-W/2+0.25,-D/2+0.25,W*0.62,D-0.5,'#cfd3d6')+grid(-W/2+0.25,-D/2+0.25,W*0.62,D-0.5,10,8,{stroke:'#a9afb4','stroke-width':0.03});
  s+=bx(-W/2+0.15,-0.2,W*0.68,0.4,'#3f3d38',{rx:0.05})+bx(-W/2+W*0.3,-0.35,0.45,0.7,'#5d5a54',{rx:0.08});
  return s+bx(W/2-W*0.32,-D/2+0.25,W*0.3-0.15,D*0.45,'#3a6fb0',{rx:0.08})+bx(W/2-W*0.32,D*0.02,W*0.3-0.15,D*0.42,DARK,{rx:0.08})+iC(W/2-W*0.17-0.07,D*0.22,0.25,{fill:'#5d5a54'})},
 'm-comp':function(W,D){return iC(0,0,Math.min(W,D)*0.42,{fill:'#3a6fb0'})+bx(-W*0.25,-D*0.2,W*0.5,D*0.4,'#5d5a54',{rx:0.08})+iC(W*0.25,-D*0.3,0.14,{fill:WHITE})},
 'm-dryer':function(W,D){return body(W,D,STEEL)+bx(-W/2+0.15,-D/2+0.15,W-0.3,D*0.35,'#3a6fb0',{rx:0.05})+iC(0,D*0.18,0.25,{fill:WHITE})+iL(0,D*0.18,0.15,D*0.08,{'stroke-width':0.05})},
 'm-ap2':function(W,D){var r=Math.min(W,D)*0.36;return body(W,D,'#e3e1dc')+iC(0,0,r,{fill:STEEL})+iC(0,0,r*0.7,{stroke:DARK})+iC(0,0,r*0.4,{stroke:DARK})+iC(0,0,r*0.12,{fill:'#3a6fb0',stroke:'none'})+iL(-W/2,D/2-0.2,W/2,D/2-0.2,{stroke:DARK})},
 'm-x1co2':function(W,D){return laserCab(W,D,null)},
 'm-x1diode':function(W,D){return laserCab(W,D,BLUE)},
 'm-x1fiber':function(W,D){return laserCab(W,D,GREEN)},
 'm-x1uv':function(W,D){return laserCab(W,D,'#9b7ad1')},
 'm-x1mopa':function(W,D){return laserCab(W,D,'#e8873e')},
 'm-o1':function(W,D){var s=body(W*0.55,D,STEEL);s=rot(-W*0.22,0,0,body(W*0.55,D,STEEL)+bx(-W*0.22,-D/2+0.25,W*0.44,D*0.4,GLASS,{rx:0.06})+iL(-W*0.2,D*0.15,W*0.2,D*0.15,{'stroke-width':0.1})+dot(W*0.18,D/2-0.3,0.08,GREEN));
  return s+rot(W*0.3,0,0,body(W*0.38,D*0.8,'#e3e1dc')+bx(-W*0.15,-D*0.3,W*0.3,D*0.45,'#5d5a54',{rx:0.06})+iL(-W*0.1,D*0.25,W*0.1,D*0.25,{'stroke-width':0.12}))},
 'm-se1':function(W,D){return body(W,D,WHITE)+bx(-W/2+0.15,-D/2+0.15,W-0.3,D*0.35,'#e3e1dc',{rx:0.06})+bx(-W*0.32,-D*0.05,W*0.64,D*0.45,'#efe7dc',{rx:0.2})+iC(0,D*0.17,0.3,{stroke:'#c9a26b','stroke-width':0.08})+dot(0,-D/2+0.4,0.07,RED)},
 'm-prusa':function(W,D){var s=body(W,D,'#3f3d38')+bx(-W/2+0.15,-D/2+0.15,W-0.3,D-0.3,GLASS,{rx:0.06})+bx(-W*0.3,-D*0.25,W*0.6,D*0.55,'#2b2a27',{rx:0.04})+grid(-W*0.3,-D*0.25,W*0.6,D*0.55,5,5,{stroke:'#5d5a54','stroke-width':0.02});
  for(var i=0;i<8;i++)s+=bx(-W/2+0.25+i*(W-0.5)/8,-D/2+0.2,(W-0.5)/8-0.04,0.18,['#e8873e','#3a6fb0','#7fbf8e','#e07a6a','#f2cf6b','#9b7ad1','#fbfaf7','#5d5a54'][i],{'stroke-width':0.02});
  return s+iL(-W/2+0.2,-D*0.05,W/2-0.2,-D*0.05,{stroke:'#e3e1dc','stroke-width':0.08})+bx(-0.12,-D*0.12,0.24,0.2,'#e8873e',{stroke:'none'})+dot(W/2-0.3,D/2-0.3,0.07,'#e8873e')},
 'm-bench':function(W,D){var s=bx(-W/2,-D/2,W,D*0.62,WOOD,{rx:0.06})+bx(-W/2+0.4,-D/2+0.25,W*0.45,D*0.4,'#7fb7a8',{rx:0.05})+bx(W*0.12,-D/2+0.2,0.9,0.6,'#5d5a54',{rx:0.06})+iL(W*0.12+0.45,-D/2+0.5,W*0.12+1.2,-D/2+0.9,{stroke:'#e8873e','stroke-width':0.08});
  return s+iC(W/2-0.8,-D/2+0.55,0.3,{fill:SCR})+bx(-W/2+0.2,-D/2+0.15,0.8,0.25,'#3f3d38',{rx:0.04})+seat(0,D/2-0.65,1.3,0)},
 'm-filament':function(W,D){var s=bx(-W/2,-D/2,W,D,'#e3e1dc',{rx:0.06})+hatch(-W/2,-D/2,W,D,4,{stroke:'#bdb8ad','stroke-width':0.06}),c=['#e8873e','#3a6fb0','#7fbf8e','#e07a6a','#f2cf6b','#9b7ad1','#5d5a54','#fbfaf7'];
  for(var i=0;i<8;i++)s+=spool(-W/2+0.37+i*(W-0.75)/7,0,0.32,c[i]);return s},
 'w-tsaw':function(W,D){var t=-D/2,s=bx(-W/2+0.6,t+2.2,W*0.62,3.0,'#c8ccd0',{rx:0.06})+bx(W/2-W*0.32,t+2.2,W*0.28,3.0,'#d6d9dc',{rx:0.04});
  s+=bx(-W/2+0.6+W*0.31-0.06,t+3.0,0.12,1.4,'#3f3d38',{stroke:'none'})+iC(-W/2+0.6+W*0.31,t+3.7,0.05,{fill:RED,stroke:'none'})+bx(-W/2+0.4,t+2.0,W-0.8,0.25,'#5d5a54');
  s+=bx(W*0.1,t+2.25,0.2,2.95,'#d36b3a',{stroke:'none'})+bx(-W/2+0.6,t+5.2,W*0.9,D-5.4,WOOD,{rx:0.06})+hatchY(-W/2+0.6,t+5.2,W*0.9,D-5.4,4,{stroke:WOODD});
  return s+bx(-W/2+1.1,t+0.4,1.6,1.4,'#5d5a54',{rx:0.08})+iL(-W/2+1.9,t+1.8,-W/2+1.9,t+2.2,{'stroke-width':0.12})},
 'w-band':function(W,D){return bx(-W/2+0.3,-D/2+0.3,W-0.6,D-0.6,'#c8ccd0',{rx:0.06})+iL(0,-D/2+0.3,0,0.1,{stroke:'#3f3d38','stroke-width':0.06})+bx(-0.12,-0.1,0.24,0.24,'#3f3d38',{stroke:'none'})+bx(W/2-0.75,-D/2+0.1,0.6,D*0.6,'#3a6fb0',{rx:0.1})+iL(-W/2+0.4,D*0.15,W/2-0.4,D*0.15,{stroke:'#d36b3a','stroke-width':0.1})},
 'w-router':function(W,D){return body(W,D,'#e3e1dc')+bx(-W/2+0.15,-D/2+0.15,W-0.3,D-0.3,'#d6d9dc',{rx:0.05})+iC(0,0,0.45,{fill:'#5d5a54'})+iC(0,0,0.15,{fill:'#c8ccd0'})+bx(-W/2+0.2,-0.95,W-0.4,0.3,'#3a6fb0',{rx:0.05})+iL(-W/2+0.2,D*0.25,W/2-0.2,D*0.25,{stroke:DARK,'stroke-dasharray':'0.15 0.1'})},
 'w-miter':function(W,D){var s=bx(-W/2,-D/2,W,D-0.3,WOOD,{rx:0.06})+bx(-W/2+0.2,-D/2+0.2,W-0.4,0.25,WOODD)+bx(-1.1,-D/2+0.3,2.2,1.6,'#c8ccd0',{rx:0.1});
  return s+iC(0,-D/2+1.0,0.65,{stroke:'#3f3d38','stroke-width':0.06})+bx(-0.3,-D/2+0.5,0.6,1.2,'#3a6fb0',{rx:0.12})+hatch(-W/2+0.2,-D/2+0.5,W/2-1.6,D-1,8,{stroke:WOODD})+hatch(1.4,-D/2+0.5,W/2-1.6,D-1,8,{stroke:WOODD})},
 'w-jointer':function(W,D){return bx(-W/2+0.2,-D/2+0.2,W-0.4,D-0.4,'#c8ccd0',{rx:0.06})+iL(-W/2+0.2,0,W/2-0.2,0,{stroke:'#3f3d38','stroke-width':0.12})+bx(W/2-0.45,-D/2+0.4,0.25,D-0.8,'#5d5a54')+bx(-W/2+0.1,-0.4,0.35,0.8,'#d36b3a',{stroke:'none'})},
 'w-planer':function(W,D){return bx(-W/2+0.1,-D/2,W-0.2,D,'#c8ccd0',{rx:0.06})+bx(-W/2,-D*0.2,W,D*0.4,'#3a6fb0',{rx:0.08})+iL(-W/2+0.2,-D*0.32,W/2-0.2,-D*0.32,{stroke:DARK})+iL(-W/2+0.2,D*0.32,W/2-0.2,D*0.32,{stroke:DARK})+iC(W/2-0.35,0,0.15,{fill:'#5d5a54'})},
 'w-drill':function(W,D){return bx(-W/2+0.15,-D/2+0.1,W-0.3,D*0.7,'#d6d9dc',{rx:0.08})+iC(0,-D*0.18,W*0.32,{fill:'#c8ccd0'})+iC(0,-D*0.18,0.08,{fill:SCR,stroke:'none'})+bx(-W*0.3,D*0.05,W*0.6,D*0.4,'#3a6fb0',{rx:0.1})+iL(W*0.3,D*0.2,W/2,D*0.35,{'stroke-width':0.08})},
 'w-sander':function(W,D){return bx(-W/2+0.1,-D/2+0.1,W-0.2,D-0.2,'#c8ccd0',{rx:0.06})+iC(-W*0.15,0,0.22,{fill:'#c9a26b'})+bx(W*0.08,-D*0.3,0.3,D*0.6,'#c9a26b',{rx:0.12})+iL(-W/2+0.2,D*0.35,W/2-0.2,D*0.35,{stroke:DARK})},
 'w-dust':function(W,D){var r=W*0.32;return bx(-W/2+0.15,-D/2+0.15,W-0.3,D-0.3,'rgba(220,216,207,.4)',{rx:0.2,'stroke-dasharray':'0.2 0.15'})+iC(0,-D/2+r+0.3,r,{fill:'#e8e3d6'})+iC(0,D/2-r-0.3,r,{fill:'#bdb8ad'})+bx(-0.6,-0.6,1.2,1.2,'#3a6fb0',{rx:0.15})+iC(0,0,0.35,{fill:'#5d5a54'})+iL(0.6,0,W/2-0.1,0,{'stroke-width':0.25,stroke:'#8a877f'})},
 'w-cnc':function(W,D){var s=bx(-W/2,-D/2,W,D,'#c8ccd0',{rx:0.06})+bx(-W/2+0.4,-D/2+0.4,W-0.8,D-0.8,'#e7d8b6')+grid(-W/2+0.4,-D/2+0.4,W-0.8,D-0.8,6,10,{stroke:'#cdb388','stroke-width':0.03});
  s+=bx(-W/2,-D*0.05,W,0.5,'#3f3d38',{rx:0.06})+bx(-0.35,-D*0.05-0.1,0.7,0.7,'#d36b3a',{rx:0.12})+iC(0,-D*0.05+0.25,0.15,{fill:'#c8ccd0'});
  return s+iL(-W/2+0.15,-D/2+0.2,-W/2+0.15,D/2-0.2,{'stroke-width':0.12})+iL(W/2-0.15,-D/2+0.2,W/2-0.15,D/2-0.2,{'stroke-width':0.12})},
 'w-comp':function(W,D){var r=Math.min(W,D)*0.42;return iC(0,0,r,{fill:'#d36b3a'})+iC(0,0,r*0.82,{stroke:'#b65a2f'})+bx(-r*0.6,-r*0.45,r*1.2,r*0.9,'#5d5a54',{rx:0.1})+iC(r*0.25,0,r*0.22,{fill:STEEL})+iC(-r*0.7,r*0.55,0.14,{fill:WHITE})},
 'w-bench':function(W,D){var s=bx(-W/2,-D/2,W,D-0.2,WOOD,{rx:0.05})+hatchY(-W/2,-D/2,W,D-0.2,5,{stroke:WOODD});for(var i=0;i<7;i++)s+=dot(-W/2+0.7+i*(W-1.4)/6,D/2-0.65,0.06,'#8a6a43');
  return s+bx(-W/2+0.2,D/2-0.45,1.4,0.5,'#5d5a54',{rx:0.05})+iL(-W/2+0.9,D/2+0.05,-W/2+0.9,D/2+0.35,{'stroke-width':0.1})+bx(W/2-1.2,-D/2+0.2,0.9,0.5,'#3a6fb0',{rx:0.06})},
 'w-assy':function(W,D){return bx(-W/2,-D/2,W,D,'#e9e1cf',{rx:0.06})+grid(-W/2,-D/2,W,D,8,4,{stroke:'#d2c5a6','stroke-width':0.04})+bx(-W/2+0.6,-D/2+0.5,1.6,0.25,'#3a6fb0',{rx:0.05})+bx(W/2-2,D/2-1,1.2,0.25,'#d36b3a',{rx:0.05})},
 'w-lumber':function(W,D){var s='';for(var i=0;i<6;i++){var x=-W/2+0.3+i*(W-0.6)/5;s+=bx(x-0.1,-D/2,0.2,D-0.2,'#5d5a54',{stroke:'none'})}
  for(var k=0;k<4;k++)s+=bx(-W/2+0.1,-D/2+0.2+k*0.38,W-0.2,0.3,['#ead9b8','#dfc79d','#e8d3a9','#d9bd8c'][k],{rx:0.03,'stroke-width':0.03});return s},
 'w-wall':function(W,D){var s=bx(-W/2,-D/2,W,0.35,'#d6c9a8')+hatch(-W/2,-D/2,W,0.35,20,{stroke:'#c2b28d','stroke-width':0.03}),c=['#d36b3a','#3a6fb0','#f2cf6b','#5d5a54','#7fbf8e'];
  for(var i=0;i<10;i++){var x=-W/2+0.5+i*(W-1)/9;s+=bx(x-0.22,-D/2+0.4,0.44,i%3===0?0.9:0.6,c[i%5],{rx:0.08,'stroke-width':0.03})}return s+bx(W/2-2.2,D/2-0.6,1.8,0.45,DARK,{rx:0.05})+dot(W/2-1.9,D/2-0.38,0.07,GREEN)+dot(W/2-1.4,D/2-0.38,0.07,GREEN)},
 'h-rack':function(W,D){var s=bx(-W/2,-D/2,W,D,'#e3e1dc',{rx:0.06})+bx(-W/2+0.15,-D/2+0.15,W-0.3,D-0.3,'#f4f9ef');for(var i=0;i<8;i++)for(var j=0;j<3;j++)s+=iC(-W/2+0.4+i*(W-0.8)/7,-D/2+0.45+j*(D-0.9)/2,0.15,{fill:i%2?'#7fbf8e':'#5ea86f',stroke:'none'});
  return s+iL(-W/2+0.15,-D/2+0.2,W/2-0.15,-D/2+0.2,{stroke:'#f2e6a6','stroke-width':0.08})},
 'h-micro':function(W,D){var s=bx(-W/2,-D/2,W,D,'#e3e1dc',{rx:0.06});for(var i=0;i<4;i++){var x=-W/2+0.12+i*(W-0.24)/4;s+=bx(x+0.04,-D/2+0.15,(W-0.24)/4-0.08,D-0.3,'#d9ead2',{'stroke-width':0.03});for(var a=0;a<3;a++)for(var b=0;b<5;b++)s+=dot(x+0.2+a*0.25,-D/2+0.3+b*0.32,0.05,'#5ea86f')}return s},
 'h-sink':function(W,D){return body(W,D,'#e3e1dc')+basin(-W/2+0.25,-D/2+0.45,W-0.5,D-0.75)+faucet(0,-D/2+0.2)},
 'x-batting':function(W,D){var s=iR(-W/2,-D/2,W,D,{fill:'rgba(127,191,142,.12)',stroke:'#5ea86f','stroke-dasharray':'0.5 0.3'});s+=hatchY(-W/2,-D/2,W,D,11,{stroke:'#c7dfcc','stroke-width':0.04});
  s+=bx(-1,-D/2+2,2,1.6,'#5d5a54',{rx:0.2})+iC(0,-D/2+2.8,0.45,{fill:'#8a877f'})+bx(-2.6,-D/2+4.2,3.4,0.25,'#3f8a4f',{rx:0.05})+bx(-1.4,-D/2+4.2,0.25,1.6,'#3f8a4f',{rx:0.05});
  return s+iP('M-0.7 '+(D/2-3)+' h1.4 v0.6 l-0.7 0.6 l-0.7 -0.6 z',{fill:WHITE})+iR(-3,D/2-3.8,1.6,3,{stroke:'#bdb8ad'})+iR(1.4,D/2-3.8,1.6,3,{stroke:'#bdb8ad'})},
 'x-tennis':function(W,D){var s=bx(-W/2,-D/2,W,D,'#6aa6c9',{rx:0.1})+iR(-W/2+0.6,-D/2+0.6,W-1.2,D-1.2,{stroke:'#fff','stroke-width':0.12})+iL(-W/2+0.6,D/2-12,W/2-0.6,D/2-12,{stroke:'#fff','stroke-width':0.1})+iL(0,D/2-12,0,D/2-0.6,{stroke:'#fff','stroke-width':0.1});
  return s+bx(-1,-D/2+1.4,2,2.2,'#5d5a54',{rx:0.25})+iC(0,-D/2+2.3,0.55,{fill:'#d9e84a'})+[0,1,2,3,4].map(function(i){return dot(-2+i,D/2-6+((i*7)%3),0.13,'#d9e84a')}).join('')},
 'x-return':function(W,D){var s=iP('M'+(-W/2)+' '+(-D/2+0.6)+' L'+(W/2)+' '+(-D/2+0.6)+' L'+(W*0.12)+' '+(D*0.15)+' L'+(-W*0.12)+' '+(D*0.15)+' Z',{fill:'rgba(201,196,184,.35)',stroke:'#a8a397','stroke-dasharray':'0.3 0.2'});
  s+=bx(-W*0.3,-D/2,W*0.6,0.3,WHITE)+iC(0,-D/2+1.1,0.75,{stroke:'#e07a3a','stroke-width':0.14});return s+bx(-0.8,D*0.12,1.6,1.8,'#5d5a54',{rx:0.15})+iL(0,D*0.12+1.8,0,D/2-0.5,{stroke:'#8a877f','stroke-width':0.25})+iC(0,D/2-0.5,0.4,{fill:'#e8873e'})},
 'x-motion':function(W,D){var s=bx(-W/2+0.2,-D/2+0.2,W-0.4,D-0.4,'#5d5a54',{rx:0.3});[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){s+=iC(p[0]*(W/2-0.9),p[1]*(D/2-0.9),0.4,{fill:'#c8ccd0'})+dot(p[0]*(W/2-0.9),p[1]*(D/2-0.9),0.12,'#3a6fb0')});
  return s+bx(-1.2,-1.6,2.4,3.2,'#6b6862',{rx:0.3})+bx(-0.8,-0.6,1.6,1.9,'#3f3d38',{rx:0.35})+iC(0,-1.15,0.45,{stroke:'#e3e1dc','stroke-width':0.12})}
});
ICONS['m-mf800']=ICONS['m-mf1200'];

/* ---- furniture, bar and kitchen additions ---- */
var FAB='#b9c6d6',FABD='#9aaabe';
Object.assign(ICONS,{
 'l-barc':function(W,D){var s=bx(-W/2,-D/2,W,D,WOOD,{rx:0.12})+bx(-W/2,-D/2,W,D*0.45,WOODD,{rx:0.1})+hatch(-W/2,-D/2,W,D*0.45,12,{stroke:'#a88b5e'});return s+iL(-W/2+0.2,D/2-0.18,W/2-0.2,D/2-0.18,{stroke:WOODD,'stroke-width':0.1})+bx(-W/2+1,-D/2+0.15,1.3,0.75,WATER,{rx:0.1})},
 'l-rail':function(W,D){var s=bx(-W/2,-D/2,W,D*0.6,WOOD,{rx:0.1})+iL(-W/2+0.2,-D/2+D*0.3,W/2-0.2,-D/2+D*0.3,{stroke:WOODD,'stroke-width':0.06});for(var i=0;i<6;i++)s+=iC(-W/2+1.2+i*(W-2.4)/5,-D/2+D*0.3,0.18,{fill:['#c88a4a','#e8c86a','#7fae7f'][i%3]});return s+iL(-W/2+0.3,D/2-0.1,W/2-0.3,D/2-0.1,{stroke:'#8a877f','stroke-width':0.1})},
 'f-stool':function(W,D){var r=Math.min(W,D)/2;return iC(0,0,r*0.95,{fill:'#8a877f'})+iC(0,0,r*0.62,{fill:'#b0aca3'})+iC(0,0,r*0.2,{stroke:'#8a877f'})},
 'f-sofa':function(W,D){var s=bx(-W/2,-D/2,W,D,FABD,{rx:0.35})+bx(-W/2+0.6,-D/2+0.7,W-1.2,D-0.8,FAB,{rx:0.25});for(var i=1;i<3;i++){var x=-W/2+0.6+(W-1.2)*i/3;s+=iL(x,-D/2+0.8,x,D/2-0.15,{stroke:FABD,'stroke-width':0.06})}return s},
 'f-chair':function(W,D){return bx(-W/2,-D/2,W,D,FABD,{rx:0.35})+bx(-W/2+0.55,-D/2+0.7,W-1.1,D-0.8,FAB,{rx:0.22})+iL(-W/2+0.55,D/2-0.45,W/2-0.55,D/2-0.45,{stroke:FABD,'stroke-width':0.05,'stroke-dasharray':'0.12 0.1'})},
 'f-coffee':function(W,D){return bx(-W/2,-D/2,W,D,WOOD,{rx:Math.min(W,D)*0.25})+bx(-W/2+0.25,-D/2+0.25,W-0.5,D-0.5,'none',{rx:Math.min(W,D)*0.18,stroke:WOODD,'stroke-width':0.05})+iC(W*0.2,0,0.22,{fill:WHITE})},
 'f-tv':function(W,D){return bx(-W/2,-D/2+D*0.35,W,D*0.65,WOOD,{rx:0.08})+hatch(-W/2,-D/2+D*0.35,W,D*0.65,4,{stroke:WOODD})+scr(-W*0.47,-D/2+0.12,W*0.47,-D/2+0.12,0.22)+bx(-W*0.28,-D/2+D*0.42,W*0.56,0.22,SCR,{rx:0.1,stroke:'none'})},
 'f-dine8':function(W,D){var s='',cw=1.4,cd=1.1;for(var i=0;i<3;i++){var x=-W/2+W*(i+0.5)/3;s+=bx(x-cw/2,-D/2-cd*0.55,cw,cd,MAT,{rx:0.18})+bx(x-cw/2,D/2-cd*0.45,cw,cd,MAT,{rx:0.18})}
  s+=bx(-W/2-cd*0.55,-cw/2,cd,cw,MAT,{rx:0.18})+bx(W/2-cd*0.45,-cw/2,cd,cw,MAT,{rx:0.18});return s+bx(-W/2+0.1,-D/2+0.1,W-0.2,D-0.2,WOOD,{rx:0.15})+hatchY(-W/2+0.1,-D/2+0.1,W-0.2,D-0.2,3,{stroke:WOODD})},
 'f-round4':function(W,D){var r=Math.min(W,D)/2,s='';[0,90,180,270].forEach(function(a){var t=a*Math.PI/180;s+=rot(Math.sin(t)*r*0.95,-Math.cos(t)*r*0.95,a,bx(-0.65,-0.55,1.3,1.1,MAT,{rx:0.2}))});return s+iC(0,0,r*0.78,{fill:WOOD})+iC(0,0,r*0.55,{stroke:WOODD,'stroke-width':0.05})},
 'kr-prep':function(W,D){return body(W,D,'#f1eee8')+iL(-W/2,-D/2+0.12,W/2,-D/2+0.12,{stroke:DARK})+bx(-W*0.32,-D*0.18,W*0.64,D*0.5,'#e2d3b4',{rx:0.06})+iL(-W/2,D/2-0.08,W/2,D/2-0.08,{stroke:DARK})+iC(W*0.3,-D*0.28,0.08,{fill:DARK})},
 'kr-sink':function(W,D){return body(W,D,'#f1eee8')+basin(-W*0.38,-D*0.18,W*0.76,D*0.62)+faucet(0,-D/2+0.22)+iL(-W/2,D/2-0.08,W/2,D/2-0.08,{stroke:DARK})},
 'kr-freezer':function(W,D){return body(W,D,WHITE)+bx(-W/2+0.15,-D/2+0.15,W-0.3,D*0.25,'#e3eef6',{rx:0.05})+iL(-W/2,D/2-D*0.12,W/2,D/2-D*0.12,{'stroke-dasharray':'0.15 0.1'})+iL(W/2-0.35,D/2-0.02,W/2-0.35,D/2-D*0.4,{'stroke-width':0.12})+iP('M-0.25 -0.15 l0.25 0.25 l0.25 -0.25 M0 -0.35 v0.7 M-0.3 0 h0.6',{stroke:'#8fb6e0','stroke-width':0.08})},
 'kr-pantry':function(W,D){var s=bx(-W/2,-D/2,W,D,'#e3e1dc',{rx:0.06})+hatch(-W/2,-D/2,W,D,3,{stroke:'#bdb8ad','stroke-width':0.06}),c=['#e8c86a','#c88a4a','#7fae7f','#e07a6a','#8fb6e0','#f2e6c9'];
  for(var i=0;i<9;i++)s+=bx(-W/2+0.25+i*(W-0.5)/9,-D/2+0.3,(W-0.5)/9-0.12,D-0.6,c[i%6],{rx:0.06,'stroke-width':0.03});return s}
});
/* place a symbol on an item: rotate so the drawing's front matches the item's front */
function iconFor(it){var f=ICONS[it.r];if(!f)return '';var rot=(it.rot||0)%4,W=rot%2?it.d:it.w,D=rot%2?it.w:it.d,cx=it.x+it.w/2,cy=it.y+it.d/2;
 return '<g transform="translate('+cx+','+cy+') rotate('+(rot*90)+')" pointer-events="none">'+f(W,D)+'</g>'}
