import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":20,"y":20,"w":40,"d":40,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":60,"y":20,"w":30,"d":40,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for touch in [True,False]:
            ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=touch);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
            cdp=await ctx.new_cdp_session(pg)
            async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
            async def T(t,x=0,y=0): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[] if t=="touchEnd" else [{"x":x,"y":y}]})
            async def drag(a,c):
                if touch: await T("touchStart",*(await P(*a)))
                else: await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
                for k in range(1,13):
                    q=await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)
                    if touch: await T("touchMove",*q)
                    else: await pg.mouse.move(*q)
                    await pg.wait_for_timeout(10)
                if touch: await T("touchEnd")
                else: await pg.mouse.up()
                await pg.wait_for_timeout(250)
            async def tap(x,y):
                if touch: await pg.touchscreen.tap(*(await P(x,y)))
                else: await pg.mouse.click(*(await P(x,y)))
                await pg.wait_for_timeout(250)
            A="(()=>{var it=JSON.parse(localStorage.getItem('cave-build')).items;return it.map(r=>r.name+':'+(r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0))).join(' ')})()"
            on="document.body.classList.contains('xpon')+'/'+(document.querySelector('#rp-b').innerText.includes('Carve stays'))"
            await tap(30,30);await pg.click('#rp-xr');await pg.wait_for_timeout(150)
            await drag((70,30),(55,40));r1=await pg.evaluate(A);m1=await pg.evaluate(on)   # start in Shop, carve into Arcade
            await drag((10,10),(25,25));r2=await pg.evaluate(A);m2=await pg.evaluate(on)
            await tap(40,40);m3=await pg.evaluate(on)    # tap inside room: stays
            await tap(75,75);m4=await pg.evaluate(on)    # tap outside: ends
            print("touch" if touch else "mouse","| from Shop:",r1,m1,"| 2nd cut:",r2,m2,"| tap inside:",m3,"| tap outside:",m4,"| still selected:",await pg.evaluate("!!document.querySelector('#rp-nm')"),errs)
            await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
