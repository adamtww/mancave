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
        ctx=await b.new_context(viewport={"width":1376,"height":1032});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def path(pts,lift=True,jit=0.3):
            x,y=await P(*pts[0]);await pg.mouse.move(x,y);await pg.mouse.down()
            for a,c in zip(pts,pts[1:]):
                for k in range(1,13):
                    fx=a[0]+(c[0]-a[0])*k/12+(jit if k%2 else -jit)*(1 if a[1]==c[1] else 0)*0; fy=a[1]+(c[1]-a[1])*k/12
                    # wobble perpendicular
                    if a[1]==c[1]: fy+= (0.3 if k%2 else -0.3)
                    else: fx+= (0.3 if k%2 else -0.3)
                    await pg.mouse.move(*(await P(fx,fy)));await pg.wait_for_timeout(8)
            if lift: await pg.mouse.up()
            await pg.wait_for_timeout(250)
        R="(()=>{var r=JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='r1');return JSON.stringify([r.x,r.y,r.w,r.d,r.ex||null])})()"
        await pg.mouse.click(*(await P(20,15)));await pg.wait_for_timeout(300)
        print("pane:",(await pg.inner_text('#rp-b')).replace('\n',' | '))
        await pg.click('#rp-xp');await pg.wait_for_timeout(200)
        # lift early
        await path([(10,30),(10,40),(25,40)]);print("lift early:",await pg.evaluate(R),"xp still on:",await pg.evaluate("document.body.classList.contains('xpon')"))
        # proper loop below
        await path([(10,30),(10,40),(25,40),(25,30)],lift=False);r1=await pg.evaluate(R);await pg.mouse.up();await pg.wait_for_timeout(200)
        print("loop:",r1,"| xpon:",await pg.evaluate("document.body.classList.contains('xpon')"),"| pane:",(await pg.inner_text('#rp-b')).replace('\n',' | '))
        await pg.screenshot(path="xp1.png")
        # into shop: from east wall y=5, right to 70 (blocked at 60), down to 20, back left to 40
        await pg.click('#rp-xp');await pg.wait_for_timeout(200)
        await path([(40,5),(70,5),(70,20),(40,20)],lift=False);r2=await pg.evaluate(R);await pg.mouse.up();await pg.wait_for_timeout(200)
        print("blocked by shop then loop:",r2)
        info=await pg.inner_text('#info-b');print("info:",info.split('\n')[:2])
        # move the room: drag inside
        await pg.mouse.move(*(await P(20,15)));await pg.mouse.down()
        for k in range(1,11):await pg.mouse.move(*(await P(20,15+3*k)));await pg.wait_for_timeout(15)
        await pg.mouse.up();await pg.wait_for_timeout(300)
        print("moved:",await pg.evaluate(R),await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.find(i=>i.u==='o1').y"))
        await pg.screenshot(path="xp2.png")
        await pg.keyboard.press("Control+z");await pg.keyboard.press("Control+z");await pg.wait_for_timeout(300);print("undo x2:",await pg.evaluate(R))
        print(errs)
        await b.close()
asyncio.run(main());srv.shutdown()
