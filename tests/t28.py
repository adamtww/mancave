import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for Z in [0,3]:
         for vp,nm in [({"width":1500,"height":900},"pc"),({"width":744,"height":1133},"ipad")]:
             pg=await b.new_page(viewport=vp,device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
             await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
             for sz,i in [((45,20,12,8),"s"),((45,35,8,5),"xs"),((30,10,25,18),"l")]:
                 await pg.evaluate("localStorage.clear()")
                 await pg.evaluate(f"(function(){{cave.load({{lot:{{w:100,d:60}},items:[]}});var u=cave.room('test',{sz[0]},{sz[1]},{sz[2]},{sz[3]});cave.update(u,{{lk:true}});cave.select(u);cave.fit()}})()");[await pg.click("#zi") for _ in range(Z)];await pg.wait_for_timeout(250)
                 await pg.click("#rm-edit");await pg.wait_for_timeout(250)
                 await pg.screenshot(path=f"/home/claude/build/h_{nm}_{i}{Z}.png")
             print(nm,errs);await pg.close()
        await b.close()
asyncio.run(main())
