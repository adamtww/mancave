import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Room 1","x":30,"y":0,"w":50,"d":30,"lk":True},
 {"u":"a","r":"l-bar","name":"Bar counter + back bar","x":30,"y":0,"w":15,"d":8},{"u":"b","r":"g-sim","name":"Racing sim rig (triple screens)","x":50,"y":0,"w":6,"d":6},
 {"u":"c","r":"g-cab","name":"Arcade video cabinet","x":45,"y":0,"w":3,"d":3},{"u":"d","r":"kr-fridge","name":"Refrigerator (home)","x":64,"y":0,"w":3,"d":3},{"u":"e","r":"g-pool","name":"Pool table (8 ft)","x":60,"y":12,"w":4.5,"d":8.5}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for (w,h) in [(1133,744),(1180,820),(1376,1032),(1707,960),(1920,1080)]:
            ctx=await b.new_context(viewport={"width":w,"height":h},device_scale_factor=2,has_touch=True)
            pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(2500)
            await pg.click("#rotog [data-m=objects]");await pg.wait_for_timeout(500)
            g=await pg.evaluate("(()=>{var v=document.querySelector('#vtog').getBoundingClientRect(),i=document.querySelector('#info').getBoundingClientRect(),r=document.querySelector('#rotog').getBoundingClientRect(),s=document.querySelector('#svg').getBoundingClientRect(),u=document.querySelector('#redo').getBoundingClientRect();return {svg:[Math.round(s.left),Math.round(s.right)],modeMid:Math.round((r.left+r.right)/2),svgMid:Math.round((s.left+s.right)/2),vtR:Math.round(v.right),info:Math.round(i.left),redoR:Math.round(u.right),modeL:Math.round(r.left)}})()")
            print(w,g)
            await pg.screenshot(path=f"vt_{w}_off.png")
            await pg.click("#vtog [data-a=off]");await pg.wait_for_timeout(300);a1=await pg.evaluate("document.querySelectorAll('#svg g.ob g[transform]').length");await pg.click("#vtog [data-a=off]");await pg.wait_for_timeout(300);print(" after 1 tap on box btn:",a1)
            await pg.screenshot(path=f"vt_{w}_on.png")
            print(" after 2nd tap:",await pg.evaluate("document.querySelectorAll('#svg g.ob g[transform]').length"),errs)
            await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
