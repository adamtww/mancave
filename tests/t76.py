import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":20,"y":20,"w":20,"d":20,"lk":True},{"u":"r2","kind":"room","name":"Shop","x":60,"y":20,"w":20,"d":20,"lk":True},{"u":"o1","r":"g-cab","name":"Cab","x":21,"y":21,"w":3,"d":3}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for touch in [False,True]:
            ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=touch);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
            cdp=await ctx.new_cdp_session(pg)
            async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
            async def drag(a,c,shot=None):
                async def T(t,x=0,y=0): await cdp.send("Input.dispatchTouchEvent",{"type":t,"touchPoints":[] if t=="touchEnd" else [{"x":x,"y":y}]})
                if touch: await T("touchStart",*(await P(*a)))
                else: await pg.mouse.move(*(await P(*a)));await pg.mouse.down()
                for k in range(1,13):
                    q=await P(a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12)
                    if touch: await T("touchMove",*q)
                    else: await pg.mouse.move(*q)
                    await pg.wait_for_timeout(10)
                if shot: await pg.screenshot(path=shot)
                if touch: await T("touchEnd")
                else: await pg.mouse.up()
                await pg.wait_for_timeout(250)
            A="(()=>{var it=JSON.parse(localStorage.getItem('cave-build')).items;var r=it.find(i=>i.u==='r1');var o=it.find(i=>i.u==='o1');return [r.w*r.d+(r.ex||[]).reduce((s,e)=>s+e.w*e.d,0),r.x,r.y,r.w,r.d,JSON.stringify(r.ex||null),[o.x,o.y]]})()"
            if touch: await pg.touchscreen.tap(*(await P(25,30)))
            else: await pg.mouse.click(*(await P(25,30)))
            await pg.wait_for_timeout(300);await pg.click('#rp-xs');await pg.wait_for_timeout(200)
            nh=await pg.evaluate("document.querySelectorAll('#svg .shd').length")
            print("handles:",nh,"start:",await pg.evaluate(A))
            await drag((40,30),(46,30));print(" east wall +6:",await pg.evaluate(A))
            await drag((46,30),(70,30));print(" east wall into Shop (stop 60):",await pg.evaluate(A))
            await drag((60,40),(50,48));print(" SE corner -> (50,48):",await pg.evaluate(A))
            # make an L: drag corner (50,48) up-left to (40,30)?? instead drag bottom wall partially: use Reduce-free path: corner NE (50,20) to (50,30)
            await drag((50,20),(50,30),shot=f"shape_{touch}.png");print(" NE corner down 10:",await pg.evaluate(A))
            await drag((20,34),(26,34));print(" west wall in 6 (pushes cab):",await pg.evaluate(A))
            await pg.keyboard.press("Control+z");await pg.wait_for_timeout(200);print(" undo:",await pg.evaluate(A))
            print(" pane:",(await pg.inner_text('#rp-b')).split('\n')[0],errs)
            await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
