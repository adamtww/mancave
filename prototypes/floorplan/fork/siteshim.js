/* On the test site (not inside a Claude artifact), floor plans are read through the test server's
   /api/read-plan route, signed in with the test app's own sign-in. Never used on the live site. */
(function(){if(typeof window.claude!=='undefined')return;var h=location.hostname;if(!/^test\./.test(h)&&!/^(localhost|127\.0\.0\.1)$/.test(h))return;
 var API='https://mancave-api-test.adamtww.workers.dev';
 function b64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(',')[1])};r.onerror=rej;r.readAsDataURL(blob)})}
 async function sample(prompt,o){o=o||{};var imgs=[];for(var i=0;i<(o.images||[]).length;i++){var b=o.images[i];imgs.push({media_type:b.type||'image/png',data:await b64(b)})}
  var tok=null;try{tok=localStorage.getItem('cave-token')}catch(_){}
  if(!tok)throw {code:'auth',message:'Sign in to the test app first (in this browser), then come back to this page.'};
  var r=await fetch(API+'/api/read-plan',{method:'POST',signal:o.signal,headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify({prompt:prompt,images:imgs,model:o.model,max_tokens:o.maxTokens||o.max_tokens})});
  var j=await r.json().catch(function(){return {}});if(!r.ok)throw {code:r.status===401?'auth':'server',message:j.error||('Error '+r.status)};return {text:j.text||'',truncated:!!j.truncated}}
 sample.limits=async function(){return {images:{mediaTypes:['image/png','image/jpeg','image/webp','image/gif']}}};
 window.claude={use:async function(n){if(n==='sample')return sample;throw new Error(n+' is not available on this site')}};window.__siteShim=true;
 window.addEventListener('load',function(){setTimeout(function(){var st=document.getElementById('ai-status');if(st&&/your own Claude plan/.test(st.textContent))st.textContent='Reads the plan with Claude through the test server. Sign in to the test app first.'},500)})})();
