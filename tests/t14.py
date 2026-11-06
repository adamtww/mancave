import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1400,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        await pg.evaluate("cave.batch(c=>{c.lot(80,50);c.room('A',5,5,20,15);c.room('B',40,5,20,15);c.add('g-pool',10,8)})");await pg.evaluate("cave.fit()")
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        R=lambda n: pg.evaluate(f"(r=>[r.x,r.y,r.w,r.d])(cave.find('{n}')[0])")
        # drag A right into B
        a=await P(15,12);z=await P(50,14);await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=8);await pg.mouse.up()
        print("A after push into B:",await R('A'),"pool x:",await pg.evaluate("cave.find('Pool')[0].x"))
        # slide: drag A down-right diagonally along B
        a=await P(35,18);z=await P(55,46);await pg.mouse.move(*a);await pg.mouse.down();await pg.mouse.move(*z,steps=10);await pg.mouse.up()
        print("A after diagonal:",await R('A'))
        # resize B west into A? reset positions
        await pg.evaluate("cave.batch(c=>{var a=cave.find('A')[0],bb=cave.find('B')[0];cave.update(a.u,{x:5,y:5});cave.update(bb.u,{x:40,y:5})})")
        await pg.evaluate("cave.select(cave.find('B')[0].u)")
        h=await pg.evaluate("(()=>{var r=document.querySelector('.hd[data-h=\"w\"]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        z=await P(0,12);await pg.mouse.move(*h);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up()
        print("B after west resize:",await R('B'))
        # draw from empty space across A
        await pg.keyboard.press("Escape");await pg.keyboard.press("b")
        s1=await P(2,30);s2=await P(30,2);await pg.mouse.move(*s1);await pg.mouse.down();await pg.mouse.move(*s2,steps=6);await pg.mouse.up()
        print("drawn:",await pg.evaluate("(r=>r&&[r.x,r.y,r.w,r.d])(cave.find('Room')[0])"))
        # draw starting inside A -> nothing
        await pg.keyboard.press("b");s1=await P(10,10);s2=await P(15,15);await pg.mouse.move(*s1);await pg.mouse.down();await pg.mouse.move(*s2,steps=4);await pg.mouse.up()
        print("rooms:",await pg.evaluate("cave.get().items.filter(i=>i.kind=='room').length"),errs)
        await b.close()
asyncio.run(main())
