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
        n0=await pg.evaluate(W+".length")
        await pg.click('[data-t=iwall]')
        sx,sy=await at(40,30);await pg.mouse.move(sx,sy);await pg.mouse.down();await pg.mouse.move(sx+120,sy+60,steps=8);await pg.mouse.up();await pg.wait_for_timeout(100)
        moved=await pg.evaluate("__cave.dbg().scr(40,30)")
        print('after drag: draft points?',await pg.evaluate(W+".length")-n0,'view moved',[round(moved[0]-sx),round(moved[1]-sy)])
        await pg.mouse.wheel(0,-300);await pg.wait_for_timeout(100)
        await click(40,30);await click(55,30);await pg.keyboard.press('Enter');await pg.wait_for_timeout(100)
        print('click-click wall',await pg.evaluate(W+".length")-n0,await pg.evaluate(W+".slice(-1)[0].pts.map(p=>[p.x,p.y])"))
        print(errs)
        await b.close()
asyncio.run(main())
