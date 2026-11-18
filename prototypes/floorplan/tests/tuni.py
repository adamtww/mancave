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
        async def drag(x0,y0,dx,dy):
            sx,sy=await at(x0,y0);await pg.mouse.move(sx,sy);await pg.mouse.down();await pg.mouse.move(sx+dx,sy+dy,steps=6);await pg.mouse.up();await pg.wait_for_timeout(80)
        async def tool(t):
            if t in('box','column','circle','free','fill'):await pg.click('.nf-bk');await pg.click('.tool.bk[data-t="%s"]'%t)
            else:await pg.click('#left .tool[data-t="%s"]'%t)
        res={}
        for t in ['box','column','circle','free','fill','door','iwall']:
            await tool(t);n=await pg.evaluate(B+".length+__cave.dbg().S.doors.length+__cave.dbg().S.walls.length")
            b0=await pg.evaluate("__cave.dbg().scr(40,30)");await drag(40,30,80,40);b1=await pg.evaluate("__cave.dbg().scr(40,30)")
            n2=await pg.evaluate(B+".length+__cave.dbg().S.doors.length+__cave.dbg().S.walls.length")
            res[t]=('panned' if abs(b1[0]-b0[0]-80)<2 else 'NO PAN')+(' / nothing added' if n2==n else ' / ADDED')
            await pg.keyboard.press('Escape')
        print(res)
        await pg.click('button:has-text("Fit")');await pg.wait_for_timeout(150)
        # box with two clicks, circle with two clicks, column with one click
        await tool('box');await click(30,20);await click(40,28);print('box',await pg.evaluate(B+".slice(-1)[0].pts.map(p=>[p.x,p.y])"))
        await tool('circle');await click(60,20);await click(63,20);print('circle',await pg.evaluate(B+".slice(-1)[0].pts.map(p=>[p.x,p.y,p.b])"))
        await tool('column');await click(70,30);print('column',await pg.evaluate(B+".slice(-1)[0].label"))
        await tool('select');await pg.mouse.click(5,5);await pg.wait_for_timeout(100)
        print('outline corner handles when nothing selected',await pg.evaluate("document.querySelectorAll('[data-h=vertex][data-id=\"0\"]').length"),'wall hit areas',await pg.evaluate("document.querySelectorAll('[data-h=wall][data-id=\"0\"]').length"))
        print(errs)
        await b.close()
asyncio.run(main())
