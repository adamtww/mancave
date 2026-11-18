import asyncio,sys
exec(open('/home/claude/build/tflow.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.add_init_script(INIT)
        await pg.goto("http://127.0.0.1:8766/"+sys.argv[1]);await pg.wait_for_timeout(800)
        await pg.click('#nf-c-plan');await pg.set_input_files('#nf-in','/home/claude/build/shape-proto/tests/grand.png');await pg.click('#nf-go')
        for i in range(30):
            await pg.wait_for_timeout(500)
            if not await pg.evaluate("document.querySelector('#nf-ld').classList.contains('show')"):break
        await pg.wait_for_timeout(400);await pg.click('#nf-lockbtn');await pg.wait_for_timeout(200)
        v=await pg.evaluate("(()=>{var e=[...document.querySelectorAll('[data-h=vertex][data-id=\"0\"]')];return e.map(x=>{var r=x.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})})()")
        y0=min(z[1] for z in v);top=[z for z in v if abs(z[1]-y0)<2];x=(min(z[0] for z in top)+max(z[0] for z in top))/2

        await pg.mouse.move(x,y0);await pg.mouse.down()
        out=[]
        for dy in list(range(0,700,50)):
            await pg.mouse.move(x,y0+dy);await pg.wait_for_timeout(30)
            t=await pg.evaluate("[...document.querySelectorAll('svg text')].map(t=>t.textContent).filter(s=>/Moved/.test(s))[0]||''")
            out.append((dy,t))
        await pg.mouse.up();await pg.wait_for_timeout(200)
        for o in out:print(o)
        print('final',await pg.evaluate("document.querySelector('#a-use').textContent"),errs)
        await b.close()
asyncio.run(main())
