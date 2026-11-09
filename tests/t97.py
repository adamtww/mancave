import asyncio, http.server, threading, functools, socketserver, random, json, sys
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Kitchen","x":0,"y":0,"w":40,"d":40,"lk":True}],"name":"W"}
TOUCH=len(sys.argv)>1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032},has_touch=TOUCH,is_mobile=False)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(3000)
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(700)
        print("header:",await pg.inner_text("#lib .lt"),"| sections:",await pg.evaluate("document.querySelectorAll('#lib .lsec').length"),"cards:",await pg.evaluate("document.querySelectorAll('#lib .lcard').length"))
        await pg.click("#lib .lsh[data-c='Kitchen – Residential']");await pg.wait_for_timeout(300)
        print("cards after open:",await pg.evaluate("document.querySelectorAll('#lib .lcard').length"))
        await pg.screenshot(path="t93_panel.png",clip={"x":0,"y":120,"width":420,"height":700})
        card=await pg.evaluate("(()=>{var r=document.querySelector('#lib .lcard[data-r]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,document.querySelector('#lib .lcard').dataset.r]})()")
        tgt=await pg.evaluate("(()=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=20;p.y=20;p=p.matrixTransform(m);return [p.x,p.y]})()")
        cdp=await ctx.new_cdp_session(pg)
        async def T(type,x,y):
            await cdp.send("Input.dispatchTouchEvent",{"type":type,"touchPoints":[] if type=="touchEnd" else [{"x":x,"y":y,"id":1}]})
        x0,y0=card[0],card[1];x1,y1=tgt
        if TOUCH:
            await T("touchStart",x0,y0);await pg.wait_for_timeout(450)
            for k in range(1,6):await T("touchMove",x0+(x1-x0)*k/30,y0+(y1-y0)*k/30);await pg.wait_for_timeout(30)
        else:
            await pg.mouse.move(x0,y0);await pg.mouse.down()
            for k in range(1,6):await pg.mouse.move(x0+(x1-x0)*k/30,y0+(y1-y0)*k/30);await pg.wait_for_timeout(30)
        await pg.wait_for_timeout(200)
        await pg.screenshot(path="t93_overpanel.png",clip={"x":0,"y":120,"width":700,"height":600})
        print("over panel: chip visible:",await pg.evaluate("(()=>{var c=document.querySelector('.chip.cardchip');return !!c&&c.style.display!=='none'})()"))
        for k in range(6,31):
            if TOUCH: await T("touchMove",x0+(x1-x0)*k/30,y0+(y1-y0)*k/30)
            else: await pg.mouse.move(x0+(x1-x0)*k/30,y0+(y1-y0)*k/30)
            await pg.wait_for_timeout(20)
        await pg.wait_for_timeout(200)
        await pg.screenshot(path="t93_overcanvas.png",clip={"x":0,"y":120,"width":700,"height":600})
        print("ants:",[await pg.evaluate("(()=>{var r=document.querySelectorAll('#svg rect.landp + rect')[0];return r?r.strokeDashoffset&&0||getComputedStyle(r).strokeDashoffset:null})()") for _ in range(1)])
        vals=[]
        for _ in range(4):
            vals.append(await pg.evaluate("getComputedStyle(document.querySelector('#svg rect.landp + rect')).strokeDashoffset"));await pg.wait_for_timeout(130)
        print("dashoffset over time:",vals)
        print("over canvas: chip hidden:",await pg.evaluate("(()=>{var c=document.querySelector('.chip.cardchip');return !c||c.style.display==='none'})()"))
        if TOUCH: await T("touchEnd",0,0)
        else: await pg.mouse.up()
        await pg.wait_for_timeout(400)
        print("placed:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.kind!=='room').map(i=>[i.r,i.x,i.y])"),card[2])
        # tap card opens form
        if TOUCH:
            await T("touchStart",x0,y0);await pg.wait_for_timeout(80);await T("touchEnd",0,0)
        else: await pg.mouse.click(x0,y0)
        await pg.wait_for_timeout(300)
        print("tap -> form:",await pg.evaluate("!!document.querySelector('#lf-n')"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
