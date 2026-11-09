import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
# Room 2: 43..100 x 31..52 with notch 86..96 x 43..52 open at the bottom; Room 3: 0..43 x 45..66 + 43..100 x 52..66
r2={"u":"r2","kind":"room","name":"Room 2","x":43,"y":31,"w":57,"d":12,"lk":True,"ex":[{"x":0,"y":12,"w":43,"d":9},{"x":53,"y":12,"w":4,"d":9}]}
r3={"u":"r3","kind":"room","name":"Room 3","x":0,"y":45,"w":43,"d":21,"lk":True,"ex":[{"x":43,"y":7,"w":57,"d":14}]}
plan={"lot":{"w":100,"d":100},"items":[r2,r3],"name":"W"}
async def run(method):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c):
            await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
            for k in range(1,13):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)));await pg.wait_for_timeout(10)
            await pg.mouse.up();await pg.wait_for_timeout(250)
        A="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r3');return r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0)})()"
        await pg.mouse.click(*(await P(20,58)));await pg.wait_for_timeout(300);a0=await pg.evaluate(A)
        if method=="wall":
            H=await pg.evaluate("Array.from(document.querySelectorAll('#svg .shd')).map(e=>e.dataset.k+'@'+(Math.round((+e.getAttribute('x')+ +e.getAttribute('width')/2)*2)/2)+','+(Math.round((+e.getAttribute('y')+ +e.getAttribute('height')/2)*2)/2)).join(' ')")
            print(H)
            await drag((91,52),(91,40))
        else:
            await pg.click('#rp-xp');await pg.wait_for_timeout(150);await drag((87,44),(95,53))
        await pg.screenshot(path=f"notch_{method}.png",clip={"x":360,"y":250,"width":600,"height":350})
        print(method,"area",a0,"->",await pg.evaluate(A),"(notch is 10x9=90)",errs)
        await b.close()
async def main():
    await run("wall");await run("expand")
asyncio.run(main());srv.shutdown()
