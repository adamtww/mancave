import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var a=cave.room('A',10,10,15,15);cave.update(a,{lk:true});var b=cave.room('B',40,12,10,10);cave.update(b,{lk:true});cave.select(b)})()");await pg.wait_for_timeout(300)
        await pg.click("#rm-edit");await pg.wait_for_timeout(300);print("hd:",await pg.evaluate("[...document.querySelectorAll('.hd')].map(e=>e.dataset.h).join()"),await pg.evaluate("document.querySelector('#rmenu').className"))
        pass
        B=lambda: pg.evaluate("(r=>[r.x,r.y,r.w,r.d])(cave.find('B')[0])")
        H=lambda h: pg.evaluate(f"(()=>{{var q=document.querySelector('.hd[data-h=\"{h}\"]').getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]}})()")
        # south handle near 25 (A bottom)
        s=await H('se');t=await P(53.3,24.4);await pg.mouse.move(*s);await pg.mouse.down();await pg.mouse.move(*t,steps=6)
        print("near 25:",await B(),"guides:",await pg.evaluate("document.querySelectorAll('#svg line[stroke=\"#e0457b\"]').length"))
        await pg.screenshot(path="/home/claude/build/snap.png")
        t=await P(53.3,22.5);await pg.mouse.move(*t,steps=4);print("past it:",await B(),"guides:",await pg.evaluate("document.querySelectorAll('#svg line[stroke=\"#e0457b\"]').length"))
        await pg.mouse.up();await pg.wait_for_timeout(100)
        # move room B: grab middle, drag so left edge near 25.4 (A right edge 25)
        c=await P(45,17);await pg.mouse.move(*c);await pg.mouse.down();r=await B();t=await P(45-(r[0]-25.6),17+ (10.3-r[1]));await pg.mouse.move(*t,steps=8)
        print("move near:",await B());await pg.mouse.up();await pg.wait_for_timeout(100)
        print(errs);await b.close()
asyncio.run(main())
