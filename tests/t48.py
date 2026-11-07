import asyncio, http.server, threading, functools, socketserver, random
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--host-resolver-rules=MAP test.example.test 127.0.0.1"])
        for vp,nm in [({"width":1133,"height":744},"ipadmini"),({"width":1500,"height":900},"pc")]:
            pg=await b.new_page(viewport=vp)
            await pg.goto(f"http://test.example.test:{PORT}/index.html");await pg.evaluate("localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9')");await pg.reload();await pg.wait_for_timeout(1200)
            # simulate signed-in state with long name + unsaved
            await pg.evaluate("document.querySelector('#ly-name').textContent='Arcade (from live · dad)';var st=document.querySelector('#ly-st');st.className='lyst dirty';st.textContent='Unsaved changes';document.querySelector('#u-name').textContent='adam'")
            ov=await pg.evaluate("(()=>{var a=document.querySelector('.testmark').getBoundingClientRect(),c=document.querySelector('#cloud').getBoundingClientRect(),t=document.querySelector('.testmark');return {markRight:Math.round(a.right),cloudLeft:Math.round(c.left),textFits:t.scrollWidth<=t.clientWidth+1,histH:document.querySelector('#hist').getBoundingClientRect().height}})()")
            print(nm,ov);await pg.screenshot(path=f"/home/claude/build/mark_{nm}.png",clip={"x":0,"y":0,"width":vp["width"],"height":80});await pg.close()
        await b.close()
asyncio.run(main());srv.shutdown()
