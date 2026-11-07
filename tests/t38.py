import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for vp,nm in [({"width":1500,"height":900},"pc"),({"width":1133,"height":744},"ipadL")]:
            pg=await b.new_page(viewport=vp);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
            await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var a=cave.room('Bar',10,10,25,20);cave.update(a,{lk:true,col:'#e8a87c'});var b=cave.room('Shop',45,12,30,25);cave.update(b,{lk:true})})()");await pg.wait_for_timeout(300)
            R=lambda: pg.evaluate("(()=>{var r=document.querySelector('#svg').getBoundingClientRect();return [r.left|0,r.top|0,r.width|0,r.height|0]})()")
            print(nm,"fit",await R())
            await pg.screenshot(path=f"/home/claude/build/fx_{nm}_0.png")
            r=await R();await pg.mouse.move(r[0]+r[2]*0.6,r[1]+r[3]*0.3)
            for _ in range(8): await pg.keyboard.down('Control');await pg.mouse.wheel(0,-200);await pg.keyboard.up('Control');await pg.wait_for_timeout(60)
            await pg.wait_for_timeout(300);print(" zoomed",await R())
            await pg.screenshot(path=f"/home/claude/build/fx_{nm}_1.png")
            # furn
            await pg.evaluate("cave.select(cave.find('Shop')[0].u)");await pg.wait_for_timeout(200);await pg.click("#rm-add");await pg.wait_for_timeout(600);print(" furn",await R())
            await pg.click("#fb-ok");await pg.wait_for_timeout(600);print(" back",await R(),errs);await pg.close()
        await b.close()
asyncio.run(main())
