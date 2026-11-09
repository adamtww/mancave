import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r3","kind":"room","name":"Room 3","x":0,"y":30,"w":40,"d":20,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c):
            await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
            for k in range(1,13):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)));await pg.wait_for_timeout(10)
            await pg.mouse.up();await pg.wait_for_timeout(250)
        H="Array.from(document.querySelectorAll('#svg .ehd')).map(e=>e.dataset.k+'@'+(Math.round((+e.getAttribute('x')+ +e.getAttribute('width')/2)*2)/2)+','+(Math.round((+e.getAttribute('y')+ +e.getAttribute('height')/2)*2)/2)).join(' ')"
        await pg.mouse.click(*(await P(30,56)));await pg.wait_for_timeout(300)
        print("preview handles:",await pg.evaluate(H))
        # widen east to 50 first (E wall at x=35, y 51..61?), then pull top wall up past Room 3 -> wraps
        await drag((35,55.5),(50,55.5))
        print("after widen:",await pg.evaluate(H))
        await drag((37.5,51),(37.5,40))
        await pg.screenshot(path="em_shape.png",clip={"x":360,"y":150,"width":600,"height":500})
        print("menu shown:",await pg.evaluate("document.querySelector('#emenu').className"))
        await pg.click('#em-room');await pg.wait_for_timeout(400)
        print("created:",await pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u!=='r3').map(i=>[i.x,i.y,i.w,i.d,i.ex||null]))"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
