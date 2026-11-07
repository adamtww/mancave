import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for vp,nm in [({"width":1500,"height":900},"pc"),({"width":744,"height":1133},"ipad")]:
            pg=await b.new_page(viewport=vp);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
            await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var a=cave.room('Kitchen',10,5,30,24);cave.update(a,{lk:true});var c=cave.room('Other',50,50,20,20);cave.update(c,{lk:true});cave.select(a)})()");await pg.wait_for_timeout(300)
            await pg.click("#rm-add");await pg.wait_for_timeout(600)
            print(nm,"in panel:",await pg.evaluate("[!!document.querySelector('#fpanel #q'),!!document.querySelector('#fpanel #cats'),document.querySelectorAll('#fpanel .cat').length]"))
            await pg.click("#fpanel summary:has-text('Kitchen – Residential')");await pg.wait_for_timeout(150)
            await pg.click("#fpanel details[open] .pi >> nth=0");await pg.wait_for_timeout(300)
            print(" det shown in panel:",await pg.evaluate("(()=>{var d=document.querySelector('#det');return [d.className,d.parentNode.id]})()"))
            await pg.screenshot(path=f"/home/claude/build/op_{nm}.png")
            t=await pg.evaluate("(()=>{var q=document.querySelector('#det .tile').getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]})()")
            # drop far outside the room (lower right of canvas)
            await pg.mouse.move(*t);await pg.mouse.down();await pg.mouse.move(t[0]+40,t[1]-10,steps=4);await pg.mouse.move(vp['width']-30,vp['height']-30,steps=10);await pg.mouse.up();await pg.wait_for_timeout(300)
            print(" placed:",await pg.evaluate("cave.get().items.filter(i=>i.kind!=='room').map(i=>[i.name,i.x,i.y,i.w,i.d])"))
            # drop onto panel = cancel
            await pg.mouse.move(*t);await pg.mouse.down();await pg.mouse.move(t[0]+10,t[1]-40,steps=6);await pg.mouse.up();await pg.wait_for_timeout(200)
            print(" after panel drop count:",await pg.evaluate("cave.get().items.filter(i=>i.kind!=='room').length"))
            await pg.screenshot(path=f"/home/claude/build/op2_{nm}.png")
            await pg.click("#fb-ok");await pg.wait_for_timeout(500)
            print(" restored:",await pg.evaluate("[document.querySelector('#q').closest('#drawer')?1:0,document.querySelector('#cats').closest('#drawer')?1:0,document.querySelector('#det').parentNode.id||document.querySelector('#det').parentNode.className]"),errs)
            await pg.close()
        await b.close()
asyncio.run(main())
