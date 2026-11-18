import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("http://127.0.0.1:8766/index.html");await pg.wait_for_timeout(800)
        await pg.keyboard.press('Escape');await pg.wait_for_timeout(300)
        await pg.screenshot(path="/tmp/p1.png")
        await pg.click('.nf-bk');await pg.wait_for_timeout(200);await pg.screenshot(path="/tmp/p2.png")
        await pg.click('#left .tool[data-t="door"]');await pg.wait_for_timeout(200);await pg.screenshot(path="/tmp/p3.png")
        await pg.click('#left .tool[data-t="select"]');await pg.wait_for_timeout(200)
        # click a wall on the canvas
        el=await pg.query_selector('[data-h="wall"]')
        if el: await el.click(force=True)
        await pg.wait_for_timeout(300);await pg.screenshot(path="/tmp/p4.png")
        print(errs)
        await b.close()
asyncio.run(main())
