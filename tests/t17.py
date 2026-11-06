import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":950},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("""cave.batch(c=>{c.lot(40,26);c.room('Home kitchen',1,1,18,12);c.room('Commercial kitchen',20,1,19,24);c.room('Lunch',1,14,18,11);
          c.add('kr-counter',2,1.5);c.add('kr-range',12,1.5);c.add('kr-fridge',14.5,1.5);c.add('kr-dw',8,1.5);c.add('kr-micro',4,8);
          var u=c.add('kr-range',15,8);c.update(u,{w:2.5,d:2.5,rot:2});
          c.add('kc-hood',21,1.5);c.add('kc-range',21.5,2);c.add('kc-range',25,2);c.add('kc-fridge',30,2);c.add('kc-dw',34,2);
          c.add('kc-3sink',21,12);c.add('kc-hand',31,12);c.add('kc-grease',35,20);
          var v=c.add('kc-fridge',22,18);c.update(v,{w:3,d:2.5,rot:1});
          c.add('kr-fridge',3,18)})""")
        await pg.evaluate("cave.fit()");await pg.wait_for_timeout(300);await pg.evaluate("cave.select(cave.find('Commercial dish')[0].u)")
        await pg.screenshot(path="kitchen.png");print(errs)
        await b.close()
asyncio.run(main())
