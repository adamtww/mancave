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
        L="(()=>JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u!=='r1').map(i=>[i.name,i.x,i.y,i.w,i.d,!!i.sz,!!i.lk]))()"
        await pg.touchscreen.tap(*(await P(60,60)));await pg.wait_for_timeout(300)
        await pg.tap('#em-room');await pg.wait_for_timeout(300)
        st=await pg.evaluate("[getComputedStyle(document.querySelector('#cmenu')).display,document.querySelectorAll('#svg .hd').length,document.querySelector('#rp-b').innerText.split('\\n').slice(0,3).join(' | ')]")
        print("created:",await pg.evaluate(L),st)
        r=(await pg.evaluate(L))[0];ex=r[1]+r[3];ey=r[2]+r[4]
        await pg.mouse.move(*(await P(ex,ey)));await pg.mouse.down()
        for k in range(1,11):await pg.mouse.move(*(await P(ex+k,ey+k)));await pg.wait_for_timeout(15)
        await pg.mouse.up();await pg.wait_for_timeout(300);print("resized:",await pg.evaluate(L))
        await pg.touchscreen.tap(*(await P(95,95)));await pg.wait_for_timeout(400)
        print("after tap outside:",await pg.evaluate(L),"sel pane:",await pg.inner_text('#rp-b'),"emenu:",await pg.evaluate("document.querySelector('#emenu').className"))
        # second: create then tap other room -> finishes & selects Arcade
        await pg.touchscreen.tap(*(await P(60,10)));await pg.wait_for_timeout(300);await pg.tap('#em-room');await pg.wait_for_timeout(300)
        await pg.touchscreen.tap(*(await P(10,10)));await pg.wait_for_timeout(400)
        print("tap other room:",await pg.evaluate(L),"pane:",(await pg.inner_text('#rp-b')).split('\n')[0],errs)
        await b.close()
asyncio.run(main());srv.shutdown()
