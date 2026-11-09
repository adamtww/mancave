import asyncio, http.server, threading, functools, socketserver, random, json, sys
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Room 1","x":0,"y":0,"w":50,"d":50,"lk":True},
 {"u":"m","r":"g-cab","name":"Cab","x":10,"y":10,"w":3,"d":3,"rot":0}],"name":"W"}
TOUCH=len(sys.argv)>1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=TOUCH)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(3000)
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(500)
        cdp=await ctx.new_cdp_session(pg)
        async def W(x,y): return await pg.evaluate("([x,y])=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,bb,shot=None):
            x0,y0=await W(*a);x1,y1=await W(*bb)
            if TOUCH:
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x0,"y":y0,"id":1}]})
                for k in range(1,21):
                    await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x0+(x1-x0)*k/20,"y":y0+(y1-y0)*k/20,"id":1}]});await pg.wait_for_timeout(20)
            else:
                await pg.mouse.move(x0,y0);await pg.mouse.down()
                for k in range(1,21): await pg.mouse.move(x0+(x1-x0)*k/20,y0+(y1-y0)*k/20);await pg.wait_for_timeout(20)
            await pg.wait_for_timeout(150)
            info=await pg.evaluate("[!!document.querySelector('.chip.cardchip.onc'),!!document.querySelector('#svg rect.landp'),document.querySelectorAll('#svg g.ob').length]")
            if shot: await pg.screenshot(path=shot,clip={"x":x1-150,"y":y1-150,"width":300,"height":300})
            if TOUCH: await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
            else: await pg.mouse.up()
            await pg.wait_for_timeout(700)
            return info
        print("mid-drag [held, preview, objects drawn]:",await drag((11.5,11.5),(30,30),"mv.png"))
        print("after move:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='m').map(i=>[i.x,i.y])"))
        pos=(await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='m').map(i=>[i.x,i.y])"))[0]
        print("bad drop:",await drag((pos[0]+1.5,pos[1]+1.5),(80,80)))
        print("after bad drop:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='m').map(i=>[i.x,i.y])"),await pg.evaluate("document.querySelectorAll('#svg g.ob').length"))
        await pg.keyboard.press("Control+z");await pg.wait_for_timeout(300)
        print("after undo:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='m').map(i=>[i.x,i.y])"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
