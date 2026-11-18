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
        await pg.click('[data-t=iwall]');await click(40,20);await click(60,20.2);await click(60.2,40);await pg.keyboard.press('Enter');await pg.wait_for_timeout(150)
        n=await pg.evaluate(W+".length");print('walls',n,await pg.evaluate(W+"[%d].pts.map(p=>[p.x,p.y])"%(n-1)))
        await pg.keyboard.press('Escape');await pg.click('#left .tool[data-t="select"]');await pg.wait_for_timeout(100)
        insp="(document.querySelector('#insp')||document.body).innerText.slice(0,160).replace(/\\n/g,' | ')"
        await click(60,25);await pg.wait_for_timeout(450)
        sx0,sy0=await at(50,30);await pg.screenshot(path='/tmp/segsel.png',clip={'x':sx0-120,'y':sy0-110,'width':240,'height':220})
        print('click ->',await pg.evaluate(insp))
        sx,sy=await at(60,25);await pg.mouse.dblclick(sx,sy);await pg.wait_for_timeout(150)
        print('dblclick ->',await pg.evaluate(insp))
        await pg.mouse.move(sx,sy);await pg.mouse.down();await pg.mouse.move(sx-60,sy+30,steps=6);await pg.mouse.up();await pg.wait_for_timeout(150)
        print('moved ->',await pg.evaluate(W+"[%d].pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)])"%(n-1)))
        pts=await pg.evaluate(W+"[%d].pts.map(p=>[p.x,p.y])"%(n-1))
        await pg.mouse.click(5,5);await pg.wait_for_timeout(450)
        await click((pts[0][0]+pts[1][0])/2,pts[0][1]);await pg.wait_for_timeout(150)
        print('seg ->',await pg.evaluate(insp))
        await pg.click('#i-delseg');await pg.wait_for_timeout(150)
        print('after delete',await pg.evaluate(W+".length"),await pg.evaluate(W+"[%d].pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)])"%(n-1)))
        await pg.screenshot(path='/tmp/seg.png')
        print(errs)
        await b.close()
asyncio.run(main())
