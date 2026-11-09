import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":20,"y":20,"w":38,"d":40,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True,is_mobile=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        cdp=await ctx.new_cdp_session(pg)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def T(t,pts): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[{"x":x,"y":y,"id":i} for i,(x,y) in pts]})
        await pg.touchscreen.tap(*(await P(30,30)));await pg.wait_for_timeout(300);await pg.tap('#rp-xr');await pg.wait_for_timeout(200)
        vb0=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")
        for mode in ["staggered","together"]:
            a=await P(40,40);b2=await P(50,50)
            if mode=="staggered":
                await T("touchStart",[(0,a)])
                await T("touchMove",[(0,(a[0]+15,a[1]+10))]);await pg.wait_for_timeout(30)
                await T("touchStart",[(0,(a[0]+15,a[1]+10)),(1,b2)])
                a=(a[0]+15,a[1]+10)
            else:
                await T("touchStart",[(0,a),(1,b2)])
            for k in range(1,11):
                await T("touchMove",[(0,(a[0]-8*k,a[1]-8*k)),(1,(b2[0]+8*k,b2[1]+8*k))]);await pg.wait_for_timeout(20)
            await T("touchEnd",[]);await pg.wait_for_timeout(300)
            vb=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")
            area=await pg.evaluate("(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items[0];return r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0)})()")
            print(mode,"zoomed:",vb!=vb0,"| room area:",area,"| still reduce:",await pg.evaluate("document.body.classList.contains('xpon')"))
            vb0=vb
        # after pinching, a one-finger cut still works
        vbv=[float(v) for v in (await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")).split()];print('view',vbv);cx=vbv[0]+vbv[2]/2;cy=vbv[1]+vbv[3]/2;a=await P(cx+vbv[2]*0.3,cy);c=await P(cx,cy+vbv[3]*0.2)
        await T("touchStart",[(0,a)])
        for k in range(1,11):await T("touchMove",[(0,(a[0]+(c[0]-a[0])*k/10,a[1]+(c[1]-a[1])*k/10))]);await pg.wait_for_timeout(10)
        await T("touchEnd",[]);await pg.wait_for_timeout(300)
        print("cut after pinch (room 20..58,20..60):",await pg.evaluate("(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items[0];return r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0)})()"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
