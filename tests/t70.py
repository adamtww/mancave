import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":30,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":36,"y":0,"w":20,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        L="(()=>JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>!['r1','r2'].includes(i.u)).map(i=>[i.name,i.x,i.y,i.w,i.d,!!i.sz,!!i.lk]))()"
        for tap in [(70.3,60.6),(33.2,10.4),(98.5,98.5),(33,35)]:
            await pg.touchscreen.tap(*(await P(*tap)));await pg.wait_for_timeout(300)
            pv=await pg.evaluate("(()=>{var r=document.querySelector('#svg .empv rect');return r?[r.getAttribute('x'),r.getAttribute('y'),r.getAttribute('width'),r.getAttribute('height')].join(','):null})()")
            if tap==(33.2,10.4): await pg.screenshot(path="addroom_prev.png",clip={"x":360,"y":120,"width":560,"height":360})
            await pg.tap('#em-room');await pg.wait_for_timeout(120)
            pop=await pg.evaluate("!!document.querySelector('#svg .popin')")
            await pg.wait_for_timeout(500)
            print(tap,"preview",pv,"pop",pop,"sel pane:",(await pg.inner_text('#rp-b')).split('\n')[0] if await pg.query_selector('#rp-nm') is None else await pg.evaluate("document.querySelector('#rp-nm').value"))
            await pg.touchscreen.tap(*(await P(95,50)));await pg.wait_for_timeout(250)
            await pg.evaluate("document.querySelector('#emenu').className='rmenu emenu'")
        print(await pg.evaluate(L),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
