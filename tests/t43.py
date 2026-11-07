import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        for vp,nm in [({"width":2200,"height":1200},"wide"),({"width":1133,"height":744},"ipadL")]:
            pg=await b.new_page(viewport=vp);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
            await pg.goto("file:///home/claude/mancave/index.html");await pg.wait_for_timeout(400)
            await pg.evaluate("(function(){cave.load({lot:{w:100,d:100},items:[]});var b=cave.room('Bar',10,10,30,20);cave.update(b,{lk:true});window._k=cave.add('l-keg',14,14);cave.select(null)})()");await pg.wait_for_timeout(300)
            R=lambda s: pg.evaluate(f"(e=>{{var r=e.getBoundingClientRect();return [r.left|0,r.width|0]}})(document.querySelector('{s}'))")
            print(nm,"svg",await R('#svg'),"info",await R('#info'),"lib",await R('#lib'),await pg.evaluate("document.querySelector('#lib').className"))
            await pg.screenshot(path=f"/home/claude/build/lib_{nm}.png")
            if nm=="ipadL":
                await pg.click("#lib-tg");await pg.wait_for_timeout(300);print(" expanded svg",await R('#svg'),"lib",await R('#lib'))
                await pg.screenshot(path=f"/home/claude/build/lib_{nm}2.png")
            else:
                await pg.fill("#lq","keg");await pg.wait_for_timeout(100);await pg.click("#lib-b .li >> nth=0");await pg.wait_for_timeout(200)
                await pg.screenshot(path="/home/claude/build/lib_form.png")
                await pg.fill("#lf-n","Kegerator (2-tap)");await pg.fill("#lf-w","3");await pg.fill("#lf-wt","450");await pg.click("#lf-save");await pg.wait_for_timeout(300)
                print(" placed after edit:",await pg.evaluate("(i=>[i.name,i.w,i.d])(cave.get().items.find(i=>i.r==='l-keg'))"),"stored:",await pg.evaluate("localStorage.getItem('cave-lib')"))
                await pg.evaluate("cave.select(window._k)");await pg.wait_for_timeout(200);print(" info watts:",await pg.evaluate("[...document.querySelectorAll('#info-b .irow')].map(e=>e.innerText.replace(/\\n/,': ')).filter(t=>/Watt/.test(t))"))
                await pg.evaluate("cave.select(null)");await pg.fill("#lq","");await pg.click("#lib-new");await pg.wait_for_timeout(150);await pg.fill("#lf-n","Claw machine");await pg.select_option("#lf-c","Arcade & Gaming");await pg.click("#lf-save");await pg.wait_for_timeout(200)
                print(" custom in list:",await pg.evaluate("[...document.querySelectorAll('#lib-b .li .ln')].map(e=>e.innerText).filter(t=>/Claw|Keg/.test(t))"))
                await pg.reload();await pg.wait_for_timeout(500);print(" after reload:",await pg.evaluate("[...document.querySelectorAll('#lib-b .li .ln')].map(e=>e.innerText).filter(t=>/Claw|Keg/.test(t))"))
                await pg.fill("#lq","keg");await pg.click("#lib-b .li >> nth=0");await pg.wait_for_timeout(150);await pg.click("#lf-reset");await pg.wait_for_timeout(200)
                print(" after reset:",await pg.evaluate("[...document.querySelectorAll('#lib-b .li .ln')].map(e=>e.innerText)"))
            print(" errs",errs);await pg.close()
        await b.close()
asyncio.run(main())
