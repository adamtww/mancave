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
        await click(60.3,30.2);await click(80,30.4);await pg.keyboard.press('Enter');await pg.wait_for_timeout(100)
        await pg.click('[data-t=iwall]');await click(80.4,65.2);await click(89.0,66.4)
        await pg.click('[data-t=iwall]');await click(99,54);await click(98.2,58.3)
        W="__cave.dbg().S.walls"
        n=await pg.evaluate(W+".length")
        for idx,L in [(n-3,25),(n-2,6),(n-1,2)]:
            # select that wall's edge through the app's own menu path: click the wall line
            pts=await pg.evaluate(W+f"[{idx}].pts.map(p=>[p.x,p.y])")
            mx=(pts[0][0]+pts[1][0])/2;my=(pts[0][1]+pts[1][1])/2
            sx,sy=await at(mx,my);await pg.mouse.click(sx,sy);await pg.wait_for_timeout(120)
            if not await pg.evaluate("!!document.querySelector('#i-len')"):print('no length box',idx);continue
            await pg.fill('#i-len',str(L));await pg.press('#i-len','Enter');await pg.wait_for_timeout(120)
            r=await pg.evaluate(W+f"[{idx}]")
            pp=r['pts'];import math
            print(idx,'want',L,'got',round(math.hypot(pp[1]['x']-pp[0]['x'],pp[1]['y']-pp[0]['y']),2),[[round(p['x'],2),round(p['y'],2)] for p in pp],'att',[bool(a) for a in (r['att'] or [None,None])])
        await pg.keyboard.press('Control+z');await pg.wait_for_timeout(100);r=await pg.evaluate(W+f"[{n-1}].pts.map(p=>[p.x,p.y])");print('undo',r)
        print(errs)
        await b.close()
asyncio.run(main())
