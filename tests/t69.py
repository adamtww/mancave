import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
plan={"lot":{"w":100,"d":100},"items":[{"u":"r1","kind":"room","name":"Arcade","x":0,"y":0,"w":30,"d":30,"lk":True}],"name":"W"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1376,"height":1032});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("p=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9');localStorage.setItem('cave-build',p)}",json.dumps(plan));await pg.reload();await pg.wait_for_timeout(1200)
        async def P(x,y):return await pg.evaluate("([x,y])=>{var m=document.querySelector('#svg').getScreenCTM(),p=document.querySelector('#svg').createSVGPoint();p.x=x;p.y=y;p=p.matrixTransform(m);return [p.x,p.y]}",[x,y])
        R="(()=>JSON.parse(localStorage.getItem('cave-build')).items.map(i=>[i.name,i.col||'']))()"
        await pg.mouse.click(*(await P(15,15)));await pg.wait_for_timeout(300)
        await pg.click('#rp-nm');await pg.keyboard.press('Control+a');await pg.keyboard.press('Backspace');await pg.keyboard.type('Game Room');await pg.keyboard.press('Enter');await pg.wait_for_timeout(300)
        print("rename:",await pg.evaluate(R),"label:",await pg.evaluate("Array.from(document.querySelectorAll('#svg text')).some(t=>t.textContent.includes('Game'))"))
        await pg.evaluate("(()=>{var c=document.querySelector('#rp-ci');c.dispatchEvent(new MouseEvent('click'));c.value='#5b8bd9';c.dispatchEvent(new Event('input'));c.value='#4a7bd0';c.dispatchEvent(new Event('input'));c.dispatchEvent(new Event('change'))})()");await pg.wait_for_timeout(300);print("color:",await pg.evaluate(R),"dot:",await pg.evaluate("document.querySelector('#rp-b .rpdot').style.background"))
        await pg.keyboard.press('Control+z');await pg.wait_for_timeout(200);print("undo:",await pg.evaluate(R))
        await pg.screenshot(path="rp_fields.png",clip={"x":0,"y":60,"width":360,"height":420})
        print(errs);await b.close()
asyncio.run(main());srv.shutdown()
