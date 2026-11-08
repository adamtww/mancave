import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":40,"lk":True},{"u":"t1","r":"g-cab","name":"Cab","x":10,"y":10,"w":3,"d":3}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(3500)
        async def at(x,y):
            return await pg.evaluate("([x,y])=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        selr="!!document.querySelector('#svg .ants, #svg .shd')"
        x,y=await at(30,30);await pg.mouse.click(x,y);await pg.wait_for_timeout(300)
        print("rooms: room selected:",await pg.evaluate(selr))
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(500)
        print("objects: room still selected:",await pg.evaluate(selr))
        op=await pg.evaluate("getComputedStyle(document.querySelector('#svg g.o[data-u=r1]')).opacity");print("room opacity",op)
        await pg.mouse.click(x,y);await pg.wait_for_timeout(300)
        print("tap room -> selected:",await pg.evaluate(selr),"| emenu shown:",await pg.evaluate("document.querySelector('#emenu').classList.contains('show')"))
        ox,oy=await at(11.5,11.5);await pg.mouse.click(ox,oy);await pg.wait_for_timeout(300)
        hs=await pg.evaluate("[document.querySelector('#rmenu').className, document.querySelector('#cmenu')&&document.querySelector('#cmenu').className]");print("tap object -> handles:",hs)
        await pg.screenshot(path="t92.png",clip={"x":ox-150,"y":oy-150,"width":300,"height":300})
        await pg.mouse.move(ox,oy);await pg.mouse.down();await pg.mouse.move(ox+60,oy+40,steps=5);await pg.mouse.up();await pg.wait_for_timeout(300)
        print("object moved:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='t1').map(i=>[i.x,i.y])"))
        ex,ey=await at(70,70);await pg.mouse.click(ex,ey);await pg.wait_for_timeout(400)
        print("objects: tap empty -> emenu:",await pg.evaluate("document.querySelector('#emenu').classList.contains('show')"))
        await pg.click("#rotog [data-m=rooms]");await pg.wait_for_timeout(500)
        await pg.mouse.click(ex,ey);await pg.wait_for_timeout(400);print("rooms: tap empty -> emenu:",await pg.evaluate("document.querySelector('#emenu').classList.contains('show')"))
        print("back to rooms: menus:",await pg.evaluate("[document.querySelector('#rmenu').className, document.querySelector('#cmenu')&&document.querySelector('#cmenu').className]"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
