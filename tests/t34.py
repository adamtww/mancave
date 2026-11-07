import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for vp,nm in [({"width":1500,"height":900},"pc"),({"width":744,"height":1133},"ipad"),({"width":1133,"height":744},"ipadL")]:
            pg=await b.new_page(viewport=vp);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
            await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var a=cave.room('Room 1',10,5,37,42);cave.update(a,{lk:true,col:'#9cc49a'});cave.select(a)})()");await pg.wait_for_timeout(300)
            await pg.click("#rm-add");await pg.wait_for_timeout(600)
            await pg.screenshot(path=f"/home/claude/build/fp_{nm}.png")
            await pg.click("#fb-ok");await pg.wait_for_timeout(500)
            print(nm,await pg.evaluate("[getComputedStyle(document.querySelector('#fpanel')).display,getComputedStyle(document.querySelector('#drawer')).display]"),errs)
            await pg.close()
        await b.close()
asyncio.run(main())
