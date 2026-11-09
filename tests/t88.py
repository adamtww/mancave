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
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        R="JSON.stringify(JSON.parse(localStorage.getItem('cave-build')).items.map(i=>i.name))"
        ms="document.querySelector('#mdl').className+' | '+document.querySelector('#mbox').className"
        await pg.touchscreen.tap(*(await P(50,50)));await pg.wait_for_timeout(300)
        await pg.touchscreen.tap(*(await P(80,80)));await pg.wait_for_timeout(300);print("dialog:",await pg.evaluate(ms),await pg.evaluate("document.querySelector('#mdl-t').textContent"))
        await pg.screenshot(path="dlg.png",clip={"x":360,"y":300,"width":700,"height":400})
        await pg.mouse.click(20,900);await pg.wait_for_timeout(150);print("click backdrop:",await pg.evaluate(ms))
        await pg.click('#mdl-b [data-k=add]');await pg.wait_for_timeout(400);print("Add Room:",await pg.evaluate(R),await pg.evaluate(ms))
        await pg.touchscreen.tap(*(await P(80,80)));await pg.wait_for_timeout(300)
        await pg.touchscreen.tap(*(await P(80,80)));await pg.wait_for_timeout(300)
        await pg.click('#rotog [data-m=summary]');await pg.wait_for_timeout(300);await pg.click('#mdl-b [data-k=add]');await pg.wait_for_timeout(600)
        print("mode switch + Add Room:",await pg.evaluate(R),await pg.evaluate("document.querySelector('#rotog').className"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
