import asyncio,sys,json
exec(open('/home/claude/build/tflow.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.add_init_script(INIT)
        await pg.goto("http://127.0.0.1:8766/fork.html");await pg.wait_for_timeout(800)
        await pg.click('#nf-c-plan');await pg.set_input_files('#nf-in','/home/claude/build/shape-proto/tests/grand.png');await pg.click('#nf-go')
        for i in range(30):
            await pg.wait_for_timeout(500)
            if not await pg.evaluate("document.querySelector('#nf-ld').classList.contains('show')"):break
        await pg.wait_for_timeout(400)
        W=await pg.evaluate("__cave.dbg().S.walls.map(w=>w.pts.map(p=>[p.x,p.y]))")
        async def at(x,y):
            return await pg.evaluate(f"__cave.dbg().scr({x},{y})")
        async def click(x,y):
            sx,sy=await at(x,y);await pg.mouse.move(sx,sy,steps=3);await pg.wait_for_timeout(40);await pg.mouse.click(sx,sy);await pg.wait_for_timeout(80)
        last="(()=>{var w=__cave.dbg().S.walls;w=w[w.length-1];return JSON.stringify(w.pts.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2)]))+' att '+JSON.stringify(w.att)})()"
        await pg.click('[data-t=iwall]')
        # A: from a wall end, aim a bit off the corner below -> should go straight down to the wall
        await click(99,54);await click(98.2,58.3);print('A',await pg.evaluate(last))
        await pg.click('[data-t=iwall]')
        # B: free start, sloppy horizontal ending near x=90 -> straight, lined up with x=90
        await click(60.3,30.2);sx,sy=await at(89.5,31.1);await pg.mouse.move(sx,sy,steps=4);await pg.wait_for_timeout(60)
        g=await pg.evaluate("document.querySelectorAll('line[stroke=\"#e8458b\"]').length");await pg.screenshot(path='/tmp/iw_guide.png')
        await pg.mouse.click(sx,sy);await pg.keyboard.press('Enter');await pg.wait_for_timeout(80);print('B',await pg.evaluate(last),'guides',g)
        await pg.click('[data-t=iwall]')
        # C: aim diagonally-ish down from 70,40 toward the wall at y=58 -> locks vertical and stops on y=58? (no wall there) ; aim at 90-wall from left
        await click(80.4,65.2);await click(89.0,66.4);print('C',await pg.evaluate(last))
        print(errs)
        await b.close()
asyncio.run(main())
