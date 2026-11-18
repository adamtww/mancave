# Test-site copy of Floor Plan + Rooms: same page, plus the shim that reads plans through the test server.
src=open('/home/claude/build/fork/index.html').read()
shim=open('/home/claude/build/fork/siteshim.js').read()
i=src.index('<head>')+len('<head>')
src=src[:i]+'\n<script>'+shim+'</script>'+src[i:]
src=src.replace('<span class="tag">PROTOTYPE</span>','<span class="tag">TEST</span>',1)
open('/home/claude/mancave/floorplan.html','w').write(src)
print('ok',len(src))
