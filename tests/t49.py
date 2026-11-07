import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":10,"y":10,"w":40,"d":40,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--host-resolver-rules=MAP test.example.test 127.0.0.1"])
        for host in ["test.example.test","127.0.0.1"]:
          for vp in [{"width":1133,"height":744},{"width":744,"height":1133}]:
            ctx=await b.new_context(viewport=vp,has_touch=True,is_mobile=True,device_scale_factor=2,user_agent="Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
            pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://{host}:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1500)
            r=await pg.evaluate("""(()=>{var s=document.querySelector('#svg').getBoundingClientRect(),bad={};for(var i=1;i<10;i++)for(var j=1;j<10;j++){var x=s.left+s.width*i/10,y=s.top+s.height*j/10,e=document.elementFromPoint(x,y);if(!e||!e.closest('#svg')){var k=e?(e.id||e.className&&e.className.baseVal!==undefined?e.tagName:e.className)||e.tagName:'null';k=e?e.tagName+'#'+e.id+'.'+(typeof e.className=='string'?e.className:''):'null';bad[k]=(bad[k]||0)+1}}return {svg:[s.left,s.top,s.width,s.height].map(Math.round),bad:bad,body:document.body.className}})()""")
            # tap on the room
            box=await pg.evaluate("(()=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=30;p.y=30;p=p.matrixTransform(m);return [p.x,p.y]})()")
            await pg.touchscreen.tap(box[0],box[1]);await pg.wait_for_timeout(500)
            sel=await pg.evaluate("document.querySelector('#rmenu').className")
            print(host,vp["width"],r,"rmenu:",sel,errs[:2])
            await pg.screenshot(path=f"/home/claude/build/touch_{host[:4]}_{vp['width']}.png");await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
