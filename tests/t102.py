import asyncio, http.server, threading, functools, socketserver, random, json, sys
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Room 1","x":0,"y":0,"w":100,"d":100,"lk":True},
 {"u":"mid","r":"f-free","name":"Free weights","x":40,"y":40,"w":8,"d":8},{"u":"top","r":"g-cab","name":"Cab","x":50,"y":0,"w":3,"d":3},
 {"u":"tl","r":"g-cab","name":"Cab","x":0,"y":0,"w":3,"d":3},{"u":"br","r":"g-cab","name":"Cab","x":97,"y":97,"w":3,"d":3}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(3000)
        await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(500)
        for u,cx,cy in [("mid",44,44),("top",51.5,1.5),("tl",1.5,1.5),("br",98.5,98.5)]:
            x,y=await pg.evaluate("([x,y])=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[cx,cy])
            await pg.mouse.click(x,y);await pg.wait_for_timeout(400)
            r=await pg.evaluate("(()=>{var o=document.querySelector('#svg').getBoundingClientRect(),a=document.querySelector('#im-rot').getBoundingClientRect(),d=document.querySelector('#im-del').getBoundingClientRect();return {rot:[Math.round(a.left+17),Math.round(a.top+17)],del:[Math.round(d.left+17),Math.round(d.top+17)],ants:document.querySelectorAll('#svg rect animate').length,canvas:[Math.round(o.left),Math.round(o.top),Math.round(o.right),Math.round(o.bottom)]}})()")
            print(u,"obj@",[round(x),round(y)],r)
            await pg.screenshot(path=f"om_{u}.png",clip={"x":max(0,x-120),"y":max(0,y-120),"width":240,"height":240})
            # click empty to deselect
        # rotate via button
        x,y=await pg.evaluate("([x,y])=>{var s=document.querySelector('#svg'),m=s.getScreenCTM(),p=s.createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[44,44])
        await pg.mouse.click(x,y);await pg.wait_for_timeout(300);await pg.click("#im-rot");await pg.wait_for_timeout(300)
        print("rot after click:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='mid').map(i=>i.rot)"))
        await pg.click("#im-del");await pg.wait_for_timeout(300)
        print("deleted:",await pg.evaluate("JSON.parse(localStorage.getItem('cave-build')).items.filter(i=>i.u==='mid').length"),errs)
        await b.close()
asyncio.run(main());srv.shutdown()
