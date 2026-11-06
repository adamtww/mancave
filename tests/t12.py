import asyncio
from playwright.async_api import async_playwright
async def touch(cdp,typ,pts):
    await cdp.send("Input.dispatchTouchEvent",{"type":typ,"touchPoints":[{"x":x,"y":y,"id":i} for i,(x,y) in enumerate(pts)]})
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.add_init_script("Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});const mq=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('pointer: coarse')?{matches:true,addListener(){},removeListener(){}}:mq(q)")
        await pg.goto("file:///home/claude/build/cave-build.html");await pg.wait_for_timeout(500)
        cdp=await ctx.new_cdp_session(pg);D="document.querySelector('#det').className"
        await pg.evaluate("document.querySelectorAll('details.cat')[2].open=true")
        r=await pg.evaluate("(()=>{var b=[...document.querySelectorAll('.pi')].find(x=>x.textContent.includes('Pool'));var q=b.getBoundingClientRect();return [q.x+60,q.y+q.height/2]})()")
        await touch(cdp,"touchStart",[tuple(r)]);await touch(cdp,"touchEnd",[]);await pg.wait_for_timeout(100)
        print("open:",await pg.evaluate(D))
        await touch(cdp,"touchStart",[(800,200)])
        for k in range(1,8): await touch(cdp,"touchMove",[(800-k*20,200+k*5)])
        await touch(cdp,"touchEnd",[]);print("after 1-finger pan:",await pg.evaluate(D))
        await touch(cdp,"touchStart",[(700,250),(800,250)])
        for k in range(1,6): await touch(cdp,"touchMove",[(700-k*10,250),(800+k*10,250)])
        await touch(cdp,"touchEnd",[]);print("after pinch:",await pg.evaluate(D))
        await touch(cdp,"touchStart",[(900,250)]);await pg.wait_for_timeout(700);await touch(cdp,"touchEnd",[]);print("after long still press:",await pg.evaluate(D))
        await touch(cdp,"touchStart",[(900,250)]);await touch(cdp,"touchEnd",[]);print("after quick tap:",await pg.evaluate(D),errs)
        await b.close()
asyncio.run(main())
