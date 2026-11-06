import asyncio
from playwright.async_api import async_playwright
VB="document.querySelector('#svg').getAttribute('viewBox').split(' ').map(n=>+(+n).toFixed(1))"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(500)
        print("fit:",await pg.evaluate(VB))
        await pg.mouse.move(1000,500)
        for _ in range(5): await pg.mouse.wheel(0,200)
        await pg.wait_for_timeout(200);print("after zoom-out attempt:",await pg.evaluate(VB))
        # drag left/up a lot at fit
        await pg.mouse.move(1000,600);await pg.mouse.down();await pg.mouse.move(1400,800,steps=8);await pg.mouse.up();await pg.wait_for_timeout(200)
        print("drag at fit (should not move):",await pg.evaluate(VB))
        for _ in range(6): await pg.mouse.wheel(0,-150)
        await pg.wait_for_timeout(200)
        await pg.mouse.move(800,500);await pg.mouse.down();await pg.mouse.move(1490,890,steps=10);await pg.mouse.up();await pg.wait_for_timeout(200)
        print("zoomed, dragged to top-left:",await pg.evaluate(VB))
        await pg.mouse.move(1400,800);await pg.mouse.down();await pg.mouse.move(300,100,steps=12);await pg.mouse.up();await pg.wait_for_timeout(200)
        await pg.mouse.move(1400,800);await pg.mouse.down();await pg.mouse.move(300,100,steps=12);await pg.mouse.up();await pg.wait_for_timeout(200)
        v=await pg.evaluate(VB);print("dragged to bottom-right:",v,"right edge",round(v[0]+v[2],1),"bottom",round(v[1]+v[3],1),errs)
        await b.close()
asyncio.run(main())
