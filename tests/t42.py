import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var b=cave.room('Shop',10,10,40,30);cave.update(b,{lk:true});window._a=cave.add('m-mf1200',14,14);window._b=cave.add('l-keg',30,14);cave.select(window._a)})()");await pg.wait_for_timeout(300)
        print(await pg.inner_text("#info"));await pg.screenshot(path="/home/claude/build/ocard.png",clip={"x":840,"y":50,"width":480,"height":850})
        await pg.evaluate("cave.select(window._b)");await pg.wait_for_timeout(200);print("--");print(await pg.inner_text("#info"),errs)
        await b.close()
asyncio.run(main())
