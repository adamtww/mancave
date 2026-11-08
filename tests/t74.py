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
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True,is_mobile=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        cdp=await ctx.new_cdp_session(pg)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def T(t,pts): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[{"x":x,"y":y,"id":i} for i,(x,y) in pts]})
        st="(()=>[!!document.querySelector('#svg .empv'),document.querySelector('#emenu').className.includes('show')])()"
        await pg.touchscreen.tap(*(await P(60,60)));await pg.wait_for_timeout(300);print("tap:",await pg.evaluate(st))
        # pinch
        a=await P(55,55);c=await P(65,65);await T("touchStart",[(0,a),(1,c)])
        for k in range(1,9):await T("touchMove",[(0,(a[0]-6*k,a[1]-6*k)),(1,(c[0]+6*k,c[1]+6*k))]);await pg.wait_for_timeout(15)
        await T("touchEnd",[]);await pg.wait_for_timeout(300);print("after pinch:",await pg.evaluate(st))
        # one-finger pan on open canvas
        a=await P(85,85);await T("touchStart",[(0,a)])
        for k in range(1,9):await T("touchMove",[(0,(a[0]-10*k,a[1]))]);await pg.wait_for_timeout(15)
        await T("touchEnd",[]);await pg.wait_for_timeout(300);print("after pan:",await pg.evaluate(st))
        # menu still near preview?
        print("menu below preview:",await pg.evaluate("(()=>{var m=document.querySelector('#emenu').getBoundingClientRect(),r=document.querySelector('#svg .empv rect').getBoundingClientRect();return Math.round(m.top-r.bottom)+'px gap, centered '+Math.round((m.left+m.width/2)-(r.left+r.width/2))})()"))
        # tap open canvas -> gone
        vb=[float(v) for v in (await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")).split()]
        await pg.touchscreen.tap(*(await P(vb[0]+vb[2]*0.9,vb[1]+vb[3]*0.1)));await pg.wait_for_timeout(300);print("tap open:",await pg.evaluate(st),"(no new menu)")
        await pg.touchscreen.tap(*(await P(vb[0]+vb[2]*0.9,vb[1]+vb[3]*0.1)));await pg.wait_for_timeout(300);print("tap again -> new preview:",await pg.evaluate(st),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
