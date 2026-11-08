import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":30,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        st="(()=>[!!document.querySelector('#svg .empv'),!!document.querySelector('#mdl.show, #mdl:not([hidden])')&&getComputedStyle(document.querySelector('#mdl')).display!=='none'])()"
        await pg.touchscreen.tap(*(await P(35,10)));await pg.wait_for_timeout(300);print("preview:",await pg.evaluate(st))
        await pg.touchscreen.tap(*(await P(80,80)));await pg.wait_for_timeout(300);print("tap outside -> asks:",await pg.evaluate(st),await pg.evaluate("document.querySelector('#mdl-t').textContent"))
        await pg.click('#mdl-b [data-k=no]');await pg.wait_for_timeout(250);print("keep editing:",await pg.evaluate(st))
        await pg.touchscreen.tap(*(await P(15,15)));await pg.wait_for_timeout(300);await pg.click('#mdl-b [data-k=yes]');await pg.wait_for_timeout(250)
        print("discard via tapping room:",await pg.evaluate(st),"selected:",await pg.evaluate("document.querySelector('#rp-nm')&&document.querySelector('#rp-nm').value"))
        await pg.touchscreen.tap(*(await P(80,80)));await pg.wait_for_timeout(300)
        await pg.touchscreen.tap(*(await P(35,10)));await pg.wait_for_timeout(300)
        await pg.click('#rotog [data-m=objects]');await pg.wait_for_timeout(250);print("mode switch asks:",await pg.evaluate(st))
        await pg.click('#mdl-b [data-k=yes]');await pg.wait_for_timeout(600);print("after discard mode:",await pg.evaluate("document.querySelector('#rotog').className"),await pg.evaluate(st),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
