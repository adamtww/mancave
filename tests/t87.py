import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
two={"lot":{"w":100,"d":100},"items":[{"u":"a","kind":"room","name":"A","x":0,"y":0,"w":20,"d":20,"lk":True},{"u":"b","kind":"room","name":"B","x":20,"y":0,"w":20,"d":20,"lk":True}],"name":"W"}
one={"lot":{"w":100,"d":100},"items":[{"u":"a","kind":"room","name":"A","x":0,"y":10,"w":20,"d":20,"lk":True}],"name":"W"}
async def run(plan,steps):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def drag(a,c):
            await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
            for k in range(1,13):await pg.mouse.move(*(await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)));await pg.wait_for_timeout(10)
            await pg.mouse.up();await pg.wait_for_timeout(250)
        R="JSON.stringify(JSON.parse(localStorage.getItem('cave-build')).items.map(i=>[i.u,i.x,i.y,i.w,i.d,i.ex?1:0]))"
        for nm,fn in steps:
            await fn(pg,P,drag);print(" ",nm,await pg.evaluate(R))
        print(" errs",errs);await b.close()
async def main():
    async def selA(pg,P,drag):await pg.mouse.click(*(await P(8,8)));await pg.wait_for_timeout(250)
    print("two rooms:")
    await run(two,[("select A",selA),
      ("move A away (blocked)",lambda pg,P,drag:drag((8,8),(8,50))),
      ("move A down 5 (still touching)",lambda pg,P,drag:drag((8,8),(8,13))),
      ("shrink A east wall to 15 (detaches, blocked)",lambda pg,P,drag:drag((20,15),(14,15))),
      ("carve A east strip (blocked)",None)][:4])
    async def selA1(pg,P,drag):await pg.mouse.click(*(await P(8,20)));await pg.wait_for_timeout(250)
    print("one room:")
    await run(one,[("select",selA1),
      ("move off west edge (blocked)",lambda pg,P,drag:drag((8,20),(30,20))),
      ("move along edge down (ok)",lambda pg,P,drag:drag((8,20),(8,30))),
      ("west wall in (blocked)",lambda pg,P,drag:drag((0,30),(5,30))),
      ("east wall out (ok)",lambda pg,P,drag:drag((20,30),(25,30)))])
asyncio.run(main());srv.shutdown()
