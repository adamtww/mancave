import asyncio, http.server, threading, functools, socketserver, random, json, sys
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Kitchen","x":0,"y":0,"w":40,"d":30,"lk":True},
 {"u":"c1","r":"kr-counter","name":"Counter + sink run","x":5,"y":5,"w":10,"d":2,"rot":0},
 {"u":"f1","r":"kr-fridge","name":"Fridge","x":24,"y":5,"w":3,"d":3,"rot":0}],"name":"W"}
TOUCH=len(sys.argv)>1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=TOUCH,device_scale_factor=2)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(2500)
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(400)
        async def W(x,y): return await pg.evaluate("([x,y])=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        async def H(k): return await pg.evaluate("k=>{var e=document.querySelector('#svg .bh[data-k='+k+'] circle');if(!e)return null;var r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}",k)
        cdp=await ctx.new_cdp_session(pg)
        async def drag(a,bb):
            if TOUCH:
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":a[0],"y":a[1],"id":1}]})
                for k in range(1,13):await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":a[0]+(bb[0]-a[0])*k/12,"y":a[1]+(bb[1]-a[1])*k/12,"id":1}]});await pg.wait_for_timeout(15)
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
            else:
                await pg.mouse.move(*a);await pg.mouse.down()
                for k in range(1,13):await pg.mouse.move(a[0]+(bb[0]-a[0])*k/12,a[1]+(bb[1]-a[1])*k/12);await pg.wait_for_timeout(15)
                await pg.mouse.up()
            await pg.wait_for_timeout(300)
        async def tap(x,y):
            if TOUCH:
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y,"id":1}]});await pg.wait_for_timeout(50);await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
            else: await pg.mouse.click(x,y)
            await pg.wait_for_timeout(300)
        C="JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='c1').map(i=>[i.x,i.y,i.w,i.d,JSON.stringify(i.bi||null)])[0]"
        x,y=await W(10,6);await tap(x,y)
        print("handles:",await pg.evaluate("[...document.querySelectorAll('#svg .bh')].map(e=>e.dataset.k).join(',')"))
        h=await H("e1");t=await W(30,6);await drag(h,t)
        print("stretch right (fridge at x=24):",await pg.evaluate(C))
        h=await H("cb");t=await W(23,20);await drag(h,(h[0],t[1]))
        print("add corner leg:",await pg.evaluate(C))
        print("details:",(await pg.inner_text("#info-b")).replace("\n"," | ")[:200])
        h=await H("dp");t=await W(10,8.2);await drag(h,(h[0],t[1]))
        print("depth:",await pg.evaluate(C))
        await pg.screenshot(path="t108.png",clip={"x":(await W(0,0))[0],"y":(await W(0,0))[1]-10,"width":420,"height":340})
        await pg.click("#vtog");await pg.wait_for_timeout(300)
        x,y=await W(30,30);await tap(x,y)
        await pg.screenshot(path="t108art.png",clip={"x":(await W(0,0))[0],"y":(await W(0,0))[1]-10,"width":420,"height":340})
        x,y=await W(10,6);await tap(x,y)
        print("sel after tap:",await pg.evaluate("document.querySelectorAll('#svg .bh').length"), await pg.evaluate("(()=>{var a=document.elementFromPoint(%f,%f);return a&&(a.tagName+' '+(a.closest('.o')||{dataset:{}}).dataset.u)})()"%tuple(await W(10,6.5))))
        a=await W(10,6.5);b2=await W(35,28);await drag(a,b2)
        print("moved L:",await pg.evaluate(C))
        p0=(await pg.evaluate(C));x,y=await W(p0[0]+2,p0[1]+1);await tap(x,y)
        await pg.click("#im-rot");await pg.wait_for_timeout(300)
        print("rotate:",await pg.evaluate(C))
        await pg.keyboard.press("Control+z");await pg.wait_for_timeout(300)
        print("undo rotate:",await pg.evaluate(C),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
