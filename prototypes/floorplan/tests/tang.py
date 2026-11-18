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
        import math
        async def wall(x0,y0,x1,y1):
            await pg.click('[data-t=iwall]');await click(x0,y0);await click(x1,y1);await pg.keyboard.press('Enter');await pg.wait_for_timeout(100)
            r=await pg.evaluate(W+".slice(-1)[0].pts.map(p=>[p.x,p.y])");a=math.degrees(math.atan2(r[1][1]-r[0][1],r[1][0]-r[0][0]));return [[round(c,1) for c in q] for q in r],round(a,1)
        print('30 deg ->',await wall(30,20,40,20-10*math.tan(math.radians(30))))
        print('5 deg (near straight) ->',await wall(30,40,45,40-15*math.tan(math.radians(5))))
        print('43 deg (near 45) ->',await wall(30,60,40,60-10*math.tan(math.radians(43))))
        print('60 deg ->',await wall(60,50,65,50-5*math.tan(math.radians(60))))
        print(errs)
        await b.close()
asyncio.run(main())
