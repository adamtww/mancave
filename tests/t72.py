import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1133,"height":744});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9')");await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        await pg.mouse.click(*(await P(50,50)));await pg.wait_for_timeout(60)
        first=await pg.evaluate("document.querySelector('#svg .empv').className.baseVal")
        await pg.wait_for_timeout(300)
        await pg.mouse.move(*(await P(55,55)));await pg.mouse.down();ops=[]
        for k in range(1,10):
            await pg.mouse.move(*(await P(55+k,55+k)));ops.append(await pg.evaluate("getComputedStyle(document.querySelector('#svg .empv')).opacity+'/'+document.querySelector('#svg .empv').className.baseVal"))
        await pg.mouse.up()
        print("first:",first,"| during drag:",set(ops),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
