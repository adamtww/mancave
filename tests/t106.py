import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
rooms=[{"u":"r1","kind":"room","name":"Arcade","x":42,"y":0,"w":58,"d":44,"lk":True,"col":"#b8b8b8","ex":[{"x":-42,"y":0,"w":42,"d":24}]},
 {"u":"r2","kind":"room","name":"Bar & Lounge","x":0,"y":24,"w":25,"d":20,"lk":True,"col":"#9fd8a5"},
 {"u":"r3","kind":"room","name":"Workshop & Woodworking Area","x":25,"y":44,"w":45,"d":22,"lk":True},
 {"u":"r4","kind":"room","name":"Gym","x":70,"y":44,"w":30,"d":30,"lk":True,"col":"#9fc4e8"}]
items=rooms+[{"u":"o1","r":"g-cab","name":"Cab","x":50,"y":2,"w":3,"d":3},{"u":"o2","r":"g-pool","name":"Pool","x":60,"y":10,"w":4.5,"d":8.5},{"u":"o3","r":"l-bar","name":"Bar","x":2,"y":26,"w":15,"d":8},{"u":"o4","r":"f-tread","name":"Tread","x":75,"y":50,"w":3,"d":7}]
plan={"lot":{"w":100,"d":100},"items":items,"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1133,"height":744},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(2500)
        print("cards:",await pg.evaluate("document.querySelectorAll('#rp-b .rcard').length"),"|",(await pg.inner_text("#rp-b .rcard")).replace("\n"," "))
        await pg.screenshot(path="t106.png")
        await pg.click("#rp-b .rcard[data-u=r4]");await pg.wait_for_timeout(500)
        print("after click: info=",await pg.inner_text("#info-h"),"| pane name input:",await pg.evaluate("(document.querySelector('#rp-b input')||{}).value"))
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(300);await pg.click("#rotog [data-m=rooms]");await pg.wait_for_timeout(400)
        print("back to rooms: cards:",await pg.evaluate("document.querySelectorAll('#rp-b .rcard').length"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
