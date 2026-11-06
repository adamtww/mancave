import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1400,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.batch(c=>{c.lot(40,30);c.room('Narrow',1,1,5,12);c.room('Tiny',10,1,4,4);c.room('Wide',20,1,15,10);c.add('g-pool',24,3)});cave.fit()")
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        await pg.click("details.cat >> nth=4");row=pg.locator(".pi",has_text="3-compartment");bb=await row.bounding_box()
        async def dragTo(x,y):
            await pg.mouse.move(bb["x"]+40,bb["y"]+10);await pg.mouse.down();z=await P(x,y);await pg.mouse.move(*z,steps=8);await pg.mouse.up();await pg.wait_for_timeout(50)
        await dragTo(3,6);print("narrow room:",await pg.evaluate("cave.find('3-comp').map(i=>[i.x,i.y,i.w,i.d,i.rot])"))
        await dragTo(12,3);print("tiny room count:",await pg.evaluate("cave.find('3-comp').length"),"flash:",await pg.evaluate("(document.querySelector('.flash')||{}).textContent"))
        await dragTo(26,7);print("wide room over pool:",await pg.evaluate("cave.find('3-comp').map(i=>[i.x,i.y,i.w,i.d,i.rot])"))
        print(errs)
        await b.close()
asyncio.run(main())
