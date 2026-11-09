import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":40,"y":0,"w":35,"d":30,"lk":True},{"u":"r3","kind":"room","name":"Lounge","x":0,"y":30,"w":50,"d":40,"lk":True}],"name":"Warehouse"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(4500)
        await pg.screenshot(path="pane_0_rooms.png")
        svg0=await pg.evaluate("document.querySelector('#svg').getBoundingClientRect().left")
        await pg.evaluate("document.documentElement.style.setProperty('--pane-t','3s')")
        await pg.click("#rotog [data-m=objects]")
        frames=[]
        for i in range(16):
            await pg.screenshot(path=f"fr{i}.png",clip={"x":0,"y":120,"width":800,"height":420});await pg.wait_for_timeout(110)
        await pg.wait_for_timeout(1500);await pg.evaluate("document.documentElement.style.setProperty('--pane-t','.5s')")
        await pg.click("#rotog [data-m=rooms]");await pg.wait_for_timeout(800)
        print(svg0,await pg.evaluate("document.querySelector('#svg').getBoundingClientRect().left"),await pg.evaluate("[document.querySelector('#lib').className,document.querySelector('#rpane').className,document.elementFromPoint(150,400).closest('aside')?.id]"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
from PIL import Image
fr=[Image.open(f"fr{i}.png").convert("RGB") for i in range(16)]
fr[0].save("pane_slide.gif",save_all=True,append_images=fr[1:]+[fr[-1]]*3,duration=250,loop=0)
