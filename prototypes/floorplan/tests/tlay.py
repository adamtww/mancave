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
        O="JSON.stringify(__cave.objs.get().map(o=>[o.name.slice(0,18),o.zone,o.x,o.y,o.w,o.d,o.rot]))"
        R="document.querySelector('#zright').innerText.replace(/\\n/g,' | ').slice(0,260)"
        await pg.click('#steps button[data-s=spaces]')
        await pg.click('[data-ztype=games]');await pg.click('[data-zt=zrect]');await click(10,10);await click(40,35)
        await pg.click('#z-done');await pg.click('[data-ztype=bar]');await pg.click('[data-zt=zroom]');await click(110,52)
        await pg.click('#z-done');await pg.click('[data-ztype=lounge]');await pg.click('[data-zt=zrect]');await click(50,10);await click(80,30)
        print('zones',await pg.evaluate("JSON.stringify(__cave.zones.get().map(z=>[z.id,z.name]))"))
        await pg.click('#steps button[data-s=layout]');await pg.wait_for_timeout(150)
        print('left:',await pg.evaluate("document.querySelector('#zleft').innerText.slice(0,160).replace(/\\n/g,' | ')"))
        # pool table: Arcade & Gaming fits Games or Lounge -> must choose
        await pg.fill('#l-q','pool');await pg.click('.lpi[data-r=g-pool]');await pg.wait_for_timeout(100)
        print('choose:',await pg.evaluate(R))
        await pg.click('[data-lz]');await pg.wait_for_timeout(80)
        sx,sy=await at(25,22);await pg.mouse.move(sx,sy,steps=3);await pg.wait_for_timeout(60);await pg.mouse.click(sx,sy);await pg.wait_for_timeout(120)
        print('placed:',await pg.evaluate(O))
        # kitchen sink: needs plumbing, only Kitchen & Bar fits -> no question, place automatically
        await pg.fill('#l-q','kitchen sink');await pg.click('.lpi[data-r=kr-sink]');await pg.wait_for_timeout(80)
        print('sink panel:',await pg.evaluate(R)[:0] if False else await pg.evaluate(R))
        await pg.click('#l-auto');await pg.wait_for_timeout(100);print('sink:',await pg.evaluate(O))
        # utility sink: needs plumbing in Lounge/Storage/Workshop -> none
        await pg.fill('#l-q','utility sink');await pg.click('.lpi[data-r=h-sink]');await pg.wait_for_timeout(80);print('utility sink:',await pg.evaluate(R))
        await pg.click('#l-cancel')
        # drag the pool table right by 6 ft
        pool=await pg.evaluate("__cave.objs.get()[0]");cx,cy=await at(pool['x']+pool['w']/2,pool['y']+pool['d']/2)
        await pg.mouse.move(cx,cy);await pg.mouse.down();tx,ty=await at(pool['x']+pool['w']/2+6,pool['y']+pool['d']/2);await pg.mouse.move(tx,ty,steps=8);await pg.mouse.up();await pg.wait_for_timeout(100)
        print('after drag:',await pg.evaluate(O))
        # drag it far outside its zone: it should stop at the zone edge
        cx,cy=await at(pool['x']+pool['w']/2+6,pool['y']+pool['d']/2);await pg.mouse.move(cx,cy);await pg.mouse.down();tx,ty=await at(pool['x']+40,pool['y']+30);await pg.mouse.move(tx,ty,steps=12);await pg.mouse.up();await pg.wait_for_timeout(100)
        print('dragged far:',await pg.evaluate(O))
        await pg.keyboard.press('r');await pg.wait_for_timeout(100);print('rotated:',await pg.evaluate(O))
        await pg.fill('#l-w','5');await pg.fill('#l-d','9');await pg.click('#l-setsz');await pg.wait_for_timeout(100);print('resized:',await pg.evaluate(O))
        print('panel:',await pg.evaluate(R))
        await pg.screenshot(path='/tmp/layout.png')
        await pg.keyboard.press('Control+z');await pg.wait_for_timeout(80);print('undo:',await pg.evaluate(O))
        print(errs)
        await b.close()
asyncio.run(main())
