import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        cls=lambda q: pg.evaluate(f"document.querySelector('{q}').className")
        await pg.mouse.click(*(await P(30,30)));await pg.click("#em-room");await pg.wait_for_timeout(300)
        r=lambda: pg.evaluate("(r=>[r.x,r.y,r.w,r.d,!!r.lk,!!r.sz])(cave.get().items[0])")
        print("after Add Room:",await r(),"handles:",await pg.evaluate("document.querySelectorAll('.hd').length"),"confirm:",await cls('#cmenu'),"roommenu:",await cls('#rmenu'))
        await pg.screenshot(path="/home/claude/build/sizing.png",clip={"x":300,"y":50,"width":1000,"height":700})
        h=await pg.evaluate("(()=>{var q=document.querySelector('.hd[data-h=\"se\"]').getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]})()")
        z=await P(45,40);await pg.mouse.move(*h);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up();await pg.wait_for_timeout(200)
        print("after resize:",await r(),"confirm still:",await cls('#cmenu'))
        await pg.click("#cm-ok");await pg.wait_for_timeout(300)
        print("after confirm:",await r(),"confirm:",await cls('#cmenu'),"roommenu:",await cls('#rmenu'),errs)
        await b.close()
asyncio.run(main())
