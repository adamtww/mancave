import asyncio, http.server, threading, functools, socketserver, random, json, sys
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Room 1","x":0,"y":0,"w":50,"d":50,"lk":True},{"u":"r2","kind":"room","name":"Room 2","x":50,"y":0,"w":20,"d":20},
 {"u":"m","r":"g-cab","name":"Cab","x":10,"y":10,"w":3,"d":3,"rot":0}],"name":"Dad's Cave"}
TOUCH=len(sys.argv)>1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=TOUCH,device_scale_factor=2)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(2500)
        await pg.click("#rotog [data-m=summary]");await pg.wait_for_timeout(700)
        print("pane:",await pg.inner_text("#spane .lt"),"|",(await pg.inner_text("#spane .sp-b")).replace("\n"," ")[:90],"| right:",await pg.inner_text("#info-h"),(await pg.inner_text("#info-b")).replace("\n"," "),"| visible:",await pg.evaluate("!document.querySelector('#spane').classList.contains('away')&&document.querySelector('#lib').classList.contains('away')&&document.querySelector('#rpane').classList.contains('away')"))
        async def W(x,y): return await pg.evaluate("([x,y])=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        cdp=await ctx.new_cdp_session(pg)
        async def tap(x,y):
            if TOUCH:
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y,"id":1}]});await pg.wait_for_timeout(60);await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
            else: await pg.mouse.click(x,y)
            await pg.wait_for_timeout(350)
        x,y=await W(11.5,11.5);await tap(x,y)
        print("tap object -> info:",await pg.inner_text("#info-h"),"| buttons shown:",await pg.evaluate("getComputedStyle(document.querySelector('#imenu')).display"))
        await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x+150,y+150,steps=8);await pg.mouse.up();await pg.wait_for_timeout(400)
        print("after drag, object at:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='m').map(i=>[i.x,i.y])"))
        x,y=await W(60,10);await tap(x,y)
        print("tap unlocked room -> info:",await pg.inner_text("#info-h"),"| handles:",await pg.evaluate("document.querySelectorAll('#svg .hd').length"))
        await pg.keyboard.press("Delete");await pg.wait_for_timeout(200)
        print("after Delete key rooms:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.kind==='room').length"))
        x,y=await W(85,85);await tap(x,y)
        await pg.screenshot(path="t107.png");print("tap empty -> info:",await pg.inner_text("#info-h"),"| emenu:",await pg.evaluate("document.querySelector('#emenu').classList.contains('show')"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
