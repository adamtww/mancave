import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        pv="(()=>{var r=document.querySelector('#svg .empv .ebody');if(!r)return null;var b=r.getBBox();return [b.x,b.y,b.width,b.height].map(v=>Math.round(v*2)/2).join(',')+' '+(document.querySelector('#em-room').classList.contains('dis')?'BLOCKED':'ok')})()"
        R="JSON.stringify(JSON.parse(localStorage.getItem('cave-build')).items.map(i=>[i.name,i.x,i.y,i.w,i.d]))"
        async def tap(x,y):await pg.mouse.click(*(await P(x,y)));await pg.wait_for_timeout(250)
        await tap(50,50);print("empty lot, center:",await pg.evaluate(pv))
        await pg.click('#em-room',force=True);await pg.wait_for_timeout(200);print("  add tapped ->",await pg.evaluate(R))
        await tap(95,95);await tap(12,40);print("empty lot near west edge:",await pg.evaluate(pv))
        await pg.click('#em-room');await pg.wait_for_timeout(300);print("  added ->",await pg.evaluate(R))
        await tap(95,95);await tap(70,70);print("far from room:",await pg.evaluate(pv))
        await tap(95,95);await tap(22,30);print("near room:",await pg.evaluate(pv))
        await pg.click('#em-room');await pg.wait_for_timeout(300);print("  added ->",await pg.evaluate(R),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
