import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for vp,nm in [({"width":1500,"height":900},"pc"),({"width":744,"height":1133},"ipad")]:
            pg=await b.new_page(viewport=vp);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
            P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
            await pg.evaluate("(function(){cave.load({lot:{w:100,d:60},items:[]});var a=cave.room('Shop',70,30,25,18);cave.update(a,{lk:true});var c=cave.room('Bar',10,10,20,15);cave.update(c,{lk:true});cave.select(a)})()");await pg.wait_for_timeout(300)
            await pg.click("#rm-add");await pg.wait_for_timeout(500)
            room=await pg.evaluate("(()=>{var s=document.querySelector('#svg'),it=cave.find('Shop')[0],P=(x,y)=>{var p=s.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(s.getScreenCTM())},a=P(it.x,it.y),b=P(it.x+it.w,it.y+it.d),st=document.querySelector('#stage').getBoundingClientRect(),fb=document.querySelector('#fbar').getBoundingClientRect();return {room:[a.x|0,a.y|0,b.x|0,b.y|0],stage:[st.left|0,st.top|0,st.right|0,st.bottom|0],fbarBottom:fb.bottom|0,hist:getComputedStyle(document.querySelector('#hist')).display}})()")
            print(nm,room)
            await pg.screenshot(path=f"/home/claude/build/f_{nm}.png")
            # tap outside -> shake, selection stays
            await pg.mouse.click(*(await P(20,15)));await pg.wait_for_timeout(100)
            print(" outside tap:",await pg.evaluate("document.querySelector('#fbar').className"),await pg.evaluate("cave.get().items.find(i=>i.name==='Bar')?1:0"))
            # change something then undo with confirm
            await pg.evaluate("(function(){var u=cave.find('Shop')[0].u;cave.update(u,{col:'#5b8bd9'})})()")
            await pg.click("#fb-un");await pg.wait_for_timeout(150);print(" dialog:",await pg.inner_text("#cd-t"))
            await pg.click("#cd-yes");await pg.wait_for_timeout(500)
            print(" after undo:",await pg.evaluate("[cave.find('Shop')[0].col||'',document.body.className.includes('furn'),getComputedStyle(document.querySelector('#hist')).display]"))
            await pg.click("#rm-add");await pg.wait_for_timeout(400);await pg.click("#fb-ok");await pg.wait_for_timeout(500)
            print(" after done:",await pg.evaluate("[document.body.className.includes('furn'),document.querySelector('#rmenu').className]"),errs)
            await pg.close()
        await b.close()
asyncio.run(main())
