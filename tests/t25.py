import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.batch(c=>{c.room('Shop',10,10,25,20);c.add('w-tsaw',15,12);c.add('w-band',25,14)});cave.select(cave.find('Shop')[0].u)");await pg.wait_for_timeout(300)
        n=lambda: pg.evaluate("cave.get().items.length")
        await pg.click("#rm-del");await pg.wait_for_timeout(150);print("dialog:",await pg.inner_text("#cd-t"),"|",await pg.inner_text("#cd-m"))
        await pg.screenshot(path="/home/claude/build/cdlg.png")
        await pg.click("#cd-no");print("after Cancel:",await n())
        await pg.click("#rm-del");await pg.keyboard.press("Escape");print("after Esc:",await n())
        await pg.click("#rm-del");await pg.click("#cd-yes");await pg.wait_for_timeout(100);print("after Remove:",await n())
        await pg.click("#undo");print("after Undo:",await n(),errs)
        await b.close()
asyncio.run(main())
