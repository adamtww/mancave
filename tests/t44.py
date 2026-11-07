import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":2200,"height":1200});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("localStorage.removeItem('cave-lib');localStorage.setItem('cave-libc','0')");await pg.reload();await pg.wait_for_timeout(400)
        await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var b=cave.room('Bar',10,10,30,20);cave.update(b,{lk:true});window._k=cave.add('l-keg',14,14);window._n=cave.add('b-net',24,14);cave.select(null)})()");await pg.wait_for_timeout(300)
        V="(document.querySelector('#lf-n')||{}).value||('list:'+document.querySelectorAll('#lib-b .li').length)"
        print("none:",await pg.evaluate(V))
        await pg.evaluate("cave.select(window._k)");await pg.wait_for_timeout(200);print("keg:",await pg.evaluate(V))
        await pg.evaluate("cave.select(window._n)");await pg.wait_for_timeout(200);print("net:",await pg.evaluate(V))
        await pg.fill("#lf-wt","1200");await pg.click("#lf-save");await pg.wait_for_timeout(250);print("after save still:",await pg.evaluate(V),await pg.evaluate("document.querySelector('#lf-wt').value"))
        await pg.evaluate("cave.select(cave.find('Bar')[0].u)");await pg.wait_for_timeout(200);print("room:",await pg.evaluate(V))
        await pg.evaluate("cave.select(null)");await pg.wait_for_timeout(200);print("none:",await pg.evaluate(V),errs)
        await b.close()
asyncio.run(main())
