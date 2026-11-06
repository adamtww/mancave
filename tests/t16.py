import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1400,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.batch(c=>{c.lot(80,50);c.room('Shop',5,5,30,20);c.room('Arcade',40,5,30,20)})");await pg.evaluate("cave.fit()")
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        n=lambda: pg.evaluate("cave.get().items.filter(i=>i.kind!='room').length")
        await pg.click("details.cat >> nth=8")  # Woodworking
        row=pg.locator(".pi",has_text="Cabinet table saw");bb=await row.bounding_box()
        async def dragTo(x,y):
            await pg.mouse.move(bb["x"]+40,bb["y"]+10);await pg.mouse.down();z=await P(x,y);await pg.mouse.move(*z,steps=8);await pg.mouse.up();await pg.wait_for_timeout(50)
        await dragTo(20,40);print("drop outside rooms ->",await n())
        await dragTo(33,23);print("drop near Shop corner ->",await n(),await pg.evaluate("(i=>[i.x,i.y,i.w,i.d])(cave.find('saw')[0])"))
        await pg.click("details.cat >> nth=7")  # Creator
        row=pg.locator(".pi",has_text="MetalFab 1200W");bb=await row.bounding_box();await dragTo(15,10)
        await pg.evaluate("cave.select(cave.find('Shop')[0].u)")
        print('Shop power:',await pg.evaluate("document.querySelector('#insp .pw').textContent"))
        # drag saw toward Arcade, then to empty floor
        s=await pg.evaluate("(i=>[i.x+i.w/2,i.y+i.d/2])(cave.find('saw')[0])");a=await P(*s);z=await P(55,15)
        await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=8);await pg.mouse.up()
        print("saw moved into Arcade:",await pg.evaluate("(i=>[i.x,i.y])(cave.find('saw')[0])"))
        s=await pg.evaluate("(i=>[i.x+i.w/2,i.y+i.d/2])(cave.find('saw')[0])");a=await P(*s);z=await P(55,45)
        await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=8);await pg.mouse.up()
        print("saw dragged to empty floor stays in Arcade:",await pg.evaluate("(i=>[i.x,i.y,i.y+i.d])(cave.find('saw')[0])"))
        # shrink Arcade from bottom past saw
        await pg.evaluate("cave.select(cave.find('Arcade')[0].u)")
        h=await pg.evaluate("(()=>{var r=document.querySelector('.hd[data-h=\"s\"]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        z=await P(55,6);await pg.mouse.move(*h);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up()
        print("Arcade after shrink:",await pg.evaluate("(r=>[r.y,r.d])(cave.find('Arcade')[0])"))
        await pg.evaluate("cave.remove(cave.find('Arcade')[0].u)")
        print("after deleting Arcade objects:",await n(),errs)
        await b.close()
asyncio.run(main())
