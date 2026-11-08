import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":40,"y":0,"w":35,"d":30,"lk":True},{"u":"r3","kind":"room","name":"Lounge","x":0,"y":30,"w":50,"d":40,"lk":True}],"name":"Warehouse"}
SZ=[("iPad mini",1133,744),("iPad / iPad Air 11in",1180,820),("iPad Pro 11in",1210,834),("iPad Air 13in",1366,1024),("iPad Pro 13in",1376,1032)]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--host-resolver-rules=MAP test.example.test 127.0.0.1"])
        for i,(nm,w,h) in enumerate(SZ):
            ctx=await b.new_context(viewport={"width":w,"height":h},has_touch=True,device_scale_factor=1);pg=await ctx.new_page()
            await pg.goto(f"http://test.example.test:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1000)
            await pg.evaluate("document.querySelector('#ly-name').textContent='Warehouse';var st=document.querySelector('#ly-st');st.className='lyst';st.textContent='Saved';document.querySelector('#u-name').textContent='adam';document.querySelectorAll('.flash,.toast').forEach(e=>e.remove())")
            await pg.wait_for_timeout(4500)
            await pg.screenshot(path=f"/home/claude/build/sz{i}.png");await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
from PIL import Image, ImageDraw, ImageFont
f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",30)
for i,(nm,w,h) in enumerate(SZ):
    im=Image.open(f"sz{i}.png").convert("RGB");c=Image.new("RGB",(w+40,h+100),"#2b2a27");c.paste(im,(20,80));d=ImageDraw.Draw(c);d.text((22,22),f"{nm}  —  {w}×{h} landscape",fill="white",font=f);c.save(f"/home/claude/build/preview_{i+1}_{nm.replace(' ','_').replace('/','-')}.png")
