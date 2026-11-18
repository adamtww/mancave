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
        Z="__cave.zones"
        zs="JSON.stringify(__cave.zones.get().map(z=>[z.name,z.type,Math.round(__cave.zones.area(z)),z.mp.length]))"
        await pg.click('#steps button[data-s=spaces]');await pg.wait_for_timeout(150)
        print('step',await pg.evaluate(Z+".step()"),'| left panel:',await pg.evaluate("document.querySelector('#zleft').innerText.slice(0,120).replace(/\\n/g,' | ')"))
        # 1) click a room: the imported room 103.5-117.5 x 44-60
        await pg.click('[data-ztype=bath]');await click(110,52);await pg.wait_for_timeout(150)
        print('room ->',await pg.evaluate(zs))
        await pg.fill('#z-name','Restrooms');await pg.press('#z-name','Enter');await pg.wait_for_timeout(100)
        # 2) rectangle in open floor, new zone of another type
        await pg.click('#z-done');await pg.click('[data-ztype=games]');await pg.click('[data-zt=zrect]');await click(10,10);await click(40,35);await pg.wait_for_timeout(150)
        print('rect ->',await pg.evaluate(zs))
        # 3) a rectangle overlapping the first one, as a new zone: it should get cut around it
        await pg.click('#z-done');await pg.click('[data-ztype=lounge]');await click(30,20);await click(55,40);await pg.wait_for_timeout(150)
        print('overlap rect ->',await pg.evaluate(zs))
        # 4) brush stroke adds to the selected (just-made) lounge
        await pg.click('[data-zt=zbrush]');sx,sy=await at(45,45);await pg.mouse.move(sx,sy);await pg.mouse.down();tx,ty=await at(60,45);await pg.mouse.move(tx,ty,steps=10);await pg.mouse.up();await pg.wait_for_timeout(200)
        print('brush add ->',await pg.evaluate(zs))
        # 5) outline (polygon) as new zone
        await pg.click('#z-done');await pg.click('[data-ztype=office]');await pg.click('[data-zt=zpoly]')
        for q in [(70,10),(90,10),(90,25),(70,25)]:await click(*q)
        await click(70.2,10.2);await pg.wait_for_timeout(150)
        print('outline ->',await pg.evaluate(zs))
        # 6) select + push an edge of the office
        await pg.click('[data-zt=zsel]');await click(80,18);await pg.wait_for_timeout(100)
        e=await pg.evaluate("[...document.querySelectorAll('[data-zh=e]')].map(r=>{var b=r.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]})")
        print('edge handles',len(e))
        # the right edge (x=90) handle: rightmost
        ex=max(e,key=lambda q:q[0]);await pg.mouse.move(*ex);await pg.mouse.down();tx,ty=await at(95,18);await pg.mouse.move(tx,ex[1],steps=6);await pg.mouse.up();await pg.wait_for_timeout(150)
        print('after push ->',await pg.evaluate(zs))
        print('right panel:',await pg.evaluate("document.querySelector('#zright').innerText.slice(0,300).replace(/\\n/g,' | ')"))
        await pg.keyboard.press('Control+z');await pg.wait_for_timeout(100);print('undo ->',await pg.evaluate(zs))
        await pg.screenshot(path='/tmp/zones.png')
        await pg.click('#steps button[data-s=structure]');await pg.wait_for_timeout(100);print('back to structure, zones kept',await pg.evaluate(Z+".get().length"))
        print(errs)
        await b.close()
asyncio.run(main())
