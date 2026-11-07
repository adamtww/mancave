import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var a=cave.room('Kitchen',10,5,30,24);cave.update(a,{lk:true});cave.add('l-keg',20,10);cave.add('b-net',30,15)})()");await pg.wait_for_timeout(300)
        I=lambda: pg.evaluate("cave.get().items.filter(i=>i.kind!=='room').map(i=>[i.name,i.x,i.y,i.w,i.d,i.rot||0])")
        print("items:",await I())
        it=(await I())[0];await pg.mouse.click(*(await P(it[1]+it[3]/2,it[2]+it[4]/2)));await pg.wait_for_timeout(250)
        print("menu:",await pg.evaluate("document.querySelector('#imenu').className"))
        await pg.screenshot(path="/home/claude/build/im.png",clip={"x":300,"y":56,"width":900,"height":600})
        await pg.click("#im-rot");await pg.wait_for_timeout(200);print("rotated:",(await I())[0])
        await pg.click("#im-ins");await pg.wait_for_timeout(250);print("inspect:",await pg.evaluate("document.querySelector('#det').className"),await pg.inner_text("#det .nm"))
        await pg.click("#im-del");await pg.wait_for_timeout(200);print("after remove:",await I(),await pg.evaluate("document.querySelector('#imenu').className"))
        # furn mode
        await pg.evaluate("cave.select(cave.find('Kitchen')[0].u)");await pg.wait_for_timeout(200);await pg.click("#rm-add");await pg.wait_for_timeout(600)
        it=(await I())[0];await pg.mouse.click(*(await P(it[1]+it[3]/2,it[2]+it[4]/2)));await pg.wait_for_timeout(250)
        print("furn menu:",await pg.evaluate("document.querySelector('#imenu').className"))
        await pg.screenshot(path="/home/claude/build/im2.png")
        await pg.click("#im-rot");await pg.wait_for_timeout(200);print("furn rotated:",(await I())[0],"still furn:",await pg.evaluate("document.body.classList.contains('furn')"),errs)
        await b.close()
asyncio.run(main())
