import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
objs=[{"u":"o%d"%i,"r":"g-cab","name":"Arcade video cabinet","x":2+i*7,"y":3,"w":5,"d":5} for i in range(5)]+[{"u":"p1","r":"g-cab","name":"Pool table","x":8,"y":40,"w":8,"d":14},{"u":"p2","r":"g-cab","name":"Bar","x":30,"y":40,"w":4,"d":20}]
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":40,"y":0,"w":35,"d":30,"lk":True},{"u":"r3","kind":"room","name":"Lounge","x":0,"y":30,"w":50,"d":40,"lk":True}]+objs,"name":"Warehouse"}
SZ=[("iPad mini",1133,744),("iPad 1180x820",1180,820),("iPad 1376x1032",1376,1032)]
async def pt(pg,x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--host-resolver-rules=MAP test.example.test 127.0.0.1"])
        for i,(nm,w,h) in enumerate(SZ):
            ctx=await b.new_context(viewport={"width":w,"height":h},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://test.example.test:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1000)
            await pg.evaluate("document.querySelector('#ly-name').textContent='Warehouse';var st=document.querySelector('#ly-st');st.className='lyst';st.textContent='Saved';document.querySelector('#u-name').textContent='adam'")
            await pg.wait_for_timeout(4000)
            if i==0:
                x,y=await pt(pg,4.5,5.5);await pg.touchscreen.tap(x,y);await pg.wait_for_timeout(400)
                r1=await pg.evaluate("[document.querySelector('#rmenu').className,document.querySelector('#imenu').className,getComputedStyle(document.querySelector('.ob')).opacity]")
                await pg.touchscreen.tap(*(await pt(pg,90,90)));await pg.wait_for_timeout(300)
                await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(700)
                await pg.touchscreen.tap(x,y);await pg.wait_for_timeout(400)
                r2=await pg.evaluate("[document.querySelector('#rmenu').className,document.querySelector('#imenu').className,getComputedStyle(document.querySelector('.ob')).opacity]")
                await pg.click("#rotog [data-m=rooms]");await pg.wait_for_timeout(700)
                r3=await pg.evaluate("[document.querySelector('#imenu').className,getComputedStyle(document.querySelector('.ob')).opacity]")
                print("rooms tap obj:",r1,"| objects tap obj:",r2,"| back to rooms:",r3,errs)
                await pg.keyboard.press('Escape');await pg.evaluate("document.querySelector('#emenu').className='rmenu emenu'");await pg.wait_for_timeout(300)
                await pg.screenshot(path="cmp_rooms.png",clip={"x":360,"y":240,"width":220,"height":300})
                await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(700)
                await pg.screenshot(path="cmp_objs.png",clip={"x":360,"y":240,"width":220,"height":300})
                await pg.click("#rotog [data-m=rooms]");await pg.wait_for_timeout(700)
            await pg.screenshot(path=f"sz{i}.png");await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
from PIL import Image as I
a=I.open('cmp_rooms.png').convert('RGB');b2=I.open('cmp_objs.png').convert('RGB');c=I.new('RGB',(460,300),'white');c.paste(a,(0,0));c.paste(b2,(240,0));c=c.resize((920,600));c.save('cmp_rooms_vs_objects.png')
from PIL import Image, ImageDraw, ImageFont
f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",30)
for i,(nm,w,h) in enumerate(SZ):
    im=Image.open(f"sz{i}.png").convert("RGB");c=Image.new("RGB",(w+40,h+100),"#2b2a27");c.paste(im,(20,80));d=ImageDraw.Draw(c);d.text((22,22),f"{nm}  —  Rooms mode",fill="white",font=f);c.save(f"rooms_{i+1}_{nm.replace(' ','_')}.png")
