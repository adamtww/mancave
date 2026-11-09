import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":100,"d":100,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for touch in [True,False]:
            ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=touch);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
            async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
            async def tap(x,y):
                if touch: await pg.touchscreen.tap(x,y)
                else: await pg.mouse.click(x,y)
                await pg.wait_for_timeout(250)
            sel="!!document.querySelector('#rp-nm')"
            res=[]
            for nm,pt in [("top bar empty",(600,30)),("right of mode switch",(870,105)),("info card",(1150,600)),("right margin",(1340,600)),("below canvas",(650,1000))]:
                await tap(*(await P(50,50)));s0=await pg.evaluate(sel)
                await tap(*pt);res.append((nm,s0,await pg.evaluate(sel)))
            await tap(*(await P(50,50)))
            for nm,q in [("rooms pane",(170,700)),("Color tile? no - name field","#rp-nm"),("mode Objects","#rotog [data-m=objects]")]:
                if isinstance(q,str):
                    await pg.click(q);await pg.wait_for_timeout(250)
                else: await tap(*q)
                res.append((nm,await pg.evaluate(sel) if nm!="mode Objects" else await pg.evaluate("document.querySelector('#svg .o')?'ok':''")))
            print("touch" if touch else "mouse",res,errs)
            await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
