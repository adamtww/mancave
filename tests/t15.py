import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1400,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.batch(c=>{c.lot(80,50);c.room('Shop',5,5,20,15)})");await pg.evaluate("cave.fit()")
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        a=await P(15,15);await pg.mouse.click(*a);await pg.click("#i-lk")
        print("locked:",await pg.evaluate("cave.find('Shop')[0].lk"),"handles:",await pg.evaluate("document.querySelectorAll('.hd').length"),"btn:",await pg.inner_text("#i-lk"),"w disabled:",await pg.evaluate("document.querySelector('#i-w').disabled"))
        vb0=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')")
        z=await P(35,25);await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up()
        print("after drag:",await pg.evaluate("(r=>[r.x,r.y])(cave.find('Shop')[0])"),"view panned:",vb0!=await pg.evaluate("document.querySelector('#svg').getAttribute('viewBox')"))
        await pg.evaluate("cave.fit()");a=await P(15,15);await pg.mouse.click(*a)
        for k in ["r","ArrowLeft"]: await pg.keyboard.press(k)
        print("after keys:",await pg.evaluate("(r=>[r.x,r.y,r.w,r.d])(cave.find('Shop')[0])"),"selected:",await pg.evaluate("document.querySelector('#insp').className"))
        await pg.click("#i-lk");a=await P(15,15);z=await P(30,20);await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up()
        print("unlocked drag:",await pg.evaluate("(r=>[r.x,r.y])(cave.find('Shop')[0])"),errs)
        await b.close()
asyncio.run(main())
