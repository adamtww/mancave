import asyncio, http.server, threading, functools, socketserver, random, json, urllib.request
from playwright.async_api import async_playwright
PORT=random.randint(20000,40000)
class S(socketserver.TCPServer): allow_reuse_address=True
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=S(("127.0.0.1",PORT),functools.partial(Q,directory="/home/claude/mancave"));threading.Thread(target=srv.serve_forever,daemon=True).start()
def livelist():
    def call(m,p,b=None,t=None):
        r=urllib.request.Request("http://localhost:8798"+p,method=m,data=json.dumps(b).encode() if b is not None else None,headers={"content-type":"application/json",**({"authorization":"Bearer "+t} if t else {})})
        with urllib.request.urlopen(r) as x: return json.loads(x.read())
    t=call("POST","/api/login",{"username":"adam","password":"testpass123"})["token"]
    return [(l["name"],l["updated_at"]) for l in call("GET","/api/layouts",t=t)["layouts"]]
async def main():
    before=livelist()
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--host-resolver-rules=MAP test.example.test 127.0.0.1"])
        pg=await b.new_page(viewport={"width":1500,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        writes=[];pg.on("request",lambda r: writes.append(r.method+" "+r.url) if "8798" in r.url and r.method!="GET" and r.method!="OPTIONS" else None)
        await pg.goto(f"http://test.example.test:{PORT}/index.html")
        await pg.evaluate("localStorage.clear();localStorage.setItem('cave-api','http://localhost:8799');localStorage.setItem('cave-live-api','http://localhost:8798')");await pg.reload();await pg.wait_for_timeout(800)
        await pg.fill("#li-u","adam");await pg.fill("#li-p","testpass123");await pg.click("#li-go");await pg.wait_for_timeout(1500)
        print("test signed in:",await pg.inner_text("#ly-name"),"live token:",await pg.evaluate("!!localStorage.getItem('cave-live-token')"))
        await pg.click("#ly-open");await pg.wait_for_timeout(400);await pg.click("#mdl-b [data-tab='live']");await pg.wait_for_timeout(800)
        print("live tab:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow')].map(e=>e.innerText.replace(/\\n/g,' | '))"))
        await pg.screenshot(path="/home/claude/build/livetab.png")
        await pg.click("#mdl-b .mrow [data-k='livecopy'] >> nth=0");await pg.wait_for_timeout(1200)
        print("opened:",await pg.inner_text("#ly-name"),await pg.evaluate("cave.get().items.map(i=>i.name)"))
        await pg.evaluate("(function(){var r=cave.room('Test edit',60,40,20,15);cave.update(r,{lk:true})})()");await pg.keyboard.press("Control+s");await pg.wait_for_timeout(800)
        await pg.click("#ly-open");await pg.wait_for_timeout(400);await pg.click("#mdl-b [data-tab='live']");await pg.wait_for_timeout(800);await pg.click("#mdl-b [data-k='liveall']");await pg.wait_for_timeout(2000)
        print("test mine:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow .mn')].map(e=>e.textContent)"))
        print("writes to live (should be only login):",writes,"errs:",errs)
        await b.close()
    after=livelist();print("live unchanged:",before==after,after)
asyncio.run(main());srv.shutdown()
