import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":20,"y":20,"w":20,"d":20,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":50,"y":20,"w":20,"d":20,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c,shot=None):
            await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
            for k in range(1,16):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/15,a[1]+(c[1]-a[1])*k/15)));await pg.wait_for_timeout(8)
            if shot: await pg.screenshot(path=shot)
            await pg.mouse.up();await pg.wait_for_timeout(250)
        A="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1');return r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0)})()"
        on="document.body.classList.contains('xpon')"
        await pg.mouse.click(*(await P(30,30)));await pg.wait_for_timeout(300)
        await pg.click('#rp-xp');await drag((45,25),(40,35));print("outside->wall:",await pg.evaluate(A),"mode",await pg.evaluate(on))
        await pg.click('#rp-xp');await drag((80,80),(72,70),shot="xp_nottouch.png");print("not touching:",await pg.evaluate(A),"mode",await pg.evaluate(on))
        vb0=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")
        await drag((60,30),(55,25));print("start in other room:",await pg.evaluate(A),"mode",await pg.evaluate(on))
        await drag((10,15),(25,25));print("overlap corner:",await pg.evaluate(A),"mode",await pg.evaluate(on),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
