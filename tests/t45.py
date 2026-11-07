import asyncio, json
from playwright.async_api import async_playwright
U="file:///home/claude/mancave/index.html"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--allow-file-access-from-files"])
        ctx=await b.new_context(viewport={"width":1600,"height":950});pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(U);await pg.evaluate("localStorage.clear();localStorage.setItem('cave-api','http://localhost:8799')")
        # a local plan that should migrate
        await pg.evaluate("localStorage.setItem('cave-build',JSON.stringify({lot:{w:100,d:100},items:[{u:'r1',kind:'room',name:'Shop',x:5,y:5,w:20,d:15,lk:true}]}))")
        await pg.reload();await pg.wait_for_timeout(800)
        print("login shown:",await pg.evaluate("document.querySelector('#login').classList.contains('show')"))
        await pg.screenshot(path="/home/claude/build/c_login.png")
        await pg.fill("#li-u","adam");await pg.fill("#li-p","wrong");await pg.click("#li-go");await pg.wait_for_timeout(500);print("err:",await pg.inner_text("#li-err"))
        await pg.fill("#li-p","testpass123");await pg.click("#li-go");await pg.wait_for_timeout(1200)
        st=lambda: pg.evaluate("[document.querySelector('#ly-name').textContent,document.querySelector('#ly-tag').textContent,document.querySelector('#ly-st').textContent,document.querySelector('#ly-save-l').textContent,document.querySelector('#ly-save').disabled,cave.get().items.length]")
        print("after login:",await st(),"info:",await pg.inner_text("#info-h"))
        await pg.evaluate("(function(){var r=cave.room('Bar',40,5,20,15);cave.update(r,{lk:true})})()");await pg.wait_for_timeout(200);print("edited:",await st())
        await pg.screenshot(path="/home/claude/build/c_head.png",clip={"x":0,"y":0,"width":1600,"height":120})
        await pg.keyboard.press("Control+s");await pg.wait_for_timeout(800);print("saved:",await st())
        # admin: add dad
        await pg.click("#u-btn");await pg.click("#umenu [data-a='users']");await pg.wait_for_timeout(500)
        await pg.fill("#nu-u","dad");await pg.fill("#nu-p","dadpass1");await pg.click("#nu-f button");await pg.wait_for_timeout(600)
        print("users:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow .mn')].map(e=>e.textContent)"))
        await pg.screenshot(path="/home/claude/build/c_users.png");await pg.click("#mdl-x")
        await pg.click("#u-btn");await pg.click("#umenu [data-a='usage']");await pg.wait_for_timeout(600);print("usage:",(await pg.inner_text("#mdl-b"))[:200].replace("\n"," | "))
        await pg.screenshot(path="/home/claude/build/c_usage.png");await pg.click("#mdl-x")
        # reload restores open layout
        await pg.reload();await pg.wait_for_timeout(1200);print("after reload:",await st())
        # unsaved change survives reload
        await pg.evaluate("(function(){var r=cave.room('Gym',5,40,20,15);cave.update(r,{lk:true})})()");await pg.wait_for_timeout(200)
        await pg.evaluate("window.onbeforeunload=null");await pg.goto(U);await pg.wait_for_timeout(1200);print("restored unsaved:",await st())
        await pg.keyboard.press("Control+s");await pg.wait_for_timeout(600)
        # sign out, dad signs in
        await pg.click("#u-btn");await pg.click("#umenu [data-a='out']");await pg.wait_for_timeout(600);print("login after signout:",await pg.evaluate("document.querySelector('#login').classList.contains('show')"))
        await pg.fill("#li-u","dad");await pg.fill("#li-p","dadpass1");await pg.click("#li-go");await pg.wait_for_timeout(1200);print("dad:",await st())
        await pg.click("#ly-open");await pg.wait_for_timeout(500);await pg.click("#mdl-b [data-tab='shared']");await pg.wait_for_timeout(200)
        print("shared:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow')].map(e=>e.innerText.replace(/\\n/g,' | '))"))
        await pg.screenshot(path="/home/claude/build/c_layouts.png")
        await pg.click("#mdl-x");await pg.wait_for_timeout(200);print("dad viewing:",await st())
        await pg.evaluate("(function(){var r=cave.room('Dad den',70,40,20,15);cave.update(r,{lk:true})})()");await pg.wait_for_timeout(200);print("dad edited:",await st())
        await pg.click("#ly-save");await pg.wait_for_timeout(900);print("dad saved copy:",await st())
        await pg.click("#ly-open");await pg.wait_for_timeout(500);await pg.click("#mdl-b [data-tab='mine']");await pg.wait_for_timeout(200);print("dad mine:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow')].map(e=>e.innerText.replace(/\\n/g,' | '))"))
        await pg.click("#mdl-b .mrow [data-k='hist']");await pg.wait_for_timeout(500);print("history:",await pg.evaluate("[...document.querySelectorAll('#mdl-b .mrow')].map(e=>e.innerText.replace(/\\n/g,' | '))"))
        await pg.screenshot(path="/home/claude/build/c_hist.png")
        print("dad admin menu hidden:",await pg.evaluate("getComputedStyle(document.querySelector('#umenu [data-a=users]')).display"),"errs",errs)
        await b.close()
asyncio.run(main())
