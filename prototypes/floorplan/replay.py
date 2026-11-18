# usage: python3 replay.py run.json [flags-js] -> replays recorded answers through the current index.html (by role)
import asyncio,json,sys
from playwright.async_api import async_playwright
run=json.load(open(sys.argv[1]))
EXTRA=sys.argv[2] if len(sys.argv)>2 else ''
INIT="""
window.__run=%s;window.__q={};
function roleOf(p){if(p.indexOf('tightly')>=0)return 'locate';if(p.indexOf('only to CHECK')>=0)return 'review';if(p.indexOf('find EVERY door')>=0)return 'doors';return 'walls'}
function queues(rec){var roles=rec.roles&&rec.roles.length?rec.roles:rec.replies.map(function(_,i){return i===0?'locate':(i===rec.replies.length-1?'doors':'walls')});var q={};rec.replies.forEach(function(r,i){(q[roles[i]]=q[roles[i]]||[]).push(r)});return q}
window.claude={use:async(n)=>{if(n!=='sample')return null;const f=async(p,o)=>{
 const t=window.__curTest||'';const T=window.__caveTests.TESTS.find(x=>t.indexOf(x.file)>=0);
 const rec=window.__run.tests.find(r=>r.name===T.name);if(!window.__q[T.name])window.__q[T.name]=queues(rec);const Q=window.__q[T.name],role=roleOf(p);
 if(role==='review'&&window.__forceReview)return {text:window.__forceReview,modelApplied:o.model};
 let txt=(Q[role]&&Q[role].length)?Q[role].shift():(role==='review'?'{"missing":[],"wrong":[]}':'{}');
 return {text:txt,modelApplied:o.model}};
 f.limits=async()=>({maxPromptBytes:262144,images:{maxCount:5,maxInputBytes:2e7,mediaTypes:['image/png','image/jpeg']}});return f}};
(function(){var rec=window.__run.tests[0];var n=(rec.roles&&rec.roles.length)?rec.roles.filter(function(r){return r==='walls'}).length:Math.max(1,rec.replies.length-2);window.__wallsN=n;})();
%s
""" % (json.dumps(run),EXTRA)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.add_init_script(INIT)
        await pg.goto("http://127.0.0.1:8765/index.html#tests");await pg.wait_for_timeout(800)
        await pg.evaluate("""()=>{const of=window.fetch;window.fetch=async function(u){window.__curTest=u;return of.apply(this,arguments)}}""")
        await pg.click('#t-run')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if not await pg.evaluate("document.querySelector('#t-run').disabled"):break
        print(await pg.evaluate("document.querySelector('#t-out').textContent"))
        print("fix:",await pg.evaluate("window.__sup||null"))
        print("errs",errs)
        await b.close()
asyncio.run(main())
