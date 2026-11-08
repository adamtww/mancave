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
        for touch in [True,False]:
            ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=touch);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
            cdp=await ctx.new_cdp_session(pg)
            async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
            async def drag(a,c):
                if touch:
                    async def T(t,x=0,y=0): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[] if t=="touchEnd" else [{"x":x,"y":y}]})
                    await T("touchStart",*(await P(*a)))
                    for k in range(1,13):await T("touchMove",*(await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)));await pg.wait_for_timeout(10)
                    await T("touchEnd")
                else:
                    await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
                    for k in range(1,13):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)));await pg.wait_for_timeout(10)
                    await pg.mouse.up()
                await pg.wait_for_timeout(250)
            pv="(()=>{var r=document.querySelector('#svg .empv rect');return r?[r.getAttribute('x'),r.getAttribute('y'),r.getAttribute('width'),r.getAttribute('height')].join(','):null})()"
            em="document.querySelector('#emenu').className"
            if touch: await pg.touchscreen.tap(*(await P(50,50)))
            else: await pg.mouse.click(*(await P(50,50)))
            await pg.wait_for_timeout(300);a=await pg.evaluate(pv)
            await drag((55,55),(62,58));b1=await pg.evaluate(pv);m1=await pg.evaluate(em)
            await drag((45,45),(20,40));b2=await pg.evaluate(pv)   # NW corner toward Arcade (ends x=30)
            if not touch: await pg.screenshot(path="emresize.png")
            await pg.click('#em-room');await pg.wait_for_timeout(500)
            room=await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u!=='r1').map(i=>[i.x,i.y,i.w,i.d])")
            print("touch" if touch else "mouse","start",a,"| SE drag",b1,m1,"| NW into Arcade",b2,"| created",room,errs)
            await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
