import asyncio,json,sys
from playwright.async_api import async_playwright
exec(open('replay.py').read().split('async def main')[0].replace('run=json.load(open(sys.argv[1]))','run=json.load(open(sys.argv[1]))'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1376,"height":1032})
        await pg.add_init_script(INIT+"window.__dbg=[];window.__wallsN=(window.__run.tests[0].replies.length>=4)?2:1;")
        await pg.goto("http://127.0.0.1:8765/index.html#tests");await pg.wait_for_timeout(800)
        await pg.evaluate("""()=>{const of=window.fetch;window.fetch=async function(u){window.__curTest=u;return of.apply(this,arguments)}}""")
        await pg.click('#t-run')
        for i in range(60):
            await pg.wait_for_timeout(1000)
            if not await pg.evaluate("document.querySelector('#t-run').disabled"):break
        d=await pg.evaluate("window.__dbg")
        names=['W','G','M']
        for n,x in zip(names,d):
            c=x['crop'];P=lambda q:(round(c['x']+q[0]/1000*c['w']),round(c['y']+q[1]/1000*c['h'])) if q else None
            print(n,'--- before')
            for dr in x['before']:print('  ',dr['type'],P(dr.get('a')),P(dr.get('b')),'h',P(dr.get('hinge')),'s',P(dr.get('swing_into')))
            print(n,'--- after')
            for dr in x.get('after',[]):print('  ',dr['type'],P(dr.get('a')),P(dr.get('b')),'h',P(dr.get('hinge')),'s',P(dr.get('swing_into')))
        await b.close()
asyncio.run(main())
