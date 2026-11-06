import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        r=await pg.evaluate("(function(){cave.load({lot:{w:100,d:60},items:[]});var a=cave.room('Shop',70,30,25,18);cave.update(a,{lk:true});var r=cave.catalog().find(c=>c.w<5&&c.d<5);var i=cave.add(r.ref,75,35);cave.select(a);return [r, cave.get().items.map(i=>[i.name,i.x,i.y])]})()")
        print(r)
        await pg.click("#rm-add");await pg.wait_for_timeout(500)
        it=await pg.evaluate("cave.get().items.find(i=>i.kind!=='room')");c=await P(it['x']+it['w']/2,it['y']+it['d']/2);d=await P(it['x']+it['w']/2+6,it['y']+it['d']/2+4)
        await pg.mouse.move(*c);await pg.mouse.down();await pg.mouse.move(*d,steps=8);await pg.mouse.up();await pg.wait_for_timeout(200)
        print("moved:",await pg.evaluate("(i=>[i.x,i.y])(cave.get().items.find(i=>i.kind!=='room'))"),"still furn:",await pg.evaluate("document.body.classList.contains('furn')"),errs)
        await b.close()
asyncio.run(main())
