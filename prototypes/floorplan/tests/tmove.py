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
        await pg.click('[data-t=iwall]');await click(50,10);await click(50,30);await pg.keyboard.press('Enter');await pg.wait_for_timeout(100)
        await pg.click('[data-t=iwall]');await click(63.3,15);await click(80,15);await pg.keyboard.press('Enter');await pg.wait_for_timeout(100)
        n=await pg.evaluate(W+".length");print('ref wall',await pg.evaluate(W+"[%d].pts.map(p=>[p.x,p.y])"%(n-1)))
        await pg.click('#left .tool[data-t="select"]');await pg.mouse.click(5,5);await pg.wait_for_timeout(450)
        sx,sy=await at(50,15);await pg.mouse.move(sx,sy);await pg.mouse.down();tx,ty=await at(62.7,15);await pg.mouse.move(tx,ty,steps=8);await pg.wait_for_timeout(60)
        g=await pg.evaluate("document.querySelectorAll('line[stroke=\"#e8458b\"]').length");lab=await pg.evaluate("[...document.querySelectorAll('svg text')].map(t=>t.textContent).filter(s=>/Moved/.test(s))[0]||''")
        await pg.mouse.up();await pg.wait_for_timeout(150)
        print('segment drag ->',await pg.evaluate(W+"[%d].pts.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2)])"%(n-2)),'guides',g,lab)
        # whole-wall move: double-click the reference wall then drag it so its end lines up with y=10
        sx,sy=await at(70,15);await pg.mouse.dblclick(sx,sy);await pg.wait_for_timeout(150)
        await pg.mouse.move(sx,sy);await pg.mouse.down();tx,ty=await at(70.2,10.6);await pg.mouse.move(tx,ty,steps=8);await pg.wait_for_timeout(60)
        g=await pg.evaluate("document.querySelectorAll('line[stroke=\"#e8458b\"]').length")
        await pg.mouse.up();await pg.wait_for_timeout(150)
        print('whole move ->',await pg.evaluate(W+"[%d].pts.map(p=>[+p.x.toFixed(2),+p.y.toFixed(2)])"%(n-1)),'guides',g)
        print(errs)
        await b.close()
asyncio.run(main())
