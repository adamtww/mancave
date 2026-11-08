import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":60,"y":0,"w":30,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for touch in [True,False]:
            ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=touch);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
            async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
            x,y=await P(20,15)
            if touch: await pg.touchscreen.tap(x,y)
            else: await pg.mouse.click(x,y)
            await pg.wait_for_timeout(300)
            st=await pg.evaluate("[document.querySelectorAll('#svg .hd').length,document.querySelectorAll('#svg animate').length]")
            # drag east handle (40,15) to 52
            hx,hy=await P(40,15);tx,ty=await P(52,15)
            await pg.mouse.move(hx,hy);await pg.mouse.down();
            for k in range(1,11):await pg.mouse.move(hx+(tx-hx)*k/10,hy);await pg.wait_for_timeout(20)
            await pg.mouse.up();await pg.wait_for_timeout(300)
            w=await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1')")
            # try past the neighbour: drag to 75 (shop at 60)
            hx,hy=await P(52,15);tx,ty=await P(75,15)
            await pg.mouse.move(hx,hy);await pg.mouse.down();
            for k in range(1,11):await pg.mouse.move(hx+(tx-hx)*k/10,hy);await pg.wait_for_timeout(20)
            await pg.mouse.up();await pg.wait_for_timeout(300)
            w2=await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1')")
            await pg.keyboard.press("Control+z");await pg.wait_for_timeout(300)
            w3=await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1').w")
            await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(600)
            if touch: await pg.touchscreen.tap(x,y)
            else: await pg.mouse.click(x,y)
            await pg.wait_for_timeout(300)
            st2=await pg.evaluate("[document.querySelectorAll('#svg .hd').length,document.querySelectorAll('#svg animate').length]")
            print("touch" if touch else "mouse","rooms handles/ants",st,"w after drag",w['w'],"lk",w.get('lk'),"| into neighbour",w2['w'],"| undo",w3,"| objects mode",st2,errs)
            await pg.screenshot(path=f"rs_{touch}.png");await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
