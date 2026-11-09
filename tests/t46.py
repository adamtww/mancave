import asyncio, http.server, threading, functools, socketserver, random
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--host-resolver-rules=MAP test.example.test 127.0.0.1, MAP live.example.test 127.0.0.1"])
        for host in ["test.example.test","live.example.test"]:
            pg=await b.new_page(viewport={"width":1500,"height":900});reqs=[];errs=[]
            pg.on("pageerror",lambda e:errs.append(str(e)))
            pg.on("request",lambda r: reqs.append(r.url.split('/api')[0]) if "workers.dev" in r.url else None)
            await pg.evaluate("1");await pg.goto(f"http://{host}:{PORT}/index.html")
            await pg.evaluate("localStorage.setItem('cave-token','x')");await pg.reload();await pg.wait_for_timeout(1500)
            print(host,"title:",await pg.title(),"histH:",await pg.evaluate("document.querySelector('#hist').getBoundingClientRect().height"),"mark:",await pg.evaluate("(e=>e?e.textContent:null)(document.querySelector('.testmark'))"),"appH:",await pg.evaluate("document.querySelector('.app').getBoundingClientRect().bottom"),"testsite:",await pg.evaluate("document.body.classList.contains('testsite')"),"api calls:",sorted(set(reqs)),"errs:",errs)
            if host.startswith("test"): await pg.screenshot(path="/home/claude/build/testsite.png",clip={"x":0,"y":0,"width":1500,"height":900})
            await pg.close()
        await b.close()
asyncio.run(main());srv.shutdown()
