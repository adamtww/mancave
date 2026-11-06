import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1500,"height":900},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
        P=lambda x,y: pg.evaluate(f"(()=>{{var s=document.querySelector('#svg'),p=s.createSVGPoint();p.x={x};p.y={y};var q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y]}})()")
        R=lambda: pg.evaluate("(r=>[r.name,r.x,r.y,r.w,r.d,!!r.lk,!!r.sz,r.col||''])(cave.find('Shop')[0]||cave.get().items[0])")
        await pg.evaluate("(function(){var u=cave.room('Shop',10,10,20,15);cave.update(u,{lk:true});cave.select(u)})()");await pg.wait_for_timeout(300)
        await pg.click("#rm-edit");await pg.wait_for_timeout(300)
        print("hint:",await pg.evaluate("[...document.querySelectorAll('#svg text')].filter(t=>t.textContent.includes('Click Here to Rename')).length"));print("edit mode:",await R(),"label:",await pg.inner_text("#cm-lbl"),"handles:",await pg.evaluate("document.querySelectorAll('.hd').length"))
        await pg.screenshot(path="/home/claude/build/edit.png",clip={"x":300,"y":100,"width":900,"height":500})
        h=await pg.evaluate("(()=>{var q=document.querySelector('.hd[data-h=\"se\"]').getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]})()")
        z=await P(40,32);await pg.mouse.move(*h);await pg.mouse.down();await pg.mouse.move(*z,steps=6);await pg.mouse.up();await pg.wait_for_timeout(200)
        await pg.click("#cm-sw .sw1[data-c='#5b8bd9']");await pg.wait_for_timeout(100)
        c=await pg.evaluate("(r=>[r.x+r.w/2,r.y+r.d/2])(cave.get().items[0])");await pg.mouse.click(*(await P(*c)));await pg.wait_for_timeout(350)
        print("rename prefilled:",await pg.input_value("#rn-in"));await pg.keyboard.press("Control+A");await pg.keyboard.type("Woodshop");await pg.keyboard.press("Enter");await pg.wait_for_timeout(300)
        await pg.mouse.click(*(await P(80,80)));await pg.wait_for_timeout(100);print("outside click shakes:",await pg.evaluate("document.querySelector('#cmenu').className"))
        await pg.click("#cm-ok");await pg.wait_for_timeout(200)
        print("hint after:",await pg.evaluate("[...document.querySelectorAll('#svg text')].filter(t=>t.textContent.includes('Click Here to Rename')).length"));print("after Done:",await R(),"room menu:",await pg.evaluate("document.querySelector('#rmenu').className"),errs)
        await b.close()
asyncio.run(main())
