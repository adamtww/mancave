import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        x,y=await pg.evaluate("(()=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=20;p.y=15;p=p.matrixTransform(m);return [p.x,p.y]})()")
        vis="['#rm-edit','#rm-add','#rm-del'].map(s=>document.querySelector(s).offsetParent!==null)"
        await pg.touchscreen.tap(x,y);await pg.wait_for_timeout(400);print("rooms:",await pg.evaluate(vis))
        await pg.screenshot(path="rm_rooms.png")
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(700);await pg.touchscreen.tap(x,y);await pg.wait_for_timeout(400);print("objects:",await pg.evaluate(vis),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
