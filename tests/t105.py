import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Room 1","x":30,"y":0,"w":50,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1133,"height":744},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(2500)
        print("rooms empty: info=",await pg.inner_text("#info-h"),"| pane body len:",len(await pg.inner_text("#rp-b")))
        await pg.screenshot(path="t105.png")
        x,y=await pg.evaluate("(()=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=55;p.y=20;p=p.matrixTransform(m);return [p.x,p.y]})()")
        await pg.mouse.click(x,y);await pg.wait_for_timeout(400)
        print("room selected: info=",await pg.inner_text("#info-h"),"| pane has controls:",await pg.evaluate("!!document.querySelector('#rp-b input')"))
        await pg.click("#rotog [data-m=summary]");await pg.wait_for_timeout(400)
        print("summary: info=",await pg.inner_text("#info-h"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
