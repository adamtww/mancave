import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var b=cave.room('Shop',10,10,40,30);cave.update(b,{lk:true});var e=cave.room('Bar',60,10,25,20);cave.update(e,{lk:true});['m-mf1200','m-comp','b-net'].forEach(function(r,i){cave.add(r,14+i*6,14)});['l-keg','l-keg'].forEach(function(r,i){cave.add(r,64+i*4,14)});cave.add('b-hvac',75,20);cave.select(null)})()");await pg.wait_for_timeout(300)
        await pg.click("#info-b .iroom >> nth=0");await pg.wait_for_timeout(200)
        print("open:",await pg.evaluate("document.querySelectorAll('#info-b .iroom.open .icirc').length"),"sel:",await pg.evaluate("cave.get().items.filter(i=>0).length"))
        await pg.screenshot(path="/home/claude/build/brk.png",clip={"x":840,"y":50,"width":480,"height":850})
        await pg.click("#info-b .iroom >> nth=0");await pg.wait_for_timeout(200);print("closed:",await pg.evaluate("document.querySelectorAll('#info-b .iroom.open').length"),errs)
        await b.close()
asyncio.run(main())
