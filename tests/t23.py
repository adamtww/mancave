import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        await pg.mouse.click(*(await P(30,20)));await pg.click("#em-room");await pg.wait_for_timeout(250)
        r=await pg.evaluate("(r=>[r.x+r.w/2,r.y+r.d/2])(cave.get().items[0])")
        await pg.mouse.click(*(await P(*r)));await pg.wait_for_timeout(150)
        print("prompt shown:",await pg.evaluate("document.querySelector('#rename').classList.contains('show')"),"value:",repr(await pg.input_value("#rn-in")),"shake:",await pg.evaluate("document.querySelector('#cmenu').classList.contains('warn')"))
        await pg.screenshot(path="/home/claude/build/rename.png",clip={"x":300,"y":50,"width":900,"height":600})
        await pg.keyboard.type("Woodshop");await pg.keyboard.press("Enter");await pg.wait_for_timeout(100)
        print("renamed:",await pg.evaluate("cave.get().items[0].name"),"still sizing:",await pg.evaluate("!!cave.get().items[0].sz"))
        # dragging inside room still moves it, no prompt
        a=await P(*r);z=await P(r[0]+5,r[1]+3);await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=5);await pg.mouse.up();await pg.wait_for_timeout(100)
        print("moved:",await pg.evaluate("(r=>[r.x,r.y])(cave.get().items[0])"),"prompt:",await pg.evaluate("document.querySelector('#rename').classList.contains('show')"))
        # Esc cancels
        r=await pg.evaluate("(r=>[r.x+r.w/2,r.y+r.d/2])(cave.get().items[0])");await pg.mouse.click(*(await P(*r)));await pg.keyboard.type("zzz");await pg.keyboard.press("Escape")
        print("after Esc:",await pg.evaluate("cave.get().items[0].name"),errs)
        await b.close()
asyncio.run(main())
