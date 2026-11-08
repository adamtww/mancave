import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
# L: 20..40 x 20..40 plus 40..50 x 30..40 ; hole room: 60..90 x 20..45 with opening 70..78 x 28..34
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":20,"y":20,"w":20,"d":20,"lk":True,"ex":[{"x":20,"y":10,"w":10,"d":10}]},
 {"u":"r5","kind":"room","name":"Room 5","x":60,"y":20,"w":30,"d":8,"lk":True,"ex":[{"x":0,"y":8,"w":10,"d":6},{"x":18,"y":8,"w":12,"d":6},{"x":0,"y":14,"w":30,"d":11}]}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c):
            await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
            for k in range(1,13):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)));await pg.wait_for_timeout(10)
            await pg.mouse.up();await pg.wait_for_timeout(250)
        def A(u):return "(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='%s');return r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0)})()"%u
        H="Array.from(document.querySelectorAll('#svg .shd')).map(e=>{var x=+e.getAttribute('x')+ +e.getAttribute('width')/2,y=+e.getAttribute('y')+ +e.getAttribute('height')/2;return e.dataset.k+'@'+Math.round(x*2)/2+','+Math.round(y*2)/2}).join(' ')"
        await pg.mouse.click(*(await P(25,25)));await pg.wait_for_timeout(300);await pg.click('#rp-xs');await pg.wait_for_timeout(200)
        print("L handles:",await pg.evaluate(H))
        await drag((45,30),(45,25));print("step top wall up 5 (from 30 to 25): area",await pg.evaluate(A('r1')),"expect 500+50=550")
        await drag((50,32.5),(55,32.5));print("step east wall +5: area",await pg.evaluate(A('r1')),"expect 550+75=625")
        await pg.screenshot(path="shape_L.png")
        await pg.click('#rp-xc');await pg.mouse.click(*(await P(65,40)));await pg.wait_for_timeout(300);await pg.click('#rp-xs');await pg.wait_for_timeout(200)
        print("hole room handles:",await pg.evaluate(H))
        await drag((74,28),(74,24));print("hole top wall up 4:",await pg.evaluate(A('r5')),"expect",30*25-8*6-8*4)
        await pg.screenshot(path="shape_hole.png")
        print(errs);await b.close()
asyncio.run(main());srv.shutdown()
