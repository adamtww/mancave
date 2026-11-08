import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
# like Adam's: objects in the left column and bottom-left that must stay put
objs=[{"u":"sk","r":"g-cab","name":"Skee","x":0,"y":15,"w":10,"d":2.5},{"u":"dt","r":"g-cab","name":"Darts","x":1.5,"y":30,"w":3,"d":10},{"u":"pt","r":"g-cab","name":"Pool","x":5.5,"y":28,"w":8,"d":4.5},{"u":"tp","r":"g-cab","name":"Top","x":20,"y":2,"w":4,"d":4}]
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":38,"d":40,"lk":True}]+objs,"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        await pg.mouse.click(*(await P(25,10)));await pg.wait_for_timeout(300);await pg.click('#rp-xr');await pg.wait_for_timeout(200)
        a,c=(42,45),(14,18)
        await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
        for k in range(1,21):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/20,a[1]+(c[1]-a[1])*k/20)));await pg.wait_for_timeout(10)
        prev=await pg.evaluate("S.items.filter(i=>i.kind!=='room').map(i=>[i.u,i.x,i.y]).join(' ')") if False else None
        prev=await pg.evaluate("Array.from(document.querySelectorAll('#svg g.ob')).map(g=>{var r=g.querySelector('rect');return g.dataset.u+':'+r.getAttribute('x')+','+r.getAttribute('y')}).join(' ')")
        await pg.mouse.up();await pg.wait_for_timeout(300)
        after=await pg.evaluate("Array.from(document.querySelectorAll('#svg g.ob')).map(g=>{var r=g.querySelector('rect');return g.dataset.u+':'+r.getAttribute('x')+','+r.getAttribute('y')}).join(' ')")
        print("preview:",prev);print("after:  ",after);print("match:",prev==after,errs)
        await b.close()
asyncio.run(main());srv.shutdown()
