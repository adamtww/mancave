import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":5,"y":5,"w":38,"d":40,"lk":True},{"u":"o1","r":"g-cab","name":"Cab","x":8,"y":8,"w":3,"d":3}],"name":"W"}
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
        R="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1');var a=r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0);return JSON.stringify([a,r.x,r.y,r.w,r.d,r.ex||null])})()"
        async def mode():return await pg.evaluate("document.querySelector('#rp-b').innerText.split('\\n')[2]")
        await pg.touchscreen.tap(*(await P(20,20)));await pg.wait_for_timeout(300)
        print("pane:",(await pg.inner_text('#rp-b')).replace('\n',' | '))
        await pg.tap('#rp-xr');await pg.wait_for_timeout(200)
        await drag((50,50),(33,35),shot="cut_mid.png");print("corner cut:",await pg.evaluate(R),"| next:",await mode())
        await pg.tap('#rp-xr');await pg.wait_for_timeout(200)
        await drag((22,0),(26,47));print("split:",await pg.evaluate(R),"| still:",await mode())
        await drag((2,10),(12,14),shot="cut_obj.png");print("objects:",await pg.evaluate(R))
        await drag((60,60),(1,1));print("whole:",await pg.evaluate(R))
        await drag((43,15),(30,25));print("notch east:",await pg.evaluate(R))
        await pg.keyboard.press("Control+z");await pg.wait_for_timeout(200);print("undo:",await pg.evaluate(R))
        print(errs)
        await b.close()
asyncio.run(main());srv.shutdown()
