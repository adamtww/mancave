import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True,device_scale_factor=2)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        await pg.evaluate("(function(){var u=cave.room('Room 1',35,80,15,15);cave.update(u,{sz:true,lk:false});cave.select(u)})()");await pg.wait_for_timeout(300)
        r=await pg.evaluate("(r=>[r.x+r.w/2,r.y+r.d/2])(cave.get().items[0])");print("room center",r)
        await pg.mouse.click(*(await P(*r)));await pg.wait_for_timeout(400)
        box=await pg.locator('#rename').bounding_box();st=await pg.locator('#stage').bounding_box()
        print("dialog top at",round((box['y']-st['y'])/st['height']*100),"% of stage height")
        await pg.screenshot(path="/home/claude/build/rename2.png")
        await pg.keyboard.type("Bar");await pg.keyboard.press("Enter");await pg.wait_for_timeout(300)
        v=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox').split(' ').map(n=>+(+n).toFixed(1))")
        print("name:",await pg.evaluate("cave.get().items[0].name"),"view re-clamped bottom:",round(v[1]+v[3],1),errs)
        await b.close()
asyncio.run(main())
