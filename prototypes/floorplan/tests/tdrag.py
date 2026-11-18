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
        O="JSON.stringify(__cave.objs.get().map(o=>[o.name.slice(0,16),o.zone,o.x,o.y,o.w,o.d,o.rot]))"
        R="document.querySelector('#zright').innerText.replace(/\\n/g,' | ').slice(0,300)"
        T="(document.querySelector('#toast')||{}).textContent"
        await pg.click('#steps button[data-s=spaces]')
        await pg.click('[data-ztype=games]');await pg.click('[data-zt=zrect]');await click(10,10);await click(45,40)
        await pg.click('#z-done');await pg.click('[data-ztype=bar]');await pg.click('[data-zt=zroom]');await click(110,52)
        await pg.click('#steps button[data-s=layout]');await pg.wait_for_timeout(150)
        await pg.click('.lsh[data-c="Arcade & Gaming"]');await pg.wait_for_timeout(80)
        print('cards:',await pg.evaluate("document.querySelectorAll('#l-cats .lcard').length"),'with drawings:',await pg.evaluate("document.querySelectorAll('#l-cats .lcard .lart svg *').length>20"))
        async def dragcard(r,x,y,rotate=False):
            c=await pg.evaluate(f"(function(){{var b=document.querySelector('#l-cats .lcard[data-r={r}]').getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]}})()")
            await pg.mouse.move(*c);await pg.mouse.down();tx,ty=await at(x,y)
            for k in range(1,16):
                await pg.mouse.move(c[0]+(tx-c[0])*k/15,c[1]+(ty-c[1])*k/15);await pg.wait_for_timeout(16)
            held=await pg.evaluate("[!!document.querySelector('.cardchip'),!!document.querySelector('.cardchip .hbox.art svg'),document.querySelectorAll('svg rect animate').length]")
            if rotate:await pg.keyboard.press('r');await pg.wait_for_timeout(50)
            await pg.mouse.up();await pg.wait_for_timeout(400);return held
        print('held (chip, drawing, ants):',await dragcard('g-pool',28,25))
        print('after drop:',await pg.evaluate(O),'|',await pg.evaluate(T))
        print('drag air hockey with R pressed:',await dragcard('g-airh',30,24,True));print(await pg.evaluate(O),'|',await pg.evaluate(T))
        # drop a pool table into the Kitchen & Bar: refused, card flies home
        await dragcard('g-pool',112,54);print('wrong zone:',await pg.evaluate(O+".length"),'|',await pg.evaluate(T))
        # tap a card: details + place buttons
        await pg.fill('#l-q','kitchen sink');await pg.wait_for_timeout(80);await pg.click('#l-cats .lcard[data-r=kr-sink]');await pg.wait_for_timeout(100)
        print('details:',await pg.evaluate(R))
        await pg.click('[data-lz]');await pg.wait_for_timeout(300);print('placed sink:',await pg.evaluate(O))
        # pick up the pool table and carry it 8 ft right
        pool=await pg.evaluate("__cave.objs.get()[0]");cx,cy=await at(pool['x']+pool['w']/2,pool['y']+pool['d']/2)
        await pg.mouse.move(cx,cy);await pg.mouse.down()
        for k in range(1,12):
            await pg.mouse.move(cx+k*8*pg_scale if False else cx+k*6,cy);await pg.wait_for_timeout(16)
        print('carrying:',await pg.evaluate("!!document.querySelector('.cardchip')"),await pg.evaluate("__cave.objs.get().length"))
        await pg.mouse.up();await pg.wait_for_timeout(400);print('after carry:',await pg.evaluate(O))
        await pg.screenshot(path='/tmp/lay2.png')
        await pg.keyboard.press('Control+z');await pg.wait_for_timeout(100);print('undo:',await pg.evaluate(O))
        print(errs)
        await b.close()
asyncio.run(main())
