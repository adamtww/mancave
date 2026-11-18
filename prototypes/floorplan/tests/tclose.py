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
        W="__cave.dbg().S.walls"
        await pg.click('[data-t=iwall]')
        # a free-standing room: 3 corners, then click near the start
        for pt in [(20,15),(35,15),(35,30),(20,30)]:await click(*pt)
        await click(20.4,15.5);await pg.wait_for_timeout(150)
        tool=await pg.evaluate("document.querySelector('.tool.on[data-t]').dataset.t")
        print('closed room ->',await pg.evaluate(W+".slice(-1)[0].pts.map(p=>[p.x,p.y])"),'tool now',tool,await pg.evaluate("[...document.querySelectorAll('.toast,#toast')].map(t=>t.textContent).join('|')"))
        # running into the wall you are drawing
        await pg.click('[data-t=iwall]')
        for pt in [(45,15),(60,15),(60,30),(52,30)]:await click(*pt)
        await click(52.3,14);await pg.wait_for_timeout(150)
        print('self T ->',await pg.evaluate(W+".slice(-1)[0].pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)])"),await pg.evaluate("document.querySelector('.tool.on[data-t]').dataset.t"))
        print(errs)
        await b.close()
asyncio.run(main())
