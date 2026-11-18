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
        print('import walls',await pg.evaluate(W+".map(w=>w.pts.length).join(',')"))
        await pg.click('[data-t=iwall]');await click(30,10);await click(30,50);await pg.keyboard.press('Enter');await pg.wait_for_timeout(120)
        for y in (20,30,40):
            await pg.click('[data-t=iwall]');await click(15,y);await click(29.6,y+.3);await pg.wait_for_timeout(120)
        n=await pg.evaluate(W+".length")
        long=await pg.evaluate(W+".filter(w=>w.pts.some(p=>p.x==30&&p.y==10))[0].pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)])")
        print('long wall corners',long)
        print('tees',await pg.evaluate(W+".slice(-3).map(w=>[w.pts[1].x.toFixed(2),w.pts[1].y.toFixed(2),JSON.stringify(w.att[1])])"))
        await pg.click('#left .tool[data-t="select"]');await click(30,27);await pg.wait_for_timeout(150)
        print('click ->',await pg.evaluate("document.querySelector('#insp').innerText.slice(0,60).replace(/\\n/g,' | ')"),await pg.evaluate("document.querySelector('#i-len')&&document.querySelector('#i-len').value"))
        await pg.fill('#i-len','8');await pg.press('#i-len','Enter');await pg.wait_for_timeout(120)
        print('after set 8',await pg.evaluate(W+".filter(w=>w.pts.some(p=>p.x==30&&p.y==10))[0].pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)])"))
        print('tee now',await pg.evaluate(W+".slice(-3).map(w=>w.pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)]))"))
        await pg.mouse.click(5,5);await pg.wait_for_timeout(450);await click(30,26);await pg.wait_for_timeout(150)
        sx,sy=await at(30,39);await pg.mouse.move(sx,sy);await pg.mouse.down();tx,ty=await at(30,42);await pg.mouse.move(tx,ty,steps=6);await pg.mouse.up();await pg.wait_for_timeout(150)
        print('drag corner 39->42',await pg.evaluate(W+".filter(w=>w.pts.some(p=>p.x==30&&p.y==10))[0].pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)])"),await pg.evaluate(W+".slice(-1).map(w=>w.pts.map(p=>[+p.x.toFixed(1),+p.y.toFixed(1)]))"))
        print(errs)
        await b.close()
asyncio.run(main())
