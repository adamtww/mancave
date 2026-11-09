import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r4","kind":"room","name":"Room 4","x":0,"y":0,"w":42,"d":22,"lk":True,"ex":[{"x":0,"y":22,"w":23,"d":34}]},{"u":"r5","kind":"room","name":"Room 5","x":20,"y":18,"w":30,"d":14,"lk":True},{"u":"r6","kind":"room","name":"Room 6","x":44,"y":30,"w":30,"d":20,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(4500)
        n=await pg.evaluate("(document.querySelector('#svg .plh')||{getAttribute:()=>''}).getAttribute('d').split('M').length-1")
        await pg.screenshot(path="plus_live.png",clip={"x":360,"y":130,"width":600,"height":600})
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(500)
        pass
        print("plus strokes (2 per square):",n,"| objects mode:",await pg.evaluate("!!document.querySelector('#svg .plh')"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
