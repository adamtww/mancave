import asyncio,json
from playwright.async_api import async_playwright
run=json.load(open('/home/claude/build/runs/r4.json'))
rec=[t for t in run['tests'] if t['name'].startswith('Grand')][0];rec['roles']=['locate','walls','walls','doors']
INIT="""
window.__rec=%s;window.__qq=null;
function roleOf(p){if(p.indexOf('tightly')>=0)return 'locate';if(p.indexOf('only to CHECK')>=0)return 'review';if(p.indexOf('find EVERY door')>=0)return 'doors';return 'walls'}
window.claude={use:async(n)=>{if(n!=='sample')return null;const f=async(p,o)=>{
 if(!window.__qq){var q={},roles=window.__rec.roles;window.__rec.replies.forEach(function(r,i){(q[roles[i]]=q[roles[i]]||[]).push(r)});window.__qq=q}
 await new Promise(r=>setTimeout(r,1500));const role=roleOf(p);const Q=window.__qq[role];
 return {text:(Q&&Q.length)?(Q.length>1?Q.shift():Q[0]):(role==='review'?'{"missing":[],"wrong":[]}':'{}'),modelApplied:o.model}};
 f.limits=async()=>({maxPromptBytes:262144,images:{maxCount:5,maxInputBytes:2e7,mediaTypes:['image/png','image/jpeg']}});return f}};
""" % json.dumps(rec)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1180,"height":820});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.add_init_script(INIT)
        await pg.goto("http://127.0.0.1:8766/index.html");await pg.wait_for_timeout(1000)
        await pg.screenshot(path="/tmp/f1.png")
        await pg.click('#nf-c-plan');await pg.set_input_files('#nf-in','/home/claude/build/shape-proto/tests/grand.png');await pg.click('#nf-go')
        await pg.wait_for_timeout(1200);await pg.screenshot(path="/tmp/f2.png")
        await pg.wait_for_timeout(2600);await pg.screenshot(path="/tmp/f3.png")
        for i in range(30):
            await pg.wait_for_timeout(500)
            if not await pg.evaluate("document.querySelector('#nf-ld').classList.contains('show')"):break
        await pg.wait_for_timeout(500);await pg.screenshot(path="/tmp/f4.png")
        print(await pg.evaluate("document.querySelector('#a-use').textContent"),errs)
        await b.close()
asyncio.run(main())
