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
        B="__cave.dbg().S.blk"
        toast="[...document.querySelectorAll('.toast,#toast')].map(t=>t.textContent).join('|')"
        await pg.click('[data-t=iwall]')
        for pt in [(20,15),(35,15),(35,30),(20,30),(20.2,15.2)]:await click(*pt)
        await pg.click('#left .tool[data-t="door"]');await click(20,22);await pg.wait_for_timeout(100)
        async def fill(x,y,name):
            await pg.click('.nf-bk');await pg.click('.tool.bk[data-t="fill"]');n=await pg.evaluate(B+".length");await click(x,y);await pg.wait_for_timeout(200)
            n2=await pg.evaluate(B+".length")
            print(name,'->',(await pg.evaluate(B+".slice(-1)[0].pts.map(p=>[p.x,p.y])") if n2>n else 'nothing added'),'|',await pg.evaluate(toast))
        await fill(27,22,'drawn room with a door')
        await fill(110,52,'imported room')
        await fill(40,50,'open warehouse')
        print('usable',await pg.evaluate("document.querySelector('#a-use').textContent"))
        await pg.screenshot(path='/tmp/fill.png')
        print(errs)
        await b.close()
asyncio.run(main())
