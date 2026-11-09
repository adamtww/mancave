import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":60,"y":0,"w":30,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        t0=await pg.inner_text('#rp-b')
        await pg.touchscreen.tap(*(await P(20,15)));await pg.wait_for_timeout(400)
        t1=await pg.inner_text('#rp-b');menu=await pg.evaluate("getComputedStyle(document.querySelector('#rmenu')).display")
        await pg.screenshot(path="rp.png")
        await pg.click('#rp-del');await pg.wait_for_timeout(300);await pg.click('#cd-yes');await pg.wait_for_timeout(400)
        n=await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.length");t2=await pg.inner_text('#rp-b')
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(600);await pg.touchscreen.tap(*(await P(70,15)));await pg.wait_for_timeout(400)
        m2=await pg.evaluate("getComputedStyle(document.querySelector('#rmenu')).display")
        print(repr(t0),'|',repr(t1),'| rmenu',menu,'| after remove items',n,repr(t2),'| objects-mode rmenu',m2,errs)
        await b.close()
asyncio.run(main());srv.shutdown()
