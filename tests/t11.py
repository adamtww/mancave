import asyncio
from playwright.async_api import async_playwright
async def touch(cdp,typ,pts):
    await cdp.send("Input.dispatchTouchEvent",{"type":typ,"touchPoints":[{"x":x,"y":y,"id":i} for i,(x,y) in enumerate(pts)]})
VB="document.querySelector('#svg').getAttribute('viewBox').split(' ').map(Number)"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        ctx=await b.new_context(viewport={"width":1133,"height":744},has_touch=True)
        pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.add_init_script("Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});const mq=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('pointer: coarse')?{matches:true,addListener(){},removeListener(){}}:mq(q)")
        await pg.goto("file:///home/claude/build/cave-build.html");await pg.wait_for_timeout(500)
        cdp=await ctx.new_cdp_session(pg)
        await pg.evaluate("cave.batch(c=>{c.room('Arcade',10,10,30,20);c.add('g-pool',15,14)})")
        # world point under (650,400) before pinch
        w0=await pg.evaluate("(()=>{var p=document.querySelector('#svg').createSVGPoint();p.x=650;p.y=400;var f=p.matrixTransform(document.querySelector('#svg').getScreenCTM().inverse());return [f.x,f.y]})()")
        v0=await pg.evaluate(VB)
        await touch(cdp,"touchStart",[(600,400),(700,400)])
        for k in range(1,10): await touch(cdp,"touchMove",[(600-k*15,400),(700+k*15,400)])
        await pg.wait_for_timeout(50)
        w1=await pg.evaluate("(()=>{var p=document.querySelector('#svg').createSVGPoint();p.x=650;p.y=400;var f=p.matrixTransform(document.querySelector('#svg').getScreenCTM().inverse());return [f.x,f.y]})()")
        await touch(cdp,"touchEnd",[]);await pg.wait_for_timeout(200)
        v1=await pg.evaluate(VB)
        print("zoom width",round(v0[2],1),"->",round(v1[2],1)," anchor drift",round(w1[0]-w0[0],2),round(w1[1]-w0[1],2))
        # two-finger pan
        await touch(cdp,"touchStart",[(500,400),(600,400)])
        for k in range(1,8): await touch(cdp,"touchMove",[(500+k*20,400+k*10),(600+k*20,400+k*10)])
        await touch(cdp,"touchEnd",[]);await pg.wait_for_timeout(200)
        v2=await pg.evaluate(VB);print("2-finger pan dx",round(v2[0]-v1[0],2),"dy",round(v2[1]-v1[1],2),"(expect negative)")
        # one-finger pan on empty floor + tap deselect
        await touch(cdp,"touchStart",[(1000,650)])
        for k in range(1,6): await touch(cdp,"touchMove",[(1000-k*20,650)])
        await touch(cdp,"touchEnd",[]);await pg.wait_for_timeout(200)
        v3=await pg.evaluate(VB);print("1-finger pan dx",round(v3[0]-v2[0],2),"(expect positive)")
        await pg.evaluate("cave.fit()");await pg.wait_for_timeout(100)
        # drag object with finger
        g=await pg.evaluate("(()=>{var u=cave.find('Pool')[0].u;var r=document.querySelector('.o[data-u=\"'+u+'\"] rect').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        await touch(cdp,"touchStart",[tuple(g)])
        for k in range(1,6): await touch(cdp,"touchMove",[(g[0]+k*12,g[1])])
        await touch(cdp,"touchEnd",[]);print("pool moved to x",await pg.evaluate("cave.find('Pool')[0].x"))
        # long press place from list
        await pg.evaluate("document.querySelectorAll('details.cat')[2].open=true")
        r=await pg.evaluate("(()=>{var b=[...document.querySelectorAll('.pi')].find(x=>x.textContent.includes('Air hockey'));var q=b.getBoundingClientRect();return [q.x+60,q.y+q.height/2]})()")
        await touch(cdp,"touchStart",[tuple(r)]);await pg.wait_for_timeout(400)
        for k in range(1,10): await touch(cdp,"touchMove",[(r[0]+k*60,r[1]+k*10)])
        await touch(cdp,"touchEnd",[]);await pg.wait_for_timeout(100)
        print("items",await pg.evaluate("cave.get().items.length"))
        await pg.screenshot(path="cam.png");print(errs)
        await b.close()
asyncio.run(main())
