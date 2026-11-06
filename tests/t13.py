import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1400,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.batch(c=>{c.lot(60,40);c.room('Shop',5,5,20,15);c.add('g-pool',10,8)})");await pg.evaluate("cave.fit()")
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        # drag room far past top-left
        a=await P(15,12);z=await P(-40,-40)
        await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up()
        print("room:",await pg.evaluate("(r=>[r.x,r.y])(cave.find('Shop')[0])"),"pool:",await pg.evaluate("(r=>[r.x,r.y])(cave.find('Pool')[0])"))
        # resize room past right/bottom via se handle
        h=await pg.evaluate("(()=>{var r=document.querySelector('.hd[data-h=\"se\"]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        z=await P(200,200);await pg.mouse.move(*h);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up()
        print("room after resize:",await pg.evaluate("(r=>[r.x,r.y,r.w,r.d])(cave.find('Shop')[0])"))
        # draw room starting outside
        await pg.keyboard.press("b");s1=await P(-2,-2);s2=await P(8,8)
        await pg.mouse.move(*s1);await pg.mouse.down();await pg.mouse.move(*s2,steps=4);await pg.mouse.up()
        print("drawn:",await pg.evaluate("(r=>[r.x,r.y,r.w,r.d])(cave.find('Room')[0]||{})"))
        # nudge pool out with arrows
        await pg.evaluate("cave.select(cave.find('Pool')[0].u)")
        for _ in range(30): await pg.keyboard.press("Shift+ArrowLeft")
        print("pool after nudges:",await pg.evaluate("(r=>[r.x,r.y])(cave.find('Pool')[0])"),errs)
        await b.close()
asyncio.run(main())
