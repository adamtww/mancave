import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
objs=[{"u":"o%d"%i,"r":"g-cab","name":"Cab %d"%i,"x":30+ (i%2)*4,"y":5+i*6,"w":3,"d":3} for i in range(5)]
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":40,"lk":True}]+objs+[{"u":"s1","kind":"room","name":"Tiny","x":60,"y":0,"w":6,"d":6,"lk":True},{"u":"t1","r":"g-cab","name":"Cab T","x":61,"y":1,"w":3,"d":3}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        cdp=await ctx.new_cdp_session(pg)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def T(t,x=0,y=0): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[] if t=="touchEnd" else [{"x":x,"y":y}]})
        live="(()=>S? null:null)()"
        async def drag(a,c,shots=None,back=None):
            await T("touchStart",*(await P(*a)))
            for k in range(1,21):
                await T("touchMove",*(await P(a[0]+(c[0]-a[0])*k/20,a[1]+(c[1]-a[1])*k/20)));await pg.wait_for_timeout(10)
                if shots and k in (7,14,20): await pg.screenshot(path=f"{shots}_{k}.png",clip={"x":370,"y":150,"width":380,"height":330})
            if back:
                for k in range(1,11):await T("touchMove",*(await P(c[0]+(back[0]-c[0])*k/10,c[1]+(back[1]-c[1])*k/10)));await pg.wait_for_timeout(10)
            await T("touchEnd");await pg.wait_for_timeout(300)
        O="(()=>JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.kind!=='room').map(i=>[i.u,i.x,i.y]))()"
        R="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1');return r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0)})()"
        await pg.touchscreen.tap(*(await P(15,20)));await pg.wait_for_timeout(300);await pg.tap('#rp-xr');await pg.wait_for_timeout(200)
        # drag in and back out -> nothing changes
        await drag((45,2),(28,38),back=(42,38));print("in&out:",await pg.evaluate(R),await pg.evaluate(O))
        await drag((45,2),(26,38),shots="push");print("cut+push:",await pg.evaluate(R),await pg.evaluate(O))
        await pg.keyboard.press("Control+z");await pg.wait_for_timeout(200);print("undo:",await pg.evaluate(R),await pg.evaluate(O)[:2] if False else (await pg.evaluate(O))[:2])
        # tiny room: can't fit
        await pg.click("#rp-xc") if await pg.query_selector('#rp-xc') else None
        await pg.touchscreen.tap(*(await P(65,5)));await pg.wait_for_timeout(300);await pg.tap('#rp-xr');await pg.wait_for_timeout(200)
        await drag((70,-0.5),(63,7));print("tiny:",await pg.evaluate(O)[-1:] if False else (await pg.evaluate(O))[-1], "flash/xp:",await pg.evaluate("document.body.classList.contains('xpon')"))
        print(errs);await b.close()
asyncio.run(main());srv.shutdown()
