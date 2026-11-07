import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        for i,(nm,x,y,w,d) in enumerate([("Room 1",30,20,12,8),("Woodworking Shop",10,40,30,20),("Tall Room",60,10,8,25),("Bar",80,50,6,5)]):
            await pg.evaluate(f"(function(){{cave.load({{lot:{{w:100,d:100}},items:[]}});var u=cave.room('{nm}',{x},{y},{w},{d});cave.update(u,{{lk:true}});cave.select(u)}})()");await pg.wait_for_timeout(250)
            await pg.click("#rm-edit");await pg.wait_for_timeout(300)
            bb=await pg.evaluate("(()=>{var g=document.querySelector('.o[data-u]').getBoundingClientRect();return [g.x,g.y,g.width,g.height]})()")
            await pg.screenshot(path=f"/home/claude/build/p{i}.png",clip={"x":bb[0]-30,"y":bb[1]-30,"width":bb[2]+60,"height":bb[3]+60})
        print(errs);await b.close()
asyncio.run(main())
