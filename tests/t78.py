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
        pg=await b.new_page(viewport={"width":1133,"height":744});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9')");await pg.reload();await pg.wait_for_timeout(1000)
        r=await pg.evaluate("""(()=>{var t=document.querySelector('#svg text');var a=getComputedStyle(t).userSelect||getComputedStyle(t).webkitUserSelect;
          var sel=window.getSelection();sel.removeAllRanges();var ev=new Event('selectstart',{bubbles:true,cancelable:true});t.dispatchEvent(ev);
          return [a,ev.defaultPrevented]})()""")
        await pg.mouse.click(400,400);await pg.wait_for_timeout(200)
        print("svg text user-select / selectstart blocked:",r,errs)
        await b.close()
asyncio.run(main());srv.shutdown()
