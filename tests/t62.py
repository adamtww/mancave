import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":38,"d":40,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":45,"y":0,"w":30,"d":25,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        cdp=await ctx.new_cdp_session(pg)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def T(t,x=0,y=0): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[] if t=="touchEnd" else [{"x":x,"y":y}]})
        async def drag(a,c,shot=None):
            await T("touchStart",*(await P(*a)))
            for k in range(1,16):await T("touchMove",*(await P(a[0]+(c[0]-a[0])*k/15,a[1]+(c[1]-a[1])*k/15)));await pg.wait_for_timeout(10)
            if shot: await pg.screenshot(path=shot)
            await T("touchEnd");await pg.wait_for_timeout(300)
        R="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1');return JSON.stringify([r.x,r.y,r.w,r.d,r.ex||null])})()"
        await pg.touchscreen.tap(*(await P(20,20)));await pg.wait_for_timeout(300);await pg.tap('#rp-xp');await pg.wait_for_timeout(200)
        # user's sketch: from bottom-right corner up-left... start at (37.6,39.6) drag to (51,31)
        await drag((37.6,39.6),(51.2,31.2),shot="xpbox_mid.png");print("sketch:",await pg.evaluate(R),"xpon",await pg.evaluate("document.body.classList.contains('xpon')"))
        # into Shop: from (30,10) to (60,20) -> should stop at x=45
        await pg.tap('#rp-xp');await pg.wait_for_timeout(200)
        await drag((30,10),(60,20));print("into shop:",await pg.evaluate(R))
        # drag staying inside -> nothing, still in mode
        await pg.tap('#rp-xp');await pg.wait_for_timeout(200)
        await drag((10,10),(20,20));print("inside only:",await pg.evaluate(R),"xpon",await pg.evaluate("document.body.classList.contains('xpon')"))
        print(errs)
        await b.close()
asyncio.run(main());srv.shutdown()
