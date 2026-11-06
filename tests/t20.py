import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        M=lambda: pg.evaluate("document.querySelector('#emenu').className")
        await pg.evaluate("cave.room('Kitchen',5,5,20,15)");await pg.evaluate("cave.select(null)")
        await pg.mouse.click(*(await P(50,50)));print("empty click:",await M())
        await pg.screenshot(path="/home/claude/build/emenu.png",clip={"x":300,"y":50,"width":1000,"height":700})
        await pg.click("#em-room");await pg.wait_for_timeout(100)
        print("rooms:",await pg.evaluate("cave.get().items.filter(i=>i.kind=='room').map(i=>[i.name,i.x,i.y,i.w,i.d,!!i.lk])"),"menu:",await M())
        await pg.evaluate("cave.select(null)");await pg.mouse.click(*(await P(10,10)));print("click on room:",await M())
        await pg.evaluate("cave.select(null)");await pg.mouse.click(*(await P(-2,30)));print("click outside lot:",await M())
        await pg.evaluate("cave.select(null)");await pg.mouse.click(*(await P(26,10)));print("click beside kitchen:",await M());await pg.click("#em-room")
        print("placed beside:",await pg.evaluate("(r=>[r.x,r.y,r.w,r.d])(cave.get().items.slice(-1)[0])"),errs)
        await b.close()
asyncio.run(main())
