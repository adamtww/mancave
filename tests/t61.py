import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":10,"y":10,"w":40,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True,is_mobile=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        cdp=await ctx.new_cdp_session(pg)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def T(t,x,y): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[] if t=="touchEnd" else [{"x":x,"y":y}]})
        await pg.touchscreen.tap(*(await P(30,25)));await pg.wait_for_timeout(300);await pg.tap('#rp-xp');await pg.wait_for_timeout(200)
        pts=[(50.4,20),(62,20),(62,34),(50,34)]
        x,y=await P(*pts[0]);await T("touchStart",x,y)
        for a,c in zip(pts,pts[1:]):
            for k in range(1,15):
                fx=a[0]+(c[0]-a[0])*k/14;fy=a[1]+(c[1]-a[1])*k/14
                if a[1]==c[1]: fy+=0.35*(1 if k%2 else -1)
                else: fx+=0.35*(1 if k%2 else -1)
                x,y=await P(fx,fy);await T("touchMove",x,y);await pg.wait_for_timeout(10)
            if c==(62,34): await pg.screenshot(path="xp_mid.png")
        await T("touchEnd",0,0);await pg.wait_for_timeout(300)
        print(await pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('cave-build')).items[0])"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
