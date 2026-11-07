import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1280,"height":720});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        chk="(sel=>{var m=document.querySelector(sel).getBoundingClientRect(),c=document.querySelector('#svg').getBoundingClientRect();return [m.width>0, m.left>=c.left&&m.right<=c.right&&m.top>=c.top&&m.bottom<=c.bottom, Math.round(m.right), Math.round(c.right)]})"
        cases=[("right edge",80,30,18,15),("wide room",2,30,96,15),("bottom",40,85,15,14),("top-left",0,0,15,10)]
        for nm,x,y,w,d in cases:
            await pg.evaluate(f"(function(){{cave.load({{lot:{{w:100,d:100}},items:[]}});var b=cave.room('R',{x},{y},{w},{d});cave.update(b,{{lk:true}});cave.select(b)}})()");await pg.wait_for_timeout(250)
            r=await pg.evaluate(chk+"('#rmenu')")
            await pg.click("#rm-edit");await pg.wait_for_timeout(250);c=await pg.evaluate(chk+"('#cmenu')");await pg.click("#cm-ok");await pg.wait_for_timeout(150)
            print(nm,"rmenu",r,"cmenu",c)
        # zoomed-in kitchen like screenshot: zoom so room fills canvas
        await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var b=cave.room('Kitchen',0,4,22,10);cave.update(b,{lk:true});cave.select(b)})()");await pg.wait_for_timeout(200)
        await pg.mouse.move(120,200)
        for _ in range(10): await pg.keyboard.down('Control');await pg.mouse.wheel(0,-200);await pg.keyboard.up('Control');await pg.wait_for_timeout(50)
        await pg.wait_for_timeout(300);print("zoomed",await pg.evaluate(chk+"('#rmenu')"))
        await pg.screenshot(path="/home/claude/build/mclamp.png")
        await pg.evaluate("(function(){var i=cave.add('l-keg',19,5);cave.select(i)})()");await pg.wait_for_timeout(250);print("imenu zoomed",await pg.evaluate(chk+"('#imenu')"),errs)
        await b.close()
asyncio.run(main())

async def em():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1280,"height":720});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.load({lot:{w:100,d:100},items:[]})");await pg.wait_for_timeout(200)
        for x,y in [(98,75),(98,98),(50,98),(2,2)]:
            P=await pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
            await pg.mouse.click(*P);await pg.wait_for_timeout(200)
            print("emenu",(x,y),await pg.evaluate("(()=>{var m=document.querySelector('#emenu').getBoundingClientRect(),c=document.querySelector('#svg').getBoundingClientRect();return [m.width>0,m.left>=c.left&&m.right<=c.right&&m.top>=c.top&&m.bottom<=c.bottom]})()"))
            await pg.mouse.click(*P);await pg.wait_for_timeout(100)
            await pg.evaluate("cave.load({lot:{w:100,d:100},items:[]})");await pg.wait_for_timeout(100)
        print(errs);await b.close()
asyncio.run(em())
