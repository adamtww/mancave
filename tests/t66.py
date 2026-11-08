import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":38,"d":40,"lk":True},{"u":"o1","r":"g-cab","name":"Cab","x":15,"y":15,"w":3,"d":3}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c):
            await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
            for k in range(1,21):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/20,a[1]+(c[1]-a[1])*k/20)));await pg.wait_for_timeout(10)
            await pg.mouse.up();await pg.wait_for_timeout(300)
        R="(()=>{var it=JSON.parse(localStorage.getItem('cave-build')).items;var r=it.find(i=>i.u==='r1');return JSON.stringify([r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0),it.find(i=>i.u==='o1')])})()"
        await pg.mouse.click(*(await P(5,5)));await pg.wait_for_timeout(300)
        await pg.click('#rp-xr');await pg.wait_for_timeout(200);await drag((25,30),(45,45));print("inside->out corner:",await pg.evaluate(R))
        await pg.click('#rp-xr');await pg.wait_for_timeout(200);await drag((12,12),(20,20));print("hole w/ object:",await pg.evaluate(R))
        await pg.screenshot(path="hole.png")
        print(errs);await b.close()
asyncio.run(main());srv.shutdown()
