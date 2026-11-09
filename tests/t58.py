import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":40,"d":30,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":60,"y":0,"w":30,"d":30,"lk":True},{"u":"o1","r":"g-cab","name":"Cab","x":5,"y":5,"w":3,"d":3}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c):
            hx,hy=await P(*a);tx,ty=await P(*c);await pg.mouse.move(hx,hy);await pg.mouse.down()
            for k in range(1,11):await pg.mouse.move(hx+(tx-hx)*k/10,hy+(ty-hy)*k/10);await pg.wait_for_timeout(20)
            await pg.mouse.up();await pg.wait_for_timeout(300)
        get="(()=>{var d=JSON.parse(localStorage.getItem('cave-build')).items;return d.filter(i=>i.u!='r2').map(i=>[i.u,i.x,i.y])})()"
        cam0=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")
        await drag((20,20),(20,40));a=await pg.evaluate(get);cam1=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")
        await pg.mouse.click(*(await P(20,20)));await pg.wait_for_timeout(300)
        await drag((20,20),(30,45));b2=await pg.evaluate(get)
        await drag((20,40),(45,40));c=await pg.evaluate(get)
        await pg.keyboard.press("Control+z");await pg.wait_for_timeout(300);d=await pg.evaluate(get)
        print("unselected drag ->",a,"panned:",cam0!=cam1);print("selected drag ->",b2);print("into neighbour ->",c);print("undo ->",d,errs)
        await b.close()
asyncio.run(main());srv.shutdown()
