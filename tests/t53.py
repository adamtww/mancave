import asyncio, http.server, threading, functools, socketserver, random
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True);pg=await ctx.new_page()
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9')");await pg.reload();await pg.wait_for_timeout(4500)
        for m in ["rooms","objects","summary","rooms"]:
            await pg.click(f"#rotog [data-m={m}]");await pg.wait_for_timeout(350)
            print(m,await pg.evaluate("(()=>{var a=document.querySelector('.mlbl span').getBoundingClientRect(),t=document.querySelector('#rotog').getBoundingClientRect();return [a.left,t.left,t.width].map(x=>Math.round(x*10)/10)})()"))
            await pg.screenshot(path=f"/home/claude/build/mode_{m}.png",clip=await pg.evaluate("(()=>{var r=document.querySelector('#undobar').getBoundingClientRect();return {x:r.left-10,y:r.top-8,width:r.width+20,height:r.height+16}})()"))
        await b.close()
asyncio.run(main());srv.shutdown()
