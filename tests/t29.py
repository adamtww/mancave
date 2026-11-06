import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for vp,nm in [({"width":1280,"height":720},"pc"),({"width":744,"height":1133},"ipad")]:
            pg=await b.new_page(viewport=vp,device_scale_factor=1);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
            await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var u=cave.room('Room 1',88,60,12,12);cave.update(u,{lk:true});cave.select(u)})()");await pg.wait_for_timeout(250)
            pass
            await pg.wait_for_timeout(200)
            # pan so room is at right edge
            await pg.evaluate("cave.fit&&0");await pg.click("#rm-edit");await pg.wait_for_timeout(300)
            r=await pg.evaluate("(()=>{var m=document.querySelector('#cmenu').getBoundingClientRect(),s=document.querySelector('#svg'),it=cave.get().items[0],P=(x,y)=>{var p=s.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(s.getScreenCTM())},g={left:P(it.x,0).x,right:P(it.x+it.w,0).x};return {menuL:m.left,menuR:m.right,roomL:g.left,roomR:g.right,cls:document.querySelector('#cmenu').className}})()")
            print(nm,r,errs);await pg.screenshot(path=f"/home/claude/build/m_{nm}.png");await pg.close()
        await b.close()
asyncio.run(main())
