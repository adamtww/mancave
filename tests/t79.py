import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
# like Adam's: Room 3 above-left, Room 4 below spanning wider
plan={"lot":{"w":100,"d":100},"items":[{"u":"r3","kind":"room","name":"Room 3","x":0,"y":45,"w":43,"d":20,"lk":True},{"u":"r4","kind":"room","name":"Room 4","x":0,"y":66,"w":51,"d":15,"lk":True},{"u":"r0","kind":"room","name":"Top","x":0,"y":20,"w":43,"d":25,"lk":True}],"name":"W"}
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
        A="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r4');return [r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0),JSON.stringify([r.x,r.y,r.w,r.d,r.ex||null])]})()"
        await pg.mouse.click(*(await P(20,74)));await pg.wait_for_timeout(300)
        print("before:",await pg.evaluate(A))
        await drag((51,66),(51,40));print("NE corner up to 40:",await pg.evaluate(A),"expect 765+8*26=973")
        await pg.screenshot(path="hallway.png",clip={"x":360,"y":160,"width":520,"height":520})
        await pg.keyboard.press("Control+z");await pg.wait_for_timeout(200)
        await drag((25.5,66),(25.5,30));print("top wall up (whole wall) to 30:",await pg.evaluate(A),"expect 765+8*36=1053 (only free strip moves)")
        print(errs);await b.close()
asyncio.run(main());srv.shutdown()
