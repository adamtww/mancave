import asyncio, http.server, threading, functools, socketserver, random, json
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
D={"lot":{"w":100,"d":100},"items":[],"defs":{}}
L={1:dict(id=1,name="Mine",owner_id=1,owner="adam",updated_at="2026-11-01T00:00:00Z",data=D),
   2:dict(id=2,name="Dad's layout with a long long name number one",owner_id=2,owner="dad",updated_at="2026-11-01T00:00:00Z",data=D)}
posts=[]
async def h(route):
    r=route.request;u=r.url.split(":9",1)[1];m=r.method
    if u=="/api/me": return await route.fulfill(json={"user":{"id":1,"username":"adam","role":"admin"}})
    if u.startswith("/api/layouts") and m=="GET":
        if u in("/api/layouts","/api/layouts/"): return await route.fulfill(json={"layouts":[{k:v for k,v in l.items() if k!="data"} for l in L.values()]})
        i=int(u.split("/")[3]);return await route.fulfill(json={"layout":L[i]})
    if u=="/api/layouts" and m=="POST":
        b=json.loads(r.post_data);posts.append(b);n=max(L)+1;L[n]=dict(id=n,name=b["name"],owner_id=1,owner="adam",updated_at="2026-11-08T00:00:00Z",data=b["data"]);return await route.fulfill(json={"layout":L[n]})
    await route.fulfill(json={})
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.route("http://127.0.0.1:9/**",h)
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.evaluate("()=>{localStorage.clear();localStorage.setItem('cave-token','x');localStorage.setItem('cave-api','http://127.0.0.1:9')}");await pg.reload();await pg.wait_for_timeout(2500)
        await pg.click("#ly-load");await pg.wait_for_timeout(600)
        print("mine btns:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow .mbtn')].map(b=>b.textContent)"))
        print("box w:",await pg.evaluate("document.querySelector('.mbox').getBoundingClientRect().width"))
        await pg.click("[data-tab=shared]");await pg.wait_for_timeout(300)
        print("other btns:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow .mbtn')].map(b=>b.textContent)"))
        await pg.screenshot(path="t111.png")
        await pg.click("#mdl-b [data-k=open]");await pg.wait_for_timeout(1200)
        print("posts:",[(x["name"],x.get("based_on")) for x in posts])
        print("modal open:",await pg.evaluate("!!document.querySelector('#mdl.show')"),"title:",await pg.evaluate("document.querySelector('#ly-name,.lyname')?.textContent"))
        print("errs",errs);await b.close()
asyncio.run(main())
