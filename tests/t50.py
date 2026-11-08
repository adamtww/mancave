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
        for t in [False,True]:
            ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=t);pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9')");await pg.reload();await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f"/home/claude/build/tog_{t}_a.png",clip={"x":300,"y":60,"width":833,"height":200})
            await pg.click("#rotog [data-m=all]");await pg.wait_for_timeout(4500)
            await pg.screenshot(path=f"/home/claude/build/tog_{t}_b.png",clip={"x":300,"y":60,"width":833,"height":200})
            print(t,await pg.evaluate("document.querySelector('#rotog').className"),errs);await ctx.close()
        await b.close()
asyncio.run(main());srv.shutdown()
